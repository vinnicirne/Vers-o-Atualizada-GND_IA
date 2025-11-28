import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const { amount, user_id, cardToken } = await req.json()

  const asaasRes = await fetch("https://sandbox.asaas.com/api/v3/payments", {
    method: "POST",
    headers: {
      access_token: Deno.env.get("ASAAS_KEY")!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      customer: "cus_000006501709", // cliente de teste do sandbox
      billingType: "CREDIT_CARD",
      value: amount,
      dueDate: "2025-12-30",
      creditCardToken: cardToken,
      remoteIp: "127.0.0.1"
    })
  })

  const data = await asaasRes.json()

  // Salva no Supabase
  await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/payments`, {
    method: "POST",
    headers: {
      apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      user_id,
      gateway: "asaas",
      transaction_id: data.id,
      amount,
      status: data.status?.toLowerCase()
    })
  })

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
})