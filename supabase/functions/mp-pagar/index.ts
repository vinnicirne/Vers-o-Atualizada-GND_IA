
// supabase/functions/mp-pagar/index.ts

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
      console.error("[mp-pagar] Token de autenticação ausente.");
      return new Response(JSON.stringify({ error: "Token de autenticação ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.split(" ")[1];

    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpAccessToken) {
        console.error("ERRO CRÍTICO: Variável MP_ACCESS_TOKEN não definida no Supabase.");
        return new Response(JSON.stringify({ 
            error: "Erro de Configuração no Servidor: Chave do Mercado Pago não encontrada. Contate o administrador.",
            code: "server_config_error"
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

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
      console.error("[mp-pagar] Sessão inválida ou expirada.", authError);
      return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqJson = await req.json();
    console.log("[mp-pagar] Request:", JSON.stringify(reqJson));

    // --- MODO 1: CANCELAMENTO DE ASSINATURA ---
    if (reqJson.action === 'cancel_subscription') {
        const { subscription_id } = reqJson;
        if (!subscription_id) {
            return new Response(JSON.stringify({ error: "ID da assinatura obrigatório." }), { status: 400, headers: corsHeaders });
        }

        console.log(`[mp-pagar] Cancelando assinatura (Preapproval) ${subscription_id} para usuário ${authUser.id}`);

        // Mercado Pago Subscription Cancellation (PUT /preapproval/{id})
        const cancelRes = await fetch(`https://api.mercadopago.com/preapproval/${subscription_id}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${mpAccessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: "cancelled" })
        });

        const cancelData = await cancelRes.json();
        
        if (!cancelRes.ok) {
             const errorMsg = cancelData.message || "Falha ao cancelar no Mercado Pago.";
             console.error(`[mp-pagar] Erro no cancelamento MP:`, cancelData);
             return new Response(JSON.stringify({ error: errorMsg }), { status: 400, headers: corsHeaders });
        }

        // Atualiza banco
        await supabaseAdmin.from("app_users").update({ 
            subscription_status: 'cancelled', // MP uses 'cancelled'
            plan: 'free' // Degrada para free
        }).eq("id", authUser.id);

        return new Response(JSON.stringify({ success: true, message: "Assinatura cancelada com sucesso." }), { status: 200, headers: corsHeaders });
    }

    // --- MODO 2: VERIFICAÇÃO DE STATUS (POLLING) ---
    if (reqJson.check_status_id) {
        const externalId = reqJson.check_status_id;
        
        const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("status")
            .or(`external_id.eq.${externalId},id.eq.${externalId}`)
            .single();

        // Se já aprovada no DB, retorna
        if (tx && tx.status === 'approved') {
            return new Response(JSON.stringify({ status: 'approved' }), { status: 200, headers: corsHeaders });
        }

        // Fallback: Consulta API MP
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${externalId}`, {
            headers: { "Authorization": `Bearer ${mpAccessToken}` }
        });
        const paymentInfo = await mpRes.json();

        return new Response(JSON.stringify({ status: paymentInfo.status || 'pending' }), { status: 200, headers: corsHeaders });
    }

    // --- MODO 3: CRIAÇÃO DE PAGAMENTO OU ASSINATURA ---
    const {
      amount,
      item_type,
      item_id,
      method,
      docNumber,
      token,
      payment_method_id, 
      issuer_id,
      installments = 1
    } = reqJson;

    if (!amount || !item_type || !item_id) {
      return new Response(JSON.stringify({ error: "Dados incompletos." }), { status: 400, headers: corsHeaders });
    }

    // 1. Busca Usuário
    const { data: userData } = await supabaseAdmin
      .from("app_users")
      .select("email, referred_by, full_name, mercadopago_customer_id")
      .eq("id", authUser.id)
      .single();

    if (!userData) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });

    const userEmail = userData.email;
    const referrerId = userData.referred_by;
    let mpCustomerId = userData.mercadopago_customer_id;

    // 2. Garante Cliente no MP (Necessário para Assinaturas e Recomendado para Cartão)
    if (!mpCustomerId) {
        console.log(`[mp-pagar] Criando/Buscando cliente MP para ${userEmail}`);
        
        // Search first
        const searchRes = await fetch(`https://api.mercadopago.com/v1/customers/search?email=${userEmail}`, {
            headers: { "Authorization": `Bearer ${mpAccessToken}` }
        });
        const searchData = await searchRes.json();

        if (searchData.results && searchData.results.length > 0) {
            mpCustomerId = searchData.results[0].id;
        } else {
            // Create
            const createRes = await fetch(`https://api.mercadopago.com/v1/customers`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${mpAccessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: userEmail,
                    first_name: userData.full_name?.split(' ')[0] || 'Cliente',
                    last_name: userData.full_name?.split(' ').slice(1).join(' ') || 'GDN'
                })
            });
            const createData = await createRes.json();
            if (createData.id) mpCustomerId = createData.id;
        }

        if (mpCustomerId) {
            await supabaseAdmin.from("app_users").update({ mercadopago_customer_id: mpCustomerId }).eq("id", authUser.id);
        }
    }

    // --- FLUXO DE ASSINATURA (PLANOS) ---
    if (item_type === 'plan') {
        console.log(`[mp-pagar] Iniciando fluxo de assinatura (Preapproval) para plano ${item_id}`);
        
        // Para assinar com cartão transparente, precisamos associar o cartão ao cliente ou usar card_token_id no preapproval
        // A API de Preapproval aceita `card_token_id`.
        
        const preapprovalPayload = {
            payer_email: userEmail,
            back_url: "https://gdn.ia",
            reason: `Assinatura GDN_IA - Plano ${item_id}`,
            external_reference: authUser.id,
            auto_recurring: {
                frequency: 1,
                frequency_type: "months",
                transaction_amount: Number(amount),
                currency_id: "BRL"
            },
            status: "authorized"
        };

        // Se for cartão, adiciona o token
        if (token && method === 'card') {
            (preapprovalPayload as any).card_token_id = token;
        }

        const subRes = await fetch("https://api.mercadopago.com/preapproval", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${mpAccessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(preapprovalPayload)
        });

        const subData = await subRes.json();
        console.log("[mp-pagar] Resposta Preapproval:", JSON.stringify(subData));

        if (!subRes.ok) {
            return new Response(JSON.stringify({ error: subData.message || "Erro ao criar assinatura." }), { status: 400, headers: corsHeaders });
        }

        // Salva Subscription ID no banco
        await supabaseAdmin.from("app_users").update({ 
            subscription_id: subData.id,
            subscription_status: subData.status // authorized, pending, etc.
        }).eq("id", authUser.id);

        // Cria registro de transação
        const txStatus = subData.status === 'authorized' ? 'approved' : 'pending';
        
        await supabaseAdmin.from("transactions").insert({
            usuario_id: authUser.id,
            valor: Number(amount),
            metodo: 'card', // Assumindo cartão para assinatura transparente por enquanto
            status: txStatus,
            external_id: subData.id, // ID da assinatura
            metadata: {
                item_type,
                item_id,
                provider: "mercado_pago",
                is_subscription: true,
                preapproval_id: subData.id
            },
            data: new Date().toISOString(),
        });

        // Libera benefícios se autorizado
        if (txStatus === 'approved') {
            await releaseBenefits(supabaseAdmin, authUser.id, item_type, item_id, amount, referrerId);
        }

        return new Response(JSON.stringify({ success: true, id: subData.id, status: subData.status }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // --- FLUXO DE PAGAMENTO ÚNICO (CRÉDITOS / PIX) ---
    // (Existing Logic for /v1/payments)
    
    const mpPayload: any = {
        transaction_amount: Number(amount),
        description: `Compra GDN_IA - ${item_type} (${item_id})`,
        payer: {
            email: userEmail,
            first_name: userData.full_name?.split(' ')[0] || 'Cliente',
            last_name: userData.full_name?.split(' ').slice(1).join(' ') || 'GDN'
        }
    };

    if (docNumber) {
        const cleanDoc = docNumber.replace(/\D/g, '');
        if (cleanDoc.length >= 11) {
            const docType = cleanDoc.length > 11 ? 'CNPJ' : 'CPF';
            mpPayload.payer.identification = { type: docType, number: cleanDoc };
        }
    }

    const isPix = method === 'pix' || payment_method_id === 'pix';
    if (isPix) {
        mpPayload.payment_method_id = 'pix';
    } else {
        if (!token) throw new Error("Token do cartão é obrigatório.");
        mpPayload.token = token;
        mpPayload.installments = Number(installments);
        mpPayload.payment_method_id = payment_method_id;
        if (issuer_id) mpPayload.issuer_id = issuer_id;
    }

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID()
      },
      body: JSON.stringify(mpPayload),
    });

    const payment = await mpResponse.json();

    if (!mpResponse.ok) {
        return new Response(JSON.stringify({ error: payment.message || "Erro no Mercado Pago" }), { status: 400, headers: corsHeaders });
    }

    const transactionStatus = payment.status === "approved" ? "approved" : "pending";
    
    // Correct external ID for Pix
    let externalIdToSave = payment.id?.toString();
    if (isPix && payment.point_of_interaction?.transaction_data?.id) {
        externalIdToSave = payment.point_of_interaction.transaction_data.id.toString();
    }

    await supabaseAdmin.from("transactions").insert({
        usuario_id: authUser.id,
        valor: Number(amount),
        metodo: isPix ? "pix" : "card",
        status: transactionStatus,
        external_id: externalIdToSave,
        metadata: {
            item_type,
            item_id,
            provider: "mercado_pago",
            mp_id: payment.id
        },
        data: new Date().toISOString(),
    });

    if (transactionStatus === "approved") {
        await releaseBenefits(supabaseAdmin, authUser.id, item_type, item_id, amount, referrerId);
    }

    return new Response(JSON.stringify(payment), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[mp-pagar] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

// Shared Benefit Logic
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
                    description: `Comissão (Via MP)`
                });
            }
        }
    }
}
