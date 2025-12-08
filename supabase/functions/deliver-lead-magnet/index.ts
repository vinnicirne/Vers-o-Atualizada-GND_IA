
// supabase/functions/deliver-lead-magnet/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CONTEÚDO DO E-BOOK (HTML)
const EBOOK_HTML = (nome: string) => `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica', 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background-color: #10B981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
  .content { background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; }
  h1 { margin: 0; font-size: 24px; }
  h2 { color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 10px; margin-top: 30px; }
  .box { background-color: #f0fdf4; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; }
  .footer { text-align: center; font-size: 12px; color: #888; margin-top: 20px; }
  .btn { display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
</style>
</head>
<body>

<div class="header">
  <h1>Guia de Engenharia de Prompts</h1>
  <p>Domine a IA em 5 Minutos</p>
</div>

<div class="content">
  <p>Olá, <strong>${nome}</strong>!</p>
  <p>Parabéns por dar o primeiro passo para dominar a Inteligência Artificial. Este é o seu material exclusivo prometido.</p>

  <h2>1. O Segredo: Contexto é Rei</h2>
  <p>A maioria das pessoas falha porque trata a IA como um buscador (Google). Trate-a como um estagiário inteligente.</p>
  <div class="box">
    <strong>❌ Errado:</strong> "Escreva um post sobre sapatos."<br/>
    <strong>✅ Certo:</strong> "Atue como um especialista em moda. Escreva um post de Instagram para vender sapatos de couro para homens de negócios, com tom sofisticado."
  </div>

  <h2>2. A Fórmula C.P.F.</h2>
  <p>Use esta estrutura para criar prompts perfeitos sempre:</p>
  <ul>
    <li><strong>C (Contexto):</strong> Quem é a IA? (Ex: "Você é um nutricionista sênior")</li>
    <li><strong>P (Pedido):</strong> O que ela deve fazer? (Ex: "Crie um plano de dieta...")</li>
    <li><strong>F (Formato):</strong> Como você quer a resposta? (Ex: "...em uma tabela HTML com dias da semana.")</li>
  </ul>

  <h2>3. Iteração</h2>
  <p>A primeira resposta raramente é a perfeita. Use técnicas de refinamento:</p>
  <ul>
    <li>"Reescreva, mas mais curto."</li>
    <li>"Adicione mais exemplos práticos."</li>
    <li>"Mude o tom para algo mais divertido."</li>
  </ul>

  <div style="text-align: center;">
    <p>Pronto para colocar em prática?</p>
    <a href="https://gdn.ia/" class="btn">Acessar o GDN_IA Agora</a>
  </div>
</div>

<div class="footer">
  <p>Enviado por GDN_IA - Sua Suíte Criativa.</p>
  <p>Se você não solicitou este material, pode ignorar este e-mail.</p>
</div>

</body>
</html>
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, nome } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
        console.error("RESEND_API_KEY não configurada.");
        return new Response(JSON.stringify({ error: "Erro de Configuração no Servidor: RESEND_API_KEY não encontrada." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "GDN_IA <onboarding@resend.dev>", // Em produção, usar domínio verificado
        to: [email],
        subject: `🎁 Seu Guia de Prompts Chegou, ${nome || 'Criador'}!`,
        html: EBOOK_HTML(nome || 'Criador'),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
        console.error("Erro Resend:", data);
        throw new Error(data.message || "Erro ao enviar email");
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro na Edge Function deliver-lead-magnet:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
