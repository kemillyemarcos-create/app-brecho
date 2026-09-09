-- SaaS multi-tenant
-- Tenantiza a chave primária de clientes_pagamento.
--
-- Antes:
--   PRIMARY KEY (cliente)
--
-- Depois:
--   PRIMARY KEY (empresa_id, cliente)
--
-- Isso permite que empresas diferentes tenham clientes com o mesmo nome,
-- mantendo a unicidade do registro de pagamento dentro de cada tenant.

ALTER TABLE public.clientes_pagamento
  DROP CONSTRAINT clientes_pagamento_pkey;

ALTER TABLE public.clientes_pagamento
  ADD CONSTRAINT clientes_pagamento_pkey
  PRIMARY KEY (empresa_id, cliente);
