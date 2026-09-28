create or replace function public.loja_adicionar_item_carrinho(
  p_empresa_id uuid,
  p_publicacao_id uuid,
  p_token text default null
)
returns table (
  carrinho_id uuid,
  token text,
  publicacao_id uuid,
  adicionado_em timestamptz,
  expira_em timestamptz,
  quantidade_itens integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publicacao public.loja_publicacoes%rowtype;
  v_peca public.pecas%rowtype;
  v_carrinho public.loja_carrinhos%rowtype;
  v_item public.loja_carrinho_itens%rowtype;

  v_token text;
  v_token_hash bytea;

  v_agora timestamptz;
  v_quantidade integer;

  v_tentativa integer;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if p_publicacao_id is null then
    raise exception 'Publicação não informada.'
      using errcode = '22004';
  end if;

  v_agora := clock_timestamp();

  -- Trava a publicação para serializar tentativas concorrentes
  -- de adquirir lock sobre o mesmo produto.
  select lp.*
    into v_publicacao
  from public.loja_publicacoes lp
  where lp.empresa_id = p_empresa_id
    and lp.id = p_publicacao_id
  for update;

  if not found then
    raise exception 'Produto não encontrado.'
      using errcode = 'P0002';
  end if;

  if v_publicacao.publicada is not true then
    raise exception 'Produto não está disponível na loja.'
      using errcode = '22023';
  end if;

  -- A peça física continua sendo a fonte de verdade da disponibilidade.
  select p.*
    into v_peca
  from public.pecas p
  where p.empresa_id = p_empresa_id
    and p.id = v_publicacao.peca_id
  for update;

  if not found then
    raise exception 'Peça vinculada ao produto não encontrada.'
      using errcode = 'P0002';
  end if;

  if v_peca.vendido is true then
    raise exception 'Produto já foi vendido.'
      using errcode = '22023';
  end if;

  -- CARRINHO EXISTENTE
  if nullif(btrim(p_token), '') is not null then
    v_token := btrim(p_token);

    -- Tokens emitidos pela Loja possuem 32 bytes representados
    -- como 64 caracteres hexadecimais.
    if v_token !~ '^[0-9a-f]{64}$' then
      raise exception 'Token de carrinho inválido.'
        using errcode = '22023';
    end if;

    v_token_hash := extensions.digest(
      v_token,
      'sha256'
    );

    select lc.*
      into v_carrinho
    from public.loja_carrinhos lc
    where lc.empresa_id = p_empresa_id
      and lc.token_hash = v_token_hash
      and lc.status = 'ativo'
    for update;

    if not found then
      raise exception 'Carrinho não encontrado ou finalizado.'
        using errcode = 'P0002';
    end if;

    -- Locks expirados desse carrinho deixam de ocupar espaço
    -- no limite máximo de 10 itens.
    delete from public.loja_carrinho_itens lci
    where lci.empresa_id = p_empresa_id
      and lci.carrinho_id = v_carrinho.id
      and lci.expira_em <= v_agora;

  -- PRIMEIRO ITEM: O CARRINHO NASCE SOMENTE NESTE FLUXO.
  else
    for v_tentativa in 1..5 loop
      v_token := encode(
        extensions.gen_random_bytes(32),
        'hex'
      );

      v_token_hash := extensions.digest(
        v_token,
        'sha256'
      );

      begin
        insert into public.loja_carrinhos (
          empresa_id,
          token_hash,
          status
        )
        values (
          p_empresa_id,
          v_token_hash,
          'ativo'
        )
        returning *
        into v_carrinho;

        exit;

      exception
        when unique_violation then
          v_carrinho := null;
      end;
    end loop;

    if v_carrinho.id is null then
      raise exception 'Não foi possível gerar token seguro para o carrinho.'
        using errcode = 'P0001';
    end if;
  end if;

  -- Verifica se já existe lock para esta publicação.
  select lci.*
    into v_item
  from public.loja_carrinho_itens lci
  where lci.empresa_id = p_empresa_id
    and lci.publicacao_id = p_publicacao_id
  for update;

  if found then
    -- Mesmo carrinho + lock ainda válido:
    -- operação idempotente, SEM renovar os 10 minutos.
    if v_item.carrinho_id = v_carrinho.id
       and v_item.expira_em > v_agora then

      select count(*)::integer
        into v_quantidade
      from public.loja_carrinho_itens lci
      where lci.empresa_id = p_empresa_id
        and lci.carrinho_id = v_carrinho.id
        and lci.expira_em > v_agora;

      return query
      select
        v_carrinho.id,
        v_token,
        v_item.publicacao_id,
        v_item.adicionado_em,
        v_item.expira_em,
        v_quantidade;

      return;
    end if;

    -- Outro carrinho ainda possui lock válido.
    if v_item.expira_em > v_agora then
      raise exception 'Produto está temporariamente reservado em outro carrinho.'
        using errcode = '55P03';
    end if;

    -- Lock expirado pode ser reaproveitado.
    delete from public.loja_carrinho_itens
    where id = v_item.id;
  end if;

  select count(*)::integer
    into v_quantidade
  from public.loja_carrinho_itens lci
  where lci.empresa_id = p_empresa_id
    and lci.carrinho_id = v_carrinho.id
    and lci.expira_em > v_agora;

  if v_quantidade >= 10 then
    raise exception 'O carrinho permite no máximo 10 itens.'
      using errcode = '22023';
  end if;

  insert into public.loja_carrinho_itens (
    empresa_id,
    carrinho_id,
    publicacao_id,
    adicionado_em,
    expira_em
  )
  values (
    p_empresa_id,
    v_carrinho.id,
    p_publicacao_id,
    v_agora,
    v_agora + interval '10 minutes'
  )
  returning *
  into v_item;

  v_quantidade := v_quantidade + 1;

  update public.loja_carrinhos
  set updated_at = v_agora
  where id = v_carrinho.id
    and empresa_id = p_empresa_id;

  return query
  select
    v_carrinho.id,
    v_token,
    v_item.publicacao_id,
    v_item.adicionado_em,
    v_item.expira_em,
    v_quantidade;
end;
$$;

revoke all on function public.loja_adicionar_item_carrinho(
  uuid, uuid, text
) from public;

grant execute on function public.loja_adicionar_item_carrinho(
  uuid, uuid, text
) to service_role;

comment on function public.loja_adicionar_item_carrinho(
  uuid, uuid, text
)
is 'Adiciona produto ao carrinho anônimo. Sem token, cria carrinho e primeiro lock atomicamente. Lock dura exatamente 10 minutos, não é renovado automaticamente, máximo de 10 itens e somente o hash SHA-256 do token é persistido.';
