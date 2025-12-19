
import { ServiceKey } from '../types/plan.types';
import { Source } from '../types';
import { supabase } from './supabaseClient';
import { getUserPreferences, saveGenerationResult } from './memoryService';

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

export const generateCreativeContent = async (
    prompt: string, 
    mode: ServiceKey,
    userId?: string,
    generateAudio?: boolean,
    options?: GenerateContentOptions
): Promise<{ text: string, audioBase64: string | null, sources?: Source[] }> => {
  
  let userMemory = '';
  if (userId) {
    try {
        userMemory = await getUserPreferences(userId);
    } catch (e) {
        console.warn('Memory error, skipping.', e);
    }
  }

  try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
          body: { prompt, mode, userId, generateAudio, options, userMemory }
      });

      if (error) throw new Error(error.message || "Erro no servidor de IA.");
      if (data.error) throw new Error(data.error);

      if (userId && data.text) {
          saveGenerationResult(userId, data.text.substring(0, 500));
      }

      return {
          text: data.text || "",
          audioBase64: data.audioBase64 || null,
          sources: data.sources || []
      };

  } catch (err: any) {
      console.error("Génération error:", err);
      throw err;
  }
};

export const analyzeLeadQuality = async (lead: any): Promise<{ score: number, justification: string }> => {
  try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
          body: {
              prompt: `Analise este lead e retorne um JSON {score, justification}. Dados: ${JSON.stringify(lead)}`,
              mode: 'copy_generator', // Reusando modo de texto para análise
              generateAudio: false
          }
      });

      if (error) throw error;
      const result = JSON.parse(data.text.match(/\{[\s\S]*\}/)?.[0] || '{"score":50,"justification":"N/A"}');
      return { score: result.score, justification: result.justification };
  } catch (e) {
      return { score: 50, justification: "Erro na análise." };
  }
};
