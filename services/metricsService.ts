// ... existing imports ...

// ... inside DocumentationViewer component ...
  const schemaSql = `
-- =========================================================
-- 🚨 PACOTE DE CORREÇÃO COMPLETO (EXECUTAR TUDO)
-- =========================================================

-- 1. CORREÇÃO DE LOGS DE VISITANTES (Dashboard)
-- Remove restrição que impede salvar logs de usuários não cadastrados (GUEST_ID)
ALTER TABLE public.logs DROP CONSTRAINT IF EXISTS logs_usuario_id_fkey;

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas para limpar
DROP POLICY IF EXISTS "Anon can insert logs" ON public.logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.logs;
DROP POLICY IF EXISTS "Users can view own logs" ON public.logs;

-- Permite que qualquer um (inclusive visitantes) grave logs
CREATE POLICY "Anon can insert logs" ON public.logs 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Permite que Admins vejam todos os logs
CREATE POLICY "Admins can view all logs" ON public.logs 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Permissões de tabela
GRANT INSERT, SELECT ON public.logs TO anon, authenticated;
GRANT ALL ON public.logs TO service_role;


-- 2. CORREÇÃO DE CRÉDITOS (RPC)
CREATE OR REPLACE FUNCTION public.deduct_credits(cost int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits int;
BEGIN
  SELECT credits INTO current_credits FROM public.user_credits WHERE user_id = auth.uid();
  
  IF current_credits IS NULL THEN
    INSERT INTO public.user_credits (user_id, credits) VALUES (auth.uid(), 3);
    current_credits := 3;
  END IF;

  IF current_credits = -1 THEN
    RETURN;
  END IF;

  IF current_credits < cost THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  UPDATE public.user_credits
  SET credits = credits - cost
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits TO service_role;


-- 3. CORREÇÃO DE NOTIFICAÇÕES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- 4. DIAGNÓSTICO: CHECAR LOGS DE VISITANTES
-- Selecione a linha abaixo e clique em RUN para ver se os logs estão salvando.
-- SELECT count(*) FROM public.logs WHERE usuario_id = '00000000-0000-0000-0000-000000000000';
`;
// ... rest of component