create or replace function public.loja_criar_pedido_checkout(
  p_empresa_id uuid,
  p_token text,
  p_nome text,
  p_cpf text,
  p_telefone text
)
returns table (
  pedido_id uuid,
  pedido_token text,
  cliente_id text,
  status text,
  subtotal numeric,
  total numeric,
  pagamento_expira_em timestamptz,
  quantidade_itens integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_carrinho public.loja_carrinhos%rowtype;
  v_pedido public.pedidos_loja%rowtype;

  v_token text;
  v_token_hash bytea;

  v_pedido_token text;
  v_pedido_token_hash bytea;

  v_nome text;
  v_cpf text;
  v_telefone text;
  v_cliente_id text;

  v_agora timestamptz;
  v_min_expira_em timestamptz;
  v_pagamento_expira_em timestamptz;

  v_quantidade integer;
  v_subtotal numeric(12,2) := 0;
  v_preco numeric(12,2);

  v_preco_texto text;
  v_preco_limpo text;

  v_item record;
  v_tentativa integer;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  -- --------------------------------------------------------------------------
  -- TOKEN DO CARRINHO
  -- --------------------------------------------------------------------------

  v_token := btrim(coalesce(p_token, ''));

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
  for update;

  if not found then
    raise exception 'Carrinho não encontrado.'
      using errcode = 'P0002';
  end if;

  -- Token público do pedido derivado de um token de carrinho
  -- aleatório de 256 bits. Isso torna a repetição do checkout idempotente.
  v_pedido_token := encode(
    extensions.digest(
      'pedido:' || v_token,
      'sha256'
    ),
    'hex'
  );

  v_pedido_token_hash := extensions.digest(
    v_pedido_token,
    'sha256'
  );

  -- Se este carrinho já foi convertido, devolve o mesmo pedido.
  if v_carrinho.status = 'convertido' then
    select pl.*
      into v_pedido
    from public.pedidos_loja pl
    where pl.empresa_id = p_empresa_id
      and pl.carrinho_id = v_carrinho.id
    limit 1;

    if not found then
      raise exception 'Carrinho convertido sem pedido correspondente.'
        using errcode = 'P0001';
    end if;

    select count(*)::integer
      into v_quantidade
    from public.pedido_itens_loja pil
    where pil.empresa_id = p_empresa_id
      and pil.pedido_id = v_pedido.id;

    return query
    select
      v_pedido.id,
      v_pedido_token,
      v_pedido.cliente_id,
      v_pedido.status,
      v_pedido.subtotal,
      v_pedido.total,
      v_pedido.pagamento_expira_em,
      v_quantidade;

    return;
  end if;

  if v_carrinho.status <> 'ativo' then
    raise exception 'Carrinho indisponível para checkout.'
      using errcode = '22023';
  end if;

  -- --------------------------------------------------------------------------
  -- DADOS DO CLIENTE
  -- --------------------------------------------------------------------------

  v_nome := btrim(coalesce(p_nome, ''));
  v_cpf := regexp_replace(
    coalesce(p_cpf, ''),
    '[^0-9]',
    '',
    'g'
  );
  v_telefone := regexp_replace(
    coalesce(p_telefone, ''),
    '[^0-9]',
    '',
    'g'
  );

  if v_nome = '' then
    raise exception 'Nome obrigatório.'
      using errcode = '22023';
  end if;

  if char_length(v_cpf) <> 11 then
    raise exception 'CPF inválido.'
      using errcode = '22023';
  end if;

  if char_length(v_telefone) not in (10, 11) then
    raise exception 'Telefone inválido.'
      using errcode = '22023';
  end if;

  -- --------------------------------------------------------------------------
  -- TRAVA OS ITENS DO CARRINHO
  -- --------------------------------------------------------------------------

  -- O carrinho já está travado. Como todas as mutações normais do carrinho
  -- também começam pelo carrinho, podemos validar seus itens antes de
  -- adquirir os locks físicos dos produtos.
  v_agora := clock_timestamp();

  select
    count(*)::integer,
    min(lci.expira_em)
    into
      v_quantidade,
      v_min_expira_em
  from public.loja_carrinho_itens lci
  where lci.empresa_id = p_empresa_id
    and lci.carrinho_id = v_carrinho.id;

  if v_quantidade = 0 then
    raise exception 'Carrinho vazio.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.loja_carrinho_itens lci
    where lci.empresa_id = p_empresa_id
      and lci.carrinho_id = v_carrinho.id
      and lci.expira_em <= v_agora
  ) then
    raise exception 'Um ou mais itens do carrinho expiraram.'
      using errcode = '22023';
  end if;

  -- --------------------------------------------------------------------------
  -- TRAVA PUBLICAÇÕES E PEÇAS.
  --
  -- A ordem por peça mantém aquisição determinística dos locks.
  -- Essa trava forma a proteção atômica contra concorrência com a Live.
  -- --------------------------------------------------------------------------

  perform 1
  from public.loja_carrinho_itens lci
  join public.loja_publicacoes lp
    on lp.empresa_id = lci.empresa_id
   and lp.id = lci.publicacao_id
  join public.pecas p
    on p.empresa_id = lp.empresa_id
   and p.id = lp.peca_id
  where lci.empresa_id = p_empresa_id
    and lci.carrinho_id = v_carrinho.id
  order by p.id
  for update of lp, p;

  -- Depois de publicação e peça, trava também as linhas dos itens.
  -- A ordem fica igual à RPC de adicionar:
  -- carrinho -> publicação -> peça -> item.
  perform 1
  from public.loja_carrinho_itens lci
  where lci.empresa_id = p_empresa_id
    and lci.carrinho_id = v_carrinho.id
  order by lci.publicacao_id
  for update;

  v_agora := clock_timestamp();

  -- Revalida expiração depois de possíveis esperas pelos locks.
  if exists (
    select 1
    from public.loja_carrinho_itens lci
    where lci.empresa_id = p_empresa_id
      and lci.carrinho_id = v_carrinho.id
      and lci.expira_em <= v_agora
  ) then
    raise exception 'Um ou mais itens do carrinho expiraram durante o checkout.'
      using errcode = '22023';
  end if;

  -- Produto precisa continuar publicado e fisicamente disponível.
  if exists (
    select 1
    from public.loja_carrinho_itens lci
    left join public.loja_publicacoes lp
      on lp.empresa_id = lci.empresa_id
     and lp.id = lci.publicacao_id
    left join public.pecas p
      on p.empresa_id = lp.empresa_id
     and p.id = lp.peca_id
    where lci.empresa_id = p_empresa_id
      and lci.carrinho_id = v_carrinho.id
      and (
        lp.id is null
        or lp.publicada is not true
        or p.id is null
        or p.vendido is true
      )
  ) then
    raise exception 'Um ou mais produtos não estão mais disponíveis.'
      using errcode = '22023';
  end if;

  -- Outro pedido pendente não pode reservar a mesma peça.
  if exists (
    select 1
    from public.loja_carrinho_itens lci
    join public.loja_publicacoes lp
      on lp.empresa_id = lci.empresa_id
     and lp.id = lci.publicacao_id
    join public.pedido_itens_loja pil
      on pil.empresa_id = lp.empresa_id
     and pil.peca_id = lp.peca_id
    join public.pedidos_loja pl
      on pl.empresa_id = pil.empresa_id
     and pl.id = pil.pedido_id
    where lci.empresa_id = p_empresa_id
      and lci.carrinho_id = v_carrinho.id
      and pl.status = 'pendente_pagamento'
      and pl.pagamento_expira_em > v_agora
  ) then
    raise exception 'Um ou mais produtos já estão reservados por outro pedido.'
      using errcode = '55P03';
  end if;

  -- --------------------------------------------------------------------------
  -- CALCULA SUBTOTAL A PARTIR DA FONTE DE VERDADE
  -- --------------------------------------------------------------------------

  v_subtotal := 0;

  for v_item in
    select
      p.venda
    from public.loja_carrinho_itens lci
    join public.loja_publicacoes lp
      on lp.empresa_id = lci.empresa_id
     and lp.id = lci.publicacao_id
    join public.pecas p
      on p.empresa_id = lp.empresa_id
     and p.id = lp.peca_id
    where lci.empresa_id = p_empresa_id
      and lci.carrinho_id = v_carrinho.id
    order by p.id
  loop
    v_preco_texto := coalesce(v_item.venda, '');

    v_preco_limpo := replace(
      replace(
        regexp_replace(
          replace(v_preco_texto, chr(160), ''),
          '\s',
          '',
          'g'
        ),
        'R$',
        ''
      ),
      ' ',
      ''
    );

    if v_preco_limpo ~ '^[0-9]+(\.[0-9]{3})*(,[0-9]{1,2})?$' then
      v_preco := replace(
        replace(v_preco_limpo, '.', ''),
        ',',
        '.'
      )::numeric(12,2);

    elsif v_preco_limpo ~ '^[0-9]+(\.[0-9]{1,2})?$' then
      v_preco := v_preco_limpo::numeric(12,2);

    else
      raise exception 'Preço inválido em um dos produtos.'
        using errcode = '22023';
    end if;

    if v_preco <= 0 then
      raise exception 'Preço inválido em um dos produtos.'
        using errcode = '22023';
    end if;

    v_subtotal := v_subtotal + v_preco;
  end loop;

  -- Regra definida para o checkout:
  -- menor expiração dos itens + 5 minutos.
  v_pagamento_expira_em :=
    v_min_expira_em + interval '5 minutes';

  if v_pagamento_expira_em <= v_agora then
    raise exception 'Prazo de pagamento inválido.'
      using errcode = '22023';
  end if;

  -- --------------------------------------------------------------------------
  -- REUTILIZA OU CRIA CLIENTE PELO CPF DENTRO DA EMPRESA
  -- --------------------------------------------------------------------------

  select c.id
    into v_cliente_id
  from public.clientes c
  where c.empresa_id = p_empresa_id
    and regexp_replace(
      coalesce(c.cpf, ''),
      '[^0-9]',
      '',
      'g'
    ) = v_cpf
  limit 1;

  if v_cliente_id is null then
    for v_tentativa in 1..5 loop
      v_cliente_id :=
        'CLI-' ||
        floor(
          extract(epoch from clock_timestamp()) * 1000
        )::bigint::text ||
        lpad(
          floor(random() * 1000)::int::text,
          3,
          '0'
        );

      begin
        insert into public.clientes (
          id,
          nome,
          cpf,
          telefone,
          cep,
          endereco,
          numero,
          complemento,
          criado_em,
          empresa_id
        )
        values (
          v_cliente_id,
          v_nome,
          v_cpf,
          v_telefone,
          '',
          '',
          '',
          '',
          clock_timestamp(),
          p_empresa_id
        );

        exit;

      exception
        when unique_violation then
          -- Pode ser concorrência pelo mesmo CPF.
          select c.id
            into v_cliente_id
          from public.clientes c
          where c.empresa_id = p_empresa_id
            and regexp_replace(
              coalesce(c.cpf, ''),
              '[^0-9]',
              '',
              'g'
            ) = v_cpf
          limit 1;

          if v_cliente_id is not null then
            exit;
          end if;

          -- Se foi apenas colisão rara do ID, tenta novamente.
          v_cliente_id := null;
      end;
    end loop;

    if v_cliente_id is null then
      raise exception 'Não foi possível criar ou localizar o cliente.'
        using errcode = 'P0001';
    end if;
  end if;

  -- --------------------------------------------------------------------------
  -- CRIA PEDIDO
  -- --------------------------------------------------------------------------

  insert into public.pedidos_loja (
    empresa_id,
    carrinho_id,
    cliente_id,
    token_publico_hash,
    status,
    cliente_nome,
    cliente_cpf,
    cliente_telefone,
    forma_entrega,
    subtotal,
    valor_frete,
    total,
    pagamento_expira_em,
    criado_em,
    atualizado_em
  )
  values (
    p_empresa_id,
    v_carrinho.id,
    v_cliente_id,
    v_pedido_token_hash,
    'pendente_pagamento',
    v_nome,
    v_cpf,
    v_telefone,
    'retirada',
    v_subtotal,
    0,
    v_subtotal,
    v_pagamento_expira_em,
    v_agora,
    v_agora
  )
  returning *
  into v_pedido;

  -- --------------------------------------------------------------------------
  -- SNAPSHOTS DOS ITENS
  -- --------------------------------------------------------------------------

  for v_item in
    select
      lp.id as publicacao_id,
      lp.peca_id,
      lp.marca,
      lp.categoria,
      lp.tamanho,
      lp.condicao,
      lp.descricao,
      p.nome,
      p.venda,
      p.obs,
      (
        select lpf.storage_path
        from public.loja_publicacao_fotos lpf
        where lpf.empresa_id = lp.empresa_id
          and lpf.publicacao_id = lp.id
          and lpf.principal is true
        limit 1
      ) as foto_principal
    from public.loja_carrinho_itens lci
    join public.loja_publicacoes lp
      on lp.empresa_id = lci.empresa_id
     and lp.id = lci.publicacao_id
    join public.pecas p
      on p.empresa_id = lp.empresa_id
     and p.id = lp.peca_id
    where lci.empresa_id = p_empresa_id
      and lci.carrinho_id = v_carrinho.id
    order by p.id
  loop
    v_preco_texto := coalesce(v_item.venda, '');

    v_preco_limpo := replace(
      replace(
        regexp_replace(
          replace(v_preco_texto, chr(160), ''),
          '\s',
          '',
          'g'
        ),
        'R$',
        ''
      ),
      ' ',
      ''
    );

    if v_preco_limpo ~ '^[0-9]+(\.[0-9]{3})*(,[0-9]{1,2})?$' then
      v_preco := replace(
        replace(v_preco_limpo, '.', ''),
        ',',
        '.'
      )::numeric(12,2);

    elsif v_preco_limpo ~ '^[0-9]+(\.[0-9]{1,2})?$' then
      v_preco := v_preco_limpo::numeric(12,2);

    else
      raise exception 'Preço inválido em um dos produtos.'
        using errcode = '22023';
    end if;

    if v_preco <= 0 then
      raise exception 'Preço inválido em um dos produtos.'
        using errcode = '22023';
    end if;

    insert into public.pedido_itens_loja (
      empresa_id,
      pedido_id,
      publicacao_id,
      peca_id,
      nome,
      preco,
      marca,
      categoria,
      tamanho,
      condicao,
      descricao,
      obs,
      foto_principal,
      criado_em
    )
    values (
      p_empresa_id,
      v_pedido.id,
      v_item.publicacao_id,
      v_item.peca_id,
      v_item.nome,
      v_preco,
      v_item.marca,
      v_item.categoria,
      v_item.tamanho,
      v_item.condicao,
      v_item.descricao,
      v_item.obs,
      v_item.foto_principal,
      v_agora
    );
  end loop;

  -- --------------------------------------------------------------------------
  -- CONVERTE O CARRINHO
  -- --------------------------------------------------------------------------

  update public.loja_carrinhos
  set
    status = 'convertido',
    finalizado_em = v_agora,
    updated_at = v_agora
  where empresa_id = p_empresa_id
    and id = v_carrinho.id
    and status = 'ativo';

  if not found then
    raise exception 'Carrinho não pôde ser convertido.'
      using errcode = 'P0001';
  end if;

  return query
  select
    v_pedido.id,
    v_pedido_token,
    v_cliente_id,
    v_pedido.status,
    v_pedido.subtotal,
    v_pedido.total,
    v_pedido.pagamento_expira_em,
    v_quantidade;
end;
$$;

revoke execute
on function public.loja_criar_pedido_checkout(
  uuid,
  text,
  text,
  text,
  text
)
from public;

revoke execute
on function public.loja_criar_pedido_checkout(
  uuid,
  text,
  text,
  text,
  text
)
from anon;

revoke execute
on function public.loja_criar_pedido_checkout(
  uuid,
  text,
  text,
  text,
  text
)
from authenticated;

grant execute
on function public.loja_criar_pedido_checkout(
  uuid,
  text,
  text,
  text,
  text
)
to service_role;

comment on function public.loja_criar_pedido_checkout(
  uuid,
  text,
  text,
  text,
  text
)
is 'Converte atomicamente carrinho ativo em pedido pendente de pagamento. Trava peças contra concorrência, reutiliza/cria cliente por CPF, cria snapshots e usa menor expiração dos itens + 5 minutos como prazo de pagamento. Uso exclusivo via service_role.';
