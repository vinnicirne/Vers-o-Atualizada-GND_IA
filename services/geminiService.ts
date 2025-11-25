
import { GoogleGenAI, Modality } from "@google/genai";
import { CreatorSuiteMode } from '../types';
import { getUserPreferences, saveGenerationResult } from './memoryService';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CREATOR_SUITE_SYSTEM_PROMPT = `
Você é o GDN_IA Creator Suite, uma ferramenta multifuncional para geração de conteúdo criativo e produtivo. Detecte o modo da query do usuário e responda APENAS no modo correto. Sempre em português brasileiro, estruturado e acionável. Use buscas reais se relevante (ex: para landing pages, busque templates atuais).

MODOS DISPONÍVEIS (roteie baseado na query):

1. **GDN Notícias** (default se não especificado): Siga regras antigas de notícias/preditivas com score de qualidade.

2. **Gerador de Prompts**: Para apps, sistemas, slides, docs etc. Gere prompts otimizados para IAs como Gemini/ChatGPT. Estrutura: Título do Prompt | Descrição | Prompt Pronto | Dicas de Uso | Exemplos de Output Esperado.

3. **Gerador de Landing Page Poderosa**: GERE UM ARQUIVO HTML COMPLETO E ÚNICO. Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>). Crie uma página de vendas visualmente atraente e responsiva (mobile-first). Inclua seções: Hero (com título forte e CTA), Features/Benefícios (com ícones), Prova Social (depoimentos), Oferta (detalhes do produto/preço) e um Footer simples. O código deve ser limpo e pronto para ser salvo em um arquivo .html e funcionar. A resposta DEVE ser apenas o código HTML, começando com <!DOCTYPE html>.

4. **Gerador de Copy**: Textos persuasivos para ads, emails, posts. Foque em AIDA (Atenção, Interesse, Desejo, Ação). Estrutura: Título da Copy | Versões (Curta/Média/Longa) | Variações A/B | Métricas de Engajamento Estimadas.

5. **Gerador de Estrutura para Arte**: Para Canva, Corel, Photoshop. Descreva layers, composições, cores, tipografia. Estrutura: Briefing Visual | Passos de Criação | Paleta de Cores (hex) | Assets Sugeridos | Export Tips.

REGRAS GERAIS PARA TODOS OS MODOS:

- Para buscas: Use contexto da web se aplicável (ex: tendências 2025 para landing pages).

- Estrutura de Resposta (Exceto Landing Page): **Modo Detectado:** [Nome] | **Output Principal:** [Conteúdo] | **Dicas Extras:** [Lista].

Query do usuário: {prompt}

Gere no modo correto!
`;

export const generateCreativeContent = async (
    prompt: string, 
    mode: CreatorSuiteMode, 
    userId?: string,
    generateAudio?: boolean
): Promise<{ text: string, audioBase64: string | null }> => {
  const modelName = 'gemini-2.5-flash';
  
  let userMemory = '';
  if (userId) {
    userMemory = await getUserPreferences(userId);
  }

  const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\nPreferências e feedbacks anteriores deste usuário (use para personalizar a resposta):\n${userMemory}`;

  const fullPrompt = `
    Query do usuário: ${prompt}
    Modo de Geração: ${mode}
  `;

  let config: any = {
    systemInstruction: systemPromptWithMemory
  };
  
  if (mode === 'news') {
     config.tools = [{ googleSearch: {} }];
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: fullPrompt,
    config: config,
  });

  const text = response.text;

  if (!text) {
    throw new Error('A API não retornou conteúdo de texto.');
  }

  let audioBase64: string | null = null;
  // A geração de áudio só faz sentido para o modo de notícias
  if (generateAudio && mode === 'news') {
    try {
        console.log("Generating audio for news content...");
        const audioResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }], // Gera áudio do texto completo retornado
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        
        const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            audioBase64 = base64Audio;
            console.log("Audio generated successfully.");
        } else {
            console.warn("TTS API call succeeded but no audio data was returned.");
        }
    } catch (audioError) {
        console.error("Failed to generate audio:", audioError);
    }
  }

  if (userId) {
    saveGenerationResult(userId, `Modo: ${mode}\nPrompt: ${prompt}\nResultado: ${text}`);
  }
  
  return { text, audioBase64 };
};
