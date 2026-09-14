drop function if exists public.portal_cliente_dados(text, text);

create or replace function public.portal_cliente_dados(
  p_empresa_slug text,
  p_codigo text default null,
  p_live_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_empresa_id uuid;

  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_live_id text := trim(coalesce(p_live_id, ''));

  v_sacolinha_origem public.sacolinhas_live%rowtype;
  v_sacolinha public.sacolinhas_live%rowtype;
  v_pedido public.pedidos_envio%rowtype;

  v_lives jsonb := '[]'::jsonb;
  v_vendas jsonb := '[]'::jsonb;
  v_pecas jsonb := '[]'::jsonb;
begin

  /*
    EMPRESA / TENANT
  */

  select e.id
  into v_empresa_id
  from public.empresas e
  where e.slug_publico = lower(trim(coalesce(p_empresa_slug, '')))
    and e.ativo = true
  limit 1;

  if v_empresa_id is null then
    return jsonb_build_object(
      'lives', '[]'::jsonb,
      'sacolinha', null,
      'vendas', '[]'::jsonb,
      'pecas', '[]'::jsonb,
      'pedido_envio', null
    );
  end if;


  /*
    ÚLTIMAS LIVES DA EMPRESA
  */

  select coalesce(
    jsonb_agg(
      x.item
      order by
        x.prioridade_aberta asc,
        x.ultima_venda_real desc nulls last,
        x.criado_em desc
    ),
    '[]'::jsonb
  )
  into v_lives
  from (
    select
      l.criado_em,

      case
        when l.status = 'aberta' then 0
        else 1
      end as prioridade_aberta,

      max(
        case
          when v.data_hora ~ '^\d{2}/\d{2}/\d{4},'
            then to_timestamp(
              v.data_hora,
              'DD/MM/YYYY, HH24:MI:SS'
            )

          when v.data_hora ~ '^\d{4}-\d{2}-\d{2}'
            then v.data_hora::timestamptz

          else null
        end
      ) as ultima_venda_real,

      jsonb_build_object(
        'id', l.id,
        'nome', l.nome,
        'status', l.status,
        'criado_em', l.criado_em
      ) as item

    from public.lives l

    left join public.vendas_live v
      on v.live_id::text = l.id::text
      and v.empresa_id = v_empresa_id

    where l.empresa_id = v_empresa_id

    group by
      l.id,
      l.nome,
      l.status,
      l.criado_em

    order by
      case
        when l.status = 'aberta' then 0
        else 1
      end asc,

      max(
        case
          when v.data_hora ~ '^\d{2}/\d{2}/\d{4},'
            then to_timestamp(
              v.data_hora,
              'DD/MM/YYYY, HH24:MI:SS'
            )

          when v.data_hora ~ '^\d{4}-\d{2}-\d{2}'
            then v.data_hora::timestamptz

          else null
        end
      ) desc nulls last,

      l.criado_em desc

    limit 3
  ) x;


  /*
    SEM CÓDIGO:
    chamada utilizada apenas para montar o seletor.
  */

  if v_codigo = '' then
    return jsonb_build_object(
      'lives', v_lives,
      'sacolinha', null,
      'vendas', '[]'::jsonb,
      'pecas', '[]'::jsonb,
      'pedido_envio', null
    );
  end if;


  /*
    1. TOKEN ORIGINAL
  */

  select s.*
  into v_sacolinha_origem
  from public.sacolinhas_live s
  where s.empresa_id = v_empresa_id
    and (
      upper(coalesce(s.portal_token::text, '')) = v_codigo
      or s.id::text = trim(p_codigo)
    )
  order by
    case
      when upper(coalesce(s.portal_token::text, '')) = v_codigo
        then 0
      else 1
    end
  limit 1;


  if not found then
    return jsonb_build_object(
      'lives', v_lives,
      'sacolinha', null,
      'vendas', '[]'::jsonb,
      'pecas', '[]'::jsonb,
      'pedido_envio', null
    );
  end if;


  /*
    2. LIVE SELECIONADA
  */

  if v_live_id <> '' then

    select s.*
    into v_sacolinha
    from public.sacolinhas_live s
    where s.empresa_id = v_empresa_id
      and s.live_id::text = v_live_id
      and (
        (
          v_sacolinha_origem.cliente_id is not null
          and s.cliente_id::text =
              v_sacolinha_origem.cliente_id::text
        )
        or
        (
          v_sacolinha_origem.cliente_id is null
          and lower(trim(coalesce(s.cliente_nome, ''))) =
              lower(trim(coalesce(v_sacolinha_origem.cliente_nome, '')))
        )
      )
    order by s.criado_em desc nulls last
    limit 1;


    if not found then
      return jsonb_build_object(
        'lives', v_lives,
        'sacolinha', null,
        'vendas', '[]'::jsonb,
        'pecas', '[]'::jsonb,
        'pedido_envio', null
      );
    end if;

  else
    v_sacolinha := v_sacolinha_origem;
  end if;


  /*
    VENDAS DA SACOLINHA
  */

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'live_id', v.live_id,
        'sacolinha_id', v.sacolinha_id,
        'peca_id', v.peca_id,
        'nome_peca', v.nome_peca,
        'valor_venda', v.valor_venda,
        'data_hora', v.data_hora,
        'status_pagamento', v.status_pagamento
      )
      order by
        case
          when v.data_hora ~ '^\d{2}/\d{2}/\d{4},'
            then to_timestamp(
              v.data_hora,
              'DD/MM/YYYY, HH24:MI:SS'
            )

          when v.data_hora ~ '^\d{4}-\d{2}-\d{2}'
            then v.data_hora::timestamptz

          else null
        end desc nulls last
    ),
    '[]'::jsonb
  )
  into v_vendas
  from public.vendas_live v
  where v.empresa_id = v_empresa_id
    and v.sacolinha_id::text = v_sacolinha.id::text;


  /*
    PEÇAS
  */

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'nome', p.nome
      )
    ),
    '[]'::jsonb
  )
  into v_pecas
  from public.pecas p
  where p.empresa_id = v_empresa_id
    and p.id in (
      select distinct v.peca_id
      from public.vendas_live v
      where v.empresa_id = v_empresa_id
        and v.sacolinha_id::text = v_sacolinha.id::text
        and v.peca_id is not null
    );


  /*
    PEDIDO DE ENVIO
  */

  select pe.*
  into v_pedido
  from public.pedido_envio_sacolinhas pes
  join public.pedidos_envio pe
    on pe.id = pes.pedido_envio_id
    and pe.empresa_id = v_empresa_id
  where pes.empresa_id = v_empresa_id
    and pes.sacolinha_id::text = v_sacolinha.id::text
  order by pe.criado_em desc
  limit 1;


  /*
    RESPOSTA FINAL
  */

  return jsonb_build_object(

    'lives',
    v_lives,

    'sacolinha',
    jsonb_build_object(
      'id', v_sacolinha.id,
      'live_id', v_sacolinha.live_id,
      'cliente_nome', v_sacolinha.cliente_nome
    ),

    'vendas',
    v_vendas,

    'pecas',
    v_pecas,

    'pedido_envio',
    case
      when v_pedido.id is null
        then null

      else jsonb_build_object(
        'id', v_pedido.id,
        'status', v_pedido.status,
        'transportadora', v_pedido.transportadora,
        'codigo_rastreio', v_pedido.codigo_rastreio,
        'link_rastreio', v_pedido.link_rastreio,
        'criado_em', v_pedido.criado_em
      )
    end
  );

end;
$function$;

revoke all
on function public.portal_cliente_dados(text, text, text)
from public;

grant execute
on function public.portal_cliente_dados(text, text, text)
to anon, authenticated, service_role;
