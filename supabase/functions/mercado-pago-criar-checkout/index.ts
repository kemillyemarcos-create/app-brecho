import "@supabase/functions-js/edge-runtime.d.ts";

import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL");

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

const MERCADO_PAGO_ACCESS_TOKEN =
  Deno.env.get(
    "MERCADO_PAGO_ACCESS_TOKEN",
  );

const MERCADO_PAGO_ORDERS_URL =
  "https://" + "api.mercadopago.com/v1/orders";

type CriarCheckoutBody = {
  pedidoToken?: string;
};

type PreparacaoPagamento = {
  empresa_id: string;
  pedido_id: string;
  pagamento_id: string;
  idempotency_key: string;
  valor: number | string;
  moeda: string;
  cliente_nome: string;
  cliente_cpf: string;
  cliente_telefone: string;
  pagamento_expira_em: string;
  pagamento_status: string;
  provider_payment_id: string | null;
  provider_checkout_id: string | null;
};

type RespostaMercadoPago = {
  id?: string;
  type?: string;
  processing_mode?: string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: string;
  checkout_url?: string;
  client_token?: string;
  message?: string;
  error?: string;
  status_code?: number;
  cause?: unknown[];
};

function respostaJson(
  dados: unknown,
  status = 200,
): Response {
  return Response.json(
    dados,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "content-type",
        "Access-Control-Allow-Methods":
          "POST, OPTIONS",
      },
    },
  );
}

function criarSupabaseAdmin(): SupabaseClient {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Credenciais internas do Supabase não configuradas.",
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

function validarPedidoToken(
  pedidoToken: unknown,
): string {
  if (
    typeof pedidoToken !== "string"
  ) {
    throw new Error(
      "Token do pedido obrigatório.",
    );
  }

  const token = pedidoToken.trim();

  if (
    !/^[0-9a-f]{64}$/.test(token)
  ) {
    throw new Error(
      "Token do pedido inválido.",
    );
  }

  return token;
}

function formatarValorMercadoPago(
  valor: number | string,
): string {
  const numero =
    typeof valor === "number"
      ? valor
      : Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero <= 0
  ) {
    throw new Error(
      "Valor do pagamento inválido.",
    );
  }

  return numero.toFixed(2);
}

async function prepararPagamento(
  supabase: SupabaseClient,
  pedidoToken: string,
): Promise<PreparacaoPagamento> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "loja_preparar_pagamento",
    {
      p_pedido_token:
        pedidoToken,
    },
  );

  if (error) {
    throw new Error(
      `Não foi possível preparar o pagamento: ${error.message}`,
    );
  }

  const lista =
    Array.isArray(data)
      ? data
      : [];

  const pagamento =
    lista[0] as
      | PreparacaoPagamento
      | undefined;

  if (!pagamento) {
    throw new Error(
      "Pagamento não foi preparado.",
    );
  }

  if (
    pagamento.moeda !== "BRL"
  ) {
    throw new Error(
      "Moeda do pagamento não suportada.",
    );
  }

  if (
    pagamento.pagamento_status !==
      "pending" &&
    pagamento.pagamento_status !==
      "authorized"
  ) {
    throw new Error(
      "Pagamento não está disponível para checkout.",
    );
  }

  return pagamento;
}

async function criarOrderMercadoPago(
  pagamento: PreparacaoPagamento,
): Promise<RespostaMercadoPago> {
  if (!MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error(
      "MERCADO_PAGO_ACCESS_TOKEN não configurado.",
    );
  }

  const totalAmount =
    formatarValorMercadoPago(
      pagamento.valor,
    );

  const payload = {
    type: "online",
    processing_mode: "manual",
    total_amount: totalAmount,
    external_reference:
      pagamento.pagamento_id,
    description:
      `Pedido K.Chic ${pagamento.pedido_id}`,
  };

  const response = await fetch(
    MERCADO_PAGO_ORDERS_URL,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        "Content-Type":
          "application/json",
        Accept:
          "application/json",
        "X-Idempotency-Key":
          pagamento.idempotency_key,
      },
      body: JSON.stringify(
        payload,
      ),
    },
  );

  let dados: RespostaMercadoPago;

  try {
    dados =
      await response.json() as
        RespostaMercadoPago;
  } catch {
    throw new Error(
      `Mercado Pago retornou resposta inválida. HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    console.error(
      "Erro ao criar order no Mercado Pago.",
      {
        httpStatus:
          response.status,
        pagamentoId:
          pagamento.pagamento_id,
        pedidoId:
          pagamento.pedido_id,
        erro:
          dados.error ??
          dados.message ??
          null,
      },
    );

    throw new Error(
      dados.message ??
        dados.error ??
        `Mercado Pago retornou HTTP ${response.status}.`,
    );
  }

  if (
    typeof dados.id !== "string" ||
    !dados.id.trim()
  ) {
    throw new Error(
      "Mercado Pago não retornou o identificador da order.",
    );
  }

  if (
    typeof dados.checkout_url !==
      "string" ||
    !dados.checkout_url.trim()
  ) {
    throw new Error(
      "Mercado Pago não retornou a URL do checkout.",
    );
  }

  return dados;
}

async function registrarCheckout(
  supabase: SupabaseClient,
  pagamentoId: string,
  providerCheckoutId: string,
): Promise<void> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "loja_registrar_checkout_pagamento",
    {
      p_pagamento_id:
        pagamentoId,
      p_provider_checkout_id:
        providerCheckoutId,
    },
  );

  if (error) {
    throw new Error(
      `Não foi possível registrar o checkout: ${error.message}`,
    );
  }

  const lista =
    Array.isArray(data)
      ? data
      : [];

  if (lista.length !== 1) {
    throw new Error(
      "Registro do checkout retornou resultado inesperado.",
    );
  }
}

function classificarErroHttp(
  mensagem: string,
): number {
  if (
    mensagem.includes(
      "Token do pedido obrigatório",
    ) ||
    mensagem.includes(
      "Token do pedido inválido",
    ) ||
    mensagem.includes(
      "Prazo de pagamento expirado",
    ) ||
    mensagem.includes(
      "Pedido não está disponível para pagamento",
    )
  ) {
    return 400;
  }

  if (
    mensagem.includes(
      "Pedido não encontrado",
    )
  ) {
    return 404;
  }

  return 500;
}

export default {
  async fetch(
    request: Request,
  ): Promise<Response> {
    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin":
              "*",
            "Access-Control-Allow-Headers":
              "content-type",
            "Access-Control-Allow-Methods":
              "POST, OPTIONS",
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    try {
      if (
        request.method !==
        "POST"
      ) {
        return respostaJson(
          {
            erro:
              "Método não permitido.",
          },
          405,
        );
      }

      const contentType =
        request.headers.get(
          "content-type",
        ) ?? "";

      if (
        !contentType.includes(
          "application/json",
        )
      ) {
        return respostaJson(
          {
            erro:
              "O conteúdo deve ser JSON.",
          },
          415,
        );
      }

      let body: CriarCheckoutBody;

      try {
        body =
          await request.json() as
            CriarCheckoutBody;
      } catch {
        return respostaJson(
          {
            erro:
              "JSON inválido.",
          },
          400,
        );
      }

      const pedidoToken =
        validarPedidoToken(
          body.pedidoToken,
        );

      const supabase =
        criarSupabaseAdmin();

      const pagamento =
        await prepararPagamento(
          supabase,
          pedidoToken,
        );

      const order =
        await criarOrderMercadoPago(
          pagamento,
        );

      await registrarCheckout(
        supabase,
        pagamento.pagamento_id,
        order.id!,
      );

      console.log(
        "Checkout Mercado Pago criado.",
        {
          pedidoId:
            pagamento.pedido_id,
          pagamentoId:
            pagamento.pagamento_id,
          providerCheckoutId:
            order.id,
        },
      );

      return respostaJson({
        checkoutUrl:
          order.checkout_url,
        pagamentoId:
          pagamento.pagamento_id,
        pedidoId:
          pagamento.pedido_id,
        providerCheckoutId:
          order.id,
      });
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        "Erro ao criar checkout Mercado Pago:",
        mensagem,
      );

      return respostaJson(
        {
          erro:
            classificarErroHttp(
              mensagem,
            ) >= 500
              ? "Não foi possível iniciar o pagamento."
              : mensagem,
        },
        classificarErroHttp(
          mensagem,
        ),
      );
    }
  },
};
