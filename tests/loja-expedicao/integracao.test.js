import { PGlite } from '@electric-sql/pglite';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import EmbeddedPostgres from 'embedded-postgres';
import { Client } from 'pg';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { projetarPedidoLoja, combinarOrigensExpedicao } from '../../src/utils/expedicaoLoja';
import { getItensDaSacolinha, sacolinhaEstaPaga } from '../../src/utils/expedicaoRules';

let pg, db, dir, port;
const native = process.env.KC_NATIVE_POSTGRES === '1';
const empresa = randomUUID();
const outra = randomUUID();
const historicos = [];
const migration = name => readFile(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), 'utf8');
async function connect() {
  const c = new Client({ host: '127.0.0.1', port, user:'postgres',password:'local-test',database:'postgres' });
  await c.connect(); return c;
}
async function criar({ forma='envio',status='pago',venda=true,itens=true }={}) {
  const id=randomUUID(), carrinho=randomUUID(), item=randomUUID(), publicacao=randomUUID(), pagamento=randomUUID();
  const cliente=`CLI-${id}`, peca=`PEC-${id}`;
  await db.query('INSERT INTO clientes(id,empresa_id,nome) VALUES($1,$2,$3)',[cliente,empresa,'Cliente teste']);
  await db.query('INSERT INTO loja_carrinhos VALUES($1,$2)',[carrinho,empresa]);
  const temColunas=(await db.query("SELECT 1 FROM information_schema.columns WHERE table_name='pedidos_loja' AND column_name='entrega_cep'")).rowCount;
  await db.query(`INSERT INTO pedidos_loja(id,empresa_id,carrinho_id,cliente_id,token_publico_hash,
    cliente_nome,cliente_cpf,cliente_telefone,forma_entrega,subtotal,valor_frete,total,status,pago_em,pagamento_expira_em)
    VALUES($1,$2,$3,$4,$5,'Cliente teste','00000000000','11000000000',$6,100,0,100,$7,
    CASE WHEN $7='pago' THEN now() ELSE null END,now()+interval '1 hour')`,
    // Temporary retirada permits constructing an INSERT with the full snapshot below.
    [id,empresa,carrinho,cliente,randomBytes(32),temColunas?'retirada':forma,status]);
  if(temColunas && forma==='envio') {
    // Replace fixture row instead of mutating immutable production snapshot.
    const old=(await db.query('DELETE FROM pedidos_loja WHERE id=$1 RETURNING *',[id])).rows[0];
    await db.query(`INSERT INTO pedidos_loja(id,empresa_id,carrinho_id,cliente_id,token_publico_hash,
      cliente_nome,cliente_cpf,cliente_telefone,forma_entrega,subtotal,valor_frete,total,status,pago_em,pagamento_expira_em,
      entrega_cep,entrega_endereco,entrega_numero,entrega_bairro,entrega_cidade,entrega_uf,expedicao_integracao_status)
      VALUES($1,$2,$3,$4,$5,'Cliente teste','00000000000','11000000000','envio',100,0,100,$6,$7,now()+interval '1 hour',
      '01001000','Rua teste','S/N','Centro','Cidade','SP','pendente')`,
      [id,empresa,carrinho,cliente,old.token_publico_hash,status,old.pago_em]);
  }
  if(itens) {
    await db.query('INSERT INTO pecas VALUES($1,$2,true)',[peca,empresa]);
    await db.query('INSERT INTO loja_publicacoes VALUES($1,$2)',[publicacao,empresa]);
    await db.query(`INSERT INTO pedido_itens_loja(id,empresa_id,pedido_id,publicacao_id,peca_id,nome,preco)
      VALUES($1,$2,$3,$4,$5,'Peça teste',100)`,[item,empresa,id,publicacao,peca]);
    if(venda) {
      await db.query(`INSERT INTO pagamentos_loja(id,empresa_id,pedido_id,provider,status,valor,moeda,paid_at)
        VALUES($1,$2,$3,'mercado_pago','paid',100,'BRL',now())`,[pagamento,empresa,id]);
      await db.query(`INSERT INTO vendas_loja(empresa_id,pedido_id,pedido_item_id,pagamento_id,peca_id,cliente_id,
        nome_peca,valor_venda,status,vendida_em) VALUES($1,$2,$3,$4,$5,$6,'Peça teste',100,'confirmada',now())`,
        [empresa,id,item,pagamento,peca,cliente]);
    }
  }
  return {id,item,peca,pagamento,cliente};
}
async function integrar(p,c=db,tenant=empresa) {
  return (await c.query('SELECT public.loja_integrar_pedido_expedicao($1,$2) AS r',[tenant,p.id])).rows[0].r;
}
async function comercial(p) {
  return (await db.query(`SELECT p.status,p.pago_em,pg.status AS pagamento,
    (SELECT count(*)::text FROM vendas_loja v WHERE v.pedido_id=p.id) AS vendas,
    (SELECT bool_and(pc.vendido) FROM pedido_itens_loja i JOIN pecas pc ON pc.id=i.peca_id WHERE i.pedido_id=p.id) AS vendido
    FROM pedidos_loja p LEFT JOIN pagamentos_loja pg ON pg.pedido_id=p.id WHERE p.id=$1`,[p.id])).rows;
}
beforeAll(async()=>{
  if (native) {
    dir=await mkdtemp(join(tmpdir(),'kc-expedicao-'));
    const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;
    await new Promise(r=>server.close(r));
    pg=new EmbeddedPostgres({databaseDir:join(dir,'db'),port,user:'postgres',password:'local-test',persistent:false,
      postgresFlags:['-h','127.0.0.1','-k',dir],onLog:()=>{},onError:()=>{}});
    await pg.initialise();await pg.start();db=await connect();
  } else {
    const engine = new PGlite();
    db = { query: async (sql, params) => {
      const result = params ? await engine.query(sql, params) : (await engine.exec(sql)).at(-1);
      return { ...result, rowCount: result.rows?.length ?? 0 };
    }, end: () => engine.close() };
  }
  await db.query(await readFile(new URL('./schema-legado.sql',import.meta.url),'utf8'));
  for(const file of ['20260928012606_loja_pedidos_base','20260928194349_loja_pagamentos_base','20260929204927_loja_vendas_base'])
    await db.query(await migration(file));
  await db.query('INSERT INTO empresas VALUES($1),($2)',[empresa,outra]);
  for(let i=0;i<22;i++) historicos.push(await criar({forma:'retirada',itens:false}));
  for(const file of ['20261006120000_loja_expedicao_base','20261006121000_loja_expedicao_operacoes'])
    await db.query(await migration(file));
},90000);
afterAll(async()=>{await db?.end();await pg?.stop();if(dir)await rm(dir,{recursive:true,force:true});},30000);

describe('PostgreSQL isolado: pipeline logístico real',()=>{
  it('preserva as 22 retiradas anteriores sem backfill',async()=>{
    const r=await db.query(`SELECT count(*)::text FROM pedidos_loja WHERE id=ANY($1::uuid[]) AND forma_entrega='retirada'
      AND expedicao_integracao_status='nao_aplicavel' AND entrega_cep IS NULL AND entrega_endereco IS NULL AND entrega_numero IS NULL
      AND entrega_complemento IS NULL AND entrega_bairro IS NULL AND entrega_cidade IS NULL AND entrega_uf IS NULL`,[historicos.map(p=>p.id)]);
    expect(r.rows[0].count).toBe('22');
  });
  it('retirada não integra',async()=>{expect((await integrar(historicos[0])).resultado).toBe('nao_elegivel');});
  it('não pago não integra',async()=>{expect((await integrar(await criar({status:'pendente_pagamento'}))).resultado).toBe('nao_elegivel');});
  it('envio pago integra com convenção ERP e estado completo',async()=>{
    const p=await criar(), r=await integrar(p);expect(r.resultado).toBe('integrada');expect(r.pedido_envio_id).toMatch(/^ENV-0\d{13}$/);
    const e=(await db.query('SELECT * FROM pedidos_envio WHERE id=$1',[r.pedido_envio_id])).rows[0];
    expect(e).toMatchObject({cliente_id:p.cliente,empresa_id:empresa,status:'montagem',quantidade_esperada:1});
    expect(e.criado_em).toMatch(/Z$/);expect(e.atualizado_em).toBe(e.criado_em);
  });
  it('retry após resposta perdida mantém mesmo envio',async()=>{
    const p=await criar(), a=await integrar(p), b=await integrar(p);expect(b.pedido_envio_id).toBe(a.pedido_envio_id);
    expect((await db.query('SELECT count(*)::text FROM pedido_envio_pedidos_loja WHERE pedido_loja_id=$1',[p.id])).rows[0].count).toBe('1');
  });
  it.skipIf(!native)('dois executores concorrentes não duplicam',async()=>{
    const p=await criar(), a=await connect(), b=await connect();
    try{const results=await Promise.all([integrar(p,a),integrar(p,b)]);expect(results[0].pedido_envio_id).toBe(results[1].pedido_envio_id);}
    finally{await a.end();await b.end();}
  });
  for (const isolamento of ['READ COMMITTED', 'REPEATABLE READ']) {
    for (const primeira of ['live', 'loja']) {
      it.skipIf(!native)(`${isolamento}: ${primeira.toUpperCase()} vence origem oposta concorrente`, async()=>{
        const p=await criar(), envio=`ENV-RACE-${randomUUID()}`, sacolinha=`SAC-${randomUUID()}`;
        const data='2026-10-06T12:00:00.000Z';
        await db.query(`INSERT INTO pedidos_envio(id,empresa_id,cliente_id,cliente_nome,status,quantidade_esperada,criado_em,atualizado_em)
          VALUES($1,$2,$3,'Cliente teste','montagem',1,$4,$4)`,[envio,empresa,p.cliente,data]);
        await db.query("INSERT INTO sacolinhas_live VALUES($1,$2,'separada')",[sacolinha,empresa]);
        const segunda=primeira==='live'?'loja':'live', a=await connect(), b=await connect();
        let pendente;
        const inserir=(c,origem)=>origem==='live'
          ? c.query('INSERT INTO pedido_envio_sacolinhas VALUES($1,$2,$3,$4)',[randomUUID(),empresa,envio,sacolinha])
          : c.query('INSERT INTO pedido_envio_pedidos_loja(empresa_id,pedido_envio_id,pedido_loja_id) VALUES($1,$2,$3)',[empresa,envio,p.id]);
        try {
          const pidA=(await a.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
          const pidB=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
          for(const [c,origem] of [[a,primeira],[b,segunda]]) {
            await c.query(`SET ROLE ${origem==='live'?'authenticated':'service_role'}`);
            await c.query("SELECT set_config('test.empresa',$1,false)",[empresa]);
            await c.query(`BEGIN ISOLATION LEVEL ${isolamento}`);
            // Fixar ambos os snapshots ANTES de qualquer associação.
            await c.query('SELECT count(*) FROM pg_catalog.pg_class');
          }
          await inserir(a,primeira);
          // Anexar catch imediatamente: erro esperado nunca fica unhandled.
          pendente=inserir(b,segunda).then(()=>({ok:true}),error=>({ok:false,error}));
          let bloqueada=false;
          const limite=Date.now()+3000;
          while(Date.now()<limite) {
            bloqueada=(await db.query('SELECT $1::int=ANY(pg_blocking_pids($2::int)) AS esperando',[pidA,pidB])).rows[0].esperando;
            if(bloqueada) break;
            await new Promise(resolve=>setTimeout(resolve,10));
          }
          expect(bloqueada).toBe(true); // Prova sobreposição real, não corrida por timing.
          await a.query('COMMIT');
          const resultado=await pendente;
          expect(resultado.ok).toBe(false);
          if(isolamento==='REPEATABLE READ') expect(resultado.error.code).toBe('40001');
          else expect(resultado.error.message).toContain('ORIGEM_INCOMPATIVEL');
          await b.query('ROLLBACK');
          const counts=(await db.query(`SELECT
            (SELECT count(*)::int FROM pedido_envio_sacolinhas WHERE empresa_id=$1 AND pedido_envio_id=$2) AS live,
            (SELECT count(*)::int FROM pedido_envio_pedidos_loja WHERE empresa_id=$1 AND pedido_envio_id=$2) AS loja`,[empresa,envio])).rows[0];
          expect(counts).toEqual(primeira==='live'?{live:1,loja:0}:{live:0,loja:1});
          expect((await db.query('SELECT atualizado_em FROM pedidos_envio WHERE id=$1',[envio])).rows[0].atualizado_em).toBe(data);
        } finally {
          // Soltar o vencedor antes de aguardar o perdedor evita deadlock no cleanup.
          await a.query('ROLLBACK');
          if(pendente) await pendente;
          await b.query('ROLLBACK');
          await a.end();await b.end();
        }
      },15000);
    }
  }
  it('único trigger do pai não altera valores na escrita MVCC',async()=>{
    const triggers=(await db.query(`SELECT tgname FROM pg_catalog.pg_trigger
      WHERE tgrelid='public.pedidos_envio'::regclass AND NOT tgisinternal ORDER BY tgname`)).rows;
    expect(triggers.map(t=>t.tgname)).toEqual(['trg_loja_expedicao_pai']);
    const p=await criar(), r=await integrar(p);
    const antes=(await db.query('SELECT * FROM pedidos_envio WHERE id=$1',[r.pedido_envio_id])).rows[0];
    // Reexecuta a guarda de associação já existente com escrita logicamente neutra.
    await db.query('UPDATE pedido_envio_pedidos_loja SET pedido_envio_id=pedido_envio_id WHERE pedido_loja_id=$1',[p.id]);
    expect((await db.query('SELECT * FROM pedidos_envio WHERE id=$1',[r.pedido_envio_id])).rows[0]).toEqual(antes);
  });
  it('40001 propaga pelo helper sem persistir erro ou pai órfão',async()=>{
    const p=await criar(),antes=await comercial(p);
    await db.query(`CREATE FUNCTION public.test_serializacao() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='retry-transacao'; END $$;
      CREATE TRIGGER zz_test_serializacao BEFORE INSERT ON pedido_envio_pedidos_loja FOR EACH ROW EXECUTE FUNCTION public.test_serializacao();`);
    try {
      await expect(integrar(p)).rejects.toMatchObject({code:'40001'});
      expect((await db.query('SELECT expedicao_integracao_status,expedicao_integracao_tentativas FROM pedidos_loja WHERE id=$1',[p.id])).rows[0])
        .toEqual({expedicao_integracao_status:'pendente',expedicao_integracao_tentativas:0});
      expect((await db.query('SELECT count(*)::text FROM pedidos_envio WHERE cliente_id=$1',[p.cliente])).rows[0].count).toBe('0');
      expect(await comercial(p)).toEqual(antes);
    } finally { await db.query('DROP TRIGGER zz_test_serializacao ON pedido_envio_pedidos_loja; DROP FUNCTION public.test_serializacao();'); }
  });
  it('duas associações Live ao mesmo pai continuam permitidas',async()=>{
    const p=await criar(),envio=`ENV-LIVES-${randomUUID()}`,data='2026-10-06T12:00:00.000Z';
    await db.query(`INSERT INTO pedidos_envio(id,empresa_id,cliente_id,cliente_nome,status,quantidade_esperada,atualizado_em)
      VALUES($1,$2,$3,'Cliente teste','montagem',2,$4)`,[envio,empresa,p.cliente,data]);
    await db.query("SELECT set_config('test.empresa',$1,false)",[empresa]);await db.query('SET ROLE authenticated');
    try {
      for(const sacolinha of ['s1','s2']) await db.query('INSERT INTO pedido_envio_sacolinhas VALUES($1,$2,$3,$4)',[randomUUID(),empresa,envio,sacolinha]);
    }finally{await db.query('RESET ROLE');}
    expect((await db.query('SELECT count(*)::text FROM pedido_envio_sacolinhas WHERE pedido_envio_id=$1',[envio])).rows[0].count).toBe('2');
    expect((await db.query('SELECT atualizado_em FROM pedidos_envio WHERE id=$1',[envio])).rows[0].atualizado_em).toBe(data);
  });
  it('rastreio editável; DELETE do pai e escrita no vínculo negados ao browser',async()=>{
    const p=await criar(),r=await integrar(p);
    await db.query("SELECT set_config('test.empresa',$1,false)",[empresa]);await db.query('SET ROLE authenticated');
    try {
      await db.query(`UPDATE pedidos_envio SET codigo_rastreio='TESTE',transportadora='Transportadora teste',
        link_rastreio='https://example.com/rastreio',atualizado_em='2026-10-06T13:00:00.000Z' WHERE id=$1`,[r.pedido_envio_id]);
      expect((await db.query('SELECT codigo_rastreio FROM pedidos_envio WHERE id=$1',[r.pedido_envio_id])).rows[0].codigo_rastreio).toBe('TESTE');
      await expect(db.query('DELETE FROM pedidos_envio WHERE id=$1',[r.pedido_envio_id]))
        .rejects.toMatchObject({code:expect.stringMatching(/^(23001|23503)$/),constraint:'pepl_empresa_envio_fk'});
      for(const sql of [
        'UPDATE pedido_envio_pedidos_loja SET pedido_envio_id=pedido_envio_id WHERE pedido_loja_id=$1',
        'DELETE FROM pedido_envio_pedidos_loja WHERE pedido_loja_id=$1',
        'INSERT INTO pedido_envio_pedidos_loja(pedido_loja_id) VALUES($1)',
      ]) await expect(db.query(sql,[p.id])).rejects.toMatchObject({code:'42501'});
    }finally{await db.query('RESET ROLE');}
    expect((await integrar(p)).pedido_envio_id).toBe(r.pedido_envio_id);
  });
  it('tenant incorreto não encontra pedido',async()=>{await expect(integrar(await criar(),db,outra)).rejects.toThrow('PEDIDO_INACESSIVEL');});
  it('FK composta rejeita vínculo entre tenants',async()=>{
    const p=await criar(),r=await integrar(p);
    await db.query('BEGIN');
    try {
      await db.query('ALTER TABLE pedido_envio_pedidos_loja DISABLE TRIGGER trg_loja_expedicao_origem');
      await expect(db.query('INSERT INTO pedido_envio_pedidos_loja(empresa_id,pedido_envio_id,pedido_loja_id) VALUES($1,$2,$3)',[outra,r.pedido_envio_id,p.id])).rejects.toMatchObject({code:'23503'});
    } finally { await db.query('ROLLBACK'); }
  });
  it('itens sem venda consistente exigem reconciliação',async()=>{
    const p=await criar({venda:false});expect(await integrar(p)).toMatchObject({resultado:'erro',codigo:'VENDAS_INCONSISTENTES'});
    expect((await integrar(p)).resultado).toBe('aguardando_retry');
  });
  it('itens vazios falham',async()=>{expect(await integrar(await criar({itens:false}))).toMatchObject({codigo:'ITENS_AUSENTES'});});
  it('snapshot inválido é bloqueado por constraint e helper defensivo',async()=>{
    const p=await criar();await expect(db.query("UPDATE pedidos_loja SET entrega_cep=null WHERE id=$1",[p.id])).rejects.toThrow('SNAPSHOT_IMUTAVEL');
    // Simula dado legado corrompido em transação local revertida ao final.
    await db.query('BEGIN');
    try{
      await db.query('ALTER TABLE pedidos_loja DISABLE TRIGGER trg_loja_snapshot_entrega');
      await db.query('ALTER TABLE pedidos_loja DROP CONSTRAINT pedidos_loja_entrega_snapshot_ck');
      await db.query('UPDATE pedidos_loja SET entrega_cep=null WHERE id=$1',[p.id]);
      expect(await integrar(p)).toMatchObject({codigo:'SNAPSHOT_INVALIDO'});
    }finally{await db.query('ROLLBACK');}
  });
  it('falha entre pai e vínculo não deixa órfão nem reverte comercial',async()=>{
    const p=await criar(), antes=await comercial(p);
    await db.query(`CREATE FUNCTION public.test_falha() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'PII-nao-persistir'; END $$;
      CREATE TRIGGER zz_test_falha BEFORE INSERT ON pedido_envio_pedidos_loja FOR EACH ROW EXECUTE FUNCTION public.test_falha();`);
    try{
      expect(await integrar(p)).toMatchObject({resultado:'erro',codigo:'FALHA_LOGISTICA'});
      expect((await db.query('SELECT count(*)::text FROM pedidos_envio WHERE cliente_id=$1',[p.cliente])).rows[0].count).toBe('0');
      expect(await comercial(p)).toEqual(antes);
    }finally{await db.query('DROP TRIGGER zz_test_falha ON pedido_envio_pedidos_loja; DROP FUNCTION public.test_falha();');}
    await db.query('SELECT loja_reprogramar_expedicao($1,$2)',[empresa,p.id]);
    expect((await integrar(p)).resultado).toBe('integrada');
  });
  it('falha depois do vínculo também reverte somente logística',async()=>{
    const p=await criar(),antes=await comercial(p);
    await db.query(`CREATE FUNCTION public.test_estado_falha() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.expedicao_integracao_status='integrada' THEN RAISE EXCEPTION 'falha-final'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER zz_test_estado_falha BEFORE UPDATE ON pedidos_loja FOR EACH ROW EXECUTE FUNCTION public.test_estado_falha();`);
    try {
      expect(await integrar(p)).toMatchObject({codigo:'FALHA_LOGISTICA'});
      expect((await db.query('SELECT count(*)::text FROM pedido_envio_pedidos_loja WHERE pedido_loja_id=$1',[p.id])).rows[0].count).toBe('0');
      expect((await db.query('SELECT count(*)::text FROM pedidos_envio WHERE cliente_id=$1',[p.cliente])).rows[0].count).toBe('0');
      expect(await comercial(p)).toEqual(antes);
    } finally { await db.query('DROP TRIGGER zz_test_estado_falha ON pedidos_loja; DROP FUNCTION public.test_estado_falha();'); }
  });
  it('expirado com pagamento paid nunca integra',async()=>{
    const p=await criar();await db.query("UPDATE pedidos_loja SET status='expirado',expirado_em=now() WHERE id=$1",[p.id]);
    expect((await integrar(p)).resultado).toBe('nao_elegivel');
  });
  it('pago continua elegível depois da expiração',async()=>{
    const p=await criar();await db.query("UPDATE pedidos_loja SET criado_em=now()-interval '3 days',pagamento_expira_em=now()-interval '2 days' WHERE id=$1",[p.id]);
    expect((await integrar(p)).resultado).toBe('integrada');
  });
  it('anon/authenticated não executam operações internas',async()=>{
    for(const role of ['anon','authenticated']){
      await db.query(`SET ROLE ${role}`);
      try{await expect(db.query('SELECT loja_expedicao_backlog($1)',[empresa])).rejects.toThrow('permission denied');
        await expect(db.query('SELECT loja_integrar_pedido_expedicao($1,$2)',[empresa,historicos[0].id])).rejects.toThrow('permission denied');
        await expect(db.query('SELECT loja_reprogramar_expedicao($1,$2)',[empresa,historicos[0].id])).rejects.toThrow('permission denied');
      }finally{await db.query('RESET ROLE');}
    }
  });
  it('leitura ERP só devolve snapshot do tenant autorizado',async()=>{
    const p=await criar();const r=await integrar(p);
    await db.query("SELECT set_config('test.empresa',$1,false)",[empresa]);await db.query('SET ROLE authenticated');
    try{
      const rows=(await db.query('SELECT * FROM loja_expedicao_ler($1)',[empresa])).rows;
      expect(rows.find(x=>x.pedido_envio_id===r.pedido_envio_id).itens_loja[0].id).toBe(`loja:${p.item}`);
      await expect(db.query('SELECT * FROM loja_expedicao_ler($1)',[outra])).rejects.toThrow('ACESSO_NEGADO');
      await expect(db.query('SELECT * FROM pedidos_loja')).rejects.toThrow('permission denied');
    }finally{await db.query('RESET ROLE');}
  });
  it('finalização exige conjunto exato e protege UPDATE direto',async()=>{
    const p=await criar(),r=await integrar(p);
    await db.query("SELECT set_config('test.empresa',$1,false)",[empresa]);await db.query('SET ROLE authenticated');
    try{
      await expect(db.query("UPDATE pedidos_envio SET status='enviado' WHERE id=$1",[r.pedido_envio_id])).rejects.toThrow('USE_CONFERENCIA_AUTORIZADA');
      await expect(db.query('SELECT loja_expedicao_finalizar($1,$2,$3)',[empresa,r.pedido_envio_id,[]])).rejects.toThrow('CONFERENCIA_INVALIDA');
      await db.query('SELECT loja_expedicao_finalizar($1,$2,$3)',[empresa,r.pedido_envio_id,[`loja:${p.item}`]]);
    }finally{await db.query('RESET ROLE');}
    expect((await integrar(p)).pedido_envio_id).toBe(r.pedido_envio_id);
    expect((await db.query('SELECT status FROM pedidos_envio WHERE id=$1',[r.pedido_envio_id])).rows[0].status).toBe('enviado');
  });
  it('erro transitório agenda retry e backlog não expõe PII',async()=>{
    const p=await criar();
    await db.query(`CREATE FUNCTION public.test_transitorio() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION USING ERRCODE='55P03', MESSAGE='nao-persistir'; END $$;
      CREATE TRIGGER zz_test_transitorio BEFORE INSERT ON pedido_envio_pedidos_loja FOR EACH ROW EXECUTE FUNCTION public.test_transitorio();`);
    try{expect(await integrar(p)).toMatchObject({codigo:'FALHA_TRANSITORIA'});}
    finally{await db.query('DROP TRIGGER zz_test_transitorio ON pedido_envio_pedidos_loja; DROP FUNCTION public.test_transitorio();');}
    expect((await integrar(p)).resultado).toBe('aguardando_retry');
    const row=(await db.query('SELECT * FROM loja_expedicao_backlog($1,500)',[empresa])).rows.find(x=>x.pedido_id===p.id);
    expect(Object.keys(row).sort()).toEqual(['pedido_id','integracao_status','tentativas','erro_codigo','proxima_tentativa_em'].sort());
    expect(row.proxima_tentativa_em).toBeTruthy();
    await db.query('SELECT loja_reprogramar_expedicao($1,$2)',[empresa,p.id]);
    expect((await integrar(p)).resultado).toBe('integrada');
  });
  it('serviço autorizado integra e operador não muda identidade vinculada',async()=>{
    const p=await criar();await db.query('SET ROLE service_role');
    let r;try{r=await integrar(p);}finally{await db.query('RESET ROLE');}
    expect(r.resultado).toBe('integrada');
    await expect(db.query("UPDATE pedidos_envio SET cliente_nome='outro' WHERE id=$1",[r.pedido_envio_id])).rejects.toThrow('ORIGEM_IMUTAVEL');
    await expect(db.query("UPDATE pedidos_loja SET cliente_nome='outro' WHERE id=$1",[p.id])).rejects.toThrow('ORIGEM_IMUTAVEL');
  });
  it('dados comerciais inconsistentes em preço/cliente não liberam logística',async()=>{
    const p=await criar();await db.query('UPDATE vendas_loja SET valor_venda=90 WHERE pedido_id=$1',[p.id]);
    expect(await integrar(p)).toMatchObject({codigo:'VENDAS_INCONSISTENTES'});
  });
  it('integrada sem vínculo não recria automaticamente',async()=>{
    const p=await criar();
    await db.query("UPDATE pedidos_loja SET expedicao_integracao_status='integrada',expedicao_integrada_em=now() WHERE id=$1",[p.id]);
    expect(await integrar(p)).toMatchObject({codigo:'VINCULO_AUSENTE'});
    expect((await db.query('SELECT loja_reprogramar_expedicao($1,$2) AS ok',[empresa,p.id])).rows[0].ok).toBe(false);
  });
  it('Live continua criando vínculos e não pode misturar origem Loja',async()=>{
    const p=await criar(),r=await integrar(p);
    await db.query("INSERT INTO pedidos_envio(id,empresa_id,cliente_id,cliente_nome,status,quantidade_esperada) VALUES('ENV-LIVE',$1,$2,'Cliente teste','montagem',1)",[empresa,p.cliente]);
    await db.query("INSERT INTO pedido_envio_sacolinhas VALUES('live-link',$1,'ENV-LIVE','s1')",[empresa]);
    await db.query("UPDATE pedido_envio_sacolinhas SET sacolinha_id='s2' WHERE id='live-link'");
    await expect(db.query("INSERT INTO pedido_envio_sacolinhas VALUES('mixed',$1,$2,'s1')",[empresa,r.pedido_envio_id])).rejects.toThrow('ORIGEM_INCOMPATIVEL');
  });
});

describe('Projeções ERP',()=>{
  it('Loja usa identidade estável, valores e snapshot sem sacolinha fake',()=>{
    const data=combinarOrigensExpedicao([{id:'e'}],[{pedido_envio_id:'e',origem:'loja',itens_loja:[{id:'loja:i',valor_venda:12}],destino_loja:{cep:'01001000'}}]);
    expect(projetarPedidoLoja(data[0])).toMatchObject({quantidadeCalculada:1,valorTotalPedido:12,sacolinhas:[],destino_loja:{cep:'01001000'}});
  });
  it('não substitui projeção nem regras de Live',()=>{
    expect(projetarPedidoLoja({id:'live'})).toBeNull();
    const s={id:'s'},itens=[{id:'v',sacolinha_id:'s',status_pagamento:'pago'}];
    expect(getItensDaSacolinha(s,itens)).toEqual(itens);expect(sacolinhaEstaPaga(s,itens)).toBe(true);
  });
});
