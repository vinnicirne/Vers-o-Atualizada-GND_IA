
// supabase/functions/generate-content/index.ts
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";

// Inline type definitions to avoid relative import issues in Deno
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

// Inline CURRICULUM_TEMPLATES to avoid relative import issues
const CURRICULUM_TEMPLATES = {
    minimalist: `
    <div class="bg-white p-8 max-w-3xl mx-auto font-sans text-gray-800 shadow-lg rounded-lg my-8">
        <div class="resume-header">
            <h1 id="personal-info-name"></h1>
            <p><span id="personal-info-email"></span> | <span id="personal-info-phone"></span> | <a id="personal-info-linkedin" href="#" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | <a id="personal-info-portfolio" href="#" target="_blank" class="text-blue-600 hover:underline">Portfólio</a></p>
        </div>

        <div class="resume-section">
            <h2 class="section-title">Resumo Profissional</h2>
            <div id="summary-content"></div>
        </div>

        <div class="resume-section">
            <h2 class="section-title">Experiência Profissional</h2>
            <div id="experience-list"></div>
        </div>

        <div class="resume-section">
            <h2 class="section-title">Formação Acadêmica</h2>
            <div id="education-list"></div>
        </div>

        <div class="resume-section">
            <h2 class="section-title">Habilidades</h2>
            <div id="skills-list" class="skill-list"></div>
        </div>

        <div id="projects-section" class="resume-section">
            <h2 class="section-title">Projetos</h2>
            <div id="projects-list"></div>
        </div>

        <div id="certifications-section" class="resume-section">
            <h2 class="section-title">Certificações e Prêmios</h2>
            <ul id="certifications-list" class="list-disc ml-6"></ul>
        </div>
    </div>
    `,
    professional: `
    <div class="bg-white p-10 max-w-3xl mx-auto font-sans text-gray-900 shadow-xl rounded-lg my-8 border-t-4 border-blue-700">
        <div class="text-center mb-8">
            <h1 class="text-4xl font-extrabold text-blue-700" id="personal-info-name-prof"></h1>
            <p class="text-gray-600 text-sm mt-2">
                <span id="personal-info-email-prof"></span> | <span id="personal-info-phone-prof"></span> | 
                <a id="personal-info-linkedin-prof" href="#" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | 
                <a id="personal-info-portfolio-prof" href="#" target="_blank" class="text-blue-600 hover:underline">Portfólio</a>
            </p>
        </div>

        <div class="resume-section">
            <div class="section-header-prof"><h2>Resumo Profissional</h2></div>
            <p class="text-gray-700 leading-relaxed" id="summary-content-prof"></p>
        </div>

        <div class="resume-section">
            <div class="section-header-prof"><h2>Experiência Profissional</h2></div>
            <div id="experience-list-prof"></div>
        </div>

        <div class="resume-section">
            <div class="section-header-prof"><h2>Formação Acadêmica</h2></div>
            <div id="education-list-prof"></div>
        </div>

        <div class="resume-section">
            <div class="section-header-prof"><h2>Habilidades</h2></div>
            <div id="skills-list-prof" class="skill-list"></div>
        </div>

        <div id="projects-section-prof" class="resume-section">
            <div class="section-header-prof"><h2>Projetos</h2></div>
            <div id="projects-list-prof"></div>
        </div>

        <div id="certifications-section-prof" class="resume-section">
            <div class="section-header-prof"><h2>Certificações</h2></div>
            <ul id="certifications-list-prof" class="list-disc ml-6 text-gray-700"></ul>
        </div>
    </div>
    `,
    modern: `
    <div class="bg-gray-100 p-8 max-w-3xl mx-auto font-sans text-gray-800 rounded-lg shadow-2xl my-8">
        <div class="bg-white p-8 rounded-lg shadow-md mb-8">
            <h1 class="text-5xl font-extrabold text-center text-blue-700 mb-2" id="personal-info-name-modern"></h1>
            <p class="text-center text-gray-600 text-lg" id="summary-tagline-modern"></p>
        </div>

        <div class="resume-grid-modern">
            <div class="sidebar-modern">
                <div class="mb-8">
                    <h2 class="section-title-sidebar-modern">Contato</h2>
                    <div class="text-sm">
                        <p class="personal-info-item-modern"><i class="fas fa-envelope"></i> <a id="personal-info-email-modern" href="#"></a></p>
                        <p class="personal-info-item-modern"><i class="fas fa-phone"></i> <span id="personal-info-phone-modern"></span></p>
                        <p class="personal-info-item-modern"><i class="fab fa-linkedin"></i> <a id="personal-info-linkedin-modern" href="#" target="_blank">LinkedIn</a></p>
                        <p id="portfolio-item-modern" class="personal-info-item-modern"><i class="fas fa-globe"></i> <a id="personal-info-portfolio-modern" href="#" target="_blank">Portfólio</a></p>
                    </div>
                </div>

                <div class="mb-8">
                    <h2 class="section-title-sidebar-modern">Habilidades</h2>
                    <div id="skills-list-modern"></div>
                </div>

                <div id="certifications-section-modern">
                    <h2 class="section-title-sidebar-modern">Certificações</h2>
                    <ul id="certifications-list-modern" class="list-none text-sm text-gray-300"></ul>
                </div>
            </div>

            <div class="main-content">
                <div class="mb-8">
                    <h2 class="section-title-main-modern">Resumo Profissional</h2>
                    <div id="summary-content-modern" class="text-gray-700 leading-relaxed"></div>
                </div>
                <div class="mb-8">
                    <h2 class="section-title-main-modern">Experiência</h2>
                    <div id="experience-list-modern"></div>
                </div>

                <div>
                    <h2 class="section-title-main-modern">Educação</h2>
                    <div id="education-list-modern"></div>
                </div>

                <div id="projects-section-modern" class="mb-8">
                    <h2 class="section-title-main-modern">Projetos</h2>
                    <div id="projects-list-modern"></div>
                </div>
            </div>
        </div>
    </div>
    `,
    creative: `
    <div class="bg-gradient-to-br from-purple-100 to-blue-100 p-8 max-w-3xl mx-auto font-sans text-gray-900 shadow-xl rounded-lg my-8">
        <div class="resume-header-creative-base">
            <h1 id="personal-info-name-creative"></h1>
            <p>
                <span id="personal-info-email-creative"></span> | <span id="personal-info-phone-creative"></span> | 
                <a id="personal-info-linkedin-creative" href="#" target="_blank" class="text-purple-600 hover:underline">LinkedIn</a> | 
                <a id="personal-info-portfolio-creative" href="#" target="_blank" class="text-purple-600 hover:underline">Portfólio</a>
            </p>
        </div>

        <div class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Resumo</h2>
            <p class="text-gray-700 leading-relaxed text-center" id="summary-content-creative"></p>
        </div>

        <div class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Experiência</h2>
            <div id="experience-list-creative"></div>
        </div>

        <div class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Educação</h2>
            <div id="education-list-creative"></div>
        </div>

        <div class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Habilidades</h2>
            <div id="skills-list-creative" class="skill-list-creative-base"></div>
        </div>

        <div id="projects-section-creative" class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Projetos</h2>
            <div id="projects-list-creative"></div>
        </div>

        <div id="certifications-section-creative" class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Certificações</h2>
            <ul id="certifications-list-creative" class="description-creative-base text-gray-700"></ul>
        </div>
    </div>
    `,
    tech: `
    <div class="bg-gray-900 p-8 max-w-3xl mx-auto font-mono text-gray-200 shadow-xl rounded-lg my-8 border-t-4 border-green-500">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-extrabold text-green-500 mb-2" id="personal-info-name-tech"></h1>
            <div class="personal-info-tech text-gray-400 text-sm">
                <p><span id="personal-info-email-tech"></span> | <span id="personal-info-phone-tech"></span></p>
                <p><a id="personal-info-linkedin-tech" href="#" target="_blank">LinkedIn</a> | <a id="personal-info-portfolio-tech" href="#" target="_blank">Portfólio</a></p>
            </div>
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Resumo</h2>
            <p class="text-gray-300 leading-relaxed" id="summary-content-tech"></p>
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Experiência</h2>
            <div id="experience-list-tech"></div>
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Habilidades</h2>
            <div id="skills-list-tech" class="skill-list-tech"></div>
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Educação</h2>
            <div id="education-list-tech"></div>
        </div>

        <div id="projects-section-tech" class="resume-section">
            <h2 class="section-title-tech">Projetos</h2>
            <div id="projects-list-tech"></div>
        </div>

        <div id="certifications-section-tech" class="resume-section">
            <h2 class="section-title-tech">Certificações</h2>
            <ul id="certifications-list-tech" class="job-description-tech text-gray-300"></ul>
        </div>
    </div>
    `,
    compact: `
    <div class="bg-white p-6 max-w-2xl mx-auto font-sans text-gray-800 shadow-md rounded-lg my-8 border-l-4 border-gray-600">
        <div class="resume-header-compact">
            <h1 id="personal-info-name-compact"></h1>
            <p>
                <span id="personal-info-email-compact"></span> | <span id="personal-info-phone-compact"></span> | 
                <a id="personal-info-linkedin-compact" href="#" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | 
                <a id="personal-info-portfolio-compact" href="#" target="_blank" class="text-blue-600 hover:underline">Portfólio</a>
            </p>
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Resumo</h2>
            <p id="summary-content-compact"></p>
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Experiência</h2>
            <div id="experience-list-compact"></div>
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Educação</h2>
            <div id="education-list-compact"></div>
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Habilidades</h2>
            <div id="skills-list-compact" class="skill-list-compact text-gray-700"></div>
        </div>

        <div id="projects-section-compact" class="mb-4">
            <h2 class="section-title-compact">Projetos</h2>
            <div id="projects-list-compact"></div>
        </div>

        <div id="certifications-section-compact" class="mb-4">
            <h2 class="section-title-compact">Certificações</h2>
            <ul id="certifications-list-compact" class="item-description-compact text-gray-700"></ul>
        </div>
    </div>
    `,
    creative_sidebar: `
    <div class="bg-white max-w-3xl mx-auto font-sans text-gray-800 shadow-xl rounded-lg my-8 flex">
        <div class="sidebar-creative-split">
            <div class="photo-frame-creative">
                <img src="https://via.placeholder.com/120x120?text=Sua+Foto" alt="Sua Foto de Perfil">
            </div>
            <h1 class="name-creative-split" id="personal-info-name-creative-sidebar"></h1>
            <p class="title-creative-split" id="personal-info-title-creative-sidebar"></p>

            <div class="mb-6">
                <div class="contact-item-creative"><i class="fas fa-envelope"></i> <a id="personal-info-email-creative-sidebar" href="#"></a></div>
                <div class="contact-item-creative"><i class="fas fa-phone"></i> <span id="personal-info-phone-creative-sidebar"></span></div>
                <div class="contact-item-creative"><i class="fab fa-linkedin"></i> <a id="personal-info-linkedin-creative-sidebar" href="#" target="_blank">LinkedIn</a></div>
                <div id="portfolio-item-creative-sidebar" class="contact-item-creative"><i class="fas fa-globe"></i> <a id="personal-info-portfolio-creative-sidebar" href="#" target="_blank">Portfólio</a></div>
            </div>

            <h2 class="section-title-sidebar-creative-split">Habilidades</h2>
            <div id="skills-list-creative-sidebar" class="text-sm"></div>

            <div id="certifications-section-creative-sidebar">
                <h2 class="section-title-sidebar-creative-split">Certificações</h2>
                <ul id="certifications-list-creative-sidebar" class="list-none text-sm text-gray-800 mt-2"></ul>
            </div>
        </div>

        <div class="main-content-creative-split">
            <div class="mb-8">
                <h2 class="main-section-title-creative-split">Resumo Profissional</h2>
                <p class="text-gray-700 leading-relaxed" id="summary-content-creative-sidebar"></p>
            </div>

            <div class="mb-8">
                <h2 class="main-section-title-creative-split">Experiência</h2>
                <div id="experience-list-creative-sidebar"></div>
            </div>

            <div class="mb-8">
                <h2 class="main-section-title-creative-split">Educação</h2>
                <div id="education-list-creative-sidebar"></div>
            </div>

            <div id="projects-section-creative-sidebar" class="mb-8">
                <h2 class="main-section-title-creative-split">Projetos</h2>
                <div id="projects-list-creative-sidebar"></div>
            </div>
        </div>
    </div>
    `
};


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
   - Retorne APENAS o código HTML puro. 
   - **NÃO** use blocos de código Markdown (\`\`\`html).
   - **NÃO** escreva texto antes ou depois do HTML. Comece com <div> ou <section> e termine com </div> ou </section>.
   - Use font-sans (padrão moderno).
   - Espaçamento generoso (py-20, gap-8).
   - Sombras sofisticadas (shadow-2xl, shadow-inner).
   - Use <section> tags distintas para cada bloco de conteúdo para facilitar a edição visual.

    4. **Studio de Arte IA (Image Generation)**:
       Traduza o pedido para um PROMPT TÉCNICO EM INGLÊS.
       - Adicione: "cinematic lighting, 8k, photorealistic, octane render, masterpiece".
       - Retorne APENAS o prompt em inglês.

    5. **Gerador de Copy**: Textos persuasivos (AIDA, PAS).

    6. **Editor Visual (Social Media)**:
       Gere APENAS o código HTML de uma <div> (1080x1080px) com Tailwind CSS.
       - Design vibrante, tipografia grande, contraste alto.
       - **NÃO** use blocos de código Markdown. Retorne apenas o HTML puro.

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
       - **IDENTIFIQUE CADA SEÇÃO PELO SEU ID** (ex: "<span id='resume-name'></span>", "<div id='experience-list'></div>").
       - Para cada ID, gere o **conteúdo HTML completo** (tags \`<p>\`, \`<ul><li>\`, \`<span>\`, \`<a>\`, etc.) que corresponde à seção e **insira esse HTML como o "innerHTML"** do elemento com o ID.
       - **NÃO MANTENHA A SINTAXE DE PLACEHOLDER** como \`{{variavel}}\` ou \`{{#each}}\` na saída final. Substitua-os pelo conteúdo HTML.
       - Se uma seção (com seu ID) não tiver dados correspondentes ou for opcional e vazia, **deixe seu "innerHTML" vazio** ou remova o elemento se for mais limpo.
       - Para seções de listas (experiência, educação, projetos, habilidades, certificações), **gere o HTML completo para todos os itens da lista e seus itens** (ex: "<div>...</div>" para cada experiência, "<span>...</span>" para cada skill) diretamente dentro do "div" de placeholder da lista.
       - **NÃO inclua tags "<html>", "<head>" ou "<body>" externas.** Apenas o conteúdo interno.
       - Use classes Tailwind CSS para todo o estilo.
       - Garanta que o currículo seja responsivo para diferentes tamanhos de tela.
       - **NÃO inclua nenhuma imagem de perfil/foto** a menos que explicitamente solicitado pelo usuário, para evitar vieses em processos de seleção.
       - **RETORNE APENAS HTML PURO**, sem blocos de código Markdown.

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
    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    
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
        - **LEMBRE-SE:** Retorne APENAS o código HTML. Nada mais.
        `;
    }

    // --- CURRICULUM GENERATOR LOGIC ---
    if (mode === 'curriculum_generator' && options) {
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
        3.  Para cada ID de placeholder, **gere o conteúdo HTML apropriado (ex: "<p>Seu resumo aqui</p>" ou "<div><h3>Cargo</h3><p>Empresa</p></div>")** e insira-o como o "innerHTML" desse elemento.
        4.  Para listas como Experiência, Educação, Habilidades, Projetos e Certificações:
            -   Gere o HTML completo para todos os itens da lista.
            -   Para experiência e educação, cada item deve ter um "div" ou "p" formatado com classes Tailwind para o título/grau, empresa/instituição, datas e descrição.
            -   Para habilidades e certificações, gere '<span>' ou '<li>' tags conforme o estilo do template e insira-as dentro do seu "div" ou "ul" de placeholder.
        5.  Se não houver dados para uma seção de placeholder (ex: nenhum projeto), **deixe o "innerHTML" desse elemento vazio**.
        6.  Para links (LinkedIn, Portfólio), atualize o atributo \`href\` e o texto do link no elemento \`<a>\` correspondente, ou deixe o \`href\` como "#" e o texto vazio se a URL não for fornecida.
        7.  O retorno DEVE ser APENAS o código HTML FINAL e COMPLETO do currículo, sem qualquer texto adicional, explicações, ou blocos de código Markdown.
        `;
        fullPrompt = curriculumDataPromptContent; // Override fullPrompt for curriculum mode
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

    // FIX: Ensure `response.text` is always a string and explicitly typed.
    let text: string = typeof response.text === 'string' ? response.text : '';
    
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

    // Cleanup Logic (Updated for Robustness)
    if (mode === 'landingpage_generator' || mode === 'canva_structure' || mode === 'curriculum_generator') { 
        // 1. Remove Markdown Code Blocks
        text = text.replace(/```html/g, '').replace(/```/g, '').trim();
        
        // 2. Extract HTML from conversational text
        // Looks for the first occurrence of < and the last occurrence of >
        const firstTag = text.indexOf('<');
        const lastTag = text.lastIndexOf('>');

        if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
            text = text.substring(firstTag, lastTag + 1);
        } else {
            // Fallback: If no tags found but it's supposed to be code, keep as is (trimmed)
            // or perhaps log a warning.
        }

        // 3. Optional: Extract body content if present, but allow partials (sections/divs)
        const tagBodyStart = '<body';
        const tagBodyEnd = '</body>';
        
        const bodyStart = text.indexOf(tagBodyStart);
        const bodyEnd = text.lastIndexOf(tagBodyEnd);

        if (bodyStart !== -1 && bodyEnd !== -1 && (bodyEnd + tagBodyEnd.length) > bodyStart) {
            // If body tags exist, extract content INSIDE body + the body tag itself for attributes
            // Actually, GrapesJS handles <body> well if passed, but sometimes better without.
            // Let's stick to the extracted block from < to > which covers <html>...</html> or <section>...</section>
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
