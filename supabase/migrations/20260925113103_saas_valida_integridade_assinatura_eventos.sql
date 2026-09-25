-- A8: valida o histórico após auditoria confirmar ausência de inconsistências.

alter table public.assinatura_eventos
  validate constraint assinatura_eventos_assinatura_empresa_fkey;

alter table public.assinatura_eventos
  validate constraint assinatura_eventos_dados_objeto_check;
