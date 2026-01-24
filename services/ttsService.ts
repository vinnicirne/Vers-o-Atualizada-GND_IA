
import { GoogleGenAI, Modality } from "@google/genai";
// Removed non-existent VoiceName import

// --- Utilitários de Processamento de Áudio ---

// Fix: Implemented decode according to @google/genai guidelines with whitespace handling.
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Fix: Implemented decodeAudioData according to @google/genai guidelines.
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Serviço Gemini TTS ---

export const geminiTTSService = {
  /**
   * Gera áudio para um único locutor utilizando o SDK Gemini.
   */
  async generateSingleSpeaker(text: string, voice: string, tone?: string): Promise<string> {
    // Fix: Initialize GoogleGenAI with apiKey property as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = tone ? `Say ${tone}: ${text}` : text;
    
    // Fix: Call generateContent with both model name and prompt directly.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    // Fix: Extração segura do áudio base64 de candidate content parts.
    const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Não foi possível obter os dados de áudio da resposta.");
    }
    return base64Audio;
  }
};
