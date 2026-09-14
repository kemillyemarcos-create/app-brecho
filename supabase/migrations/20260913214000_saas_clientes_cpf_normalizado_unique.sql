drop index if exists public.clientes_empresa_cpf_unique;

create unique index clientes_empresa_cpf_normalizado_unique
on public.clientes (
  empresa_id,
  regexp_replace(coalesce(cpf, ''), '[^0-9]', '', 'g')
)
where nullif(regexp_replace(coalesce(cpf, ''), '[^0-9]', '', 'g'), '') is not null;
