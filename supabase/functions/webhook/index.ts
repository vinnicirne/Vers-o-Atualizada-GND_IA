
// supabase/functions/webhook/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Inicializa cliente Supabase Admin (Bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let rawBody: string = '';
    let body: any = {};

    // Tenta fazer parse do body
    try {
        rawBody = await req.text();
        if (rawBody) {
            body = JSON.parse(rawBody);
        }
    } catch (jsonError) {
        console.warn(`[Webhook] Erro ao parsear JSON. Raw: ${rawBody.substring(0, 200)}...`);
    }

    // === BYPASS IMEDIATO PARA TESTE DE CONEXÃO MERCADO PAGO ===
    // O Mercado Pago envia id: 123456 (number) ou "123456" (string) na raiz ou dentro de data.
    // Verifica isso antes de qualquer lógica para garantir 200 OK.
    const possibleIds = [
        body?.id?.toString(), 
        body?.data?.id?.toString()
    ];
    
    if (possibleIds.includes("123456")) {
        console.log("✅ [Webhook MP] Notificação de TESTE (123456) detectada e aprovada.");
        return new Response(JSON.stringify({ success: true, message: "Webhook URL validada (Test Mode)." }), { 
            status: 200, 
            headers: corsHeaders 
        });
    }
    // =========================================================

    let transactionId: string | null = null;
    let subscriptionId: string | null = null;
    let paymentStatus: string | null = null;
    let paidAmount: number | null = null;
    let transactionMetadata: any = {}; 
    let provider = url.searchParams.get("provider");
    
    // --- AUTO DETECÇÃO DE PROVEDOR ---
    if (!provider) {
        if (body && (
            body.action === "payment.updated" || 
            body.action === "payment.created" || 
            body.type === "payment" ||
            (body.data && body.data.id) // Padrão MP V1
        )) {
            provider = "mercadopago";
        } else if (body && (body.event && body.event.startsWith("PAYMENT_"))) {
            provider = "asaas";
        }
    }
    
    console.log(`[Webhook] Provedor: ${provider}. ID: ${body?.id || body?.data?.id || 'N/A'}`);

    if (provider === "mercadopago") {
        let notificationId = body?.data?.id || body?.id;

        if (notificationId) {
            notificationId = notificationId.toString();
            
            const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");
            if (!mpAccessToken) {
                console.error("[Webhook MP] Erro: MP_ACCESS_TOKEN não configurado.");
                // Retorna 200 para evitar retries infinitos do MP
                return new Response(JSON.stringify({ error: "Server config error" }), { status: 200, headers: corsHeaders });
            }

            try {
                const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${notificationId}`, {
                    headers: { "Authorization": `Bearer ${mpAccessToken}` }
                });
                
                if (mpRes.ok) {
                    const paymentInfo = await mpRes.json();
                    transactionId = paymentInfo.id.toString();
                    paymentStatus = paymentInfo.status;
                    paidAmount = paymentInfo.transaction_amount;
                    transactionMetadata.mp_id = paymentInfo.id;
                    transactionMetadata.provider = "mercadopago";
                } else {
                    console.warn(`[Webhook MP] Pagamento ${notificationId} não encontrado (HTTP ${mpRes.status}).`);
                    return new Response(JSON.stringify({ message: "Payment not found in MP" }), { status: 200, headers: corsHeaders });
                }
            } catch (fetchErr) {
                console.error("[Webhook MP] Erro de conexão com API MP:", fetchErr);
                return new Response(JSON.stringify({ error: "Network error" }), { status: 500, headers: corsHeaders });
            }
        } else {
            console.log("[Webhook MP] Payload sem ID. Retornando 200 para limpar fila.");
            return new Response(JSON.stringify({ message: "No ID found" }), { status: 200, headers: corsHeaders });
        }
    } 
    else if (provider === "asaas") {
        const { event, payment } = body;
        
        if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
            transactionId = payment.id;
            subscriptionId = payment.subscription; 
            paymentStatus = "approved";
            paidAmount = payment.value;
            transactionMetadata.asaas_id = payment.id;
            transactionMetadata.provider = "asaas";
        } else if (event === "PAYMENT_REFUNDED") {
             transactionId = payment.id;
             paymentStatus = "refunded";
             paidAmount = payment.value;
             transactionMetadata.asaas_id = payment.id;
             transactionMetadata.provider = "asaas";
        } else if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_CANCELED") {
             transactionId = payment.id;
             paymentStatus = "failed";
             paidAmount = payment.value;
             transactionMetadata.asaas_id = payment.id;
             transactionMetadata.provider = "asaas";
        } else {
             return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
        }
    } else {
        console.warn(`[Webhook] Provedor não detectado. Body: ${rawBody.substring(0, 100)}`);
        // Retorna 200 para evitar que webhooks desconhecidos fiquem tentando infinitamente
        return new Response(JSON.stringify({ message: "Provider not detected, ignoring." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // --- PROCESSAMENTO DA TRANSAÇÃO ---
    if (transactionId && paymentStatus) {
        
        // Busca transação
        const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("*")
            .eq("external_id", transactionId)
            .single();

        let targetTx = tx;

        // Recorrência Asaas (Cria nova se não existir)
        if (!tx && subscriptionId && provider === "asaas") {
            const { data: subUser } = await supabaseAdmin
                .from("app_users")
                .select("id, email, plan")
                .eq("subscription_id", subscriptionId)
                .single();

            if (subUser) {
                let newDbStatus = 'pending';
                if (paymentStatus === 'approved') newDbStatus = 'approved';
                else if (paymentStatus === 'refunded') newDbStatus = 'refunded';
                else if (paymentStatus === 'failed') newDbStatus = 'failed';

                const { data: newRecurrTx, error: newTxError } = await supabaseAdmin.from("transactions").insert({
                    usuario_id: subUser.id,
                    valor: Number(paidAmount),
                    metodo: 'card', 
                    status: newDbStatus,
                    external_id: transactionId,
                    metadata: { 
                        provider: "asaas", 
                        item_type: 'plan', 
                        item_id: subUser.plan || 'premium',
                        is_subscription: true,
                        subscription_id: subscriptionId,
                        auto_generated: true 
                    },
                    data: new Date().toISOString(),
                }).select().single();

                if (!newTxError) targetTx = newRecurrTx;
            }
        }

        if (targetTx) {
            // Normalização de Status
            let newDbStatus = 'pending';
            if (['approved', 'CONFIRMED', 'RECEIVED'].includes(paymentStatus)) newDbStatus = 'approved';
            else if (['refunded', 'CHARGED_BACK'].includes(paymentStatus)) newDbStatus = 'refunded';
            else if (['rejected', 'cancelled', 'failed', 'OVERDUE'].includes(paymentStatus)) newDbStatus = 'failed';

            // Evita update redundante
            if (targetTx.status !== newDbStatus) {
                await supabaseAdmin
                    .from("transactions")
                    .update({ status: newDbStatus, metadata: { ...targetTx.metadata, ...transactionMetadata } })
                    .eq("id", targetTx.id);

                if (newDbStatus === 'approved') {
                    const { data: userData } = await supabaseAdmin
                        .from("app_users")
                        .select("referred_by")
                        .eq("id", targetTx.usuario_id)
                        .single();

                    const amountToUse = paidAmount || targetTx.valor; 
                    const metadata = targetTx.metadata || {};

                    await releaseBenefits(
                        supabaseAdmin,
                        targetTx.usuario_id,
                        metadata.item_type,
                        metadata.item_id,
                        Number(amountToUse),
                        userData?.referred_by
                    );
                    
                    await supabaseAdmin.from("logs").insert({
                        usuario_id: targetTx.usuario_id,
                        acao: "payment_approved_webhook",
                        modulo: "Pagamentos",
                        detalhes: { provider, transactionId, amount: amountToUse },
                        data: new Date().toISOString()
                    });
                }
            }
        }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Webhook Critical Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, // Retorna 200 para evitar retry loop em erros de lógica interna
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function releaseBenefits(supabaseAdmin: any, userId: string, itemType: string, itemId: string, amount: number, referrerId?: string) {
    if (itemType === "plan") {
        await supabaseAdmin.from("app_users").update({ plan: itemId }).eq("id", userId);
        const { data: config } = await supabaseAdmin.from("system_config").select("value").eq("key", "all_plans").single();
        if (config?.value) {
          const plan = (config.value as any[]).find((p: any) => p.id === itemId);
          if (plan) {
            await supabaseAdmin.from("user_credits").upsert({ user_id: userId, credits: plan.credits }, { onConflict: "user_id" });
          }
        }
    } else if (itemType === "credits") {
        const { data: current } = await supabaseAdmin.from("user_credits").select("credits").eq("user_id", userId).single();
        const currentCredits = current?.credits === -1 ? -1 : (current?.credits || 0);
        if (currentCredits !== -1) {
            const newCredits = currentCredits + Number(itemId); 
            await supabaseAdmin.from("user_credits").upsert({ user_id: userId, credits: newCredits }, { onConflict: "user_id" });
        }
    }

    if (referrerId) {
        const COMMISSION_RATE = 0.20;
        const commission = parseFloat((Number(amount) * COMMISSION_RATE).toFixed(2));
        if (commission > 0) {
            const { data: refUser } = await supabaseAdmin.from("app_users").select("affiliate_balance").eq("id", referrerId).single();
            if (refUser) {
                const newBalance = (refUser.affiliate_balance || 0) + commission;
                await supabaseAdmin.from("app_users").update({ affiliate_balance: newBalance }).eq("id", referrerId);
                await supabaseAdmin.from("affiliate_logs").insert({
                    affiliate_id: referrerId,
                    source_user_id: userId,
                    amount: commission,
                    description: `Comissão Webhook`
                });
            }
        }
    }
}
