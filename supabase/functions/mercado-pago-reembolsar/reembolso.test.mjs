import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
const E='11111111-1111-4111-8111-111111111111', G='66666666-6666-4666-8666-666666666666';
const preparacao={acao:'enviar',empresa_id:E,pagamento_id:G,claim_id:'22222222-2222-4222-8222-222222222222',idempotency_key:'33333333-3333-4333-8333-333333333333',order_id:'ORDER',payment_id:'PAY',valor:'100.00',moeda:'BRL'};
const order={id:'ORDER',external_reference:G,total_amount:'100.00',total_paid_amount:'100.00',status:'processed',status_detail:'accredited',transactions:{payments:[{id:'PAY',amount:'100.00',status:'processed',status_detail:'accredited'}]}};
const refunded={...order,status:'refunded',status_detail:'refunded',transactions:{...order.transactions,refunds:[{id:'REF',transaction_id:'PAY',amount:'100.00',status:'processed'}]}};
const request=(body={pagamentoId:G},auth='Bearer usuario')=>new Request('https://fixture.invalid',{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:auth}:{})},body:JSON.stringify(body)});
function carregar(options={}) {
 const calls=[],http=[];
 const source=readFileSync(new URL('./index.ts',import.meta.url),'utf8').replace(/import \{ createClient \} from "npm:@supabase\/supabase-js@2";\s*/,'').replace('export default {','globalThis.handler = {');
 const env={SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'service-fixture',SUPABASE_ANON_KEY:'anon-fixture',MERCADO_PAGO_ACCESS_TOKEN:'mp-fixture',MERCADO_PAGO_EMPRESA_ID:E};
 const context=vm.createContext({Request,Response,URL,AbortSignal,console:{log(){},error(){}},
 Deno:{env:{get:k=>env[k]}},
 createClient:(_url,key,config)=>({auth:{getUser:async()=>options.authError?{error:{},data:{user:null}}:{error:null,data:{user:{id:'operador'}}}},
  rpc:async(name,args)=>{calls.push({name,args,key,config});
   if(name==='loja_preparar_reembolso')return options.prepare?options.prepare(args):{data:{...preparacao},error:null};
   if(name==='loja_concluir_reembolso')return options.finish?options.finish(args):{data:args.p_evidencia?'confirmado':'verificacao_necessaria',error:null};
   throw Error('RPC inesperada');}}),
 fetch:async(url,init)=>{http.push({url,init});if(options.fetch)return options.fetch(url,init,http.length);return Response.json(init.method==='POST'?refunded:order);},
 });
 vm.runInContext(stripTypeScriptTypes(source),context);
 return {handler:context.handler,calls,http};
}
const proofCalls=x=>x.calls.filter(c=>c.name==='loja_concluir_reembolso'&&c.args.p_evidencia);
test('autenticação obrigatória; token inválido não prepara nem acessa MP',async()=>{
 for(const auth of ['', 'Bearer invalido']){const x=carregar({authError:true});assert.equal((await x.handler.fetch(request(undefined,auth))).status,401);assert.equal(x.http.length,0);assert.equal(x.calls.length,0);}
});
test('rejeita empresa/valor controlados pelo browser',async()=>{
 const x=carregar();assert.equal((await x.handler.fetch(request({pagamentoId:G,empresa_id:E,amount:1}))).status,400);assert.equal(x.calls.length,0);
});
test('RPC nega pagamento inexistente/cross-tenant/não elegível antes de chamar MP',async()=>{
 const x=carregar({prepare:()=>({error:{message:'negado'}})});assert.equal((await x.handler.fetch(request())).status,409);assert.equal(x.http.length,0);
 assert.equal(x.calls[0].key,'anon-fixture');assert.equal(x.calls[0].config.global.headers.Authorization,'Bearer usuario');assert.equal(x.calls[0].args.p_empresa_operadora,E);
});
test('token global do vendedor não opera pagamento de outro tenant',async()=>{
 const x=carregar({prepare:()=>({data:{...preparacao,empresa_id:'outra'}})});assert.equal((await x.handler.fetch(request())).status,409);assert.equal(x.http.length,0);
});
test('refund total confirmado: sem body, chave persistente, prova saneada, conclusão backend',async()=>{
 const x=carregar();const r=await x.handler.fetch(request());assert.equal((await r.json()).estado,'confirmado');
 const post=x.http.find(x=>x.init.method==='POST');assert.equal(post.url,'https://api.mercadopago.com/v1/orders/ORDER/refund');assert.equal(post.init.body,undefined);assert.equal(post.init.headers['X-Idempotency-Key'],preparacao.idempotency_key);
 assert.equal(proofCalls(x).length,1);assert.equal(proofCalls(x)[0].key,'service-fixture');
 assert.deepEqual(Object.keys(proofCalls(x)[0].args.p_evidencia).sort(),['amount','order_id','payment_id','refund_id','refund_status','status','status_detail']);
});
for(const [nome,fetch] of [
 ['erro MP',(_u,i)=>i.method==='POST'?new Response('{}',{status:500}):Response.json(order)],
 ['JSON inválido',(_u,i)=>i.method==='POST'?new Response('invalid',{status:200}):Response.json(order)],
 ['resposta incompleta',(_u,i)=>Response.json(i.method==='POST'?{id:'ORDER'}:order)],
 ['refund ainda processing',(_u,i)=>Response.json(i.method==='POST'?{...refunded,transactions:{refunds:[{...refunded.transactions.refunds[0],status:'processing'}]}}:order)],
 ['refund valor incorreto',(_u,i)=>Response.json(i.method==='POST'?{...refunded,transactions:{refunds:[{...refunded.transactions.refunds[0],amount:'1.00'}]}}:order)],
 ['timeout depois de enviar',(_u,i)=>{if(i.method==='POST')throw Error('timeout');return Response.json(order);}],
 ]) test(nome+' não confirma estado local',async()=>{
 const x=carregar({fetch});const r=await x.handler.fetch(request());assert.equal(r.status,202);assert.equal((await r.json()).estado,'verificacao_necessaria');assert.equal(proofCalls(x).length,0);
});
test('Order de outra transação não é reembolsada',async()=>{
 const x=carregar({fetch:()=>Response.json({...order,external_reference:'outro'})});await x.handler.fetch(request());assert.equal(x.http.filter(x=>x.init.method==='POST').length,0);assert.equal(proofCalls(x).length,0);
});
test('resposta perdida após processamento é reconciliada pelo GET pós-timeout',async()=>{
 let processado=false;

 const x=carregar({fetch:(_u,i)=>{
  if(i.method==='POST'){
   processado=true;
   throw Error('resposta perdida');
  }

  return Response.json(processado?refunded:order);
 }});

 const r=await x.handler.fetch(request());

 assert.equal((await r.json()).estado,'confirmado');

 const posts=x.http.filter(x=>x.init.method==='POST');

 assert.equal(posts.length,1);
 assert.equal(
  posts[0].init.headers['X-Idempotency-Key'],
  preparacao.idempotency_key,
 );
 assert.equal(proofCalls(x).length,1);
});
test('sucesso externo e falha ao persistir não reporta confirmação; permite reconciliação',async()=>{
 const x=carregar({finish:a=>a.p_evidencia?{error:{}}:{data:'verificacao_necessaria'}});
 const r=await x.handler.fetch(request());assert.equal((await r.json()).estado,'verificacao_necessaria');
});
test('dois requests simultâneos só enviam um refund',async()=>{
 let claimed=false;
 const x=carregar({prepare:()=>{if(claimed)return {data:{acao:'ocupado'}};claimed=true;return {data:preparacao};}});
 const r=await Promise.all([x.handler.fetch(request()),x.handler.fetch(request())]);assert.deepEqual(r.map(r=>r.status).sort(),[200,202]);assert.equal(x.http.filter(x=>x.init.method==='POST').length,1);
});
test('operação já confirmada não chama provedor novamente',async()=>{
 const x=carregar({prepare:()=>({data:{acao:'confirmado'}})});assert.equal((await (await x.handler.fetch(request())).json()).estado,'confirmado');assert.equal(x.http.length,0);
});
test('falha sem prova permite retry com exatamente a mesma idempotency key',async()=>{
 let tentativaPost=0;

 const x=carregar({
  prepare:()=>({data:{...preparacao,acao:'enviar'}}),

  fetch:(_u,i)=>{
   if(i.method!=='POST') {
    return Response.json(order);
   }

   tentativaPost+=1;

   if(tentativaPost===1) {
    throw Error('falha antes de confirmação do provedor');
   }

   return Response.json(refunded);
  },
 });

 const primeira=await x.handler.fetch(request());

 assert.equal(primeira.status,202);
 assert.equal(
  (await primeira.json()).estado,
  'verificacao_necessaria',
 );

 const segunda=await x.handler.fetch(request());

 assert.equal(
  (await segunda.json()).estado,
  'confirmado',
 );

 const posts=x.http.filter(x=>x.init.method==='POST');

 assert.equal(posts.length,2);

 assert.equal(
  posts[0].init.headers['X-Idempotency-Key'],
  preparacao.idempotency_key,
 );

 assert.equal(
  posts[1].init.headers['X-Idempotency-Key'],
  preparacao.idempotency_key,
 );

 assert.equal(
  posts[0].init.headers['X-Idempotency-Key'],
  posts[1].init.headers['X-Idempotency-Key'],
 );

 assert.equal(proofCalls(x).length,1);
});
