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
    let systemInstruction = `Você é o GDN_IA. Modo: ${mode}. Contexto: ${userMemory || 'Geral'}.`;
    let config: any = {};
    let contents: any = [{ text: prompt }];

    // --- MODO EXTRAÇÃO (LÊ PDF E PREENCHE FORMULÁRIO) ---
    if (mode === 'curriculum_extraction' && file) {
        systemInstruction = `Você é um Analista de RH Sênior especializado em leitura de currículos.
        Sua tarefa é ler o arquivo PDF e extrair os dados para um formato JSON estrito para preencher um formulário.
        Normalize todas as informações. Se não encontrar algo, retorne string vazia.`;

        contents = [
            { inlineData: { data: file.data, mimeType: file.mimeType } },
            { text: "Extraia nome, email, telefone, linkedin, localização, lista de experiências (cargo, empresa, datas, descrição), educação e habilidades deste currículo." }
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

    // --- MODO GERAÇÃO (CRIA O DESIGN FINAL "ELITE") ---
    else if (mode === 'curriculum_generator') {
      systemInstruction = `Você é um Diretor de Design e RH de Big Tech.
      Crie um currículo de ALTO IMPACTO visualmente idêntico aos modelos profissionais da Zety/Canva.
      
      DIRETRIZES DE DESIGN:
      1. HEADER: Nome grande, negrito, centralizado ou alinhado à esquerda com uma linha divisória sólida abaixo.
      2. COLUNAS: Use um layout limpo. Seções principais (Experiência, Educação) em destaque.
      3. TEXTO: Use tipografia Sans-Serif moderna. Aplique a FÓRMULA X-Y-Z do Google em todos os bullet points.
      4. CORES: Use a cor primária fornecida (${options?.primaryColor || '#2563eb'}) para títulos de seção.
      5. FORMATO: Retorne código HTML com Tailwind CSS. IDs obrigatórios: personal-info-name, summary-content, experience-list, education-list, skills-list.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contents },
      config: {
        ...config,
        systemInstruction,
        tools: mode === 'news_generator' ? [{ googleSearch: {} }] : []
      }
    });

    const text = response.text || "";
    const cost = TASK_COSTS[mode] || 1;

    if (userId && mode !== 'curriculum_extraction') {
      await supabaseAdmin.rpc('deduct_credits_v2', { p_user_id: userId, p_amount: cost });
      await supabaseAdmin.from('news').insert({
        author_id: userId,
        titulo: `Currículo: ${text.substring(0, 30)}...`,
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