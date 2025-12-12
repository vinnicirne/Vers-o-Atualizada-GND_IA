
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

// ... (CREATOR_SUITE_SYSTEM_PROMPT mantido igual, omitido para brevidade) ...
const CREATOR_SUITE_SYSTEM_PROMPT = `Você é o GDN_IA Creator Suite... (System prompt completo)`;

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
    mode = mode?.trim();
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Credit Check Logic
    let cost = 0;
    if (userId) {
        const baseCost = TASK_COSTS[mode] || 1; 
        const audioCost = generateAudio ? (TASK_COSTS['text_to_speech'] || 2) : 0;
        cost = baseCost + audioCost;

        const { data: creditData, error: creditError } = await supabaseAdmin
            .from('user_credits')
            .select('credits')
            .eq('user_id', userId)
            .single();

        if (creditError) throw new Error("Erro ao verificar saldo de créditos. Tente novamente.");

        const currentCredits = creditData?.credits ?? 0;
        if (currentCredits !== -1 && currentCredits < cost) {
            throw new Error(`Saldo insuficiente. Necessário: ${cost}, Disponível: ${currentCredits}.`);
        }
    }

    // 2. Generation Logic
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Erro de Configuração: GEMINI_API_KEY não encontrada no servidor.");

    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    
    // --- AUDIO GENERATION (TTS) ---
    if (mode === 'text_to_speech') {
        const voiceName = options?.voice || 'Kore';
        const safePrompt = prompt.length > MAX_TTS_CHARS ? prompt.substring(0, MAX_TTS_CHARS) + "..." : prompt;

        try {
            console.log(`Gerando áudio (TTS) com voz: ${voiceName}`);
            
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
                console.error("Gemini Response sem áudio:", JSON.stringify(audioResponse));
                throw new Error("O modelo não retornou dados de áudio. Tente novamente.");
            }

            if (userId && cost > 0) await deductCredits(supabaseAdmin, userId, cost);

            // NEW: Save to History for TTS
            if (userId) {
                try {
                    await supabaseAdmin.from('news').insert({
                        author_id: userId,
                        titulo: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
                        conteudo: "Áudio gerado a partir do texto: " + safePrompt.substring(0, 100) + "...",
                        tipo: mode,
                        status: 'approved',
                        criado_em: new Date().toISOString()
                    });
                } catch(logErr) {
                    console.warn("Falha ao salvar histórico de áudio:", logErr);
                }
            }

            return new Response(JSON.stringify({ 
                text: "Áudio gerado com sucesso.", 
                audioBase64, 
                sources: [] 
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });

        } catch (ttsError: any) {
            console.error("TTS Critical Error:", ttsError);
            const errorMsg = ttsError.message || "Erro desconhecido na geração de áudio";
            // Return explicit error to UI
            return new Response(JSON.stringify({ error: `Falha na geração de áudio: ${errorMsg}` }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
    }

    // --- TEXT / CODE GENERATION ---
    const modelName = 'gemini-2.5-flash';
    const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda (Modo Visitante ou Novo Usuário)."}`;

    let fullPrompt = `Query do usuário: ${prompt}\nModo de Geração: ${mode}`;

    if (mode === 'image_generation' && options) {
        fullPrompt += `\nCONTEXTO ADICIONAL PARA O PROMPT DE IMAGEM:\n- Estilo Artístico: ${options.imageStyle || 'Photorealistic'}\n- Proporção: ${options.aspectRatio || '1:1'}`;
    }

    if (mode === 'social_media_poster' && options) {
        fullPrompt += `\nCONTEXTO PARA POSTER:\n- Plataforma: ${options.platform || 'Instagram'}\n- Tema: ${options.theme || 'Modern'}`;
    }

    if (mode === 'landingpage_generator' && options) { 
        fullPrompt += `\n**DIRETRIZES VISUAIS ESPECÍFICAS:**\n- **Tema/Estilo Visual**: ${options.theme || 'Moderno'}.\n- **Cor Primária**: ${options.primaryColor || '#10B981'}.`;
    }

    if (mode === 'curriculum_generator' && options) {
        const templateKey = options.template as keyof typeof CURRICULUM_TEMPLATES;
        const selectedTemplate = CURRICULUM_TEMPLATES[templateKey];
        if (!selectedTemplate) throw new Error(`Template de currículo '${templateKey}' não encontrado.`);

        fullPrompt = `
        Por favor, gere um currículo profissional em HTML com Tailwind CSS. Utilize o TEMPLATE HTML a seguir como ESTRUTURA BASE e preencha o conteúdo de cada elemento com IDs específicos com as informações fornecidas, otimizando conforme as diretrizes de ATS (palavras-chave, verbos de ação, resultados quantificáveis) e o objetivo de carreira.

        **TEMPLATE HTML A SER PREENCHIDO:**
        ${selectedTemplate}

        **INFORMAÇÕES DO USUÁRIO:**
        - **Objetivo de Carreira:** ${prompt || 'Não fornecido, crie um objetivo padrão profissional.'}
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
        - **Habilidades:** ${options.skills?.join(', ') || 'Não fornecido, sugira habilidades relevantes.'}
        - **Projetos:**
            ${options.projects?.map((proj: any) => `  - Nome: ${proj.name}, Tecnologias: ${proj.technologies}, Descrição: ${proj.description}`).join('\n') || 'Nenhum projeto fornecido.'}
        - **Certificações:** ${options.certifications?.join(', ') || 'Nenhuma.'}

        O retorno DEVE ser APENAS o código HTML FINAL e COMPLETO do currículo.
        `;
    }

    let config: any = { systemInstruction: systemPromptWithMemory };
    if (mode === 'news_generator') {
        config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt, 
        config: config,
    });

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

    if (!text) throw new Error('A API não retornou conteúdo de texto.');

    // Cleanup Logic
    if (mode === 'landingpage_generator' || mode === 'canva_structure' || mode === 'curriculum_generator') { 
        text = text.replace(/```html/g, '').replace(/```/g, '').trim();
    }

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
            // Non-critical failure for news audio (text was generated)
        }
    }

    if (userId && cost > 0) await deductCredits(supabaseAdmin, userId, cost);

    if (userId) {
        try {
            await supabaseAdmin.from('news').insert({
                author_id: userId,
                titulo: mode === 'image_generation' ? prompt.substring(0, 50) : (text.split('\n')[0].substring(0, 100) || 'Sem título'),
                conteudo: text,
                tipo: mode,
                status: 'approved',
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
    console.error("Error in generate-content function:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function deductCredits(supabaseAdmin: any, userId: string, cost: number) {
    const { data: creditData } = await supabaseAdmin
        .from('user_credits')
        .select('credits')
        .eq('user_id', userId)
        .single();
    const currentCredits = creditData?.credits ?? 0;
    if (currentCredits !== -1) {
        const newBalance = Math.max(0, currentCredits - cost);
        await supabaseAdmin.from('user_credits').update({ credits: newBalance }).eq('user_id', userId);
    }
}
