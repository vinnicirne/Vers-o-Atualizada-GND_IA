
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

    // Inicializa Supabase Admin (Bypass RLS para inserir lead sem estar logado e buscar email do owner)
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

    // 1. Inserir Lead no Banco de Dados
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
        // Se for erro de duplicidade, não falha, apenas segue (para não perder a notificação se for o caso)
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

    // 3. ENVIO DE E-MAIL DE NOTIFICAÇÃO (Lógica Nova)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey) {
        // A. Buscar e-mail do dono do site (seu cliente)
        const { data: ownerProfile } = await supabaseAdmin
            .from('app_users')
            .select('email, full_name')
            .eq('id', ownerId)
            .single();

        if (ownerProfile && ownerProfile.email) {
            console.log(`Enviando notificação de lead para: ${ownerProfile.email}`);
            
            // B. Enviar e-mail via Resend API
            try {
                const emailResponse = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${resendApiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: "GDN Leads <onboarding@resend.dev>", // Substitua pelo seu domínio verificado em produção
                        to: [ownerProfile.email],
                        subject: `🔔 Novo Lead Capturado: ${name || email}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h2 style="color: #10B981;">Novo Contato Recebido!</h2>
                                <p>Olá <strong>${ownerProfile.full_name || 'Parceiro'}</strong>,</p>
                                <p>Um novo cliente preencheu o formulário do seu site gerado no GDN_IA.</p>
                                
                                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <p><strong>Nome:</strong> ${name || 'Não informado'}</p>
                                    <p><strong>E-mail:</strong> ${email}</p>
                                    <p><strong>Telefone:</strong> ${phone || 'Não informado'}</p>
                                    ${company ? `<p><strong>Empresa:</strong> ${company}</p>` : ''}
                                </div>

                                <p>Acesse seu painel CRM para gerenciar este lead.</p>
                                <br/>
                                <small>Enviado automaticamente por GDN_IA Creator Suite.</small>
                            </div>
                        `,
                    }),
                });

                if (!emailResponse.ok) {
                    const errTxt = await emailResponse.text();
                    console.error("Erro ao enviar email Resend:", errTxt);
                }
            } catch (emailErr) {
                console.error("Exceção no envio de email:", emailErr);
            }
        }
    } else {
        console.warn("RESEND_API_KEY não configurada. E-mail de notificação não enviado.");
    }

    // 4. Resposta para o usuário final (Redirecionamento ou JSON)
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
