-- Integração logística local: nenhum scheduler ou checkout de envio.
-- Pedidos históricos de retirada preservados por defaults; sem backfill.
ALTER TABLE public.pedidos_loja
  ADD COLUMN entrega_cep text,
  ADD COLUMN entrega_endereco text,
  ADD COLUMN entrega_numero text,
  ADD COLUMN entrega_complemento text,
  ADD COLUMN entrega_bairro text,
  ADD COLUMN entrega_cidade text,
  ADD COLUMN entrega_uf text,
  ADD COLUMN expedicao_integracao_status text NOT NULL DEFAULT 'nao_aplicavel',
  ADD COLUMN expedicao_integracao_tentativas integer NOT NULL DEFAULT 0,
  ADD COLUMN expedicao_integracao_ultima_tentativa_em timestamptz,
  ADD COLUMN expedicao_integracao_proxima_tentativa_em timestamptz,
  ADD COLUMN expedicao_integracao_ultimo_erro_codigo text,
  ADD COLUMN expedicao_integracao_retry_automatico boolean NOT NULL DEFAULT true,
  ADD COLUMN expedicao_integrada_em timestamptz;


ALTER TABLE public.pedidos_loja
  ADD CONSTRAINT pedidos_loja_entrega_snapshot_ck CHECK (
    forma_entrega <> 'envio' OR (
      entrega_cep IS NOT NULL AND entrega_cep ~ '^[0-9]{8}$'
      AND entrega_endereco IS NOT NULL AND btrim(entrega_endereco) <> ''
      AND entrega_numero IS NOT NULL AND btrim(entrega_numero) <> ''
      AND entrega_bairro IS NOT NULL AND btrim(entrega_bairro) <> ''
      AND entrega_cidade IS NOT NULL AND btrim(entrega_cidade) <> ''
      AND entrega_uf IS NOT NULL
      AND entrega_uf IN (
        'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
        'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
      )
    )
  ),
  ADD CONSTRAINT pedidos_loja_expedicao_estado_ck CHECK (
    expedicao_integracao_status IN ('nao_aplicavel','pendente','integrada','erro')
    AND (
      (forma_entrega = 'retirada' AND expedicao_integracao_status = 'nao_aplicavel')
      OR
      (forma_entrega = 'envio' AND expedicao_integracao_status <> 'nao_aplicavel')
    )
    AND expedicao_integracao_tentativas >= 0
    AND (
      (expedicao_integracao_status = 'integrada' AND expedicao_integrada_em IS NOT NULL)
      OR
      (expedicao_integracao_status <> 'integrada' AND expedicao_integrada_em IS NULL)
    )
    AND (
      expedicao_integracao_status <> 'erro'
      OR (
        expedicao_integracao_ultimo_erro_codigo IS NOT NULL
        AND btrim(expedicao_integracao_ultimo_erro_codigo) <> ''
      )
    )
  );


CREATE TABLE public.pedido_envio_pedidos_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  pedido_envio_id text NOT NULL,
  pedido_loja_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pepl_empresa_fk FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id) ON DELETE RESTRICT,
  CONSTRAINT pepl_empresa_envio_fk FOREIGN KEY (empresa_id, pedido_envio_id)
    REFERENCES public.pedidos_envio(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT pepl_empresa_loja_fk FOREIGN KEY (empresa_id, pedido_loja_id)
    REFERENCES public.pedidos_loja(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT pepl_empresa_pedido_uk UNIQUE (empresa_id, pedido_loja_id),
  CONSTRAINT pepl_empresa_envio_uk UNIQUE (empresa_id, pedido_envio_id)
);


CREATE INDEX pedidos_loja_expedicao_fila_idx
  ON public.pedidos_loja (
    empresa_id, expedicao_integracao_proxima_tentativa_em, pago_em, id
  )
  WHERE forma_entrega = 'envio'
    AND status = 'pago'
    AND expedicao_integracao_status IN ('pendente','erro')
    AND expedicao_integracao_retry_automatico;

CREATE INDEX pedidos_loja_expedicao_estado_idx
  ON public.pedidos_loja (empresa_id, expedicao_integracao_status, pago_em, id)
  WHERE forma_entrega = 'envio';

ALTER TABLE public.pedido_envio_pedidos_loja ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pedido_envio_pedidos_loja FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.pedido_envio_pedidos_loja TO authenticated;
GRANT SELECT, INSERT ON TABLE public.pedido_envio_pedidos_loja TO service_role;
CREATE POLICY pepl_tenant_select
  ON public.pedido_envio_pedidos_loja FOR SELECT TO authenticated
  USING (public.usuario_empresa_operacional_ativo(empresa_id));
