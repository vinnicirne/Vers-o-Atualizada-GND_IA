import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const body = await req.json()
  const { creditCardToken, amount, user_id } = body

  if (!creditCardToken || !amount) {
    return new Response(JSON.stringify({ error: "Faltam dados" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const asaasRes = await fetch("https://sandbox.asaas.com/api/v3/payments", {
    method: "POST",
    headers: {
      "access_token": Deno.env.get("ASAAS_KEY")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: "cus_000006501709",        // cliente de teste do sandbox
      billingType: "CREDIT_CARD",
      value: Number(amount),
      dueDate: new Date().toISOString().split("T")[0],
      creditCardToken,
      remoteIp: "127.0.0.1",
      description: "Pagamento GND",
    }),
  })

  const result = await asaasRes.json()

  // Salva no Supabase (se quiser)
  if (user_id && result.id) {
    await fetch(`https://bckujotubhkagcqfivye.supabase.co/rest/v1/payments`, {
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
        transaction_id: result.id,
        amount,
        status: result.status?.toLowerCase(),
      }),
    })
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})