
// supabase/functions/generate-content/index.ts
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";

// Inline type definitions
export interface GenerateContentOptions {
  theme?: string;
  primaryColor?: string;
  aspectRatio?: string;
  imageStyle?: string;
  platform?: string;
  voice?: string;
  template?: string;
  personalInfo?: { name: string; email: string; phone: string; linkedin: string; portfolio: string };
  summary?: string;
  experience?: { title: string; company: string; dates: string; description: string }[];
  education?: { degree: string; institution: string; dates: string; description: string }[];
  skills?: string[];
  projects?: { name: string; description: string; technologies: string }[];
  certifications?: string[];
}

// CUSTOS (Sincronizado com constants.ts do Frontend)
const TASK_COSTS: Record<string, number> = {
  news_generator: 1,
  text_to_speech: 2,
  copy_generator: 1,
  prompt_generator: 1,
  canva_structure: 3,
  landingpage_generator: 25,
  image_generation: 5,
  social_media_poster: 5,
  curriculum_generator: 8,
  n8n_integration: 0,
  crm_suite: 0,
};

// Inline CURRICULUM_TEMPLATES
const CURRICULUM_TEMPLATES = {
    minimalist: `
    <div class="bg-white p-8 max-w-3xl mx-auto font-sans text-gray-800 shadow-lg rounded-lg my-8">
        <div class="resume-header">
            <h1 id="personal-info-name"></h1>
            <p><span id="personal-info-email"></span> | <span id="personal-info-phone"></span> | <a id="personal-info-linkedin" href="#" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | <a id="personal-info-portfolio" href="#" target="_blank" class="text-blue-600 hover:underline">Portfólio</a></p>
        </div>
        <div class="resume-section"><h2 class="section-title">Resumo Profissional</h2><div id="summary-content"></div></div>
        <div class="resume-section"><h2 class="section-title">Experiência Profissional</h2><div id="experience-list"></div></div>
        <div class="resume-section"><h2 class="section-title">Formação Acadêmica</h2><div id="education-list"></div></div>
        <div class="resume-section"><h2 class="section-title">Habilidades</h2><div id="skills-list" class="skill-list"></div></div>
        <div id="projects-section" class="resume-section"><h2 class="section-title">Projetos</h2><div id="projects-list"></div></div>
        <div id="certifications-section" class="resume-section"><h2 class="section-title">Certificações e Prêmios</h2><ul id="certifications-list" class="list-disc ml-6"></ul></div>
    </div>
    `,
    professional: `
    <div class="bg-white p-10 max-w-3xl mx-auto font-sans text-gray-900 shadow-xl rounded-lg my-8 border-t-4 border-blue-700">
        <div class="text-center mb-8">
            <h1 class="text-4xl font-extrabold text-blue-700" id="personal-info-name-prof"></h1>
            <p class="text-gray-600 text-sm mt-2"><span id="personal-info-email-prof"></span> | <span id="personal-info-phone-prof"></span> | <a id="personal-info-linkedin-prof" href="#" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | <a id="personal-info-portfolio-prof" href="#" target="_blank" class="text-blue-600 hover:underline">Portfólio</a></p>
        </div>
        <div class="resume-section"><div class="section-header-prof"><h2>Resumo Profissional</h2></div><p class="text-gray-700 leading-relaxed" id="summary-content-prof"></p></div>
        <div class="resume-section"><div class="section-header-prof"><h2>Experiência Profissional</h2></div><div id="experience-list-prof"></div></div>
        <div class="resume-section"><div class="section-header-prof"><h2>Formação Acadêmica</h2></div><div id="education-list-prof"></div></div>
        <div class="resume-section"><div class="section-header-prof"><h2>Habilidades</h2></div><div id="skills-list-prof" class="skill-list"></div></div>
        <div id="projects-section-prof" class="resume-section"><div class="section-header-prof"><h2>Projetos</h2></div><div id="projects-list-prof"></div></div>
        <div id="certifications-section-prof" class="resume-section"><div class="section-header-prof"><h2>Certificações</h2></div><ul id="certifications-list-prof" class="list-disc ml-6 text-gray-700"></ul></div>
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
                <div class="mb-8"><h2 class="section-title-sidebar-modern">Contato</h2><div class="text-sm"><p class="personal-info-item-modern"><i class="fas fa-envelope"></i> <a id="personal-info-email-modern" href="#"></a></p><p class="personal-info-item-modern"><i class="fas fa-phone"></i> <span id="personal-info-phone-modern"></span></p><p class="personal-info-item-modern"><i class="fab fa-linkedin"></i> <a id="personal-info-linkedin-modern" href="#" target="_blank">LinkedIn</a></p><p id="portfolio-item-modern" class="personal-info-item-modern"><i class="fas fa-globe"></i> <a id="personal-info-portfolio-modern" href="#" target="_blank">Portfólio</a></p></div></div>
                <div class="mb-8"><h2 class="section-title-sidebar-modern">Habilidades</h2><div id="skills-list-modern"></div></div>
                <div id="certifications-section-modern"><h2 class="section-title-sidebar-modern">Certificações</h2><ul id="certifications-list-modern" class="list-none text-sm text-gray-300"></ul></div>
            </div>
            <div class="main-content">
                <div class="mb-8"><h2 class="section-title-main-modern">Resumo Profissional</h2><div id="summary-content-modern" class="text-gray-700 leading-relaxed"></div></div>
                <div class="mb-8"><h2 class="section-title-main-modern">Experiência</h2><div id="experience-list-modern"></div></div>
                <div><h2 class="section-title-main-modern">Educação</h2><div id="education-list-modern"></div></div>
                <div id="projects-section-modern" class="mb-8"><h2 class="section-title-main-modern">Projetos</h2><div id="projects-list-modern"></div></div>
            </div>
        </div>
    </div>
    `,
    creative: `
    <div class="bg-gradient-to-br from-purple-100 to-blue-100 p-8 max-w-3xl mx-auto font-sans text-gray-900 shadow-xl rounded-lg my-8">
        <div class="resume-header-creative-base">
            <h1 id="personal-info-name-creative"></h1>
            <p><span id="personal-info-email-creative"></span> | <span id="personal-info-phone-creative"></span> | <a id="personal-info-linkedin-creative" href="#" target="_blank" class="text-purple-600 hover:underline">LinkedIn</a> | <a id="personal-info-portfolio-creative" href="#" target="_blank" class="text-purple-600 hover:underline">Portfólio</a></p>
        </div>
        <div class="resume-section-creative-base"><h2 class="section-title-creative-base">Resumo</h2><p class="text-gray-700 leading-relaxed text-center" id="summary-content-creative"></p></div>
        <div class="resume-section-creative-base"><h2 class="section-title-creative-base">Experiência</h2><div id="experience-list-creative"></div></div>
        <div class="resume-section-creative-base"><h2 class="section-title-creative-base">Educação</h2><div id="education-list-creative"></div></div>
        <div class="resume-section-creative-base"><h2 class="section-title-creative-base">Habilidades</h2><div id="skills-list-creative" class="skill-list-creative-base"></div></div>
        <div id="projects-section-creative" class="resume-section-creative-base"><h2 class="section-title-creative-base">Projetos</h2><div id="projects-list-creative"></div></div>
        <div id="certifications-section-creative" class="resume-section-creative-base"><h2 class="section-title-creative-base">Certificações</h2><ul id="certifications-list-creative" class="description-creative-base text-gray-700"></ul></div>
    </div>
    `,
    tech: `
    <div class="bg-gray-900 p-8 max-w-3xl mx-auto font-mono text-gray-200 shadow-xl rounded-lg my-8 border-t-4 border-green-500">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-extrabold text-green-500 mb-2" id="personal-info-name-tech"></h1>
            <div class="personal-info-tech text-gray-400 text-sm"><p><span id="personal-info-email-tech"></span> | <span id="personal-info-phone-tech"></span></p><p><a id="personal-info-linkedin-tech" href="#" target="_blank">LinkedIn</a> | <a id="personal-info-portfolio-tech" href="#" target="_blank">Portfólio</a></p></div>
        </div>
        <div class="resume-section"><h2 class="section-title-tech">Resumo</h2><p class="text-gray-300 leading-relaxed" id="summary-content-tech"></p></div>
        <div class="resume-section"><h2 class="section-title-tech">Experiência</h2><div id="experience-list-tech"></div></div>
        <div class="resume-section"><h2 class="section-title-tech">Habilidades</h2><div id="skills-list-tech" class="skill-list-tech"></div></div>
        <div class="resume-section"><h2 class="section-title-tech">Educação</h2><div id="education-list-tech"></div></div>
        <div id="projects-section-tech" class="resume-section"><h2 class="section-title-tech">Projetos</h2><div id="projects-list-tech"></div></div>
        <div id="certifications-section-tech" class="resume-section"><h2 class="section-title-tech">Certificações</h2><ul id="certifications-list-tech" class="job-description-tech text-gray-300"></ul></div>
    </div>
    `,
    compact: `
    <div class="bg-white p-6 max-w-2xl mx-auto font-sans text-gray-800 shadow-md rounded-lg my-8 border-l-4 border-gray-600">
        <div class="resume-header-compact">
            <h1 id="personal-info-name-compact"></h1>
            <p><span id="personal-info-email-compact"></span> | <span id="personal-info-phone-compact"></span> | <a id="personal-info-linkedin-compact" href="#" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | <a id="personal-info-portfolio-compact" href="#" target="_blank" class="text-blue-600 hover:underline">Portfólio</a></p>
        </div>
        <div class="mb-4"><h2 class="section-title-compact">Resumo</h2><p id="summary-content-compact"></p></div>
        <div class="mb-4"><h2 class="section-title-compact">Experiência</h2><div id="experience-list-compact"></div></div>
        <div class="mb-4"><h2 class="section-title-compact">Educação</h2><div id="education-list-compact"></div></div>
        <div class="mb-4"><h2 class="section-title-compact">Habilidades</h2><div id="skills-list-compact" class="skill-list-compact text-gray-700"></div></div>
        <div id="projects-section-compact" class="mb-4"><h2 class="section-title-compact">Projetos</h2><div id="projects-list-compact"></div></div>
        <div id="certifications-section-compact" class="mb-4"><h2 class="section-title-compact">Certificações</h2><ul id="certifications-list-compact" class="item-description-compact text-gray-700"></ul></div>
    </div>
    `,
    creative_sidebar: `
    <div class="bg-white max-w-3xl mx-auto font-sans text-gray-800 shadow-xl rounded-lg my-8 flex">
        <div class="sidebar-creative-split">
            <div class="photo-frame-creative"><img src="https://via.placeholder.com/120x120?text=Sua+Foto" alt="Sua Foto de Perfil"></div>
            <h1 class="name-creative-split" id="personal-info-name-creative-sidebar"></h1>
            <p class="title-creative-split" id="personal-info-title-creative-sidebar"></p>
            <div class="mb-6"><div class="contact-item-creative"><i class="fas fa-envelope"></i> <a id="personal-info-email-creative-sidebar" href="#"></a></div><div class="contact-item-creative"><i class="fas fa-phone"></i> <span id="personal-info-phone-creative-sidebar"></span></div><div class="contact-item-creative"><i class="fab fa-linkedin"></i> <a id="personal-info-linkedin-creative-sidebar" href="#" target="_blank">LinkedIn</a></div><div id="portfolio-item-creative-sidebar" class="contact-item-creative"><i class="fas fa-globe"></i> <a id="personal-info-portfolio-creative-sidebar" href="#" target="_blank">Portfólio</a></div></div>
            <h2 class="section-title-sidebar-creative-split">Habilidades</h2><div id="skills-list-creative-sidebar" class="text-sm"></div>
            <div id="certifications-section-creative-sidebar"><h2 class="section-title-sidebar-creative-split">Certificações</h2><ul id="certifications-list-creative-sidebar" class="list-none text-sm text-gray-800 mt-2"></ul></div>
        </div>
        <div class="main-content-creative-split">
            <div class="mb-8"><h2 class="main-section-title-creative-split">Resumo Profissional</h2><p class="text-gray-700 leading-relaxed" id="summary-content-creative-sidebar"></p></div>
            <div class="mb-8"><h2 class="main-section-title-creative-split">Experiência</h2><div id="experience-list-creative-sidebar"></div></div>
            <div class="mb-8"><h2 class="main-section-title-creative-split">Educação</h2><div id="education-list-creative-sidebar"></div></div>
            <div id="projects-section-creative-sidebar" class="mb-8"><h2 class="main-section-title-creative-split">Projetos</h2><div id="projects-list-creative-sidebar"></div></div>
        </div>
    </div>
    `
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TTS_CHARS = 2800;

const CREATOR_SUITE_SYSTEM_PROMPT = `
Você é o GDN_IA Ultra, a IA mais avançada para criação de conteúdo digital e web design de alta performance.

## 🧠 MODO DE PENSAMENTO & PESQUISA (Deep Research)
Antes de responder, você deve:
1.  **Analisar a Intenção**: O que o usuário realmente quer alcançar?
2.  **Verificar Fatos (Grounding)**: Para notícias/artigos, use a *Google Search Tool* para buscar dados em TEMPO REAL. Não alucine.
3.  **Planejar a Estrutura**: Para sites, visualize o layout (Bento Grid, Hero Section) antes de codar.

## 🚀 RANK MATH SEO MASTERY (Otimização Extrema para WordPress)
Ao gerar **Notícias** ou **Artigos**, seu objetivo é atingir **Score 100/100** no Rank Math.
Siga rigorosamente estas regras:
1.  **Focus Keyword (Palavra-chave Foco)**: Defina uma palavra-chave principal baseada no tópico.
    -   Ela DEVE aparecer no **TÍTULO** (H1).
    -   Ela DEVE aparecer na **PRIMEIRA FRASE** (primeiros 10% do texto).
    -   Ela DEVE aparecer em pelo menos um **Subtítulo (H2)**.
    -   Densidade: Use-a naturalmente ao longo do texto (0.5% a 1%).
2.  **Meta Description**: Gere um resumo persuasivo (< 160 caracteres) contendo a palavra-chave.
3.  **Basic SEO**:
    -   Parágrafos curtos (máx 3 frases).
    -   Use *listas* (ul/ol) e *negrito* para quebrar o texto.
    -   Linkagem Externa: Cite fontes com links reais encontrados na pesquisa (deep research).
4.  **Power Words**: Use palavras poderosas no título para aumentar o CTR.

## 🎨 DIRETRIZES DE DESIGN "PREMIUM" (Para Sites/LPs)
Quando solicitado a criar sites (\`landingpage_generator\` ou \`site\`), você atua como um Designer Awwwards/Apple.
**Regras Visuais Obrigatórias (Tailwind CSS):**
-   **Tipografia**: Use \`font-sans\` (Inter/Roboto). Títulos com \`tracking-tighter\` e \`leading-none\` para impacto.
-   **Profundidade & Textura**: Use \`backdrop-blur-xl\`, \`bg-white/10\` (Glassmorphism), e sombras suaves \`shadow-[0_8px_30px_rgb(0,0,0,0.12)]\`.
-   **Layouts Modernos**:
    -   Use **Bento Grids** (grids assimétricos) para features.
    -   Hero Sections com gradientes radiais complexos (ex: \`bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]\`).
-   **Interatividade**: Adicione \`hover:scale-105\`, \`active:scale-95\`, \`transition-all duration-300\` em todos os cartões e botões.
-   **Dark Mode Nativo**: Se o tema permitir, prefira fundos escuros (\`bg-slate-950\`) com acentos neon.

## 📰 DIRETRIZES DE JORNALISMO DE DADOS (Para Notícias)
1.  **Lead Jornalístico**: Responda "Quem, O que, Quando, Onde, Por que" no 1º parágrafo.
2.  **Imparcialidade e Fatos**: Baseie-se APENAS nos resultados da busca.
3.  **Citações**: Se usar uma fonte externa, mencione-a (ex: "Segundo a Reuters...").

## 🛠️ MODOS DE OPERAÇÃO (Roteamento Inteligente)

1.  **GDN Notícias (Deep News + Rank Math SEO)**:
    -   USE A FERRAMENTA DE BUSCA AGORA. Pesquise pelo tópico.
    -   **Saída Obrigatória**:
        \`\`\`json
        {
          "seo_metadata": {
            "focus_keyword": "...",
            "seo_title": "...",
            "slug": "...",
            "meta_description": "..."
          }
        }
        \`\`\`
    -   **Conteúdo do Artigo (Markdown)**:
        -   # Título (Com Power Word e Palavra-Chave)
        -   **Lead**: Resumo jornalístico direto.
        -   ## [Subtítulo com Palavra-chave]
        -   Corpo do texto com fatos, dados e citações de links.
        -   ## Conclusão
    -   **Nota**: Mantenha o formato limpo, separando o JSON de metadados do conteúdo visível.

2.  **Criador de Sites (Web Ultra)**:
    -   Retorne APENAS o HTML do \`<body>\`.
    -   **Estrutura Obrigatória para Landing Pages**:
        -   **Navbar Flutuante**: \`sticky top-4 z-50 mx-auto max-w-5xl rounded-full bg-white/80 backdrop-blur-md shadow-sm\`.
        -   **Hero**: Headline gigante (\`text-6xl sm:text-7xl font-bold\`) + Subheadline + 2 CTAs (Primário/Secundário).
        -   **Social Proof**: Logotipos de empresas (use FontAwesome icons ou texto estilizado) em escala de cinza opacity-50.
        -   **Features (Bento Grid)**: Um grid \`grid-cols-1 md:grid-cols-3 gap-4\`. Alguns itens ocupam \`md:col-span-2\`.
        -   **CTA Final**: Seção isolada com fundo contrastante.

3.  **Studio de Arte IA**:
    -   Traduza para Inglês. Adicione: "vibrant colors, volumetric lighting, 8k, unreal engine 5 render".

4.  **Criador de Currículos (ATS Friendly)**:
    -   Mantenha o HTML semântico mas visualmente limpo. Foco em *conteúdo* legível por máquinas.

5.  **Gerador de Copy**:
    -   Use frameworks: AIDA (Atenção, Interesse, Desejo, Ação) ou PAS (Problema, Agitação, Solução).

## INSTRUÇÕES FINAIS
-   Não converse. Gere o resultado.
-   Para SITES, não coloque tags \`<html>\` ou \`markdown\`. Apenas o código puro.
`;

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
    
    let { prompt, mode, userId, generateAudio, options: rawOptions, userMemory, file } = reqBody;
    const options: GenerateContentOptions = rawOptions || {};
    mode = mode?.trim();
    
    // 0. Initialize Supabase Admin (Required for credit deduction)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Credit Check Logic
    let cost = 0;
    if (userId) {
        // Calculate cost based on mode and audio
        const baseCost = TASK_COSTS[mode] || 1; 
        const audioCost = generateAudio ? (TASK_COSTS['text_to_speech'] || 2) : 0;
        cost = baseCost + audioCost;

        // Fetch current credits
        const { data: creditData, error: creditError } = await supabaseAdmin
            .from('user_credits')
            .select('credits')
            .eq('user_id', userId)
            .single();

        if (creditError) {
            console.error("Erro ao verificar créditos:", creditError);
            // Allow if checking fails? No, safer to block.
            throw new Error("Erro ao verificar saldo de créditos. Tente novamente.");
        }

        const currentCredits = creditData?.credits ?? 0;

        // -1 means unlimited (Admin/Super Admin)
        if (currentCredits !== -1 && currentCredits < cost) {
            throw new Error(`Saldo insuficiente. Necessário: ${cost}, Disponível: ${currentCredits}.`);
        }
    }

    // 2. Generation Logic
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
        throw new Error("Erro de Configuração: GEMINI_API_KEY não encontrada no servidor.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    
    // ... (Existing text_to_speech handling) ...
    if (mode === 'text_to_speech') {
        const voiceName = options?.voice || 'Kore';
        const safePrompt = prompt.length > MAX_TTS_CHARS ? prompt.substring(0, MAX_TTS_CHARS) + "..." : prompt;

        try {
            console.log(`[TTS] Gerando áudio para o prompt: "${safePrompt.substring(0, 50)}..." com a voz: ${voiceName}`);
            const audioResponse = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: [{ role: "user", parts: [{ text: safePrompt }] }],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceName },
                        },
                    },
                },
            });
            
            console.log("[TTS] Resposta recebida da API Gemini.");
            const candidates = audioResponse.candidates;
            if (!candidates || candidates.length === 0) {
                console.error("[TTS] Nenhum candidato retornado.");
                throw new Error("A IA não gerou candidatos de resposta.");
            }

            const audioPart = candidates[0].content?.parts?.find((p: any) => p.inlineData);
            const audioBase64 = audioPart?.inlineData?.data || null;
            
            if (!audioBase64) {
                throw new Error("O modelo não retornou áudio.");
            }

            // DEDUCT CREDITS FOR TTS
            if (userId && cost > 0) {
                await deductCredits(supabaseAdmin, userId, cost);
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

    const modelName = 'gemini-1.5-flash';
    const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda (Modo Visitante ou Novo Usuário)."}`;

    let contentsParts: any[] = [{ text: "" }];
    
    if (file && (mode === 'curriculum_generator' || mode === 'curriculum_parse')) {
        contentsParts = [
            { inlineData: { data: file.data, mimeType: file.mimeType } },
            { text: "Analise este currículo e extraia os dados profissionais. Se o modo for 'curriculum_parse', retorne APENAS um JSON com os campos: personalInfo, summary, experience, education, skills, projects, certifications. Se for 'curriculum_generator', use os dados para preencher o template solicitado." }
        ];
    } else {
        contentsParts = [{ text: prompt }];
    }

    let fullPrompt = prompt;
    // ... (Prompt adjustments based on mode - unchanged) ...
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

    if (mode === 'landingpage_generator' && options) { 
        fullPrompt += `
        **DIRETRIZES VISUAIS ESPECÍFICAS:**
        - **Tema/Estilo Visual**: ${options.theme || 'Moderno'}.
        - **Cor Primária**: ${options.primaryColor || '#10B981'}.
        - **IMPORTANTE:** O design deve ser IMPRESSIONANTE. Use sombras, gradientes, bordas arredondadas e bom espaçamento.
        `;
    }

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
        fullPrompt = curriculumDataPromptContent;
    }

    let config: any = {
        systemInstruction: systemPromptWithMemory
    };
    
    if (mode === 'news_generator' || mode === 'copy_generator' || mode === 'landingpage_generator') {
        config.tools = [{ googleSearch: {} }];
    }

    console.log(`[Generation] Iniciando geração de conteúdo para o modo: ${mode}`);
    const response = await ai.models.generateContent({
        model: modelName,
        contents: contentsParts.length > 1 
            ? [{ role: "user", parts: contentsParts }] 
            : [{ role: "user", parts: [{ text: fullPrompt }] }], 
        config: config,
    });
    console.log("[Generation] Conteúdo gerado com sucesso.");

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

    // Cleanup Logic (Unchanged)
    if (mode === 'landingpage_generator' || mode === 'canva_structure' || mode === 'curriculum_generator') { 
        text = text.replace(/```html/g, '').replace(/```/g, '').trim();
        const tagBodyStart = '<body';
        const tagBodyEnd = '</body>';
        const bodyStart = text.indexOf(tagBodyStart);
        const bodyEnd = text.lastIndexOf(tagBodyEnd);
        if (bodyStart !== -1 && bodyEnd !== -1 && (bodyEnd + tagBodyEnd.length) > bodyStart) {
            text = text.substring(bodyStart, bodyEnd + tagBodyEnd.length);
        } else {
            const tagDivStart = '<div>';
            const tagDivEnd = '</div>';
            const divStart = text.indexOf(tagDivStart);
            const divEnd = text.lastIndexOf(tagDivEnd);
            if (divStart !== -1 && divEnd !== -1) {
                const divEndPos = divEnd + tagDivEnd.length;
                if (divEndPos > divStart) {
                    text = text.substring(divStart, divEndPos);
                }
            }
        }
    }

    let audioBase64 = null;
    if (generateAudio && mode === 'news_generator') {
        try {
            const newsVoice = options?.voice || 'Kore';
            const textForAudio = text.length > MAX_TTS_CHARS ? text.substring(0, MAX_TTS_CHARS) + "..." : text;

            console.log("[Backend TTS] Gerando áudio de fallback para notícia...");
            const audioResponse = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: [{ role: "user", parts: [{ text: textForAudio }] }],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: newsVoice },
                        },
                    },
                },
            });
            const audioPart = audioResponse.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
            audioBase64 = audioPart?.inlineData?.data || null;
            console.log("[Backend TTS] Áudio gerado:", !!audioBase64);
        } catch (audioError: any) {
            console.error("Failed to generate audio on backend:", audioError);
        }
    }

    // 3. Deduct Credits (Successful Generation)
    if (userId && cost > 0) {
        await deductCredits(supabaseAdmin, userId, cost);
    }

    // 4. Log generation history (Always for logged users)
    if (userId) {
        try {
            await supabaseAdmin.from('news').insert({
                author_id: userId,
                titulo: mode === 'image_generation' ? prompt.substring(0, 50) : (text.split('\n')[0].substring(0, 100) || 'Sem título'),
                conteudo: text,
                tipo: mode,
                status: 'approved', // Auto-approve for now
                criado_em: new Date().toISOString()
            });
        } catch(logErr) {
            console.warn("Falha ao salvar histórico:", logErr);
        }
    }

    return new Response(JSON.stringify({ text, audioBase64, sources }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("CRITICAL FUNCTION ERROR:", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper function to deduct credits
async function deductCredits(supabaseAdmin: any, userId: string, cost: number) {
    const { data: creditData } = await supabaseAdmin
        .from('user_credits')
        .select('credits')
        .eq('user_id', userId)
        .single();
        
    const currentCredits = creditData?.credits ?? 0;
    
    if (currentCredits !== -1) {
        const newBalance = Math.max(0, currentCredits - cost);
        await supabaseAdmin
            .from('user_credits')
            .update({ credits: newBalance })
            .eq('user_id', userId);
    }
}
