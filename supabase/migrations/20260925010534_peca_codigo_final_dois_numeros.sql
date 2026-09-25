create or replace function public.criar_peca(
  p_empresa_id uuid,
  p_nome text,
  p_custo text default '',
  p_venda text default '',
  p_obs text default '',
  p_foto text default ''
)
returns public.pecas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefixo text;
  v_custo_limpo text;
  v_custo_numerico numeric := 0;
  v_custo_inteiro bigint := 0;
  v_aleatorio bytea;
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_sufixo text;
  v_codigo text;
  v_peca public.pecas%rowtype;
  v_tentativa integer;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if not public.usuario_empresa_operacional_ativo(p_empresa_id) then
    raise exception 'Usuário sem acesso operacional à empresa.'
      using errcode = '42501';
  end if;

  if nullif(btrim(p_nome), '') is null then
    raise exception 'Nome da peça é obrigatório.'
      using errcode = '22023';
  end if;

  select nullif(btrim(ce.prefixo_peca), '')
    into v_prefixo
  from public.configuracoes_empresa ce
  where ce.empresa_id = p_empresa_id;

  v_prefixo := coalesce(v_prefixo, 'KC');

  if v_prefixo !~ '^[A-Za-z0-9]{1,10}$' then
    raise exception 'Prefixo da peça inválido.'
      using errcode = '22023';
  end if;

  v_prefixo := upper(v_prefixo);

  v_custo_limpo := regexp_replace(
    coalesce(p_custo, ''),
    '[^0-9,]',
    '',
    'g'
  );

  if v_custo_limpo ~ '^[0-9]+(,[0-9]+)?$' then
    v_custo_numerico := replace(v_custo_limpo, ',', '.')::numeric;
  else
    v_custo_numerico := 0;
  end if;

  v_custo_inteiro := floor(v_custo_numerico);

  for v_tentativa in 1..10 loop
    v_aleatorio := extensions.gen_random_bytes(6);

    v_sufixo := '';

    -- 4 caracteres alfanuméricos
    for i in 0..3 loop
      v_sufixo := v_sufixo ||
        substr(
          v_alfabeto,
          (get_byte(v_aleatorio, i) % 32) + 1,
          1
        );
    end loop;

    -- termina obrigatoriamente com 2 dígitos numéricos
    v_sufixo := v_sufixo ||
      (get_byte(v_aleatorio, 4) % 10)::text ||
      (get_byte(v_aleatorio, 5) % 10)::text;

    v_codigo :=
      v_prefixo ||
      v_custo_inteiro::text ||
      v_sufixo;

    begin
      insert into public.pecas (
        id,
        empresa_id,
        nome,
        custo,
        venda,
        obs,
        foto,
        vendido,
        cliente,
        data_cadastro,
        data_venda
      )
      values (
        v_codigo,
        p_empresa_id,
        btrim(p_nome),
        coalesce(p_custo, ''),
        coalesce(p_venda, ''),
        btrim(coalesce(p_obs, '')),
        coalesce(p_foto, ''),
        false,
        '',
        to_char(
          now() at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        ),
        ''
      )
      returning *
      into v_peca;

      return v_peca;

    exception
      when unique_violation then
        if exists (
          select 1
          from public.pecas p
          where p.id = v_codigo
        ) then
          continue;
        end if;

        raise;
    end;
  end loop;

  raise exception 'Não foi possível gerar código único para a peça.'
    using errcode = '23505';
end;
$$;

revoke all on function public.criar_peca(
  uuid, text, text, text, text, text
) from public, anon;

grant execute on function public.criar_peca(
  uuid, text, text, text, text, text
) to authenticated;

comment on function public.criar_peca(
  uuid, text, text, text, text, text
)
is 'Cria peça com código server-side: prefixo configurável + custo inteiro + 4 caracteres aleatórios + 2 dígitos numéricos.';
