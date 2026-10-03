revoke all on function public.cadastrar_cliente_publico(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.cadastrar_cliente_publico(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
