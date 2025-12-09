
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
}

export const generateCreativeContent = async (
    prompt: string, 
    mode: ServiceKey,
    userId?: string,
    generateAudio?: boolean,
    // FIX: Updated the type of 'options' to the new comprehensive interface
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

export const analyzeLeadQuality = async (lead: any): Promise<{ score: number, justification: string }> => {
    // Construct prompt
    const prompt = `Analise o seguinte lead e atribua uma pontuação de 0 a 100 com base na qualidade e completude dos dados.
    Nome: ${lead.name}
    Empresa: ${lead.company}
    Email: ${lead.email}
    Telefone: ${lead.phone}
    Cargo/Notes: ${lead.notes}
    
    Retorne APENAS um JSON no formato: { "score": number, "justification": "string curta" }`;

    try {
        // Casting 'lead_analysis' as ServiceKey as it is an internal mode handled by backend
        const { text } = await generateCreativeContent(prompt, 'lead_analysis' as ServiceKey); 
        // Parse JSON from text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { score: 50, justification: "Análise inconclusiva (Formato inválido)." };
    } catch (e) {
        console.error("Erro na análise de lead:", e);
        return { score: 0, justification: "Erro na análise." };
    }
}
