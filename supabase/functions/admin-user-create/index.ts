

// supabase/functions/admin-user-create/index.ts

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { UserRole } from "../../../types.ts"; // Importa o tipo UserRole

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
      return new Response(JSON.stringify({ error: "Acesso negado: Somente administradores podem criar usuários." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, full_name, role, credits } = await req.json();

    if (!email || !password || !full_name || !role || credits === undefined) {
      return new Response(JSON.stringify({ error: "Dados do usuário incompletos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Criar usuário no Auth (Admin)
    const { data: newUserAuth, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Confirma automaticamente o email para usuários criados pelo admin
        user_metadata: { full_name, role } // Adiciona role para ser usado no hook de novo usuário
    });

    if (createUserError) {
        console.error("[admin-user-create] Erro ao criar usuário no Auth:", createUserError.message);
        return new Response(JSON.stringify({ error: `Falha ao criar usuário: ${createUserError.message}` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const newUserId = newUserAuth.user?.id;

    if (!newUserId) {
        return new Response(JSON.stringify({ error: "ID do novo usuário não retornado." }), { status: 500, headers: corsHeaders });
    }

    // 2. Inserir perfil na tabela `app_users` e créditos em `user_credits`
    // NOTA: O trigger `handle_new_user()` no banco já faz isso.
    // No entanto, para usuários criados por `auth.admin.createUser`, o trigger não é disparado
    // se o `user_metadata` for usado para a role. Portanto, faremos a inserção manual aqui.

    const { error: insertProfileError } = await supabaseAdmin
        .from('app_users')
        .insert({
            id: newUserId,
            email: email,
            full_name: full_name,
            role: role as UserRole,
            credits: credits, // Atribui os créditos definidos
            status: 'active',
            plan: 'free', // Por padrão, começa com 'free', o admin pode mudar depois
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
        });

    if (insertProfileError) {
        console.error("[admin-user-create] Erro ao inserir perfil na tabela app_users:", insertProfileError.message);
        // Tenta deletar o usuário do auth se falhar a criação do perfil
        await supabaseAdmin.auth.admin.deleteUser(newUserId); 
        return new Response(JSON.stringify({ error: `Falha ao criar perfil: ${insertProfileError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Inserir créditos na tabela `user_credits`
    const { error: insertCreditsError } = await supabaseAdmin
        .from('user_credits')
        .insert({
            user_id: newUserId,
            credits: credits
        });

    if (insertCreditsError) {
        console.error("[admin-user-create] Erro ao inserir créditos na tabela user_credits:", insertCreditsError.message);
        // Considere reverter ou logar mais severamente
    }

    return new Response(JSON.stringify({ success: true, user: newUserAuth.user }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[admin-user-create] Erro interno no processamento:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});