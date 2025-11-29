import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Add this line to declare Deno for TypeScript
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const { creditCardToken, amount, user_id } = await req.json()

    if (!creditCardToken || !amount) {
      return new Response(JSON.stringify({ error: "Faltam dados do cartão ou valor" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const res = await fetch("https://sandbox.asaas.com/api/v3/payments", {
      method: "POST",
      headers: {
        "access_token": Deno.env.get("ASAAS_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: "cus_000006501709",
        billingType: "CREDIT_CARD",
        value: Number(amount),
        dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0], // 30 dias
        creditCardToken,
        remoteIp: "127.0.0.1",
      }),
    })

    const data = await res.json()

    // Salva no banco (opcional)
    if (user_id && data.id) {
      await fetch("https://bckujotuhhkagcqfiyye.supabase.co/rest/v1/payments", {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          user_id,
          gateway: "asaas",
          transaction_id: data.id,
          amount,
          status: data.status?.toLowerCase(),
        }),
      })
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})