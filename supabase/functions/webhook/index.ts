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

    // Inicializa cliente Supabase Admin (Bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let transactionId: string | null = null;
    let paymentStatus: string | null = null;
    let paidAmount: number | null = null;

    // --- LÓGICA MERCADO PAGO ---
    if (provider === "mercadopago") {
        const body = await req.json();
        const { type, data, action } = body;

        // MP envia notificações com action 'payment.created' ou 'payment.updated'
        // Ou type 'payment'
        if ((type === "payment" || action === "payment.created" || action === "payment.updated") && data?.id) {
            
            // Validação de Segurança: Consulta a API do MP para garantir que o pagamento existe e pegar status real
            const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
                headers: {
                    "Authorization": `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`
                }
            });
            
            if (mpRes.ok) {
                const paymentInfo = await mpRes.json();
                transactionId = paymentInfo.id.toString();
                paymentStatus = paymentInfo.status; // approved, pending, rejected, refunded
                paidAmount = paymentInfo.transaction_amount;
                console.log(`[Webhook MP] ID: ${transactionId}, Status: ${paymentStatus}`);
            } else {
                console.error("[Webhook MP] Erro ao validar pagamento:", await mpRes.text());
                return new Response(JSON.stringify({ error: "Payment validation failed" }), { status: 400, headers: corsHeaders });
            }
        } else {
            // Ignora outros tipos de notificação (ex: subscription, test)
            return new Response(JSON.stringify({ message: "Ignored type" }), { status: 200, headers: corsHeaders });
        }
    } 
    // --- LÓGICA ASAAS ---
    else if (provider === "asaas") {
        const body = await req.json();
        const { event, payment } = body;
        
        console.log(`[Webhook Asaas] Event: ${event}, ID: ${payment?.id}`);

        if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
            transactionId = payment.id;
            paymentStatus = "approved";
            paidAmount = payment.value;
        } else if (event === "PAYMENT_REFUNDED") {
             transactionId = payment.id;
             paymentStatus = "refunded";
        } else if (event === "PAYMENT_OVERDUE") {
             transactionId = payment.id;
             paymentStatus = "failed"; // ou expired
        } else {
             // Eventos intermediários ignorados
             return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
        }
    } else {
        return new Response(JSON.stringify({ error: "Provider not specified or invalid. Use ?provider=mercadopago or ?provider=asaas" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // --- PROCESSAMENTO DA TRANSAÇÃO ---
    if (transactionId && paymentStatus) {
        // 1. Busca transação no banco pelo ID externo
        const { data: tx, error: txError } = await supabaseAdmin
            .from("transactions")
            .select("*")
            .eq("external_id", transactionId)
            .single();

        if (txError && !tx) {
            console.warn(`[Webhook] Transação não encontrada para ID Externo: ${transactionId}`);
            // Retorna 200 para o gateway não ficar tentando reenviar se for uma transação que não iniciamos
            return new Response(JSON.stringify({ message: "Transaction not found locally" }), { status: 200, headers: corsHeaders });
        }

        if (tx) {
            // Evita processamento duplicado se já estiver aprovada
            if (tx.status === 'approved' && paymentStatus === 'approved') {
                 return new Response(JSON.stringify({ message: "Already approved" }), {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // Normaliza status para o banco
            let newDbStatus = 'pending';
            if (paymentStatus === 'approved') newDbStatus = 'approved';
            else if (paymentStatus === 'refunded') newDbStatus = 'refunded';
            else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled' || paymentStatus === 'failed') newDbStatus = 'failed';

            // Atualiza status no banco
            await supabaseAdmin
                .from("transactions")
                .update({ status: newDbStatus })
                .eq("id", tx.id);

            // Se aprovado, libera benefícios
            if (newDbStatus === 'approved') {
                // Busca usuário para saber quem indicou (Afiliado)
                const { data: userData } = await supabaseAdmin
                    .from("app_users")
                    .select("referred_by")
                    .eq("id", tx.usuario_id)
                    .single();

                const amountToUse = paidAmount || tx.valor;
                const metadata = tx.metadata || {};

                // Libera Créditos/Plano e Paga Comissão
                await releaseBenefits(
                    supabaseAdmin,
                    tx.usuario_id,
                    metadata.item_type, // 'plan' ou 'credits'
                    metadata.item_id,   // plan_id ou amount de creditos
                    Number(amountToUse),
                    userData?.referred_by
                );
                
                // Opcional: Logar sucesso
                await supabaseAdmin.from("logs").insert({
                    usuario_id: tx.usuario_id,
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
    console.error("Webhook Critical Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Lógica Compartilhada de Liberação de Benefícios (Idêntica a mp-pagar e asaas-pagar)
async function releaseBenefits(supabaseAdmin: any, userId: string, itemType: string, itemId: string, amount: number, referrerId?: string) {
    console.log(`[Benefits] Liberando ${itemType} (${itemId}) para ${userId}`);
    
    if (itemType === "plan") {
        // Atualiza plano do usuário
        await supabaseAdmin.from("app_users").update({ plan: itemId }).eq("id", userId);
        
        // Busca configuração do plano para dar os créditos mensais imediatamente
        const { data: config } = await supabaseAdmin.from("system_config").select("value").eq("key", "all_plans").single();
        if (config?.value) {
          const plan = (config.value as any[]).find((p: any) => p.id === itemId);
          if (plan) {
            // Upsert user credits
            await supabaseAdmin.from("user_credits").upsert({ user_id: userId, credits: plan.credits }, { onConflict: "user_id" });
          }
        }
    } else if (itemType === "credits") {
        // Adiciona créditos avulsos (itemId contém a quantidade numérica como string)
        const { data: current } = await supabaseAdmin.from("user_credits").select("credits").eq("user_id", userId).single();
        const currentCredits = current?.credits === -1 ? -1 : (current?.credits || 0);
        
        if (currentCredits !== -1) {
            const newCredits = currentCredits + Number(itemId); 
            await supabaseAdmin.from("user_credits").upsert({ user_id: userId, credits: newCredits }, { onConflict: "user_id" });
        }
    }

    // Processa Comissão de Afiliado (20%)
    if (referrerId) {
        const commission = parseFloat((Number(amount) * 0.2).toFixed(2));
        if (commission > 0) {
            const { data: refUser } = await supabaseAdmin.from("app_users").select("affiliate_balance").eq("id", referrerId).single();
            if (refUser) {
                const newBalance = (refUser.affiliate_balance || 0) + commission;
                await supabaseAdmin.from("app_users").update({ affiliate_balance: newBalance }).eq("id", referrerId);
                
                await supabaseAdmin.from("affiliate_logs").insert({
                    affiliate_id: referrerId,
                    source_user_id: userId,
                    amount: commission,
                    description: `Comissão 20% - ${itemType === 'plan' ? 'Assinatura Plano' : 'Compra Créditos'} (Via Webhook)`
                });
            }
        }
    }
}