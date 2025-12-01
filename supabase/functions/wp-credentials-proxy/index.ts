// supabase/functions/wp-credentials-proxy/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Criptografia Helper Functions ---
// Use AES-GCM for encryption (recommended for authenticated encryption)
async function getEncryptionKey(): Promise<CryptoKey> {
    const rawKey = Deno.env.get("WORDPRESS_ENCRYPTION_KEY");
    if (!rawKey || rawKey.length !== 32) { // AES-256 requires 32 bytes (256 bits)
        throw new Error("WORDPRESS_ENCRYPTION_KEY environment variable missing or invalid length (must be 32 bytes for AES-256).");
    }
    const keyBytes = new TextEncoder().encode(rawKey);
    return await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encrypt(text: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // GCM recommended IV size is 12 bytes
    const encodedText = new TextEncoder().encode(text);
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedText
    );
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const ciphertextHex = Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${ivHex}:${ciphertextHex}`; // Store IV and ciphertext together
}

async function decrypt(encryptedText: string, key: CryptoKey): Promise<string> {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) throw new Error("Invalid encrypted text format.");
    const iv = new Uint8Array(parts[0].match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(parts[1].match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
    );
    return new TextDecoder().decode(decrypted);
}
// --- End Criptografia Helper Functions ---


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
      console.error("[wp-credentials-proxy] Token de autenticação ausente.");
      return new Response(JSON.stringify({ error: "Token de autenticação ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.split(" ")[1];

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !authUser) {
      console.error("[wp-credentials-proxy] Sessão inválida ou expirada.", authError);
      return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqJson = await req.json();
    const { action, siteUrl, username, applicationPassword } = reqJson;

    if (action !== 'validate' || !siteUrl || !username || !applicationPassword) {
      return new Response(JSON.stringify({ success: false, message: "Dados incompletos para validação." }), { status: 400, headers: corsHeaders });
    }

    // --- Inicia Lógica de Validação e Armazenamento ---
    const DB_INTEGRATION_TYPE = 'wordpress';
    let cleanUrl = siteUrl.trim().replace(/\/$/, '');

    // Basic URL validation
    try {
        new URL(cleanUrl);
    } catch (e) {
        return new Response(JSON.stringify({ success: false, message: 'URL do site inválida. Verifique o formato.' }), { status: 400, headers: corsHeaders });
    }

    const credentials = `${username}:${applicationPassword}`;
    const auth = btoa(unescape(encodeURIComponent(credentials)));
    
    console.log(`[wp-credentials-proxy] Validating WordPress connection for user ${authUser.id} to ${cleanUrl}`);

    try {
        const response = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me?context=edit&_t=${Date.now()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                // Important for CORS: Your WP site needs to allow this origin
                'Origin': Deno.env.get('SUPABASE_URL') // Or your frontend URL
            },
            // Add Deno.noCheck and Deno.noThrow for fetch in Deno to handle potential network errors gracefully
            // @ts-ignore
            noCheck: true,
            // @ts-ignore
            noThrow: true
        });

        if (response.ok) {
            console.log(`[wp-credentials-proxy] WordPress validation successful for user ${authUser.id}. Storing credentials.`);
            
            // Encrypt applicationPassword before storing
            const encryptionKey = await getEncryptionKey();
            const encryptedPassword = await encrypt(applicationPassword, encryptionKey);

            // Store credentials securely in the database
            await supabaseAdmin
                .from('user_integrations')
                .upsert(
                    {
                        user_id: authUser.id,
                        integration_type: DB_INTEGRATION_TYPE,
                        config_data: {
                            siteUrl: cleanUrl,
                            username: username,
                            applicationPassword: encryptedPassword // Store encrypted password
                        }
                    },
                    { onConflict: 'user_id,integration_type' }
                );

            return new Response(JSON.stringify({ success: true, message: "Conexão WordPress validada e credenciais salvas." }), { status: 200, headers: corsHeaders });
        } else {
            let errorMsg = `Erro ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.message) errorMsg = `WordPress recusou: ${errorData.message}`;
            } catch (e) {
                // Ignore JSON parse error if response is not JSON
            }
            console.warn(`[wp-credentials-proxy] WordPress validation failed for user ${authUser.id}: ${errorMsg}`);
            return new Response(JSON.stringify({ success: false, message: `Falha na conexão: ${errorMsg}` }), { status: 400, headers: corsHeaders });
        }
    } catch (error: any) {
        console.error("[wp-credentials-proxy] Fetch error during WordPress validation:", error);
        let msg = error.message || 'Erro desconhecido.';
        if (msg.includes('NetworkError') || error instanceof TypeError) {
            msg = "Erro de rede ou CORS. Verifique se o WordPress permite requisições externas e se o site está em HTTPS.";
        }
        return new Response(JSON.stringify({ success: false, message: `Falha de comunicação: ${msg}` }), { status: 500, headers: corsHeaders });
    }

  } catch (err: any) {
    console.error("[wp-credentials-proxy] Erro interno no processamento:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});