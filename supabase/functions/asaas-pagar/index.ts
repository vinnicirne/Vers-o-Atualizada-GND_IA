
// supabase/functions/asaas-pagar/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Método não permitido", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[asaas-pagar] Token de autenticação ausente.");
      return new Response(JSON.stringify({ error: "Token ausente" }), { status: 401, headers: corsHeaders });
    }
    const jwt = authHeader.split(" ")[1];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      console.error("[asaas-pagar] Sessão inválida ou expirada.", authError);
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqJson = await req.json();
    console.log("[asaas-pagar] Requisição JSON recebida:", JSON.stringify(reqJson));

    // --- CHECK FOR SERVER CONFIG ---
    const asaasKey = Deno.env.get("ASAAS_KEY");
    if (!asaasKey) {
        console.error("ERRO CRÍTICO: Variável ASAAS_KEY não definida no Supabase.");
        return new Response(JSON.stringify({ 
            error: "Erro de Configuração no Servidor: Chave do Asaas não encontrada. Contate o administrador.",
            code: "server_config_error"
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    const asaasApiBaseUrl = Deno.env.get("ASAAS_API_BASE_URL") || "https://api.asaas.com"; // Default para produção

    // --- MODO 1: CANCELAMENTO DE ASSINATURA ---
    if (reqJson.action === 'cancel_subscription') {
        const { subscription_id } = reqJson;
        if (!subscription_id) {
            return new Response(JSON.stringify({ error: "ID da assinatura obrigatório." }), { status: 400, headers: corsHeaders });
        }

        console.log(`[asaas-pagar] Cancelando assinatura ${subscription_id} para usuário ${authUser.id}`);

        // Deleta no Asaas
        const cancelRes = await fetch(`${asaasApiBaseUrl}/api/v3/subscriptions/${subscription_id}`, {
            method: "DELETE",
            headers: { "access_token": asaasKey, "Content-Type": "application/json" }
        });

        // Safe JSON Parse
        let cancelData;
        try {
            cancelData = await cancelRes.json();
        } catch (e) {
            console.error("Erro ao parsear resposta de cancelamento:", e);
            cancelData = { deleted: false };
        }
        
        // Asaas retorna { deleted: true, id: ... } em sucesso
        if (!cancelRes.ok && !cancelData.deleted) {
             const errorMsg = cancelData.errors?.[0]?.description || "Falha ao cancelar no Asaas.";
             return new Response(JSON.stringify({ error: errorMsg }), { status: 400, headers: corsHeaders });
        }

        // Atualiza banco
        await supabaseAdmin.from("app_users").update({ 
            subscription_status: 'CANCELED',
            plan: 'free' // Degrada para free ou mantém até o fim do ciclo? Simplificando: degrada
        }).eq("id", authUser.id);

        return new Response(JSON.stringify({ success: true, message: "Assinatura cancelada com sucesso." }), { status: 200, headers: corsHeaders });
    }

    // --- MODO 2: VERIFICAÇÃO DE STATUS (POLLING) ---
    if (reqJson.check_status_id) {
        console.log(`[asaas-pagar] Verificando status para ID: ${reqJson.check_status_id}`);
        const { data: tx, error: txError } = await supabaseAdmin
            .from("transactions")
            .select("status")
            .or(`external_id.eq.${reqJson.check_status_id},id.eq.${reqJson.check_status_id}`)
            .single();
        
        if (txError && txError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error(`[asaas-pagar] Erro ao buscar transação para polling: ${txError.message}`);
            return new Response(JSON.stringify({ error: `Database error during polling: ${txError.message}` }), { status: 500, headers: corsHeaders });
        }

        console.log(`[asaas-pagar] Status da transação ${reqJson.check_status_id}: ${tx?.status || 'pending'}`);
        return new Response(JSON.stringify({ status: tx?.status || 'pending' }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // --- MODO 3: PAGAMENTO (ASSINATURA OU AVULSO) ---
    const {
      creditCardToken,
      creditCard,
      creditCardHolderInfo,
      amount,
      item_type,
      item_id,
      installments = 1,
      billingType, // 'PIX' ou 'CREDIT_CARD'
      docNumber // CPF/CNPJ
    } = reqJson;

    if (!amount || !item_type || !item_id || !billingType) {
        console.error("[asaas-pagar] Dados do pagamento incompletos:", reqJson);
        return new Response(JSON.stringify({ error: "Dados do pagamento incompletos." }), { status: 400, headers: corsHeaders });
    }

    // Busca dados do usuário
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from("app_users")
      .select("email, full_name, asaas_customer_id, referred_by")
      .eq("id", authUser.id)
      .single();

    if (userDataError || !userData?.email) {
      console.error("[asaas-pagar] Usuário não encontrado no banco de dados ou erro:", userDataError);
      return new Response(JSON.stringify({ error: "Usuário não encontrado." }), { status: 404, headers: corsHeaders });
    }

    const userEmail = userData.email;
    const userFullName = userData.full_name || userEmail.split("@")[0];
    let asaasCustomerId = userData.asaas_customer_id;
    const referrerId = userData.referred_by;

    // Se docNumber não veio, usa um default para Sandbox (não recomendado em prod)
    const cpfCnpjToUse = docNumber || "00000000000";

    // Garante cliente no Asaas
    if (!asaasCustomerId) {
      console.log(`[asaas-pagar] Cliente Asaas não encontrado para ${authUser.id}. Tentando criar/buscar.`);
      // 1. Tenta criar cliente
      let customerResponse = await fetch(`${asaasApiBaseUrl}/api/v3/customers`, {
        method: "POST",
        headers: { "access_token": asaasKey, "Content-Type": "application/json" },
        body: JSON.stringify({ 
            name: userFullName, 
            email: userEmail, 
            externalReference: authUser.id,
            cpfCnpj: cpfCnpjToUse
        }),
      });
      
      let customer;
      try {
          customer = await customerResponse.json();
      } catch (e) {
          console.error("Falha ao parsear resposta de criação de cliente Asaas");
          return new Response(JSON.stringify({ error: "Erro de comunicação com Asaas ao criar cliente." }), { status: 502, headers: corsHeaders });
      }

      console.log("[asaas-pagar] Resposta de criação/busca de cliente Asaas:", JSON.stringify(customer));
      
      if (!customer.id) {
          // Se falhar (ex: email já existe no Asaas mas não no nosso banco), tenta buscar por email
          if (customer.errors?.[0]?.code === 'invalid_customer' || (customer.errors?.[0]?.description && customer.errors[0].description.includes('email'))) {
               console.log("[asaas-pagar] Erro ao criar cliente (possivelmente email já existe). Tentando buscar por email.");
               const searchRes = await fetch(`${asaasApiBaseUrl}/api/v3/customers?email=${userEmail}`, {
                   headers: { "access_token": asaasKey }
               });
               
               let searchData;
               try {
                   searchData = await searchRes.json();
               } catch(e) { /* ignore */ }

               if (searchData && searchData.data && searchData.data.length > 0) {
                   asaasCustomerId = searchData.data[0].id;
                   console.log(`[asaas-pagar] Cliente Asaas encontrado por email: ${asaasCustomerId}`);
               }
          }
          
          if (!asaasCustomerId) {
             console.error("[asaas-pagar] Falha final ao registrar cliente no Asaas:", customer.errors?.[0]?.description || JSON.stringify(customer));
             return new Response(JSON.stringify({ error: "Falha ao registrar cliente no Asaas: " + (customer.errors?.[0]?.description || "Erro desconhecido") }), { status: 500, headers: corsHeaders });
          }
      } else {
          asaasCustomerId = customer.id;
          console.log(`[asaas-pagar] Cliente Asaas criado/confirmado: ${asaasCustomerId}`);
      }
      
      // Salva ID no banco
      const { error: updateCustomerError } = await supabaseAdmin.from("app_users").update({ asaas_customer_id: asaasCustomerId }).eq("id", authUser.id);
      if (updateCustomerError) console.warn(`[asaas-pagar] Erro ao salvar asaas_customer_id no DB: ${updateCustomerError.message}`);
    }

    const isPix = billingType === 'PIX';
    const isSubscription = item_type === 'plan'; // Planos viram assinaturas, créditos viram pagamentos únicos

    // --- CONSTRUÇÃO DO PAYLOAD ---
    let paymentPayload: any = {
      customer: asaasCustomerId,
      billingType: isPix ? "PIX" : "CREDIT_CARD",
      value: Number(amount),
      description: `GDN_IA: ${item_type} (${item_id})`,
      remoteIp: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
    };

    if (isSubscription) {
        paymentPayload.cycle = "MONTHLY"; // Assinatura mensal
        paymentPayload.nextDueDate = new Date(Date.now()).toISOString().slice(0, 10); // Cobra hoje
    } else {
        paymentPayload.dueDate = new Date(Date.now()).toISOString().slice(0, 10); // Vencimento hoje
        if (!isPix && Number(installments) > 1) {
            paymentPayload.installmentCount = Number(installments);
            paymentPayload.installmentValue = Number((Number(amount) / Number(installments)).toFixed(2));
        }
    }

    if (!isPix) {
        if (creditCardToken) {
            paymentPayload.creditCardToken = creditCardToken;
        } else {
            paymentPayload.creditCard = creditCard;
            paymentPayload.creditCardHolderInfo = creditCardHolderInfo || {
                name: userFullName,
                email: userEmail,
                cpfCnpj: cpfCnpjToUse,
                postalCode: "00000000",
                addressNumber: "0",
                phone: "11999999999"
            };
        }
    }

    console.log(`[asaas-pagar] Enviando payload para Asaas (${isSubscription ? 'ASSINATURA' : 'PAGAMENTO ÚNICO'}):`, JSON.stringify(paymentPayload));
    
    // Escolhe endpoint correto
    const endpoint = isSubscription ? `${asaasApiBaseUrl}/api/v3/subscriptions` : `${asaasApiBaseUrl}/api/v3/payments`;

    // Cria cobrança/assinatura
    const paymentRes = await fetch(endpoint, {
      method: "POST",
      headers: { "access_token": asaasKey, "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload),
    });

    let paymentData;
    try {
        paymentData = await paymentRes.json();
    } catch (e) {
        const text = await paymentRes.text();
        console.error(`[asaas-pagar] Erro de parse JSON Asaas (Status ${paymentRes.status}):`, text);
        return new Response(JSON.stringify({ 
            error: "Erro de comunicação com gateway de pagamento (Resposta inválida). Tente novamente." 
        }), { status: 502, headers: corsHeaders });
    }

    console.log("[asaas-pagar] Resposta completa do Asaas:", JSON.stringify(paymentData));

    if (!paymentRes.ok || paymentData.errors) {
        const errorMsg = paymentData.errors?.[0]?.description || paymentData.error || "Pagamento recusado.";
        console.error("[asaas-pagar] Erro na API do Asaas:", errorMsg);
        return new Response(JSON.stringify({ error: errorMsg }), { status: 400, headers: corsHeaders });
    }

    // --- TRATAMENTO PÓS-CRIAÇÃO ---
    // Em assinaturas, paymentData.id é o ID da Assinatura.
    // Em pagamentos, é o ID do Pagamento.
    
    const entityId = paymentData.id;
    const status = paymentData.status; // ACTIVE (Sub) ou PENDING/CONFIRMED (Pay)

    // Se for assinatura, salva o ID no usuário imediatamente
    if (isSubscription) {
        await supabaseAdmin.from("app_users").update({ 
            subscription_id: entityId,
            subscription_status: status 
        }).eq("id", authUser.id);
    }

    // Salva transação no DB (para histórico e webhook)
    const transactionStatus = (status === "CONFIRMED" || status === "RECEIVED" || status === "ACTIVE") ? "approved" : "pending";
    
    const { data: newTx, error: insertTxError } = await supabaseAdmin.from("transactions").insert({
      usuario_id: authUser.id,
      valor: Number(amount),
      metodo: isPix ? "pix" : "card",
      status: transactionStatus, 
      external_id: entityId,
      metadata: { provider: "asaas", item_type, item_id, asaas_status: status, is_subscription: isSubscription },
      data: new Date().toISOString(),
    })
    .select()
    .single();

    if (insertTxError) {
        console.error(`[asaas-pagar] Erro ao inserir transação no DB: ${insertTxError.message}`);
    }

    // Se for PIX, busca o QR Code (2ª chamada necessária no Asaas)
    if (isPix) {
        // Para assinaturas Pix, precisamos pegar o pagamento pendente gerado pela assinatura
        let pixPaymentId = entityId;
        
        if (isSubscription) {
            // Busca o primeiro pagamento gerado pela assinatura
            const subPaymentsRes = await fetch(`${asaasApiBaseUrl}/api/v3/subscriptions/${entityId}/payments`, {
                headers: { "access_token": asaasKey }
            });
            let subPayments;
            try {
                subPayments = await subPaymentsRes.json();
            } catch(e) {}

            if (subPayments && subPayments.data && subPayments.data.length > 0) {
                pixPaymentId = subPayments.data[0].id; // Pega o pagamento da primeira cobrança
                // Atualiza a transação com o ID do pagamento real para o webhook encontrar
                await supabaseAdmin.from("transactions").update({ external_id: pixPaymentId }).eq("id", newTx.id);
            }
        }

        const qrRes = await fetch(`${asaasApiBaseUrl}/api/v3/payments/${pixPaymentId}/pixQrCode`, {
            method: "GET",
            headers: { "access_token": asaasKey, "Content-Type": "application/json" }
        });
        
        let qrData;
        try {
            qrData = await qrRes.json();
        } catch(e) {
            console.error("Erro parse QR Code Asaas");
            return new Response(JSON.stringify({ error: "Erro ao gerar QR Code (Parse Error)" }), { status: 502, headers: corsHeaders });
        }
        
        if (!qrRes.ok || qrData.errors) {
            return new Response(JSON.stringify({ error: "Falha ao gerar QR Code Pix." }), { status: 500, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            paymentId: pixPaymentId, 
            qrCode: qrData 
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Se for Cartão e status imediato for aprovado, libera benefícios
    if (transactionStatus === "approved") {
        await releaseBenefits(supabaseAdmin, authUser.id, item_type, item_id, amount, referrerId);
    }

    return new Response(JSON.stringify({ success: true, status: status, id: entityId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[asaas-pagar] Erro interno no processamento:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function releaseBenefits(supabaseAdmin: any, userId: string, itemType: string, itemId: string, amount: number, referrerId?: string) {
    console.log(`[Benefits Helper (asaas-pagar)] Iniciando liberação para userId: ${userId}, itemType: ${itemType}, itemId: ${itemId}`);

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
                    description: `Comissão ${COMMISSION_RATE * 100}% - ${itemType === 'plan' ? 'Assinatura Recorrente' : 'Compra Créditos'} (Via asaas-pagar)`
                });
            }
        }
    }
}
