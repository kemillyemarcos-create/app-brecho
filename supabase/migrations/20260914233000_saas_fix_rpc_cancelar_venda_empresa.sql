-- ============================================================
-- SaaS - Corrige RPC cancelar_venda_saas
--
-- Ajuste:
-- - remove dependência do helper legado usuario_empresa_id()
-- - empresa passa a ser informada explicitamente
-- - valida membership ativo via usuario_membro_empresa()
-- ============================================================

drop function if exists public.cancelar_venda_saas(text, text);

create or replace function public.cancelar_venda_saas(
  p_empresa_id uuid,
  p_peca_id text,
  p_live_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda public.vendas_live%rowtype;
  v_peca public.pecas%rowtype;
  v_sacolinha_id text;
  v_sacolinha_excluida boolean := false;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Usuário não autenticado.';
  end if;

  if p_empresa_id is null then
    raise exception using
      errcode = '22004',
      message = 'Empresa não informada.';
  end if;

  if not public.usuario_membro_empresa(p_empresa_id) then
    raise exception using
      errcode = '42501',
      message = 'Usuário sem acesso à empresa informada.';
  end if;

  if nullif(trim(coalesce(p_peca_id, '')), '') is null then
    raise exception using
      errcode = '22023',
      message = 'Peça não informada.';
  end if;

  select vl.*
    into v_venda
  from public.vendas_live vl
  where vl.empresa_id = p_empresa_id
    and vl.peca_id = p_peca_id
    and (
      p_live_id is null
      or vl.live_id = p_live_id
    )
  order by
    vl.data_hora_ts desc nulls last,
    vl.data_hora desc nulls last
  limit 1
  for update;

  select p.*
    into v_peca
  from public.pecas p
  where p.empresa_id = p_empresa_id
    and p.id = p_peca_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Peça não encontrada para esta empresa.';
  end if;

  if v_venda.id is null then

    if coalesce(v_peca.vendido, false) = false then
      return jsonb_build_object(
        'ok', true,
        'resultado', 'ja_disponivel',
        'peca_id', p_peca_id,
        'venda_id', null,
        'sacolinha_id', null,
        'sacolinha_excluida', false
      );
    end if;

    update public.pecas
    set
      vendido = false,
      cliente = null,
      cliente_id = null,
      data_venda = null,
      valor_venda_final = null
    where empresa_id = p_empresa_id
      and id = p_peca_id;

    return jsonb_build_object(
      'ok', true,
      'resultado', 'peca_liberada_sem_venda',
      'peca_id', p_peca_id,
      'venda_id', null,
      'sacolinha_id', null,
      'sacolinha_excluida', false
    );
  end if;

  v_sacolinha_id := v_venda.sacolinha_id;

  delete from public.vendas_live
  where empresa_id = p_empresa_id
    and id = v_venda.id;

  update public.pecas
  set
    vendido = false,
    cliente = null,
    cliente_id = null,
    data_venda = null,
    valor_venda_final = null
  where empresa_id = p_empresa_id
    and id = p_peca_id;

  if v_sacolinha_id is not null then
    if not exists (
      select 1
      from public.vendas_live vl
      where vl.empresa_id = p_empresa_id
        and vl.sacolinha_id = v_sacolinha_id
    ) then
      delete from public.sacolinhas_live sl
      where sl.empresa_id = p_empresa_id
        and sl.id = v_sacolinha_id;

      v_sacolinha_excluida := found;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'resultado', 'venda_cancelada',
    'peca_id', p_peca_id,
    'venda_id', v_venda.id,
    'sacolinha_id', v_sacolinha_id,
    'sacolinha_excluida', v_sacolinha_excluida
  );
end;
$$;

revoke all
on function public.cancelar_venda_saas(uuid, text, text)
from public;

revoke all
on function public.cancelar_venda_saas(uuid, text, text)
from anon;

grant execute
on function public.cancelar_venda_saas(uuid, text, text)
to authenticated, service_role;

-- ============================================================
-- Fim da migration
-- ============================================================
