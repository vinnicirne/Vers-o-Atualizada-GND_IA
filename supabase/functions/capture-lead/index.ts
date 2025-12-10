
// supabase/functions/capture-lead/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ownerId = url.searchParams.get("uid");
    const redirectUrl = url.searchParams.get("redirect");

    if (!ownerId) {
      return new Response(JSON.stringify({ error: "UID do proprietário não fornecido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Inicializa Supabase Admin (Bypass RLS para inserir lead sem estar logado)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse Form Data (x-www-form-urlencoded ou JSON)
    const contentType = req.headers.get("content-type") || "";
    let data: any = {};

    if (contentType.includes("application/json")) {
        data = await req.json();
    } else {
        const formData = await req.formData();
        formData.forEach((value, key) => {
            data[key] = value;
        });
    }

    const { email, name, phone, company, notes } = data;

    if (!email) {
        return new Response(JSON.stringify({ error: "Email é obrigatório." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 1. Inserir Lead
    // Verifica se já existe para este owner (upsert ou ignore)
    // Aqui faremos um insert simples, o frontend/admin lida com duplicatas depois se necessário
    const { data: leadData, error: leadError } = await supabaseAdmin
        .from('leads')
        .insert({
            owner_id: ownerId,
            email,
            name: name || email.split('@')[0],
            phone: phone || null,
            company: company || null,
            notes: notes || 'Capturado via Landing Page',
            status: 'new',
            source: 'landing_page',
            score: 10 // Começa com um score baixo
        })
        .select()
        .single();

    if (leadError) {
        console.error("Erro ao salvar lead:", leadError);
        // Se for erro de duplicidade (unique constraint), não falha, apenas avisa
        if (!leadError.message.includes('duplicate')) {
             throw new Error("Erro ao salvar lead no banco de dados.");
        }
    }

    // 2. Registrar Evento de Marketing
    if (leadData) {
        await supabaseAdmin.from('marketing_events').insert({
            lead_id: leadData.id,
            event_type: 'form_submit',
            metadata: { source: 'landing_page_capture' }
        });
    }

    // 3. Resposta (Redirecionamento ou JSON)
    if (redirectUrl) {
        return Response.redirect(redirectUrl, 303); // 303 See Other para GET após POST
    }

    // Página de sucesso simples HTML se não houver redirect
    const successHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sucesso!</title>
        <style>
          body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0fdf4; color: #166534; margin: 0; }
          .card { background: white; padding: 2rem; rounded: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; border-radius: 12px; }
          h1 { margin-bottom: 0.5rem; }
          a { color: #166534; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ Dados Recebidos!</h1>
          <p>Entraremos em contato em breve.</p>
          <br>
          <a href="javascript:history.back()">Voltar</a>
        </div>
      </body>
      </html>
    `;

    return new Response(successHtml, {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
