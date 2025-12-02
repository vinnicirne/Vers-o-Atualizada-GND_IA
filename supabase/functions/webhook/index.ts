
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
    console.log(`[Webhook] Requisição recebida: ${req.url}, Método: ${req.method}`);
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
    let transactionMetadata: any = {}; // Para capturar e persistir metadados úteis
    let rawBody: string = '';

    // Tenta fazer parse do body, capturando o raw body se falhar
    let body: any;
    try {
        body = await req.json();
        rawBody = JSON.stringify(body);
        console.log(`[Webhook] Body JSON parseado: ${rawBody}`);
    } catch (jsonError) {
        rawBody = await req.text();
        console.error(`[Webhook] Erro ao parsear JSON. Body raw: ${rawBody}. Erro: ${jsonError.message}`);
        // Se o body não for JSON válido, loga e tenta seguir, mas pode falhar mais tarde.
    }

    // --- AUTO DETECÇÃO DE PROVEDOR ---
    // Se não vier na URL, tenta adivinhar pelo payload
    let provider = url.searchParams.get("provider");
    
    if (!provider) {
        if (body && (body.action === "payment.updated" || body.action === "payment.created" || body.type === "payment")) {
            console.log("[Webhook] Provedor detectado automaticamente: Mercado Pago");
            provider = "mercadopago";
        } else if (body && body.event && body.event.startsWith("PAYMENT_")) {
            console.log("[Webhook] Provedor detectado automaticamente: Asaas");
            provider = "asaas";
        }
    }
    
    // --- LÓGICA MERCADO PAGO ---
    if (provider === "mercadopago") {
        const { type, data, action } = body;
        
        // Verifica ID no data (v1) ou na raiz (testes antigos)
        let notificationId = data?.id;
        if (!notificationId && body.id) notificationId = body.id; // Fallback para payload de teste direto

        if (notificationId) {
            notificationId = notificationId.toString();
            console.log(`[Webhook MP] ID de notificação extraído: ${notificationId}`);

            // === BYPASS PARA TESTE DO PAINEL DO MERCADO PAGO ===
            if (notificationId === "123456") {
                console.log("[Webhook MP] Notificação de TESTE recebida (ID 123456). Retornando 200 OK.");
                return new Response(JSON.stringify({ success: true, message: "Test received" }), { 
                    status: 200, 
                    headers: corsHeaders 
                });
            }
            // ====================================================
            
            // Validação de Segurança: Consulta a API do MP para garantir que o pagamento existe e pegar status real
            const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");
            if (!mpAccessToken) {
                console.error("[Webhook MP] Erro: MP_ACCESS_TOKEN não configurado no ambiente.");
                return new Response(JSON.stringify({ error: "Server config error: MP_ACCESS_TOKEN missing" }), { status: 500, headers: corsHeaders });
            }

            const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${notificationId}`, {
                headers: {
                    "Authorization": `Bearer ${mpAccessToken}`
                }
            });
            
            if (mpRes.ok) {
                const paymentInfo = await mpRes.json();
                transactionId = paymentInfo.id.toString();
                paymentStatus = paymentInfo.status; // approved, pending, rejected, refunded
                paidAmount = paymentInfo.transaction_amount;
                transactionMetadata.mp_id = paymentInfo.id;
                transactionMetadata.provider = "mercado_pago";
                console.log(`[Webhook MP] Re-fetched payment ID: ${transactionId}, Status API: ${paymentStatus}, Valor: ${paidAmount}`);
            } else {
                const errorText = await mpRes.text();
                console.error("[Webhook MP] Erro ao validar pagamento na API do MP:", errorText);
                // Retorna 200 mesmo em erro de validação para evitar que o MP fique reenviando infinitamente se for um ID inválido antigo
                return new Response(JSON.stringify({ error: "Payment validation failed", details: errorText }), { status: 200, headers: corsHeaders });
            }
        } else {
            console.log("[Webhook MP] Tipo de notificação ignorado ou sem ID.");
            return new Response(JSON.stringify({ message: "Ignored" }), { status: 200, headers: corsHeaders });
        }
    } 
    // --- LÓGICA ASAAS ---
    else if (provider === "asaas") {
        const { event, payment } = body;
        
        console.log(`[Webhook Asaas] Evento: ${event}, ID Pagamento: ${payment?.id}, Status: ${payment?.status}`);

        if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
            transactionId = payment.id;
            subscriptionId = payment.subscription; // Se for assinatura, esse campo existe
            paymentStatus = "approved"; // Asaas status 'CONFIRMED' ou 'RECEIVED' -> 'approved'
            paidAmount = payment.value;
            transactionMetadata.asaas_id = payment.id;
            transactionMetadata.provider = "asaas";
            transactionMetadata.payment_status_asaas = payment.status;
        } else if (event === "PAYMENT_REFUNDED") {
             transactionId = payment.id;
             paymentStatus = "refunded";
             paidAmount = payment.value;
             transactionMetadata.asaas_id = payment.id;
             transactionMetadata.provider = "asaas";
             transactionMetadata.payment_status_asaas = payment.status;
        } else if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_CANCELED") {
             transactionId = payment.id;
             paymentStatus = "failed"; // ou expired
             paidAmount = payment.value;
             transactionMetadata.asaas_id = payment.id;
             transactionMetadata.provider = "asaas";
             transactionMetadata.payment_status_asaas = payment.status;
        } else {
             console.log(`[Webhook Asaas] Evento "${event}" ignorado.`);
             return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
        }
    } else {
        console.warn(`[Webhook] Provedor "${provider}" não especificado ou inválido. Body raw: ${rawBody}`);
        return new Response(JSON.stringify({ error: `Provider "${provider}" not specified or invalid.` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // --- PROCESSAMENTO DA TRANSAÇÃO ---
    if (transactionId && paymentStatus) {
        console.log(`[Webhook] Iniciando processamento para transação ID: "${transactionId}", Novo Status: "${paymentStatus}"`);
        
        // 1. Busca transação no banco pelo ID externo (Pagamento)
        console.log(`[Webhook] Searching DB for external_id: "${transactionId}"`);
        const { data: tx, error: txError } = await supabaseAdmin
            .from("transactions")
            .select("*")
            .eq("external_id", transactionId)
            .single();

        let targetTx = tx;

        // --- LÓGICA DE RECORRÊNCIA (ASSAAS MÊS 2+) ---
        // Se a transação não existe E é uma assinatura do Asaas, significa que é um pagamento recorrente (nova fatura)
        if (!tx && subscriptionId && provider === "asaas") {
            console.log(`[Webhook] Transação ${transactionId} não encontrada, mas possui subscriptionId ${subscriptionId}. Verificando recorrência.`);
            
            // Busca o usuário dono dessa assinatura
            const { data: subUser, error: subUserError } = await supabaseAdmin
                .from("app_users")
                .select("id, email, plan")
                .eq("subscription_id", subscriptionId)
                .single();

            if (subUser) {
                console.log(`[Webhook] Recorrência identificada para usuário ${subUser.email}. Criando nova transação automática.`);
                
                // Normaliza status
                let newDbStatus: 'pending' | 'approved' | 'refunded' | 'failed' = 'pending';
                if (paymentStatus === 'approved') newDbStatus = 'approved';
                else if (paymentStatus === 'refunded') newDbStatus = 'refunded';
                else if (paymentStatus === 'failed') newDbStatus = 'failed';

                // Cria nova transação para o mês corrente
                const { data: newRecurrTx, error: newTxError } = await supabaseAdmin.from("transactions").insert({
                    usuario_id: subUser.id,
                    valor: Number(paidAmount),
                    metodo: 'card', // Assumindo padrão assinatura
                    status: newDbStatus,
                    external_id: transactionId, // ID do pagamento atual do Asaas
                    metadata: { 
                        provider: "asaas", 
                        item_type: 'plan', 
                        item_id: subUser.plan || 'premium', // Assume o plano atual do usuário
                        is_subscription: true,
                        subscription_id: subscriptionId,
                        auto_generated: true 
                    },
                    data: new Date().toISOString(),
                }).select().single();

                if (!newTxError) {
                    targetTx = newRecurrTx;
                    console.log(`[Webhook] Nova transação de recorrência criada: ${newRecurrTx.id}`);
                } else {
                    console.error(`[Webhook] Erro ao criar transação de recorrência: ${newTxError.message}`);
                }
            } else {
                console.warn(`[Webhook] Assinatura ${subscriptionId} não vinculada a nenhum usuário no sistema.`);
            }
        }

        if (targetTx) {
            console.log(`[Webhook] Processando Transação Local (DB ID: ${targetTx.id}). Status atual: "${targetTx.status}", Novo status: "${paymentStatus}"`);

            // Evita processamento duplicado se já estiver aprovada
            if (targetTx.status === 'approved' && paymentStatus === 'approved') {
                 console.log(`[Webhook] Transação ${targetTx.id} já está aprovada. Ignorando atualização duplicada.`);
                 return new Response(JSON.stringify({ message: "Already approved" }), {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // Normaliza status para o banco
            let newDbStatus: 'pending' | 'approved' | 'refunded' | 'failed' = 'pending';
            if (paymentStatus === 'approved' || paymentStatus === 'CONFIRMED' || paymentStatus === 'RECEIVED') newDbStatus = 'approved';
            else if (paymentStatus === 'refunded' || paymentStatus === 'CHARGED_BACK') newDbStatus = 'refunded';
            else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled' || paymentStatus === 'failed' || paymentStatus === 'OVERDUE') newDbStatus = 'failed';
            else if (paymentStatus === 'pending' || paymentStatus === 'AUTHORIZED' || paymentStatus === 'BILLET_PRINTED') newDbStatus = 'pending';

            console.log(`[Webhook] Atualizando status DB de "${targetTx.status}" para "${newDbStatus}" para transação ID: ${targetTx.id}`);

            // Atualiza status no banco
            const { error: updateError } = await supabaseAdmin
                .from("transactions")
                .update({ status: newDbStatus, metadata: { ...targetTx.metadata, ...transactionMetadata } })
                .eq("id", targetTx.id);

            if (updateError) {
                console.error(`[Webhook] Erro ao atualizar status da transação ${targetTx.id}: ${updateError.message}`);
                return new Response(JSON.stringify({ error: `Failed to update transaction status: ${updateError.message}` }), { status: 500, headers: corsHeaders });
            }

            // Se aprovado, libera benefícios
            if (newDbStatus === 'approved') {
                console.log(`[Webhook] Status "approved" detectado. Iniciando liberação de benefícios para usuário ${targetTx.usuario_id}.`);
                // Busca usuário para saber quem indicou (Afiliado)
                const { data: userData, error: userError } = await supabaseAdmin
                    .from("app_users")
                    .select("referred_by")
                    .eq("id", targetTx.usuario_id)
                    .single();

                const amountToUse = paidAmount || targetTx.valor; 
                const metadata = targetTx.metadata || {};

                // Libera Créditos/Plano e Paga Comissão
                await releaseBenefits(
                    supabaseAdmin,
                    targetTx.usuario_id,
                    metadata.item_type, // 'plan' ou 'credits'
                    metadata.item_id,   // plan_id ou amount de creditos
                    Number(amountToUse),
                    userData?.referred_by
                );
                
                await supabaseAdmin.from("logs").insert({
                    usuario_id: targetTx.usuario_id,
                    acao: "payment_approved_webhook",
                    modulo: "Pagamentos",
                    detalhes: { provider, transactionId, amount: amountToUse, itemType: metadata.item_type, itemId: metadata.item_id },
                    data: new Date().toISOString()
                });
                console.log(`[Webhook] Liberação de benefícios e log para transação ${targetTx.id} concluídos.`);

            } else {
                console.log(`[Webhook] Transação ${targetTx.id} com status "${newDbStatus}". Benefícios não liberados.`);
            }
        } else {
             console.warn(`[Webhook] Transação não encontrada e não processada como recorrência. ID Externo: ${transactionId}`);
        }
    }

    console.log(`[Webhook] Processamento finalizado para "${transactionId}". Retornando 200 OK.`);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Webhook Critical Error during execution:", err.message || JSON.stringify(err));
    return new Response(JSON.stringify({ error: `Internal server error: ${err.message || JSON.stringify(err)}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Lógica Compartilhada de Liberação de Benefícios
async function releaseBenefits(supabaseAdmin: any, userId: string, itemType: string, itemId: string, amount: number, referrerId?: string) {
    console.log(`[Benefits Helper (Webhook)] Iniciando liberação para userId: ${userId}, itemType: ${itemType}, itemId: ${itemId}, amount: ${amount}, referrerId: ${referrerId}`);
    
    // Libera plano ou créditos
    if (itemType === "plan") {
        console.log(`[Benefits Helper (Webhook)] Atualizando plano para "${itemId}" para o usuário ${userId}`);
        await supabaseAdmin.from("app_users").update({ plan: itemId }).eq("id", userId);
        
        const { data: config, error: configError } = await supabaseAdmin.from("system_config").select("value").eq("key", "all_plans").single();
        if (configError) console.error(`[Benefits Helper (Webhook)] Erro ao buscar config de planos: ${configError.message}`);

        if (config?.value) {
          const plan = (config.value as any[]).find((p: any) => p.id === itemId);
          if (plan) {
            console.log(`[Benefits Helper (Webhook)] Atribuindo ${plan.credits} créditos do plano "${itemId}" para ${userId}`);
            await supabaseAdmin.from("user_credits").upsert({ user_id: userId, credits: plan.credits }, { onConflict: "user_id" });
          } else {
            console.warn(`[Benefits Helper (Webhook)] Plano "${itemId}" não encontrado na configuração de sistema. Créditos não atribuídos.`);
          }
        } else {
            console.warn(`[Benefits Helper (Webhook)] Configuração 'all_plans' não encontrada ou vazia.`);
        }
    } else if (itemType === "credits") {
        console.log(`[Benefits Helper (Webhook)] Adicionando ${itemId} créditos para o usuário ${userId}`);
        const { data: current, error: currentCreditsError } = await supabaseAdmin.from("user_credits").select("credits").eq("user_id", userId).single();
        if (currentCreditsError) console.warn(`[Benefits Helper (Webhook)] Erro ao buscar créditos atuais para ${userId}: ${currentCreditsError.message}`);

        const currentCredits = current?.credits === -1 ? -1 : (current?.credits || 0); // Admins (ilimitado) não recebem mais créditos
        
        if (currentCredits !== -1) {
            const newCredits = currentCredits + Number(itemId); 
            console.log(`[Benefits Helper (Webhook)] Créditos de ${currentCredits} para ${newCredits} para ${userId}`);
            await supabaseAdmin.from("user_credits").upsert({ user_id: userId, credits: newCredits }, { onConflict: "user_id" });
        } else {
            console.log(`[Benefits Helper (Webhook)] Usuário ${userId} tem créditos ilimitados. Nenhuma alteração de saldo.`);
        }
    }

    // Processa Comissão de Afiliado (20%)
    if (referrerId) {
        console.log(`[Benefits Helper (Webhook)] Processando comissão de afiliado para ${referrerId} da compra de ${userId}`);
        const COMMISSION_RATE = 0.20; // Definido como constante
        const commission = parseFloat((Number(amount) * COMMISSION_RATE).toFixed(2));
        
        if (commission > 0) {
            const { data: refUser, error: refUserError } = await supabaseAdmin.from("app_users").select("affiliate_balance").eq("id", referrerId).single();
            if (refUserError) console.error(`[Benefits Helper (Webhook)] Erro ao buscar afiliado ${referrerId}: ${refUserError.message}`);

            if (refUser) {
                const newBalance = (refUser.affiliate_balance || 0) + commission;
                console.log(`[Benefits Helper (Webhook)] Atualizando saldo do afiliado ${referrerId} de ${refUser.affiliate_balance} para ${newBalance}. Comissão: ${commission}`);
                await supabaseAdmin.from("app_users").update({ affiliate_balance: newBalance }).eq("id", referrerId);
                
                await supabaseAdmin.from("affiliate_logs").insert({
                    affiliate_id: referrerId,
                    source_user_id: userId,
                    amount: commission,
                    description: `Comissão ${COMMISSION_RATE * 100}% - ${itemType === 'plan' ? 'Assinatura Plano' : 'Compra Créditos'} (Via Webhook)`
                });
            }
        } else {
            console.log(`[Benefits Helper (Webhook)] Comissão calculada foi zero ou negativa (${commission}). Não será processada.`);
        }
    } else {
        console.log(`[Benefits Helper (Webhook)] Usuário ${userId} não foi indicado. Nenhuma comissão de afiliado.`);
    }
    console.log(`[Benefits Helper (Webhook)] Liberação de benefícios concluída.`);
}
