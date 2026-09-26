create or replace function public.loja_salvar_rascunho(
  p_empresa_id uuid,
  p_peca_id text,
  p_marca text default null,
  p_categoria text default null,
  p_tamanho text default null,
  p_condicao text default null,
  p_descricao text default null
)
returns public.loja_publicacoes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peca public.pecas%rowtype;
  v_publicacao public.loja_publicacoes%rowtype;
  v_slug text;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if nullif(btrim(p_peca_id), '') is null then
    raise exception 'Peça não informada.'
      using errcode = '22023';
  end if;

  if not public.usuario_empresa_operacional_ativo(p_empresa_id) then
    raise exception 'Usuário sem acesso operacional à empresa.'
      using errcode = '42501';
  end if;

  select p.*
    into v_peca
  from public.pecas p
  where p.empresa_id = p_empresa_id
    and p.id = btrim(p_peca_id)
  for update;

  if not found then
    raise exception 'Peça não encontrada.'
      using errcode = 'P0002';
  end if;

  select lp.*
    into v_publicacao
  from public.loja_publicacoes lp
  where lp.empresa_id = p_empresa_id
    and lp.peca_id = v_peca.id
  for update;

  if found and v_publicacao.publicada is true then
    raise exception 'Produto publicado deve ser despublicado antes da edição.'
      using errcode = '22023';
  end if;

  if not found then
    v_slug :=
      'peca-' ||
      lower(
        trim(
          both '-'
          from regexp_replace(
            v_peca.id,
            '[^A-Za-z0-9]+',
            '-',
            'g'
          )
        )
      );

    insert into public.loja_publicacoes (
      empresa_id,
      peca_id,
      slug,
      marca,
      categoria,
      tamanho,
      condicao,
      descricao,
      publicada
    )
    values (
      p_empresa_id,
      v_peca.id,
      v_slug,
      nullif(btrim(p_marca), ''),
      nullif(btrim(p_categoria), ''),
      nullif(btrim(p_tamanho), ''),
      nullif(btrim(p_condicao), ''),
      nullif(btrim(p_descricao), ''),
      false
    )
    returning *
    into v_publicacao;

    return v_publicacao;
  end if;

  update public.loja_publicacoes
  set
    marca = nullif(btrim(p_marca), ''),
    categoria = nullif(btrim(p_categoria), ''),
    tamanho = nullif(btrim(p_tamanho), ''),
    condicao = nullif(btrim(p_condicao), ''),
    descricao = nullif(btrim(p_descricao), ''),
    updated_at = now()
  where id = v_publicacao.id
    and empresa_id = p_empresa_id
  returning *
  into v_publicacao;

  return v_publicacao;
end;
$$;

revoke all on function public.loja_salvar_rascunho(
  uuid, text, text, text, text, text, text
) from public, anon;

grant execute on function public.loja_salvar_rascunho(
  uuid, text, text, text, text, text, text
) to authenticated;

comment on function public.loja_salvar_rascunho(
  uuid, text, text, text, text, text, text
)
is 'Cria ou atualiza rascunho de publicação da Loja para uma peça da própria empresa operacional. Não publica e não permite editar publicação ativa.';
