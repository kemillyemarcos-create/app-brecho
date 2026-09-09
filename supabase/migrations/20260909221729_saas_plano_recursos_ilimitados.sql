-- ============================================================
-- SaaS - Recursos ilimitados por plano
-- Etapa 8
--
-- Permite representar explicitamente recursos sem limite,
-- evitando convenções como valor_inteiro = -1.
-- ============================================================

alter table public.plano_recursos
  drop constraint plano_recursos_tipo_check;

alter table public.plano_recursos
  drop constraint plano_recursos_valor_check;


alter table public.plano_recursos
  add constraint plano_recursos_tipo_check
  check (
    tipo = any (
      array[
        'boolean'::text,
        'integer'::text,
        'text'::text,
        'unlimited'::text
      ]
    )
  );


alter table public.plano_recursos
  add constraint plano_recursos_valor_check
  check (
    (
      tipo = 'boolean'
      and valor_boolean is not null
      and valor_inteiro is null
      and valor_texto is null
    )
    or
    (
      tipo = 'integer'
      and valor_boolean is null
      and valor_inteiro is not null
      and valor_texto is null
    )
    or
    (
      tipo = 'text'
      and valor_boolean is null
      and valor_inteiro is null
      and valor_texto is not null
    )
    or
    (
      tipo = 'unlimited'
      and valor_boolean is null
      and valor_inteiro is null
      and valor_texto is null
    )
  );
