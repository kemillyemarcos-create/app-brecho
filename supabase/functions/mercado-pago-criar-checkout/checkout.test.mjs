import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";

function carregar({
  itens = [
    { nome: "Calça Ponto Design", preco: 29 },
  ],
  valorPagamento = 29,
  mercadoPagoStatus = 200,
  mercadoPagoBody = {
    id: "order-123",
    checkout_url:
      "https:" + "//mercadopago.test/checkout",
    integration_data: {
      application_id: "app-123",
    },
  },
} = {}) {
  const chamadasRpc = [];
  const requisicoesMercadoPago = [];
  const errosConsole = [];

  const source = readFileSync(
    new URL("./index.ts", import.meta.url),
    "utf8",
  )
    .replace(
      /^import "@supabase\/functions-js\/edge-runtime.d.ts";\s*/,
      "",
    )
    .replace(
      /import \{[\s\S]*?\} from "npm:@supabase\/supabase-js@2";\s*/,
      "",
    )
    .replace(
      "export default {",
      "globalThis.handler = {",
    );

  const pagamento = {
    empresa_id: "empresa-kchic",
    pedido_id: "11111111-1111-4111-8111-111111111111",
    pagamento_id: "22222222-2222-4222-8222-222222222222",
    idempotency_key: "22222222-2222-4222-8222-222222222222",
    valor: valorPagamento,
    moeda: "BRL",
    cliente_nome: "Cliente Teste",
    cliente_cpf: "12345678901",
    cliente_telefone: "41999999999",
    pagamento_expira_em: "2099-01-01T00:00:00.000Z",
    pagamento_status: "pending",
    provider_payment_id: null,
    provider_checkout_id: null,
  };

  const db = {
    rpc: async (name, args) => {
      chamadasRpc.push({ name, args });

      if (name === "loja_preparar_pagamento") {
        return {
          data: [pagamento],
          error: null,
        };
      }

      if (
        name ===
        "loja_registrar_checkout_pagamento"
      ) {
        return {
          data: [{ resultado: "registrado" }],
          error: null,
        };
      }

      throw new Error(`RPC inesperada: ${name}`);
    },

    from(table) {
      assert.equal(
        table,
        "pedido_itens_loja",
      );

      return {
        select(columns) {
          assert.match(columns, /nome/);
          assert.match(columns, /preco/);

          return {
            eq(column1, value1) {
              assert.equal(
                column1,
                "empresa_id",
              );
              assert.equal(
                value1,
                pagamento.empresa_id,
              );

              return {
                eq(column2, value2) {
                  assert.equal(
                    column2,
                    "pedido_id",
                  );
                  assert.equal(
                    value2,
                    pagamento.pedido_id,
                  );

                  return {
                    order: async () => ({
                      data: itens,
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const context = vm.createContext({
    Request,
    Response,
    URL,
    console: {
      error(...args) {
        errosConsole.push(args);
      },
      log() {},
    },
    Deno: {
      env: {
        get(name) {
          if (
            name ===
            "MERCADO_PAGO_EMPRESA_ID"
          ) {
            return "empresa-kchic";
          }

          if (
            name ===
            "MERCADO_PAGO_PAYER_EMAIL_TEST"
          ) {
            return undefined;
          }

          return "fixture";
        },
      },
    },
    createClient: () => db,
    fetch: async (url, init) => {
      requisicoesMercadoPago.push({
        url,
        init,
      });

      return Response.json(
        mercadoPagoBody,
        {
          status: mercadoPagoStatus,
        },
      );
    },
  });

  vm.runInContext(
    stripTypeScriptTypes(source),
    context,
  );

  return {
    handler: context.handler,
    chamadasRpc,
    requisicoesMercadoPago,
    errosConsole,
  };
}

function request() {
  return new Request(
    "https:" + "//fixture.invalid",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
      },
      body: JSON.stringify({
        pedidoToken: "a".repeat(64),
      }),
    },
  );
}

test(
  "envia os itens reais do pedido ao Mercado Pago",
  async () => {
    const {
      handler,
      requisicoesMercadoPago,
    } = carregar();

    const response =
      await handler.fetch(request());

    assert.equal(response.status, 200);
    assert.equal(
      requisicoesMercadoPago.length,
      1,
    );

    const payload = JSON.parse(
      requisicoesMercadoPago[0].init.body,
    );

    assert.deepEqual(
      JSON.parse(
        JSON.stringify(payload.items),
      ),
      [
        {
          title: "Calça Ponto Design",
          quantity: 1,
          unit_price: "29.00",
          unit_measure: "unit",
          total_amount: "29.00",
        },
      ],
    );

    assert.equal(
      payload.total_amount,
      "29.00",
    );
  },
);

test(
  "não cria Order quando o pedido não possui itens",
  async () => {
    const {
      handler,
      requisicoesMercadoPago,
    } = carregar({
      itens: [],
    });

    const response =
      await handler.fetch(request());

    assert.equal(response.status, 500);
    assert.equal(
      requisicoesMercadoPago.length,
      0,
    );
  },
);

test(
  "não cria Order quando a soma dos itens diverge do total do pagamento",
  async () => {
    const {
      handler,
      requisicoesMercadoPago,
    } = carregar({
      itens: [
        {
          nome: "Calça Ponto Design",
          preco: 28,
        },
      ],
      valorPagamento: 29,
    });

    const response =
      await handler.fetch(request());

    assert.equal(response.status, 500);
    assert.equal(
      requisicoesMercadoPago.length,
      0,
    );
  },
);


test(
  "registra details quando Mercado Pago rejeita a Order",
  async () => {
    const {
      handler,
      errosConsole,
    } = carregar({
      mercadoPagoStatus: 400,
      mercadoPagoBody: {
        status: 400,
        details: [
          {
            code: "unsupported_properties",
            message: "Campo não suportado.",
          },
        ],
      },
    });

    const response =
      await handler.fetch(request());

    assert.equal(response.status, 500);

    const log = JSON.stringify(
      errosConsole,
    );

    assert.match(
      log,
      /unsupported_properties/,
    );
    assert.match(
      log,
      /Campo não suportado/,
    );
  },
);
