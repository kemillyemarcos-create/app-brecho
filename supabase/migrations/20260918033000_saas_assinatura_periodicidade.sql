alter table public.assinaturas
add column periodicidade text;

alter table public.assinaturas
add constraint assinaturas_periodicidade_check
check (
  periodicidade is null
  or periodicidade in (
    'mensal',
    'anual'
  )
);

comment on column public.assinaturas.periodicidade
is 'Periodicidade comercial da cobrança da assinatura: mensal ou anual. Pode permanecer nula durante trial, assinaturas fundadoras ou ciclos ainda não vinculados a cobrança.';
