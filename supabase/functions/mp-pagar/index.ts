
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

    // --- CHECK FOR SERVER CONFIG ---
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
    console.log("[mp-pagar] Requisição JSON recebida (para depuração):", JSON.stringify(reqJson));
    console.log("[mp-pagar] Token do cartão recebido (para depuração):", reqJson.token ? "Presente" : "Ausente", reqJson.token);


    // --- MODO 1: VERIFICAÇÃO DE STATUS (POLLING) ---
    if (reqJson.check_status_id) {
        console.log(`[mp-pagar] Verificando status para ID: ${reqJson.check_status_id}`);
        const { data: tx, error: txError } = await supabaseAdmin
            .from("transactions")
            .select("status")
            .or(`external_id.eq.${reqJson.check_status_id},id.eq.${reqJson.check_status_id}`)
            .single();
        
        if (txError && txError.code !== 'PGRST116') { // PGRST116 = no rows found
             console.error(`[mp-pagar] Erro ao buscar transação para polling: ${txError.message}`);
             return new Response(JSON.stringify({ error: `Database error during polling: ${txError.message}` }), { status: 500, headers: corsHeaders });
        }
        
        console.log(`[mp-pagar] Status da transação ${reqJson.check_status_id}: ${tx?.status || 'pending'}`);
        return new Response(JSON.stringify({ status: tx?.status || 'pending' }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // --- MODO 2: GERAÇÃO DE PAGAMENTO ---
    const {
      token,
      payment_method_id, 
      issuer_id,
      installments = 1,
      amount,
      item_type,
      item_id,
      method, // 'pix' ou 'card'
      docNumber
    } = reqJson;

    if (!amount || !item_type || !item_id || !method) {
      console.error("[mp-pagar] Dados do pagamento incompletos:", reqJson);
      return new Response(JSON.stringify({ error: "Dados do pagamento incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userDataError } = await supabaseAdmin
      .from("app_users")
      .select("email, referred_by, full_name")
      .eq("id", authUser.id)
      .single();

    if (userDataError || !userData?.email) {
      console.error("[mp-pagar] Usuário não encontrado no banco de dados ou erro:", userDataError);
      return new Response(JSON.stringify({ error: "Usuário não encontrado no banco de dados." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = userData.email;
    const referrerId = userData.referred_by;
    const isPix = method === 'pix' || payment_method_id === 'pix';

    const firstName = userData.full_name?.split(' ')[0] || 'Cliente';
    const lastName = userData.full_name?.split(' ').slice(1).join(' ') || 'GDN';

    const mpPayload: any = {
        transaction_amount: Number(amount),
        description: `Compra GDN_IA - ${item_type} (${item_id})`,
        payer: {
            email: userEmail,
            first_name: firstName,
            last_name: lastName
        }
    };

    if (docNumber) {
        const cleanDoc = docNumber.replace(/\D/g, '');
        if (cleanDoc.length >= 11) {
            const docType = cleanDoc.length > 11 ? 'CNPJ' : 'CPF';
            mpPayload.payer.identification = {
                type: docType,
                number: cleanDoc
            };
        }
    }

    if (isPix) {
        mpPayload.payment_method_id = 'pix';
    } else {
        if (!token) {
            console.error("[mp-pagar] Token do cartão ausente para pagamento com cartão.");
            throw new Error("Token do cartão é obrigatório.");
        }
        mpPayload.token = token;
        mpPayload.installments = Number(installments);
        mpPayload.payment_method_id = payment_method_id;
        if (issuer_id) mpPayload.issuer_id = issuer_id;
    }

    console.log("[mp-pagar] Enviando payload para MP API:", JSON.stringify(mpPayload));

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
    console.log("[mp-pagar] Resposta completa do Mercado Pago:", JSON.stringify(payment));

    // Tratamento de Erro do MP
    if (!mpResponse.ok) {
        console.error("[mp-pagar] Erro na API do Mercado Pago:", payment);
        
        let errorMessage = payment.message || "Erro desconhecido no Mercado Pago";
        const errorCode = payment.error || "unknown_error";

        // Tradução de erros comuns de autenticação
        if (mpResponse.status === 401 || errorCode === 'unauthorized' || errorMessage.includes('invalid access token')) {
            errorMessage = "Erro de Configuração: Chave de API do Mercado Pago inválida ou expirada.";
        }

        return new Response(JSON.stringify({ 
            error: errorMessage,
            code: errorCode,
            details: payment.cause 
        }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const transactionStatus = payment.status === "approved" ? "approved" : "pending";
    console.log(`[mp-pagar] Pagamento MP ID: ${payment.id}, Status MP: ${payment.status}, Status DB: ${transactionStatus}`);

    const { data: newTx, error: insertTxError } = await supabaseAdmin
      .from("transactions")
      .insert({
        usuario_id: authUser.id,
        valor: Number(amount),
        metodo: isPix ? "pix" : "card",
        status: transactionStatus,
        external_id: payment.id?.toString(),
        metadata: {
            item_type,
            item_id,
            provider: "mercado_pago",
            mp_id: payment.id
        },
        data: new Date().toISOString(),
      })
      .select()
      .single(); // Para obter o ID da transação inserida

    if (insertTxError) {
        console.error(`[mp-pagar] Erro ao inserir transação no DB: ${insertTxError.message}`);
        return new Response(JSON.stringify({ error: `Failed to save transaction: ${insertTxError.message}` }), { status: 500, headers: corsHeaders });
    }
    console.log(`[mp-pagar] Transação salva no DB com ID: ${newTx.id}, External ID: ${newTx.external_id}`);


    if (isPix) {
        // Valida se o QR Code realmente veio
        if (!payment.point_of_interaction?.transaction_data?.qr_code) {
             console.error("[mp-pagar] Pix criado mas sem QR Code. Resposta completa:", payment);
             return new Response(JSON.stringify({ 
                 error: "Pix criado, mas o banco não retornou o QR Code. Tente novamente ou verifique seus dados.",
                 full_response: payment 
             }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        
        return new Response(JSON.stringify(payment), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Para pagamentos com cartão, se aprovado imediatamente, já libera os benefícios
    if (transactionStatus === "approved") {
        console.log(`[mp-pagar] Pagamento aprovado no MP. Iniciando liberação de benefícios para usuário ${authUser.id}.`);
        await releaseBenefits(supabaseAdmin, authUser.id, item_type, item_id, amount, referrerId);
        console.log("[mp-pagar] Liberação de benefícios concluída.");
    }

    return new Response(JSON.stringify(payment), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[mp-pagar] Erro interno no processamento:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function releaseBenefits(supabaseAdmin: any, userId: string, itemType: string, itemId: string, amount: number, referrerId?: string) {
    console.log(`[Benefits Helper (mp-pagar)] Iniciando liberação para userId: ${userId}, itemType: ${itemType}, itemId: ${itemId}, amount: ${amount}, referrerId: ${referrerId}`);

    if (itemType === "plan") {
        await supabaseAdmin.from("app_users").update({ plan: itemId }).eq("id", userId);
        const { data: config, error: configError } = await supabaseAdmin.from("system_config").select("value").eq("key", "all_plans").single();
        if (configError) console.warn(`[Benefits Helper (mp-pagar)] Erro ao buscar config de planos: ${configError.message}`);

        if (config?.value) {
            const plan = (config.value as any[]).find((p: any) => p.id === itemId);
            if (plan) {
                await supabaseAdmin.from("user_credits").upsert({ user_id: userId, credits: plan.credits }, { onConflict: "user_id" });
            } else {
                console.warn(`[Benefits Helper (mp-pagar)] Plano "${itemId}" não encontrado na configuração de sistema. Créditos não atribuídos.`);
            }
        } else {
            console.warn(`[Benefits Helper (mp-pagar)] Configuração 'all_plans' não encontrada ou vazia.`);
        }
    } else if (itemType === "credits") {
        const { data: current, error: currentCreditsError } = await supabaseAdmin.from("user_credits").select("credits").eq("user_id", userId).single();
        if (currentCreditsError) console.warn(`[Benefits Helper (mp-pagar)] Erro ao buscar créditos atuais para ${userId}: ${currentCreditsError.message}`);

        const currentCredits = current?.credits === -1 ? -1 : (current?.credits || 0);
        
        if (currentCredits !== -1) {
            const newCredits = currentCredits + Number(itemId); 
            await supabaseAdmin.from("user_credits").upsert({ user_id: userId, credits: newCredits }, { onConflict: "user_id" });
        } else {
            console.log(`[Benefits Helper (mp-pagar)] Usuário ${userId} tem créditos ilimitados. Nenhuma alteração de saldo.`);
        }
    }

    if (referrerId) {
        const COMMISSION_RATE = 0.20; // Definido como constante
        const commission = parseFloat((Number(amount) * COMMISSION_RATE).toFixed(2));
        if (commission > 0) {
            const { data: refUser, error: refUserError } = await supabaseAdmin.from("app_users").select("affiliate_balance").eq("id", referrerId).single();
            if (refUserError) console.error(`[Benefits Helper (mp-pagar)] Erro ao buscar afiliado ${referrerId}: ${refUserError.message}`);

            if (refUser) {
                const newBalance = (refUser.affiliate_balance || 0) + commission;
                await supabaseAdmin.from("app_users").update({ affiliate_balance: newBalance }).eq("id", referrerId);
                
                await supabaseAdmin.from("affiliate_logs").insert({
                    affiliate_id: referrerId,
                    source_user_id: userId,
                    amount: commission,
                    description: `Comissão ${COMMISSION_RATE * 100}% - ${itemType === 'plan' ? 'Assinatura Plano' : 'Compra Créditos'} (Via mp-pagar)`
                });
            }
        } else {
            console.log(`[Benefits Helper (mp-pagar)] Comissão calculada foi zero ou negativa (${commission}). Não será processada.`);
        }
    } else {
        console.log(`[Benefits Helper (mp-pagar)] Usuário ${userId} não foi indicado. Nenhuma comissão de afiliado.`);
    }
    console.log(`[Benefits Helper (mp-pagar)] Liberação de benefícios concluída.`);
}