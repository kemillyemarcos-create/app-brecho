import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";


const WHATSAPP_GRAPH_API_VERSION_PADRAO =
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

type UsuarioAutorizado = {
  usuarioId: string;
  empresaId: string;
};

type ConfiguracaoWhatsapp = {
  phoneNumberId: string;
  graphApiVersion: string;
  accessToken: string;
};

type ConversaContato = {
  conversaId: string;
  contatoId: string;
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

function extrairBearerToken(
  request: Request,
): string {
  const authorization =
    request.headers.get("authorization") ??
    request.headers.get("Authorization") ??
    "";

  const match =
    authorization.match(/^Bearer\s+(.+)$/i);

  const token = match?.[1]?.trim();

  if (!token) {
    throw new Error(
      "Usuário não autenticado.",
    );
  }

  return token;
}

async function resolverUsuarioAutorizado(
  request: Request,
): Promise<UsuarioAutorizado> {
  const token = extrairBearerToken(request);

  const supabase = criarSupabaseAdmin();

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser(token);

  if (
    authError ||
    !authData.user?.id
  ) {
    throw new Error(
      "Sessão inválida ou expirada.",
    );
  }

  const authUserId = authData.user.id;

  const {
    data: usuario,
    error: erroUsuario,
  } = await supabase
    .from("usuarios")
    .select(
      "id, empresa_id, ativo",
    )
    .eq(
      "auth_user_id",
      authUserId,
    )
    .maybeSingle();

  if (erroUsuario) {
    throw new Error(
      `Erro ao localizar usuário interno: ${erroUsuario.message}`,
    );
  }

  if (!usuario) {
    throw new Error(
      "Usuário autenticado não possui cadastro interno.",
    );
  }

  if (!usuario.ativo) {
    throw new Error(
      "Usuário inativo.",
    );
  }

  if (!usuario.empresa_id) {
    throw new Error(
      "Usuário não está vinculado a uma empresa.",
    );
  }

  return {
    usuarioId: usuario.id,
    empresaId: usuario.empresa_id,
  };
}

async function resolverConfiguracaoWhatsapp(
  empresaId: string,
): Promise<ConfiguracaoWhatsapp> {
  const supabase = criarSupabaseAdmin();

  const {
    data: configuracao,
    error,
  } = await supabase
    .from("whatsapp_configuracoes")
    .select(
      `
        id,
        phone_number_id,
        graph_api_version,
        envio_ativo,
        access_token_secret_id
      `,
    )
    .eq(
      "empresa_id",
      empresaId,
    )
    .eq(
      "nome",
      "principal",
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao localizar configuração do WhatsApp: ${error.message}`,
    );
  }

  if (!configuracao) {
    throw new Error(
      "A empresa não possui configuração principal do WhatsApp.",
    );
  }

  if (!configuracao.envio_ativo) {
    throw new Error(
      "O envio pelo WhatsApp está desativado para esta empresa.",
    );
  }

  if (!configuracao.phone_number_id) {
    throw new Error(
      "A empresa não possui phone_number_id configurado.",
    );
  }

  if (!configuracao.access_token_secret_id) {
    throw new Error(
      "A empresa não possui credencial de acesso ao WhatsApp configurada.",
    );
  }

  const {
    data: accessToken,
    error: erroAccessToken,
  } = await supabase.rpc(
    "whatsapp_resolver_access_token_backend",
    {
      p_empresa_id: empresaId,
      p_configuracao_id: configuracao.id,
    },
  );

  if (erroAccessToken) {
    throw new Error(
      `Erro ao resolver credencial do WhatsApp: ${erroAccessToken.message}`,
    );
  }

  if (
    typeof accessToken !== "string" ||
    !accessToken.trim()
  ) {
    throw new Error(
      "A credencial de acesso ao WhatsApp não foi encontrada no Vault.",
    );
  }

  return {
    phoneNumberId:
      configuracao.phone_number_id,
    graphApiVersion:
      configuracao.graph_api_version ??
      WHATSAPP_GRAPH_API_VERSION_PADRAO,
    accessToken:
      accessToken.trim(),
  };
}

async function localizarConversaEContato(
  empresaId: string,
  telefone: string,
  conversaId?: string,
  contatoId?: string,
): Promise<ConversaContato> {
  const supabase = criarSupabaseAdmin();

  const telefoneNormalizado =
    normalizarTelefone(telefone);

  if (conversaId) {
    const {
      data: conversaInformada,
      error: erroConversaInformada,
    } = await supabase
      .from("whatsapp_conversas")
      .select(
        `
          id,
          contato_id,
          status,
          whatsapp_contatos!whatsapp_conversas_empresa_contato_fkey (
            id,
            telefone_normalizado,
            ativo,
            bloqueado
          )
        `,
      )
      .eq(
        "empresa_id",
        empresaId,
      )
      .eq(
        "id",
        conversaId,
      )
      .maybeSingle();

    if (erroConversaInformada) {
      throw new Error(
        `Erro ao validar conversa: ${erroConversaInformada.message}`,
      );
    }

    if (!conversaInformada) {
      throw new Error(
        "Conversa não encontrada para esta empresa.",
      );
    }

    if (
      conversaInformada.status ===
      "encerrada"
    ) {
      throw new Error(
        "A conversa informada está encerrada.",
      );
    }

    if (
      contatoId &&
      conversaInformada.contato_id !==
        contatoId
    ) {
      throw new Error(
        "O contato informado não pertence à conversa.",
      );
    }

    const contatoRelacionado =
      Array.isArray(
        conversaInformada.whatsapp_contatos,
      )
        ? conversaInformada
            .whatsapp_contatos[0]
        : conversaInformada
            .whatsapp_contatos;

    if (!contatoRelacionado) {
      throw new Error(
        "Contato da conversa não encontrado.",
      );
    }

    if (!contatoRelacionado.ativo) {
      throw new Error(
        "O contato está inativo.",
      );
    }

    if (contatoRelacionado.bloqueado) {
      throw new Error(
        "O contato está bloqueado.",
      );
    }

    if (
      telefoneNormalizado &&
      contatoRelacionado
        .telefone_normalizado !==
        telefoneNormalizado
    ) {
      throw new Error(
        "O telefone informado não corresponde ao contato da conversa.",
      );
    }

    return {
      conversaId:
        conversaInformada.id,
      contatoId:
        conversaInformada.contato_id,
    };
  }

  let contato: {
    id: string;
    telefone_normalizado: string;
    ativo: boolean;
    bloqueado: boolean;
  } | null = null;

  if (contatoId) {
    const {
      data,
      error,
    } = await supabase
      .from("whatsapp_contatos")
      .select(
        `
          id,
          telefone_normalizado,
          ativo,
          bloqueado
        `,
      )
      .eq(
        "empresa_id",
        empresaId,
      )
      .eq(
        "id",
        contatoId,
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        `Erro ao validar contato: ${error.message}`,
      );
    }

    contato = data;
  } else {
    const {
      data,
      error,
    } = await supabase
      .from("whatsapp_contatos")
      .select(
        `
          id,
          telefone_normalizado,
          ativo,
          bloqueado
        `,
      )
      .eq(
        "empresa_id",
        empresaId,
      )
      .eq(
        "telefone_normalizado",
        telefoneNormalizado,
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        `Erro ao localizar contato: ${error.message}`,
      );
    }

    contato = data;
  }

  if (!contato) {
    throw new Error(
      "O telefone ainda não possui contato cadastrado nesta empresa.",
    );
  }

  if (!contato.ativo) {
    throw new Error(
      "O contato está inativo.",
    );
  }

  if (contato.bloqueado) {
    throw new Error(
      "O contato está bloqueado.",
    );
  }

  if (
    telefoneNormalizado &&
    contato.telefone_normalizado !==
      telefoneNormalizado
  ) {
    throw new Error(
      "O telefone informado não corresponde ao contato.",
    );
  }

  const {
    data: conversa,
    error: erroConversa,
  } = await supabase
    .from("whatsapp_conversas")
    .select(
      "id, contato_id",
    )
    .eq(
      "empresa_id",
      empresaId,
    )
    .eq(
      "contato_id",
      contato.id,
    )
    .neq(
      "status",
      "encerrada",
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
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

async function enviarParaMeta(
  telefone: string,
  texto: string,
  configuracao: ConfiguracaoWhatsapp,
  respostaDeMessageId?: string,
): Promise<RespostaMeta> {

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
      message_id:
        respostaDeMessageId,
    };
  }

  const endpoint =
    `https://graph.facebook.com/` +
    `${configuracao.graphApiVersion}/` +
    `${configuracao.phoneNumberId}/messages`;

  const response = await fetch(
    endpoint,
    {
      method: "POST",
      headers: {
  Authorization:
    `Bearer ${configuracao.accessToken}`,
  "Content-Type":
    "application/json",
},
      body: JSON.stringify(
        payload,
      ),
    },
  );

  let dados: RespostaMeta;

  try {
    dados =
      await response.json() as RespostaMeta;
  } catch {
    throw new Error(
      `A Meta retornou uma resposta inválida. HTTP ${response.status}.`,
    );
  }

  if (
    !response.ok ||
    dados.error
  ) {
    throw new Error(
      dados.error?.message ??
        `A Meta retornou HTTP ${response.status}.`,
    );
  }

  return dados;
}

async function registrarMensagemSaida(
  empresaId: string,
  usuarioId: string,
  texto: string,
  respostaMeta: RespostaMeta,
  ids: ConversaContato,
  respostaDeMessageId?: string,
): Promise<void> {
  const supabase = criarSupabaseAdmin();

  const whatsappMessageId =
    respostaMeta.messages?.[0]?.id;

  if (!whatsappMessageId) {
    throw new Error(
      "A Meta não retornou o identificador da mensagem.",
    );
  }

  const enviadaEm =
    new Date().toISOString();

  const {
    error: erroMensagem,
  } = await supabase
    .from("whatsapp_mensagens")
    .insert({
      empresa_id:
        empresaId,
      conversa_id:
        ids.conversaId,
      contato_id:
        ids.contatoId,
      whatsapp_message_id:
        whatsappMessageId,
      direcao:
        "saida",
      origem:
        "sistema",
      tipo:
        "text",
      texto,
      conteudo:
        respostaMeta,
      resposta_de_message_id:
        respostaDeMessageId ?? null,
      status:
        "aceita",
      enviada_por:
        usuarioId,
      enviada_em:
        enviadaEm,
    });

  if (erroMensagem) {
    throw new Error(
      `Erro ao salvar mensagem enviada: ${erroMensagem.message}`,
    );
  }

  const {
    data: conversaAtualizada,
    error: erroConversa,
  } = await supabase
    .from("whatsapp_conversas")
    .update({
      ultima_mensagem_em:
        enviadaEm,
      ultima_mensagem_texto:
        texto,
    })
    .eq(
      "empresa_id",
      empresaId,
    )
    .eq(
      "id",
      ids.conversaId,
    )
    .select("id")
    .maybeSingle();

  if (erroConversa) {
    throw new Error(
      `Erro ao atualizar conversa: ${erroConversa.message}`,
    );
  }

  if (!conversaAtualizada) {
    throw new Error(
      "A conversa enviada não pertence mais à empresa do usuário.",
    );
  }
}

export default {
  async fetch(
    request: Request,
  ): Promise<Response> {
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

      const usuario =
        await resolverUsuarioAutorizado(
          request,
        );

      const body =
        await request.json() as EnviarMensagemBody;

      const telefone =
        normalizarTelefone(
          body.telefone ?? "",
        );

      const texto =
        body.texto?.trim() ?? "";

      if (!telefone) {
        return respostaJson(
          {
            erro:
              "Telefone obrigatório.",
          },
          400,
        );
      }

      if (!texto) {
        return respostaJson(
          {
            erro:
              "Texto obrigatório.",
          },
          400,
        );
      }

      if (
        texto.length > 4096
      ) {
        return respostaJson(
          {
            erro:
              "A mensagem excede 4096 caracteres.",
          },
          400,
        );
      }

      const configuracao =
        await resolverConfiguracaoWhatsapp(
          usuario.empresaId,
        );

      const ids =
        await localizarConversaEContato(
          usuario.empresaId,
          telefone,
          body.conversaId,
          body.contatoId,
        );

      const respostaMeta =
        await enviarParaMeta(
          telefone,
          texto,
          configuracao,
          body.respostaDeMessageId,
        );

      await registrarMensagemSaida(
        usuario.empresaId,
        usuario.usuarioId,
        texto,
        respostaMeta,
        ids,
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

      const erroAutenticacao =
        mensagem ===
          "Usuário não autenticado." ||
        mensagem ===
          "Sessão inválida ou expirada.";

      const erroAutorizacao =
        mensagem ===
          "Usuário inativo." ||
        mensagem ===
          "Usuário autenticado não possui cadastro interno." ||
        mensagem ===
          "Usuário não está vinculado a uma empresa.";

      return respostaJson(
        {
          enviado: false,
          erro: mensagem,
        },
        erroAutenticacao
          ? 401
          : erroAutorizacao
          ? 403
          : 500,
      );
    }
  },
};