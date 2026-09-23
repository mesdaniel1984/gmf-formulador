-- Proposta para Supabase CENTRAL; não executar no PostgreSQL CQ.
-- Retorna somente a validade da própria sessão autenticada.
BEGIN;
CREATE SCHEMA IF NOT EXISTS cq_private;
REVOKE ALL ON SCHEMA cq_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA cq_private TO authenticated;
CREATE OR REPLACE FUNCTION cq_private.session_active() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
   SELECT 1 FROM auth.sessions s
   WHERE s.user_id=auth.uid()
   AND s.id::text=auth.jwt()->>'session_id'
   AND (s.not_after IS NULL OR s.not_after>now())
 );
$$;
REVOKE ALL ON FUNCTION cq_private.session_active() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION cq_private.session_active() TO authenticated;
CREATE OR REPLACE FUNCTION public.cq_session_active() RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT cq_private.session_active();
$$;
REVOKE ALL ON FUNCTION public.cq_session_active() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cq_session_active() TO authenticated;
COMMIT;
