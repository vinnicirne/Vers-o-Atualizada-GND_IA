import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const { token, payment_method_id, amount, user_id } = await req.json()

  const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token,
      payment_method_id,
      transaction_amount: Number(amount),
      installments: 1,
      description: "Pagamento GND",
      payer: { email: "cliente@teste.com" }
    })
  })

  const payment = await mpResponse.json()

  // contém status approved, pending, etc

  // Salva no Supabase
  await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/payments`, {
    method: "POST",
    headers: {
      apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      user_id,
      gateway: "mercadopago",
      transaction_id: payment.id,
      amount,
      status: payment.status
    })
  })

  return new Response(JSON.stringify(payment), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
})