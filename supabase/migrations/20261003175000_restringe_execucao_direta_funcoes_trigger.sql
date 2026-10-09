-- ============================================================================
-- Segurança
-- Restringe execução direta de funções usadas exclusivamente como triggers.
-- Os triggers existentes continuam vinculados às funções.
-- ============================================================================

revoke all
on function public.atualizar_data_modificacao()
from public, anon, authenticated;

revoke all
on function public.set_updated_at()
from public, anon, authenticated;

revoke all
on function public.snapshot_custo_peca_venda()
from public, anon, authenticated;

revoke all
on function public.whatsapp_set_updated_at()
from public, anon, authenticated;

grant execute
on function public.atualizar_data_modificacao()
to service_role;

grant execute
on function public.set_updated_at()
to service_role;

grant execute
on function public.snapshot_custo_peca_venda()
to service_role;

grant execute
on function public.whatsapp_set_updated_at()
to service_role;
