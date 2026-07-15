// Tipos do Supabase Edge Runtime.
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
);

function respostaTexto(
  texto: string,
  status = 200,
): Response {
  return new Response(texto, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function respostaJson(
  dados: unknown,
  status = 200,
): Response {
  return Response.json(dados, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function criarSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.",
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

function identificarTipoEvento(
  payload: Record<string, unknown>,
): string {
  const entry = Array.isArray(payload.entry)
    ? payload.entry[0]
    : null;

  const changes =
    entry &&
    typeof entry === "object" &&
    Array.isArray(
      (entry as Record<string, unknown>).changes,
    )
      ? (
        entry as {
          changes: Array<Record<string, unknown>>;
        }
      ).changes
      : [];

  const change = changes[0];

  if (!change) {
    return "evento_desconhecido";
  }

  const value =
    change.value &&
    typeof change.value === "object"
      ? change.value as Record<string, unknown>
      : null;

  if (!value) {
    return "evento_desconhecido";
  }

  if (
    Array.isArray(value.messages) &&
    value.messages.length > 0
  ) {
    return "mensagem_recebida";
  }

  if (
    Array.isArray(value.statuses) &&
    value.statuses.length > 0
  ) {
    return "status_mensagem";
  }

  return String(change.field ?? "evento_desconhecido");
}

async function registrarEvento(
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = criarSupabaseAdmin();
  const tipo = identificarTipoEvento(payload);

  const { error } = await supabase
    .from("whatsapp_webhook_eventos")
    .insert({
      tipo,
      payload,
      processado: false,
      tentativas: 0,
    });

  if (error) {
    throw new Error(
      `Erro ao registrar webhook: ${error.message}`,
    );
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (request.method === "GET") {
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get(
          "hub.verify_token",
        );
        const challenge = url.searchParams.get(
          "hub.challenge",
        );

        if (!VERIFY_TOKEN) {
          console.error(
            "WHATSAPP_VERIFY_TOKEN não está configurado.",
          );

          return respostaTexto(
            "Configuração do webhook incompleta.",
            500,
          );
        }

        if (
          mode === "subscribe" &&
          token === VERIFY_TOKEN &&
          challenge
        ) {
          console.log(
            "Webhook do WhatsApp validado com sucesso.",
          );

          return respostaTexto(challenge);
        }

        return respostaTexto(
          "Verificação recusada.",
          403,
        );
      }

      if (request.method === "POST") {
        const contentType =
          request.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) {
          return respostaJson(
            {
              erro: "O conteúdo deve ser JSON.",
            },
            415,
          );
        }

        const payload =
          await request.json() as Record<
            string,
            unknown
          >;

        await registrarEvento(payload);

        console.log(
          "Evento do WhatsApp registrado no banco.",
          {
            tipo: identificarTipoEvento(payload),
          },
        );

        return respostaJson({
          recebido: true,
        });
      }

      return respostaJson(
        {
          erro: "Método não permitido.",
        },
        405,
      );
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        "Erro inesperado no webhook do WhatsApp:",
        mensagem,
      );

      /*
       * Durante esta fase, retornamos erro para enxergar
       * falhas de banco e configuração nos testes.
       */
      return respostaJson(
        {
          erro: "Erro interno no webhook.",
          detalhe: mensagem,
        },
        500,
      );
    }
  },
};