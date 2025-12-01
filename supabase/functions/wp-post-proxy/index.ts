// supabase/functions/wp-post-proxy/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Criptografia Helper Functions (Duplicado da wp-credentials-proxy para modularidade) ---
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
      console.error("[wp-post-proxy] Token de autenticação ausente.");
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
      console.error("[wp-post-proxy] Sessão inválida ou expirada.", authError);
      return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqJson = await req.json();
    const { title, content, status = 'draft', userId } = reqJson; // userId is passed to ensure it matches authUser.id

    if (userId !== authUser.id) {
        return new Response(JSON.stringify({ success: false, message: "Ação não autorizada para este usuário." }), { status: 403, headers: corsHeaders });
    }

    if (!title || !content) {
        return new Response(JSON.stringify({ success: false, message: "Título e conteúdo são obrigatórios." }), { status: 400, headers: corsHeaders });
    }

    // --- Fetch WordPress Credentials Securely from DB ---
    const DB_INTEGRATION_TYPE = 'wordpress';
    const { data: wpConfigData, error: wpConfigError } = await supabaseAdmin
        .from('user_integrations')
        .select('config_data')
        .eq('user_id', authUser.id)
        .eq('integration_type', DB_INTEGRATION_TYPE)
        .single();

    if (wpConfigError || !wpConfigData) {
        console.error("[wp-post-proxy] WordPress configuration not found for user:", authUser.id, wpConfigError);
        return new Response(JSON.stringify({ success: false, message: "Configuração WordPress não encontrada. Por favor, conecte seu site no painel." }), { status: 404, headers: corsHeaders });
    }

    const { siteUrl, username, applicationPassword: encryptedApplicationPassword } = wpConfigData.config_data;
    
    if (!siteUrl || !username || !encryptedApplicationPassword) {
        return new Response(JSON.stringify({ success: false, message: "Credenciais WordPress incompletas no banco de dados. Reconfigure a conexão." }), { status: 500, headers: corsHeaders });
    }

    // Decrypt applicationPassword
    const encryptionKey = await getEncryptionKey();
    const applicationPassword = await decrypt(encryptedApplicationPassword, encryptionKey);

    const credentials = `${username}:${applicationPassword}`;
    const auth = btoa(unescape(encodeURIComponent(credentials)));
    
    let cleanUrl = siteUrl.trim().replace(/\/$/, '');

    const payload = {
        title: title,
        content: content,
        status: status,
    };

    console.log(`[wp-post-proxy] Posting content for user ${authUser.id} to ${cleanUrl}`);

    try {
        const response = await fetch(`${cleanUrl}/wp-json/wp/v2/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                // Important for CORS: Your WP site needs to allow this origin
                'Origin': Deno.env.get('SUPABASE_URL') // Or your frontend URL
            },
            body: JSON.stringify(payload),
            // @ts-ignore
            noCheck: true,
            // @ts-ignore
            noThrow: true
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`[wp-post-proxy] Content posted successfully for user ${authUser.id}. Link: ${data.link}`);
            return new Response(JSON.stringify({ success: true, link: data.link, message: "Postado com sucesso!" }), { status: 200, headers: corsHeaders });
        } else {
            let errorMsg = data.message || `Erro ${response.status}: ${response.statusText}`;
            console.warn(`[wp-post-proxy] Failed to post content for user ${authUser.id}: ${errorMsg}`);
            return new Response(JSON.stringify({ success: false, message: `Erro ao postar no WordPress: ${errorMsg}` }), { status: 400, headers: corsHeaders });
        }
    } catch (error: any) {
        console.error("[wp-post-proxy] Fetch error during WordPress post:", error);
        let msg = error.message || 'Erro desconhecido.';
        if (msg.includes('NetworkError') || error instanceof TypeError) {
            msg = "Erro de rede ou CORS. Verifique se o WordPress aceita requisições externas e se o site está em HTTPS.";
        }
        return new Response(JSON.stringify({ success: false, message: `Falha de comunicação: ${msg}` }), { status: 500, headers: corsHeaders });
    }

  } catch (err: any) {
    console.error("[wp-post-proxy] Erro interno no processamento:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});