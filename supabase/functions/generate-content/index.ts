
// supabase/functions/generate-content/index.ts
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// CORREÇÃO: Usar npm: para garantir o download correto do pacote oficial
import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Limite seguro de caracteres para o modelo de áudio (TTS)
const MAX_TTS_CHARS = 2800;

const CREATOR_SUITE_SYSTEM_PROMPT = `
Você é o GDN_IA Creator Suite, uma ferramenta multifuncional para geração de conteúdo criativo e produtivo. 

## PROCESSO DE APRENDIZADO E EVOLUÇÃO (RAG)
Você possui uma memória persistente das preferências do usuário. Antes de gerar qualquer coisa, analise a seção "Histórico de Aprendizado do Usuário" abaixo.
1. Se houver feedbacks com "✅ [PADRÃO DE SUCESSO]", tente replicar o estilo, tom ou estrutura que agradou.
2. Se houver feedbacks com "❌ [PADRÃO DE ERRO]", EVITE cometer os mesmos erros.
3. A cada nova geração, você deve tentar superar a anterior baseada nesses feedbacks.

## DIRETRIZES GERAIS DE SEO (PARA TEXTOS)
Ao gerar notícias, artigos ou copy:
1. **Palavra-chave Foco:** Identifique o tema principal e certifique-se de que ele apareça no **TÍTULO** e na **PRIMEIRA FRASE** do primeiro parágrafo. Isso é crucial para o SEO.
2. **Estrutura:** Use parágrafos curtos e legíveis.
3. **Imparcialidade:** Mantenha um tom jornalístico profissional para notícias.

MODOS DISPONÍVEIS (roteie baseado na query):

1. **GDN Notícias**: 
   - Escreva uma notícia completa baseada nos dados fornecidos ou em seu conhecimento.
   - **OBRIGATÓRIO:** O primeiro parágrafo deve conter a palavra-chave principal do assunto (ex: se é sobre Flamengo, a palavra "Flamengo" deve estar na primeira linha).
   - Use formatação Markdown (Negrito para ênfase).

2. **Gerador de Prompts**: Gere prompts otimizados para IAs como Gemini/ChatGPT, detalhando persona, tarefa, contexto e formato de saída.

3. **Gerador de Landing Page**:
   Você é um especialista mundial em Copywriting e Design de Conversão (CRO).
   Sua tarefa é gerar o código HTML completo de uma Landing Page de Alta Conversão.
   
   **ESTRUTURA OBRIGATÓRIA (Siga esta ordem exata):**

   1. **CABEÇALHO PODEROSO (Sem Menu):** 
      - Apenas Logo (esquerda) e Botão CTA (direita).
      - PROIBIDO: Menu de navegação (Home, Sobre, etc).
   
   2. **HERO SECTION (Primeira Dobra):**
      - **Título Impactante (H1):** Comunique o benefício principal em poucas palavras.
      - **Subtítulo (H2):** Reforce a promessa com detalhes ("Como X ajuda você a Y").
      - **Visual:** Uma imagem da Pollinations que mostre o produto/serviço em ação.
      - **CTA Principal:** Botão em destaque com cor contrastante (ex: "Quero Começar Agora").
   
   3. **PROVA SOCIAL (Logos):**
      - Uma faixa cinza clara com logos de empresas ou parceiros (use placeholders de ícones FontAwesome ou texto estilizado) para gerar autoridade.
   
   4. **BENEFÍCIOS CLAROS (Não Features):**
      - Lista em Grid ou Bullet Points.
      - Foque no GANHO do usuário: Economia de tempo, Resultados comprovados, Facilidade.
      - Use ícones do FontAwesome para cada benefício.
   
   5. **OFERTA IRRESISTÍVEL & ESCASSEZ:**
      - Crie uma seção de destaque.
      - Inclua Bônus, Desconto ou Garantia ("Risco Zero").
      - **Gatilho de Urgência:** Adicione um texto simulando contagem regressiva ou "Oferta válida até hoje".
      - **Gatilho de Escassez:** "Vagas limitadas".
   
   6. **DEPOIMENTOS (Prova Social):**
      - 3 Cards com fotos (use https://randomuser.me/api/portraits/...) e textos elogiando o resultado.
   
   7. **CAPTURA SIMPLES (Fundo da Página):**
      - Um formulário limpo solicitando APENAS: Nome e E-mail.
      - Botão de envio grande: "Garantir meu Acesso".
   
   8. **RODAPÉ (Reforço):**
      - Repita a promessa principal resumida.
      - Links mínimos (apenas Termos e Privacidade).
      - Copyright.

   **REGRAS TÉCNICAS:**
   - Use **Tailwind CSS** para todo o estilo (design limpo, responsivo, mobile-first).
   - Use cores contrastantes para os botões (Laranja, Verde ou Vermelho dependendo do tema).
   - Adicione animações simples 'hover:scale-105' nos botões.
   - Retorne APENAS o código HTML dentro do body (não precisa de <html> ou <head>, pois o editor já injeta).

4. **Site Institucional (Institutional Website)**:
   Você é um Arquiteto de Informação e Desenvolvedor Sênior.
   Gere um site institucional completo (Single Page Application com âncoras) para empresas.
   
   ESTRUTURA OBRIGATÓRIA:
   - **Header:** Logotipo (texto), Menu de navegação (Home, Sobre, Serviços, Contato).
   - **Hero Section:** Headline forte, subheadline, CTA e uma imagem de fundo impactante.
   - **Sobre Nós:** Quem somos, missão, visão.
   - **Nossos Serviços:** Grid de 3 ou 4 colunas com ícones (FontAwesome) e descrições.
   - **Diferenciais/Números:** Seção de prova social ou estatísticas.
   - **Contato:** Formulário estilizado (visual apenas) e informações de rodapé.
   - **Footer:** Links, Copyright e Redes Sociais.
   
   REGRAS TÉCNICAS:
   - Use **Tailwind CSS** para todo o estilo.
   - Design corporativo, limpo e confiável.
   - Use imagens da Pollinations.
   - Retorne APENAS o código HTML.

5. **Studio de Arte IA (Image Generation)**:
   Você é um engenheiro de prompts especializado em Stable Diffusion XL e Flux Pro.
   Sua tarefa NÃO é gerar a imagem, mas sim transformar o pedido simples do usuário em português em um PROMPT TÉCNICO EM INGLÊS altamente detalhado.
   
   Regras para o Prompt de Imagem:
   - Traduza a intenção para inglês.
   - Adicione detalhes de iluminação (ex: cinematic lighting, volumetric fog, golden hour).
   - Adicione detalhes de câmera/estilo (ex: 8k, photorealistic, wide shot, macro, oil painting, cyberpunk).
   - Adicione "magic words" de qualidade (ex: masterpiece, trending on artstation, sharp focus).
   - SAÍDA: Retorne APENAS o prompt em inglês. Nada mais. Sem "Aqui está o prompt". Apenas o texto cru.

6. **Gerador de Copy**: Textos persuasivos para ads, emails, posts. Foque em AIDA (Atenção, Interesse, Desejo, Ação).

7. **Editor Visual (Social Media)**:
   ATENÇÃO: MODO DE GERAÇÃO DE CÓDIGO ESTRITO. PROIBIDO RETORNAR TEXTO EXPLICATIVO.
   Você é um motor de renderização de templates.
   Sua tarefa: Gerar APENAS o código HTML de uma <div> container representando um post de rede social, usando Tailwind CSS para estilização.
   REGRAS: NÃO inclua tags <html>, <head> ou <body>. Apenas a DIV container principal com style="width: 1080px; height: 1080px;".

8. **Criador de Posts Sociais (Social Media Poster)**:
   Você é um **Estrategista de Autoridade, Líder de Pensamento (Thought Leader) e Copywriter Sênior**.
   Sua missão é criar conteúdo que posicione o usuário como uma REFERÊNCIA no mercado.
   
   **DIRETRIZES DE AUTORIDADE (COPY):**
   - **Tom de Voz:** Visionário, Confiante, Assertivo, Sofisticado. Evite linguagem genérica ou "vendedor barato".
   - **Estrutura:**
     1. **Hook (Gancho):** Comece com uma afirmação ousada, uma pergunta desafiadora ou uma verdade inconveniente.
     2. **Desenvolvimento:** Use "Power Words" (Revolução, Inovação, Estratégia, Essencial, Liderança, Domínio). Fale sobre o futuro, tendências e transformação.
     3. **CTA (Chamada):** Convide para a ação com autoridade (ex: "Invista no futuro", "Lidere seu setor").
   - **Estilo:** Inspire respeito e admiração. O texto deve parecer escrito por um CEO ou Especialista de Topo.
   
   **DIRETRIZES VISUAIS (IMAGE_PROMPT):**
   - O prompt da imagem deve refletir "High-End", "Editorial", "Cinematic", "Premium Quality". Evite estéticas amadoras.
   
   **Formato de Saída OBRIGATÓRIO (use estas tags exatas):**
   
   [IMAGE_PROMPT]
   (Seu prompt técnico e sofisticado em inglês aqui...)
   
   [COPY]
   (Sua legenda poderosa em português aqui...)
`;

serve(async (req) => {
  // 1. Handle Preflight Requests (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Parse Body
    let reqBody;
    try {
        reqBody = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
    }
    
    // Destructure using let so we can modify mode
    let { prompt, mode, userId, generateAudio, options, userMemory } = reqBody;
    
    // Sanitize mode string to prevent mismatches due to whitespace
    mode = mode?.trim();
    
    // 3. Get & Validate API Key
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
        throw new Error("Erro de Configuração: GEMINI_API_KEY não encontrada no servidor.");
    }

    // 4. Initialize Gemini (GoogleGenAI SDK)
    const ai = new GoogleGenAI({ apiKey });
    
    // --- TEXT TO SPEECH MODE HANDLER ---
    if (mode === 'text_to_speech') {
        // Vozes disponíveis: Puck, Charon, Fenrir (Masculinas); Kore, Aoede (Femininas).
        // Se options.voice não for fornecido, usa Kore como padrão.
        const voiceName = options?.voice || 'Kore';
        
        // CORREÇÃO CRÍTICA: Limitação de caracteres para o modelo de áudio para evitar erros
        const safePrompt = prompt.length > MAX_TTS_CHARS ? prompt.substring(0, MAX_TTS_CHARS) + "..." : prompt;

        try {
            const audioResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: safePrompt }] }],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceName },
                        },
                    },
                },
            });
            
            const audioBase64 = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
            
            if (!audioBase64) {
                throw new Error("O modelo não retornou áudio.");
            }

            return new Response(JSON.stringify({ 
                text: "Áudio gerado com sucesso.", 
                audioBase64, 
                sources: [] 
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });

        } catch (ttsError) {
            console.error("TTS Error:", ttsError);
            throw new Error(`Falha na geração de áudio: ${ttsError.message}`);
        }
    }

    // SAFETY LOCK:
    // Ensure we don't fall through to text generation if we intended to generate audio but failed the condition above somehow
    if (mode === 'text_to_speech') {
        throw new Error("Erro interno: Falha ao processar modo de áudio (Fallthrough).");
    }

    // Use the correct model for text/code
    const modelName = 'gemini-2.5-flash';

    const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda (Modo Visitante ou Novo Usuário)."}`;

    let fullPrompt = `
      Query do usuário: ${prompt}
      Modo de Geração: ${mode}
    `;

    if (mode === 'image_generation' && options) {
        fullPrompt += `
        CONTEXTO ADICIONAL PARA O PROMPT DE IMAGEM:
        - Estilo Artístico Solicitado: ${options.imageStyle || 'Photorealistic'}
        - Proporção (apenas para seu conhecimento de composição): ${options.aspectRatio || '1:1'}
        Instrução Final: Crie o prompt em inglês perfeito para gerar esta imagem nesse estilo.
        `;
    }

    if (mode === 'social_media_poster' && options) {
        fullPrompt += `
        CONTEXTO PARA POSTER DE AUTORIDADE:
        - Plataforma: ${options.platform || 'Instagram'}
        - Tema Visual: ${options.theme || 'Modern'}
        - Objetivo: Criar um post que transmita LIDERANÇA DE MERCADO e AUTORIDADE INCONTESTÁVEL.
        - Instrução Extra: O texto deve ser magnético. Use palavras fortes. Não seja morno.
        `;
    }

    if ((mode === 'landingpage_generator' || mode === 'institutional_website_generator') && options) {
        fullPrompt += `
        **DIRETRIZES VISUAIS ESPECÍFICAS:**
        - **Tema/Estilo Visual**: ${options.theme || 'Moderno e Corporativo'}.
        - **Cor Primária**: ${options.primaryColor || '#10B981'}.
        - **Instrução Extra:** Use imagens da Pollinations.ai (com prompts em inglês na URL) para deixar o site visualmente rico.
        `;
    }

    let config: any = {
        systemInstruction: systemPromptWithMemory
    };
    
    if (mode === 'news_generator') {
        config.tools = [{ googleSearch: {} }];
    }

    // 5. Call Generate Content
    const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt,
        config: config,
    });

    let text = response.text;
    
    // Grounding extraction
    let sources = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        sources = response.candidates[0].groundingMetadata.groundingChunks
            .map((chunk: any) => {
                if (chunk.web?.uri && chunk.web?.title) {
                    return { uri: chunk.web.uri, title: chunk.web.title };
                }
                return null;
            })
            .filter((s: any) => s !== null);
    }

    if (!text) {
        throw new Error('A API não retornou conteúdo de texto.');
    }

    // Cleanup Logic
    if (mode === 'landingpage_generator' || mode === 'canva_structure' || mode === 'institutional_website_generator') {
        text = text.replace(/```html/g, '').replace(/```/g, '').trim();
        
        const divStartIndex = text.indexOf('<div');
        const divEndIndex = text.lastIndexOf('div>') + 4;
        
        if (mode === 'canva_structure' && divStartIndex !== -1 && divEndIndex !== -1) {
            text = text.substring(divStartIndex, divEndIndex);
        }
    }

    // Audio Generation (Optional for News mode only)
    let audioBase64 = null;
    if (generateAudio && mode === 'news_generator') {
        try {
            // Se o usuário selecionou uma voz específica para a notícia, ela viria em options.voice
            // Mas no caso de notícias, geralmente usamos uma voz padrão de "jornalista".
            // Aqui podemos usar 'Kore' ou 'Puck' como padrão.
            const newsVoice = options?.voice || 'Kore';

            // Limitação de caracteres: Trunca o texto se for muito longo para o TTS
            const textForAudio = text.length > MAX_TTS_CHARS ? text.substring(0, MAX_TTS_CHARS) + "..." : text;

            const audioResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textForAudio }] }],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: newsVoice },
                        },
                    },
                },
            });
            
            audioBase64 = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        } catch (audioError) {
            console.error("Failed to generate audio on backend:", audioError);
            // Non-fatal error, proceed with text
        }
    }

    return new Response(JSON.stringify({ text, audioBase64, sources }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in generate-content function:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
