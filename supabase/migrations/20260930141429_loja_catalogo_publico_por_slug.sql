create or replace function public.loja_catalogo_publico_por_slug(
  p_empresa_slug text,
  p_slug text default null,
  p_categoria text default null,
  p_marca text default null,
  p_tamanho text default null,
  p_limite integer default 24,
  p_offset integer default 0
)
returns table (
  publicacao_id uuid,
  slug text,
  nome text,
  preco text,
  obs text,
  marca text,
  categoria text,
  tamanho text,
  condicao text,
  descricao text,
  foto_principal text,
  fotos jsonb,
  publicada_em timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_empresa_slug text :=
    lower(trim(coalesce(p_empresa_slug, '')));

  v_empresa_id uuid;
begin
  if v_empresa_slug = '' then
    return;
  end if;

  select e.id
    into v_empresa_id
  from public.empresas e
  where e.slug_publico = v_empresa_slug
    and e.ativo is true
  limit 1;

  if v_empresa_id is null then
    return;
  end if;

  if not public.assinatura_empresa_operacional_ativa(
    v_empresa_id
  ) then
    return;
  end if;

  return query
  select *
  from public.loja_catalogo_publico(
    v_empresa_id,
    p_slug,
    p_categoria,
    p_marca,
    p_tamanho,
    p_limite,
    p_offset
  );
end;
$$;

revoke all on function public.loja_catalogo_publico_por_slug(
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) from public;

grant execute on function public.loja_catalogo_publico_por_slug(
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) to anon, authenticated;

comment on function public.loja_catalogo_publico_por_slug(
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
)
is 'Expõe o catálogo público da Loja por slug público da empresa, sem exigir empresa_id no frontend.';
