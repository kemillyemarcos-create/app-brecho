create or replace function public.loja_despublicar_produto(
  p_empresa_id uuid,
  p_publicacao_id uuid
)
returns public.loja_publicacoes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publicacao public.loja_publicacoes%rowtype;
  v_resultado public.loja_publicacoes%rowtype;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if p_publicacao_id is null then
    raise exception 'Publicação não informada.'
      using errcode = '22004';
  end if;

  if not public.usuario_empresa_operacional_ativo(p_empresa_id) then
    raise exception 'Usuário sem acesso operacional à empresa.'
      using errcode = '42501';
  end if;

  select lp.*
    into v_publicacao
  from public.loja_publicacoes lp
  where lp.id = p_publicacao_id
    and lp.empresa_id = p_empresa_id
  for update;

  if not found then
    raise exception 'Publicação não encontrada.'
      using errcode = 'P0002';
  end if;

  update public.loja_publicacoes
  set
    publicada = false,
    despublicada_em = case
      when v_publicacao.publicada is true then now()
      else v_publicacao.despublicada_em
    end,
    updated_at = case
      when v_publicacao.publicada is true then now()
      else updated_at
    end
  where id = p_publicacao_id
    and empresa_id = p_empresa_id
  returning *
  into v_resultado;

  return v_resultado;
end;
$$;

revoke all on function public.loja_despublicar_produto(
  uuid, uuid
) from public, anon;

grant execute on function public.loja_despublicar_produto(
  uuid, uuid
) to authenticated;

comment on function public.loja_despublicar_produto(
  uuid, uuid
)
is 'Despublica produto da Loja preservando publicada_em e registrando despublicada_em somente na transição de publicado para rascunho.';
