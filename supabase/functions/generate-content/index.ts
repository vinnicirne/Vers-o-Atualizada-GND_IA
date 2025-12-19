
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
  tone?: string;
  speakers?: { name: string; voice: string }[];
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
    const reqBody = await req.json();
    let { prompt, mode, userId, generateAudio, options: rawOptions, userMemory } = reqBody;
    const options: GenerateContentOptions = rawOptions || {};
    mode = mode?.trim();
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- CÁLCULO DE CUSTO ---
    let totalCost = 0;
    if (userId) {
        const baseCost = TASK_COSTS[mode] || 1; 
        // Se for modo áudio ou solicitou áudio extra em outra ferramenta
        const audioCost = (generateAudio || mode === 'text_to_speech') ? (TASK_COSTS['text_to_speech'] || 2) : 0;
        totalCost = baseCost + audioCost;

        const { data: creditData } = await supabaseAdmin
            .from('user_credits')
            .select('credits')
            .eq('user_id', userId)
            .single();

        const currentCredits = creditData?.credits ?? 0;
        if (currentCredits !== -1 && currentCredits < totalCost) {
            throw new Error(`Saldo insuficiente. Necessário: ${totalCost}, Disponível: ${currentCredits}.`);
        }
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    
    // --- LÓGICA DE TEXT-TO-SPEECH (TTS) ---
    if (mode === 'text_to_speech') {
        const voiceName = options?.voice || 'Kore';
        const tone = options?.tone;
        
        // Padrão solicitado: "Say [tone]: [text]"
        const ttsPrompt = tone ? `Say ${tone}: ${prompt}` : prompt;
        const safePrompt = ttsPrompt.length > MAX_TTS_CHARS ? ttsPrompt.substring(0, MAX_TTS_CHARS) : ttsPrompt;

        try {
            const config: any = {
                responseModalities: ["AUDIO"],
                speechConfig: {}
            };

            // Suporte a múltiplos falantes (se fornecido)
            if (options.speakers && options.speakers.length > 1) {
                config.speechConfig.multiSpeakerVoiceConfig = {
                    speakerVoiceConfigs: options.speakers.map(s => ({
                        speaker: s.name,
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } }
                    }))
                };
            } else {
                config.speechConfig.voiceConfig = {
                    prebuiltVoiceConfig: { voiceName: voiceName }
                };
            }

            const audioResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: safePrompt }] }],
                config: config,
            });
            
            const audioBase64 = audioResponse.candidates?.[0]?.content?.parts[0]?.inlineData?.data || null;
            
            if (!audioBase64) throw new Error("O modelo TTS não retornou dados de áudio.");

            // Descontar créditos após sucesso
            if (userId && totalCost > 0) await deductCredits(supabaseAdmin, userId, totalCost);

            return new Response(JSON.stringify({ text: "Áudio processado.", audioBase64, sources: [] }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        } catch (e: any) {
            throw new Error(`Falha no processamento de áudio: ${e.message}`);
        }
    }

    // --- GERAÇÃO DE CONTEÚDO PADRÃO ---
    const modelName = 'gemini-2.5-flash';
    const config: any = {
        systemInstruction: `Você é o GDN_IA. Memória do usuário: ${userMemory || 'Vazia'}.`
    };
    
    if (mode === 'news_generator') config.tools = [{ googleSearch: {} }];

    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt, 
        config: config,
    });

    let text = response.text;
    let audioBase64 = null;

    // Se o usuário pediu áudio junto com o conteúdo gerado
    if (generateAudio) {
        try {
            const newsVoice = options?.voice || 'Kore';
            const audioRes = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: text.substring(0, MAX_TTS_CHARS) }] }],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: newsVoice } } },
                },
            });
            audioBase64 = audioRes.candidates?.[0]?.content?.parts[0]?.inlineData?.data || null;
        } catch (e) { console.warn("Erro ao gerar áudio adicional:", e); }
    }

    // Descontar créditos
    if (userId && totalCost > 0) await deductCredits(supabaseAdmin, userId, totalCost);

    return new Response(JSON.stringify({ text, audioBase64, sources: [] }), {
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
    if (data?.credits !== -1) {
        await supabaseAdmin.from('user_credits').update({ credits: Math.max(0, (data?.credits || 0) - cost) }).eq('user_id', userId);
    }
}
