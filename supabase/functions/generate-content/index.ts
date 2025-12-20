// supabase/functions/generate-content/index.ts
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI, Type } from "npm:@google/genai";

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
    const { prompt, mode, userId, options, userMemory, file } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Configuração GEMINI_API_KEY não encontrada no servidor.");

    const ai = new GoogleGenAI({ apiKey });
    let systemInstruction = `Você é o GDN_IA. Modo: ${mode}. Contexto: ${userMemory || 'Geral'}.`;
    let config: any = {};
    let contents: any = prompt;

    // --- LÓGICA DE EXTRAÇÃO DE CURRÍCULO (OCR + JSON) ---
    if (mode === 'curriculum_extraction' && file) {
        systemInstruction = `Você é um extrator de dados especializado em currículos profissionais. 
        Analise o documento fornecido e extraia as informações seguindo EXATAMENTE a estrutura JSON solicitada.
        Se não encontrar uma informação, deixe o campo como string vazia ou array vazio. 
        Normalize datas para o formato "Mês/Ano - Mês/Ano" ou "Ano - Presente".`;

        contents = {
            parts: [
                { inlineData: { data: file.data, mimeType: file.mimeType } },
                { text: "Extraia todos os dados deste currículo para o formato JSON definido no schema." }
            ]
        };

        config = {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    email: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    linkedin: { type: Type.STRING },
                    location: { type: Type.STRING },
                    experience: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                company: { type: Type.STRING },
                                dates: { type: Type.STRING },
                                description: { type: Type.STRING }
                            }
                        }
                    },
                    education: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                degree: { type: Type.STRING },
                                institution: { type: Type.STRING },
                                dates: { type: Type.STRING }
                            }
                        }
                    },
                    skills: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        };
    }

    // --- LÓGICA DE GERAÇÃO DE CURRÍCULO ---
    else if (mode === 'curriculum_generator') {
      systemInstruction = `Você é o Diretor de Recrutamento de uma Big Tech (Google/Amazon) e um Especialista em Algoritmos ATS.
      Seu objetivo é transformar dados de um usuário no currículo mais competitivo do mercado internacional.

      REGRAS DE OURO:
      1. FÓRMULA X-Y-Z DO GOOGLE: Toda conquista deve seguir: "Alcancei [X] medido por [Y] ao realizar [Z]". 
         Ex: "Aumentei a retenção de clientes em 20% liderando a implementação de um novo CRM".
      2. KEYWORD INJECTION: Se uma 'Vaga Alvo' for fornecida, identifique as 5 palavras-chave mais importantes e garanta que elas apareçam no Resumo e nas Experiências.
      3. VERBOS DE PODER: Inicie cada bullet point com verbos fortes (Liderei, Orquestrei, Maximizei).
      4. ZERO CLICHÊS: Remova termos como "apaixonado", "proativo", "focado". Prove com dados.
      5. FORMATO: Preencha o modelo HTML fornecido, preenchendo os IDs: personal-info-name, summary-content, experience-list, education-list, skills-list.
      6. RETORNO: Retorne APENAS o código HTML final.`;
    }

    console.log(`[Gen] Modo: ${mode}`);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        ...config,
        systemInstruction,
        tools: mode === 'news_generator' ? [{ googleSearch: {} }] : []
      }
    });

    const text = response.text || "";
    const cost = TASK_COSTS[mode] || 1;

    // Apenas deduz créditos e salva no histórico se não for apenas extração
    if (userId && mode !== 'curriculum_extraction') {
      await supabaseAdmin.rpc('deduct_credits_v2', { p_user_id: userId, p_amount: cost });
      
      await supabaseAdmin.from('news').insert({
        author_id: userId,
        titulo: text.substring(0, 100),
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