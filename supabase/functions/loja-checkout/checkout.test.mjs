import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

function carregar(path, rpcData = []) {
  const calls = [];
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    .replace(/^import "@supabase\/functions-js\/edge-runtime.d.ts";\s*/, '')
    .replace(/import \{[\s\S]*?\} from "npm:@supabase\/supabase-js@2";\s*/, '')
    .replace('export default {', 'globalThis.handler = {');
  const db = {
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'tenant-resolvido' } }) }) }) }) }),
    rpc: async (name, args) => { calls.push({ name, args }); return { data: rpcData }; },
  };
  const context = vm.createContext({ Request, Response, URL, console: { error() {}, log() {} },
    Deno: { env: { get: () => 'fixture' } }, createClient: () => db,
    fetch: () => { throw new Error('External API must not be called'); },
  });
  vm.runInContext(stripTypeScriptTypes(source), context);
  return { handler: context.handler, calls };
}
const body = { empresaSlug: 'kchic', operacao: 'consultar', pedidoToken: 'a'.repeat(64) };
function request(data) { return new Request('https://fixture.invalid', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }); }
test('consulta status sem criar pedido ou pagamento e usa tenant resolvido', async () => {
  const { handler, calls } = carregar('./index.ts', [{ status: 'pago', total: 1 }]);
  const response = await handler.fetch(request({ ...body, empresaId: 'tenant-atacante' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'pago');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'loja_consultar_pedido');
  assert.equal(calls[0].args.p_empresa_id, 'tenant-resolvido');
});
test('token inválido não consulta RPC', async () => {
  const { handler, calls } = carregar('./index.ts');
  assert.equal((await handler.fetch(request({ ...body, pedidoToken: 'invalid' }))).status, 400);
  assert.equal(calls.length, 0);
});
test('pedido ausente retorna 404', async () => {
  const { handler } = carregar('./index.ts');
  assert.equal((await handler.fetch(request(body))).status, 404);
});
test('operação desconhecida rejeitada antes de criar pedido', async () => {
  const { handler, calls } = carregar('./index.ts');
  assert.equal((await handler.fetch(request({ ...body, operacao: 'confirmar' }))).status, 400);
  assert.equal(calls.length, 0);
});
test('CORS permite headers do cliente Supabase no pagamento', async () => {
  const { handler, calls } = carregar('../mercado-pago-criar-checkout/index.ts');
  const response = await handler.fetch(new Request('https://fixture.invalid', { method: 'OPTIONS' }));
  assert.equal(response.status, 204);
  for (const header of ['authorization', 'apikey', 'x-client-info', 'content-type']) assert.ok(response.headers.get('Access-Control-Allow-Headers').includes(header));
  assert.equal(calls.length, 0);
});
test('POST JSON lê Content-Type e rejeita token antes da API', async () => {
  const { handler, calls } = carregar('../mercado-pago-criar-checkout/index.ts');
  assert.equal((await handler.fetch(request({ pedidoToken: 'invalido' }))).status, 400);
  assert.equal(calls.length, 0);
});
test('token global não cobra pedido de outro tenant', async () => {
  const { handler, calls } = carregar('../mercado-pago-criar-checkout/index.ts', [{
    empresa_id: 'outro-tenant', moeda: 'BRL', pagamento_status: 'pending', valor: 1,
  }]);
  assert.equal((await handler.fetch(request({ pedidoToken: 'a'.repeat(64) }))).status, 403);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'loja_preparar_pagamento');
});
