
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

/**
 * Analisa um lead usando IA para determinar Score (Temperatura) e Justificativa.
 */
export const analyzeLeadQuality = async (lead: any): Promise<{ score: number, justification: string }> => {
  const prompt = `
    Atue como um Gerente de Vendas Sênior e analise este lead.
    
    DADOS DO LEAD:
    Nome: ${lead.name || 'Desconhecido'}
    Empresa: ${lead.company || 'Não informada'}
    Email: ${lead.email || 'Não informado'}
    Telefone: ${lead.phone || 'Não informado'}
    Status Atual: ${lead.status}
    Anotações Atuais: ${lead.notes || 'Nenhuma'}

    TAREFA:
    Classifique a qualidade deste lead (Score 0-100) e dê uma justificativa curta.
    
    CRITÉRIOS DE SCORE:
    - 80-100 (Quente 🔥): Decisor claro, dados completos (email corporativo, telefone), anotações indicando interesse de compra imediato.
    - 40-79 (Morno ⛅): Dados de contato válidos, mas sem detalhes da empresa ou interesse explícito.
    - 0-39 (Frio ❄️): Dados incompletos, email pessoal genérico (gmail/hotmail) sem contexto, ou anotações de desinteresse.

    FORMATO DE RESPOSTA OBRIGATÓRIO (JSON PURO):
    {
      "score": number,
      "justification": "string (max 20 palavras)"
    }
  `;

  try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
          body: {
              prompt,
              mode: 'crm_analysis', // Modo genérico, o backend usará o prompt fornecido
              generateAudio: false
          }
      });

      if (error) throw error;

      let text = data.text;
      // Extrai JSON se houver blocos de código
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
          text = jsonMatch[0];
      }

      const result = JSON.parse(text);
      return {
          score: typeof result.score === 'number' ? result.score : 50,
          justification: result.justification || "Análise processada com sucesso."
      };
  } catch (e) {
      console.error("Erro na análise IA do lead:", e);
      return { score: 50, justification: "Não foi possível realizar a análise automática." };
  }
};

/**
 * Gera uma resposta de chat ou relatório usando IA.
 */
export const generateChatResponse = async (history: string, task: 'reply' | 'report' = 'reply'): Promise<string> => {
    let prompt = '';
    
    if (task === 'reply') {
        prompt = `
        Atue como um atendente de suporte/vendas profissional, empático e eficiente.
        
        HISTÓRICO DA CONVERSA (Do mais antigo para o mais recente):
        ${history}
        
        SUA TAREFA:
        Gere uma resposta curta (max 3 frases) e direta para a última mensagem do cliente (Contact).
        Se o cliente fez uma pergunta, responda. Se for uma saudação, saúde de volta.
        Tente ajudar ou avançar a venda.
        Não use placeholders como [Nome]. Use as informações do histórico se disponíveis.
        `;
    } else {
        prompt = `
        Atue como um analista de dados.
        
        DADOS DE MÉTRICAS (JSON):
        ${history}
        
        SUA TAREFA:
        Gere um resumo executivo curto (max 1 parágrafo) destacando o desempenho do atendimento.
        Foque em insights acionáveis.
        `;
    }

    try {
        const { data, error } = await supabase.functions.invoke('generate-content', {
            body: {
                prompt,
                mode: 'chat_response', // Novo modo que o backend deve tratar como genérico
                generateAudio: false
            }
        });

        if (error) throw error;
        return data.text.trim();
    } catch (e) {
        console.error("Erro na geração de chat/relatório:", e);
        return task === 'reply' ? "Desculpe, não consegui gerar uma resposta agora." : "Erro ao gerar relatório.";
    }
};
