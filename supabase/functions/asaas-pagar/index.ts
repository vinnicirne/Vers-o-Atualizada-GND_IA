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
<<<<<<< HEAD
      console.error("[asaas-pagar] Token de autenticação ausente.");
=======
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
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
<<<<<<< HEAD
      console.error("[asaas-pagar] Sessão inválida ou expirada.", authError);
=======
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqJson = await req.json();
<<<<<<< HEAD
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

    // --- MODO 1: VERIFICAÇÃO DE STATUS (POLLING) ---
    if (reqJson.check_status_id) {
        console.log(`[asaas-pagar] Verificando status para ID: ${reqJson.check_status_id}`);
        const { data: tx, error: txError } = await supabaseAdmin
=======

    // --- MODO 1: VERIFICAÇÃO DE STATUS (POLLING) ---
    if (reqJson.check_status_id) {
        const { data: tx } = await supabaseAdmin
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
            .from("transactions")
            .select("status")
            .or(`external_id.eq.${reqJson.check_status_id},id.eq.${reqJson.check_status_id}`)
            .single();
        
<<<<<<< HEAD
        if (txError && txError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error(`[asaas-pagar] Erro ao buscar transação para polling: ${txError.message}`);
            return new Response(JSON.stringify({ error: `Database error during polling: ${txError.message}` }), { status: 500, headers: corsHeaders });
        }

        console.log(`[asaas-pagar] Status da transação ${reqJson.check_status_id}: ${tx?.status || 'pending'}`);
=======
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
        return new Response(JSON.stringify({ status: tx?.status || 'pending' }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // --- MODO 2: PAGAMENTO ---
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

<<<<<<< HEAD
    if (!amount || !item_type || !item_id || !billingType) {
        console.error("[asaas-pagar] Dados do pagamento incompletos:", reqJson);
        return new Response(JSON.stringify({ error: "Dados do pagamento incompletos." }), { status: 400, headers: corsHeaders });
    }

    // Busca dados do usuário
    const { data: userData, error: userDataError } = await supabaseAdmin
=======
    if (!amount) {
        return new Response(JSON.stringify({ error: "Valor inválido." }), { status: 400, headers: corsHeaders });
    }

    // Busca dados do usuário
    const { data: userData } = await supabaseAdmin
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
      .from("app_users")
      .select("email, full_name, asaas_customer_id, referred_by")
      .eq("id", authUser.id)
      .single();

<<<<<<< HEAD
    if (userDataError || !userData?.email) {
      console.error("[asaas-pagar] Usuário não encontrado no banco de dados ou erro:", userDataError);
=======
    if (!userData?.email) {
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
      return new Response(JSON.stringify({ error: "Usuário não encontrado." }), { status: 404, headers: corsHeaders });
    }

    const userEmail = userData.email;
    const userFullName = userData.full_name || userEmail.split("@")[0];
    let asaasCustomerId = userData.asaas_customer_id;
    const referrerId = userData.referred_by;

    // Se docNumber não veio, usa um default para Sandbox (não recomendado em prod)
    const cpfCnpjToUse = docNumber || "00000000000";

    // Garante cliente no Asaas
<<<<<<< HEAD
    if (!asaasCustomerId) {
      console.log(`[asaas-pagar] Cliente Asaas não encontrado para ${authUser.id}. Tentando criar/buscar.`);
      // 1. Tenta criar cliente
      let customerResponse = await fetch(`${asaasApiBaseUrl}/api/v3/customers`, {
        method: "POST",
        headers: { "access_token": asaasKey, "Content-Type": "application/json" },
=======
    // Lógica atualizada: Sempre tenta buscar/criar ou atualizar se o ID não existir
    if (!asaasCustomerId) {
      // 1. Tenta criar cliente
      const res = await fetch("https://sandbox.asaas.com/api/v3/customers", {
        method: "POST",
        headers: { "access_token": Deno.env.get("ASAAS_KEY")!, "Content-Type": "application/json" },
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
        body: JSON.stringify({ 
            name: userFullName, 
            email: userEmail, 
            externalReference: authUser.id,
            cpfCnpj: cpfCnpjToUse
        }),
      });
<<<<<<< HEAD
      let customer = await customerResponse.json();
      console.log("[asaas-pagar] Resposta de criação/busca de cliente Asaas:", JSON.stringify(customer));
      
      if (!customer.id) {
          // Se falhar (ex: email já existe no Asaas mas não no nosso banco), tenta buscar por email
          if (customer.errors?.[0]?.code === 'invalid_customer' || (customer.errors?.[0]?.description && customer.errors[0].description.includes('email'))) {
               console.log("[asaas-pagar] Erro ao criar cliente (possivelmente email já existe). Tentando buscar por email.");
               const searchRes = await fetch(`${asaasApiBaseUrl}/api/v3/customers?email=${userEmail}`, {
                   headers: { "access_token": asaasKey }
=======
      const customer = await res.json();
      
      if (!customer.id) {
          // Se falhar (ex: email já existe no Asaas mas não no nosso banco), tenta buscar por email
          if (customer.errors?.[0]?.code === 'invalid_customer' || customer.errors?.[0]?.description?.includes('email')) {
               const searchRes = await fetch(`https://sandbox.asaas.com/api/v3/customers?email=${userEmail}`, {
                   headers: { "access_token": Deno.env.get("ASAAS_KEY")! }
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
               });
               const searchData = await searchRes.json();
               if (searchData.data && searchData.data.length > 0) {
                   asaasCustomerId = searchData.data[0].id;
<<<<<<< HEAD
                   console.log(`[asaas-pagar] Cliente Asaas encontrado por email: ${asaasCustomerId}`);
=======
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
               }
          }
          
          if (!asaasCustomerId) {
<<<<<<< HEAD
             console.error("[asaas-pagar] Falha final ao registrar cliente no Asaas:", customer.errors?.[0]?.description || JSON.stringify(customer));
=======
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
             return new Response(JSON.stringify({ error: "Falha ao registrar cliente no Asaas: " + (customer.errors?.[0]?.description || "Erro desconhecido") }), { status: 500, headers: corsHeaders });
          }
      } else {
          asaasCustomerId = customer.id;
<<<<<<< HEAD
          console.log(`[asaas-pagar] Cliente Asaas criado/confirmado: ${asaasCustomerId}`);
      }
      
      // Salva ID no banco
      const { error: updateCustomerError } = await supabaseAdmin.from("app_users").update({ asaas_customer_id: asaasCustomerId }).eq("id", authUser.id);
      if (updateCustomerError) console.warn(`[asaas-pagar] Erro ao salvar asaas_customer_id no DB: ${updateCustomerError.message}`);
=======
      }
      
      // Salva ID no banco
      await supabaseAdmin.from("app_users").update({ asaas_customer_id: asaasCustomerId }).eq("id", authUser.id);
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
    }

    const isPix = billingType === 'PIX';

    // Monta payload Asaas
    const paymentPayload: any = {
      customer: asaasCustomerId,
      billingType: isPix ? "PIX" : "CREDIT_CARD",
      value: Number(amount),
<<<<<<< HEAD
      dueDate: new Date(Date.now()).toISOString().slice(0, 10), // Vencimento hoje
=======
      dueDate: new Date(Date.now()).toISOString().slice(0, 10),
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
      description: `GDN_IA: ${item_type} (${item_id})`,
      remoteIp: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
    };

    if (!isPix) {
        if (creditCardToken) {
            paymentPayload.creditCardToken = creditCardToken;
        } else {
            paymentPayload.creditCard = creditCard;
            paymentPayload.creditCardHolderInfo = creditCardHolderInfo || {
                name: userFullName,
                email: userEmail,
                cpfCnpj: cpfCnpjToUse,
<<<<<<< HEAD
                postalCode: "00000000", // Placeholder, idealmente coletado
                addressNumber: "0",     // Placeholder, idealmente coletado
                phone: "11999999999"    // Placeholder, idealmente coletado
=======
                postalCode: "00000000",
                addressNumber: "0",
                phone: "11999999999"
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
            };
        }
        if (Number(installments) > 1) {
            paymentPayload.installmentCount = Number(installments);
            paymentPayload.installmentValue = Number((Number(amount) / Number(installments)).toFixed(2));
        }
    }

<<<<<<< HEAD
    console.log("[asaas-pagar] Enviando payload de pagamento para Asaas API:", JSON.stringify(paymentPayload));
    // Cria cobrança
    const paymentRes = await fetch(`${asaasApiBaseUrl}/api/v3/payments`, {
      method: "POST",
      headers: { "access_token": asaasKey, "Content-Type": "application/json" },
=======
    // Cria cobrança
    const paymentRes = await fetch("https://sandbox.asaas.com/api/v3/payments", {
      method: "POST",
      headers: { "access_token": Deno.env.get("ASAAS_KEY")!, "Content-Type": "application/json" },
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await paymentRes.json();
<<<<<<< HEAD
    console.log("[asaas-pagar] Resposta completa do pagamento Asaas:", JSON.stringify(paymentData));

    if (!paymentRes.ok || paymentData.errors) {
        const errorMsg = paymentData.errors?.[0]?.description || paymentData.error || "Pagamento recusado.";
        console.error("[asaas-pagar] Erro na API do Asaas:", errorMsg);
        return new Response(JSON.stringify({ error: errorMsg }), { status: 400, headers: corsHeaders });
    }

    // Salva transação no DB
    const transactionStatus = (paymentData.status === "CONFIRMED" || paymentData.status === "RECEIVED") ? "approved" : "pending";
    console.log(`[asaas-pagar] Pagamento Asaas ID: ${paymentData.id}, Status Asaas: ${paymentData.status}, Status DB: ${transactionStatus}`);

    const { data: newTx, error: insertTxError } = await supabaseAdmin.from("transactions").insert({
      usuario_id: authUser.id,
      valor: Number(amount),
      metodo: isPix ? "pix" : "card",
      status: transactionStatus, 
      external_id: paymentData.id,
      metadata: { provider: "asaas", item_type, item_id, asaas_status: paymentData.status },
      data: new Date().toISOString(),
    })
    .select()
    .single(); // Para obter o ID da transação inserida

    if (insertTxError) {
        console.error(`[asaas-pagar] Erro ao inserir transação no DB: ${insertTxError.message}`);
        return new Response(JSON.stringify({ error: `Failed to save transaction: ${insertTxError.message}` }), { status: 500, headers: corsHeaders });
    }
    console.log(`[asaas-pagar] Transação salva no DB com ID: ${newTx.id}, External ID: ${newTx.external_id}`);


    // Se for PIX, busca o QR Code (2ª chamada necessária no Asaas)
    if (isPix) {
        const qrRes = await fetch(`${asaasApiBaseUrl}/api/v3/payments/${paymentData.id}/pixQrCode`, {
            method: "GET",
            headers: { "access_token": asaasKey, "Content-Type": "application/json" }
        });
        const qrData = await qrRes.json();
        console.log("[asaas-pagar] Resposta do QR Code Pix Asaas:", JSON.stringify(qrData));
        
        if (!qrRes.ok || qrData.errors) {
            console.error("[asaas-pagar] Erro ao buscar QR Code Pix:", qrData.errors?.[0]?.description || JSON.stringify(qrData));
            return new Response(JSON.stringify({ error: "Falha ao gerar QR Code Pix." }), { status: 500, headers: corsHeaders });
        }

=======

    if (!paymentRes.ok || paymentData.errors) {
        const errorMsg = paymentData.errors?.[0]?.description || paymentData.error || "Pagamento recusado.";
        return new Response(JSON.stringify({ error: errorMsg }), { status: 400, headers: corsHeaders });
    }

    // Salva transação
    await supabaseAdmin.from("transactions").insert({
      usuario_id: authUser.id,
      valor: Number(amount),
      metodo: isPix ? "pix" : "card",
      status: "pending", // Sempre pending no início, mesmo cartão leva uns segundos
      external_id: paymentData.id,
      metadata: { provider: "asaas", item_type, item_id },
      data: new Date().toISOString(),
    });

    // Se for PIX, busca o QR Code (2ª chamada necessária no Asaas)
    if (isPix) {
        const qrRes = await fetch(`https://sandbox.asaas.com/api/v3/payments/${paymentData.id}/pixQrCode`, {
            method: "GET",
            headers: { "access_token": Deno.env.get("ASAAS_KEY")!, "Content-Type": "application/json" }
        });
        const qrData = await qrRes.json();
        
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
        return new Response(JSON.stringify({ 
            success: true, 
            paymentId: paymentData.id, 
            qrCode: qrData // Contém payload e encodedImage
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

<<<<<<< HEAD
    // Se for Cartão e status imediato for aprovado, libera benefícios
    if (transactionStatus === "approved") {
        console.log(`[asaas-pagar] Pagamento aprovado no Asaas. Iniciando liberação de benefícios para usuário ${authUser.id}.`);
        await releaseBenefits(supabaseAdmin, authUser.id, item_type, item_id, amount, referrerId);
        console.log("[asaas-pagar] Liberação de benefícios concluída.");
=======
    // Se for Cartão, verifica status imediato
    if (paymentData.status === "CONFIRMED" || paymentData.status === "RECEIVED") {
        await supabaseAdmin.from("transactions").update({ status: 'approved' }).eq('external_id', paymentData.id);
        await releaseBenefits(supabaseAdmin, authUser.id, item_type, item_id, amount, referrerId);
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
    }

    return new Response(JSON.stringify({ success: true, status: paymentData.status, id: paymentData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
<<<<<<< HEAD
    console.error("[asaas-pagar] Erro interno no processamento:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
=======
    console.error("Erro interno:", err);
    return new Response(JSON.stringify({ error: `Erro interno: ${err.message}` }), {
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

<<<<<<< HEAD
async function releaseBenefits(supabaseAdmin: any, userId: string, itemType: string, itemId: string, amount: number, referrerId?: string) {
    console.log(`[Benefits Helper (asaas-pagar)] Iniciando liberação para userId: ${userId}, itemType: ${itemType}, itemId: ${itemId}, amount: ${amount}, referrerId: ${referrerId}`);

    if (itemType === "plan") {
        await supabaseAdmin.from("app_users").update({ plan: itemId }).eq("id", userId);
        const { data: config, error: configError } = await supabaseAdmin.from("system_config").select("value").eq("key", "all_plans").single();
        if (configError) console.warn(`[Benefits Helper (asaas-pagar)] Erro ao buscar config de planos: ${configError.message}`);

=======
// Helper de Benefícios
async function releaseBenefits(supabaseAdmin: any, userId: string, itemType: string, itemId: string, amount: number, referrerId?: string) {
    if (itemType === "plan") {
        await supabaseAdmin.from("app_users").update({ plan: itemId }).eq("id", userId);
        const { data: config } = await supabaseAdmin.from("system_config").select("value").eq("key", "all_plans").single();
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
        if (config?.value) {
          const plan = (config.value as any[]).find((p: any) => p.id === itemId);
          if (plan) {
            await supabaseAdmin.from("user_credits").upsert({ user_id: userId, credits: plan.credits }, { onConflict: "user_id" });
<<<<<<< HEAD
          } else {
            console.warn(`[Benefits Helper (asaas-pagar)] Plano "${itemId}" não encontrado na configuração de sistema. Créditos não atribuídos.`);
          }
        } else {
            console.warn(`[Benefits Helper (asaas-pagar)] Configuração 'all_plans' não encontrada ou vazia.`);
        }
    } else if (itemType === "credits") {
        const { data: current, error: currentCreditsError } = await supabaseAdmin.from("user_credits").select("credits").eq("user_id", userId).single();
        if (currentCreditsError) console.warn(`[Benefits Helper (asaas-pagar)] Erro ao buscar créditos atuais para ${userId}: ${currentCreditsError.message}`);

        const currentCredits = current?.credits === -1 ? -1 : (current?.credits || 0);
        
        if (currentCredits !== -1) {
            const newCredits = currentCredits + Number(itemId); 
            await supabaseAdmin.from("user_credits").upsert({ user_id: userId, credits: newCredits }, { onConflict: "user_id" });
        } else {
            console.log(`[Benefits Helper (asaas-pagar)] Usuário ${userId} tem créditos ilimitados. Nenhuma alteração de saldo.`);
        }
    }

    if (referrerId) {
        const COMMISSION_RATE = 0.20; // Definido como constante
        const commission = parseFloat((Number(amount) * COMMISSION_RATE).toFixed(2));
        if (commission > 0) {
            const { data: refUser, error: refUserError } = await supabaseAdmin.from("app_users").select("affiliate_balance").eq("id", referrerId).single();
            if (refUserError) console.error(`[Benefits Helper (asaas-pagar)] Erro ao buscar afiliado ${referrerId}: ${refUserError.message}`);

            if (refUser) {
                const newBalance = (refUser.affiliate_balance || 0) + commission;
                await supabaseAdmin.from("app_users").update({ affiliate_balance: newBalance }).eq("id", referrerId);
                
                await supabaseAdmin.from("affiliate_logs").insert({
                    affiliate_id: referrerId,
                    source_user_id: userId,
                    amount: commission,
                    description: `Comissão ${COMMISSION_RATE * 100}% - ${itemType === 'plan' ? 'Assinatura Plano' : 'Compra Créditos'} (Via asaas-pagar)`
                });
            }
        } else {
            console.log(`[Benefits Helper (asaas-pagar)] Comissão calculada foi zero ou negativa (${commission}). Não será processada.`);
        }
    } else {
        console.log(`[Benefits Helper (asaas-pagar)] Usuário ${userId} não foi indicado. Nenhuma comissão de afiliado.`);
    }
    console.log(`[Benefits Helper (asaas-pagar)] Liberação de benefícios concluída.`);
=======
          }
        }
    }
    if (itemType === "credits") {
        const { data: current } = await supabaseAdmin.from("user_credits").select("credits").eq("user_id", userId).single();
        const newCredits = (current?.credits || 0) + Number(itemId);
        await supabaseAdmin.from("user_credits").upsert({ user_id: userId, credits: newCredits }, { onConflict: "user_id" });
    }
    if (referrerId) {
        const commission = parseFloat((Number(amount) * 0.2).toFixed(2));
        const { data: refUser } = await supabaseAdmin.from("app_users").select("affiliate_balance").eq("id", referrerId).single();
        if (refUser) {
            const newBalance = (refUser.affiliate_balance || 0) + commission;
            await supabaseAdmin.from("app_users").update({ affiliate_balance: newBalance }).eq("id", referrerId);
            await supabaseAdmin.from("affiliate_logs").insert({
                affiliate_id: referrerId,
                source_user_id: userId,
                amount: commission,
                description: `Comissão 20% - ${itemType}`
            });
        }
    }
>>>>>>> a01b8ccbfd3d62c90faf00dccf1c2443ed1446aa
}