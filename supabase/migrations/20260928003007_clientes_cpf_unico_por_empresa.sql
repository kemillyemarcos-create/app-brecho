-- Impede CPF duplicado dentro da mesma empresa.
-- O mesmo CPF pode existir em empresas diferentes.
-- CPFs vazios continuam permitidos.

create unique index if not exists clientes_empresa_cpf_normalizado_uidx
on public.clientes (
  empresa_id,
  regexp_replace(
    coalesce(cpf, ''),
    '[^0-9]',
    '',
    'g'
  )
)
where regexp_replace(
  coalesce(cpf, ''),
  '[^0-9]',
  '',
  'g'
) <> '';

comment on index public.clientes_empresa_cpf_normalizado_uidx
is 'Garante CPF normalizado único por empresa, ignorando CPF vazio.';
