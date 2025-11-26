
import { GoogleGenAI, Modality } from "@google/genai";
import { ServiceKey } from '../types/plan.types';
import { getUserPreferences, saveGenerationResult } from './memoryService';

const CREATOR_SUITE_SYSTEM_PROMPT = `
Você é o GDN_IA Creator Suite, uma ferramenta multifuncional para geração de conteúdo criativo e produtivo. 

## PROCESSO DE APRENDIZADO E EVOLUÇÃO (RAG)
Você possui uma memória persistente das preferências do usuário. Antes de gerar qualquer coisa, analise a seção "Histórico de Aprendizado do Usuário" abaixo.
1. Se houver feedbacks com "✅ [PADRÃO DE SUCESSO]", tente replicar o estilo, tom ou estrutura que agradou.
2. Se houver feedbacks com "❌ [PADRÃO DE ERRO]", EVITE cometer os mesmos erros.
3. A cada nova geração, você deve tentar superar a anterior baseada nesses feedbacks.

MODOS DISPONÍVEIS (roteie baseado na query):

1. **GDN Notícias**: Siga regras antigas de notícias/preditivas com score de qualidade. Use ferramentas de busca se necessário.

2. **Gerador de Prompts**: Gere prompts otimizados para IAs como Gemini/ChatGPT, detalhando persona, tarefa, contexto e formato de saída.

3. **Gerador de Landing Page**:
   Você é um expert em CRO, Web Design e Tailwind CSS. Gere SOMENTE código HTML completo, 100% responsivo. Use imagens da Pollinations. Não inclua Markdown, apenas o código.

4. **Studio de Arte IA (Image Generation)**:
   Você é um engenheiro de prompts especializado em Stable Diffusion XL e Flux Pro.
   Sua tarefa NÃO é gerar a imagem, mas sim transformar o pedido simples do usuário em português em um PROMPT TÉCNICO EM INGLÊS altamente detalhado.
   
   Regras para o Prompt de Imagem:
   - Traduza a intenção para inglês.
   - Adicione detalhes de iluminação (ex: cinematic lighting, volumetric fog, golden hour).
   - Adicione detalhes de câmera/estilo (ex: 8k, photorealistic, wide shot, macro, oil painting, cyberpunk).
   - Adicione "magic words" de qualidade (ex: masterpiece, trending on artstation, sharp focus).
   - SAÍDA: Retorne APENAS o prompt em inglês. Nada mais. Sem "Aqui está o prompt". Apenas o texto cru.

5. **Gerador de Copy**: Textos persuasivos para ads, emails, posts. Foque em AIDA (Atenção, Interesse, Desejo, Ação).

6. **Editor Visual (Social Media)**:
   ATENÇÃO: MODO DE GERAÇÃO DE CÓDIGO ESTRITO. PROIBIDO RETORNAR TEXTO EXPLICATIVO.
   Você é um motor de renderização de templates.
   
   Sua tarefa: Gerar APENAS o código HTML de uma <div> container representando um post de rede social, usando Tailwind CSS para estilização.
   
   TEMPLATE OBRIGATÓRIO (Preencha o conteúdo dentro da div):
   <div style="width: 1080px; height: 1080px; position: relative; overflow: hidden; background-color: #ffffff;" class="flex flex-col relative shadow-2xl">
      <!-- COLOQUE AQUI O DESIGN: Imagens de fundo, textos posicionados, badges, etc -->
      <!-- Use imagens de placeholder: <img src="https://placehold.co/1080x1080" /> -->
      <!-- Use classes Tailwind para tipografia, cores e layout -->
   </div>
   
   REGRAS:
   1. NÃO inclua tags <html>, <head> ou <body>. Apenas a DIV container principal.
   2. O tamanho DEVE ser fixo via style="width: 1080px; height: 1080px;".
   3. NÃO escreva nada antes ou depois do código HTML.
   4. O design deve ser profissional, colorido e visualmente rico.
`;

export const generateCreativeContent = async (
    prompt: string, 
    mode: ServiceKey,
    userId?: string,
    generateAudio?: boolean,
    options?: { theme?: string; primaryColor?: string; aspectRatio?: string; imageStyle?: string }
): Promise<{ text: string, audioBase64: string | null }> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-2.5-flash';
  
  let userMemory = '';
  if (userId) {
    userMemory = await getUserPreferences(userId);
  }

  const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda."}`;

  let fullPrompt = `
    Query do usuário: ${prompt}
    Modo de Geração: ${mode}
  `;

  // Customização do Prompt para Imagens
  if (mode === 'image_generation' && options) {
      fullPrompt += `
      
      CONTEXTO ADICIONAL PARA O PROMPT DE IMAGEM:
      - Estilo Artístico Solicitado: ${options.imageStyle || 'Photorealistic'}
      - Proporção (apenas para seu conhecimento de composição): ${options.aspectRatio || '1:1'}
      
      Instrução Final: Crie o prompt em inglês perfeito para gerar esta imagem nesse estilo.
      `;
  }

  if (mode === 'landingpage_generator' && options) {
    fullPrompt += `
    **DIRETRIZES VISUAIS ESPECÍFICAS PARA A LANDING PAGE:**
    - **Tema/Estilo Visual**: ${options.theme || 'Moderno e Clean'}.
    - **Cor Primária**: ${options.primaryColor || '#10B981'}.
    `;
  }

  let config: any = {
    systemInstruction: systemPromptWithMemory
  };
  
  if (mode === 'news_generator') {
     config.tools = [{ googleSearch: {} }];
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: fullPrompt,
    config: config,
  });

  let text = response.text;

  if (!text) {
    throw new Error('A API não retornou conteúdo de texto.');
  }

  // Limpeza de Markdown para modos que geram código HTML
  if (mode === 'landingpage_generator' || mode === 'canva_structure') {
      text = text.replace(/```html/g, '').replace(/```/g, '').trim();
      
      // Limpeza de emergência: se o modelo insistir em escrever texto antes do <div
      const divStartIndex = text.indexOf('<div');
      const divEndIndex = text.lastIndexOf('div>') + 4;
      
      if (mode === 'canva_structure' && divStartIndex !== -1 && divEndIndex !== -1) {
          text = text.substring(divStartIndex, divEndIndex);
      }
  }

  // Se for geração de imagem, o 'text' agora contém o prompt em inglês.
  // O frontend vai usar esse texto para chamar a API de imagem.

  let audioBase64: string | null = null;
  
  if (generateAudio && mode === 'news_generator') {
    try {
        const audioResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        
        audioBase64 = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (audioError) {
        console.error("Failed to generate audio:", audioError);
    }
  }

  if (userId) {
    saveGenerationResult(userId, `Modo: ${mode}\nPrompt: ${prompt}\nResultado: ${text.substring(0, 500)}...`);
  }
  
  return { text, audioBase64 };
};
