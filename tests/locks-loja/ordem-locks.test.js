import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const root = new URL('../../', import.meta.url);

const read = path =>
  readFile(new URL(path, root), 'utf8');

const EMPRESA = '11111111-1111-4111-8111-111111111111';
const CART = '22222222-2222-4222-8222-222222222222';
const PUB = '33333333-3333-4333-8333-333333333333';
const PEDIDO = '44444444-4444-4444-8444-444444444444';
const ITEM = '55555555-5555-4555-8555-555555555555';
const PAGAMENTO = '66666666-6666-4666-8666-666666666666';

async function bancoFinanceiro() {
  const db = new PGlite();

  await db.exec(await read('tests/loja-expedicao/schema-legado.sql'));

  for (const file of [
    'supabase/migrations/20260928012606_loja_pedidos_base.sql',
    'supabase/migrations/20260928194349_loja_pagamentos_base.sql',
    'supabase/migrations/20260929204927_loja_vendas_base.sql',
  ]) {
    await db.exec(await read(file));
  }

  await db.exec(`
    alter table public.pecas
      add column custo text,
      add column cliente text,
      add column cliente_id text,
      add column data_venda text,
      add column valor_venda_final numeric;
  `);

  const snapshot = await read(
    'supabase/migrations/20260914234500_saas_vendas_live_snapshot_custo.sql',
  );

  await db.exec(
    snapshot.slice(
      snapshot.indexOf('create or replace function'),
      snapshot.indexOf('drop trigger if exists'),
    ),
  );

  await db.exec(
    await read('supabase/migrations/20260929214345_loja_vendas_snapshot_custo.sql'),
  );

  await db.exec(
    await read('supabase/migrations/20261007213000_corrige_parser_custo_vendas.sql'),
  );

  await db.exec(
    await read('supabase/migrations/20260929214948_loja_rpc_confirmar_pagamento.sql'),
  );

  // Substitui pela versão com ordem de locks corrigida.
  await db.exec(
    await read('supabase/migrations/20261007223000_alinha_ordem_locks_loja.sql'),
  );

  return db;
}

describe('ordem global de locks da Loja', () => {
  it('mantém confirmação financeira funcionando após alinhar pedido -> pagamento', async () => {
    const db = await bancoFinanceiro();

    try {
      await db.exec(`
        insert into public.empresas values ('${EMPRESA}');
        insert into public.clientes values ('CLI', '${EMPRESA}', 'Teste');
        insert into public.loja_carrinhos values ('${CART}', '${EMPRESA}');
        insert into public.loja_publicacoes values ('${PUB}', '${EMPRESA}');
      `);

      await db.query(
        `insert into public.pecas(id, empresa_id, vendido, custo)
         values ('PEC', $1, false, '1.000,00')`,
        [EMPRESA],
      );

      await db.exec(`
        insert into public.pedidos_loja(
          id, empresa_id, carrinho_id, cliente_id,
          token_publico_hash, cliente_nome, cliente_cpf,
          cliente_telefone, forma_entrega, subtotal,
          valor_frete, total, status, pagamento_expira_em
        )
        values (
          '${PEDIDO}', '${EMPRESA}', '${CART}', 'CLI',
          decode(repeat('aa',32),'hex'),
          'Teste', '00000000000', '11000000000',
          'retirada', 1500, 0, 1500,
          'pendente_pagamento', now() + interval '1 hour'
        );

        insert into public.pedido_itens_loja(
          id, empresa_id, pedido_id, publicacao_id,
          peca_id, nome, preco
        )
        values (
          '${ITEM}', '${EMPRESA}', '${PEDIDO}', '${PUB}',
          'PEC', 'Peça', 1500
        );

        insert into public.pagamentos_loja(
          id, empresa_id, pedido_id, provider,
          status, valor, moeda
        )
        values (
          '${PAGAMENTO}', '${EMPRESA}', '${PEDIDO}',
          'mercado_pago', 'pending', 1500, 'BRL'
        );
      `);

      const confirmacao = await db.query(
        `select *
           from public.loja_confirmar_pagamento($1,$2,$3)`,
        [PAGAMENTO, 'MP-LOCK-TEST', 'pix'],
      );

      expect(confirmacao.rows[0]).toMatchObject({
        resultado: 'confirmado',
        status_pagamento: 'paid',
        status_pedido: 'pago',
        pagamento_tardio: false,
      });

      const estado = await db.query(`
        select
          (select status from public.pagamentos_loja
            where id='${PAGAMENTO}') as pagamento,
          (select status from public.pedidos_loja
            where id='${PEDIDO}') as pedido,
          (select count(*)::integer from public.vendas_loja
            where pedido_id='${PEDIDO}') as vendas,
          (select vendido from public.pecas
            where id='PEC') as vendido,
          (select custo_peca::text from public.vendas_loja
            where pedido_id='${PEDIDO}' limit 1) as custo
      `);

      expect(estado.rows[0]).toEqual({
        pagamento: 'paid',
        pedido: 'pago',
        vendas: 1,
        vendido: true,
        custo: '1000.00',
      });
    } finally {
      await db.close();
    }
  });

  it('mantém ordem financeira determinística pedido -> pagamento', async () => {
    const sql = await read(
      'supabase/migrations/20261007223000_alinha_ordem_locks_loja.sql',
    );

    const inicio = sql.indexOf('-- PEDIDO -> PAGAMENTO');
    const fim = sql.indexOf('-- PAGAMENTO TARDIO');

    expect(inicio).toBeGreaterThan(-1);
    expect(fim).toBeGreaterThan(inicio);

    const trecho = sql.slice(inicio, fim);

    const lockPedido = trecho.indexOf(
      'from public.pedidos_loja pl',
    );
    const lockPagamento = trecho.indexOf(
      'from public.pagamentos_loja pg',
      lockPedido + 1,
    );

    expect(lockPedido).toBeGreaterThan(-1);
    expect(lockPagamento).toBeGreaterThan(lockPedido);

    expect(
      trecho.slice(lockPedido, lockPagamento),
    ).toContain('for update');

    expect(
      trecho.slice(lockPagamento),
    ).toContain('for update');
  });

  it('mantém ordem de publicação determinística peça -> publicação', async () => {
    const sql = await read(
      'supabase/migrations/20261007223000_alinha_ordem_locks_loja.sql',
    );

    const inicio = sql.indexOf('-- PEÇA -> PUBLICAÇÃO');
    const fim = sql.indexOf(
      "if v_peca.vendido is true",
      inicio,
    );

    expect(inicio).toBeGreaterThan(-1);
    expect(fim).toBeGreaterThan(inicio);

    const trecho = sql.slice(inicio, fim);

    const lockPeca = trecho.indexOf(
      'from public.pecas p',
    );
    const lockPublicacao = trecho.indexOf(
      'from public.loja_publicacoes lp',
      lockPeca + 1,
    );

    expect(lockPeca).toBeGreaterThan(-1);
    expect(lockPublicacao).toBeGreaterThan(lockPeca);

    expect(
      trecho.slice(lockPeca, lockPublicacao),
    ).toContain('for update');

    expect(
      trecho.slice(lockPublicacao),
    ).toContain('for update');
  });
});

async function bancoPublicacao() {
  const db = new PGlite();

  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;

    create table public.empresas (
      id uuid primary key
    );

    create table public.pecas (
      id text primary key,
      empresa_id uuid not null,
      vendido boolean default false,
      nome text,
      obs text,
      venda text,
      unique (empresa_id, id)
    );

    create function public.usuario_empresa_operacional_ativo(uuid)
    returns boolean
    language sql
    stable
    as $$
      select $1::text = current_setting('test.empresa', true)
    $$;

    create schema storage;

    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null,
      name text not null
    );

    create function storage.foldername(text)
    returns text[]
    language sql
    immutable
    as $$
      select case
        when position('/' in $1) = 0 then array[]::text[]
        else string_to_array(
          regexp_replace($1, '/[^/]+$', ''),
          '/'
        )
      end
    $$;
  `);

  await db.exec(
    await read(
      'supabase/migrations/20260924212708_loja_publicacoes_fotos_base.sql',
    ),
  );

  const migrationI2 = await read(
    'supabase/migrations/20261007223000_alinha_ordem_locks_loja.sql',
  );

  const inicioPublicar = migrationI2.indexOf(
    'create or replace function public.loja_publicar_produto(',
  );

  if (inicioPublicar < 0) {
    throw new Error('Função loja_publicar_produto não encontrada na migration I2');
  }

  await db.exec(migrationI2.slice(inicioPublicar));

  await db.exec(`set "test.empresa" = '${EMPRESA}'`);

  return db;
}

describe('publicação após alinhamento peça -> publicação', () => {
  it('continua publicando produto válido com foto existente no Storage', async () => {
    const db = await bancoPublicacao();

    try {
      const storagePath = `${EMPRESA}/${PUB}/foto.jpg`;

      await db.query(
        `insert into public.empresas(id)
         values ($1)`,
        [EMPRESA],
      );

      await db.query(
        `insert into public.pecas(
           id,
           empresa_id,
           vendido,
           nome,
           obs,
           venda
         )
         values (
           'PEC-PUBLICAR',
           $1,
           false,
           'Jaqueta teste',
           'Tamanho M',
           '1.299,90'
         )`,
        [EMPRESA],
      );

      await db.query(
        `insert into public.loja_publicacoes(
           id,
           empresa_id,
           peca_id,
           slug,
           marca,
           categoria,
           tamanho,
           condicao,
           descricao,
           publicada
         )
         values (
           $1,
           $2,
           'PEC-PUBLICAR',
           'jaqueta-teste',
           'Marca Teste',
           'jaquetas',
           'M',
           'excelente',
           'Peça de teste da publicação',
           false
         )`,
        [PUB, EMPRESA],
      );

      await db.query(
        `insert into public.loja_publicacao_fotos(
           empresa_id,
           publicacao_id,
           storage_path,
           ordem,
           principal
         )
         values ($1, $2, $3, 1, true)`,
        [EMPRESA, PUB, storagePath],
      );

      await db.query(
        `insert into storage.objects(bucket_id, name)
         values ('loja-produtos', $1)`,
        [storagePath],
      );

      const resultado = await db.query(
        `select *
           from public.loja_publicar_produto($1, $2)`,
        [EMPRESA, PUB],
      );

      expect(resultado.rows).toHaveLength(1);

      const estado = await db.query(
        `select
           publicada,
           publicada_em is not null as tem_publicada_em,
           peca_id
         from public.loja_publicacoes
         where empresa_id = $1
           and id = $2`,
        [EMPRESA, PUB],
      );

      expect(estado.rows[0]).toEqual({
        publicada: true,
        tem_publicada_em: true,
        peca_id: 'PEC-PUBLICAR',
      });
    } finally {
      await db.close();
    }
  });
});
