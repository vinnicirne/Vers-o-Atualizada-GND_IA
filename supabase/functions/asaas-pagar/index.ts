// supabase/functions/asaas-pagar/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Método não permitido", { status: 405, headers: corsHeaders });

  try {
    // === 1. Validação do JWT do usuário ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Token ausente" }), { status: 401, headers: corsHeaders });
    }
    const jwt = authHeader.split(" ")[1];

    // Cliente com ANON_KEY + JWT → para validar o usuário corretamente
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Cliente admin com SERVICE_ROLE_KEY → para escrever no banco (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "invalid access token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 2. Lê dados do pagamento ===
    const body = await req.json();
    const {
      creditCardToken,
      creditCard,
      creditCardHolderInfo,
      amount,
      item_type,
      item_id,
      installments = 1,
    } = body;

    if (!amount || !item_type || !item_id) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), { status: 400, headers: corsHeaders });
    }

    // === 3. Busca dados do usuário ===
    const { data: userData } = await supabaseAdmin
      .from("app_users")
      .select("email, full_name, asaas_customer_id, referred_by")
      .eq("id", authUser.id)
      .single();

    if (!userData?.email) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), { status: 404, headers: corsHeaders });
    }

    const userEmail = userData.email;
    const userFullName = userData.full_name || userEmail.split("@")[0];
    let asaasCustomerId = userData.asaas_customer_id;
    const referrerId = userData.referred_by;

    // === 4. Cria cliente no Asaas se não existir ===
    if (!asaasCustomerId) {
      const res = await fetch("https://sandbox.asaas.com/api/v3/customers", {
        method: "POST",
        headers: { "access_token": Deno.env.get("ASAAS_KEY")!, "Content-Type": "application/json" },
        body: JSON.stringify({ name: userFullName, email: userEmail, cpfCnpj: "00000000000" }),
      });
      const customer = await res.json();
      if (!customer.id) return new Response(JSON.stringify({ error: "Falha ao criar cliente Asaas" }), { status: 500, headers: corsHeaders });

      asaasCustomerId = customer.id;
      await supabaseAdmin.from("app_users").update({ asaas_customer_id: asaasCustomerId }).eq("id", authUser.id);
    }

    // === 5. Monta pagamento no Asaas ===
    const payload: any = {
      customer: asaasCustomerId,
      billingType: "CREDIT_CARD",
      value: Number(amount),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      description: `GDN_IA - ${item_type} #${item_id}`,
      remoteIp: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
    };

    if (creditCardToken) payload.creditCardToken = creditCardToken;
    else if (creditCard) {
      payload.creditCard = creditCard;
      payload.creditCardHolderInfo = creditCardHolderInfo || {
        name: userFullName, email: userEmail, cpfCnpj: "00000000000",
        postalCode: "00000000", addressNumber: "0", phone: "11999999999"
      };
    }

    if (Number(installments) > 1) {
      payload.installmentCount = Number(installments);
      payload.installmentValue = Number((Number(amount) / Number(installments)).toFixed(2));
    }

    const paymentRes = await fetch("https://sandbox.asaas.com/api/v3/payments", {
      method: "POST",
      headers: { "access_token": Deno.env.get("ASAAS_KEY")!, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const paymentData = await paymentRes.json();
    const status = paymentData.status || "FAILED";

    // === 6. Salva transação no banco ===
    await supabaseAdmin.from("transactions").insert({
      usuario_id: authUser.id,
      valor: Number(amount),
      metodo: "card",
      status: status.toLowerCase(),
      external_id: paymentData.id,
      metadata: { provider: "asaas", item_type, item_id, asaas_response: paymentData },
      data: new Date().toISOString(),
    });

    // === 7. Se aprovado → atualiza plano/créditos + afiliado ===
    if (["CONFIRMED", "RECEIVED", "PENDING"].includes(status)) {
      if (item_type === "plan") {
        await supabaseAdmin.from("app_users").update({ plan: item_id }).eq("id", authUser.id);

        const { data: config } = await supabaseAdmin.from("system_config").select("value").eq("key", "all_plans").single();
        if (config?.value) {
          const plan = (config.value as any[]).find((p: any) => p.id === item_id);
          if (plan) {
            await supabaseAdmin.from("user_credits").upsert({ user_id: authUser.id, credits: plan.credits }, { onConflict: "user_id" });
          }
        }
      }

      if (item_type === "credits") {
        const { data: current } = await supabaseAdmin.from("user_credits").select("credits").eq("user_id", authUser.id).single();
        const newCredits = (current?.credits || 0) + Number(item_id);
        await supabaseAdmin.from("user_credits").upsert({ user_id: authUser.id, credits: newCredits }, { onConflict: "user_id" });
      }

      if (referrerId) {
        const { data: ref } = await supabaseAdmin.from("app_users").select("affiliate_balance").eq("id", referrerId).single();
        if (ref) {
          const commission = parseFloat((Number(amount) * 0.2).toFixed(2));
          await supabaseAdmin.from("app_users").update({
            affiliate_balance: parseFloat(((ref.affiliate_balance || 0) + commission).toFixed(2))
          }).eq("id", referrerId);

          await supabaseAdmin.from("affiliate_logs").insert({
            affiliate_id: referrerId,
            source_user_id: authUser.id,
            amount: commission,
            description: `Comissão 20% - ${item_type} #${item_id}`,
          });
        }
      }
    }

    return new Response(JSON.stringify(paymentData), {
      status: paymentRes.ok ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Erro na função asaas-pagar:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});