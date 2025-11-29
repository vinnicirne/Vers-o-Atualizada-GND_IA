// supabase/functions/mp-pagar/index.ts

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
    // 1. Extrai o JWT do header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Token de autenticação ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.split(" ")[1];

    // 2. Cliente com ANON_KEY + JWT do usuário (para validar autenticação)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // 3. Cliente admin com SERVICE_ROLE_KEY (para bypassar RLS nas escritas)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 4. Valida o usuário
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      console.error("Auth Error:", authError?.message);
      return new Response(JSON.stringify({ error: "invalid access token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Lê o corpo da requisição
    const {
      token,
      payment_method_id,
      issuer_id,
      installments = 1,
      amount,
      item_type,
      item_id,
    } = await req.json();

    if (!token || !amount || !item_type || !item_id) {
      return new Response(JSON.stringify({ error: "Dados do pagamento incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Busca email e dados do usuário
    const { data: userData, error: userError } = await supabaseAdmin
      .from("app_users")
      .select("email, referred_by")
      .eq("id", authUser.id)
      .single();

    if (userError || !userData?.email) {
      console.error("Erro ao buscar usuário:", userError);
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = userData.email;
    const referrerId = userData.referred_by;

    // 7. Cria pagamento no Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        transaction_amount: Number(amount),
        installments: Number(installments),
        payment_method_id,
        issuer_id: issuer_id || null,
        description: `Compra GDN_IA - ${item_type} ID: ${item_id}`,
        payer: { email: userEmail },
      }),
    });

    const payment = await mpResponse.json();
    const transactionStatus = payment.status === "approved" || payment.status === "pending" ? payment.status : "failed";

    // 8. Salva transação no banco
    const transactionMetadata = {
      item_type,
      item_id,
      provider: "mercado_pago",
      description: `Pagamento para ${item_type} ID: ${item_id}`,
      payment_method_id,
      issuer_id,
      installments,
      mp_response: payment,
    };

    const { error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert({
        usuario_id: authUser.id,
        valor: Number(amount),
        metodo: "card",
        status: transactionStatus,
        external_id: payment.id?.toString(),
        metadata: transactionMetadata,
        data: new Date().toISOString(),
      });

    if (transactionError) {
      console.error("Erro ao salvar transação:", transactionError);
    }

    // 9. Se pagamento aprovado/pendente → atualiza plano/créditos + afiliados
    if (transactionStatus === "approved" || transactionStatus === "pending") {
      if (item_type === "plan") {
        await supabaseAdmin
          .from("app_users")
          .update({ plan: item_id })
          .eq("id", authUser.id);

        // Atualiza créditos do plano
        const { data: config } = await supabaseAdmin
          .from("system_config")
          .select("value")
          .eq("key", "all_plans")
          .single();

        if (config?.value) {
          const plans = config.value as any[];
          const plan = plans.find((p: any) => p.id === item_id);
          if (plan) {
            await supabaseAdmin
              .from("user_credits")
              .upsert({ user_id: authUser.id, credits: plan.credits }, { onConflict: "user_id" });
          }
        }
      }

      if (item_type === "credits") {
        const { data: current } = await supabaseAdmin
          .from("user_credits")
          .select("credits")
          .eq("user_id", authUser.id)
          .single();

        const newCredits = (current?.credits || 0) + Number(item_id);

        await supabaseAdmin
          .from("user_credits")
          .upsert({ user_id: authUser.id, credits: newCredits }, { onConflict: "user_id" });
      }

      // 10. Comissão de afiliado (20%)
      if (referrerId) {
        const { data: referrer } = await supabaseAdmin
          .from("app_users")
          .select("affiliate_balance")
          .eq("id", referrerId)
          .single();

        if (referrer) {
          const commission = parseFloat((Number(amount) * 0.2).toFixed(2));
          const newBalance = parseFloat(((referrer.affiliate_balance || 0) + commission).toFixed(2));

          await supabaseAdmin
            .from("app_users")
            .update({ affiliate_balance: newBalance })
            .eq("id", referrerId);

          await supabaseAdmin
            .from("affiliate_logs")
            .insert({
              affiliate_id: referrerId,
              source_user_id: authUser.id,
              amount: commission,
              description: `Comissão 20% - ${item_type} (${item_id})`,
            });
        }
      }
    }

    // 11. Resposta final
    return new Response(JSON.stringify(payment), {
      status: mpResponse.ok ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Erro inesperado na função mp-pagar:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});