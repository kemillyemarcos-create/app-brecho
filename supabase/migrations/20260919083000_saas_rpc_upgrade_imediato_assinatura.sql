create or replace function public.aplicar_upgrade_assinatura(
  p_assinatura_id uuid,
  p_novo_plano_id uuid,
  p_origem text default 'sistema',
  p_dados jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assinatura public.assinaturas%rowtype;

  v_plano_atual_codigo text;
  v_plano_atual_ordem integer;

  v_novo_plano_codigo text;
  v_novo_plano_ordem integer;
  v_novo_plano_ativo boolean;

  v_downgrade_pendente_id uuid;

  v_origem text;
  v_dados jsonb;
begin
  if p_assinatura_id is null then
    raise exception 'Assinatura não informada.'
      using errcode = '22004';
  end if;

  if p_novo_plano_id is null then
    raise exception 'Novo plano não informado.'
      using errcode = '22004';
  end if;

  v_origem := lower(nullif(btrim(p_origem), ''));

  if v_origem is null
     or v_origem not in ('sistema', 'usuario', 'admin', 'gateway') then
    raise exception 'Origem de evento inválida.'
      using errcode = '22023';
  end if;

  v_dados := coalesce(p_dados, '{}'::jsonb);

  select a.*
    into v_assinatura
  from public.assinaturas a
  where a.id = p_assinatura_id
  for update;

  if not found then
    raise exception 'Assinatura não encontrada.'
      using errcode = 'P0002';
  end if;

  if v_assinatura.status in ('canceled', 'expired') then
    raise exception 'Assinatura histórica não permite upgrade.'
      using errcode = '22023';
  end if;

  select
    p.codigo,
    p.ordem_comercial
  into
    v_plano_atual_codigo,
    v_plano_atual_ordem
  from public.planos p
  where p.id = v_assinatura.plano_id;

  if v_plano_atual_ordem is null then
    raise exception 'Plano atual sem hierarquia comercial configurada.'
      using errcode = '22023';
  end if;

  select
    p.codigo,
    p.ordem_comercial,
    p.ativo
  into
    v_novo_plano_codigo,
    v_novo_plano_ordem,
    v_novo_plano_ativo
  from public.planos p
  where p.id = p_novo_plano_id;

  if not found then
    raise exception 'Novo plano não encontrado.'
      using errcode = 'P0002';
  end if;

  if v_novo_plano_ativo is not true then
    raise exception 'Novo plano não está ativo.'
      using errcode = '22023';
  end if;

  if v_novo_plano_ordem is null then
    raise exception 'Novo plano sem hierarquia comercial configurada.'
      using errcode = '22023';
  end if;

  if p_novo_plano_id = v_assinatura.plano_id then
    raise exception 'Novo plano é igual ao plano atual.'
      using errcode = '22023';
  end if;

  if v_novo_plano_ordem <= v_plano_atual_ordem then
    raise exception 'A operação informada não é upgrade.'
      using errcode = '22023';
  end if;

  v_downgrade_pendente_id := v_assinatura.proximo_plano_id;

  update public.assinaturas
  set
    plano_id = p_novo_plano_id,
    proximo_plano_id = null
  where id = v_assinatura.id;

  insert into public.assinatura_eventos (
    empresa_id,
    assinatura_id,
    tipo,
    origem,
    dados
  )
  values (
    v_assinatura.empresa_id,
    v_assinatura.id,
    'upgrade_plano_aplicado',
    v_origem,
    v_dados || jsonb_build_object(
      'plano_anterior_id', v_assinatura.plano_id,
      'plano_anterior_codigo', v_plano_atual_codigo,
      'novo_plano_id', p_novo_plano_id,
      'novo_plano_codigo', v_novo_plano_codigo,
      'downgrade_pendente_cancelado_id', v_downgrade_pendente_id
    )
  );

  return jsonb_build_object(
    'alterada', true,
    'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'plano_anterior_id', v_assinatura.plano_id,
    'plano_anterior_codigo', v_plano_atual_codigo,
    'plano_atual_id', p_novo_plano_id,
    'plano_atual_codigo', v_novo_plano_codigo,
    'downgrade_pendente_cancelado_id', v_downgrade_pendente_id
  );
end;
$$;

revoke all on function public.aplicar_upgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) from public;

revoke all on function public.aplicar_upgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) from anon;

revoke all on function public.aplicar_upgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) from authenticated;

grant execute on function public.aplicar_upgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) to service_role;

comment on function public.aplicar_upgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
)
is 'Aplica upgrade de plano imediatamente e remove eventual downgrade pendente. A cobrança proporcional é responsabilidade da camada de billing/gateway. Uso exclusivo do backend/service_role.';
