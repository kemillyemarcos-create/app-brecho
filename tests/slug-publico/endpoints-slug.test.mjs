import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

function extrairFuncao(source, nome) {
  const inicio = source.indexOf(`function ${nome}(`);

  if (inicio < 0) {
    throw new Error(`Função ${nome} não encontrada`);
  }

  const proxima = source.indexOf('\nfunction ', inicio + 1);

  return source.slice(
    inicio,
    proxima < 0 ? source.length : proxima,
  );
}

function carregarValidadorCarrinho() {
  const source = readFileSync(
    new URL(
      '../../supabase/functions/loja-carrinho/index.ts',
      import.meta.url,
    ),
    'utf8',
  );

  const funcao = extrairFuncao(
    source,
    'validarEmpresaSlug',
  );

  const js = stripTypeScriptTypes(
    `${funcao}
     globalThis.resultado = validarEmpresaSlug;`,
  );

  const context = vm.createContext({});
  vm.runInContext(js, context);

  return context.resultado;
}

function carregarValidadorCadastro() {
  const source = readFileSync(
    new URL(
      '../../supabase/functions/cadastro-cliente-publico/index.ts',
      import.meta.url,
    ),
    'utf8',
  );

  const validarTexto = extrairFuncao(
    source,
    'validarTexto',
  );

  const validarSlug = extrairFuncao(
    source,
    'validarEmpresaSlug',
  );

  const js = stripTypeScriptTypes(
    `${validarTexto}
     ${validarSlug}
     globalThis.resultado = validarEmpresaSlug;`,
  );

  const context = vm.createContext({});
  vm.runInContext(js, context);

  return context.resultado;
}

for (const [
  nome,
  carregar,
] of [
  ['carrinho', carregarValidadorCarrinho],
  ['cadastro público', carregarValidadorCadastro],
]) {
  test(`${nome}: aceita slug com 100 caracteres`, () => {
    const validar = carregar();

    const slug = 'a'.repeat(100);

    assert.equal(
      validar(slug),
      slug,
    );
  });

  test(`${nome}: rejeita slug com 101 caracteres`, () => {
    const validar = carregar();

    const slug = 'a'.repeat(101);

    assert.throws(
      () => validar(slug),
      /Loja inválida|Dados de cadastro inválidos/,
    );
  });
}
