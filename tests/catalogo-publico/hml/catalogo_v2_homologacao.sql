-- HML-CATALOGO-V2 — roteiro MANUAL, nunca executar em produção.
-- Destino autorizado futuro: xmjalhnpsgqqkwyczkaq (Supabase HML).
-- Não executado na preparação deste arquivo. Executar INTEGRALMENTE numa única
-- conexão administrativa postgres, somente após autorização e conferência do host.
-- Não remover o ROLLBACK final. Em erro, a transação fica abortada: executar
-- ROLLBACK na mesma conexão se o cliente interromper antes da última instrução.
-- Para psql, ON_ERROR_STOP encerra no erro; o fechamento da conexão também aborta.
-- Confirmar o projeto abaixo apenas após conferir o painel/conexão.
-- BLOQUEADO para execução até autorização explícita do usuário.
-- Evidências da HML fornecidas pelo usuário (não consultadas remotamente aqui):
-- storage.objects não possui triggers INSERT nem regras SQL adicionais;
-- defaults informados: now(), gen_random_uuid(), false e string_to_array().
-- Nas nove tabelas de fixtures, os únicos triggers INSERT não internos são
-- trg_pecas_data_cadastro_ts e trg_pecas_data_venda_ts, em public.pecas.
-- Sem DDL/GRANT: os event triggers de DDL informados (ensure_rls,
-- issue_graphql_placeholder, issue_pg_cron_access, issue_pg_graphql_access,
-- issue_pg_net_access, pgrst_ddl_watch, pgrst_drop_watch) não são acionados
-- por criação/remoção de objetos neste roteiro: nenhuma delas é realizada.
-- DO é bloco anônimo, não cria função persistente. Contexto e oráculo passam
-- entre blocos via GUC customizada LOCAL à transação, sem tabelas ou ACLs.
-- A GUC contém apenas fixtures fictícias; não é credencial nem autoridade de
-- tenant e não é lida pela RPC. Executar todo o roteiro na mesma conexão.
-- Defaults locais inspecionados usam UUID, now(), constantes ou NULL; não foi
-- identificado HTTP/dblink/nextval nas dependências locais dessas inserções.
-- As evidências informadas não indicam efeitos externos nesses defaults/triggers.
-- ROLLBACK não desfaz efeitos externos nem avanço de sequences; se o schema ou
-- os corpos das funções divergirem da revisão, parar e reavaliar antes de executar.
-- Confirmar o projeto não substitui a autorização de execução do usuário.
-- Triggers INSERT locais de pecas apenas normalizam datas em NEW; triggers de
-- assinaturas e snapshot de entrega são UPDATE e não disparam nas fixtures.
-- Nenhum efeito externo foi identificado nesses corpos locais. A evidência de
-- nomes dos triggers não comprova igualdade dos corpos entre repositório e HML.
-- Revisão transacional: BEGIN engloba preparação postgres, GUC LOCAL, mudança
-- de papel no nível superior e asserções anon (current_user verificado).
-- RESET ROLE antecede ROLLBACK; não há COMMIT intermediário nem persistência
-- da GUC. Em erro não capturado, a transação aborta e exige o ROLLBACK indicado.
-- Execução/compilação deste roteiro e equivalência dos corpos remotos não foram
-- validadas nesta revisão; nenhuma alteração de RLS, triggers ou ACL é necessária.
-- A confirmação é uma trava humana, NÃO descobre o projeto conectado.
-- Não há UPDATE/DELETE/UPSERT de dados, alteração de ACL permanente ou bypass
-- configurado. Fixtures são inseridas como postgres; as leituras são feitas como
-- anon. Isso testa o contrato público, NÃO o caminho de escrita autenticado.
-- Dois tenants sintéticos são criados; nenhum dado da k-chic-homologacao é usado
-- além de identificar um plano já associado, somente leitura. Peças existentes
-- (inclusive as duas vendidas) não são usadas nem alteradas.
-- storage.objects: registros transacionais fictícios, SEM upload/imagem física.
-- O rollback remove metadados e fixtures; NÃO usar Storage API neste roteiro.
-- Triggers/constraints/RLS permanecem ativos. Se o schema divergir, PARAR;
-- nunca desativar controles para viabilizar a fixture.

BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

-- Bloqueio ANTES de qualquer inserção de fixture.
DO $seguranca$
DECLARE confirmacao_projeto text := 'CONFIRMAR_MANUALMENTE_PROJETO_HML';
BEGIN
  IF confirmacao_projeto <> 'xmjalhnpsgqqkwyczkaq' THEN
    RAISE EXCEPTION 'Confirme manualmente o destino HML antes de executar. Produção é proibida.';
  END IF;
  IF current_database() IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'Banco inesperado: o roteiro exige current_database() = postgres';
  END IF;
  IF current_user IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'Papel inesperado: a preparação exige current_user = postgres';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20261006110000'
  ) THEN
    RAISE EXCEPTION 'Migration HML 20261006110000 ausente; execução proibida';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20261011120000'
  ) THEN
    RAISE EXCEPTION 'Migration V2 20261011120000 ausente; execução proibida';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.empresas
    WHERE slug_publico = 'k-chic-homologacao'
  ) THEN
    RAISE EXCEPTION 'Empresa k-chic-homologacao ausente; execução proibida';
  END IF;
  -- Estes marcadores não identificam sozinhos o projeto conectado e não
  -- substituem a confirmação manual do host/projeto nem a autorização.
  -- Manter até autorização explícita do usuário; evidências não são autorização.
  RAISE EXCEPTION 'BLOQUEADO: execução do roteiro HML aguarda autorização explícita do usuário';
END;
$seguranca$;

DO $preparacao$
DECLARE
  -- Oráculo independente, montado com valores conhecidos das fixtures.
  oraculo jsonb := '[]'::jsonb;
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  prefixo text := 'HML-CATALOGO-V2-' || gen_random_uuid()::text;
  sa text; sb text; plano uuid; empresa uuid; pub uuid;
  cliente text; carrinho uuid; pedido uuid; codigo text; caminho text;
  i integer; t integer; nome_peca text; preco_texto text; preco_esperado numeric; data_publicacao timestamptz;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Preparação requer postgres; não alterar RLS/ACL para executar.';
  END IF;
  IF has_function_privilege('anon','internal.loja_catalogo_elegivel_v2(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Helper exposto a anon'; END IF;
  IF to_regprocedure('public.loja_catalogo_publico_por_slug_v2(text,text,text,text,text,text,integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'Migration V2 ausente: este roteiro não aplica migrations.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='loja-produtos') THEN
    RAISE EXCEPTION 'Bucket loja-produtos ausente; não será criado.';
  END IF;
  SELECT s.plano_id INTO plano FROM public.assinaturas s
    JOIN public.empresas e ON e.id=s.empresa_id
    WHERE e.slug_publico='k-chic-homologacao' ORDER BY s.created_at DESC LIMIT 1;
  IF plano IS NULL THEN
    RAISE EXCEPTION 'Tenant HML/assinatura/plano esperado ausente; parar para revisar schema.';
  END IF;
  sa := lower(prefixo)||'-a'; sb := lower(prefixo)||'-b';
  INSERT INTO public.empresas(id,nome,nome_fantasia,slug_publico,ativo)
    VALUES(a,prefixo||'-A',prefixo||'-A',sa,true),(b,prefixo||'-B',prefixo||'-B',sb,true);
  INSERT INTO public.assinaturas(empresa_id,plano_id,status,current_period_started_at,current_period_ends_at)
    VALUES(a,plano,'active',now(),now()+interval '1 day'),
          (b,plano,'active',now(),now()+interval '1 day');
  IF public.assinatura_empresa_operacional_ativa(a) IS NOT TRUE
     OR public.assinatura_empresa_operacional_ativa(b) IS NOT TRUE THEN
    RAISE EXCEPTION 'Fixtures de assinatura não operacionais: revisar sem contornar validação.';
  END IF;

  FOR t IN 1..2 LOOP
    empresa := CASE WHEN t=1 THEN a ELSE b END;
    FOR i IN 1..(CASE WHEN t=1 THEN 34 ELSE 1 END) LOOP
      codigo := prefixo||'-'||t||'-'||lpad(i::text,2,'0');
      pub := gen_random_uuid();
      -- Empates de nome/data (1 e 3); preços equivalentes (1,3,6,7).
      -- Inválido (4) continua elegível, porém NULLS LAST nos dois sentidos.
      nome_peca := prefixo||' '||lpad((CASE WHEN i=3 THEN 1 ELSE i END)::text,2,'0')
        ||CASE WHEN i=30 THEN ' EXCLUSIVA 100% _' ELSE '' END;
      preco_texto := CASE i WHEN 1 THEN '1.000,00' WHEN 2 THEN 'R$ 9,90'
        WHEN 3 THEN '1000.00' WHEN 4 THEN 'inválido' WHEN 5 THEN '999,99'
        WHEN 6 THEN '1000,00' WHEN 7 THEN '1000.00' ELSE (i*10)::text END;
      preco_esperado := CASE WHEN i IN (1,3,6,7) THEN 1000
        WHEN i=2 THEN 9.90 WHEN i=4 THEN NULL WHEN i=5 THEN 999.99 ELSE i*10 END;
      data_publicacao := now()-(CASE WHEN i=3 THEN 1 ELSE i END)*interval '1 minute';
      IF t=1 AND i<=30 THEN
        oraculo := oraculo || jsonb_build_array(jsonb_build_object(
          'publicacao_id',pub,'nome',nome_peca,
          'preco_num',preco_esperado,'publicada_em',data_publicacao));
      END IF;
      INSERT INTO public.pecas(id,empresa_id,nome,venda,obs,vendido)
      VALUES(codigo,empresa,
        nome_peca,preco_texto,
        prefixo||' observação pública fictícia',i=31);
      INSERT INTO public.loja_publicacoes(id,empresa_id,peca_id,slug,marca,categoria,tamanho,condicao,descricao,publicada,publicada_em)
      VALUES(pub,empresa,codigo,lower(prefixo)||'-peca-'||i,
        prefixo||CASE WHEN t=2 THEN '-B' WHEN i=30 THEN '-ESPECIAL' ELSE '-MARCA' END,
        CASE WHEN i=30 THEN 'blusas' ELSE 'vestidos' END,
        CASE WHEN i=30 THEN 'P' ELSE 'M' END,'bom',prefixo||' descrição fictícia',i<>32,
        data_publicacao);
      caminho := empresa::text||'/'||pub::text||'/'||codigo||'.jpg';
      INSERT INTO public.loja_publicacao_fotos(empresa_id,publicacao_id,storage_path,ordem,principal,mime_type,tamanho_bytes)
        VALUES(empresa,pub,caminho,1,true,'image/jpeg',100);
      -- i=34 tem registro de galeria mas NÃO tem metadado Storage.
      IF i<>34 THEN
        INSERT INTO storage.objects(bucket_id,name,metadata)
          VALUES('loja-produtos',caminho,'{"size":100,"mimetype":"image/jpeg"}'::jsonb);
      END IF;
      IF i=33 THEN
        cliente := prefixo||'-CLIENTE'; carrinho:=gen_random_uuid(); pedido:=gen_random_uuid();
        INSERT INTO public.clientes(id,empresa_id,nome,cpf,telefone)
          VALUES(cliente,empresa,prefixo||' cliente fictício','00000000000','00000000000');
        INSERT INTO public.loja_carrinhos(id,empresa_id,token_hash)
          VALUES(carrinho,empresa,decode(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'hex'));
        INSERT INTO public.pedidos_loja(id,empresa_id,carrinho_id,cliente_id,token_publico_hash,
          cliente_nome,cliente_cpf,cliente_telefone,status,forma_entrega,subtotal,valor_frete,total,pagamento_expira_em)
          VALUES(pedido,empresa,carrinho,cliente,
            decode(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'hex'),
            prefixo||' cliente fictício','00000000000','00000000000','pendente_pagamento','retirada',330,0,330,now()+interval '1 hour');
        INSERT INTO public.pedido_itens_loja(empresa_id,pedido_id,publicacao_id,peca_id,nome,preco)
          VALUES(empresa,pedido,pub,codigo,prefixo||' item pendente',330);
      END IF;
    END LOOP;
  END LOOP;
  -- true restringe a configuração à transação; ROLLBACK restaura o estado
  -- anterior. Namespace exclusivo, sem alterar role, claims ou search_path.
  PERFORM pg_catalog.set_config('hml_catalogo_v2.contexto',
    jsonb_build_object('tenant_a',a,'tenant_b',b,'slug_a',sa,'slug_b',sb,
      'prefixo',prefixo,'oraculo',oraculo)::text, true);
END;
$preparacao$;

-- Troca efetiva de papel no nível superior, fora de qualquer DO.
SET LOCAL ROLE anon;

DO $assercoes$
DECLARE
  contexto jsonb; oraculo jsonb; sa text; sb text; prefixo text;
  r jsonb; pagina1 jsonb; pagina2 jsonb; ordenados jsonb;
  ordem text; filtro text; k integer; ids integer; esperados jsonb; recebidos jsonb;
BEGIN
  IF current_user <> 'anon' THEN RAISE EXCEPTION 'RPC não está sendo testada como anon'; END IF;
  contexto := nullif(pg_catalog.current_setting('hml_catalogo_v2.contexto',true),'')::jsonb;
  IF jsonb_typeof(contexto) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Contexto ausente/inválido; executar preparação e asserções na mesma transação/conexão';
  END IF;
  sa := contexto->>'slug_a'; sb := contexto->>'slug_b'; prefixo := contexto->>'prefixo';
  oraculo := contexto->'oraculo';
  IF sa IS NULL OR sb IS NULL OR sa=sb OR prefixo IS NULL
     OR prefixo NOT LIKE 'HML-CATALOGO-V2-%'
     OR jsonb_typeof(oraculo) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Contexto ou oráculo incompleto';
  END IF;
  IF jsonb_array_length(oraculo) IS DISTINCT FROM 30 THEN
    RAISE EXCEPTION 'Oráculo deve conter exatamente os 30 produtos elegíveis';
  END IF;
  r:=public.loja_catalogo_publico_por_slug_v2(sa,p_limite=>100);
  IF jsonb_array_length(r->'produtos') IS DISTINCT FROM 30 THEN
    RAISE EXCEPTION 'Esperadas 30 elegíveis: vendidos/inativos/pendentes/sem Storage devem ser excluídos';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'produtos') p
    WHERE p->>'slug' NOT LIKE lower(prefixo)||'-peca-%'
      OR (split_part(p->>'slug','-peca-',2))::integer NOT BETWEEN 1 AND 30) THEN
    RAISE EXCEPTION 'Produto indevido no catálogo A';
  END IF;
  IF NOT (r->'opcoes'->'marcas' @> jsonb_build_array(prefixo||'-ESPECIAL'))
     OR (r->'opcoes'->'marcas' @> jsonb_build_array(prefixo||'-B')) THEN
    RAISE EXCEPTION 'Opções incompletas ou vazamento de tenant B';
  END IF;

  pagina1:=public.loja_catalogo_publico_por_slug_v2(sa);
  pagina2:=public.loja_catalogo_publico_por_slug_v2(sa,p_offset=>24);
  IF jsonb_array_length(pagina1->'produtos')<>24 OR pagina1->'tem_mais'<>'true'::jsonb
     OR jsonb_array_length(pagina2->'produtos')<>6 OR pagina2->'tem_mais'<>'false'::jsonb THEN
    RAISE EXCEPTION 'Paginação padrão/tem_mais incorretos';
  END IF;
  SELECT count(DISTINCT p->>'publicacao_id') INTO ids
    FROM jsonb_array_elements((pagina1->'produtos')||(pagina2->'produtos')) p;
  IF ids<>30 THEN RAISE EXCEPTION 'Páginas duplicadas ou incompletas'; END IF;
  -- Recentes também é validada integralmente abaixo, inclusive empate por UUID.
  FOR k IN 0..1 LOOP
    r:=public.loja_catalogo_publico_por_slug_v2(sa,p_limite=>15,p_offset=>k*15);
    IF jsonb_array_length(r->'produtos')<>15 OR (r->>'tem_mais')::boolean<>(k=0) THEN
      RAISE EXCEPTION 'LIMIT+1 incorreto na última página cheia'; END IF;
  END LOOP;
  r:=public.loja_catalogo_publico_por_slug_v2(sa,p_offset=>30);
  IF r->'produtos'<>'[]'::jsonb OR r->'tem_mais'<>'false'::jsonb THEN
    RAISE EXCEPTION 'Página após o fim incorreta'; END IF;

  FOREACH filtro IN ARRAY ARRAY['  exclusiva 100% _  ','%','_'] LOOP
    r:=public.loja_catalogo_publico_por_slug_v2(sa,p_busca=>filtro);
    IF jsonb_array_length(r->'produtos')<>1 OR r->'produtos'->0->>'slug'<>lower(prefixo)||'-peca-30' THEN
      RAISE EXCEPTION 'Busca global/literal incorreta: %',filtro; END IF;
  END LOOP;
  FOR k IN 1..4 LOOP
    r:=public.loja_catalogo_publico_por_slug_v2(sa,
      p_categoria=>CASE WHEN k IN (1,4) THEN 'blusas' END,
      p_marca=>CASE WHEN k IN (2,4) THEN lower(prefixo)||'-especial' END,
      p_tamanho=>CASE WHEN k IN (3,4) THEN 'p' END,
      p_busca=>CASE WHEN k=4 THEN 'EXCLUSIVA' END);
    IF jsonb_array_length(r->'produtos') IS DISTINCT FROM 1
       OR (r->'produtos'->0->>'slug') IS DISTINCT FROM (lower(prefixo)||'-peca-30') THEN
      RAISE EXCEPTION 'Filtro individual/combinado falhou: %',k; END IF;
  END LOOP;
  r:=public.loja_catalogo_publico_por_slug_v2(sa,p_busca=>'SEM-CORRESPONDENCIA-FICTICIA');
  IF r->'produtos'<>'[]'::jsonb OR jsonb_array_length(r->'opcoes'->'marcas')<>2 THEN
    RAISE EXCEPTION 'Busca vazia deve preservar opções globais'; END IF;

  FOREACH ordem IN ARRAY ARRAY['recentes','menor-preco','maior-preco','nome'] LOOP
    ordenados:=public.loja_catalogo_publico_por_slug_v2(sa,p_ordem=>ordem,p_limite=>100);
    IF ordenados IS DISTINCT FROM public.loja_catalogo_publico_por_slug_v2(sa,p_ordem=>ordem,p_limite=>100) THEN
      RAISE EXCEPTION 'Ordenação instável: %',ordem; END IF;
    -- Critérios exatos da RPC; preço esperado é explícito, não recalculado
    -- pelo helper sob teste. Desempate UUID ASC, nunca data/nome implícitos.
    SELECT jsonb_agg(publicacao_id ORDER BY
      CASE WHEN ordem='menor-preco' THEN preco_num END ASC NULLS LAST,
      CASE WHEN ordem='maior-preco' THEN preco_num END DESC NULLS LAST,
      CASE WHEN ordem='nome' THEN lower(nome) END ASC NULLS LAST,
      CASE WHEN ordem='recentes' THEN publicada_em END DESC NULLS LAST,
      publicacao_id ASC)
      INTO esperados FROM jsonb_to_recordset(oraculo) AS esperado(
        publicacao_id uuid, nome text, preco_num numeric, publicada_em timestamptz);
    SELECT jsonb_agg(p->'publicacao_id' ORDER BY pos) INTO recebidos
      FROM jsonb_array_elements(ordenados->'produtos') WITH ORDINALITY AS x(p,pos);
    IF recebidos IS DISTINCT FROM esperados THEN
      RAISE EXCEPTION 'Sequência completa/preço/desempate incorretos: %',ordem;
    END IF;
    pagina1:=public.loja_catalogo_publico_por_slug_v2(sa,p_ordem=>ordem,p_limite=>15);
    pagina2:=public.loja_catalogo_publico_por_slug_v2(sa,p_ordem=>ordem,p_limite=>15,p_offset=>15);
    IF ((pagina1->'produtos') || (pagina2->'produtos'))
       IS DISTINCT FROM (ordenados->'produtos') THEN
      RAISE EXCEPTION 'Ordenação antes da paginação inconsistente: %',ordem; END IF;
  END LOOP;

  r:=public.loja_catalogo_publico_por_slug_v2(sb);
  IF jsonb_array_length(r->'produtos')<>1 OR r->'produtos'->0->>'marca'<>prefixo||'-B'
    OR r->'opcoes'->'marcas'<>jsonb_build_array(prefixo||'-B') THEN
    RAISE EXCEPTION 'Isolamento B incorreto'; END IF;
  IF public.loja_catalogo_publico_por_slug_v2(sa,p_marca=>prefixo||'-B')->'produtos'<>'[]'::jsonb THEN
    RAISE EXCEPTION 'Filtro atravessou tenants'; END IF;
  RAISE NOTICE 'HML-CATALOGO-V2: asserções aprovadas; rollback obrigatório a seguir. Não houve teste de imagem física/upload.';
END;
$assercoes$;

RESET ROLE;
ROLLBACK;
-- FIM: nenhum fixture deve persistir. Não substituir ROLLBACK por COMMIT.
