import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const migration = name => readFile(
  new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), 'utf8',
);
const anterior = '20260915212000_saas_cadastro_publico_assinatura_operacional';
const restringe = '20261003114500_cadastro_publico_restringe_rpc';
const email = '20261003120000_cadastro_publico_adiciona_email';
const correcao = '20261003123000_cadastro_publico_restringe_rpc_correcao';
const assinatura = n => `public.cadastrar_cliente_publico(${Array(n).fill('text').join(',')})`;

// Testa DDL/ACL reais em banco descartável, sem chamar a função de cadastro
// nem depender das tabelas comerciais/serviços externos.
async function banco() {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  return db;
}
async function acl(db) {
  return (await db.query(`SELECT p.pronargs AS argumentos,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role,
    EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
      WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='cadastrar_cliente_publico'
    ORDER BY p.pronargs`)).rows;
}
const restrita = argumentos => [{ argumentos, anon: false, authenticated: false,
  service_role: true, public_execute: false }];

describe('cadeia de migrations do cadastro público: C1', () => {
  it('replay restringe oito argumentos e substitui por nove sem reabrir acesso', async () => {
    const db = await banco();
    try {
      // A definição anterior deve também remover a assinatura antiga de sete argumentos.
      await db.exec(`CREATE FUNCTION ${assinatura(7)} RETURNS jsonb
        LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;`);
      await db.exec(await migration(anterior));
      expect(await acl(db)).toEqual([{ argumentos: 8, anon: true,
        authenticated: true, service_role: true, public_execute: false }]);
      // Prova que a restrição também remove EXECUTE herdado de PUBLIC.
      await db.exec(`GRANT EXECUTE ON FUNCTION ${assinatura(8)} TO PUBLIC;`);
      await db.exec(await migration(restringe));
      expect(await acl(db)).toEqual(restrita(8));
      await db.exec(await migration(email));
      expect(await acl(db)).toEqual(restrita(9));
      await db.exec(await migration(correcao));
      expect(await acl(db)).toEqual(restrita(9));
    } finally { await db.close(); }
  });

  it('correção existente converge do grant histórico de nove argumentos e é idempotente', async () => {
    const db = await banco();
    try {
      await db.exec(await migration(anterior));
      await db.exec(await migration(email));
      // Estado após a versão histórica de 03120000, antes de 03123000.
      await db.exec(`GRANT EXECUTE ON FUNCTION ${assinatura(9)} TO anon, authenticated;`);
      expect((await acl(db))[0]).toMatchObject({ argumentos: 9, anon: true, authenticated: true });
      await db.exec(await migration(correcao));
      expect(await acl(db)).toEqual(restrita(9));
      await db.exec(await migration(correcao));
      expect(await acl(db)).toEqual(restrita(9));
    } finally { await db.close(); }
  });
});
