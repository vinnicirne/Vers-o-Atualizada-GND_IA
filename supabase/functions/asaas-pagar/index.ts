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

  const { amount, cardToken, item_type, item_id } = await req.json();

  // Get user's email and Asaas customer ID from app_users table
  const { data: userData, error: userError } = await supabase
    .from('app_users')
    .select('email, asaas_customer_id, referred_by') // Assuming asaas_customer_id exists
    .eq('id', authUser.id)
    .single();

  if (userError || !userData) {
    console.error('User data fetch error:', userError?.message);
    return new Response(JSON.stringify({ error: userError?.message || 'Failed to retrieve user data' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
  const userEmail = userData.email;
  const referrerId = userData.referred_by;
  let asaasCustomerId = userData.asaas_customer_id;

  // If Asaas customer ID doesn't exist, create one
  if (!asaasCustomerId) {
    const customerResponse = await fetch("https://sandbox.asaas.com/api/v3/customers", {
      method: "POST",
      headers: {
        access_token: Deno.env.get("ASAAS_KEY")!,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: authUser.email, // Or full_name if stored in app_users
        email: userEmail,
        // Add other customer details if available (e.g., cpfCnpj, phone)
      })
    });
    const customerData = await customerResponse.json();

    if (customerData.id) {
      asaasCustomerId = customerData.id;
      // Save new Asaas customer ID to app_users
      await supabase
        .from('app_users')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', authUser.id);
    } else {
      console.error('Failed to create Asaas customer:', customerData);
      return new Response(JSON.stringify({ error: customerData.errors[0]?.description || 'Failed to create Asaas customer' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
  }

  // Asaas Payment
  const asaasRes = await fetch("https://sandbox.asaas.com/api/v3/payments", {
    method: "POST",
    headers: {
      access_token: Deno.env.get("ASAAS_KEY")!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      customer: asaasCustomerId,
      billingType: "CREDIT_CARD",
      value: amount,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Due date tomorrow
      creditCardToken: cardToken,
      remoteIp: req.headers.get('x-forwarded-for') || '127.0.0.1', // Use actual IP if available
      description: `Compra GDN_IA - ${item_type} ID: ${item_id}`,
    })
  });

  const payment = await asaasRes.json();

  let transactionStatus = payment.status === 'CONFIRMED' ? 'approved' : (payment.status === 'PENDING' ? 'pending' : 'failed');
  if (payment.errors) {
      transactionStatus = 'failed';
      console.error('Asaas Payment Error:', payment.errors);
  }

  // Prepare metadata for transaction log
  const transactionMetadata = {
    item_type: item_type,
    item_id: item_id,
    provider: 'asaas',
    description: `Pagamento para ${item_type} ID: ${item_id}`,
    plan_id: item_type === 'plan' ? item_id : undefined,
    credits_amount: item_type === 'credits' ? (item_type === 'credits' ? item_id : undefined) : undefined, // For credits, assume item_id is the quantity
    card_token_id: cardToken,
    customer_id: asaasCustomerId,
    // Add full Asaas response to metadata for debugging/auditing
    asaas_response: payment,
  };

  // 1. Save transaction in 'transactions' table
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      usuario_id: authUser.id,
      valor: amount,
      metodo: 'card', // Assuming 'card' for Asaas credit card payments
      status: transactionStatus,
      external_id: payment.id, // Asaas payment ID
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

  // 2. If payment is approved, update user's plan/credits
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
            .eq('id', authUser.id) // Corrected from user_id to id, assuming user_credits uses 'id' as PK or unique key for user_id
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
