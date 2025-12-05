
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

3. **Gerador de Landing Page (WORLD-CLASS DESIGN)**:
   Você é um **Diretor de Arte Premiado** e um **Copywriter de Resposta Direta**.
   Sua tarefa é criar uma Landing Page que pareça ter custado $10.000.
   
   **ESTRUTURA DE ALTA CONVERSÃO (Obrigatória):**

   1. **HEADER (Minimalista & Focado):**
      - **NUNCA** use tags de navegação (<nav>, <ul>, <li>) no topo.
      - Apenas: Uma <div> com o Logo (texto estilizado, ex: font-extrabold tracking-tighter) à esquerda e um botão CTA (ex: "Falar com Consultor") à direita.

   2. **HERO SECTION (Impacto Visual):**
      - Use **GRADIENTES** sutis no fundo (ex: bg-gradient-to-r from-slate-900 to-slate-800).
      - **Headline (H1):** Grande (text-5xl ou 6xl), negrito, com palavras coloridas usando 'text-transparent bg-clip-text bg-gradient-to-r'.
      - **Subheadline:** Texto cinza claro, max-width controlado para leitura fácil.
      - **CTA Principal:** Botão grande, com sombra colorida (shadow-lg shadow-blue-500/50), bordas arredondadas (rounded-xl) e hover effect (scale-105).

   3. **PROVA SOCIAL (Autoridade):**
      - Faixa discreta "Empresas que confiam em nós". Use nomes de empresas em cinza (opacity-50) para simular logos.

   4. **BENEFÍCIOS (Não Features):**
      - Use **GRID** (grid-cols-1 md:grid-cols-3).
      - Cards com **Glassmorphism** (bg-white/5 backdrop-blur-sm border border-white/10) se o fundo for escuro.
      - Ícones grandes e coloridos (FontAwesome).
      - Foque na transformação: "Economize 20h/semana" em vez de "Automação rápida".

   5. **OFERTA & GARANTIA (Risco Zero):**
      - Seção destacada.
      - Inclua um selo visual de "Garantia de 30 Dias" (ícone check-circle).
      - Use gatilhos de **Urgência** ("Oferta por tempo limitado").

   6. **FAQ (Quebra de Objeções):**
      - Use a tag HTML nativa ${"`<details>`"} e ${"`<summary>`"} para criar acordeões interativos sem Javascript. Estilize-os para parecerem modernos.

   7. **CAPTURA FINAL (CTA):**
      - Fundo contrastante.
      - Formulário simples: Apenas E-mail.
      - Botão de ação massiva.

   8. **FOOTER:**
      - Copyright e Links de Termos/Privacidade (pequenos e discretos).

   **REGRAS TÉCNICAS (Tailwind CSS):**
   - Use \`font-sans\` (padrão moderno).
   - Espaçamento generoso (\`py-20\`, \`gap-8\`).
   - Sombras sofisticadas (\`shadow-2xl\`, \`shadow-inner\`).
   - **IMPORTANTE:** Mantenha a estrutura limpa em tags <section> para que o editor visual possa arrastar e soltar blocos facilmente depois.
   - Retorne APENAS o HTML do \`<body>\`.

4. **Site Institucional (Institutional Website)**:
   Gere um site completo (Home, Sobre, Serviços, Contato).
   - Use navegação completa no header.
   - Design corporativo, confiável e limpo (Azul, Cinza, Branco).
   - Seções bem definidas com fundos alternados (Branco / Cinza Claro).
   - **IMPORTANTE:** Use tags <section> distintas para cada parte (Hero, Sobre, Serviços) para facilitar a edição.

5. **Studio de Arte IA (Image Generation)**:
   Traduza o pedido para um PROMPT TÉCNICO EM INGLÊS.
   - Adicione: "cinematic lighting, 8k, photorealistic, octane render, masterpiece".
   - Retorne APENAS o prompt em inglês.

6. **Gerador de Copy**: Textos persuasivos (AIDA, PAS).

7. **Editor Visual (Social Media)**:
   Gere APENAS o código HTML de uma \`<div>\` (1080x1080px) com Tailwind CSS.
   - Design vibrante, tipografia grande, contraste alto.

8. **Criador de Posts Sociais (Social Media Poster)**:
   [IMAGE_PROMPT] (Inglês técnico)
   [COPY] (Português persuasivo, tom de autoridade).
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
        const voiceName = options?.voice || 'Kore';
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

    if (mode === 'text_to_speech') {
        throw new Error("Erro interno: Falha ao processar modo de áudio (Fallthrough).");
    }

    const modelName = 'gemini-2.5-flash';

    const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda (Modo Visitante ou Novo Usuário)."}`;

    let fullPrompt = `
      Query do usuário: ${prompt}
      Modo de Geração: ${mode}
    `;

    if (mode === 'image_generation' && options) {
        fullPrompt += `
        CONTEXTO ADICIONAL PARA O PROMPT DE IMAGEM:
        - Estilo Artístico: ${options.imageStyle || 'Photorealistic'}
        - Proporção: ${options.aspectRatio || '1:1'}
        `;
    }

    if (mode === 'social_media_poster' && options) {
        fullPrompt += `
        CONTEXTO PARA POSTER:
        - Plataforma: ${options.platform || 'Instagram'}
        - Tema: ${options.theme || 'Modern'}
        `;
    }

    if ((mode === 'landingpage_generator' || mode === 'institutional_website_generator') && options) {
        fullPrompt += `
        **DIRETRIZES VISUAIS ESPECÍFICAS:**
        - **Tema/Estilo Visual**: ${options.theme || 'Moderno'}.
        - **Cor Primária**: ${options.primaryColor || '#10B981'}.
        - **IMPORTANTE:** O design deve ser IMPRESSIONANTE. Use sombras, gradientes, bordas arredondadas e bom espaçamento.
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
            const newsVoice = options?.voice || 'Kore';
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
