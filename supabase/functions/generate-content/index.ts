
// supabase/functions/generate-content/index.ts
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// CORREÇÃO: Usar npm: para garantir o download correto do pacote oficial
import { GoogleGenAI } from "npm:@google/genai";
// Importar templates de currículo (necessário para o backend)
import { CURRICULUM_TEMPLATES } from "../../../components/resume/templates.ts"; // Ajustar caminho conforme a estrutura real
// Import the GenerateContentOptions type
// @ts-ignore
import type { GenerateContentOptions } from "../../../services/geminiService.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Limite seguro de caracteres para o modelo de áudio (TTS)
const MAX_TTS_CHARS = 2800;

const CREATOR_SUITE_SYSTEM_PROMPT = `
Você é o GDN_IA Creator Suite, uma ferramenta multifuncional para geração de conteúdo criativo e produtiva. 

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

3. **Criador de Sites (Web)**:
   Você é um **Diretor de Arte Premiado** e um **Copywriter de Resposta Direta**.
   Sua tarefa é criar um site responsivo e profissional usando HTML e Tailwind CSS.

   **LÓGICA INTELIGENTE (Decida o tipo de site com base no prompt):**
   - **SE** o prompt do usuário solicitar um "site institucional", "site corporativo", "site para empresa", ou mencionar múltiplas seções como "sobre nós", "serviços", "contato", etc., então crie uma estrutura de **Site Institucional** com:
     - **HEADER:** Inclua um menu de navegação responsivo (pelo menos 3 links).
     - Múltiplas **SECTIONS** para Home, Sobre, Serviços, Contato.
     - Design limpo, profissional e elegante.
   - **CASO CONTRÁRIO (se o foco é produto/venda)**, crie uma **Landing Page de Alta Conversão** com:
     - **HEADER (Minimalista & Focado):**
       - **NUNCA** use tags de navegação (<nav>, <ul>, <li>) no topo.
       - Apenas: Uma <div> com o Logo (texto estilizado, ex: font-extrabold tracking-tighter) à esquerda e um botão CTA (ex: "Falar com Consultor") à direita.
     - **HERO SECTION (Impacto Visual):** Headline grande com gradientes, CTA principal.
     - **PROVA SOCIAL (Autoridade):** Faixa discreta "Empresas que confiam em nós".
     - **BENEFÍCIOS (Não Features):** Use GRID, cards com Glassmorphism.
     - **OFERTA & GARANTIA (Risco Zero):** Seção destacada com selo visual.
     - **FAQ (Quebra de Objeções):** Use tags HTML nativas <details> e <summary>.
     - **CAPTURA FINAL (CTA):** Formulário simples (apenas E-mail).

   **REGRAS TÉCNICAS GERAIS (HTML & Tailwind CSS):**
   - Use `font-sans` (padrão moderno).
   - Espaçamento generoso (`py-20`, `gap-8`).
   - Sombras sofisticadas (`shadow-2xl`, `shadow-inner`).
   - Use `<section>` tags distintas para cada bloco de conteúdo para facilitar a edição visual.
   - Retorne APENAS o HTML do `<body>`.

4. **Studio de Arte IA (Image Generation)**:
   Traduza o pedido para um PROMPT TÉCNICO EM INGLÊS.
   - Adicione: "cinematic lighting, 8k, photorealistic, octane render, masterpiece".
   - Retorne APENAS o prompt em inglês.

5. **Gerador de Copy**: Textos persuasivos (AIDA, PAS).

6. **Editor Visual (Social Media)**:
   Gere APENAS o código HTML de uma `<div>` (1080x1080px) com Tailwind CSS.
   - Design vibrante, tipografia grande, contraste alto.

7. **Criador de Currículos (IA)**:
   Você é um **Especialista em Otimização de Currículos (ATS - Applicant Tracking Systems)** e **Recrutamento**.
   Sua tarefa é gerar um currículo profissional e persuasivo, no formato HTML usando Tailwind CSS, com base nas informações do usuário e no template escolhido.

   **OBJETIVO PRINCIPAL:** Otimizar o currículo para passar em sistemas ATS e impressionar recrutadores, focando em:
   - **Palavras-chave:** Integre palavras-chave relevantes para a área e objetivo do usuário de forma natural.
   - **Verbos de Ação:** Comece descrições de experiência e projetos com verbos de ação fortes.
   - **Resultados Quantificáveis:** Onde possível, transforme responsabilidades em conquistas com dados (números, porcentagens, prazos).
   - **Clareza e Concision:** Remova jargões desnecessários e frases passivas.
   - **Relevância:** Destaque as informações mais importantes para o objetivo de carreira.
   - **Tom de Voz:** Profissional, confiante e orientado a resultados.

   **REGRAS ESTRUTURAIS HTML (Tailwind CSS):**
   - Utilize a estrutura HTML fornecida pelo template.
   - Não inclua tags `<html>`, `<head>` ou `<body>` externas. Apenas o conteúdo interno.
   - Mantenha a semântica HTML (h1, h2, p, ul, li).
   - Use classes Tailwind CSS para todo o estilo.
   - Garanta que o currículo seja responsivo para diferentes tamanhos de tela.

   **INSTRUÇÕES DE PREENCHIMENTO:**
   - Adapte o `summary` (resumo profissional) com base no `prompt` do usuário (se fornecido) e nas informações de experiência.
   - Para `experience` e `education`, reescreva as `descriptions` para serem concisas, com verbos de ação e resultados quantificáveis. Se a descrição for genérica, melhore-a.
   - Para `skills`, agrupe ou formate de maneira legível (ex: "Hard Skills:", "Soft Skills:").
   - **NÃO use Markdown**. Apenas HTML puro com classes Tailwind.
   - **NÃO inclua nenhuma imagem de perfil/foto** a menos que explicitamente solicitado pelo usuário, para evitar vieses em processos de seleção.

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
    let { prompt, mode, userId, generateAudio, options: rawOptions, userMemory } = reqBody;
    // FIX: Explicitly cast rawOptions to the comprehensive type
    const options: GenerateContentOptions = rawOptions || {};

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

        } catch (ttsError: any) {
            console.error("TTS Error:", ttsError);
            throw new Error(`Falha na geração de áudio: ${ttsError.message}`);
        }
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

    if (mode === 'landingpage_generator' && options) { // Agora unificado
        fullPrompt += `
        **DIRETRIZES VISUAIS ESPECÍFICAS:**
        - **Tema/Estilo Visual**: ${options.theme || 'Moderno'}.
        - **Cor Primária**: ${options.primaryColor || '#10B981'}.
        - **IMPORTANTE:** O design deve ser IMPRESSIONANTE. Use sombras, gradientes, bordas arredondadas e bom espaçamento.
        `;
    }

    // --- CURRICULUM GENERATOR LOGIC ---
    if (mode === 'curriculum_generator' && options) {
        const templateKey = options.template as keyof typeof CURRICULUM_TEMPLATES;
        const selectedTemplate = CURRICULUM_TEMPLATES[templateKey];

        if (!selectedTemplate) {
            throw new Error(`Template de currículo '${templateKey}' não encontrado.`);
        }

        // Prepare data for Handlebars-like replacement (simplified for direct insertion by LLM)
        // The LLM will "fill in" these placeholders intelligently based on the structured data and prompt.
        // FIX: Corrected variable access for curriculum data within the prompt and added optional chaining.
        const curriculumDataPrompt = `
        Por favor, gere um currículo HTML com Tailwind CSS usando o template a seguir. Preencha os placeholders com as informações fornecidas e otimize cada seção conforme as diretrizes de ATS (palavras-chave, verbos de ação, resultados quantificáveis).

        **Template de Currículo Escolhido:**
        \`\`\`html
        ${selectedTemplate}
        \`\`\`

        **Informações do Usuário:**
        - **Objetivo de Carreira (Prompt Geral):** ${prompt || 'Não fornecido, crie um objetivo padrão.'}
        - **Dados Pessoais:**
            Nome: ${options.personalInfo?.name || ''}
            Email: ${options.personalInfo?.email || ''}
            Telefone: ${options.personalInfo?.phone || ''}
            LinkedIn: ${options.personalInfo?.linkedin || ''}
            Portfólio: ${options.personalInfo?.portfolio || ''}
        - **Resumo Profissional:** ${options.summary || 'A IA deve criar um resumo persuasivo.'}
        - **Experiência Profissional:**
            ${options.experience?.map((exp: any) => `  - Cargo: ${exp.title}, Empresa: ${exp.company}, Período: ${exp.dates}, Descrição: ${exp.description}`).join('\n') || 'Nenhuma experiência fornecida.'}
        - **Formação Acadêmica:**
            ${options.education?.map((edu: any) => `  - Grau: ${edu.degree}, Instituição: ${edu.institution}, Período: ${edu.dates}, Descrição: ${edu.description}`).join('\n') || 'Nenhuma formação fornecida.'}
        - **Habilidades:** ${options.skills?.join(', ') || 'Não fornecido, a IA pode sugerir habilidades comuns.'}
        - **Projetos:**
            ${options.projects?.map((proj: any) => `  - Nome: ${proj.name}, Tecnologias: ${proj.technologies}, Descrição: ${proj.description}`).join('\n') || 'Nenhum projeto fornecido.'}
        - **Certificações:** ${options.certifications?.join(', ') || 'Nenhuma.'}

        **Lembre-se das Regras do Modo "Criador de Currículos (IA)" para ATS e HTML puro.**
        `;
        fullPrompt = curriculumDataPrompt; // Override fullPrompt for curriculum mode
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
        // FIX: The `contents` parameter accepts a string directly. Wrapping in `parts` for robustness.
        contents: { parts: [{ text: fullPrompt }] }, 
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
    if (mode === 'landingpage_generator' || mode === 'canva_structure' || mode === 'curriculum_generator') { 
        text = text.replace(/```html/g, '').replace(/```/g, '').trim();
        
        // Ensure only the content inside the <body> or main <div> is returned
        const bodyStartIndex = text.indexOf('<body');
        const bodyEndIndex = text.lastIndexOf('body>') + 5;
        if (bodyStartIndex !== -1 && bodyEndIndex !== -1) {
            text = text.substring(bodyStartIndex, bodyEndIndex);
        } else {
            const divStartIndex = text.indexOf('<div');
            const divEndIndex = text.lastIndexOf('div>') + 4;
            if (divStartIndex !== -1 && divEndIndex !== -1) {
                text = text.substring(divStartIndex, divEndIndex);
            }
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
        } catch (audioError: any) {
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