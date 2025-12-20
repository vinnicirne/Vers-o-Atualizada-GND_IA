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
  template?: string;
  personalInfo?: any;
  experience?: any[];
  education?: any[];
  skills?: string[];
  targetJob?: string;
}

export const generateCreativeContent = async (
    prompt: string, 
    mode: ServiceKey,
    userId?: string,
    options?: GenerateContentOptions
): Promise<{ text: string, sources?: Source[] }> => {
  
  let userMemory = '';
  if (userId) {
    try {
        userMemory = await getUserPreferences(userId);
    } catch (e) {
        console.warn('[Memory] Falha ao carregar preferências.', e);
    }
  }

  try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
          body: { prompt, mode, userId, options, userMemory }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      if (userId && data.text) {
          saveGenerationResult(userId, data.text.substring(0, 500));
      }

      return {
          text: data.text || "",
          sources: data.sources || []
      };

  } catch (err: any) {
      console.error("[GeminiService] Erro:", err);
      throw err;
  }
};

/**
 * Extrai dados estruturados de um PDF para preencher o formulário
 */
export const extractCurriculumData = async (fileBase64: string, mimeType: string): Promise<any> => {
    try {
        const { data, error } = await supabase.functions.invoke('generate-content', {
            body: { 
                mode: 'curriculum_extraction',
                file: {
                    data: fileBase64,
                    mimeType: mimeType
                }
            }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        // O Gemini retorna o JSON como string no campo text
        return JSON.parse(data.text);
    } catch (err: any) {
        console.error("[GeminiService] Erro na extração:", err);
        throw err;
    }
};

export const analyzeLeadQuality = async (lead: any): Promise<{ score: number, justification: string }> => {
  try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
          body: {
              prompt: `Analise o perfil deste lead: ${JSON.stringify(lead)}. Retorne um JSON com score (0-100) e uma justificativa curta.`,
              mode: 'copy_generator'
          }
      });

      if (error) throw error;
      const result = JSON.parse(data.text.match(/\{[\s\S]*\}/)?.[0] || '{"score":50,"justification":"N/A"}');
      return { score: result.score, justification: result.justification };
  } catch (e) {
      return { score: 50, justification: "Erro na análise." };
  }
};