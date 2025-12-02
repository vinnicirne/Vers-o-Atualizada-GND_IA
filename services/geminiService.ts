
import { ServiceKey } from '../types/plan.types';
import { Source } from '../types';
import { supabase } from './supabaseClient';
import { getUserPreferences, saveGenerationResult } from './memoryService';

export const generateCreativeContent = async (
    prompt: string, 
    mode: ServiceKey,
    userId?: string,
    generateAudio?: boolean,
    options?: { theme?: string; primaryColor?: string; aspectRatio?: string; imageStyle?: string; platform?: string }
): Promise<{ text: string, audioBase64: string | null, sources?: Source[] }> => {
  
  let userMemory = '';
  if (userId) {
    try {
        userMemory = await getUserPreferences(userId);
    } catch (e) {
        console.warn('Falha ao buscar memória do usuário, prosseguindo sem.', e);
    }
  }

  try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
          body: {
              prompt,
              mode,
              userId,
              generateAudio,
              options,
              userMemory
          }
      });

      if (error) {
          console.error("Erro na Edge Function generate-content:", error);
          throw new Error(error.message || "Erro ao conectar com o serviço de IA.");
      }

      if (data.error) {
          throw new Error(data.error);
      }

      // Se userId existir, salva o resultado no histórico local (memória)
      if (userId && data.text) {
          saveGenerationResult(userId, `Modo: ${mode}\nPrompt: ${prompt}\nResultado: ${data.text.substring(0, 500)}...`);
      }

      return {
          text: data.text,
          audioBase64: data.audioBase64 || null,
          sources: data.sources || []
      };

  } catch (err: any) {
      console.error("Falha na geração de conteúdo:", err);
      throw new Error(`Falha na geração: ${err.message}`);
  }
};
