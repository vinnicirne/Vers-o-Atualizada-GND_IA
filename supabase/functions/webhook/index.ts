
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
    const provider = url.searchParams.get("provider"); // ?provider=mercadopago OR ?provider=asaas

    console.log(`[Webhook] Recebido de: ${provider || 'desconhecido'} | Método: ${req.method}`);

    // --- LEITURA SEGURA DO BODY (Correção "Body already consumed") ---
    // Lemos o texto bruto uma única vez. Nunca chame req.json() e req.text() na mesma execução.
    const rawBody = await req.text();
    let body: any = {};
    
    try {
        if (rawBody) {
            body = JSON.parse(rawBody);
            // Log seguro (truncado se for muito grande)
            console.log(`[Webhook] Payload JSON:`, JSON.stringify(body).substring(0, 500));
        }
    } catch (e) {
        console.warn(`[Webhook] O body não é um JSON válido: ${rawBody.substring(0, 100)}...`);
    }

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
    
    // --- LÓGICA MERCADO PAGO ---
    if (provider === "mercadopago") {
        const { type, data, action } = body;
        
        // 1. Bypass para Teste de Integração (Painel MP)
        // O Mercado Pago envia ID 123456 ou "123456" ao clicar em "Testar"
        if (data?.id === 123456 || data?.id === "123456") {
            console.log("ℹ️ [Webhook MP] Notificação de TESTE recebida (ID 123456). Retornando 200 OK.");
            return new Response(JSON.stringify({ status: "OK", message: "Test notification received" }), { 
                status: 200, 
                headers: corsHeaders 
            });
        }

        if ((type === "payment" || action === "payment.created" || action === "payment.updated") && data?.id) {
            const notificationId = data.id.toString();
            
            // Validação de Segurança: Consulta a API do MP
            const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");
            if (!mpAccessToken) {
                console.error("🔴 [Webhook MP] Erro: MP_ACCESS_TOKEN não configurado.");
                return new Response(JSON.stringify({ error: "Server config error" }), { status: 500, headers: corsHeaders });
            }

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
                console.log(`✅ [Webhook MP] Pagamento validado na API: ${transactionId} | Status: ${paymentStatus}`);
            } else {
                console.error("🔴 [Webhook MP] Erro ao validar na API MP. Status:", mpRes.status);
                // Não retornamos 400 aqui para não travar a fila de retentativas do MP se for erro temporário deles
                // Mas se for 404, o pagamento não existe.
                if (mpRes.status === 404) {
                    return new Response(JSON.stringify({ error: "Payment not found in MP" }), { status: 200, headers: corsHeaders }); // 200 para parar de tentar
                }
            }
        } else {
            // Ignora outros tipos de notificação para não gerar ruído
            return new Response(JSON.stringify({ message: "Ignored event type" }), { status: 200, headers: corsHeaders });
        }
    } 
    // --- LÓGICA ASAAS ---
    else if (provider === "asaas") {
        const { event, payment } = body;
        
        if (event && payment) {
            console.log(`[Webhook Asaas] Evento: ${event} | ID: ${payment.id}`);

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
            } else if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_CANCELED") {
                transactionId = payment.id;
                paymentStatus = "failed";
            } else {
                // Eventos que não alteram status financeiro (ex: created, viewed)
                return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
            }
        }
    } else {
        return new Response(JSON.stringify({ error: "Provider invalid. Use ?provider=mercadopago or ?provider=asaas" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // --- ATUALIZAÇÃO DO BANCO DE DADOS ---
    if (transactionId && paymentStatus) {
        
        // 1. Busca transação
        const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("*")
            .eq("external_id", transactionId)
            .single();

        let targetTx = tx;

        // 2. Tratamento de Recorrência (Asaas) - Cria transação se não existir
        if (!tx && subscriptionId && provider === "asaas") {
            console.log(`[Webhook] Recorrência detectada (Sub: ${subscriptionId}). Criando nova transação.`);
            
            const { data: subUser } = await supabaseAdmin
                .from("app_users")
                .select("id, email, plan")
                .eq("subscription_id", subscriptionId)
                .single();

            if (subUser) {
                const newDbStatus = normalizeStatus(paymentStatus);
                const { data: newRecurrTx } = await supabaseAdmin.from("transactions").insert({
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
                targetTx = newRecurrTx;
            }
        }

        // 3. Atualiza Status e Libera Benefícios
        if (targetTx) {
            const newDbStatus = normalizeStatus(paymentStatus);
            
            if (targetTx.status !== newDbStatus) {
                await supabaseAdmin
                    .from("transactions")
                    .update({ status: newDbStatus, metadata: { ...targetTx.metadata, ...transactionMetadata } })
                    .eq("id", targetTx.id);

                if (newDbStatus === 'approved') {
                    console.log(`🚀 [Webhook] Pagamento Aprovado! Liberando benefícios para ${targetTx.usuario_id}`);
                    const { data: userData } = await supabaseAdmin.from("app_users").select("referred_by").eq("id", targetTx.usuario_id).single();
                    const meta = targetTx.metadata || {};
                    
                    await releaseBenefits(
                        supabaseAdmin,
                        targetTx.usuario_id,
                        meta.item_type,
                        meta.item_id,
                        Number(paidAmount || targetTx.valor),
                        userData?.referred_by
                    );
                }
            }
        }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("🔴 Webhook Critical Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function normalizeStatus(gatewayStatus: string): 'pending' | 'approved' | 'refunded' | 'failed' {
    const s = gatewayStatus.toLowerCase();
    if (['approved', 'confirmed', 'received'].includes(s)) return 'approved';
    if (['refunded', 'charged_back'].includes(s)) return 'refunded';
    if (['rejected', 'cancelled', 'failed', 'overdue'].includes(s)) return 'failed';
    return 'pending';
}

async function releaseBenefits(supabaseAdmin: any, userId: string, itemType: string, itemId: string, amount: number, referrerId?: string) {
    // 1. Atualiza Plano ou Créditos
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

    // 2. Comissão Afiliado
    if (referrerId) {
        const commission = parseFloat((Number(amount) * 0.20).toFixed(2));
        if (commission > 0) {
            const { data: refUser } = await supabaseAdmin.from("app_users").select("affiliate_balance").eq("id", referrerId).single();
            if (refUser) {
                const newBalance = (refUser.affiliate_balance || 0) + commission;
                await supabaseAdmin.from("app_users").update({ affiliate_balance: newBalance }).eq("id", referrerId);
                await supabaseAdmin.from("affiliate_logs").insert({
                    affiliate_id: referrerId,
                    source_user_id: userId,
                    amount: commission,
                    description: `Comissão 20% (Via Webhook)`
                });
            }
        }
    }
}
