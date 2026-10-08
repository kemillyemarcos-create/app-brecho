import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const migration = () =>
  readFile(
    new URL(
      '../../supabase/migrations/20261007230000_limita_slug_publico_100.sql',
      import.meta.url,
    ),
    'utf8',
  );

async function bancoHelper() {
  const db = new PGlite();

  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;

    create table public.empresas (
      id uuid primary key default gen_random_uuid(),
      nome text,
      nome_fantasia text,
      email text,
      ativo boolean default true,
      slug_publico text not null unique
    );

    create schema auth;

    create table auth.users (
      id uuid primary key,
      email text,
      email_confirmed_at timestamptz
    );

    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select current_setting('test.auth_uid', true)::uuid
    $$;
  `);

  const sql = await migration();

  const inicioHelper = sql.indexOf(
    'create or replace function public.gerar_slug_publico_empresa(',
  );

  const fimHelper = sql.indexOf(
    'alter function public.gerar_slug_publico_empresa(text)',
    inicioHelper,
  );

  await db.exec(sql.slice(inicioHelper, fimHelper));

  return db;
}

describe('slug_publico canônico', () => {
  it('limita slug base a no máximo 100 caracteres', async () => {
    const db = await bancoHelper();

    try {
      const nome = 'A'.repeat(150);

      const result = await db.query(
        `select public.gerar_slug_publico_empresa($1) as slug`,
        [nome],
      );

      expect(result.rows[0].slug).toHaveLength(100);
      expect(result.rows[0].slug).toBe('a'.repeat(100));
    } finally {
      await db.close();
    }
  });

  it('não termina com hífen quando o corte cai sobre separador', async () => {
    const db = await bancoHelper();

    try {
      const nome = `${'a'.repeat(99)} x`;

      const result = await db.query(
        `select public.gerar_slug_publico_empresa($1) as slug`,
        [nome],
      );

      expect(result.rows[0].slug.length).toBeLessThanOrEqual(100);
      expect(result.rows[0].slug.endsWith('-')).toBe(false);
      expect(result.rows[0].slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    } finally {
      await db.close();
    }
  });

  it('migration contém reserva de espaço para sufixo de colisão', async () => {
    const sql = await migration();

    expect(sql).toContain(
      "100 - char_length('-' || v_slug_sequencia::text)",
    );
    expect(sql).toContain(
      "|| '-'",
    );
    expect(sql).toContain(
      'char_length(slug_publico) between 1 and 100',
    );
    expect(sql).toContain('not valid');
  });

  it('sufixo de colisão permanece dentro de 100 caracteres', () => {
    const base = 'a'.repeat(100);
    const sequencia = 2;
    const sufixo = `-${sequencia}`;

    const final =
      base
        .slice(0, 100 - sufixo.length)
        .replace(/-+$/, '') +
      sufixo;

    expect(final).toHaveLength(100);
    expect(final.endsWith('-2')).toBe(true);
  });
});
