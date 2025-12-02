
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

    let transactionId: string | null = null;
    let subscriptionId: string | null = null; // Para recorrência Asaas
    let paymentStatus: string | null = null;
    let paidAmount: number | null = null;
    let transactionMetadata: any = {}; 
    let rawBody: string = '';
    let body: any = {};

    // Tenta fazer parse do body
    try {
        body = await req.json();
        rawBody = JSON.stringify(body);
    } catch (jsonError) {
        // Se falhar o JSON, tenta ler como texto para debug
        try {
             rawBody = await req.text();
        } catch(e) {}
        console.warn(`[Webhook] Aviso: Erro ao parsear JSON. Raw: ${rawBody.substring(0, 200)}...`);
    }

    // --- AUTO DETECÇÃO DE PROVEDOR ---
    let provider = url.searchParams.get("provider");
    
    if (!provider) {
        // Mercado Pago Detection logic
        if (body && (
            body.action === "payment.updated" || 
            body.action === "payment.created" || 
            body.type === "payment" ||
            (body.data && body.data.id) // Estrutura comum v1
        )) {
            provider = "mercadopago";
        } else if (body && (body.event && body.event.startsWith("PAYMENT_"))) {
            provider = "asaas";
        }
    }
    
    console.log(`[Webhook] Provedor: ${provider}. ID Payload: ${body?.id || body?.data?.id || 'N/A'}`);

    // --- LÓGICA MERCADO PAGO ---
    if (provider === "mercadopago") {
        const { data, action, type } = body;
        
        // Verifica ID no data (v1) ou na raiz (testes antigos)
        let notificationId = data?.id;
        if (!notificationId && body.id) notificationId = body.id; 

        if (notificationId) {
            notificationId = notificationId.toString();

            // === BYPASS CRÍTICO PARA TESTE DO MERCADO PAGO ===
            // O MP envia o ID 123456 para validar a URL. Devemos retornar 200 OK imediatamente.
            if (notificationId === "123456") {
                console.log("✅ [Webhook MP] Notificação de TESTE (123456) recebida. Retornando 200 OK.");
                return new Response(JSON.stringify({ success: true, message: "Webhook URL validada com sucesso." }), { 
                    status: 200, 
                    headers: corsHeaders 
                });
            }
            // ====================================================
            
            // Validação de Segurança: Consulta API do MP
            const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");
            if (!mpAccessToken) {
                console.error("[Webhook MP] Erro: MP_ACCESS_TOKEN não configurado.");
                // Retornamos 200 para o MP não ficar reenviando, mas logamos o erro grave
                return new Response(JSON.stringify({ error: "Server config error" }), { status: 200, headers: corsHeaders });
            }

            try {
                const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${notificationId}`, {
                    headers: { "Authorization": `Bearer ${mpAccessToken}` }
                });
                
                if (mpRes.ok) {
                    const paymentInfo = await mpRes.json();
                    transactionId = paymentInfo.id.toString();
                    paymentStatus = paymentInfo.status; // approved, pending, rejected, refunded
                    paidAmount = paymentInfo.transaction_amount;
                    transactionMetadata.mp_id = paymentInfo.id;
                    transactionMetadata.provider = "mercado_pago";
                } else {
                    console.warn(`[Webhook MP] Pagamento ${notificationId} não encontrado na API (HTTP ${mpRes.status}).`);
                    // Se a API do MP diz que não existe, ignoramos (200 OK)
                    return new Response(JSON.stringify({ message: "Payment not found in MP, ignoring." }), { status: 200, headers: corsHeaders });
                }
            } catch (fetchErr) {
                console.error("[Webhook MP] Erro de conexão com API MP:", fetchErr);
                // Erro de rede nosso -> Retorna 500 para o MP tentar de novo mais tarde
                return new Response(JSON.stringify({ error: "Network error validating payment" }), { status: 500, headers: corsHeaders });
            }
        } else {
            console.log("[Webhook MP] Payload sem ID de notificação. Ignorando.");
            return new Response(JSON.stringify({ message: "No ID found" }), { status: 200, headers: corsHeaders });
        }
    } 
    // --- LÓGICA ASAAS ---
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
             // Eventos irrelevantes (criação, visualização) -> 200 OK
             return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
        }
    } else {
        // Se nenhum provedor for detectado, loga o body para debug
        console.warn(`[Webhook] Provedor desconhecido ou payload inválido. Body: ${rawBody}`);
        return new Response(JSON.stringify({ error: "Provider not detected" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // --- PROCESSAMENTO DA TRANSAÇÃO (COMUM) ---
    if (transactionId && paymentStatus) {
        
        // 1. Busca transação no banco
        const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("*")
            .eq("external_id", transactionId)
            .single();

        let targetTx = tx;

        // Lógica de Recorrência Asaas (Nova transação se não existir e for assinatura)
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
            // Evita processamento duplicado
            if (targetTx.status === 'approved' && paymentStatus === 'approved') {
                 return new Response(JSON.stringify({ message: "Already approved" }), { status: 200, headers: corsHeaders });
            }

            // Normalização de Status
            let newDbStatus = 'pending';
            if (['approved', 'CONFIRMED', 'RECEIVED'].includes(paymentStatus)) newDbStatus = 'approved';
            else if (['refunded', 'CHARGED_BACK'].includes(paymentStatus)) newDbStatus = 'refunded';
            else if (['rejected', 'cancelled', 'failed', 'OVERDUE'].includes(paymentStatus)) newDbStatus = 'failed';

            // Atualiza DB
            await supabaseAdmin
                .from("transactions")
                .update({ status: newDbStatus, metadata: { ...targetTx.metadata, ...transactionMetadata } })
                .eq("id", targetTx.id);

            // Libera Benefícios
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
                
                // Log da aprovação
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

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    // Retorna 200 em erro genérico para evitar loop infinito de retries do gateway se for um erro de código
    // Se for erro de infra (timeout), o Supabase retornará 5xx automaticamente.
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Lógica Compartilhada de Liberação de Benefícios (Simplificada)
async function releaseBenefits(supabaseAdmin: any, userId: string, itemType: string, itemId: string, amount: number, referrerId?: string) {
    if (itemType === "plan") {
        await supabaseAdmin.from("app_users").update({ plan: itemId }).eq("id", userId);
        
        // Busca config de planos para saber quantos créditos dar
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
                    description: `Comissão ${COMMISSION_RATE * 100}%`
                });
            }
        }
    }
}
