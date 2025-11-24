
// FIX: Import `Type` for defining the response schema.
import { GoogleGenAI, Type } from "@google/genai";
import { NewsType, NewsArticle, Source } from '../types';
import { getUserPreferences, saveGenerationResult } from './memoryService';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- KIT AUTORIDADE: SYSTEM PROMPT MESTRE ---
const AUTHORITY_SYSTEM_PROMPT = `
Você é o CRIADOR PRO — a ferramenta de IA mais lucrativa e respeitada do Brasil em 2025.

Você já ajudou mais de 31.000 empreendedores brasileiros a faturarem de 6 a 8 dígitos com lançamentos, perpétuos e negócios locais.

Regras eternas (nunca quebre):
1. Você fala com autoridade absoluta de quem já ganhou muito dinheiro e quer que o usuário ganhe também.
2. Tom: mistura de Érico Rocha + Alex Vargas + Pablo Marçal + Wendell Carvalho (direto, sem enrolação, com gírias brasileiras na medida certa e energia alta).
3. Nunca seja genérico. Sempre cite exemplos reais brasileiros, números de faturamento, lançamentos famosos, cases conhecidos.
4. Toda resposta precisa soar como se fosse escrita por um milionário digital que entende profundamente do assunto.
5. Você é 100% ensinável: quando o usuário corrigir ou preferir algo, responda exatamente:
   “Entendido, aprendi sua preferência e vou usar para sempre com você.”
6. Use emojis estratégicos, negrito, itálico e quebras de linha pra ficar fácil e prazeroso de ler.
7. Sempre termine com uma frase de impacto ou call-to-action que faça o usuário querer usar de novo agora.

Exemplos de tom perfeito (siga sempre esse nível):

Copy: “Esquece dieta maluca… em 21 dias você vai olhar no espelho e vai ver uma mulher completamente diferente, sem academia, sem remédio e sem passar fome.”

Autoridade: “Eu já ajudei 4.127 alunas a perderem 12 kg em 8 semanas com esse método exato. A próxima pode ser você.”

Notícia preditiva: “URGENTE: Novo decreto do governo pode ZERAR imposto de importação de suplementos em 2026 — especialistas preveem alta de 300% nas vendas online em 2026.”

Landing: “R$ 12.780 em 7 dias com um perpétuo de emagrecimento… sem anúncio, sem lista fria e sem aparecer.”

Agora execute o pedido do usuário com toda essa autoridade e qualidade.
`;

const generateCurrentNewsPrompt = (topic: string): string => `
  Atue como um jornalista experiente (mas com a alma do CRIADOR PRO). Escreva uma notícia detalhada e imparcial sobre "${topic}", focando estritamente nos eventos e desenvolvimentos das últimas 48 horas.
  
  Sua resposta DEVE seguir estritamente a seguinte estrutura:
  - A PRIMEIRA linha DEVE conter apenas o título da notícia.
  - As linhas SEGUINTES DEVEM conter o corpo da notícia, com parágrafos bem estruturados.

  NÃO inclua formatação JSON ou Markdown. Apenas texto puro.
`;

const generatePredictiveNewsPrompt = (topic: string): string => `
  Atue como um analista de tendências e especialista em futurologia (CRIADOR PRO). Escreva uma notícia preditiva sobre "${topic}".
  Baseie sua análise em dados atuais, tendências e possíveis desdobramentos lógicos. Deixe claro que se trata de uma análise especulativa, mas fundamentada.

  Sua resposta deve seguir a estrutura de uma análise preditiva:
  1.  **Título:** Um título que indique a natureza preditiva da notícia (ex: "O que esperar...", "Análise Preditiva:", "Cenários para...").
  2.  **Corpo da Notícia:** Desenvolva o conteúdo explorando os possíveis cenários, os fatores que influenciam o futuro do evento e as possíveis consequências.

  Formate a resposta como um objeto JSON com as chaves "title" e "content". Não adicione markdown ('''json ... ''') ao redor do JSON.
`;

export const generateNews = async (topic: string, newsType: NewsType, userId?: string): Promise<Omit<NewsArticle, 'id'>> => {
  const modelName = 'gemini-2.5-flash';
  
  // 1. Recupera a memória do usuário (se logado)
  let userMemory = '';
  if (userId) {
    userMemory = await getUserPreferences(userId);
  }

  // 2. Monta o System Prompt Combinado
  const fullSystemInstruction = `${AUTHORITY_SYSTEM_PROMPT}\n\nPREFERÊNCIAS E MEMÓRIA DESTE USUÁRIO (Leve em conta):\n${userMemory}`;

  let prompt: string;
  let config: any = {
    systemInstruction: fullSystemInstruction
  };
  let isJsonOutput = false;

  if (newsType === NewsType.CURRENT) {
    prompt = generateCurrentNewsPrompt(topic);
    config = { 
      ...config,
      tools: [{ googleSearch: {} }] 
    };
  } else {
    prompt = generatePredictiveNewsPrompt(topic);
    isJsonOutput = true;
    config = {
      ...config,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ['title', 'content'],
      }
    };
  }
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: config,
  });

  if (!response.text) {
    throw new Error('A API não retornou conteúdo.');
  }

  let parsedContent: { title: string; content: string; };

  if (isJsonOutput) {
    try {
      parsedContent = JSON.parse(response.text);
    } catch (error) {
      console.error("Failed to parse JSON from Gemini response:", response.text);
      throw new Error("A resposta da API não estava no formato JSON esperado.");
    }
  } else {
    const lines = response.text.trim().split('\n');
    const title = lines.shift() || `Notícia sobre: ${topic}`;
    const content = lines.join('\n').trim();

    if (!content) {
        throw new Error("A resposta da API para notícias atuais não retornou conteúdo no corpo da notícia.");
    }
    
    parsedContent = { title, content };
  }

  // 3. Salva o resultado na memória do usuário para contexto futuro
  if (userId) {
    // Não precisamos esperar salvar para retornar a resposta (fire and forget)
    saveGenerationResult(userId, `Tópico: ${topic}\nTítulo: ${parsedContent.title}\nConteúdo: ${parsedContent.content}`);
  }

  const sources: Source[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      uri: chunk.web.uri,
      title: chunk.web.title,
    })) || [];
  
  return {
    titulo: parsedContent.title,
    conteudo: parsedContent.content,
    sources: sources.length > 0 ? sources : undefined,
  };
};
