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

const MAX_TTS_CHARS = 3000;

// Função utilitária defensiva para extrair o áudio Base64 de qualquer parte da resposta
function extractAudioBase64(resp: any): string | null {
  if (!resp) return null;

  // Caminho mais comum esperado pela SDK atual (Nano Banana Series)
  const candidateInline = resp?.candidates?.[0]?.content?.parts;
  if (Array.isArray(candidateInline)) {
    for (const p of candidateInline) {
      if (p?.inlineData?.data) return p.inlineData.data;
      if (p?.audioData) return p.audioData;
      if (p?.text && p.type === "audio") return p.text;
    }
    if (candidateInline[0]?.inlineData?.data) return candidateInline[0].inlineData.data;
  }

  // Alguns retornos colocam audio em resp.output / resp.outputs
  const outputs = resp?.output ?? resp?.outputs ?? resp?.response;
  if (Array.isArray(outputs)) {
    for (const out of outputs) {
      if (out?.audioData) return out.audioData;
      if (out?.content) {
        const found = out.content.find((c: any) => c?.type === "audio" && (c?.audioData || c?.data));
        if (found) return found.audioData || found.data;
      }
    }
  }

  // Campos alternativos
  if (resp?.audio) return resp.audio;
  if (resp?.audioBase64) return resp.audioBase64;
  if (resp?.data) return resp.data;

  return null;
}

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
    if (!apiKey) throw new Error("Configuração GEMINI_API_KEY não encontrada no servidor.");

    const ai = new GoogleGenAI({ apiKey });

    // --- MODO TTS DIRETO (Apenas Áudio) ---
    if (mode === 'text_to_speech') {
      console.log(`[TTS] Iniciando geração de voz: ${options?.voice || 'Kore'}`);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt.substring(0, MAX_TTS_CHARS) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: options?.voice || 'Kore' },
            },
          },
        },
      });

      const audioData = extractAudioBase64(response);
      if (!audioData) {
        console.error("[TTS] Resposta bruta da IA sem áudio:", JSON.stringify(response));
        throw new Error("O servidor de IA não retornou os dados de áudio esperados.");
      }

      if (userId) await deductCredits(supabaseAdmin, userId, TASK_COSTS.text_to_speech);

      return new Response(JSON.stringify({ text: "Áudio gerado.", audioBase64: audioData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- MODO TEXTO / IMAGEM / SITE ---
    console.log(`[Gen] Modo: ${mode} | GenerateAudio: ${generateAudio}`);

    const response = await ai.models.generateContent({
      model: mode === 'image_generation' ? 'gemini-2.5-flash-image' : 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `Você é o GDN_IA. Modo: ${mode}. Contexto anterior: ${userMemory || 'nulo'}.`,
        tools: mode === 'news_generator' ? [{ googleSearch: {} }] : []
      }
    });

    const text = response.text || "";
    let audioBase64 = null;

    // Geração de áudio acoplada (Notícias narradas)
    if (generateAudio && mode === 'news_generator' && text) {
      try {
        console.log("[TTS] Gerando áudio acoplado para notícia...");
        const audioResp = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: text.substring(0, MAX_TTS_CHARS) }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: options?.voice || 'Kore' } },
            },
          },
        });
        audioBase64 = extractAudioBase64(audioResp);
        if (!audioBase64) {
          console.warn("[TTS] Nenhum áudio na resposta acoplada:", JSON.stringify(audioResp));
        }
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