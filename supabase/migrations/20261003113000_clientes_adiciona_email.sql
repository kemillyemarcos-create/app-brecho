alter table public.clientes
  add column if not exists email text;

comment on column public.clientes.email
is 'E-mail da cliente. Opcional no cadastro administrativo; poderá ser obrigatório nos fluxos públicos da Loja Online.';
