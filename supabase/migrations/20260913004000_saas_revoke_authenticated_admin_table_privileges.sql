-- Remove privilégios administrativos desnecessários do papel authenticated.
-- Operações normais de aplicação (SELECT/INSERT/UPDATE/DELETE) não são alteradas.
-- RLS continua sendo responsável pelo isolamento entre tenants.

revoke truncate, trigger, references
on table
  public.assinatura_eventos,
  public.assinaturas,
  public.clientes_grupo_vip,
  public.configuracoes_empresa,
  public.empresa_usuarios,
  public.empresas,
  public.plano_recursos,
  public.planos
from authenticated;
