-- SaaS multi-tenant
-- RLS v2: Expedição, pagamentos e Grupo VIP.
--
-- Substitui policies globais para authenticated por isolamento via empresa_id.
-- O acesso é permitido somente quando o usuário autenticado possui vínculo
-- ativo com a empresa do registro.

-- ============================================================
-- pedidos_envio
-- ============================================================

DROP POLICY IF EXISTS pedidos_envio_authenticated_all
ON public.pedidos_envio;

CREATE POLICY pedidos_envio_tenant_all
ON public.pedidos_envio
FOR ALL
TO authenticated
USING (
  public.usuario_empresa_ativo(empresa_id)
)
WITH CHECK (
  public.usuario_empresa_ativo(empresa_id)
);

-- ============================================================
-- pedido_envio_sacolinhas
-- ============================================================

DROP POLICY IF EXISTS pedido_envio_sacolinhas_authenticated_all
ON public.pedido_envio_sacolinhas;

CREATE POLICY pedido_envio_sacolinhas_tenant_all
ON public.pedido_envio_sacolinhas
FOR ALL
TO authenticated
USING (
  public.usuario_empresa_ativo(empresa_id)
)
WITH CHECK (
  public.usuario_empresa_ativo(empresa_id)
);

-- ============================================================
-- clientes_pagamento
-- ============================================================

DROP POLICY IF EXISTS clientes_pagamento_authenticated_all
ON public.clientes_pagamento;

CREATE POLICY clientes_pagamento_tenant_all
ON public.clientes_pagamento
FOR ALL
TO authenticated
USING (
  public.usuario_empresa_ativo(empresa_id)
)
WITH CHECK (
  public.usuario_empresa_ativo(empresa_id)
);

-- ============================================================
-- clientes_grupo_vip
-- ============================================================

DROP POLICY IF EXISTS clientes_grupo_vip_authenticated_all
ON public.clientes_grupo_vip;

CREATE POLICY clientes_grupo_vip_tenant_all
ON public.clientes_grupo_vip
FOR ALL
TO authenticated
USING (
  public.usuario_empresa_ativo(empresa_id)
)
WITH CHECK (
  public.usuario_empresa_ativo(empresa_id)
);
