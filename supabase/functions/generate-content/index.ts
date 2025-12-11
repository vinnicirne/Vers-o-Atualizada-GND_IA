
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
  // Chat History for Briefing
  chatHistory?: { role: string; parts: { text: string }[] }[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TTS_CHARS = 2800;

// PROMPT DE BRIEFING REESTRUTURADO: SEQUENCIAL E SEM MARKDOWN
const BRIEFING_SYSTEM_PROMPT = `
Você é um Arquiteto de Soluções Web Sênior do GDN_IA.
Seu objetivo é coletar informações para criar um site, MAS você deve agir como um humano conversando no WhatsApp.

REGRA DE OURO 1: FAÇA APENAS UMA PERGUNTA POR VEZ. NUNCA faça duas perguntas na mesma mensagem. Aguarde a resposta do usuário.
REGRA DE OURO 2: NÃO USE MARKDOWN. Não use negrito (**), itálico (*) ou listas. Use apenas texto puro e quebras de linha.
REGRA DE OURO 3: Seja direto e breve.

ROTEIRO DA ENTREVISTA (Siga esta ordem, uma de cada vez):
1. Pergunte o nome do negócio e o que ele faz.
2. Pergunte qual o objetivo principal do site (Vender, Informar, Capturar Leads).
3. Pergunte sobre as cores ou estilo visual desejado.
4. Pergunte se há algum diferencial ou serviço específico que não pode faltar.

FINALIZAÇÃO:
Assim que tiver essas 4 respostas (ou se o usuário disser "pode criar"), encerre a entrevista.
Para encerrar, NÃO escreva texto para o usuário. Retorne APENAS este JSON:
{
  "briefing_complete": true,
  "summary_prompt": "Resumo técnico completo para o gerador de código baseado nas respostas.",
  "suggested_theme": "modern",
  "suggested_color": "#HEXCODE"
}
`;

const CREATOR_SUITE_SYSTEM_PROMPT = `
Você é o GDN_IA Creator Suite, uma ferramenta multifuncional para geração de conteúdo criativo e produtiva.

DIRETRIZES GERAIS DE SEGURANÇA E FORMATO:
1. NUNCA use formatação Markdown (como **, *, #, ##) no meio do código HTML ou CSS gerado.
2. Para geração de Sites/Landing Pages/Social Media, retorne APENAS o código HTML final. Não coloque blocos de código (\`\`\`) e não coloque textos explicativos antes ou depois.
3. Se for texto (Notícia/Copy), use HTML semântico (h1, h2, p, ul, li) mas SEM os caracteres de markdown.

MODOS ESPECÍFICOS:

1. **Criador de Sites (Web) / Landing Pages**:
   - Gere um arquivo HTML único, responsivo e moderno.
   - Use Tailwind CSS via CDN.
   - Use FontAwesome para ícones.
   - O design deve ser profissional, com seções de Hero, Features, Sobre e Contato/Footer.
   - NÃO use Markdown no texto visível do site (ex: não use **Título** dentro de uma tag <h1>).

2. **Social Media Poster**:
   - Crie um layout HTML/CSS quadrado (ou formato pedido) usando Tailwind.
   - Deve parecer uma imagem pronta para o Instagram/Linkedin.
   - Use tipografia grande e cores contrastantes.
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
    
    let { prompt, mode, userId, generateAudio, options: rawOptions, userMemory } = reqBody;
    const options: GenerateContentOptions = rawOptions || {};

    mode = mode?.trim();
    
    // 3. Get & Validate API Key
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
        throw new Error("Erro de Configuração: GEMINI_API_KEY não encontrada no servidor.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    const modelName = 'gemini-2.5-flash';

    // --- BRIEFING CHAT MODE ---
    if (mode === 'briefing_chat') {
        const chatHistory = options.chatHistory || [];
        
        // Adiciona a nova mensagem do usuário ao histórico temporário para contexto
        const currentMessage = { role: 'user', parts: [{ text: prompt }] };
        
        const chat = ai.chats.create({
            model: modelName,
            config: {
                systemInstruction: BRIEFING_SYSTEM_PROMPT,
                temperature: 0.5, // Temperatura mais baixa para seguir regras estritas
            },
            history: chatHistory // Envia histórico anterior
        });

        const result = await chat.sendMessage(prompt);
        let responseText = result.response.text();

        // Tenta detectar JSON no final da resposta
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonContent = JSON.parse(jsonMatch[0]);
                if (jsonContent.briefing_complete) {
                    return new Response(JSON.stringify({ 
                        is_complete: true, 
                        data: jsonContent 
                    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
            }
        } catch (e) {
            // Se falhar o parse, assume que é conversa normal
        }

        // Limpeza extra para garantir que não vá markdown para o chat
        responseText = responseText.replace(/\*\*/g, '').replace(/\*/g, '').trim();

        return new Response(JSON.stringify({ 
            is_complete: false, 
            text: responseText 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- OUTROS MODOS ---
    
    // ... (Lógica de Text to Speech mantida igual)
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
            if (!audioBase64) throw new Error("O modelo não retornou áudio.");
            return new Response(JSON.stringify({ text: "Áudio gerado.", audioBase64, sources: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (ttsError: any) {
            throw new Error(`Falha na geração de áudio: ${ttsError.message}`);
        }
    }

    // Preparação do Prompt Normal (Site, Imagem, etc)
    const systemPromptWithMemory = `${CREATOR_SUITE_SYSTEM_PROMPT}\n\n=== HISTÓRICO DE APRENDIZADO DO USUÁRIO ===\n${userMemory || "Nenhum histórico ainda."}`;

    let fullPrompt = `Query do usuário: ${prompt}\nModo de Geração: ${mode}`;

    if (mode === 'image_generation' && options) {
        fullPrompt += `\nCONTEXTO IMAGEM: Estilo: ${options.imageStyle || 'Photorealistic'}, Proporção: ${options.aspectRatio || '1:1'}`;
    }
    if (mode === 'social_media_poster' && options) {
        fullPrompt += `\nCONTEXTO POSTER: Plataforma: ${options.platform}, Tema: ${options.theme}. GERE APENAS CÓDIGO HTML/TAILWIND SEM MARKDOWN.`;
    }
    if (mode === 'landingpage_generator' && options) {
        fullPrompt += `
        **INSTRUÇÕES CRÍTICAS PARA GERAÇÃO DO SITE:**
        1. Utilize as informações do briefing: ${prompt}.
        2. Tema sugerido: ${options.theme || 'Moderno'}. Cor: ${options.primaryColor || '#10B981'}.
        3. RETORNE APENAS O CÓDIGO HTML PURO.
        4. NÃO use Markdown (sem \`\`\`html, sem **, sem ##).
        5. Certifique-se que o fundo tenha cor definida (ex: bg-gray-900 ou bg-white).
        `;
    }
    
    // Configuração para geração de texto/código
    let config: any = { 
        systemInstruction: systemPromptWithMemory,
        temperature: 0.7 
    };
    
    if (mode === 'news_generator') { config.tools = [{ googleSearch: {} }]; }

    const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt, 
        config: config,
    });

    let text: string = typeof response.text === 'string' ? response.text : '';
    
    // ... (Sources logic mantida)
    let sources = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        sources = response.candidates[0].groundingMetadata.groundingChunks
            .map((chunk: any) => {
                if (chunk.web?.uri && chunk.web?.title) {
                    return { uri: chunk.web.uri, title: chunk.web.title };
                }
                return null;
            }).filter((s: any) => s !== null);
    }

    if (!text) throw new Error('A API não retornou conteúdo de texto.');

    // --- LIMPEZA AGRESSIVA DE MARKDOWN ---
    // Remove blocos de código
    text = text.replace(/```html/g, '').replace(/```/g, '').trim();
    
    // Se for geração visual (Site/Poster), remove qualquer texto antes do <html> ou <div
    if (mode === 'landingpage_generator' || mode === 'canva_structure' || mode === 'curriculum_generator') { 
        const firstTag = text.search(/<(html|div|body|section)/i);
        const lastTag = text.lastIndexOf('>');
        
        if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
            text = text.substring(firstTag, lastTag + 1);
        }
        
        // Remove markdown residuals like **Title** inside HTML attributes or text
        // (Cuidado para não quebrar CSS, remove apenas ** duplos soltos)
        text = text.replace(/\*\*/g, ''); 
    }

    // Audio Generation for News (Mantido)
    let audioBase64 = null;
    if (generateAudio && mode === 'news_generator') {
        try {
            const newsVoice = options?.voice || 'Kore';
            const textForAudio = text.length > MAX_TTS_CHARS ? text.substring(0, MAX_TTS_CHARS) + "..." : text;
            const audioResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textForAudio }] }],
                config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: newsVoice } } } },
            });
            audioBase64 = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        } catch (e) { console.error("Audio gen failed", e); }
    }

    return new Response(JSON.stringify({ text, audioBase64, sources }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in generate-content:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
