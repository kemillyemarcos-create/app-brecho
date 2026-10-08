-- ============================================================================
-- SaaS / Snapshot histórico do custo da peça na venda
--
-- Objetivo:
-- Preservar em vendas_live o custo associado à peça no momento da venda,
-- reduzindo a dependência histórica da tabela operacional pecas.
--
-- NULL representa custo desconhecido.
-- ============================================================================

alter table public.vendas_live
  add column if not exists custo_peca numeric;

-- ============================================================================
-- Backfill histórico
--
-- Para vendas já existentes, utiliza o custo atualmente registrado em pecas.
-- Valores vazios permanecem NULL.
-- ============================================================================

update public.vendas_live as v
set custo_peca =
  case
    when p.custo is null or btrim(p.custo) = '' then null

    when strpos(regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g'), ',') > 0
     and strpos(regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g'), '.') > 0
     and (
       length(regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g'))
       - strpos(reverse(regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g')), ',') + 1
     ) > (
       length(regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g'))
       - strpos(reverse(regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g')), '.') + 1
     )
      then replace(
        replace(
          regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g'),
          '.',
          ''
        ),
        ',',
        '.'
      )::numeric

    when strpos(regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g'), ',') > 0
     and strpos(regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g'), '.') > 0
      then replace(
        regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g'),
        ',',
        ''
      )::numeric

    when strpos(regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g'), ',') > 0
      then replace(
        regexp_replace(btrim(p.custo), '[^0-9,.\\-]', '', 'g'),
        ',',
        '.'
      )::numeric

    else regexp_replace(
      btrim(p.custo),
      '[^0-9,.\\-]',
      '',
      'g'
    )::numeric
  end
from public.pecas as p
where p.empresa_id = v.empresa_id
  and p.id = v.peca_id
  and v.custo_peca is null;

-- ============================================================================
-- Snapshot automático para novas vendas
--
-- O custo é capturado somente no INSERT.
-- Alterações posteriores em pecas.custo não modificam o histórico da venda.
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

  v_limpo := regexp_replace(
    btrim(v_custo),
    '[^0-9,.\\-]',
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

    if length(v_limpo) - strpos(reverse(v_limpo), ',') + 1
       >
       length(v_limpo) - strpos(reverse(v_limpo), '.') + 1 then
      v_normalizado := replace(
        replace(v_limpo, '.', ''),
        ',',
        '.'
      );
    else
      v_normalizado := replace(v_limpo, ',', '');
    end if;

  elsif strpos(v_limpo, ',') > 0 then
    v_normalizado := replace(v_limpo, ',', '.');

  else
    v_normalizado := v_limpo;
  end if;

  if v_normalizado !~ '^-?[0-9]+(\\.[0-9]+)?$' then
    raise exception 'CUSTO_PECA_INVALIDO: %', v_custo
      using errcode = '22023';
  end if;

  new.custo_peca := v_normalizado::numeric;

  return new;
end;
$$;

drop trigger if exists trg_vendas_live_snapshot_custo_peca
  on public.vendas_live;

create trigger trg_vendas_live_snapshot_custo_peca
before insert on public.vendas_live
for each row
execute function public.snapshot_custo_peca_venda();
