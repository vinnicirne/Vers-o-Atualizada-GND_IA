

// supabase/functions/broadcast-notification/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } "https://esm.sh/@supabase/supabase-js@2";
import { AppNotification } from "../../types.ts"; // Importa o tipo AppNotification

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Método não permitido", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Token de autenticação ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.split(" ")[1];

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Valida se o usuário que fez a requisição é um admin/super_admin
    const { data: { user: requestUser }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !requestUser) {
      return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('app_users')
      .select('role')
      .eq('id', requestUser.id)
      .single();

    if (adminProfileError || (adminProfile.role !== 'admin' && adminProfile.role !== 'super_admin')) {
      return new Response(JSON.stringify({ error: "Acesso negado: Somente administradores podem enviar notificações." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, message, type, targetUserId, actionLink, adminId } = await req.json();

    if (!title || !message || !type || !targetUserId) {
      return new Response(JSON.stringify({ error: "Dados da notificação incompletos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsToInsert: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>[] = [];
    let count = 0;

    if (targetUserId === 'all') {
      // Envio em Massa (Broadcast)
      const { data: users, error: usersError } = await supabaseAdmin
        .from('app_users')
        .select('id')
        .eq('status', 'active'); // Apenas para usuários ativos

      if (usersError) {
        console.error("[broadcast-notification] Erro ao buscar lista de usuários:", usersError.message);
        throw new Error("Erro ao buscar lista de usuários para envio em massa.");
      }

      if (users && users.length > 0) {
        notificationsToInsert = users.map((u: { id: string }) => ({
          user_id: u.id,
          title,
          message,
          type,
          action_link: actionLink || null,
        }));
        count = users.length;
      }
    } else {
      // Envio Individual
      notificationsToInsert.push({
        user_id: targetUserId,
        title,
        message,
        type,
        action_link: actionLink || null,
      });
      count = 1;
    }

    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('notifications').insert(notificationsToInsert);
      if (insertError) {
        console.error("[broadcast-notification] Erro ao inserir notificações:", insertError.message);
        throw new Error(`Falha ao inserir notificações: ${insertError.message}`);
      }
    }

    return new Response(JSON.stringify({ success: true, count }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[broadcast-notification] Erro interno no processamento:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});