

import { GoogleGenAI, Modality } from "@google/genai";
import { ServiceKey } from '../types/plan.types'; // Usar ServiceKey
import { getUserPreferences, saveGenerationResult } from './memoryService';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CREATOR_SUITE_SYSTEM_PROMPT = `
Você é o GDN_IA Creator Suite, uma ferramenta multifuncional para geração de conteúdo criativo e produtivo. 

## PROCESSO DE APRENDIZADO E EVOLUÇÃO (RAG)
Você possui uma memória persistente das preferências do usuário. Antes de gerar qualquer coisa, analise a seção "Histórico de Aprendizado do Usuário" abaixo.
1. Se houver feedbacks com "✅ [PADRÃO DE SUCESSO]", tente replicar o estilo, tom ou estrutura que agradou.
2. Se houver feedbacks com "❌ [PADRÃO DE ERRO]", EVITE cometer os mesmos erros (ex: se o usuário reclamou de cores escuras, use cores claras).
3. A cada nova geração, você deve tentar superar a anterior baseada nesses feedbacks.

MODOS DISPONÍVEIS (roteie baseado na query):

1. **GDN Notícias** (default se não especificado): Siga regras antigas de notícias/preditivas com score de qualidade.

2. **Gerador de Prompts**: Para apps, sistemas, slides, docs etc. Gere prompts otimizados para IAs como Gemini/ChatGPT. Estrutura: Título do Prompt | Descrição | Prompt Pronto | Dicas de Uso | Exemplos de Output Esperado.

3. **Gerador de Landing Page**:
   Você é um expert em CRO, Web Design e Tailwind CSS. Gere SOMENTE código HTML completo, 100% responsivo.
   
   **REGRAS DE DESIGN & IMAGENS (CRÍTICO):**
   - **Imagens Reais**: NÃO use placeholders cinzas.
   - Para imagens principais (Hero, Produtos, Pessoas): Use \`https://image.pollinations.ai/prompt/<descricao_detalhada_em_ingles_photorealistic_8k>?width=<w>&height=<h>&nologo=true&private=true\`.
     *Importante*: Adicione palavras como "photorealistic", "photography", "8k", "cinematic lighting" na descrição do prompt da imagem para garantir realismo.
     Exemplo: \`https://image.pollinations.ai/prompt/professional%20dentist%20examining%20patient%20photorealistic%20photography%208k?width=800&height=600&nologo=true&private=true\`
   - Para fundos abstratos ou texturas: Use \`https://image.pollinations.ai/prompt/abstract%20<theme>%20background%20wallpaper%20minimalist?width=1920&height=1080&nologo=true\`.
   - Para imagens de contexto geral ou escritório: Use \`https://loremflickr.com/<w>/<h>/<keywords>\`.

   **REGRAS DE CÓDIGO:**
   - Use APENAS HTML + classes do Tailwind CSS (CDN já incluído).
   - Comece com <!DOCTYPE html>.
   - Garanta contraste adequado de cores e responsividade (mobile-first).
   - NÃO inclua scripts externos além do Tailwind e FontAwesome.
   - NÃO use React, JSX ou markdown (sem \`\`\`html). Retorne o código HTML puro.

4. **Gerador de Copy**: Textos persuasivos para ads, emails, posts. Foque em AIDA.

5. **Gerador de Estrutura para Arte**: Briefing Visual, Paleta de Cores, Composição.

REGRAS GERAIS:
- Para buscas: Use contexto da web se aplicável.
`;

export const generateCreativeContent = async (
    prompt: string, 
    mode: ServiceKey, // Usar ServiceKey
    userId?: string,
    generateAudio?: boolean,
    options?: { theme?: string; primaryColor?: string }
): Promise<{ text: string, audioBase64: string | null }> => {
  const modelName = 'gemini-2.5-flash';
  
  let userMemory = '';
  if (userId) {
    userMemory = await getUserPreferences(userId);
  }

  const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO (Prioridade Máxima) ===\n${userMemory || "Nenhum histórico ainda. Aprenda com este primeiro feedback."}`;

  let fullPrompt = `
    Query do usuário: ${prompt}
    Modo de Geração: ${mode}
  `;

  if (mode === 'landingpage_generator' && options) { // Usar ServiceKey
    fullPrompt += `
    
    **DIRETRIZES VISUAIS ESPECÍFICAS PARA A LANDING PAGE:**
    - **Tema/Estilo Visual**: ${options.theme || 'Moderno e Clean'}. Adapte a tipografia, espaçamentos e bordas para este estilo.
    - **Cor Primária Predominante**: ${options.primaryColor || '#10B981'}. Use esta cor (e variações geradas a partir dela com classes arbitrárias do Tailwind como text-[${options.primaryColor}] ou bg-[${options.primaryColor}]) para botões de CTA, destaques e bordas.
    `;
  }

  let config: any = {
    systemInstruction: systemPromptWithMemory
  };
  
  if (mode === 'news_generator') { // Usar ServiceKey
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

  // Limpeza específica para Landing Page
  if (mode === 'landingpage_generator') { // Usar ServiceKey
      text = text.replace(/```html/g, '').replace(/```/g, '').trim();
  }

  let audioBase64: string | null = null;
  // A geração de áudio agora é controlada pelo `generateAudio` que vem do Dashboard,
  // que por sua vez verifica se o plano tem acesso ao serviço `text_to_speech`.
  if (generateAudio && mode === 'news_generator') { // Usar ServiceKey
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