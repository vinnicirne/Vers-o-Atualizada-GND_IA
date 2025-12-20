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
                prompt: 'Extraia os dados profissionais do PDF para JSON.',
                file: {
                    data: fileBase64,
                    mimeType: mimeType
                }
            }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        const rawText = data.text || "";
        
        // REGEX ROBUSTO: Procura pelo primeiro { e o último } para isolar o JSON
        // Isso resolve o erro de quando a IA responde "Desculpe, o modo... { JSON }"
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            console.error("[GeminiService] Falha na extração. Resposta da IA:", rawText);
            throw new Error("A IA não conseguiu ler este formato de PDF corretamente.");
        }

        try {
            return JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
            console.error("[GeminiService] JSON inválido extraído:", jsonMatch[0]);
            throw new Error("Erro ao interpretar os dados extraídos.");
        }
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
      const jsonMatch = data.text.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : '{"score":50,"justification":"N/A"}');
      return { score: result.score, justification: result.justification };
  } catch (e) {
      return { score: 50, justification: "Erro na análise." };
  }
};