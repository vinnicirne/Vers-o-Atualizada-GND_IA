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
    if (!apiKey) throw new Error("GEMINI_API_KEY não encontrada.");

    const ai = new GoogleGenAI({ apiKey });
    
    // Configurações Padrão
    let systemInstruction = `Você é o GDN_IA. Contexto: ${userMemory || 'Geral'}.`;
    let config: any = {};
    let contentsParts: any[] = [{ text: prompt || "Gerar conteúdo." }];

    // --- MODO EXTRAÇÃO (LÊ PDF E PREENCHE FORMULÁRIO) ---
    // Se houver arquivo, mudamos radicalmente o sistema para não confundir a IA com nomes de modos
    if (file && mode === 'curriculum_extraction') {
        systemInstruction = `Você é um Analista de Dados Técnico focado em extração de informações de currículos.
        Sua tarefa é ler o documento e converter em um JSON estruturado.
        REGRAS:
        1. Ignore qualquer saudação ou conversa.
        2. Retorne APENAS o objeto JSON.
        3. Campos ausentes devem ser retornados como "".`;

        contentsParts = [
            { inlineData: { data: file.data, mimeType: file.mimeType } },
            { text: "Extraia todos os dados profissionais deste currículo para o formato JSON solicitado." }
        ];

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
                    summary: { type: Type.STRING },
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
                    skills: { type: Type.STRING }
                }
            }
        };
    } 
    // --- MODOS DE GERAÇÃO (SITES, CURRÍCULOS FINAIS, ETC) ---
    else if (mode === 'curriculum_generator') {
      systemInstruction = `Você é um Diretor de Design e RH de Big Tech. 
      Crie um currículo de ALTO IMPACTO visualmente impecável. 
      Use HTML com Tailwind. Preencha os IDs: personal-info-name, personal-info-location, personal-info-email, personal-info-phone, personal-info-linkedin, summary-content, experience-list, education-list, skills-list.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contentsParts },
      config: {
        ...config,
        systemInstruction,
        tools: mode === 'news_generator' ? [{ googleSearch: {} }] : []
      }
    });

    const text = response.text || "";
    const cost = TASK_COSTS[mode] || 1;

    // Deduz créditos apenas se for uma geração final (não extração)
    if (userId && mode !== 'curriculum_extraction') {
      await supabaseAdmin.rpc('deduct_credits_v2', { p_user_id: userId, p_amount: cost });
      await supabaseAdmin.from('news').insert({
        author_id: userId,
        titulo: `Elite Resume: ${text.substring(0, 30)}...`,
        conteudo: text,
        tipo: mode,
        status: 'approved'
      });
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});