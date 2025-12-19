
// supabase/functions/generate-content/index.ts
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";

export interface GenerateContentOptions {
  theme?: string;
  primaryColor?: string;
  aspectRatio?: string;
  imageStyle?: string;
  platform?: string;
  voice?: string;
  template?: string;
  personalInfo?: any;
  summary?: string;
  experience?: any[];
  education?: any[];
  skills?: string[];
  projects?: any[];
  certifications?: string[];
}

const TASK_COSTS: Record<string, number> = {
  news_generator: 1,
  text_to_speech: 2,
  copy_generator: 1,
  prompt_generator: 1,
  canva_structure: 3,
  landingpage_generator: 25,
  image_generation: 5,
  social_media_poster: 5,
  curriculum_generator: 8,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TTS_CHARS = 2800;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, mode, userId, generateAudio, options, userMemory } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not found");

    const ai = new GoogleGenAI({ apiKey });

    // --- LÓGICA DE ÁUDIO EXCLUSIVA (Modo TTS Direto) ---
    if (mode === 'text_to_speech') {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt.substring(0, MAX_TTS_CHARS) }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: options?.voice || 'Kore' },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) throw new Error("IA não retornou dados de áudio.");

      if (userId) await deductCredits(supabaseAdmin, userId, TASK_COSTS.text_to_speech);

      return new Response(JSON.stringify({ text: "Áudio gerado.", audioBase64: audioData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- LÓGICA DE TEXTO / IMAGEM / SITE ---
    const response = await ai.models.generateContent({
      model: mode === 'image_generation' ? 'gemini-2.5-flash-image' : 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `Você é o GDN_IA. Modo: ${mode}. Memória: ${userMemory || 'n/a'}.`,
        tools: mode === 'news_generator' ? [{ googleSearch: {} }] : []
      }
    });

    let text = response.text || "";
    let audioBase64 = null;

    // Geração de áudio acoplada (opcional para notícias)
    if (generateAudio && mode === 'news_generator' && text) {
      try {
        const audioResp = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: text.substring(0, MAX_TTS_CHARS) }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: options?.voice || 'Kore' } },
            },
          },
        });
        audioBase64 = audioResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      } catch (e) {
        console.error("Erro TTS acoplado:", e);
      }
    }

    const cost = (TASK_COSTS[mode] || 1) + (audioBase64 ? TASK_COSTS.text_to_speech : 0);
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

    return new Response(JSON.stringify({ text, audioBase64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function deductCredits(supabaseAdmin: any, userId: string, cost: number) {
  const { data } = await supabaseAdmin.from('user_credits').select('credits').eq('user_id', userId).single();
  if (data && data.credits !== -1) {
    await supabaseAdmin.from('user_credits').update({ credits: Math.max(0, data.credits - cost) }).eq('user_id', userId);
  }
}
