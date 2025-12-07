
// supabase/functions/generate-content/index.ts
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";
import { CURRICULUM_TEMPLATES } from "../../../components/resume/templates.ts";
import type { GenerateContentOptions } from "../../../services/geminiService.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Limite seguro de caracteres para o modelo de áudio (TTS)
const MAX_TTS_CHARS = 2800;
const TTS_FAILED_PREFIX = '[TTS_FAILED_TEXT_FALLBACK]';
const AUDIO_ERROR_FALLBACK_PREFIX = '[AUDIO_ERROR_FALLBACK]';

const CREATOR_SUITE_SYSTEM_PROMPT = `
Você é o GDN_IA Creator Suite, uma ferramenta multifuncional para geração de conteúdo criativo e produtiva. 

## PROCESSO DE APRENDIZADO E EVOLUÇÃO (RAG)
Você possui uma memória persistente das preferências do usuário. Antes de gerar qualquer coisa, analyze a seção "Histórico de Aprendizado do Usuário" abaixo.
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
   - Escreva uma matéria aprofundada baseada nos dados fornecidos ou em seu conhecimento.
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
   - Use font-sans (padrão moderno).
   - Espaçamento generoso (py-20, gap-8).
   - Sombras sofisticadas (shadow-2xl, shadow-inner).
   - Use <section> tags distintas para cada bloco de conteúdo para facilitar a edição visual.
   - Retorne APENAS o HTML do <body>.

    4. **Studio de Arte IA (Image Generation)**:
       Traduza o pedido para um PROMPT TÉCNICO EM INGLÊS.
       - Adicione: "cinematic lighting, 8k, photorealistic, octane render, masterpiece".
       - Retorne APENAS o prompt em inglês.

    5. **Gerador de Copy**: Textos persuasivos (AIDA, PAS).

    6. **Editor Visual (Social Media)**:
       Gere APENAS o código HTML de uma <div> (1080x1080px) com Tailwind CSS.
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

       **REGRAS ESTRUTURAIS E DE PREENCHIMENTO HTML (Tailwind CSS):**
       - Utilize o TEMPLATE HTML fornecido como base.
       - **IDENTIFIQUE CADA SEÇÃO PELO SEU ID** (ex: \`<span id="resume-name"></span>\`, \`<div id="experience-list"></div>\`).
       - Para cada ID, gere o **conteúdo HTML completo** (tags \`<p>\`, \`<ul><li>\`, \`<span>\`, \`<a>\`, etc.) que corresponde à seção e **insira esse HTML como o `innerHTML`** do elemento com o ID.
       - **NÃO MANTENHA A SINTAXE DE PLACEHOLDER** como \`{{variavel}}\` ou \`{{#each}}\` na saída final. Substitua-os pelo conteúdo HTML.
       - Se uma seção (com seu ID) não tiver dados correspondentes ou for opcional e vazia, **deixe seu `innerHTML` vazio** ou remova o elemento se for mais limpo.
       - Para seções de listas (experiência, educação, projetos, habilidades, certificações), **gere a estrutura HTML completa da lista e seus itens** (ex: `<div>...</div>` para cada experiência, `<span>...</span>` para cada skill) diretamente dentro do `div` de placeholder da lista.
       - **NÃO inclua tags \`<html>\`, \`<head>\` ou \`<body>\` externas.** Apenas o conteúdo interno.
       - Use classes Tailwind CSS para todo o estilo.
       - Garanta que o currículo seja responsivo para diferentes tamanhos de tela.
       - **NÃO inclua nenhuma imagem de perfil/foto** a menos que explicitamente solicitado pelo usuário, para evitar vieses em processos de seleção.

    8. **Criador de Posts Sociais (Social Media Poster)**:
       [IMAGE_PROMPT] (Inglês técnico)
       [COPY] (Português persuasivo, tom de autoridade).
`;

const cleanHtmlContent = (rawText: string): string => {
    let text = rawText.replace(/```html\n?/g, '').replace(/```/g, '').trim();

    // Try to extract content within <body>...</body> tags
    // FIX: Explicitly cast 'text' to string before regex match to resolve potential type inference issues in Deno.
    const bodyMatch = (text as string).match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
        text = bodyMatch[1].trim();
    }
    
    // If it's still wrapped in a single <div>...</div>, extract that
    // FIX: Explicitly cast 'text' to string before regex match and string methods.
    const divMatch = (text as string).match(/^<div[^>]*>([\s\S]*)<\/div>$/i);
    // Add an extra check to ensure it's not a partial div, and to avoid capturing too much if multiple divs are present.
    // This is a heuristic. A full HTML parser is ideal but disallowed.
    if (divMatch && divMatch[1] && (text as string).startsWith('<div') && (text as string).endsWith('</div>')) {
        text = divMatch[1].trim();
    }

    // Replace any remaining leading/trailing common HTML block tags that might enclose the main content
    // This is a heuristic and might need adjustment based on typical model output
    // A more aggressive regex to remove any outer tags if they look like simple wrappers.
    // FIX: Added explicit type cast to (text as string) to resolve "Cannot find name 'div'" error.
    text = (text as string).replace(/^<(p|div|span|h[1-6]|ul|ol|li)[^>]*>\s*/i, '').replace(/\s*<\/(p|div|span|h[1-6]|ul|ol|li)>$/i, '').trim();

    return text;
};

// --- HANDLERS DE MODO ---

async function handleTextToSpeechGeneration(ai: GoogleGenAI, prompt: string, options: GenerateContentOptions): Promise<{ text: string, audioBase64: string | null, sources: any[] }> {
    const voiceName = options?.voice || 'Kore';
    const safePrompt = prompt.length > MAX_TTS_CHARS ? prompt.substring(0, MAX_TTS_CHARS) + "..." : prompt;

    // NOVO: Log de parâmetros de entrada para depuração
    console.log("Prompt para TTS:", safePrompt);
    console.log("Opções para TTS:", JSON.stringify(options));

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
        
        console.log("Resposta completa do TTS da API Gemini:", JSON.stringify(audioResponse, null, 2));

        const audioBase64 = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        
        if (!audioBase64) {
            console.warn("TTS Falha (Edge Function): Modelo respondeu sem áudio. Retornando texto como fallback.");
            return { 
                text: `${TTS_FAILED_PREFIX} ${safePrompt}`,
                audioBase64: null, 
                sources: [] 
            };
        }

        return { 
            text: "Áudio gerado com sucesso.", 
            audioBase64, 
            sources: [] 
        };

    } catch (ttsError: any) {
        console.error("TTS Error (Edge Function):", ttsError);
        // FIX: Removed 'error' property from return type, throw instead.
        throw new Error(`Falha na geração de áudio: ${ttsError.message || "Erro desconhecido da API Gemini."}`);
    }
}

async function handleNewsGeneration(ai: GoogleGenAI, prompt: string, userMemory: string, generateAudio: boolean, options: GenerateContentOptions): Promise<{ text: string, audioBase64: string | null, sources: any[] }> {
    const modelName = 'gemini-2.5-flash';
    const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda (Modo Visitante ou Novo Usuário)."}`;
    
    const fullPrompt = `Query do usuário: ${prompt}\nModo de Geração: news_generator`;

    // FIX: Removed explicit 'any' type to allow proper type inference for config
    const config = {
        systemInstruction: systemPromptWithMemory,
        tools: [{ googleSearch: {} }]
    };

    const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt, 
        config: config,
    });

    let text: string = response.text || '';
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

    let audioBase64 = null;
    if (generateAudio) {
        try {
            const newsVoice = options?.voice || 'Kore';
            const textForAudio = text.length > MAX_TTS_CHARS ? text.substring(0, MAX_TTS_CHARS) + "..." : text;

            const audioResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textForAudio }] }],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        prebuiltVoiceConfig: { voiceName: newsVoice },
                    },
                },
            });
            
            audioBase64 = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;

            if (!audioBase64) {
                console.warn("TTS Falha para Notícia: Modelo respondeu sem áudio, caindo para fallback de texto.");
                text = `${AUDIO_ERROR_FALLBACK_PREFIX} ${text}`;
                audioBase64 = null;
            }

        } catch (audioError: any) {
            console.error("Failed to generate audio for news on backend:", audioError);
            text = `${AUDIO_ERROR_FALLBACK_PREFIX} ${text}`;
            audioBase64 = null;
        }
    }

    return { text, audioBase64, sources };
}

async function handleCurriculumGeneration(ai: GoogleGenAI, prompt: string, userMemory: string, options: GenerateContentOptions): Promise<{ text: string, audioBase64: string | null, sources: any[] }> {
    const modelName = 'gemini-2.5-flash';
    const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda (Modo Visitante ou Novo Usuário)."}`;
    
    const templateKey = options.template as keyof typeof CURRICULUM_TEMPLATES;
    const selectedTemplate = CURRICULUM_TEMPLATES[templateKey];

    if (!selectedTemplate) {
        throw new Error(`Template de currículo '${templateKey}' não encontrado.`);
    }

    const curriculumDataPromptContent = `
    Por favor, gere um currículo profissional em HTML com Tailwind CSS. Utilize o TEMPLATE HTML a seguir como ESTRUTURA BASE e preencha o conteúdo de cada elemento com IDs específicos com as informações fornecidas, otimizando conforme as diretrizes de ATS (palavras-chave, verbos de ação, resultados quantificáveis) e o objetivo de carreira.

    **TEMPLATE HTML A SER PREENCHIDO (Não modifique a estrutura dos IDs, apenas o conteúdo interno):**
    ${selectedTemplate}

    **INFORMAÇÕES DO USUÁRIO PARA PREENCHIMENTO:**
    - **Objetivo de Carreira (Prompt Geral para Resumo):** ${prompt || 'Não fornecido, crie um objetivo padrão profissional.'}
    - **Dados Pessoais:**
        Nome: ${options.personalInfo?.name || ''}
        Email: ${options.personalInfo?.email || ''}
        Telefone: ${options.personalInfo?.phone || ''}
        LinkedIn URL: ${options.personalInfo?.linkedin || ''}
        Portfólio URL: ${options.personalInfo?.portfolio || ''}
    - **Resumo Profissional:** ${options.summary || 'A IA deve criar um resumo persuasivo e otimizado para ATS.'}
    - **Experiência Profissional:**
        ${options.experience?.map((exp: any) => `  - Cargo: ${exp.title}, Empresa: ${exp.company}, Período: ${exp.dates}, Descrição: ${exp.description}`).join('\n') || 'Nenhuma experiência fornecida.'}
    - **Formação Acadêmica:**
        ${options.education?.map((edu: any) => `  - Grau: ${edu.degree}, Instituição: ${edu.institution}, Período: ${edu.dates}, Descrição: ${edu.description}`).join('\n') || 'Nenhuma formação fornecida.'}
    - **Habilidades (separadas por vírgula):** ${options.skills?.join(', ') || 'Não fornecido, a IA deve sugerir habilidades técnicas e comportamentais relevantes para o objetivo.'}
    - **Projetos:**
        ${options.projects?.map((proj: any) => `  - Nome: ${proj.name}, Tecnologias: ${proj.technologies}, Descrição: ${proj.description}`).join('\n') || 'Nenhum projeto fornecido.'}
    - **Certificações (separadas por vírgula):** ${options.certifications?.join(', ') || 'Nenhuma.'}

    **LEMBRE-SE DE CADA ETAPA:**
    1.  Inicie com o template HTML fornecido.
    2.  Encontre cada elemento HTML que possui um atributo \`id\` e que é um placeholder para o conteúdo.
    3.  Para cada ID de placeholder, **gere o conteúdo HTML apropriado (ex: \`<p>Seu resumo aqui</p>\` ou \`<div><h3>Cargo</h3><p>Empresa</p></div>\`)** e insira-o como o \`innerHTML\` desse elemento.
    4.  Para listas como Experiência, Educação, Habilidades, Projetos e Certificações:
        -   Gere o HTML completo para todos os itens da lista.
        -   Para experiência e educação, cada item deve ter um \`div\` ou \`p\` formatado com classes Tailwind para o título/grau, empresa/instituição, datas e descrição.
        -   Para habilidades e certificações, gere \`<span>\` ou \`<li>\` tags conforme o estilo do template e insira-as dentro do seu \`div\` ou \`ul\` de placeholder.
    5.  Se não houver dados para uma seção de placeholder (ex: nenhum projeto), **deixe o \`innerHTML\` desse elemento vazio**.
    6.  Para links (LinkedIn, Portfólio), atualize o atributo \`href\` e o texto do link no elemento \`<a>\` correspondente, ou deixe o \`href\` como "#" e o texto vazio se a URL não for fornecida.
    7.  O retorno DEVE ser APENAS o código HTML FINAL e COMPLETO do currículo, sem qualquer texto adicional, explicações, ou blocos de código Markdown.
    `;
    
    const response = await ai.models.generateContent({
        model: modelName,
        contents: curriculumDataPromptContent, 
        config: { systemInstruction: systemPromptWithMemory },
    });

    let text: string = response.text || '';
    if (!text) {
        throw new Error('A API não retornou conteúdo de texto para o currículo.');
    }
    
    text = cleanHtmlContent(text);
    return { text, audioBase64: null, sources: [] };
}

async function handleImageGeneration(ai: GoogleGenAI, prompt: string, userMemory: string, options: GenerateContentOptions): Promise<{ text: string, audioBase64: string | null, sources: any[] }> {
    const modelName = 'gemini-2.5-flash';
    const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda (Modo Visitante ou Novo Usuário)."}`;
    
    const fullPrompt = `
      Query do usuário: ${prompt}
      Modo de Geração: Studio de Arte IA
      CONTEXTO ADICIONAL PARA O PROMPT DE IMAGEM:
      - Estilo Artístico: ${options.imageStyle || 'Photorealistic'}
      - Proporção: ${options.aspectRatio || '1:1'}
    `;

    const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt, 
        config: { systemInstruction: systemPromptWithMemory },
    });

    let text: string = response.text || '';
    if (!text) {
        throw new Error('A API não retornou conteúdo de texto para a geração de imagem.');
    }
    
    // Para image_generation, o "text" retornado é o prompt otimizado em inglês
    return { text, audioBase64: null, sources: [] };
}

async function handleSocialMediaPoster(ai: GoogleGenAI, prompt: string, userMemory: string, options: GenerateContentOptions): Promise<{ text: string, audioBase64: string | null, sources: any[] }> {
    const modelName = 'gemini-2.5-flash';
    const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda (Modo Visitante ou Novo Usuário)."}`;
    
    const fullPrompt = `
        Query do usuário: ${prompt}
        Modo de Geração: Editor Visual (Social Media)
        CONTEXTO PARA POSTER:
        - Plataforma: ${options.platform || 'Instagram'}
        - Tema: ${options.theme || 'Modern'}
    `;

    const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt, 
        config: { systemInstruction: systemPromptWithMemory },
    });

    let text: string = response.text || '';
    if (!text) {
        throw new Error('A API não retornou conteúdo de texto para o poster de mídia social.');
    }
    
    text = cleanHtmlContent(text);
    return { text, audioBase64: null, sources: [] };
}

async function handleLandingPageGenerator(ai: GoogleGenAI, prompt: string, userMemory: string, options: GenerateContentOptions): Promise<{ text: string, audioBase64: string | null, sources: any[] }> {
    const modelName = 'gemini-2.5-flash';
    const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda (Modo Visitante ou Novo Usuário)."}`;
    
    const fullPrompt = `
        Query do usuário: ${prompt}
        Modo de Geração: Criador de Sites (Web)
        **DIRETRIZES VISUAIS ESPECÍFICAS:**
        - **Tema/Estilo Visual**: ${options.theme || 'Moderno'}.
        - **Cor Primária**: ${options.primaryColor || '#10B981'}.
        - **IMPORTANTE:** O design deve ser IMPRESSIONANTE. Use sombras, gradientes, bordas arredondadas e bom espaçamento.
    `;

    const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt, 
        config: { systemInstruction: systemPromptWithMemory },
    });

    let text: string = response.text || '';
    if (!text) {
        throw new Error('A API não retornou conteúdo de texto para a landing page.');
    }
    
    text = cleanHtmlContent(text);
    return { text, audioBase64: null, sources: [] };
}

async function handleDefaultTextGeneration(ai: GoogleGenAI, prompt: string, userMemory: string, mode: string): Promise<{ text: string, audioBase64: string | null, sources: any[] }> {
    const modelName = 'gemini-2.5-flash';
    const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda (Modo Visitante ou Novo Usuário)."}`;
    
    const fullPrompt = `Query do usuário: ${prompt}\nModo de Geração: ${mode}`;

    const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt, 
        config: { systemInstruction: systemPromptWithMemory },
    });

    let text: string = response.text || '';
    if (!text) {
        throw new Error(`A API não retornou conteúdo de texto para o modo ${mode}.`);
    }
    return { text, audioBase64: null, sources: [] };
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let reqBody;
    try {
        reqBody = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
    }
    
    let { prompt, mode, userId, generateAudio, options: rawOptions, userMemory } = reqBody;
    const options: GenerateContentOptions = rawOptions || {};

    // NOVO: Log do modo ANTES da limpeza
    console.log("Mode (raw):", mode);

    // NOVO: Limpeza mais robusta da string 'mode'
    mode = mode?.trim().replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\u202F\u205F\uFEFF]/g, '') || '';
    
    // NOVO: Log do modo DEPOIS da limpeza
    console.log("Mode (cleaned):", mode);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
        console.error("ERRO CRÍTICO (Edge Function): Variável de ambiente GEMINI_API_KEY não definida.");
        throw new Error("GEMINI_KEY_MISSING_EDGE_FUNCTION: A chave da API Gemini não está configurada na Edge Function. Contate o administrador.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    
    let result: { text: string, audioBase64: string | null, sources: any[] };

    switch (mode) {
        case 'text_to_speech':
            result = await handleTextToSpeechGeneration(ai, prompt, options);
            break;
        case 'news_generator':
            result = await handleNewsGeneration(ai, prompt, userMemory, generateAudio, options);
            break;
        case 'curriculum_generator':
            result = await handleCurriculumGeneration(ai, prompt, userMemory, options);
            break;
        case 'image_generation':
            result = await handleImageGeneration(ai, prompt, userMemory, options);
            break;
        case 'social_media_poster':
            result = await handleSocialMediaPoster(ai, prompt, userMemory, options);
            break;
        case 'landingpage_generator':
            result = await handleLandingPageGenerator(ai, prompt, userMemory, options);
            break;
        case 'copy_generator': // Adicionado caso para copy_generator
        case 'prompt_generator': // Adicionado caso para prompt_generator
            result = await handleDefaultTextGeneration(ai, prompt, userMemory, mode);
            break;
        default:
            const availableModes = [
                'GDN Notícias',
                'Gerador de Prompts',
                'Criador de Sites (Web)',
                'Studio de Arte IA',
                'Gerador de Copy',
                'Editor Visual (Social Media)',
                'Criador de Currículos (IA)',
                'Texto para Voz'
            ].map((m, i) => `${i + 1}. **${m}**`).join('\n');

            return new Response(JSON.stringify({ 
                text: `O modo '${mode}' não é um modo de geração válido. Por favor, escolha um dos modos disponíveis:\n${availableModes}\n\n(Mode recebido: '${mode}')`
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
    }

    return new Response(JSON.stringify({ 
        text: result.text, 
        audioBase64: result.audioBase64, 
        sources: result.sources 
    }), {
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