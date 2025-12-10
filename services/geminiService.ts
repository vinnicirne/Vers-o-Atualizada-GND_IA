
import { ServiceKey } from '../types/plan.types';
import { Source } from '../types';
import { supabase } from './supabaseClient';
import { getUserPreferences, saveGenerationResult } from './memoryService';

// Define a comprehensive type for all possible options for content generation
export interface GenerateContentOptions {
  theme?: string;
  primaryColor?: string;
  aspectRatio?: string;
  imageStyle?: string;
  platform?: string;
  voice?: string;
  // Curriculum options
  template?: string;
  personalInfo?: { name: string; email: string; phone: string; linkedin: string; portfolio: string };
  summary?: string;
  experience?: { title: string; company: string; dates: string; description: string }[];
  education?: { degree: string; institution: string; dates: string; description: string }[];
  skills?: string[];
  projects?: { name: string; description: string; technologies: string }[];
  certifications?: string[];
  // Chat History for Briefing
  chatHistory?: { role: string; parts: { text: string }[] }[];
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

/**
 * Envia uma mensagem para o Chat de Briefing e retorna a resposta da IA.
 */
export const sendBriefingMessage = async (
    message: string,
    chatHistory: { role: string; parts: { text: string }[] }[]
): Promise<{ text: string, isComplete: boolean, data?: any }> => {
    try {
        const { data, error } = await supabase.functions.invoke('generate-content', {
            body: {
                prompt: message,
                mode: 'briefing_chat',
                options: { chatHistory }
            }
        });

        if (error) throw new Error(error.message);
        if (data.error) throw new Error(data.error);

        return {
            text: data.text || '',
            isComplete: data.is_complete || false,
            data: data.data // Dados estruturados se completo
        };
    } catch (e: any) {
        console.error("Erro no chat de briefing:", e);
        throw new Error(e.message || "Erro de comunicação com o assistente.");
    }
};

// ... (Restante do arquivo: analyzeLeadQuality mantido)
export const analyzeLeadQuality = async (lead: any): Promise<{ score: number, justification: string }> => {
  // (Código existente mantido)
  const prompt = `
    Atue como um Gerente de Vendas Sênior e analise este lead.
    DADOS DO LEAD: Nome: ${lead.name}, Empresa: ${lead.company}, Status: ${lead.status}, Notas: ${lead.notes}.
    Classifique (0-100) e justifique. JSON: { "score": number, "justification": string }
  `;
  try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
          body: { prompt, mode: 'crm_analysis', generateAudio: false }
      });
      if (error) throw error;
      let text = data.text.match(/\{[\s\S]*\}/)?.[0] || data.text;
      const result = JSON.parse(text);
      return { score: result.score || 50, justification: result.justification || "Análise concluída." };
  } catch (e) {
      return { score: 50, justification: "Erro na análise." };
  }
};
