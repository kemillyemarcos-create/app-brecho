import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const WHATSAPP_ACCESS_TOKEN = Deno.env.get(
  "WHATSAPP_ACCESS_TOKEN",
);

const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get(
  "WHATSAPP_PHONE_NUMBER_ID",
);

const WHATSAPP_GRAPH_API_VERSION =
  Deno.env.get("WHATSAPP_GRAPH_API_VERSION") ??
  "v25.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
);

type EnviarMensagemBody = {
  telefone?: string;
  texto?: string;
  conversaId?: string;
  contatoId?: string;
  respostaDeMessageId?: string;
};

type RespostaMeta = {
  messaging_product?: string;
  contacts?: Array<{
    input?: string;
    wa_id?: string;
  }>;
  messages?: Array<{
    id?: string;
    message_status?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

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

function normalizarTelefone(
  telefone: string,
): string {
  return telefone.replace(/\D/g, "");
}

function criarSupabaseAdmin() {
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

function validarConfiguracao(): void {
  if (!WHATSAPP_ACCESS_TOKEN) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN não configurado.",
    );
  }

  if (!WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID não configurado.",
    );
  }
}

async function enviarParaMeta(
  telefone: string,
  texto: string,
  respostaDeMessageId?: string,
): Promise<RespostaMeta> {
  validarConfiguracao();

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: telefone,
    type: "text",
    text: {
      preview_url: false,
      body: texto,
    },
  };

  if (respostaDeMessageId) {
    payload.context = {
      message_id: respostaDeMessageId,
    };
  }

  const endpoint =
    `https://graph.facebook.com/` +
    `${WHATSAPP_GRAPH_API_VERSION}/` +
    `${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization:
        `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const dados =
    await response.json() as RespostaMeta;

  if (!response.ok || dados.error) {
    throw new Error(
      dados.error?.message ??
        `A Meta retornou HTTP ${response.status}.`,
    );
  }

  return dados;
}

async function localizarConversaEContato(
  telefone: string,
  conversaId?: string,
  contatoId?: string,
): Promise<{
  conversaId: string;
  contatoId: string;
}> {
  const supabase = criarSupabaseAdmin();

  if (conversaId && contatoId) {
    return {
      conversaId,
      contatoId,
    };
  }

  const telefoneNormalizado =
    normalizarTelefone(telefone);

  const {
    data: contato,
    error: erroContato,
  } = await supabase
    .from("whatsapp_contatos")
    .select("id")
    .eq(
      "telefone_normalizado",
      telefoneNormalizado,
    )
    .maybeSingle();

  if (erroContato) {
    throw new Error(
      `Erro ao localizar contato: ${erroContato.message}`,
    );
  }

  if (!contato) {
    throw new Error(
      "O telefone ainda não possui contato cadastrado.",
    );
  }

  const {
    data: conversa,
    error: erroConversa,
  } = await supabase
    .from("whatsapp_conversas")
    .select("id")
    .eq("contato_id", contato.id)
    .neq("status", "encerrada")
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (erroConversa) {
    throw new Error(
      `Erro ao localizar conversa: ${erroConversa.message}`,
    );
  }

  if (!conversa) {
    throw new Error(
      "O contato não possui conversa aberta.",
    );
  }

  return {
    conversaId: conversa.id,
    contatoId: contato.id,
  };
}

async function registrarMensagemSaida(
  telefone: string,
  texto: string,
  respostaMeta: RespostaMeta,
  conversaId?: string,
  contatoId?: string,
  respostaDeMessageId?: string,
): Promise<void> {
  const supabase = criarSupabaseAdmin();

  const ids = await localizarConversaEContato(
    telefone,
    conversaId,
    contatoId,
  );

  const whatsappMessageId =
    respostaMeta.messages?.[0]?.id;

  if (!whatsappMessageId) {
    throw new Error(
      "A Meta não retornou o identificador da mensagem.",
    );
  }

  const enviadaEm = new Date().toISOString();

  const {
    error: erroMensagem,
  } = await supabase
    .from("whatsapp_mensagens")
    .insert({
      conversa_id: ids.conversaId,
      contato_id: ids.contatoId,
      whatsapp_message_id:
        whatsappMessageId,
      direcao: "saida",
      origem: "sistema",
      tipo: "text",
      texto,
      conteudo: respostaMeta,
      resposta_de_message_id:
        respostaDeMessageId ?? null,
      status: "aceita",
      enviada_em: enviadaEm,
    });

  if (erroMensagem) {
    throw new Error(
      `Erro ao salvar mensagem enviada: ${erroMensagem.message}`,
    );
  }

  const {
    error: erroConversa,
  } = await supabase
    .from("whatsapp_conversas")
    .update({
      ultima_mensagem_em: enviadaEm,
      ultima_mensagem_texto: texto,
    })
    .eq("id", ids.conversaId);

  if (erroConversa) {
    throw new Error(
      `Erro ao atualizar conversa: ${erroConversa.message}`,
    );
  }
}

export default {
  async fetch(
    request: Request,
  ): Promise<Response> {
    try {
      if (request.method !== "POST") {
        return respostaJson(
          {
            erro: "Método não permitido.",
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
            erro: "O conteúdo deve ser JSON.",
          },
          415,
        );
      }

      const body =
        await request.json() as EnviarMensagemBody;

      const telefone = normalizarTelefone(
        body.telefone ?? "",
      );

      const texto =
        body.texto?.trim() ?? "";

      if (!telefone) {
        return respostaJson(
          {
            erro: "Telefone obrigatório.",
          },
          400,
        );
      }

      if (!texto) {
        return respostaJson(
          {
            erro: "Texto obrigatório.",
          },
          400,
        );
      }

      if (texto.length > 4096) {
        return respostaJson(
          {
            erro:
              "A mensagem excede 4096 caracteres.",
          },
          400,
        );
      }

      const respostaMeta =
        await enviarParaMeta(
          telefone,
          texto,
          body.respostaDeMessageId,
        );

      await registrarMensagemSaida(
        telefone,
        texto,
        respostaMeta,
        body.conversaId,
        body.contatoId,
        body.respostaDeMessageId,
      );

      return respostaJson({
        enviado: true,
        whatsappMessageId:
          respostaMeta.messages?.[0]?.id,
      });
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        "Erro ao enviar mensagem pelo WhatsApp:",
        mensagem,
      );

      return respostaJson(
        {
          enviado: false,
          erro: mensagem,
        },
        500,
      );
    }
  },
};