-- Operações manuais, separadas dos eventos RECEBIDOS do webhook.
-- Sem backfill, HTTP em SQL, alterações de pedidos/vendas/peças ou mudança no webhook.
CREATE TABLE public.loja_reembolsos (
  pagamento_id uuid PRIMARY KEY,
  empresa_id uuid NOT NULL,
  pedido_id uuid NOT NULL,
  operador_id uuid NOT NULL, -- Identidade auditável preservada mesmo se o usuário for removido.
  ultimo_operador_id uuid NOT NULL,
  idempotency_key uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  provider_checkout_id text NOT NULL,
  provider_payment_id text NOT NULL,
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  estado text NOT NULL CHECK (estado IN ('processando','verificacao_necessaria','confirmado')),
  claim_id uuid NOT NULL,
  claim_ate timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 1 CHECK (tentativas > 0),
  criado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  atualizado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  confirmado_em timestamptz,
  erro_codigo text CHECK (erro_codigo IN ('mp_http','mp_invalido','mp_aguardando','transporte','local')),
  refund_id text,
  mp_status text,
  mp_status_detail text,
  refund_status text,
  refund_amount numeric(12,2),
  FOREIGN KEY (empresa_id,pagamento_id) REFERENCES public.pagamentos_loja(empresa_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id,pedido_id) REFERENCES public.pedidos_loja(empresa_id,id) ON DELETE RESTRICT,
  CHECK ((estado='confirmado') = (confirmado_em IS NOT NULL)),
  CHECK (estado<>'confirmado' OR (refund_id IS NOT NULL AND refund_status='processed'
    AND mp_status IN ('processed','refunded') AND mp_status_detail='refunded' AND refund_amount=valor))
);
ALTER TABLE public.loja_reembolsos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.loja_reembolsos FROM PUBLIC,anon,authenticated;
-- Escritas exclusivamente através das funções, inclusive para service_role.
REVOKE ALL ON public.loja_reembolsos FROM service_role;

CREATE FUNCTION public.loja_painel_conciliacao(p_empresa_id uuid)
RETURNS TABLE (pagamento_id uuid,pedido_id uuid,cliente_nome text,valor numeric,paid_at timestamptz,
  pedido_status text,pagamento_status text,itens jsonb,reembolso_estado text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR public.usuario_empresa_operacional_ativo(p_empresa_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'ACESSO_NEGADO' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT pg.id,p.id,p.cliente_nome,pg.valor,pg.paid_at,p.status,pg.status,
    coalesce((SELECT jsonb_agg(jsonb_build_object('peca_id',i.peca_id,'nome',i.nome,'preco',i.preco) ORDER BY i.id)
      FROM public.pedido_itens_loja i WHERE i.empresa_id=p.empresa_id AND i.pedido_id=p.id),'[]'::jsonb),
    CASE WHEN r.estado='processando' AND r.claim_ate<=clock_timestamp() THEN 'verificacao_necessaria'
         ELSE coalesce(r.estado,'nao_iniciado') END
  FROM public.pagamentos_loja pg JOIN public.pedidos_loja p ON p.empresa_id=pg.empresa_id AND p.id=pg.pedido_id
  LEFT JOIN public.loja_reembolsos r ON r.empresa_id=pg.empresa_id AND r.pagamento_id=pg.id
  WHERE pg.empresa_id=p_empresa_id AND pg.provider='mercado_pago' AND pg.status='paid' AND pg.paid_at IS NOT NULL
    AND p.status='expirado' AND p.pago_em IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.vendas_loja v WHERE v.empresa_id=pg.empresa_id
      AND (v.pedido_id=p.id OR v.pagamento_id=pg.id))
  ORDER BY pg.paid_at DESC,pg.id LIMIT 100;
END; $$;
REVOKE ALL ON FUNCTION public.loja_painel_conciliacao(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.loja_painel_conciliacao(uuid) TO authenticated;

-- Esta RPC usa o JWT do operador, nunca o service_role da Edge para autorização.
-- Um usuário pode reivindicar uma operação do próprio tenant, mas não confirmar refund.
-- Ordem de locks: pedido -> pagamento -> operação. Nenhum lock atravessa o HTTP.
CREATE FUNCTION public.loja_preparar_reembolso(p_pagamento_id uuid,p_empresa_operadora uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pg public.pagamentos_loja%ROWTYPE; p public.pedidos_loja%ROWTYPE;
  r public.loja_reembolsos%ROWTYPE; novo boolean; claim uuid:=gen_random_uuid();
BEGIN
  SELECT * INTO pg FROM public.pagamentos_loja WHERE id=p_pagamento_id;
  IF NOT FOUND OR auth.uid() IS NULL OR pg.empresa_id IS DISTINCT FROM p_empresa_operadora
     OR public.usuario_empresa_operacional_ativo(pg.empresa_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'PAGAMENTO_INACESSIVEL' USING ERRCODE='42501'; END IF;
  SELECT * INTO p FROM public.pedidos_loja WHERE empresa_id=pg.empresa_id AND id=pg.pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PEDIDO_INACESSIVEL'; END IF;
  SELECT * INTO pg FROM public.pagamentos_loja WHERE id=p_pagamento_id FOR UPDATE;
  IF pg.empresa_id IS DISTINCT FROM p.empresa_id OR pg.pedido_id IS DISTINCT FROM p.id THEN
    RAISE EXCEPTION 'IDENTIDADE_ALTERADA' USING ERRCODE='40001'; END IF;
  SELECT * INTO r FROM public.loja_reembolsos WHERE pagamento_id=pg.id FOR UPDATE;
  novo := NOT FOUND;
  IF NOT novo AND r.estado='confirmado' AND pg.status='refunded' THEN
    RETURN jsonb_build_object('acao','confirmado'); END IF;
  IF pg.provider<>'mercado_pago' OR pg.status<>'paid' OR pg.paid_at IS NULL
    OR nullif(btrim(pg.provider_checkout_id),'') IS NULL OR nullif(btrim(pg.provider_payment_id),'') IS NULL
    OR p.status<>'expirado' OR p.pago_em IS NOT NULL OR pg.valor<=0 OR pg.moeda<>'BRL'
    OR EXISTS (SELECT 1 FROM public.vendas_loja v WHERE v.empresa_id=pg.empresa_id
      AND (v.pedido_id=p.id OR v.pagamento_id=pg.id)) THEN
    RAISE EXCEPTION 'REEMBOLSO_NAO_ELEGIVEL' USING ERRCODE='22023'; END IF;
  IF novo THEN
    INSERT INTO public.loja_reembolsos(pagamento_id,empresa_id,pedido_id,operador_id,ultimo_operador_id,
      provider_checkout_id,provider_payment_id,valor,estado,claim_id,claim_ate)
    VALUES(pg.id,pg.empresa_id,p.id,auth.uid(),auth.uid(),pg.provider_checkout_id,pg.provider_payment_id,
      pg.valor,'processando',claim,clock_timestamp()+interval '90 seconds') RETURNING * INTO r;
  ELSE
    IF r.provider_checkout_id<>pg.provider_checkout_id OR r.provider_payment_id<>pg.provider_payment_id
       OR r.valor<>pg.valor OR r.empresa_id<>pg.empresa_id OR r.pedido_id<>pg.pedido_id THEN
      RAISE EXCEPTION 'IDENTIDADE_ALTERADA'; END IF;
    IF r.estado='processando' AND r.claim_ate>clock_timestamp() THEN
      RETURN jsonb_build_object('acao','ocupado'); END IF;
    UPDATE public.loja_reembolsos SET estado='processando',claim_id=claim,
      claim_ate=clock_timestamp()+interval '90 seconds',ultimo_operador_id=auth.uid(),
      tentativas=tentativas+1,atualizado_em=clock_timestamp(),erro_codigo=NULL
      WHERE pagamento_id=pg.id RETURNING * INTO r;
  END IF;
  -- Toda nova claim válida pode retomar a operação econômica usando SEMPRE
  -- a mesma idempotency_key persistida para este pagamento.
  --
  -- O worker deve consultar a Order oficial antes do POST. Se o refund já tiver
  -- sido processado, apenas conclui localmente. Se ainda não houver prova oficial,
  -- pode repetir POST /refund com a MESMA chave idempotente.
  --
  -- Isso cobre tanto falha antes do primeiro POST quanto resposta perdida/timeout
  -- durante um POST anterior, sem criar uma segunda operação econômica.
  RETURN jsonb_build_object('acao','enviar',
    'pagamento_id',pg.id,'empresa_id',pg.empresa_id,'pedido_id',p.id,'claim_id',r.claim_id,
    'idempotency_key',r.idempotency_key,'order_id',r.provider_checkout_id,
    'payment_id',r.provider_payment_id,'valor',r.valor,'moeda',pg.moeda);
END; $$;
REVOKE ALL ON FUNCTION public.loja_preparar_reembolso(uuid,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.loja_preparar_reembolso(uuid,uuid) TO authenticated;

-- Somente o backend com prova oficial pode concluir. Claim fencing rejeita workers antigos.
CREATE FUNCTION public.loja_concluir_reembolso(p_pagamento_id uuid,p_claim_id uuid,
  p_evidencia jsonb DEFAULT NULL,p_erro_codigo text DEFAULT 'mp_aguardando')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pg public.pagamentos_loja%ROWTYPE; p public.pedidos_loja%ROWTYPE;
  r public.loja_reembolsos%ROWTYPE; instante timestamptz:=clock_timestamp();
BEGIN
  SELECT * INTO pg FROM public.pagamentos_loja WHERE id=p_pagamento_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAGAMENTO_INACESSIVEL'; END IF;
  SELECT * INTO p FROM public.pedidos_loja WHERE empresa_id=pg.empresa_id AND id=pg.pedido_id FOR UPDATE;
  SELECT * INTO pg FROM public.pagamentos_loja WHERE id=p_pagamento_id FOR UPDATE;
  SELECT * INTO r FROM public.loja_reembolsos WHERE pagamento_id=pg.id FOR UPDATE;
  IF NOT FOUND OR r.claim_id IS DISTINCT FROM p_claim_id THEN RAISE EXCEPTION 'CLAIM_INVALIDO'; END IF;
  IF r.estado='confirmado' THEN RETURN 'confirmado'; END IF;
  IF r.estado<>'processando' THEN RAISE EXCEPTION 'CLAIM_ENCERRADO'; END IF;
  IF p_evidencia IS NULL THEN
    UPDATE public.loja_reembolsos SET estado='verificacao_necessaria',erro_codigo=p_erro_codigo,
      atualizado_em=instante WHERE pagamento_id=pg.id;
    RETURN 'verificacao_necessaria';
  END IF;
  IF (p_evidencia->>'order_id') IS DISTINCT FROM r.provider_checkout_id
    OR (p_evidencia->>'payment_id') IS DISTINCT FROM r.provider_payment_id
    OR coalesce(p_evidencia->>'status','') NOT IN ('processed','refunded')
    OR (p_evidencia->>'status_detail') IS DISTINCT FROM 'refunded'
    OR (p_evidencia->>'refund_status') IS DISTINCT FROM 'processed'
    OR nullif(btrim(p_evidencia->>'refund_id'),'') IS NULL
    OR length(p_evidencia->>'refund_id')>200
    OR (p_evidencia->>'amount')::numeric IS DISTINCT FROM r.valor THEN
    RAISE EXCEPTION 'PROVA_INVALIDA'; END IF;
  IF pg.empresa_id<>r.empresa_id OR pg.pedido_id<>r.pedido_id OR p.id<>r.pedido_id
    OR pg.provider<>'mercado_pago' OR pg.status<>'paid' OR pg.paid_at IS NULL
    OR pg.provider_checkout_id IS DISTINCT FROM r.provider_checkout_id OR pg.provider_payment_id IS DISTINCT FROM r.provider_payment_id
    OR pg.valor<>r.valor OR pg.moeda<>'BRL' OR p.status<>'expirado' OR p.pago_em IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.vendas_loja v WHERE v.empresa_id=pg.empresa_id
      AND (v.pedido_id=p.id OR v.pagamento_id=pg.id)) THEN
    RAISE EXCEPTION 'REEMBOLSO_NAO_ELEGIVEL'; END IF;
  UPDATE public.pagamentos_loja SET status='refunded',refunded_at=instante,updated_at=instante
    WHERE id=pg.id;
  UPDATE public.loja_reembolsos SET estado='confirmado',confirmado_em=instante,atualizado_em=instante,
    erro_codigo=NULL,refund_id=p_evidencia->>'refund_id',mp_status=p_evidencia->>'status',
    mp_status_detail=p_evidencia->>'status_detail',refund_status=p_evidencia->>'refund_status',
    refund_amount=(p_evidencia->>'amount')::numeric WHERE pagamento_id=pg.id;
  RETURN 'confirmado';
END; $$;
REVOKE ALL ON FUNCTION public.loja_concluir_reembolso(uuid,uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.loja_concluir_reembolso(uuid,uuid,jsonb,text) TO service_role;

ALTER FUNCTION public.loja_painel_conciliacao(uuid) OWNER TO postgres;
ALTER FUNCTION public.loja_preparar_reembolso(uuid,uuid) OWNER TO postgres;
ALTER FUNCTION public.loja_concluir_reembolso(uuid,uuid,jsonb,text) OWNER TO postgres;
ALTER TABLE public.loja_reembolsos OWNER TO postgres;
