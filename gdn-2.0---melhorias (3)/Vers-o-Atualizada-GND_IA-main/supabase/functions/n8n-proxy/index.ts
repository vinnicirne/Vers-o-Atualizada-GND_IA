
// supabase/functions/n8n-proxy/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validação de Autenticação (JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Token de autenticação ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.split(" ")[1];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Obtém o usuário real da sessão
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse do Body
    const { prompt, task, metadata } = await req.json();

    if (!prompt) {
        return new Response(JSON.stringify({ status: "error", message: "Prompt obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 3. Configuração Segura (Environment Variables)
    // URL Base do seu N8N (ex: https://iconedigital.app.n8n.cloud/webhook/gdn)
    // Se não estiver definida no .env do Supabase, tenta usar uma padrão ou falha de forma segura.
    const N8N_BASE_URL = Deno.env.get("N8N_BASE_URL"); 
    const N8N_TOKEN = Deno.env.get("N8N_TOKEN"); // Token de segurança (Header Auth do N8N)

    if (!N8N_BASE_URL) {
        console.error("ERRO CRÍTICO: N8N_BASE_URL não configurada no servidor.");
        return new Response(JSON.stringify({ status: "error", message: "Erro de configuração no servidor." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 4. Construção da URL Isolada por Usuário
    // Formato final: https://seu-n8n.com/webhook/gdn/user/{userId}
    // Removemos qualquer barra final da URL base para evitar duplicação
    const cleanBaseUrl = N8N_BASE_URL.replace(/\/$/, "");
    // Adiciona /user/ID se a base URL ainda não tiver
    const targetUrl = cleanBaseUrl.includes('/user/') 
        ? `${cleanBaseUrl}/${user.id}` 
        : `${cleanBaseUrl}/user/${user.id}`;

    console.log(`[n8n-proxy] Encaminhando requisição de ${user.id} para ${targetUrl}`);

    // 5. Chamada Server-to-Server (Proxy)
    const n8nResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Injeta o token de segurança (se configurado) - O usuário nunca vê isso
        ...(N8N_TOKEN ? { "x-gdn-token": N8N_TOKEN } : {})
      },
      body: JSON.stringify({
        prompt,
        metadata: {
            ...metadata,
            userId: user.id, // Força o ID do usuário autenticado (segurança anti-spoofing)
            email: user.email,
            task: task || 'general_task',
            source: 'gdn_proxy_secure'
        }
      }),
    });

    // 6. Tratamento da Resposta
    if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error(`[n8n-proxy] Erro do N8N (${n8nResponse.status}): ${errorText}`);
        return new Response(JSON.stringify({ 
            status: "error", 
            message: `Ocorreu um erro no processamento (N8N ${n8nResponse.status}).`,
            details: errorText.substring(0, 200)
        }), {
            status: n8nResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Tenta parsear JSON, senão devolve texto bruto envelopado
    const responseText = await n8nResponse.text();
    let responseData;
    try {
        responseData = JSON.parse(responseText);
    } catch (e) {
        responseData = { output: responseText };
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[n8n-proxy] Erro Interno:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
