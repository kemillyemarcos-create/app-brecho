revoke execute on function public.loja_catalogo_publico(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  integer
) from anon, authenticated;

comment on function public.loja_catalogo_publico(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  integer
)
is 'Função interna do catálogo da Loja. A exposição pública deve ocorrer exclusivamente por loja_catalogo_publico_por_slug, que valida empresa ativa e assinatura operacional.';
