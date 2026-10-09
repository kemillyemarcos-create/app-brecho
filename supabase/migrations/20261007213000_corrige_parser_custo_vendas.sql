-- ============================================================================
-- Corrige o parser monetário compartilhado do snapshot de custo das vendas.
--
-- Casos suportados:
--   999,99   -> 999.99
--   1.000,00 -> 1000.00
--   1000,00  -> 1000.00
--   1000.00  -> 1000.00
--
-- Valor ausente continua NULL.
-- Valor não monetário válido gera erro explícito em vez de virar zero.
--
-- A função é compartilhada pelos triggers de vendas_live e vendas_loja.
-- ============================================================================

create or replace function public.snapshot_custo_peca_venda()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_custo text;
  v_limpo text;
  v_normalizado text;
begin
  if new.custo_peca is not null then
    return new;
  end if;

  select p.custo
    into v_custo
  from public.pecas as p
  where p.empresa_id = new.empresa_id
    and p.id = new.peca_id;

  if v_custo is null or btrim(v_custo) = '' then
    new.custo_peca := null;
    return new;
  end if;

  -- Mantém apenas caracteres que podem compor o número.
  -- Símbolos monetários e espaços são descartados.
  v_limpo := regexp_replace(
    btrim(v_custo),
    '[^0-9,.\-]',
    '',
    'g'
  );

  if v_limpo = ''
     or v_limpo !~ '^-?[0-9][0-9.,]*$' then
    raise exception 'CUSTO_PECA_INVALIDO: %', v_custo
      using errcode = '22023';
  end if;

  if strpos(v_limpo, ',') > 0
     and strpos(v_limpo, '.') > 0 then

    -- Quando os dois separadores existem, o último é tratado como decimal.
    -- BRL: 1.000,00
    if length(v_limpo) - strpos(reverse(v_limpo), ',') + 1
       >
       length(v_limpo) - strpos(reverse(v_limpo), '.') + 1 then
      v_normalizado := replace(
        replace(v_limpo, '.', ''),
        ',',
        '.'
      );

    -- Também preserva representação canônica/internacional: 1,000.00
    else
      v_normalizado := replace(v_limpo, ',', '');
    end if;

  elsif strpos(v_limpo, ',') > 0 then
    -- Decimal brasileiro sem separador de milhar.
    v_normalizado := replace(v_limpo, ',', '.');

  else
    -- Numeric já canônico, por exemplo 1000.00.
    v_normalizado := v_limpo;
  end if;

  -- Rejeita separadores repetidos, sinais em posição inválida etc.
  if v_normalizado !~ '^-?[0-9]+(\.[0-9]+)?$' then
    raise exception 'CUSTO_PECA_INVALIDO: %', v_custo
      using errcode = '22023';
  end if;

  new.custo_peca := v_normalizado::numeric;

  return new;
end;
$$;

comment on function public.snapshot_custo_peca_venda()
is 'Captura o custo histórico da peça na venda, aceitando formato BRL com milhar/decimal e numeric canônico.';
