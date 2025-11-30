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
    const provider = url.searchParams.get("provider"); // ?provider=mercadopago OR ?provider=asaas

    // Inicializa cliente Supabase Admin (Bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let transactionId: string | null = null;
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
        // Para webhooks, é comum que provedores enviem tipos diferentes.
        // Se for um provedor específico que esperamos JSON, podemos retornar erro aqui.
        // Por enquanto, tentamos seguir.
    }
    
    // --- LÓGICA MERCADO PAGO ---
    if (provider === "mercadopago") {
        const { type, data, action } = body;
        
        // MP envia notificações com action 'payment.created' ou 'payment.updated'
        // Ou type 'payment'
        if ((type === "payment" || action === "payment.created" || action === "payment.updated") && data?.id) {
            const notificationId = data.id.toString();
            console.log(`[Webhook MP] Extracted notification ID from body.data.id: ${notificationId}`);
            
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
                return new Response(JSON.stringify({ error: "Payment validation failed at Mercado Pago API" }), { status: 400, headers: corsHeaders });
            }
        } else {
            console.log("[Webhook MP] Tipo de notificação ignorado (não é payment.created/updated ou type=payment).");
            // Ignora outros tipos de notificação (ex: subscription, test)
            return new Response(JSON.stringify({ message: "Ignored type" }), { status: 200, headers: corsHeaders });
        }
    } 
    // --- LÓGICA ASAAS ---
    else if (provider === "asaas") {
        const { event, payment } = body;
        
        console.log(`[Webhook Asaas] Evento: ${event}, ID Pagamento: ${payment?.id}, Status: ${payment?.status}`);

        if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
            transactionId = payment.id;
            paymentStatus = "approved"; // Asaas status 'CONFIRMED' ou 'RECEIVED' -> 'approved'
            paidAmount = payment.value;
            transactionMetadata.asaas_id = payment.id;
            transactionMetadata.provider = "asaas";
            transactionMetadata.payment_status_asaas = payment.status; // Manter status original do Asaas
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
             // Eventos intermediários ignorados
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
        
        // 1. Busca transação no banco pelo ID externo
        console.log(`[Webhook] Searching DB for external_id: "${transactionId}"`);
        const { data: tx, error: txError } = await supabaseAdmin
            .from("transactions")
            .select("*")
            .eq("external_id", transactionId)
            .single();

        if (txError && txError.code === 'PGRST116') { // PGRST116 = no rows found
            console.warn(`[Webhook] Transação NÃO ENCONTRADA no DB para external_id: "${transactionId}" (PGRST116). Isso pode ser uma notificação de teste ou um pagamento externo não iniciado pelo nosso app. Body raw: ${rawBody}`);
            // Retorna 200 para o gateway não ficar tentando reenviar se for uma transação que não iniciamos
            return new Response(JSON.stringify({ message: `Transaction not found locally for external_id "${transactionId}", gracefully ignored` }), { status: 200, headers: corsHeaders });
        } else if (txError) {
            console.error(`[Webhook] Erro ao buscar transação no DB para external_id "${transactionId}": ${txError.message}`);
            return new Response(JSON.stringify({ error: `Database error during transaction lookup: ${txError.message}` }), { status: 500, headers: corsHeaders });
        }

        if (tx) {
            console.log(`[Webhook] Transação local ENCONTRADA (DB ID: ${tx.id}). Status atual: "${tx.status}", Novo status reportado pelo gateway: "${paymentStatus}"`);

            // Evita processamento duplicado se já estiver aprovada
            if (tx.status === 'approved' && paymentStatus === 'approved') {
                 console.log(`[Webhook] Transação ${tx.id} já está aprovada. Ignorando atualização duplicada.`);
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
            else if (paymentStatus === 'pending' || paymentStatus === 'AUTHORIZED' || paymentStatus === 'BILLET_PRINTED') newDbStatus = 'pending'; // Mantém como pending

            console.log(`[Webhook] Atualizando status DB de "${tx.status}" para "${newDbStatus}" para transação ID: ${tx.id}`);

            // Atualiza status no banco
            const { error: updateError } = await supabaseAdmin
                .from("transactions")
                .update({ status: newDbStatus, metadata: { ...tx.metadata, ...transactionMetadata } }) // Mescla metadados
                .eq("id", tx.id);

            if (updateError) {
                console.error(`[Webhook] Erro ao atualizar status da transação ${tx.id}: ${updateError.message}`);
                return new Response(JSON.stringify({ error: `Failed to update transaction status: ${updateError.message}` }), { status: 500, headers: corsHeaders });
            }

            // Se aprovado, libera benefícios
            if (newDbStatus === 'approved') {
                console.log(`[Webhook] Status "approved" detectado. Iniciando liberação de benefícios para usuário ${tx.usuario_id}.`);
                // Busca usuário para saber quem indicou (Afiliado)
                const { data: userData, error: userError } = await supabaseAdmin
                    .from("app_users")
                    .select("referred_by")
                    .eq("id", tx.usuario_id)
                    .single();

                if (userError) console.warn(`[Webhook] Erro ao buscar dados do usuário ${tx.usuario_id} (referido): ${userError.message}`);

                const amountToUse = paidAmount || tx.valor; // Prioriza o valor real pago se disponível
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
                    detalhes: { provider, transactionId, amount: amountToUse, itemType: metadata.item_type, itemId: metadata.item_id },
                    data: new Date().toISOString()
                });
                console.log(`[Webhook] Liberação de benefícios e log para transação ${tx.id} concluídos.`);

            } else {
                console.log(`[Webhook] Transação ${tx.id} com status "${newDbStatus}". Benefícios não liberados.`);
            }
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

// Lógica Compartilhada de Liberação de Benefícios (Idêntica a mp-pagar e asaas-pagar)
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