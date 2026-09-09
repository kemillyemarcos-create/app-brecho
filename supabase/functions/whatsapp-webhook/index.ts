import "@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const WHATSAPP_APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET");

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

type ChangeWhatsApp = {
  phoneNumberId: string | null;
  contatos: ContatoMeta[];
  mensagens: MensagemWhatsApp[];
  statuses: JsonObject[];
  rawChange: JsonObject;
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

function extrairChangesPayload(
  payload: JsonObject,
): ChangeWhatsApp[] {
  const entry = Array.isArray(payload.entry)
    ? payload.entry
    : [];

  const resultado: ChangeWhatsApp[] = [];

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

      const changeObject = itemChange as JsonObject;
      const value = changeObject.value;

      if (
        !value ||
        typeof value !== "object"
      ) {
        continue;
      }

      const valueObject = value as JsonObject;

      const metadata =
        valueObject.metadata &&
          typeof valueObject.metadata === "object"
          ? valueObject.metadata as JsonObject
          : null;

      const phoneNumberId =
        typeof metadata?.phone_number_id === "string"
          ? metadata.phone_number_id.trim()
          : null;

      const contatos = Array.isArray(valueObject.contacts)
        ? valueObject.contacts as ContatoMeta[]
        : [];

      const mensagens = Array.isArray(valueObject.messages)
        ? valueObject.messages as MensagemWhatsApp[]
        : [];

      const statuses = Array.isArray(valueObject.statuses)
        ? valueObject.statuses as JsonObject[]
        : [];

      resultado.push({
        phoneNumberId,
        contatos,
        mensagens,
        statuses,
        rawChange: changeObject,
      });
    }
  }

  return resultado;
}

function bytesParaHex(
  bytes: Uint8Array,
): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function compararStringsSeguro(
  valorA: string,
  valorB: string,
): boolean {
  if (valorA.length !== valorB.length) {
    return false;
  }

  let diferenca = 0;

  for (let i = 0; i < valorA.length; i += 1) {
    diferenca |=
      valorA.charCodeAt(i) ^
      valorB.charCodeAt(i);
  }

  return diferenca === 0;
}

async function validarAssinaturaMeta(
  corpoBruto: string,
  assinaturaRecebida: string | null,
): Promise<boolean> {
  if (!WHATSAPP_APP_SECRET) {
    throw new Error(
      "WHATSAPP_APP_SECRET não configurado.",
    );
  }

  if (!assinaturaRecebida) {
    return false;
  }

  const prefixo = "sha256=";

  if (!assinaturaRecebida.startsWith(prefixo)) {
    return false;
  }

  const assinaturaHex = assinaturaRecebida
    .slice(prefixo.length)
    .toLowerCase();

  const encoder = new TextEncoder();

  const chave = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WHATSAPP_APP_SECRET),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const assinaturaCalculada = await crypto.subtle.sign(
    "HMAC",
    chave,
    encoder.encode(corpoBruto),
  );

  const assinaturaCalculadaHex = bytesParaHex(
    new Uint8Array(assinaturaCalculada),
  );

  return compararStringsSeguro(
    assinaturaHex,
    assinaturaCalculadaHex,
  );
}

async function resolverEmpresaPorPhoneNumberId(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  phoneNumberId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("whatsapp_configuracoes")
    .select("empresa_id, webhook_ativo")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao localizar configuração do WhatsApp: ${error.message}`,
    );
  }

  if (!data?.empresa_id) {
    throw new Error(
      `Nenhuma empresa configurada para o phone_number_id ${phoneNumberId}.`,
    );
  }

  if (!data.webhook_ativo) {
    throw new Error(
      `Webhook não está ativo para o phone_number_id ${phoneNumberId}.`,
    );
  }

  return data.empresa_id;
}

async function registrarEventoBruto(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  empresaId: string,
  payload: JsonObject,
  tipo: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("whatsapp_webhook_eventos")
    .insert({
      empresa_id: empresaId,
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
  empresaId: string,
  eventoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_webhook_eventos")
    .update({
      processado: true,
      processado_em: new Date().toISOString(),
      erro: null,
    })
    .eq("empresa_id", empresaId)
    .eq("id", eventoId);

  if (error) {
    throw new Error(
      `Erro ao finalizar evento: ${error.message}`,
    );
  }
}

async function marcarEventoComErro(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  empresaId: string,
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
    .eq("empresa_id", empresaId)
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
  empresaId: string,
  telefone: string,
  nomeWhatsApp: string | null,
): Promise<string> {
  const telefoneNormalizado =
    normalizarTelefone(telefone);

  const { data: contatoExistente, error: erroBusca } =
    await supabase
      .from("whatsapp_contatos")
      .select("id, nome_whatsapp")
      .eq("empresa_id", empresaId)
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
      .eq("empresa_id", empresaId)
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
        empresa_id: empresaId,
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
  empresaId: string,
  contatoId: string,
): Promise<string> {
  const { data: conversaExistente, error: erroBusca } =
    await supabase
      .from("whatsapp_conversas")
      .select("id")
      .eq("empresa_id", empresaId)
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
        empresa_id: empresaId,
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
  empresaId: string,
  whatsappMessageId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .select("id")
    .eq("empresa_id", empresaId)
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
  empresaId: string,
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
      empresaId,
      mensagem.id,
    )
  ) {
    console.log(
      "Mensagem já registrada. Evento ignorado.",
      {
        empresaId,
        whatsappMessageId: mensagem.id,
      },
    );

    return;
  }

  const contatoId = await obterOuCriarContato(
    supabase,
    empresaId,
    mensagem.from,
    nomeWhatsApp,
  );

  const conversaId = await obterOuCriarConversa(
    supabase,
    empresaId,
    contatoId,
  );

  const texto = obterTextoMensagem(mensagem);

  const recebidaEm = converterTimestampMeta(
    mensagem.timestamp,
  );

  const { error: erroMensagem } = await supabase
    .from("whatsapp_mensagens")
    .insert({
      empresa_id: empresaId,
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
      .eq("empresa_id", empresaId)
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
    .eq("empresa_id", empresaId)
    .eq("id", conversaId);

  if (erroAtualizacao) {
    throw new Error(
      `Erro ao atualizar conversa: ${erroAtualizacao.message}`,
    );
  }

  console.log(
    "Mensagem do WhatsApp processada.",
    {
      empresaId,
      whatsappMessageId: mensagem.id,
      telefone: mensagem.from,
      tipo: mensagem.type,
    },
  );
}

function mapearStatusMeta(
  statusMeta: string,
): string | null {
  if (statusMeta === "sent") {
    return "enviada";
  }

  if (statusMeta === "delivered") {
    return "entregue";
  }

  if (statusMeta === "read") {
    return "lida";
  }

  if (statusMeta === "failed") {
    return "falhou";
  }

  if (
    statusMeta === "recebida" ||
    statusMeta === "pendente" ||
    statusMeta === "aceita" ||
    statusMeta === "enviada" ||
    statusMeta === "entregue" ||
    statusMeta === "lida" ||
    statusMeta === "falhou"
  ) {
    return statusMeta;
  }

  return null;
}

async function processarStatuses(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  empresaId: string,
  statuses: JsonObject[],
): Promise<void> {
  for (const statusItem of statuses) {
    const messageId = statusItem.id;
    const statusMeta = statusItem.status;

    if (
      typeof messageId !== "string" ||
      typeof statusMeta !== "string"
    ) {
      continue;
    }

    const statusInterno =
      mapearStatusMeta(statusMeta);

    if (!statusInterno) {
      console.warn(
        "Status do WhatsApp não reconhecido. Ignorado.",
        {
          empresaId,
          whatsappMessageId: messageId,
          statusMeta,
        },
      );

      continue;
    }

    const atualizacao: JsonObject = {
      status: statusInterno,
    };

    const timestamp = converterTimestampMeta(
      typeof statusItem.timestamp === "string"
        ? statusItem.timestamp
        : undefined,
    );

    if (statusMeta === "sent") {
      atualizacao.enviada_em = timestamp;
    }

    if (statusMeta === "delivered") {
      atualizacao.entregue_em = timestamp;
    }

    if (statusMeta === "read") {
      atualizacao.lida_em = timestamp;
    }

    if (statusMeta === "failed") {
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
      .eq("empresa_id", empresaId)
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

async function processarChange(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  change: ChangeWhatsApp,
): Promise<void> {
  const possuiDadosProcessaveis =
    change.mensagens.length > 0 ||
    change.statuses.length > 0 ||
    change.contatos.length > 0;

  if (!possuiDadosProcessaveis) {
    console.log(
      "Change do WhatsApp sem dados processáveis. Ignorado.",
    );

    return;
  }

  if (!change.phoneNumberId) {
    throw new Error(
      "Change do WhatsApp sem metadata.phone_number_id.",
    );
  }

  const empresaId =
    await resolverEmpresaPorPhoneNumberId(
      supabase,
      change.phoneNumberId,
    );

  const tipoEvento =
    change.mensagens.length > 0
      ? "mensagem_recebida"
      : change.statuses.length > 0
      ? "status_mensagem"
      : "evento_desconhecido";

  const eventoId = await registrarEventoBruto(
    supabase,
    empresaId,
    {
      phone_number_id: change.phoneNumberId,
      change: change.rawChange,
    },
    tipoEvento,
  );

  try {
    for (const mensagem of change.mensagens) {
      const telefone = normalizarTelefone(
        mensagem.from,
      );

      const contatoMeta = change.contatos.find(
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
        empresaId,
        mensagem,
        nomeWhatsApp,
      );
    }

    await processarStatuses(
      supabase,
      empresaId,
      change.statuses,
    );

    await marcarEventoProcessado(
      supabase,
      empresaId,
      eventoId,
    );
  } catch (error) {
    const mensagemErro =
      error instanceof Error
        ? error.message
        : String(error);

    await marcarEventoComErro(
      supabase,
      empresaId,
      eventoId,
      mensagemErro,
    );

    throw error;
  }
}

async function processarPayload(
  payload: JsonObject,
): Promise<void> {
  const supabase = criarSupabaseAdmin();

  const changes = extrairChangesPayload(
    payload,
  );

  if (changes.length === 0) {
    console.log(
      "Payload do WhatsApp sem changes processáveis.",
    );

    return;
  }

  for (const change of changes) {
    await processarChange(
      supabase,
      change,
    );
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

        const corpoBruto =
          await request.text();

        const assinaturaRecebida =
          request.headers.get(
            "x-hub-signature-256",
          );

        const assinaturaValida =
          await validarAssinaturaMeta(
            corpoBruto,
            assinaturaRecebida,
          );

        if (!assinaturaValida) {
          console.warn(
            "Webhook do WhatsApp rejeitado por assinatura inválida.",
          );

          return respostaJson(
            {
              erro:
                "Assinatura do webhook inválida.",
            },
            401,
          );
        }

        let payload: JsonObject;

        try {
          payload =
            JSON.parse(corpoBruto) as JsonObject;
        } catch {
          return respostaJson(
            {
              erro:
                "JSON inválido.",
            },
            400,
          );
        }

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
