import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
const E='11111111-1111-4111-8111-111111111111', U='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const C='22222222-2222-4222-8222-222222222222', PUB='33333333-3333-4333-8333-333333333333';
const P='44444444-4444-4444-8444-444444444444', I='55555555-5555-4555-8555-555555555555', G='66666666-6666-4666-8666-666666666666';
const OUTRA='99999999-9999-4999-8999-999999999999';
let db;
const read = f => readFile(new URL('../../'+f,import.meta.url),'utf8');
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(await read('tests/loja-expedicao/schema-legado.sql'));
 await db.exec(`create schema auth; create function auth.uid() returns uuid language sql stable as
 $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,service_role;`);
 for(const f of ['20260928012606_loja_pedidos_base.sql','20260928194349_loja_pagamentos_base.sql','20260929204927_loja_vendas_base.sql','20261009010000_loja_reembolsos_tardios.sql'])
  await db.exec(await read('supabase/migrations/'+f));
},20000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{
 await db.exec(`reset role; truncate public.empresas, public.clientes, public.pecas, public.loja_publicacoes, public.loja_carrinhos cascade;
 select set_config('test.empresa','${E}',false),set_config('request.jwt.claim.sub','${U}',false);
 insert into empresas values('${E}'); insert into clientes values('CLI','${E}','Teste');
 insert into pecas values('PEC','${E}',true); insert into loja_publicacoes values('${PUB}','${E}');
 insert into loja_carrinhos values('${C}','${E}');
 insert into pedidos_loja(id,empresa_id,carrinho_id,cliente_id,token_publico_hash,status,cliente_nome,cliente_cpf,cliente_telefone,
 subtotal,total,criado_em,pagamento_expira_em,expirado_em)
 values('${P}','${E}','${C}','CLI',decode(repeat('ab',32),'hex'),'expirado','Teste','52998224725','11900000000',100,100,now()-interval '2 hours',now()-interval '1 hour',now());
 insert into pedido_itens_loja(id,empresa_id,pedido_id,publicacao_id,peca_id,nome,preco) values('${I}','${E}','${P}','${PUB}','PEC','Peça revendida',100);
 insert into pagamentos_loja(id,empresa_id,pedido_id,provider,provider_checkout_id,provider_payment_id,status,paid_at,valor)
 values('${G}','${E}','${P}','mercado_pago','ORDER','PAY','paid',now(),100);`);
});
async function preparar(g=G,empresa=E){return (await db.query('select public.loja_preparar_reembolso($1,$2) as r',[g,empresa])).rows[0].r;}
async function listar(){return (await db.query('select * from public.loja_painel_conciliacao($1)',[E])).rows;}
const prova={order_id:'ORDER',payment_id:'PAY',status:'refunded',status_detail:'refunded',refund_id:'REF',refund_status:'processed',amount:'100.00'};
async function concluir(r,e=prova){return db.query('select public.loja_concluir_reembolso($1,$2,$3::jsonb)',[G,r.claim_id,e?JSON.stringify(e):null]);}
async function vender(){await db.exec(`insert into vendas_loja(empresa_id,pedido_id,pedido_item_id,pagamento_id,peca_id,cliente_id,nome_peca,valor_venda)
 values('${E}','${P}','${I}','${G}','PEC','CLI','Peça',100)`);}

describe('refund tardio: contrato SQL e isolamento',()=>{
 it('lista somente expirado + paid + paid_at + sem venda',async()=>{expect(await listar()).toHaveLength(1);});
 it('pago normal não entra nem pode ser reembolsado por este fluxo',async()=>{
  await db.exec("update pedidos_loja set status='pago',pago_em=now()");expect(await listar()).toEqual([]);await expect(preparar()).rejects.toThrow('REEMBOLSO_NAO_ELEGIVEL');
 });
 it.each(['pending','refunded'])('pagamento %s não entra',async status=>{
  await db.exec(status==='pending'?"update pagamentos_loja set status='pending',paid_at=null":"update pagamentos_loja set status='refunded',refunded_at=now()");
  expect(await listar()).toEqual([]);await expect(preparar()).rejects.toThrow('REEMBOLSO_NAO_ELEGIVEL');
 });
 it('venda vinculada impede lista e preparação',async()=>{await vender();expect(await listar()).toEqual([]);await expect(preparar()).rejects.toThrow('REEMBOLSO_NAO_ELEGIVEL');});
 it('bloqueia cross-tenant sem criar operação',async()=>{
  await db.exec(`select set_config('test.empresa','${OUTRA}',false)`);
  await expect(preparar()).rejects.toThrow('PAGAMENTO_INACESSIVEL');await expect(listar()).rejects.toThrow('ACESSO_NEGADO');
  expect((await db.query('select * from loja_reembolsos')).rows).toEqual([]);
 });
 it('pagamento inexistente e vendedor de outra empresa são inacessíveis',async()=>{
  await expect(preparar(OUTRA)).rejects.toThrow('PAGAMENTO_INACESSIVEL');await expect(preparar(G,OUTRA)).rejects.toThrow('PAGAMENTO_INACESSIVEL');
 });
 it.each(["provider='outro'","provider_checkout_id=null","provider_payment_id=null","moeda='USD'"] )('revalida %s',async set=>{
  await db.exec('update pagamentos_loja set '+set);await expect(preparar()).rejects.toThrow('REEMBOLSO_NAO_ELEGIVEL');
 });
 it('paid_at ausente é bloqueado inclusive pela constraint original',async()=>{
  await expect(db.exec('update pagamentos_loja set paid_at=null')).rejects.toThrow();
 });
 it('dupla preparação só admite um worker; retry mantém a mesma chave idempotente',async()=>{
  const [a,b]=await Promise.all([preparar(),preparar()]);expect([a.acao,b.acao].sort()).toEqual(['enviar','ocupado']);
  const primeiro=a.acao==='enviar'?a:b;await concluir(primeiro,null);const retry=await preparar();
  expect(retry.acao).toBe('enviar');expect(retry.idempotency_key).toBe(primeiro.idempotency_key);expect(retry.claim_id).not.toBe(primeiro.claim_id);
  await expect(concluir(primeiro)).rejects.toThrow('CLAIM_INVALIDO');
 });
 it('lease vencido permite nova claim com a mesma chave idempotente',async()=>{
  const a=await preparar();await db.exec("update loja_reembolsos set claim_ate=now()-interval '1 second'");
  expect((await listar())[0].reembolso_estado).toBe('verificacao_necessaria');
  const b=await preparar();expect(b.acao).toBe('enviar');expect(b.idempotency_key).toBe(a.idempotency_key);
  expect(b.claim_id).not.toBe(a.claim_id);
 });
 it('sem prova mantém pagamento paid; prova incorreta não altera estado comercial',async()=>{
  const a=await preparar();await expect(concluir(a,{...prova,amount:'1.00'})).rejects.toThrow('PROVA_INVALIDA');
  expect((await db.query('select status from pagamentos_loja')).rows[0].status).toBe('paid');
  await concluir(a,null);expect((await listar())[0].reembolso_estado).toBe('verificacao_necessaria');
 });
 it('confirmação muda somente pagamento e auditoria; preserva pedido e peça já vendida',async()=>{
  const antes=(await db.query('select to_jsonb(p) as p from pedidos_loja p')).rows[0].p;
  const pagamentoAntes=(await db.query('select to_jsonb(p) as p from pagamentos_loja p')).rows[0].p;
  const a=await preparar();await concluir(a);await concluir(a);
  const depois=(await db.query('select to_jsonb(p) as p from pedidos_loja p')).rows[0].p;expect(depois).toEqual(antes);
  const pg=(await db.query('select to_jsonb(p) as p from pagamentos_loja p')).rows[0].p;
  expect(pg.status).toBe('refunded');expect(pg.paid_at).toBe(pagamentoAntes.paid_at);expect(pg.refunded_at).toBeTruthy();
  expect(pg.failed_at).toBeNull();expect(pg.canceled_at).toBeNull();
  const {status,refunded_at,updated_at,...preservado}=pg;
  const {status:s,refunded_at:r,updated_at:u,...original}=pagamentoAntes;expect(preservado).toEqual(original);
  expect((await db.query('select vendido from pecas')).rows[0].vendido).toBe(true);
  expect((await db.query('select * from vendas_loja')).rows).toEqual([]);expect(await listar()).toEqual([]);
  expect(await preparar()).toEqual({acao:'confirmado'});
 });
 it('revalida venda concorrente antes de finalizar',async()=>{
  const a=await preparar();await vender();await expect(concluir(a)).rejects.toThrow('REEMBOLSO_NAO_ELEGIVEL');
  expect((await db.query('select status from pagamentos_loja')).rows[0].status).toBe('paid');
 });
 it('ACL: usuário lê/prepara, mas não conclui nem manipula auditoria',async()=>{
  await db.exec('set role authenticated');expect(await listar()).toHaveLength(1);const r=await preparar();
  await expect(concluir(r)).rejects.toThrow('permission denied');
  await expect(db.exec("update loja_reembolsos set estado='confirmado'")).rejects.toThrow('permission denied');
  await db.exec('reset role; set role anon');await expect(listar()).rejects.toThrow('permission denied');
  await db.exec('reset role');
  const functions=(await db.query("select proname,prosecdef,proconfig,pg_get_userbyid(proowner) owner from pg_proc where proname in ('loja_painel_conciliacao','loja_preparar_reembolso','loja_concluir_reembolso')")).rows;
  expect(functions).toHaveLength(3);for(const f of functions){expect(f.prosecdef).toBe(true);expect(f.owner).toBe('postgres');expect(f.proconfig).toEqual(['search_path=""']);}
 });
});
