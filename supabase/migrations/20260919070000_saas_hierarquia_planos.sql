alter table public.planos
add column ordem_comercial integer;

update public.planos
set ordem_comercial = case codigo
  when 'essencial' then 1
  when 'profissional' then 2
  when 'completo' then 3
  else null
end;

alter table public.planos
add constraint planos_ordem_comercial_check
check (
  ordem_comercial is null
  or ordem_comercial > 0
);

create unique index ux_planos_ordem_comercial
on public.planos(ordem_comercial)
where ordem_comercial is not null;

comment on column public.planos.ordem_comercial
is 'Hierarquia comercial dos planos. Valores maiores representam planos superiores e permitem distinguir upgrade de downgrade sem depender de preço.';
