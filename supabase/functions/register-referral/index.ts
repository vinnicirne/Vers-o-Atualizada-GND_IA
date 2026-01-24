
// supabase/functions/register-referral/index.ts
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, referralCode } = await req.json();

    if (!userId || !referralCode) {
        return new Response(JSON.stringify({ error: "Dados incompletos" }), { status: 400, headers: corsHeaders });
    }

    // Admin Client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Find Affiliate Owner
    const { data: referrers, error: fetchError } = await supabaseAdmin
        .from('app_users')
        .select('id')
        .eq('affiliate_code', referralCode);

    if (fetchError || !referrers || referrers.length === 0) {
        return new Response(JSON.stringify({ error: "Código inválido" }), { status: 404, headers: corsHeaders });
    }

    const referrerId = referrers[0].id;

    // 2. Prevent Self-Referral
    if (referrerId === userId) {
        return new Response(JSON.stringify({ error: "SELF_REFERRAL", success: false }), { status: 200, headers: corsHeaders });
    }

    // 3. Update User
    const { error: updateError } = await supabaseAdmin
        .from('app_users')
        .update({ referred_by: referrerId })
        .eq('id', userId);

    if (updateError) {
        throw updateError;
    }

    return new Response(JSON.stringify({ success: true, referrerId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
