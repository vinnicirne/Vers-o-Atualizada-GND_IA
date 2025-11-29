import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"; // Use Supabase client for DB interaction

declare const Deno: any; // Add this line to declare Deno

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Extract JWT from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }
  const jwt = authHeader.split(' ')[1];

  // Create a Supabase client with the Service Role Key
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // Use service role key to bypass RLS
  );

  // Authenticate the user to get their UID
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(jwt);

  if (authError || !authUser) {
    console.error('Auth Error:', authError?.message);
    return new Response(JSON.stringify({ error: authError?.message || 'Authentication failed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  const { token, payment_method_id, issuer_id, installments, amount, item_type, item_id } = await req.json();

  // Get user's email from app_users table
  const { data: userData, error: userError } = await supabase
    .from('app_users')
    .select('email, referred_by')
    .eq('id', authUser.id)
    .single();

  if (userError || !userData) {
    console.error('User data fetch error:', userError?.message);
    return new Response(JSON.stringify({ error: userError?.message || 'Failed to retrieve user email' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
  const userEmail = userData.email;
  const referrerId = userData.referred_by;

  // Mercado Pago Payment
  const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token,
      payment_method_id,
      issuer_id: issuer_id,
      transaction_amount: Number(amount),
      installments: Number(installments),
      description: `Compra GDN_IA - ${item_type} ID: ${item_id}`,
      payer: { email: userEmail }
    })
  });

  const payment = await mpResponse.json();

  let transactionStatus = payment.status || 'failed';
  if (payment.error) {
      transactionStatus = 'failed';
      console.error('Mercado Pago Payment Error:', payment.error, payment.message);
  }

  // Prepare metadata for transaction log
  const transactionMetadata = {
    item_type: item_type,
    item_id: item_id,
    provider: 'mercado_pago',
    description: `Pagamento para ${item_type} ID: ${item_id}`,
    plan_id: item_type === 'plan' ? item_id : undefined,
    credits_amount: item_type === 'credits' ? (item_type === 'credits' ? item_id : undefined) : undefined, // For credits, assume item_id is the quantity
    payment_method_id: payment_method_id,
    issuer_id: issuer_id,
    installments: installments,
    // Add full Mercado Pago response to metadata for debugging/auditing
    mp_response: payment,
  };

  // 1. Save transaction in 'transactions' table
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      usuario_id: authUser.id,
      valor: amount,
      metodo: 'card', // Assuming 'card' for Mercado Pago tokenized payments
      status: transactionStatus,
      external_id: payment.id, // Mercado Pago payment ID
      metadata: transactionMetadata,
      data: new Date().toISOString(),
    });

  if (transactionError) {
    console.error('Supabase transaction log error:', transactionError.message);
    return new Response(JSON.stringify({ error: transactionError.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  // 2. If payment is approved/pending, update user's plan/credits
  if (transactionStatus === 'approved' || transactionStatus === 'pending') {
    if (item_type === 'plan') {
        // Update user's plan in app_users
        const { error: planUpdateError } = await supabase
            .from('app_users')
            .update({ plan: item_id })
            .eq('id', authUser.id);
        if (planUpdateError) console.error('Supabase plan update error:', planUpdateError.message);
        
        // Fetch plan details to get initial credits for the new plan
        const { data: planConfig, error: fetchPlanError } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'all_plans')
          .single();

        if (!fetchPlanError && planConfig && planConfig.value) {
            const allPlans = planConfig.value as any[];
            const selectedPlan = allPlans.find(p => p.id === item_id);
            if (selectedPlan) {
                const newCredits = selectedPlan.credits;
                // Update user_credits with new plan's credits (or -1 for unlimited)
                await supabase
                    .from('user_credits')
                    .upsert({ user_id: authUser.id, credits: newCredits }, { onConflict: 'user_id' });
            }
        }
    } else if (item_type === 'credits') {
        // Fetch current credits and add new amount
        const { data: currentCreditsData, error: creditsFetchError } = await supabase
            .from('user_credits')
            .select('credits')
            .eq('user_id', authUser.id)
            .single();

        let newCreditsAmount = Number(item_id); // item_id is the credits quantity for 'credits' type
        if (!creditsFetchError && currentCreditsData) {
            newCreditsAmount = currentCreditsData.credits + Number(item_id);
        }

        const { error: creditsUpdateError } = await supabase
            .from('user_credits')
            .upsert({ user_id: authUser.id, credits: newCreditsAmount }, { onConflict: 'user_id' });
        if (creditsUpdateError) console.error('Supabase credits update error:', creditsUpdateError.message);
    }

    // 3. Process Affiliate Commission (if referrer exists)
    if (referrerId) {
        // Fetch referrer's current balance
        const { data: referrerData, error: referrerFetchError } = await supabase
            .from('app_users')
            .select('affiliate_balance')
            .eq('id', referrerId)
            .single();

        if (!referrerFetchError && referrerData) {
            const COMMISSION_RATE = 0.20; // 20% commission
            const commission = parseFloat((amount * COMMISSION_RATE).toFixed(2));
            const newBalance = parseFloat(((referrerData.affiliate_balance || 0) + commission).toFixed(2));

            // Update referrer's balance
            const { error: balanceUpdateError } = await supabase
                .from('app_users')
                .update({ affiliate_balance: newBalance })
                .eq('id', referrerId);

            if (balanceUpdateError) console.error('Affiliate balance update error:', balanceUpdateError.message);

            // Log affiliate transaction
            const { error: logError } = await supabase
                .from('affiliate_logs')
                .insert({
                    affiliate_id: referrerId,
                    source_user_id: authUser.id,
                    amount: commission,
                    description: `Comissão ref. compra de ${item_type} (${item_id}) por ${userEmail}`
                });
            if (logError) console.error('Affiliate log error:', logError.message);
        }
    }
  }

  return new Response(JSON.stringify(payment), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
