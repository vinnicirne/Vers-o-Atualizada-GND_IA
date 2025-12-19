
// supabase/functions/generate-content/index.ts
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI, Modality } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Helper robusto para extração de áudio base64
function extractAudioData(response: any): string | null {
  try {
    // Caminho padrão candidates[0].content.parts[0].inlineData.data
    const data = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
    if (data) return data;

    // Fallback: busca profunda no primeiro candidato
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) return part.inlineData.data;
    }
  } catch (e) {
    console.error("[TTS] Erro na extração do áudio:", e);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prompt, mode, userId, generateAudio, options, userMemory } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not found in environment");

    const ai = new GoogleGenAI({ apiKey });

    // 1. MODO TTS DIRETO
    if (mode === 'text_to_speech') {
      console.log("[TTS] Gerando áudio direto...");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt.substring(0, 3000) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: options?.voice || 'Kore' } },
          },
        },
      });

      const audioBase64 = extractAudioData(response);
      if (!audioBase64) throw new Error("A IA não gerou dados de áudio válidos.");

      if (userId) await deductCredits(supabaseAdmin, userId, TASK_COSTS.text_to_speech);

      return new Response(JSON.stringify({ text: "Áudio gerado com sucesso.", audioBase64 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. GERAÇÃO DE CONTEÚDO (Texto/Imagem/Site)
    console.log(`[Gen] Gerando conteúdo modo: ${mode}`);
    const genResponse = await ai.models.generateContent({
      model: mode === 'image_generation' ? 'gemini-2.5-flash-image' : 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `Você é o GDN_IA. Modo: ${mode}. Memória Recente: ${userMemory || 'nula'}.`,
        tools: mode === 'news_generator' ? [{ googleSearch: {} }] : []
      }
    });

    const text = genResponse.text || "";
    let audioBase64 = null;

    // 3. TTS ACOPLADO (Para notícias)
    if (generateAudio && mode === 'news_generator' && text) {
      console.log("[TTS] Gerando áudio acoplado para notícia...");
      try {
        const audioResp = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: text.substring(0, 3000) }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: options?.voice || 'Kore' } },
            },
          },
        });
        audioBase64 = extractAudioData(audioResp);
      } catch (e) {
        console.error("[TTS Acoplado] Falhou:", e);
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
