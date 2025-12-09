
// supabase/functions/chat-ai/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();

    if (!message || !userId) {
        return new Response(JSON.stringify({ error: "Missing message or userId" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 1. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Fetch User AI Settings
    const { data: settings, error: settingsError } = await supabaseAdmin
        .from('ai_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (settingsError || !settings) {
        console.log(`[chat-ai] No settings found for user ${userId}. AI disabled.`);
        return new Response(JSON.stringify({ reply: null }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (!settings.enabled) {
        console.log(`[chat-ai] AI disabled for user ${userId}.`);
        return new Response(JSON.stringify({ reply: null }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 3. Initialize Gemini
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // 4. Generate Response
    const systemPrompt = settings.system_prompt || "Você é um assistente útil.";
    const temperature = settings.temperature || 0.7;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message, 
        config: {
            systemInstruction: systemPrompt,
            temperature: temperature,
            maxOutputTokens: 300, // Short replies for chat
        },
    });

    const replyText = response.text || "";

    return new Response(JSON.stringify({ reply: replyText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in chat-ai function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
