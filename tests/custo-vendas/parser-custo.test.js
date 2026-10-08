import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const migration = () =>
  readFile(
    new URL(
      '../../supabase/migrations/20261007213000_corrige_parser_custo_vendas.sql',
      import.meta.url,
    ),
    'utf8',
  );

async function criarBanco() {
  const db = new PGlite();

  await db.exec(`
    create table public.pecas (
      id text not null,
      empresa_id uuid not null,
      custo text,
      primary key (empresa_id, id)
    );

    create table public.vendas_live (
      id bigserial primary key,
      empresa_id uuid not null,
      peca_id text not null,
      custo_peca numeric
    );

    create table public.vendas_loja (
      id bigserial primary key,
      empresa_id uuid not null,
      peca_id text not null,
      custo_peca numeric
    );

    create or replace function public.snapshot_custo_peca_venda()
    returns trigger
    language plpgsql
    set search_path = ''
    as $$
    declare
      v_custo text;
    begin
      if new.custo_peca is not null then
        return new;
      end if;

      select p.custo
        into v_custo
      from public.pecas p
      where p.empresa_id = new.empresa_id
        and p.id = new.peca_id;

      if v_custo is null or btrim(v_custo) = '' then
        new.custo_peca := null;
      else
        new.custo_peca := replace(
          regexp_replace(v_custo, '[^0-9,.-]', '', 'g'),
          ',',
          '.'
        )::numeric;
      end if;

      return new;
    end;
    $$;

    create trigger trg_vendas_live_snapshot_custo_peca
    before insert on public.vendas_live
    for each row
    execute function public.snapshot_custo_peca_venda();

    create trigger trg_vendas_loja_snapshot_custo_peca
    before insert on public.vendas_loja
    for each row
    execute function public.snapshot_custo_peca_venda();
  `);

  await db.exec(await migration());

  return db;
}

const empresa = '11111111-1111-4111-8111-111111111111';

async function snapshot(db, tabela, id, custo) {
  await db.query(
    `insert into public.pecas(id, empresa_id, custo)
     values ($1, $2, $3)`,
    [id, empresa, custo],
  );

  const result = await db.query(
    `insert into public.${tabela}(empresa_id, peca_id, custo_peca)
     values ($1, $2, null)
     returning custo_peca::text as custo`,
    [empresa, id],
  );

  return result.rows[0].custo;
}

describe('snapshot compartilhado do custo da peça', () => {
  it.each([
    ['999,99', '999.99'],
    ['1.000,00', '1000.00'],
    ['1000,00', '1000.00'],
    ['1000.00', '1000.00'],
    ['1,000.00', '1000.00'],
  ])('normaliza %s para %s', async (entrada, esperado) => {
    const db = await criarBanco();

    try {
      expect(await snapshot(db, 'vendas_loja', `LOJA-${entrada}`, entrada))
        .toBe(esperado);
    } finally {
      await db.close();
    }
  });

  it('mantém custo vazio como NULL', async () => {
    const db = await criarBanco();

    try {
      await db.query(
        `insert into public.pecas(id, empresa_id, custo)
         values ('VAZIO', $1, '')`,
        [empresa],
      );

      const result = await db.query(
        `insert into public.vendas_loja(empresa_id, peca_id, custo_peca)
         values ($1, 'VAZIO', null)
         returning custo_peca`,
        [empresa],
      );

      expect(result.rows[0].custo_peca).toBeNull();
    } finally {
      await db.close();
    }
  });

  it('rejeita valor monetário inválido em vez de converter para zero', async () => {
    const db = await criarBanco();

    try {
      await expect(
        snapshot(db, 'vendas_loja', 'INVALIDO', 'abc'),
      ).rejects.toMatchObject({ code: '22023' });
    } finally {
      await db.close();
    }
  });

  it('a mesma função corrigida continua atendendo vendas Live', async () => {
    const db = await criarBanco();

    try {
      expect(await snapshot(db, 'vendas_live', 'LIVE-1000', '1.000,00'))
        .toBe('1000.00');
    } finally {
      await db.close();
    }
  });
});
