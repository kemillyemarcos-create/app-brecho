import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
);

type JsonObject = Record<string, unknown>;

type MensagemWhatsApp = {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: {
    body?: string;
  };
  image?: JsonObject;
  video?: JsonObject;
  audio?: JsonObject;
  document?: JsonObject;
  location?: JsonObject;
  contacts?: unknown[];
  interactive?: JsonObject;
  button?: JsonObject;
  context?: JsonObject;
};

type ContatoMeta = {
  profile?: {
    name?: string;
  };
  wa_id?: string;
};

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

function normalizarTelefone(
  telefoneOriginal: string,
): string {
  return telefoneOriginal.replace(/\D/g, "");
}

function converterTimestampMeta(
  timestamp?: string,
): string {
  if (!timestamp) {
    return new Date().toISOString();
  }

  const segundos = Number(timestamp);

  if (!Number.isFinite(segundos)) {
    return new Date().toISOString();
  }

  return new Date(segundos * 1000).toISOString();
}

function obterTextoMensagem(
  mensagem: MensagemWhatsApp,
): string | null {
  if (mensagem.type === "text") {
    return mensagem.text?.body?.trim() || null;
  }

  if (mensagem.type === "button") {
    const texto = mensagem.button?.text;

    return typeof texto === "string"
      ? texto
      : null;
  }

  if (mensagem.type === "interactive") {
    const interactive = mensagem.interactive;

    if (!interactive) {
      return null;
    }

    const buttonReply = interactive.button_reply;

    if (
      buttonReply &&
      typeof buttonReply === "object"
    ) {
      const title = (
        buttonReply as Record<string, unknown>
      ).title;

      if (typeof title === "string") {
        return title;
      }
    }

    const listReply = interactive.list_reply;

    if (
      listReply &&
      typeof listReply === "object"
    ) {
      const title = (
        listReply as Record<string, unknown>
      ).title;

      if (typeof title === "string") {
        return title;
      }
    }
  }

  return null;
}

function extrairDadosPayload(
  payload: JsonObject,
): {
  contatos: ContatoMeta[];
  mensagens: MensagemWhatsApp[];
  statuses: JsonObject[];
} {
  const entry = Array.isArray(payload.entry)
    ? payload.entry
    : [];

  const contatos: ContatoMeta[] = [];
  const mensagens: MensagemWhatsApp[] = [];
  const statuses: JsonObject[] = [];

  for (const itemEntry of entry) {
    if (
      !itemEntry ||
      typeof itemEntry !== "object"
    ) {
      continue;
    }

    const changes = Array.isArray(
      (itemEntry as JsonObject).changes,
    )
      ? (itemEntry as JsonObject).changes as unknown[]
      : [];

    for (const itemChange of changes) {
      if (
        !itemChange ||
        typeof itemChange !== "object"
      ) {
        continue;
      }

      const value = (
        itemChange as JsonObject
      ).value;

      if (
        !value ||
        typeof value !== "object"
      ) {
        continue;
      }

      const valueObject = value as JsonObject;

      if (Array.isArray(valueObject.contacts)) {
        contatos.push(
          ...valueObject.contacts as ContatoMeta[],
        );
      }

      if (Array.isArray(valueObject.messages)) {
        mensagens.push(
          ...valueObject.messages as MensagemWhatsApp[],
        );
      }

      if (Array.isArray(valueObject.statuses)) {
        statuses.push(
          ...valueObject.statuses as JsonObject[],
        );
      }
    }
  }

  return {
    contatos,
    mensagens,
    statuses,
  };
}

async function registrarEventoBruto(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  payload: JsonObject,
  tipo: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("whatsapp_webhook_eventos")
    .insert({
      tipo,
      payload,
      processado: false,
      tentativas: 0,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Erro ao registrar evento bruto: ${error.message}`,
    );
  }

  return data.id;
}

async function marcarEventoProcessado(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  eventoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_webhook_eventos")
    .update({
      processado: true,
      processado_em: new Date().toISOString(),
      erro: null,
    })
    .eq("id", eventoId);

  if (error) {
    throw new Error(
      `Erro ao finalizar evento: ${error.message}`,
    );
  }
}

async function marcarEventoComErro(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  eventoId: string,
  mensagemErro: string,
): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_webhook_eventos")
    .update({
      processado: false,
      erro: mensagemErro,
      tentativas: 1,
    })
    .eq("id", eventoId);

  if (error) {
    console.error(
      "Não foi possível registrar o erro do evento:",
      error.message,
    );
  }
}

async function obterOuCriarContato(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  telefone: string,
  nomeWhatsApp: string | null,
): Promise<string> {
  const telefoneNormalizado =
    normalizarTelefone(telefone);

  const { data: contatoExistente, error: erroBusca } =
    await supabase
      .from("whatsapp_contatos")
      .select("id, nome_whatsapp")
      .eq(
        "telefone_normalizado",
        telefoneNormalizado,
      )
      .maybeSingle();

  if (erroBusca) {
    throw new Error(
      `Erro ao procurar contato: ${erroBusca.message}`,
    );
  }

  if (contatoExistente) {
    const atualizacao: JsonObject = {
      telefone,
      ultima_interacao_em:
        new Date().toISOString(),
      ativo: true,
    };

    if (nomeWhatsApp) {
      atualizacao.nome_whatsapp = nomeWhatsApp;
    }

    const { error: erroAtualizacao } = await supabase
      .from("whatsapp_contatos")
      .update(atualizacao)
      .eq("id", contatoExistente.id);

    if (erroAtualizacao) {
      throw new Error(
        `Erro ao atualizar contato: ${erroAtualizacao.message}`,
      );
    }

    return contatoExistente.id;
  }

  const { data: novoContato, error: erroCadastro } =
    await supabase
      .from("whatsapp_contatos")
      .insert({
        telefone,
        telefone_normalizado:
          telefoneNormalizado,
        nome_whatsapp: nomeWhatsApp,
        whatsapp_id: telefoneNormalizado,
        ultima_interacao_em:
          new Date().toISOString(),
        ativo: true,
      })
      .select("id")
      .single();

  if (erroCadastro) {
    throw new Error(
      `Erro ao criar contato: ${erroCadastro.message}`,
    );
  }

  return novoContato.id;
}

async function obterOuCriarConversa(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  contatoId: string,
): Promise<string> {
  const { data: conversaExistente, error: erroBusca } =
    await supabase
      .from("whatsapp_conversas")
      .select("id")
      .eq("contato_id", contatoId)
      .neq("status", "encerrada")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (erroBusca) {
    throw new Error(
      `Erro ao procurar conversa: ${erroBusca.message}`,
    );
  }

  if (conversaExistente) {
    return conversaExistente.id;
  }

  const { data: novaConversa, error: erroCadastro } =
    await supabase
      .from("whatsapp_conversas")
      .insert({
        contato_id: contatoId,
        status: "aberta",
        modo_atendimento: "automatico",
        ultima_mensagem_em:
          new Date().toISOString(),
        mensagens_nao_lidas: 0,
      })
      .select("id")
      .single();

  if (erroCadastro) {
    throw new Error(
      `Erro ao criar conversa: ${erroCadastro.message}`,
    );
  }

  return novaConversa.id;
}

async function mensagemJaExiste(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  whatsappMessageId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .select("id")
    .eq(
      "whatsapp_message_id",
      whatsappMessageId,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao verificar mensagem duplicada: ${error.message}`,
    );
  }

  return Boolean(data);
}

async function registrarMensagemRecebida(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  mensagem: MensagemWhatsApp,
  nomeWhatsApp: string | null,
): Promise<void> {
  if (
    !mensagem.id ||
    !mensagem.from ||
    !mensagem.type
  ) {
    throw new Error(
      "Mensagem recebida sem id, remetente ou tipo.",
    );
  }

  if (
    await mensagemJaExiste(
      supabase,
      mensagem.id,
    )
  ) {
    console.log(
      "Mensagem já registrada. Evento ignorado.",
      {
        whatsappMessageId: mensagem.id,
      },
    );

    return;
  }

  const contatoId = await obterOuCriarContato(
    supabase,
    mensagem.from,
    nomeWhatsApp,
  );

  const conversaId = await obterOuCriarConversa(
    supabase,
    contatoId,
  );

  const texto = obterTextoMensagem(mensagem);
  const recebidaEm = converterTimestampMeta(
    mensagem.timestamp,
  );

  const { error: erroMensagem } = await supabase
    .from("whatsapp_mensagens")
    .insert({
      conversa_id: conversaId,
      contato_id: contatoId,
      whatsapp_message_id: mensagem.id,
      direcao: "entrada",
      origem: "whatsapp",
      tipo: mensagem.type,
      texto,
      conteudo: mensagem,
      status: "recebida",
      resposta_de_message_id:
        typeof mensagem.context?.id === "string"
          ? mensagem.context.id
          : null,
      recebida_em: recebidaEm,
    });

  if (erroMensagem) {
    throw new Error(
      `Erro ao registrar mensagem: ${erroMensagem.message}`,
    );
  }

  const { data: conversaAtual, error: erroConversa } =
    await supabase
      .from("whatsapp_conversas")
      .select("mensagens_nao_lidas")
      .eq("id", conversaId)
      .single();

  if (erroConversa) {
    throw new Error(
      `Erro ao consultar conversa: ${erroConversa.message}`,
    );
  }

  const naoLidasAtuais =
    conversaAtual.mensagens_nao_lidas ?? 0;

  const { error: erroAtualizacao } = await supabase
    .from("whatsapp_conversas")
    .update({
      ultima_mensagem_em: recebidaEm,
      ultima_mensagem_texto:
        texto ?? `[${mensagem.type}]`,
      mensagens_nao_lidas:
        naoLidasAtuais + 1,
      status: "aberta",
    })
    .eq("id", conversaId);

  if (erroAtualizacao) {
    throw new Error(
      `Erro ao atualizar conversa: ${erroAtualizacao.message}`,
    );
  }

  console.log(
    "Mensagem do WhatsApp processada.",
    {
      whatsappMessageId: mensagem.id,
      telefone: mensagem.from,
      tipo: mensagem.type,
    },
  );
}

async function processarStatuses(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  statuses: JsonObject[],
): Promise<void> {
  for (const statusItem of statuses) {
    const messageId = statusItem.id;
    const status = statusItem.status;

    if (
      typeof messageId !== "string" ||
      typeof status !== "string"
    ) {
      continue;
    }

    const atualizacao: JsonObject = {
      status,
    };

    const timestamp = converterTimestampMeta(
      typeof statusItem.timestamp === "string"
        ? statusItem.timestamp
        : undefined,
    );

    if (status === "sent") {
      atualizacao.enviada_em = timestamp;
    }

    if (status === "delivered") {
      atualizacao.entregue_em = timestamp;
    }

    if (status === "read") {
      atualizacao.lida_em = timestamp;
    }

    if (status === "failed") {
      atualizacao.falhou_em = timestamp;

      const errors = Array.isArray(
        statusItem.errors,
      )
        ? statusItem.errors
        : [];

      const primeiroErro = errors[0];

      if (
        primeiroErro &&
        typeof primeiroErro === "object"
      ) {
        const erro = primeiroErro as JsonObject;

        if (erro.code !== undefined) {
          atualizacao.erro_codigo =
            String(erro.code);
        }

        if (typeof erro.title === "string") {
          atualizacao.erro_mensagem =
            erro.title;
        }
      }
    }

    const { error } = await supabase
      .from("whatsapp_mensagens")
      .update(atualizacao)
      .eq(
        "whatsapp_message_id",
        messageId,
      );

    if (error) {
      throw new Error(
        `Erro ao atualizar status da mensagem: ${error.message}`,
      );
    }
  }
}

async function processarPayload(
  payload: JsonObject,
): Promise<void> {
  const supabase = criarSupabaseAdmin();

  const {
    contatos,
    mensagens,
    statuses,
  } = extrairDadosPayload(payload);

  const tipoEvento = mensagens.length > 0
    ? "mensagem_recebida"
    : statuses.length > 0
    ? "status_mensagem"
    : "evento_desconhecido";

  const eventoId = await registrarEventoBruto(
    supabase,
    payload,
    tipoEvento,
  );

  try {
    for (const mensagem of mensagens) {
      const telefone = normalizarTelefone(
        mensagem.from,
      );

      const contatoMeta = contatos.find(
        (contato) =>
          normalizarTelefone(
            contato.wa_id ?? "",
          ) === telefone,
      );

      const nomeWhatsApp =
        contatoMeta?.profile?.name?.trim() ||
        null;

      await registrarMensagemRecebida(
        supabase,
        mensagem,
        nomeWhatsApp,
      );
    }

    await processarStatuses(
      supabase,
      statuses,
    );

    await marcarEventoProcessado(
      supabase,
      eventoId,
    );
  } catch (error) {
    const mensagemErro =
      error instanceof Error
        ? error.message
        : String(error);

    await marcarEventoComErro(
      supabase,
      eventoId,
      mensagemErro,
    );

    throw error;
  }
}

export default {
  async fetch(
    request: Request,
  ): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (request.method === "GET") {
        const mode =
          url.searchParams.get("hub.mode");

        const token =
          url.searchParams.get(
            "hub.verify_token",
          );

        const challenge =
          url.searchParams.get(
            "hub.challenge",
          );

        if (!VERIFY_TOKEN) {
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

        const payload =
          await request.json() as JsonObject;

        await processarPayload(payload);

        return respostaJson({
          recebido: true,
          processado: true,
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
        "Erro no webhook do WhatsApp:",
        mensagem,
      );

      return respostaJson(
        {
          erro:
            "Erro interno no webhook.",
          detalhe: mensagem,
        },
        500,
      );
    }
  },
};