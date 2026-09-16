alter policy clientes_tenant_all
on public.clientes
using (public.usuario_empresa_operacional_ativo(empresa_id))
with check (public.usuario_empresa_operacional_ativo(empresa_id));

alter policy clientes_grupo_vip_tenant_all
on public.clientes_grupo_vip
using (public.usuario_empresa_operacional_ativo(empresa_id))
with check (public.usuario_empresa_operacional_ativo(empresa_id));

alter policy clientes_pagamento_tenant_all
on public.clientes_pagamento
using (public.usuario_empresa_operacional_ativo(empresa_id))
with check (public.usuario_empresa_operacional_ativo(empresa_id));

alter policy lives_tenant_all
on public.lives
using (public.usuario_empresa_operacional_ativo(empresa_id))
with check (public.usuario_empresa_operacional_ativo(empresa_id));

alter policy nota_itens_tenant_all
on public.nota_itens
using (public.usuario_empresa_operacional_ativo(empresa_id))
with check (public.usuario_empresa_operacional_ativo(empresa_id));

alter policy notas_tenant_all
on public.notas
using (public.usuario_empresa_operacional_ativo(empresa_id))
with check (public.usuario_empresa_operacional_ativo(empresa_id));

alter policy pecas_tenant_all
on public.pecas
using (public.usuario_empresa_operacional_ativo(empresa_id))
with check (public.usuario_empresa_operacional_ativo(empresa_id));

alter policy pedido_envio_sacolinhas_tenant_all
on public.pedido_envio_sacolinhas
using (public.usuario_empresa_operacional_ativo(empresa_id))
with check (public.usuario_empresa_operacional_ativo(empresa_id));

alter policy pedidos_envio_tenant_all
on public.pedidos_envio
using (public.usuario_empresa_operacional_ativo(empresa_id))
with check (public.usuario_empresa_operacional_ativo(empresa_id));

alter policy sacolinhas_live_tenant_all
on public.sacolinhas_live
using (public.usuario_empresa_operacional_ativo(empresa_id))
with check (public.usuario_empresa_operacional_ativo(empresa_id));

alter policy vendas_live_tenant_all
on public.vendas_live
using (public.usuario_empresa_operacional_ativo(empresa_id))
with check (public.usuario_empresa_operacional_ativo(empresa_id));
