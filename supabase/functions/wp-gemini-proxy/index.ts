
// supabase/functions/wp-gemini-proxy/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.1.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NEWS_GENERATOR_SYSTEM_PROMPT = `
Você é o GDN_IA Notícias, um jornalista esportivo e investigativo sênior.
Sua tarefa é gerar uma notícia completa e otimizada para SEO.

## DIRETRIZES GERAIS DE SEO
1. **Palavra-chave Foco:** Identifique o tema principal e certifique-se de que ele apareça no **TÍTULO** e na **PRIMEIRA FRASE** do primeiro parágrafo. Isso é crucial para o SEO.
2. **Estrutura:** Use parágrafos curtos e legíveis.
3. **Imparcialidade:** Mantenha um tom jornalístico profissional.

## FORMATO DE SAÍDA OBRIGATÓRIO (use estas tags exatas para o WP Plugin):
Linha 1: [TÍTULO] (Um título impactante, max 60 chars)
Linha 2: [KEYWORD] (Apenas a palavra-chave foco)
Linha 3: [META] (Uma meta descrição de 150 caracteres, otimizada com a keyword)
Linha 4 em diante: [CONTEÚDO] (O texto completo em HTML, usando <h2>, <h3>, <p>, <ul><li>, <blockquote>. NÃO use Markdown).
`;

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
      console.error("[wp-gemini-proxy] Token de autenticação ausente.");
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
      console.error("[wp-gemini-proxy] Sessão inválida ou expirada.", authError);
      return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqJson = await req.json();
    const { prompt, mode, userId } = reqJson; // userId passed from plugin, should match authUser.id

    if (userId !== authUser.id) {
        return new Response(JSON.stringify({ error: "Ação não autorizada para este usuário." }), { status: 403, headers: corsHeaders });
    }

    if (!prompt || mode !== 'news_generator') { // This proxy is specifically for news_generator from WP
      return new Response(JSON.stringify({ error: "Prompt e modo 'news_generator' são obrigatórios." }), { status: 400, headers: corsHeaders });
    }

    // --- Check and Deduct Credits ---
    const GENERATION_COST = 1; // Fixed cost for news generation from WP plugin
    const { data: userCreditsData, error: creditsError } = await supabaseAdmin
        .from('user_credits')
        .select('credits')
        .eq('user_id', authUser.id)
        .single();

    if (creditsError && creditsError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("[wp-gemini-proxy] Erro ao buscar créditos do usuário:", creditsError);
        return new Response(JSON.stringify({ error: "Falha ao verificar créditos." }), { status: 500, headers: corsHeaders });
    }

    let currentCredits = userCreditsData?.credits ?? 0;

    if (currentCredits !== -1 && currentCredits < GENERATION_COST) { // -1 means unlimited credits
        return new Response(JSON.stringify({ error: "Saldo de créditos insuficiente." }), { status: 403, headers: corsHeaders });
    }

    // Deduct credits before AI call
    if (currentCredits !== -1) {
        const newCredits = currentCredits - GENERATION_COST;
        const { error: updateCreditsError } = await supabaseAdmin
            .from('user_credits')
            .update({ credits: newCredits })
            .eq('user_id', authUser.id);
        if (updateCreditsError) {
            console.error("[wp-gemini-proxy] Erro ao deduzir créditos:", updateCreditsError);
            return new Response(JSON.stringify({ error: "Falha ao deduzir créditos." }), { status: 500, headers: corsHeaders });
        }
    }
    console.log(`[wp-gemini-proxy] Credits deducted for user ${authUser.id}. Remaining: ${currentCredits === -1 ? 'unlimited' : currentCredits - GENERATION_COST}`);

    // --- Call Gemini API ---
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
        console.error("[wp-gemini-proxy] ERRO CRÍTICO: GEMINI_API_KEY não definida no servidor.");
        // If credits were deducted, consider refunding them in a real-world scenario
        return new Response(JSON.stringify({ error: "Erro de configuração do servidor de IA." }), { status: 500, headers: corsHeaders });
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const modelName = 'gemini-2.5-flash';

    console.log(`[wp-gemini-proxy] Calling Gemini for news generation with prompt: "${prompt}"`);

    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
            systemInstruction: NEWS_GENERATOR_SYSTEM_PROMPT,
            tools: [{ googleSearch: {} }] // Enable Google Search for news generation
        }
    });

    let text = response.text;
    if (!text) {
        throw new Error('A API não retornou conteúdo de texto.');
    }

    // Log the AI generation (using the same log table as frontend)
    await supabaseAdmin.from('ai_logs').insert({
        usuario_id: authUser.id,
        modelo_id: modelName,
        tokens: 0, // Placeholder, real token count would require more complex parsing
        custo: GENERATION_COST, // Cost in GDN_IA's currency, not direct API cost
        data: new Date().toISOString()
    });
    
    await supabaseAdmin.from('logs').insert({
        usuario_id: authUser.id,
        acao: 'generated_content_news_from_wp',
        modulo: 'CreatorSuite',
        detalhes: { prompt, cost: GENERATION_COST },
        data: new Date().toISOString()
    });

    return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[wp-gemini-proxy] Erro interno no processamento:", err);
    // In case of error after credit deduction, consider refunding credits
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
