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

const MERCADO_PAGO_WEBHOOK_SECRET =
  Deno.env.get(
    "MERCADO_PAGO_WEBHOOK_SECRET",
  );

const MERCADO_PAGO_ORDERS_URL =
  "https://" + "api.mercadopago.com/v1/orders";

type WebhookBody = {
  id?: string | number;
  action?: string;
  type?: string;
  live_mode?: boolean;
  data?: {
    id?: string;
  };
};

type OrderPayment = {
  id?: string;
  status?: string;
  status_detail?: string;
  paid_amount?: string;
  payment_method?: {
    id?: string;
    type?: string;
  };
};

type MercadoPagoOrder = {
  id?: string;
  external_reference?: string;
  status?: string;
  status_detail?: string;
  total_amount?: string;
  total_paid_amount?: string;
  transactions?: {
    payments?: OrderPayment[];
  };
  message?: string;
  error?: string;
};

type EventoRegistrado = {
  evento_id: string;
  resultado: string;
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

function bytesParaHex(
  bytes: ArrayBuffer,
): string {
  return Array.from(
    new Uint8Array(bytes),
  )
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(2, "0"),
    )
    .join("");
}

async function sha256Hex(
  texto: string,
): Promise<string> {
  const dados =
    new TextEncoder().encode(texto);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      dados,
    );

  return bytesParaHex(hash);
}

function extrairAssinatura(
  xSignature: string,
): {
  ts: string;
  v1: string;
} {
  let ts = "";
  let v1 = "";

  for (
    const parte of
      xSignature.split(",")
  ) {
    const [
      chaveBruta,
      ...valorPartes
    ] = parte.split("=");

    const chave =
      chaveBruta?.trim();

    const valor =
      valorPartes.join("=").trim();

    if (chave === "ts") {
      ts = valor;
    }

    if (chave === "v1") {
      v1 = valor;
    }
  }

  if (!ts || !v1) {
    throw new Error(
      "Assinatura do webhook inválida.",
    );
  }

  return {
    ts,
    v1:
      v1.toLowerCase(),
  };
}

async function hmacSha256Hex(
  segredo: string,
  mensagem: string,
): Promise<string> {
  const encoder =
    new TextEncoder();

  const chave =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(segredo),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    );

  const assinatura =
    await crypto.subtle.sign(
      "HMAC",
      chave,
      encoder.encode(mensagem),
    );

  return bytesParaHex(
    assinatura,
  );
}

function hexParaBytes(
  valor: string,
): Uint8Array | null {
  if (
    !/^[0-9a-f]{64}$/i.test(valor)
  ) {
    return null;
  }

  const bytes =
    new Uint8Array(
      valor.length / 2,
    );

  for (
    let indice = 0;
    indice < bytes.length;
    indice++
  ) {
    bytes[indice] =
      Number.parseInt(
        valor.slice(
          indice * 2,
          indice * 2 + 2,
        ),
        16,
      );
  }

  return bytes;
}

function comparacaoConstanteHex(
  esperado: string,
  recebido: string,
): boolean {
  const esperadoBytes =
    hexParaBytes(esperado);

  const recebidoBytes =
    hexParaBytes(recebido);

  if (
    !esperadoBytes ||
    !recebidoBytes ||
    esperadoBytes.length !==
      recebidoBytes.length
  ) {
    return false;
  }

  let diferenca = 0;

  for (
    let indice = 0;
    indice <
    esperadoBytes.length;
    indice++
  ) {
    diferenca |=
      esperadoBytes[indice] ^
      recebidoBytes[indice];
  }

  return diferenca === 0;
}

async function validarAssinaturaWebhook(
  request: Request,
  dataId: string,
): Promise<void> {
  if (!MERCADO_PAGO_WEBHOOK_SECRET) {
    throw new Error(
      "MERCADO_PAGO_WEBHOOK_SECRET não configurado.",
    );
  }

  const xSignature =
    request.headers.get(
      "x-signature",
    );

  const xRequestId =
    request.headers.get(
      "x-request-id",
    );

  if (
    !xSignature ||
    !xRequestId
  ) {
    throw new Error(
      "Cabeçalhos de assinatura ausentes.",
    );
  }

  const {
    ts,
    v1,
  } = extrairAssinatura(
    xSignature,
  );

  const dataIdAssinatura =
    dataId;

  const manifesto =
    `id:${dataIdAssinatura};` +
    `request-id:${xRequestId};` +
    `ts:${ts};`;

  const assinaturaEsperada =
    await hmacSha256Hex(
      MERCADO_PAGO_WEBHOOK_SECRET,
      manifesto,
    );

  if (
    !comparacaoConstanteHex(
      assinaturaEsperada,
      v1,
    )
  ) {
    throw new Error(
      "Assinatura do webhook inválida.",
    );
  }
}

function validarUuid(
  valor: unknown,
): string {
  if (
    typeof valor !== "string"
  ) {
    throw new Error(
      "Referência externa inválida.",
    );
  }

  const uuid =
    valor.trim().toLowerCase();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      uuid,
    )
  ) {
    throw new Error(
      "Referência externa inválida.",
    );
  }

  return uuid;
}

async function buscarOrderOficial(
  orderId: string,
): Promise<MercadoPagoOrder> {
  if (!MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error(
      "MERCADO_PAGO_ACCESS_TOKEN não configurado.",
    );
  }

  const response =
    await fetch(
      `${MERCADO_PAGO_ORDERS_URL}/${encodeURIComponent(orderId)}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
          Accept:
            "application/json",
        },
      },
    );

  let dados: MercadoPagoOrder;

  try {
    dados =
      await response.json() as
        MercadoPagoOrder;
  } catch {
    throw new Error(
      `Mercado Pago retornou resposta inválida. HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    console.error(
      "Erro ao consultar Order no Mercado Pago.",
      {
        orderId,
        httpStatus:
          response.status,
        erro:
          dados.error ??
          dados.message ??
          null,
      },
    );

    throw new Error(
      `Não foi possível consultar a Order no Mercado Pago. HTTP ${response.status}.`,
    );
  }

  if (
    typeof dados.id !== "string" ||
    dados.id !== orderId
  ) {
    throw new Error(
      "Mercado Pago retornou uma Order inconsistente.",
    );
  }

  return dados;
}

async function validarPagamentoInterno(
  supabase: SupabaseClient,
  pagamentoId: string,
  orderId: string,
): Promise<void> {
  const {
    data,
    error,
  } = await supabase
    .from("pagamentos_loja")
    .select(
      "id, provider, provider_checkout_id",
    )
    .eq(
      "id",
      pagamentoId,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Não foi possível validar o pagamento interno: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Pagamento interno não encontrado.",
    );
  }

  if (
    data.provider !==
      "mercado_pago"
  ) {
    throw new Error(
      "Pagamento interno pertence a outro provedor.",
    );
  }

  if (
    data.provider_checkout_id !==
      orderId
  ) {
    throw new Error(
      "Order do Mercado Pago não corresponde ao checkout registrado.",
    );
  }
}

async function registrarEvento(
  supabase: SupabaseClient,
  pagamentoId: string,
  providerEventId: string,
  eventType: string,
  payloadHashHex: string,
): Promise<EventoRegistrado> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "loja_registrar_evento_pagamento",
    {
      p_pagamento_id:
        pagamentoId,
      p_provider_event_id:
        providerEventId,
      p_event_type:
        eventType,
      p_payload_hash_hex:
        payloadHashHex,
    },
  );

  if (error) {
    throw new Error(
      `Não foi possível registrar o evento: ${error.message}`,
    );
  }

  const lista =
    Array.isArray(data)
      ? data
      : [];

  const evento =
    lista[0] as
      | EventoRegistrado
      | undefined;

  if (!evento) {
    throw new Error(
      "Registro do evento retornou resultado inesperado.",
    );
  }

  return evento;
}

async function finalizarEvento(
  supabase: SupabaseClient,
  eventoId: string,
  status:
    | "processed"
    | "ignored"
    | "failed",
  errorCode: string | null = null,
): Promise<void> {
  const {
    error,
  } = await supabase.rpc(
    "loja_finalizar_evento_pagamento",
    {
      p_evento_id:
        eventoId,
      p_status:
        status,
      p_error_code:
        errorCode,
    },
  );

  if (error) {
    throw new Error(
      `Não foi possível finalizar o evento: ${error.message}`,
    );
  }
}

function selecionarPagamentoAcreditado(
  order: MercadoPagoOrder,
): OrderPayment | null {
  const pagamentos =
    order.transactions
      ?.payments ?? [];

  return pagamentos.find(
    (pagamento) =>
      pagamento.status ===
        "processed" &&
      pagamento.status_detail ===
        "accredited" &&
      typeof pagamento.id ===
        "string" &&
      pagamento.id.trim() !== "",
  ) ?? null;
}

async function confirmarPagamento(
  supabase: SupabaseClient,
  pagamentoId: string,
  pagamentoMp: OrderPayment,
): Promise<void> {
  const providerPaymentId =
    pagamentoMp.id?.trim();

  if (!providerPaymentId) {
    throw new Error(
      "Mercado Pago não retornou o identificador do pagamento.",
    );
  }

  const metodo =
    pagamentoMp.payment_method
      ?.type ??
    pagamentoMp.payment_method
      ?.id ??
    null;

  const {
    error,
  } = await supabase.rpc(
    "loja_confirmar_pagamento",
    {
      p_pagamento_id:
        pagamentoId,
      p_provider_payment_id:
        providerPaymentId,
      p_metodo:
        metodo,
    },
  );

  if (error) {
    throw new Error(
      `Não foi possível confirmar o pagamento: ${error.message}`,
    );
  }
}

export default {
  async fetch(
    request: Request,
  ): Promise<Response> {
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

    let eventoId: string | null =
      null;

    let supabase:
      | SupabaseClient
      | null = null;

    try {
      const url =
        new URL(request.url);

      const dataIdQuery =
        url.searchParams.get(
          "data.id",
        )?.trim();

      const typeQuery =
        url.searchParams.get(
          "type",
        )?.trim();

      if (
        !dataIdQuery ||
        typeQuery !== "order"
      ) {
        return respostaJson(
          {
            erro:
              "Notificação inválida.",
          },
          400,
        );
      }

      await validarAssinaturaWebhook(
        request,
        dataIdQuery,
      );

      const rawBody =
        await request.text();

      let body: WebhookBody;

      try {
        body =
          JSON.parse(
            rawBody,
          ) as WebhookBody;
      } catch {
        return respostaJson(
          {
            erro:
              "JSON inválido.",
          },
          400,
        );
      }

      if (
        body.type !== "order"
      ) {
        return respostaJson(
          {
            recebido: true,
            ignorado: true,
          },
          200,
        );
      }

      const bodyOrderId =
        body.data?.id?.trim();

      if (
        !bodyOrderId ||
        bodyOrderId !==
          dataIdQuery
      ) {
        return respostaJson(
          {
            erro:
              "Identificador da Order inconsistente.",
          },
          400,
        );
      }

      const providerEventId =
        String(
          body.id ?? "",
        ).trim();

      if (!providerEventId) {
        const dataExpandida =
          body.data &&
          typeof body.data === "object" &&
          "status" in body.data &&
          "transactions" in body.data;

        if (dataExpandida) {
          return respostaJson({
            recebido: true,
            simulacao: true,
          });
        }

        return respostaJson(
          {
            erro:
              "Identificador do evento ausente.",
          },
          400,
        );
      }

      const payloadHashHex =
        await sha256Hex(
          rawBody,
        );

      const order =
        await buscarOrderOficial(
          bodyOrderId,
        );

      const pagamentoId =
        validarUuid(
          order.external_reference,
        );

      supabase =
        criarSupabaseAdmin();

      await validarPagamentoInterno(
        supabase,
        pagamentoId,
        bodyOrderId,
      );

      const evento =
        await registrarEvento(
          supabase,
          pagamentoId,
          providerEventId,
          body.action ??
            "order",
          payloadHashHex,
        );

      eventoId =
        evento.evento_id;

      if (
        evento.resultado ===
          "ja_finalizado"
      ) {
        return respostaJson({
          recebido: true,
          duplicado: true,
        });
      }

      if (
        order.status !==
          "processed" ||
        order.status_detail !==
          "accredited"
      ) {
        await finalizarEvento(
          supabase,
          eventoId,
          "ignored",
        );

        return respostaJson({
          recebido: true,
          processado: false,
        });
      }

      const pagamentoMp =
        selecionarPagamentoAcreditado(
          order,
        );

      if (!pagamentoMp) {
        throw new Error(
          "Order acreditada sem pagamento acreditado.",
        );
      }

      await confirmarPagamento(
        supabase,
        pagamentoId,
        pagamentoMp,
      );

      await finalizarEvento(
        supabase,
        eventoId,
        "processed",
      );

      console.log(
        "Webhook Mercado Pago processado.",
        {
          orderId:
            bodyOrderId,
          pagamentoId,
          eventoId,
          providerPaymentId:
            pagamentoMp.id,
        },
      );

      return respostaJson({
        recebido: true,
        processado: true,
      });
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        "Erro no webhook Mercado Pago:",
        mensagem,
      );

      if (
        eventoId &&
        supabase
      ) {
        try {
          await finalizarEvento(
            supabase,
            eventoId,
            "failed",
            "WEBHOOK_PROCESSING_ERROR",
          );
        } catch (
          erroFinalizacao
        ) {
          console.error(
            "Erro ao marcar evento como failed:",
            erroFinalizacao,
          );
        }
      }

      if (
        mensagem.includes(
          "Assinatura do webhook inválida",
        ) ||
        mensagem.includes(
          "Cabeçalhos de assinatura ausentes",
        )
      ) {
        return respostaJson(
          {
            erro:
              "Assinatura inválida.",
          },
          401,
        );
      }

      if (
        mensagem.includes(
          "MERCADO_PAGO_WEBHOOK_SECRET não configurado",
        )
      ) {
        return respostaJson(
          {
            erro:
              "Webhook temporariamente indisponível.",
          },
          503,
        );
      }

      return respostaJson(
        {
          erro:
            "Não foi possível processar a notificação.",
        },
        500,
      );
    }
  },
};
