import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Extract JWT from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }
  const jwt = authHeader.split(' ')[1];

  // Create a Supabase client with the Service Role Key to bypass RLS for fetching sensitive user data
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
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

  try {
    const { creditCardToken, amount, item_type, item_id } = await req.json();

    if (!creditCardToken || !amount) {
      return new Response(JSON.stringify({ error: "Faltam dados do cartão ou valor" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch user profile to get email, full_name, asaas_customer_id and referrer_id
    const { data: userData, error: userProfileError } = await supabase
      .from('app_users')
      .select('email, full_name, asaas_customer_id, referred_by')
      .eq('id', authUser.id)
      .single();

    if (userProfileError || !userData) {
      console.error('User data fetch error:', userProfileError?.message);
      return new Response(JSON.stringify({ error: userProfileError?.message || 'Failed to retrieve user profile' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const userEmail = userData.email;
    const userFullName = userData.full_name || userEmail.split('@')[0];
    let asaasCustomerId = userData.asaas_customer_id;
    const referrerId = userData.referred_by;

    // 2. If asaas_customer_id doesn't exist, create it in Asaas
    if (!asaasCustomerId) {
      const createCustomerRes = await fetch("https://sandbox.asaas.com/api/v3/customers", {
        method: "POST",
        headers: {
          "access_token": Deno.env.get("ASAAS_KEY")!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: userFullName,
          email: userEmail,
        }),
      });
      const customerData = await createCustomerRes.json();

      if (customerData.id) {
        asaasCustomerId = customerData.id;
        // Update app_users with the new Asaas Customer ID
        await supabase
          .from('app_users')
          .update({ asaas_customer_id: asaasCustomerId })
          .eq('id', authUser.id);
      } else {
        console.error('Asaas customer creation error:', customerData);
        return new Response(JSON.stringify({ error: 'Failed to create Asaas customer' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get remote IP address
    const remoteIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    // 3. Process payment with Asaas
    const res = await fetch("https://sandbox.asaas.com/api/v3/payments", {
      method: "POST",
      headers: {
        "access_token": Deno.env.get("ASAAS_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "CREDIT_CARD",
        value: Number(amount),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days due date
        creditCardToken,
        remoteIp,
        description: `Compra GDN_IA - ${item_type} ID: ${item_id}`,
      }),
    });

    const data = await res.json();
    let transactionStatus = data.status || 'failed';

    // Prepare metadata for transaction log
    const transactionMetadata = {
      item_type: item_type,
      item_id: item_id,
      provider: 'asaas',
      description: `Pagamento para ${item_type} ID: ${item_id}`,
      plan_id: item_type === 'plan' ? item_id : undefined,
      credits_amount: item_type === 'credits' ? (item_type === 'credits' ? item_id : undefined) : undefined,
      card_token_id: creditCardToken,
      customer_id: asaasCustomerId,
      asaas_response: data,
    };

    // 4. Save transaction in 'transactions' table
    const { error: transactionError } = await supabase
      .from('transactions') // Changed from 'payments' to 'transactions'
      .insert({
        usuario_id: authUser.id,
        valor: amount,
        metodo: 'card',
        status: transactionStatus,
        external_id: data.id, // Asaas payment ID
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

    // 5. If payment is approved/pending, update user's plan/credits
    if (transactionStatus === 'CONFIRMED' || transactionStatus === 'PENDING') {
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

        // 6. Process Affiliate Commission (if referrer exists)
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

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});