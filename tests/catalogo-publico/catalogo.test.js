import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { beforeAll, afterAll, it, expect } from 'vitest';
let db;
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const migration = name => readFile(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8');
async function consulta(args={}) {
 const p={p_empresa_slug:'a',...args};
 const keys=Object.keys(p);
 return (await db.query(`select public.loja_catalogo_publico_por_slug_v2(${keys.map((k,i)=>`${k} => $${i+1}`).join(',')}) as v`,Object.values(p))).rows[0].v;
}
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`
 create role anon; create role authenticated; create role service_role;
 create schema storage;
 create table empresas(id uuid primary key,slug_publico text,ativo boolean,operacional boolean);
 create function assinatura_empresa_operacional_ativa(uuid) returns boolean language sql stable as 'select operacional from public.empresas where id=$1';
 create table pecas(id text,empresa_id uuid,nome text,venda text,obs text,vendido boolean);
 create table loja_publicacoes(id uuid,empresa_id uuid,peca_id text,slug text,publicada boolean,marca text,categoria text,tamanho text,condicao text,descricao text,publicada_em timestamptz,created_at timestamptz);
 create table loja_publicacao_fotos(id uuid default gen_random_uuid(),empresa_id uuid,publicacao_id uuid,storage_path text,principal boolean,ordem integer,created_at timestamptz default now());
 create table storage.objects(bucket_id text,name text);
 create function storage.foldername(text) returns text[] language sql immutable as 'select (string_to_array($1,''/''))[1:array_length(string_to_array($1,''/''),1)-1]';
 create table pedidos_loja(id uuid,empresa_id uuid,status text,pagamento_expira_em timestamptz);
 create table pedido_itens_loja(empresa_id uuid,pedido_id uuid,peca_id text);
 insert into empresas values('${A}','a',true,true),('${B}','b',true,true);
 insert into pecas select i::text,'${A}',case when i=30 then 'Especial 100% _ lã' else 'Peça '||lpad(i::text,2,'0') end,
 case when i=1 then '1.000,00' when i=2 then 'R$ 9,90' when i=3 then '1000.00' when i=4 then 'inválido' else (i*10)::text end,'observação pública',false from generate_series(1,30) i;
 insert into loja_publicacoes select gen_random_uuid(),empresa_id,id,'peca-'||id,true,case when id='30' then 'Última' else 'Marca' end,'vestidos','M','bom','Descrição',now()-id::integer*interval '1 day',now() from pecas;
 insert into loja_publicacao_fotos(empresa_id,publicacao_id,storage_path,principal,ordem) select empresa_id,id,empresa_id||'/'||id||'/foto.jpg',true,0 from loja_publicacoes;
 insert into storage.objects select 'loja-produtos',storage_path from loja_publicacao_fotos;
 insert into pecas values('outra','${B}','Privada B','1','obs',false);
 insert into loja_publicacoes select gen_random_uuid(),'${B}','outra','peca-30',true,'Outra','outra','G','bom','outra',now(),now();
 insert into loja_publicacao_fotos(empresa_id,publicacao_id,storage_path,principal,ordem) select empresa_id,id,empresa_id||'/'||id||'/foto.jpg',true,0 from loja_publicacoes where empresa_id='${B}';
 insert into storage.objects select 'loja-produtos',storage_path from loja_publicacao_fotos where empresa_id='${B}';
 `);
 for(const f of ['20260928190237_loja_catalogo_oculta_pedido_pendente.sql','20260930141429_loja_catalogo_publico_por_slug.sql','20261003100000_loja_catalogo_interno_restringe_execucao.sql','20261011120000_loja_catalogo_busca_filtros_v2.sql']) await db.exec(await migration(f));
},30000);
afterAll(async()=>{await db?.close();});
it('busca literal encontra a última página e opções abrangem todo o catálogo',async()=>{
 const inicio=await consulta(); expect(inicio.produtos).toHaveLength(24); expect(inicio.tem_mais).toBe(true);
 expect(inicio.opcoes.marcas).toContain('Última');
 const r=await consulta({p_busca:'  ESPECIAL 100% _  '}); expect(r.produtos).toHaveLength(1); expect(r.produtos[0].slug).toBe('peca-30');
 expect((await consulta({p_busca:'%'})).produtos).toHaveLength(1);
 expect((await consulta({p_busca:"' OR true --"})).produtos).toHaveLength(0);
});
it('combina filtros e preserva opções mesmo sem resultados',async()=>{
 expect((await consulta({p_busca:'lã',p_categoria:'vestidos',p_marca:'última',p_tamanho:'m'})).produtos).toHaveLength(1);
 const r=await consulta({p_categoria:'inexistente'}); expect(r.produtos).toHaveLength(0); expect(r.opcoes.marcas).toContain('Última');
});
it('ordena numericamente e não converte preço inválido para zero',async()=>{
 const r=await consulta({p_ordem:'menor-preco',p_limite:100}); expect(r.produtos[0].slug).toBe('peca-2'); expect(r.produtos.at(-1).slug).toBe('peca-4');
 const desc=await consulta({p_ordem:'maior-preco',p_limite:100}); expect(desc.produtos.slice(0,2).map(x=>x.slug).sort()).toEqual(['peca-1','peca-3']); expect(desc.produtos.at(-1).slug).toBe('peca-4');
 for(const [valor,esperado] of [['999,99',999.99],['1.000,00',1000],['1000,00',1000],['1000.00',1000],['R$\u00a020,00',20],['',null],['abc',null],['0',null]]) {
  const n=(await db.query('select internal.loja_catalogo_preco_v2($1) n',[valor])).rows[0].n;
  expect(n===null?null:Number(n)).toBe(esperado);
 }
});
it('LIMIT+1 cobre última página cheia e ordenação estável',async()=>{
 const a=await consulta({p_ordem:'nome',p_limite:15}),b=await consulta({p_ordem:'nome',p_limite:15,p_offset:15});
 expect(a.tem_mais).toBe(true); expect(b.tem_mais).toBe(false); expect(new Set([...a.produtos,...b.produtos].map(x=>x.publicacao_id)).size).toBe(30);
 expect(await consulta({p_ordem:'nome',p_limite:15,p_offset:15})).toEqual(b);
});
it('isola tenants e mantém V1 para consulta individual',async()=>{
 expect((await consulta({p_empresa_slug:'b'})).produtos.map(p=>p.nome)).toEqual(['Privada B']);
 const r=await db.query("select * from loja_catalogo_publico_por_slug('a','peca-30')"); expect(r.rows[0].nome).toContain('Especial');
 expect(Object.keys(r.rows[0]).sort()).toEqual(Object.keys((await consulta()).produtos[0]).sort());
});
it('preserva elegibilidade de publicação, peça, pedido e Storage',async()=>{
 await db.exec('begin');
 try {
  await db.exec(`update pecas set vendido=true where id='1'; update loja_publicacoes set publicada=false where peca_id='2';
  delete from storage.objects where name in(select storage_path from loja_publicacao_fotos f join loja_publicacoes p on p.id=f.publicacao_id where p.peca_id='3');
  update loja_publicacao_fotos set empresa_id='${B}' where publicacao_id in(select id from loja_publicacoes where peca_id='4');
  insert into pedidos_loja values(gen_random_uuid(),'${A}','pendente_pagamento',now()+interval '10 minutes');
  insert into pedido_itens_loja select '${A}',id,'5' from pedidos_loja;
  update loja_publicacao_fotos set storage_path='${B}/errado/foto.jpg' where publicacao_id in(select id from loja_publicacoes where peca_id='6');
  insert into storage.objects values('loja-produtos','${B}/errado/foto.jpg');`);
  const r=await consulta({p_limite:100}); expect(r.produtos).toHaveLength(24);
  expect(r.produtos.some(p=>['peca-1','peca-2','peca-3','peca-4','peca-5','peca-6'].includes(p.slug))).toBe(false);
  await db.exec("update pedidos_loja set pagamento_expira_em=now()-interval '1 minute'");
  expect((await consulta({p_busca:'Peça 05'})).produtos).toHaveLength(1);
  await db.exec(`update empresas set operacional=false where id='${A}'`); expect((await consulta()).produtos).toHaveLength(0);
  expect((await db.query('select * from internal.loja_catalogo_elegivel_v2($1)',[A])).rows).toHaveLength(0);
  await db.exec(`update empresas set operacional=true,ativo=false where id='${A}'`); expect((await consulta()).produtos).toHaveLength(0);
 } finally {await db.exec('rollback');}
});
it('ACL, owner, search_path e argumentos inválidos',async()=>{
 for(const role of ['anon','authenticated']) {
  const r=await db.query(`select has_function_privilege($1,'internal.loja_catalogo_elegivel_v2(uuid)','EXECUTE') helper,
  has_function_privilege($1,'public.loja_catalogo_publico(uuid,text,text,text,text,integer,integer)','EXECUTE') legado,
  has_function_privilege($1,'public.loja_catalogo_publico_por_slug_v2(text,text,text,text,text,text,integer,integer)','EXECUTE') rpc`,[role]);
  expect(r.rows[0]).toEqual({helper:false,legado:false,rpc:true});
 }
 const fs=(await db.query("select proowner::regrole::text owner,proconfig,provolatile from pg_proc where proname in ('loja_catalogo_elegivel_v2','loja_catalogo_publico_por_slug_v2')")).rows;
 expect(fs).toHaveLength(2); for(const f of fs) {expect(f.owner).toBe('postgres');expect(f.proconfig).toContain('search_path=""');expect(f.provolatile).toBe('s');}
 await expect(consulta({p_limite:101})).rejects.toThrow(); await expect(consulta({p_ordem:'SQL'})).rejects.toThrow();
});
it('anon e authenticated executam somente a entrada pública, sem acesso a tabelas/helpers',async()=>{
 for(const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`);
  try {
   expect((await consulta({p_busca:'Especial'})).produtos).toHaveLength(1);
   await expect(db.query('select * from public.pecas')).rejects.toThrow();
   await expect(db.query('select * from internal.loja_catalogo_elegivel_v2($1)',[A])).rejects.toThrow();
  } finally {await db.exec('reset role');}
 }
});
