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
      return new Response(JSON.stringify({ error: "Token de autenticação ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "invalid access token" }), {
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
            .or(`external_id.eq.${reqJson.check_status_id},id.eq.${reqJson.check_status_id}`) // Check both internal and external IDs
            .single();
        
        return new Response(JSON.stringify({ status: tx?.status || 'pending' }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // --- MODO 2: GERAÇÃO DE PAGAMENTO ---
    const {
      token,
      payment_method_id, // Pode ser 'pix' ou id do cartão
      issuer_id,
      installments = 1,
      amount,
      item_type,
      item_id,
      method // 'pix' ou 'card'
    } = reqJson;

    if (!amount || !item_type || !item_id) {
      return new Response(JSON.stringify({ error: "Dados do pagamento incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from("app_users")
      .select("email, referred_by, full_name")
      .eq("id", authUser.id)
      .single();

    if (userError || !userData?.email) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = userData.email;
    const referrerId = userData.referred_by;
    const isPix = method === 'pix' || payment_method_id === 'pix';

    // Monta payload do Mercado Pago
    const mpPayload: any = {
        transaction_amount: Number(amount),
        description: `Compra GDN_IA - ${item_type} (${item_id})`,
        payer: {
            email: userEmail,
            first_name: userData.full_name?.split(' ')[0] || 'Cliente',
            last_name: userData.full_name?.split(' ').slice(1).join(' ') || 'GDN'
        }
    };

    if (isPix) {
        mpPayload.payment_method_id = 'pix';
    } else {
        // Cartão de Crédito
        if (!token) throw new Error("Token do cartão é obrigatório.");
        mpPayload.token = token;
        mpPayload.installments = Number(installments);
        mpPayload.payment_method_id = payment_method_id;
        if (issuer_id) mpPayload.issuer_id = issuer_id;
    }

    // Chamada à API do Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID()
      },
      body: JSON.stringify(mpPayload),
    });

    const payment = await mpResponse.json();

    if (!mpResponse.ok) {
        console.error("MP Error:", payment);
        return new Response(JSON.stringify({ error: payment.message || "Erro no Mercado Pago" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const transactionStatus = payment.status === "approved" ? "approved" : "pending";

    // Salva transação no banco (Fundamental para o Webhook/Polling atualizar depois)
    await supabaseAdmin
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
      });

    // Se for Pix, retorna os dados do QR Code
    if (isPix) {
        return new Response(JSON.stringify(payment), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Se for Cartão e Aprovado, libera benefícios imediatamente
    if (transactionStatus === "approved") {
        await releaseBenefits(supabaseAdmin, authUser.id, item_type, item_id, amount, referrerId);
    }

    return new Response(JSON.stringify(payment), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Erro interno mp-pagar:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper para liberar benefícios (duplicado no asaas para segurança)
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
        const newCredits = (current?.credits || 0) + Number(itemId); // itemId carries amount for credits
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