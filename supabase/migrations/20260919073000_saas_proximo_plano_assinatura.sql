alter table public.assinaturas
add column proximo_plano_id uuid;

alter table public.assinaturas
add constraint assinaturas_proximo_plano_fkey
foreign key (proximo_plano_id)
references public.planos(id)
on delete restrict;

alter table public.assinaturas
add constraint assinaturas_proximo_plano_diferente_check
check (
  proximo_plano_id is null
  or proximo_plano_id <> plano_id
);

create index idx_assinaturas_proximo_plano_id
on public.assinaturas(proximo_plano_id)
where proximo_plano_id is not null;

comment on column public.assinaturas.proximo_plano_id
is 'Plano agendado para substituir o plano atual na próxima renovação. Nulo quando não existe mudança de plano pendente.';
