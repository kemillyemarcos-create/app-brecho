-- ============================================================
-- SaaS: remove helper legado de empresa única por usuário
-- A relação usuário <-> empresa agora é resolvida por
-- public.empresa_usuarios.
-- ============================================================

drop function if exists public.usuario_empresa_id();
