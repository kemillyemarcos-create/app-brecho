drop function if exists public.cadastrar_cliente_publico(
  text,
  text,
  text,
  text,
  text,
  text,
  text
);

create or replace function public.cadastrar_cliente_publico(
  p_empresa_slug text,
  p_nome text,
  p_cpf text,
  p_telefone text default '',
  p_cep text default '',
  p_endereco text default '',
  p_numero text default '',
  p_complemento text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_empresa_slug text := lower(trim(coalesce(p_empresa_slug, '')));
  v_empresa_id uuid;
  v_nome text := trim(coalesce(p_nome, ''));
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  v_telefone text := regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g');
  v_cep text := regexp_replace(coalesce(p_cep, ''), '[^0-9]', '', 'g');
  v_cliente_id text;
begin
  if v_empresa_slug = '' then
    return jsonb_build_object(
      'ok', false,
      'code', 'EMPRESA_INVALIDA'
    );
  end if;

  select e.id
    into v_empresa_id
  from public.empresas e
  where e.slug_publico = v_empresa_slug
    and e.ativo is true
  limit 1;

  if v_empresa_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'EMPRESA_INVALIDA'
    );
  end if;

  if not public.assinatura_empresa_operacional_ativa(v_empresa_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'ASSINATURA_INATIVA'
    );
  end if;

  if v_nome = '' then
    raise exception 'NOME_OBRIGATORIO'
      using errcode = '22023';
  end if;

  if char_length(v_cpf) <> 11 then
    raise exception 'CPF_INVALIDO'
      using errcode = '22023';
  end if;

  perform 1
  from public.clientes c
  where c.empresa_id = v_empresa_id
    and regexp_replace(
      coalesce(c.cpf, ''),
      '[^0-9]',
      '',
      'g'
    ) = v_cpf
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', false,
      'code', 'CPF_JA_CADASTRADO'
    );
  end if;

  v_cliente_id :=
    'CLI-' ||
    floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text ||
    lpad(floor(random() * 1000)::int::text, 3, '0');

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
      left(v_telefone, 11),
      left(v_cep, 8),
      trim(coalesce(p_endereco, '')),
      trim(coalesce(p_numero, '')),
      trim(coalesce(p_complemento, '')),
      now(),
      v_empresa_id
    );

  exception
    when unique_violation then
      return jsonb_build_object(
        'ok', false,
        'code', 'CPF_JA_CADASTRADO'
      );
  end;

  return jsonb_build_object(
    'ok', true,
    'code', 'CADASTRO_CRIADO',
    'id', v_cliente_id
  );
end;
$function$;

revoke all
on function public.cadastrar_cliente_publico(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from public;

grant execute
on function public.cadastrar_cliente_publico(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
to anon, authenticated, service_role;
