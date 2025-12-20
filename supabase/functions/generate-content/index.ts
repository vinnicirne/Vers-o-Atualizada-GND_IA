// supabase/functions/generate-content/index.ts
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TASK_COSTS: Record<string, number> = {
  news_generator: 1,
  copy_generator: 1,
  prompt_generator: 1,
  canva_structure: 3,
  landingpage_generator: 25,
  image_generation: 5,
  social_media_poster: 5,
  curriculum_generator: 8,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, mode, userId, options, userMemory } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Configuração GEMINI_API_KEY não encontrada no servidor.");

    const ai = new GoogleGenAI({ apiKey });

    // --- DEFINIÇÃO DE SYSTEM INSTRUCTION POR MODO ---
    let systemInstruction = `Você é o GDN_IA. Modo: ${mode}. Contexto anterior: ${userMemory || 'nulo'}.`;

    if (mode === 'curriculum_generator') {
      systemInstruction = `Aja como o Diretor de Recrutamento de uma Big Tech e Especialista em Algoritmos ATS (Applicant Tracking Systems). 
      Seu objetivo é transformar dados brutos no currículo mais competitivo do mercado internacional.

      REGRAS DE OURO:
      1. FÓRMULA X-Y-Z: Toda conquista deve seguir: "Alcancei [X] medido por [Y] ao realizar [Z]". Ex: "Aumentei a conversão em 20% (R$ 1M) liderando a reestruturação do checkout".
      2. KEYWORD INJECTION: Se uma "Job Description" for fornecida, identifique as 5 habilidades mais críticas e garanta que elas apareçam organicamente no Resumo e nas Experiências.
      3. VERBOS DE PODER: Use apenas verbos de ação fortes no início dos bullets (Liderei, Orquestrei, Maximizei, Projetei).
      4. ZERO CLICHÊS: Remova termos vazios como "apaixonado por", "focado em resultados", "proativo". Prove com dados.
      5. FORMATO: Preencha o modelo HTML fornecido. Mantenha as classes CSS intactas. Retorne APENAS o HTML.`;
    }

    console.log(`[Gen] Modo: ${mode}`);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        tools: mode === 'news_generator' ? [{ googleSearch: {} }] : []
      }
    });

    const text = response.text || "";
    const cost = TASK_COSTS[mode] || 1;

    if (userId) {
      await deductCredits(supabaseAdmin, userId, cost);
      await supabaseAdmin.from('news').insert({
        author_id: userId,
        titulo: text.split('\n')[0].substring(0, 100),
        conteudo: text,
        tipo: mode,
        status: 'approved'
      });
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[Edge Function Error]:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function deductCredits(supabaseAdmin: any, userId: string, cost: number) {
  const { data } = await supabaseAdmin.from('user_credits').select('credits').eq('user_id', userId).single();
  if (data && data.credits !== -1) {
    const newBalance = Math.max(0, data.credits - cost);
    await supabaseAdmin.from('user_credits').update({ credits: newBalance }).eq('user_id', userId);
  }
}