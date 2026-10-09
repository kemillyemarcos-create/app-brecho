-- Neste ponto do histórico existe a assinatura de oito argumentos.
-- A versão com email (nove argumentos) é criada em 20261003120000.
revoke execute on function public.cadastrar_cliente_publico(
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
  text
) to service_role;
