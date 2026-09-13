alter table public.empresas
  add column if not exists slug_publico text;

update public.empresas
set slug_publico = case id
  when '1e5eb600-b3aa-4e4a-9734-bf723b193964'::uuid
    then 'kchic'
  when 'ff116d15-33a7-4826-bcdd-501406edb1d7'::uuid
    then 'brecho-teste-saas'
  when '4e373478-cd77-4d8b-8d57-872aec8268f0'::uuid
    then 'brecho-onboarding-teste'
  else slug_publico
end
where id in (
  '1e5eb600-b3aa-4e4a-9734-bf723b193964'::uuid,
  'ff116d15-33a7-4826-bcdd-501406edb1d7'::uuid,
  '4e373478-cd77-4d8b-8d57-872aec8268f0'::uuid
);

alter table public.empresas
  alter column slug_publico set not null;

alter table public.empresas
  add constraint empresas_slug_publico_unique
  unique (slug_publico);

alter table public.empresas
  add constraint empresas_slug_publico_formato_check
  check (
    slug_publico ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );
