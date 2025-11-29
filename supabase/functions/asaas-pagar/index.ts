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
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqJson = await req.json();

    // --- MODO 1: VERIFICAÇÃO DE STATUS (POLLING) ---
    if (reqJson.check_status_id) {
        const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("status")
            .or(`external_id.eq.${reqJson.check_status_id},id.eq.${reqJson.check_status_id}`)
            .single();
        
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

    if (!amount) {
        return new Response(JSON.stringify({ error: "Valor inválido." }), { status: 400, headers: corsHeaders });
    }

    // Busca dados do usuário
    const { data: userData } = await supabaseAdmin
      .from("app_users")
      .select("email, full_name, asaas_customer_id, referred_by")
      .eq("id", authUser.id)
      .single();

    if (!userData?.email) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado." }), { status: 404, headers: corsHeaders });
    }

    const userEmail = userData.email;
    const userFullName = userData.full_name || userEmail.split("@")[0];
    let asaasCustomerId = userData.asaas_customer_id;
    const referrerId = userData.referred_by;

    // Se docNumber não veio, usa um default para Sandbox (não recomendado em prod)
    const cpfCnpjToUse = docNumber || "00000000000";

    // Garante cliente no Asaas
    // Lógica atualizada: Sempre tenta buscar/criar ou atualizar se o ID não existir
    if (!asaasCustomerId) {
      // 1. Tenta criar cliente
      const res = await fetch("https://sandbox.asaas.com/api/v3/customers", {
        method: "POST",
        headers: { "access_token": Deno.env.get("ASAAS_KEY")!, "Content-Type": "application/json" },
        body: JSON.stringify({ 
            name: userFullName, 
            email: userEmail, 
            externalReference: authUser.id,
            cpfCnpj: cpfCnpjToUse
        }),
      });
      const customer = await res.json();
      
      if (!customer.id) {
          // Se falhar (ex: email já existe no Asaas mas não no nosso banco), tenta buscar por email
          if (customer.errors?.[0]?.code === 'invalid_customer' || customer.errors?.[0]?.description?.includes('email')) {
               const searchRes = await fetch(`https://sandbox.asaas.com/api/v3/customers?email=${userEmail}`, {
                   headers: { "access_token": Deno.env.get("ASAAS_KEY")! }
               });
               const searchData = await searchRes.json();
               if (searchData.data && searchData.data.length > 0) {
                   asaasCustomerId = searchData.data[0].id;
               }
          }
          
          if (!asaasCustomerId) {
             return new Response(JSON.stringify({ error: "Falha ao registrar cliente no Asaas: " + (customer.errors?.[0]?.description || "Erro desconhecido") }), { status: 500, headers: corsHeaders });
          }
      } else {
          asaasCustomerId = customer.id;
      }
      
      // Salva ID no banco
      await supabaseAdmin.from("app_users").update({ asaas_customer_id: asaasCustomerId }).eq("id", authUser.id);
    }

    const isPix = billingType === 'PIX';

    // Monta payload Asaas
    const paymentPayload: any = {
      customer: asaasCustomerId,
      billingType: isPix ? "PIX" : "CREDIT_CARD",
      value: Number(amount),
      dueDate: new Date(Date.now()).toISOString().slice(0, 10),
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
                postalCode: "00000000",
                addressNumber: "0",
                phone: "11999999999"
            };
        }
        if (Number(installments) > 1) {
            paymentPayload.installmentCount = Number(installments);
            paymentPayload.installmentValue = Number((Number(amount) / Number(installments)).toFixed(2));
        }
    }

    // Cria cobrança
    const paymentRes = await fetch("https://sandbox.asaas.com/api/v3/payments", {
      method: "POST",
      headers: { "access_token": Deno.env.get("ASAAS_KEY")!, "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await paymentRes.json();

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
        
        return new Response(JSON.stringify({ 
            success: true, 
            paymentId: paymentData.id, 
            qrCode: qrData // Contém payload e encodedImage
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Se for Cartão, verifica status imediato
    if (paymentData.status === "CONFIRMED" || paymentData.status === "RECEIVED") {
        await supabaseAdmin.from("transactions").update({ status: 'approved' }).eq('external_id', paymentData.id);
        await releaseBenefits(supabaseAdmin, authUser.id, item_type, item_id, amount, referrerId);
    }

    return new Response(JSON.stringify({ success: true, status: paymentData.status, id: paymentData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Erro interno:", err);
    return new Response(JSON.stringify({ error: `Erro interno: ${err.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper de Benefícios
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
}