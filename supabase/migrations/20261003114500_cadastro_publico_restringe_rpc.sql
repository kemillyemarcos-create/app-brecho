revoke execute on function public.cadastrar_cliente_publico(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from anon, authenticated;

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
