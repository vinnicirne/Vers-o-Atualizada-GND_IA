
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
}

/**
 * Serviço unificado para geração de conteúdo via Gemini.
 * Todas as requisições passam pela Edge Function para controle de créditos e segurança.
 */
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
        console.warn('[Memory] Falha ao carregar preferências, seguindo sem contexto.', e);
    }
  }

  try {
      // Invocação da Edge Function 'generate-content'
      const { data, error } = await supabase.functions.invoke('generate-content', {
          body: { prompt, mode, userId, generateAudio, options, userMemory }
      });

      if (error) {
          console.error("[Supabase Function Error]:", error);
          throw new Error(error.message || "Erro na comunicação com o servidor de IA.");
      }

      if (data.error) throw new Error(data.error);

      // Persistência na memória para contexto futuro
      if (userId && data.text) {
          saveGenerationResult(userId, data.text.substring(0, 500));
      }

      return {
          text: data.text || "",
          audioBase64: data.audioBase64 || null,
          sources: data.sources || []
      };

  } catch (err: any) {
      console.error("[GeminiService] Erro fatal:", err);
      throw err;
  }
};

export const analyzeLeadQuality = async (lead: any): Promise<{ score: number, justification: string }> => {
  try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
          body: {
              prompt: `Analise o perfil deste lead: ${JSON.stringify(lead)}. Retorne um JSON com score (0-100) e uma justificativa curta.`,
              mode: 'copy_generator', // Reuso do motor de texto
              generateAudio: false
          }
      });

      if (error) throw error;
      const result = JSON.parse(data.text.match(/\{[\s\S]*\}/)?.[0] || '{"score":50,"justification":"Não foi possível analisar."}');
      return { score: result.score, justification: result.justification };
  } catch (e) {
      return { score: 50, justification: "Erro na análise automática." };
  }
};
