-- ============================================================================
-- LOJA / STORAGE / LIMITE FISICO DE FOTOS
--
-- Impede uma publicação de possuir mais de 10 objetos físicos atuais no
-- bucket loja-produtos.
--
-- A proteção acontece no próprio INSERT autorizado pelo Storage, antes de o
-- novo objeto ser persistido.
--
-- Concorrência:
-- uploads da mesma publicação são serializados com advisory transaction lock.
--
-- Esta regra é distinta da futura quota de armazenamento em bytes por
-- empresa/plano.
-- ============================================================================


create schema if not exists internal;

revoke all on schema internal from public;
grant usage on schema internal to authenticated, service_role;


create or replace function internal.loja_storage_foto_tem_vaga(
  p_bucket_id text,
  p_storage_path text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_partes text[];
  v_empresa_id uuid;
  v_publicacao_id uuid;
  v_quantidade bigint;
begin
  if p_bucket_id is distinct from 'loja-produtos' then
    return false;
  end if;

  if nullif(btrim(p_storage_path), '') is null then
    return false;
  end if;

  v_partes := storage.foldername(p_storage_path);

  if cardinality(v_partes) <> 2 then
    return false;
  end if;

  -- Evita exceção de cast para caminhos inválidos.
  if v_partes[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or v_partes[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    return false;
  end if;

  v_empresa_id := v_partes[1]::uuid;
  v_publicacao_id := v_partes[2]::uuid;

  -- Defesa própria do helper.
  -- Não depende da ordem de avaliação das expressões da policy.
  if not exists (
    select 1
    from public.loja_publicacoes lp
    where lp.empresa_id = v_empresa_id
      and lp.id = v_publicacao_id
      and lp.publicada is false
      and public.usuario_empresa_operacional_ativo(lp.empresa_id)
  ) then
    return false;
  end if;

  -- Namespace próprio para não compartilhar deliberadamente as chaves
  -- usadas pelos demais advisory locks do SaaS.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'loja-storage-fotos:'
      || v_empresa_id::text
      || ':'
      || v_publicacao_id::text,
      0
    )
  );

  -- Consulta executada após adquirir o lock.
  -- Como a função é VOLATILE, a contagem observa o estado atualizado após
  -- eventual espera por outro upload concorrente da mesma publicação.
  select count(*)
    into v_quantidade
  from storage.objects o
  where o.bucket_id = 'loja-produtos'
    and o.archived_at is null
    and o.is_delete_marker is false
    and cardinality(storage.foldername(o.name)) = 2
    and (storage.foldername(o.name))[1] = v_empresa_id::text
    and (storage.foldername(o.name))[2] = v_publicacao_id::text;

  return v_quantidade < 10;
end;
$$;


revoke all
on function internal.loja_storage_foto_tem_vaga(text, text)
from public, anon;

grant execute
on function internal.loja_storage_foto_tem_vaga(text, text)
to authenticated, service_role;


comment on function internal.loja_storage_foto_tem_vaga(text, text)
is 'Valida acesso à publicação, serializa uploads concorrentes e permite INSERT em loja-produtos somente enquanto existirem menos de 10 objetos físicos atuais.';


drop policy if exists "loja produtos inserir"
on storage.objects;

create policy "loja produtos inserir"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'loja-produtos'

  and cardinality(storage.foldername(storage.objects.name)) = 2

  and internal.loja_storage_foto_tem_vaga(
    storage.objects.bucket_id,
    storage.objects.name
  )
);


comment on policy "loja produtos inserir"
on storage.objects
is 'Permite upload somente em publicação rascunho da própria empresa, no caminho empresa/publicacao/arquivo, limitado a 10 objetos físicos atuais por publicação com serialização concorrente.';
