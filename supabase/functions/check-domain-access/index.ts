
// supabase/functions/check-domain-access/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- DOMAIN BLACKLIST (Must match frontend's blacklist) ---
const DOMAIN_BLACKLIST = [
    'teste.com',
    'teste.com.br',
    'test.com',
    'example.com',
    'exemplo.com',
    'email.com',
    'usuario.com',
    'tempmail.com',
    '10minutemail.com',
    'mailinator.com',
    'yopmail.com',
    'throwawaymail.com'
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Método não permitido", { status: 405, headers: corsHeaders });
  }

  try {
    // Authentication is optional for this public check, but we initialize to get user context if available
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!, // Use ANON KEY for client-side access
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const supabaseAdmin = createClient( // Use ADMIN client to bypass RLS for reading system_config
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { domain } = await req.json();

    if (!domain) {
      return new Response(JSON.stringify({ allowed: false, error: "Domínio é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lowerDomain = domain.toLowerCase();

    // 1. Blacklist check
    if (DOMAIN_BLACKLIST.includes(lowerDomain)) {
        console.log(`[check-domain-access] Domain ${lowerDomain} rejected by blacklist.`);
        return new Response(JSON.stringify({ allowed: false, reason: "blacklist" }), { status: 200, headers: corsHeaders });
    }

    // 2. Allowlist check (direct DB query)
    const { data: allowedDomains, error: allowedError } = await supabase
        .from('allowed_domains')
        .select('domain')
        .eq('domain', lowerDomain);
    
    if (allowedError) {
        console.error("[check-domain-access] Error checking allowed_domains:", allowedError.message);
        // Fail safe: if DB query fails, better to deny access than risk allowing insecure domains
        return new Response(JSON.stringify({ allowed: false, error: "Erro ao consultar allowlist." }), { status: 500, headers: corsHeaders });
    }

    if (allowedDomains && allowedDomains.length > 0) {
        console.log(`[check-domain-access] Domain ${lowerDomain} allowed by allowlist.`);
        return new Response(JSON.stringify({ allowed: true, reason: "allowlist" }), { status: 200, headers: corsHeaders });
    }

    // 3. Get Security Settings to determine validation mode
    const { data: configRows, error: configError } = await supabaseAdmin
        .from("system_config")
        .select("value")
        .eq("key", "security_settings")
        .single();
    
    if (configError && configError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("[check-domain-access] Error fetching security_settings:", configError.message);
        return new Response(JSON.stringify({ allowed: false, error: "Erro ao carregar configurações de segurança." }), { status: 500, headers: corsHeaders });
    }

    const securitySettings = configRows?.value || { validationMode: 'strict_allowlist' }; // Default to strict if no config
    
    if (securitySettings.validationMode === 'strict_allowlist') {
        // If not in allowlist and mode is strict, deny
        console.log(`[check-domain-access] Domain ${lowerDomain} rejected by strict_allowlist mode.`);
        return new Response(JSON.stringify({ allowed: false, reason: "strict_allowlist" }), { status: 200, headers: corsHeaders });
    }

    if (securitySettings.validationMode === 'dns_validation') {
        console.log(`[check-domain-access] Attempting DNS validation for domain: ${lowerDomain}`);
        // This is a simplified DNS check. A more robust solution would involve external APIs or direct DNS lookups.
        // For Deno, you'd typically use Deno.resolveDns or a third-party service.
        // For demonstration purposes, we will mock a "valid" DNS response for most common domains.
        
        // This is still a "mock" but on the server, ensuring the server-side logic path is correctly implemented.
        // For production, replace this with actual DNS lookup (e.g., fetching MX records).
        const commonPublicDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'protonmail.com'];
        const isCommonPublicDomain = commonPublicDomains.some(d => d === lowerDomain);

        if (isCommonPublicDomain || !lowerDomain.includes('.')) { // Simple check for valid-looking domains (e.g., 'example.com')
             console.log(`[check-domain-access] Domain ${lowerDomain} allowed by (mock) DNS validation.`);
             return new Response(JSON.stringify({ allowed: true, reason: "dns_validation_mock" }), { status: 200, headers: corsHeaders });
        }
        
        // In a real scenario, this would be an actual DNS lookup:
        /*
        try {
            const mxRecords = await Deno.resolveDns(lowerDomain, "MX");
            if (mxRecords && mxRecords.length > 0) {
                console.log(`[check-domain-access] Domain ${lowerDomain} allowed by real DNS validation (MX records found).`);
                return new Response(JSON.stringify({ allowed: true, reason: "dns_validation_real" }), { status: 200, headers: corsHeaders });
            }
        } catch (dnsError) {
            console.warn(`[check-domain-access] DNS lookup failed for ${lowerDomain}: ${dnsError.message}`);
            // Fall through to deny
        }
        */

        console.log(`[check-domain-access] Domain ${lowerDomain} rejected by (mock) DNS validation (no common public match).`);
        return new Response(JSON.stringify({ allowed: false, reason: "dns_validation_failed" }), { status: 200, headers: corsHeaders });
    }

    // Default deny
    return new Response(JSON.stringify({ allowed: false, reason: "unknown" }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("[check-domain-access] Internal server error:", err.message || JSON.stringify(err));
    return new Response(JSON.stringify({ allowed: false, error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});