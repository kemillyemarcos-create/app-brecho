-- ============================================================================
-- Segurança / Drift de banco
-- Registra no histórico versionado a função normalizar_telefone_whatsapp(text)
-- já existente no banco remoto e restringe sua execução direta ao backend.
-- ============================================================================

create or replace function public.normalizar_telefone_whatsapp(
  telefone_original text
)
returns text
language plpgsql
immutable
set search_path = ''
as $function$
declare
  numero text;
begin
  numero := pg_catalog.regexp_replace(
    coalesce(telefone_original, ''),
    '[^0-9]',
    '',
    'g'
  );

  if numero = '' then
    return null;
  end if;

  if pg_catalog.length(numero) in (10, 11) then
    numero := '55' || numero;
  end if;

  return numero;
end;
$function$;

revoke all
on function public.normalizar_telefone_whatsapp(text)
from public, anon, authenticated;

grant execute
on function public.normalizar_telefone_whatsapp(text)
to service_role;

comment on function public.normalizar_telefone_whatsapp(text) is
'Backend-only: normaliza telefone para formato numérico e adiciona DDI 55 quando informado apenas DDD + número.';
