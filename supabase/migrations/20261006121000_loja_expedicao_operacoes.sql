-- Operações logísticas independentes da confirmação financeira.
-- Sem scheduler, HTTP, backfill ou alteração de loja_confirmar_pagamento.
CREATE FUNCTION public.loja_integrar_pedido_expedicao(p_empresa_id uuid, p_pedido_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  p public.pedidos_loja%ROWTYPE;
  e public.pedidos_envio%ROWTYPE;
  envio_id text;
  quantidade integer;
  codigo text;
  recuperavel boolean := false;
  instante timestamptz := clock_timestamp();
  tentativa integer;
  colisao integer;
BEGIN
  SELECT * INTO p FROM public.pedidos_loja
    WHERE empresa_id = p_empresa_id AND id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='PEDIDO_INACESSIVEL';
  END IF;
  IF p.forma_entrega <> 'envio' OR p.status <> 'pago' OR p.pago_em IS NULL THEN
    RETURN jsonb_build_object('resultado','nao_elegivel');
  END IF;

  -- Não há teste de expiração: fatos comerciais já confirmados permanecem válidos.
  SELECT v.pedido_envio_id INTO envio_id FROM public.pedido_envio_pedidos_loja v
    WHERE v.empresa_id=p_empresa_id AND v.pedido_loja_id=p.id;
  IF envio_id IS NULL AND p.expedicao_integracao_status='integrada' THEN
    codigo := 'VINCULO_AUSENTE';
  ELSIF envio_id IS NULL AND (
    NOT p.expedicao_integracao_retry_automatico OR
    p.expedicao_integracao_proxima_tentativa_em > instante
  ) THEN
    RETURN jsonb_build_object('resultado','aguardando_retry');
  END IF;

  tentativa := p.expedicao_integracao_tentativas + 1;
  UPDATE public.pedidos_loja SET
    expedicao_integracao_tentativas=tentativa,
    expedicao_integracao_ultima_tentativa_em=instante
    WHERE empresa_id=p_empresa_id AND id=p.id;

  -- Subtransação: falha de pai/vínculo/estado não deixa expedição órfã.
  BEGIN
    IF codigo IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='VALIDACAO_LOGISTICA';
    END IF;
    IF NOT coalesce(
      p.entrega_cep ~ '^[0-9]{8}$' AND btrim(p.entrega_endereco)<>''
      AND btrim(p.entrega_numero)<>'' AND btrim(p.entrega_bairro)<>''
      AND btrim(p.entrega_cidade)<>'' AND p.entrega_uf IN
      ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
       'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'),false) THEN
      codigo := 'SNAPSHOT_INVALIDO';
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='VALIDACAO_LOGISTICA';
    END IF;
    SELECT count(*) INTO quantidade FROM public.pedido_itens_loja
      WHERE empresa_id=p_empresa_id AND pedido_id=p.id;
    IF quantidade=0 THEN
      codigo := 'ITENS_AUSENTES';
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='VALIDACAO_LOGISTICA';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.pedido_itens_loja i
      WHERE i.empresa_id=p_empresa_id AND i.pedido_id=p.id AND
        (SELECT count(*) FROM public.vendas_loja v
         JOIN public.pagamentos_loja pg ON pg.empresa_id=v.empresa_id AND pg.id=v.pagamento_id
         WHERE v.empresa_id=i.empresa_id AND v.pedido_id=i.pedido_id
           AND v.pedido_item_id=i.id AND v.peca_id=i.peca_id
           AND v.cliente_id=p.cliente_id AND v.status='confirmada'
           AND v.valor_venda=i.preco AND pg.pedido_id=p.id AND pg.status='paid') <> 1
    ) OR (SELECT count(*) FROM public.vendas_loja
          WHERE empresa_id=p_empresa_id AND pedido_id=p.id) <> quantidade THEN
      codigo := 'VENDAS_INCONSISTENTES';
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='VALIDACAO_LOGISTICA';
    END IF;

    IF envio_id IS NOT NULL THEN
      SELECT * INTO e FROM public.pedidos_envio
        WHERE empresa_id=p_empresa_id AND id=envio_id FOR UPDATE;
      IF NOT FOUND OR e.cliente_id IS DISTINCT FROM p.cliente_id
         OR e.cliente_nome IS DISTINCT FROM p.cliente_nome
         OR e.quantidade_esperada IS DISTINCT FROM quantidade
         OR EXISTS (SELECT 1 FROM public.pedido_envio_sacolinhas
                    WHERE empresa_id=p_empresa_id AND pedido_envio_id=envio_id) THEN
        codigo := 'VINCULO_INCONSISTENTE';
        RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='VALIDACAO_LOGISTICA';
      END IF;
    ELSE
      -- Exatamente o formato do ERP: ENV-0 + epoch em milissegundos.
      -- Colisões não são ignoradas: repetição limitada gera outro timestamp.
      FOR colisao IN 1..5 LOOP
        envio_id := 'ENV-0' || floor(extract(epoch FROM clock_timestamp())*1000)::bigint::text;
        BEGIN
          INSERT INTO public.pedidos_envio
            (id,empresa_id,cliente_nome,cliente_id,status,quantidade_esperada,criado_em,atualizado_em)
          VALUES (envio_id,p_empresa_id,p.cliente_nome,p.cliente_id,'montagem',quantidade,
            to_char(instante AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            to_char(instante AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
          EXIT;
        EXCEPTION WHEN unique_violation THEN
          IF colisao=5 THEN RAISE; END IF;
          PERFORM pg_catalog.pg_sleep(0.002);
        END;
      END LOOP;
      INSERT INTO public.pedido_envio_pedidos_loja(empresa_id,pedido_envio_id,pedido_loja_id)
        VALUES (p_empresa_id,envio_id,p.id);
    END IF;
    UPDATE public.pedidos_loja SET expedicao_integracao_status='integrada',
      expedicao_integrada_em=coalesce(expedicao_integrada_em,instante),
      expedicao_integracao_ultimo_erro_codigo=NULL,
      expedicao_integracao_proxima_tentativa_em=NULL,
      expedicao_integracao_retry_automatico=false
      WHERE empresa_id=p_empresa_id AND id=p.id;
    RETURN jsonb_build_object('resultado','integrada','pedido_envio_id',envio_id);
  EXCEPTION WHEN serialization_failure THEN
    RAISE; -- O chamador deve repetir a transação inteira com um novo snapshot.
  WHEN OTHERS THEN
    IF codigo IS NULL THEN
      recuperavel := SQLSTATE IN ('40P01','55P03','57014','23505');
      codigo := CASE WHEN recuperavel THEN 'FALHA_TRANSITORIA' ELSE 'FALHA_LOGISTICA' END;
    END IF;
  END;

  UPDATE public.pedidos_loja SET expedicao_integracao_status='erro',
    expedicao_integrada_em=NULL, expedicao_integracao_ultimo_erro_codigo=codigo,
    expedicao_integracao_retry_automatico=(recuperavel AND tentativa<6),
    expedicao_integracao_proxima_tentativa_em=CASE WHEN recuperavel AND tentativa<6
      THEN instante + make_interval(mins => (ARRAY[1,5,15,60,360])[least(tentativa,5)]) ELSE NULL END
    WHERE empresa_id=p_empresa_id AND id=p.id;
  RETURN jsonb_build_object('resultado','erro','codigo',codigo);
END;
$$;
REVOKE ALL ON FUNCTION public.loja_integrar_pedido_expedicao(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.loja_integrar_pedido_expedicao(uuid,uuid) TO service_role;

CREATE FUNCTION public.loja_reprogramar_expedicao(p_empresa_id uuid,p_pedido_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.pedidos_loja%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.pedidos_loja WHERE empresa_id=p_empresa_id AND id=p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='PEDIDO_INACESSIVEL'; END IF;
  IF p.forma_entrega<>'envio' OR p.status<>'pago' OR p.expedicao_integracao_status<>'erro' THEN RETURN false; END IF;
  -- Estado integrado inconsistente requer investigação, não recriação automática.
  IF p.expedicao_integracao_ultimo_erro_codigo IN ('VINCULO_AUSENTE','VINCULO_INCONSISTENTE') THEN RETURN false; END IF;
  UPDATE public.pedidos_loja SET expedicao_integracao_status='pendente',
    expedicao_integracao_retry_automatico=true,expedicao_integracao_proxima_tentativa_em=NULL
    WHERE empresa_id=p_empresa_id AND id=p_pedido_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.loja_reprogramar_expedicao(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.loja_reprogramar_expedicao(uuid,uuid) TO service_role;

CREATE FUNCTION public.loja_expedicao_backlog(p_empresa_id uuid,p_limite integer DEFAULT 100)
RETURNS TABLE(pedido_id uuid,integracao_status text,tentativas integer,erro_codigo text,proxima_tentativa_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT id,expedicao_integracao_status,expedicao_integracao_tentativas,
    expedicao_integracao_ultimo_erro_codigo,expedicao_integracao_proxima_tentativa_em
  FROM public.pedidos_loja WHERE empresa_id=p_empresa_id AND forma_entrega='envio'
    AND status='pago' AND expedicao_integracao_status IN ('pendente','erro')
  ORDER BY pago_em,id LIMIT least(greatest(coalesce(p_limite,100),1),500);
$$;
REVOKE ALL ON FUNCTION public.loja_expedicao_backlog(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.loja_expedicao_backlog(uuid,integer) TO service_role;

-- Apenas a projeção ERP autorizada expõe o destino. Não ampliar grants de pedidos_loja.
CREATE FUNCTION public.loja_expedicao_ler(p_empresa_id uuid)
RETURNS TABLE(pedido_envio_id text,origem text,itens_loja jsonb,destino_loja jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF public.usuario_empresa_operacional_ativo(p_empresa_id) IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACESSO_NEGADO';
  END IF;
  RETURN QUERY SELECT l.pedido_envio_id,'loja'::text,
    coalesce((SELECT jsonb_agg(jsonb_build_object('id','loja:'||i.id::text,
      'pedido_item_id',i.id,'peca_id',i.peca_id,'nome_peca',i.nome,'valor_venda',i.preco,
      'marca',i.marca,'tamanho',i.tamanho) ORDER BY i.id)
      FROM public.pedido_itens_loja i WHERE i.empresa_id=p.empresa_id AND i.pedido_id=p.id),'[]'::jsonb),
    jsonb_build_object('cep',p.entrega_cep,'endereco',p.entrega_endereco,
      'numero',p.entrega_numero,'complemento',p.entrega_complemento,
      'bairro',p.entrega_bairro,'cidade',p.entrega_cidade,'uf',p.entrega_uf)
    FROM public.pedido_envio_pedidos_loja l JOIN public.pedidos_loja p
      ON p.empresa_id=l.empresa_id AND p.id=l.pedido_loja_id
    WHERE l.empresa_id=p_empresa_id;
END;
$$;
REVOKE ALL ON FUNCTION public.loja_expedicao_ler(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.loja_expedicao_ler(uuid) TO authenticated;

-- Finalização online: confere IDs reais, não apenas a quantidade no browser.
CREATE FUNCTION public.loja_expedicao_finalizar(p_empresa_id uuid,p_envio_id text,p_itens text[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.pedidos_loja%ROWTYPE; e public.pedidos_envio%ROWTYPE; esperado text[]; recebido text[];
BEGIN
  IF public.usuario_empresa_operacional_ativo(p_empresa_id) IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACESSO_NEGADO'; END IF;
  SELECT pl.* INTO p FROM public.pedidos_loja pl JOIN public.pedido_envio_pedidos_loja l
    ON l.empresa_id=pl.empresa_id AND l.pedido_loja_id=pl.id
    WHERE l.empresa_id=p_empresa_id AND l.pedido_envio_id=p_envio_id FOR UPDATE OF pl;
  IF NOT FOUND OR p.status<>'pago' OR p.pago_em IS NULL OR p.expedicao_integracao_status<>'integrada' THEN
    RAISE EXCEPTION 'PEDIDO_NAO_ELEGIVEL'; END IF;
  SELECT * INTO e FROM public.pedidos_envio WHERE empresa_id=p_empresa_id AND id=p_envio_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ENVIO_INEXISTENTE'; END IF;
  IF e.status='enviado' THEN RETURN true; END IF;
  IF e.status<>'montagem' THEN RAISE EXCEPTION 'ENVIO_NAO_ELEGIVEL'; END IF;
  SELECT array_agg('loja:'||id::text ORDER BY id::text) INTO esperado
    FROM public.pedido_itens_loja WHERE empresa_id=p_empresa_id AND pedido_id=p.id;
  SELECT array_agg(x ORDER BY x) INTO recebido FROM unnest(p_itens) x;
  IF coalesce(cardinality(esperado),0)=0 OR recebido IS DISTINCT FROM esperado
    OR e.quantidade_esperada IS DISTINCT FROM cardinality(esperado) THEN
    RAISE EXCEPTION 'CONFERENCIA_INVALIDA'; END IF;
  UPDATE public.pedidos_envio SET status='enviado',conferido=true,
    quantidade_conferida=cardinality(esperado),enviado_em=clock_timestamp()
    WHERE empresa_id=p_empresa_id AND id=p_envio_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.loja_expedicao_finalizar(uuid,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.loja_expedicao_finalizar(uuid,text,text[]) TO authenticated;

CREATE FUNCTION public.loja_expedicao_guardar_origem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.pedidos_envio%ROWTYPE; p public.pedidos_loja%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id OR NEW.pedido_envio_id IS DISTINCT FROM OLD.pedido_envio_id THEN
      RAISE EXCEPTION 'ORIGEM_IMUTAVEL'; END IF;
    IF TG_TABLE_NAME='pedido_envio_pedidos_loja' THEN
      IF NEW.pedido_loja_id IS DISTINCT FROM OLD.pedido_loja_id THEN RAISE EXCEPTION 'ORIGEM_IMUTAVEL'; END IF;
    END IF;
  END IF;
  IF TG_TABLE_NAME='pedido_envio_pedidos_loja' THEN
    SELECT * INTO p FROM public.pedidos_loja WHERE empresa_id=NEW.empresa_id AND id=NEW.pedido_loja_id FOR UPDATE;
    IF NOT FOUND OR p.forma_entrega<>'envio' OR p.status<>'pago' THEN RAISE EXCEPTION 'ORIGEM_INVALIDA'; END IF;
  END IF;
  -- Nova versão MVCC, sem mudar o timestamp: snapshots REPEATABLE READ antigos
  -- devem falhar com 40001, em vez de aceitar uma associação oposta invisível.
  UPDATE public.pedidos_envio AS pe SET atualizado_em=pe.atualizado_em
    WHERE pe.empresa_id=NEW.empresa_id AND pe.id=NEW.pedido_envio_id
    RETURNING pe.* INTO e;
  IF NOT FOUND THEN RAISE EXCEPTION 'ENVIO_INACESSIVEL'; END IF;
  IF TG_TABLE_NAME='pedido_envio_pedidos_loja' THEN
    IF e.cliente_id IS DISTINCT FROM p.cliente_id OR e.cliente_nome IS DISTINCT FROM p.cliente_nome
      OR EXISTS (SELECT 1 FROM public.pedido_envio_sacolinhas WHERE empresa_id=NEW.empresa_id AND pedido_envio_id=e.id) THEN
      RAISE EXCEPTION 'ORIGEM_INCOMPATIVEL'; END IF;
  ELSIF EXISTS (SELECT 1 FROM public.pedido_envio_pedidos_loja WHERE empresa_id=NEW.empresa_id AND pedido_envio_id=e.id) THEN
    RAISE EXCEPTION 'ORIGEM_INCOMPATIVEL';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.loja_expedicao_guardar_origem() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_loja_expedicao_origem BEFORE INSERT OR UPDATE ON public.pedido_envio_pedidos_loja
  FOR EACH ROW EXECUTE FUNCTION public.loja_expedicao_guardar_origem();
CREATE TRIGGER trg_live_expedicao_origem BEFORE INSERT OR UPDATE ON public.pedido_envio_sacolinhas
  FOR EACH ROW EXECUTE FUNCTION public.loja_expedicao_guardar_origem();

CREATE FUNCTION public.loja_expedicao_proteger_pai()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pedido_envio_pedidos_loja WHERE empresa_id=OLD.empresa_id AND pedido_envio_id=OLD.id) THEN
    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id OR NEW.id IS DISTINCT FROM OLD.id
      OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id OR NEW.cliente_nome IS DISTINCT FROM OLD.cliente_nome
      OR NEW.quantidade_esperada IS DISTINCT FROM OLD.quantidade_esperada THEN RAISE EXCEPTION 'ORIGEM_IMUTAVEL'; END IF;
    IF current_user IN ('anon','authenticated') AND
      (NEW.status IS DISTINCT FROM OLD.status OR NEW.conferido IS DISTINCT FROM OLD.conferido
       OR NEW.quantidade_conferida IS DISTINCT FROM OLD.quantidade_conferida OR NEW.enviado_em IS DISTINCT FROM OLD.enviado_em) THEN
      RAISE EXCEPTION 'USE_CONFERENCIA_AUTORIZADA'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.loja_expedicao_proteger_pai() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_loja_expedicao_pai BEFORE UPDATE ON public.pedidos_envio
  FOR EACH ROW EXECUTE FUNCTION public.loja_expedicao_proteger_pai();

CREATE FUNCTION public.loja_preservar_snapshot_entrega()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF ROW(NEW.entrega_cep,NEW.entrega_endereco,NEW.entrega_numero,NEW.entrega_complemento,
         NEW.entrega_bairro,NEW.entrega_cidade,NEW.entrega_uf,NEW.forma_entrega)
     IS DISTINCT FROM
     ROW(OLD.entrega_cep,OLD.entrega_endereco,OLD.entrega_numero,OLD.entrega_complemento,
         OLD.entrega_bairro,OLD.entrega_cidade,OLD.entrega_uf,OLD.forma_entrega) THEN
    RAISE EXCEPTION 'SNAPSHOT_IMUTAVEL';
  END IF;
  IF ROW(NEW.id,NEW.empresa_id,NEW.cliente_id,NEW.cliente_nome) IS DISTINCT FROM
     ROW(OLD.id,OLD.empresa_id,OLD.cliente_id,OLD.cliente_nome)
     AND EXISTS (SELECT 1 FROM public.pedido_envio_pedidos_loja WHERE empresa_id=OLD.empresa_id AND pedido_loja_id=OLD.id) THEN
    RAISE EXCEPTION 'ORIGEM_IMUTAVEL';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.loja_preservar_snapshot_entrega() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_loja_snapshot_entrega BEFORE UPDATE ON public.pedidos_loja
  FOR EACH ROW EXECUTE FUNCTION public.loja_preservar_snapshot_entrega();
