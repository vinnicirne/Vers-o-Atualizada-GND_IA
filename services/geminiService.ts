// FIX: Import `Type` for defining the response schema.
import { GoogleGenAI, Type } from "@google/genai";
import { NewsType, NewsArticle, Source } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// FIX: Updated prompt to request plain text with a specific structure (Title on first line)
// instead of JSON, which is not reliable when using googleSearch tool.
const generateCurrentNewsPrompt = (topic: string): string => `
  Atue como um jornalista experiente. Escreva uma notícia detalhada e imparcial sobre "${topic}", focando estritamente nos eventos e desenvolvimentos das últimas 48 horas.
  
  Sua resposta DEVE seguir estritamente a seguinte estrutura:
  - A PRIMEIRA linha DEVE conter apenas o título da notícia.
  - As linhas SEGUINTES DEVEM conter o corpo da notícia, com parágrafos bem estruturados.

  NÃO inclua formatação JSON ou Markdown. Apenas texto puro.
`;

const generatePredictiveNewsPrompt = (topic: string): string => `
  Atue como um analista de tendências e especialista em futurologia. Escreva uma notícia preditiva sobre "${topic}".
  Baseie sua análise em dados atuais, tendências e possíveis desdobramentos lógicos. Deixe claro que se trata de uma análise especulativa, mas fundamentada.

  Sua resposta deve seguir a estrutura de uma análise preditiva:
  1.  **Título:** Um título que indique a natureza preditiva da notícia (ex: "O que esperar...", "Análise Preditiva:", "Cenários para...").
  2.  **Corpo da Notícia:** Desenvolva o conteúdo explorando os possíveis cenários, os fatores que influenciam o futuro do evento e as possíveis consequências.

  Formate a resposta como um objeto JSON com as chaves "title" e "content". Não adicione markdown ('''json ... ''') ao redor do JSON.
`;

export const generateNews = async (topic: string, newsType: NewsType): Promise<Omit<NewsArticle, 'id'>> => {
  const model = 'gemini-2.5-flash';
  let prompt: string;
  let config: any = {};
  let isJsonOutput = false;

  if (newsType === NewsType.CURRENT) {
    prompt = generateCurrentNewsPrompt(topic);
    config = { tools: [{ googleSearch: {} }] };
  } else {
    prompt = generatePredictiveNewsPrompt(topic);
    isJsonOutput = true;
    // FIX: Use responseMimeType and responseSchema to enforce JSON output for predictive news.
    // This is more reliable than relying on prompt instructions alone.
    config = {
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
    model: model,
    contents: prompt,
    config: config,
  });

  if (!response.text) {
    throw new Error('A API não retornou conteúdo.');
  }

  let parsedContent: { title: string; content: string; };

  // FIX: Differentiated parsing logic. Parse JSON only when expected.
  // For current news, parse the plain text response based on the structured prompt.
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