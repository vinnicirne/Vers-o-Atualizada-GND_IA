// supabase/functions/asaas-pagar/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Método não permitido", { status: 405, headers: corsHeaders });
  }

  try {
    // 1. JWT Validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
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
      return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse Body
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

    // VALIDATION: Ensure critical data exists
    if (!amount) {
        return new Response(JSON.stringify({ error: "O valor da transação (amount) é inválido ou zero." }), { status: 400, headers: corsHeaders });
    }
    
    // Check if we have card data (either Token or Raw Data)
    if (!creditCardToken && (!creditCard || !creditCard.number || !creditCard.ccv)) {
        return new Response(JSON.stringify({ error: "Dados do cartão incompletos. Verifique número, validade e CVV." }), { status: 400, headers: corsHeaders });
    }

    // 3. User Data Lookup
    const { data: userData } = await supabaseAdmin
      .from("app_users")
      .select("email, full_name, asaas_customer_id, referred_by")
      .eq("id", authUser.id)
      .single();

    if (!userData?.email) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado no banco de dados." }), { status: 404, headers: corsHeaders });
    }

    const userEmail = userData.email;
    const userFullName = userData.full_name || userEmail.split("@")[0];
    let asaasCustomerId = userData.asaas_customer_id;
    const referrerId = userData.referred_by;

    // 4. Ensure Asaas Customer Exists
    if (!asaasCustomerId) {
      console.log(`Creating Asaas customer for ${userEmail}...`);
      const res = await fetch("https://sandbox.asaas.com/api/v3/customers", {
        method: "POST",
        headers: { "access_token": Deno.env.get("ASAAS_KEY")!, "Content-Type": "application/json" },
        body: JSON.stringify({ 
            name: userFullName, 
            email: userEmail, 
            externalReference: authUser.id,
            cpfCnpj: "00000000000" // Default for Sandbox
        }),
      });
      const customer = await res.json();
      
      if (!customer.id) {
          const errorMsg = customer.errors?.[0]?.description || "Falha ao criar cliente no Asaas.";
          console.error("Asaas Customer Error:", customer);
          return new Response(JSON.stringify({ error: errorMsg }), { status: 500, headers: corsHeaders });
      }

      asaasCustomerId = customer.id;
      await supabaseAdmin.from("app_users").update({ asaas_customer_id: asaasCustomerId }).eq("id", authUser.id);
    }

    // 5. Construct Asaas Payment Payload
    const paymentPayload: any = {
      customer: asaasCustomerId,
      billingType: "CREDIT_CARD",
      value: Number(amount),
      dueDate: new Date(Date.now()).toISOString().slice(0, 10), // Due today
      description: `GDN_IA: ${item_type} (${item_id})`,
      remoteIp: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
    };

    if (creditCardToken) {
        paymentPayload.creditCardToken = creditCardToken;
    } else {
        paymentPayload.creditCard = creditCard;
        paymentPayload.creditCardHolderInfo = creditCardHolderInfo || {
            name: userFullName,
            email: userEmail,
            cpfCnpj: "00000000000",
            postalCode: "00000000",
            addressNumber: "0",
            phone: "11999999999"
        };
    }

    if (Number(installments) > 1) {
      paymentPayload.installmentCount = Number(installments);
      paymentPayload.installmentValue = Number((Number(amount) / Number(installments)).toFixed(2));
    }

    console.log("Sending payment to Asaas...");

    // 6. Execute Payment
    const paymentRes = await fetch("https://sandbox.asaas.com/api/v3/payments", {
      method: "POST",
      headers: { "access_token": Deno.env.get("ASAAS_KEY")!, "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await paymentRes.json();

    // 7. Handle Asaas Errors (Critical Step)
    if (!paymentRes.ok || paymentData.errors) {
        console.error("Asaas Payment Failed:", paymentData);
        // Extract the first error description from Asaas array
        const errorMsg = paymentData.errors?.[0]?.description || paymentData.error || "Pagamento recusado pelo gateway.";
        return new Response(JSON.stringify({ error: errorMsg }), { status: 400, headers: corsHeaders });
    }

    const status = paymentData.status || "PENDING";

    // 8. Record Transaction
    await supabaseAdmin.from("transactions").insert({
      usuario_id: authUser.id,
      valor: Number(amount),
      metodo: "card",
      status: status === "CONFIRMED" || status === "RECEIVED" ? "approved" : "pending",
      external_id: paymentData.id,
      metadata: { provider: "asaas", item_type, item_id, raw_status: status },
      data: new Date().toISOString(),
    });

    // 9. Grant Benefits if Approved/Pending
    if (["CONFIRMED", "RECEIVED", "PENDING"].includes(status)) {
      if (item_type === "plan") {
        await supabaseAdmin.from("app_users").update({ plan: item_id }).eq("id", authUser.id);
        
        // Fetch plan credits
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
        const newCredits = (current?.credits || 0) + Number(item_id); // item_id carries amount for credits
        await supabaseAdmin.from("user_credits").upsert({ user_id: authUser.id, credits: newCredits }, { onConflict: "user_id" });
      }

      // Process Affiliate
      if (referrerId) {
        const commission = parseFloat((Number(amount) * 0.2).toFixed(2));
        const { data: refUser } = await supabaseAdmin.from("app_users").select("affiliate_balance").eq("id", referrerId).single();
        
        if (refUser) {
            const newBalance = (refUser.affiliate_balance || 0) + commission;
            await supabaseAdmin.from("app_users").update({ affiliate_balance: newBalance }).eq("id", referrerId);
            
            await supabaseAdmin.from("affiliate_logs").insert({
                affiliate_id: referrerId,
                source_user_id: authUser.id,
                amount: commission,
                description: `Comissão 20% - ${item_type}`
            });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, status, id: paymentData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Internal Server Error:", err);
    return new Response(JSON.stringify({ error: `Erro interno: ${err.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});