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

const LOJA_RATE_LIMIT_SECRET =
  Deno.env.get(
    "LOJA_RATE_LIMIT_SECRET",
  );

type OperacaoCarrinho =
  | "adicionar"
  | "consultar"
  | "remover";

type CarrinhoBody = {
  empresaSlug?: string;
  operacao?: OperacaoCarrinho;
  publicacaoId?: string;
  token?: string | null;
};

type Empresa = {
  id: string;
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
          "authorization, x-client-info, apikey, content-type",
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

function extrairOrigemRateLimit(
  request: Request,
): string {
  const origem =
    request.headers
      .get("cf-connecting-ip")
      ?.trim();

  if (
    !origem ||
    origem.length > 128
  ) {
    throw new Error(
      "Não foi possível validar a origem da requisição.",
    );
  }

  return origem;
}

async function consumirRateLimit(
  supabase: SupabaseClient,
  empresaId: string,
  origemHashHex: string,
  escopo: string,
  janelaSegundos: number,
  limite: number,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "loja_consumir_rate_limit",
    {
      p_empresa_id: empresaId,
      p_escopo: escopo,
      p_origem_hash_hex:
        origemHashHex,
      p_janela_segundos:
        janelaSegundos,
      p_limite: limite,
    },
  );

  if (error) {
    throw new Error(
      "Não foi possível validar o limite de requisições.",
    );
  }

  const lista =
    Array.isArray(data)
      ? data
      : [];

  const resultado = lista[0];

  if (
    !resultado ||
    typeof resultado.permitido !==
      "boolean"
  ) {
    throw new Error(
      "Não foi possível validar o limite de requisições.",
    );
  }

  return resultado;
}

function validarEmpresaSlug(
  valor: unknown,
): string {
  if (typeof valor !== "string") {
    throw new Error(
      "Loja não informada.",
    );
  }

  const slug =
    valor.trim().toLowerCase();

  if (
    !slug ||
    slug.length > 120 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug,
    )
  ) {
    throw new Error(
      "Loja inválida.",
    );
  }

  return slug;
}

function validarOperacao(
  valor: unknown,
): OperacaoCarrinho {
  if (
    valor !== "adicionar" &&
    valor !== "consultar" &&
    valor !== "remover"
  ) {
    throw new Error(
      "Operação inválida.",
    );
  }

  return valor;
}

function validarPublicacaoId(
  valor: unknown,
): string {
  if (
    typeof valor !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(valor.trim())
  ) {
    throw new Error(
      "Publicação inválida.",
    );
  }

  return valor.trim();
}

function validarToken(
  valor: unknown,
  obrigatorio: boolean,
): string | null {
  if (
    valor === null ||
    valor === undefined ||
    (
      typeof valor === "string" &&
      valor.trim() === ""
    )
  ) {
    if (obrigatorio) {
      throw new Error(
        "Token do carrinho obrigatório.",
      );
    }

    return null;
  }

  if (
    typeof valor !== "string" ||
    !/^[0-9a-f]{64}$/.test(
      valor.trim(),
    )
  ) {
    throw new Error(
      "Token do carrinho inválido.",
    );
  }

  return valor.trim();
}

async function resolverEmpresa(
  supabase: SupabaseClient,
  empresaSlug: string,
): Promise<string> {
  const {
    data,
    error,
  } = await supabase
    .from("empresas")
    .select("id")
    .eq(
      "slug_publico",
      empresaSlug,
    )
    .eq(
      "ativo",
      true,
    )
    .limit(1)
    .maybeSingle<Empresa>();

  if (error) {
    throw new Error(
      "Não foi possível validar a loja.",
    );
  }

  if (!data?.id) {
    throw new Error(
      "Loja não encontrada.",
    );
  }

  const {
    data: assinaturaAtiva,
    error: assinaturaError,
  } = await supabase.rpc(
    "assinatura_empresa_operacional_ativa",
    {
      p_empresa_id: data.id,
    },
  );

  if (assinaturaError) {
    throw new Error(
      "Não foi possível validar a loja.",
    );
  }

  if (assinaturaAtiva !== true) {
    throw new Error(
      "Loja indisponível.",
    );
  }

  return data.id;
}

async function adicionarItem(
  supabase: SupabaseClient,
  empresaId: string,
  publicacaoId: string,
  token: string | null,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "loja_adicionar_item_carrinho",
    {
      p_empresa_id: empresaId,
      p_publicacao_id:
        publicacaoId,
      p_token: token,
    },
  );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const lista =
    Array.isArray(data)
      ? data
      : [];

  const resultado = lista[0];

  if (!resultado) {
    throw new Error(
      "Não foi possível adicionar o produto à sacola.",
    );
  }

  return {
    carrinhoId:
      resultado.carrinho_id,
    token:
      resultado.token,
    publicacaoId:
      resultado.publicacao_id,
    adicionadoEm:
      resultado.adicionado_em,
    expiraEm:
      resultado.expira_em,
    quantidadeItens:
      resultado.quantidade_itens,
  };
}

async function consultarCarrinho(
  supabase: SupabaseClient,
  empresaId: string,
  token: string,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "loja_consultar_carrinho",
    {
      p_empresa_id: empresaId,
      p_token: token,
    },
  );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const lista =
    Array.isArray(data)
      ? data
      : [];

  return {
    quantidadeItens:
      lista.length > 0
        ? lista[0].quantidade_itens
        : 0,
    itens: lista.map(
      (item) => ({
        carrinhoId:
          item.carrinho_id,
        publicacaoId:
          item.publicacao_id,
        slug:
          item.slug,
        nome:
          item.nome,
        preco:
          item.preco,
        marca:
          item.marca,
        categoria:
          item.categoria,
        tamanho:
          item.tamanho,
        condicao:
          item.condicao,
        descricao:
          item.descricao,
        fotoPrincipal:
          item.foto_principal,
        adicionadoEm:
          item.adicionado_em,
        expiraEm:
          item.expira_em,
        segundosRestantes:
          item.segundos_restantes,
      }),
    ),
  };
}

async function removerItem(
  supabase: SupabaseClient,
  empresaId: string,
  publicacaoId: string,
  token: string,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "loja_remover_item_carrinho",
    {
      p_empresa_id: empresaId,
      p_publicacao_id:
        publicacaoId,
      p_token: token,
    },
  );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const lista =
    Array.isArray(data)
      ? data
      : [];

  const resultado = lista[0];

  if (!resultado) {
    throw new Error(
      "Não foi possível remover o produto da sacola.",
    );
  }

  return {
    carrinhoId:
      resultado.carrinho_id,
    publicacaoId:
      resultado.publicacao_id,
    removido:
      resultado.removido,
    quantidadeItens:
      resultado.quantidade_itens,
  };
}

function classificarErroHttp(
  mensagem: string,
): number {
  if (
    mensagem.includes(
      "não informada",
    ) ||
    mensagem.includes(
      "inválida",
    ) ||
    mensagem.includes(
      "inválido",
    ) ||
    mensagem.includes(
      "obrigatório",
    )
  ) {
    return 400;
  }

  if (
    mensagem.includes(
      "Loja não encontrada",
    ) ||
    mensagem.includes(
      "Carrinho não encontrado",
    ) ||
    mensagem.includes(
      "Carrinho inválido",
    ) ||
    mensagem.includes(
      "Produto não encontrado",
    )
  ) {
    return 404;
  }

  if (
    mensagem.includes(
      "Loja indisponível",
    ) ||
    mensagem.includes(
      "reservado",
    ) ||
    mensagem.includes(
      "vendido",
    ) ||
    mensagem.includes(
      "não está disponível",
    ) ||
    mensagem.includes(
      "máximo 10 itens",
    )
  ) {
    return 409;
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
              "authorization, x-client-info, apikey, content-type",
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

      let body: CarrinhoBody;

      try {
        body =
          await request.json() as
            CarrinhoBody;
      } catch {
        return respostaJson(
          {
            erro:
              "JSON inválido.",
          },
          400,
        );
      }

      const empresaSlug =
        validarEmpresaSlug(
          body.empresaSlug,
        );

      const operacao =
        validarOperacao(
          body.operacao,
        );

      const supabase =
        criarSupabaseAdmin();

      const empresaId =
        await resolverEmpresa(
          supabase,
          empresaSlug,
        );

      if (
        operacao === "adicionar"
      ) {
        const publicacaoId =
          validarPublicacaoId(
            body.publicacaoId,
          );

        const token =
          validarToken(
            body.token,
            false,
          );

        if (!LOJA_RATE_LIMIT_SECRET) {
          throw new Error(
            "Proteção antiabuso não configurada.",
          );
        }

        const origem =
          extrairOrigemRateLimit(
            request,
          );

        const origemHashHex =
          await hmacSha256Hex(
            LOJA_RATE_LIMIT_SECRET,
            origem,
          );

        const limiteAdicionar =
          await consumirRateLimit(
            supabase,
            empresaId,
            origemHashHex,
            "carrinho:adicionar",
            60,
            15,
          );

        if (!limiteAdicionar.permitido) {
          return respostaJson(
            {
              erro:
                "Muitas tentativas. Aguarde um momento e tente novamente.",
            },
            429,
          );
        }

        if (!token) {
          const limiteCarrinhoNovo =
            await consumirRateLimit(
              supabase,
              empresaId,
              origemHashHex,
              "carrinho:novo",
              600,
              3,
            );

          if (!limiteCarrinhoNovo.permitido) {
            return respostaJson(
              {
                erro:
                  "Muitas tentativas de iniciar uma nova sacola. Aguarde alguns minutos e tente novamente.",
              },
              429,
            );
          }
        }

        const resultado =
          await adicionarItem(
            supabase,
            empresaId,
            publicacaoId,
            token,
          );

        return respostaJson(
          resultado,
        );
      }

      if (
        operacao === "consultar"
      ) {
        const token =
          validarToken(
            body.token,
            true,
          )!;

        const resultado =
          await consultarCarrinho(
            supabase,
            empresaId,
            token,
          );

        return respostaJson(
          resultado,
        );
      }

      const publicacaoId =
        validarPublicacaoId(
          body.publicacaoId,
        );

      const token =
        validarToken(
          body.token,
          true,
        )!;

      const resultado =
        await removerItem(
          supabase,
          empresaId,
          publicacaoId,
          token,
        );

      return respostaJson(
        resultado,
      );
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : String(error);

      const status =
        classificarErroHttp(
          mensagem,
        );

      console.error(
        "Erro na sacola da Loja Online:",
        {
          status,
          mensagem,
        },
      );

      return respostaJson(
        {
          erro:
            status >= 500
              ? "Não foi possível processar a sacola."
              : mensagem,
        },
        status,
      );
    }
  },
};
