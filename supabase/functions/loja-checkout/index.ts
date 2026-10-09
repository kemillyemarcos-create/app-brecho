
import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL");

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

type CheckoutBody = {
  operacao?: string;
  pedidoToken?: string;
  empresaSlug?: string;
  token?: string;
  nome?: string;
  cpf?: string;
  telefone?: string;
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

function validarEmpresaSlug(
  valor: unknown,
): string {
  if (
    typeof valor !== "string" ||
    !valor.trim()
  ) {
    throw new Error(
      "Loja não identificada.",
    );
  }

  const slug = valor.trim().toLowerCase();

  if (
    slug.length > 100 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new Error(
      "Loja inválida.",
    );
  }

  return slug;
}

function validarToken(
  valor: unknown,
): string {
  if (
    typeof valor !== "string"
  ) {
    throw new Error(
      "Token da sacola obrigatório.",
    );
  }

  const token = valor.trim();

  if (
    !/^[0-9a-f]{64}$/.test(token)
  ) {
    throw new Error(
      "Token da sacola inválido.",
    );
  }

  return token;
}

function validarTexto(
  valor: unknown,
  campo: string,
  maximo: number,
): string {
  if (
    typeof valor !== "string"
  ) {
    throw new Error(
      `${campo} obrigatório.`,
    );
  }

  const texto = valor.trim();

  if (!texto) {
    throw new Error(
      `${campo} obrigatório.`,
    );
  }

  if (texto.length > maximo) {
    throw new Error(
      `${campo} inválido.`,
    );
  }

  return texto;
}

function normalizarCpf(
  valor: unknown,
): string {
  const cpf =
    validarTexto(
      valor,
      "CPF",
      30,
    ).replace(
      /\D/g,
      "",
    );

  if (
    cpf.length !== 11
  ) {
    throw new Error(
      "CPF inválido.",
    );
  }

  return cpf;
}

function normalizarTelefone(
  valor: unknown,
): string {
  const telefone =
    validarTexto(
      valor,
      "Telefone",
      30,
    ).replace(
      /\D/g,
      "",
    );

  if (
    telefone.length !== 10 &&
    telefone.length !== 11
  ) {
    throw new Error(
      "Telefone inválido.",
    );
  }

  return telefone;
}

async function resolverEmpresa(
  supabase: SupabaseClient,
  slug: string,
): Promise<string> {
  const {
    data,
    error,
  } = await supabase
    .from("empresas")
    .select("id")
    .eq("slug_publico", slug)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Não foi possível localizar a loja: ${error.message}`,
    );
  }

  if (!data?.id) {
    throw new Error(
      "Loja não encontrada.",
    );
  }

  return data.id;
}

async function criarPedido(
  supabase: SupabaseClient,
  empresaId: string,
  token: string,
  nome: string,
  cpf: string,
  telefone: string,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "loja_criar_pedido_checkout",
    {
      p_empresa_id:
        empresaId,
      p_token:
        token,
      p_nome:
        nome,
      p_cpf:
        cpf,
      p_telefone:
        telefone,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível criar o pedido.",
    );
  }

  const lista =
    Array.isArray(data)
      ? data
      : [];

  const pedido =
    lista[0];

  if (!pedido) {
    throw new Error(
      "Pedido não foi criado.",
    );
  }

  return pedido;
}

function classificarErroHttp(
  mensagem: string,
): number {
  const erros400 = [
    "Token da sacola obrigatório.",
    "Token da sacola inválido.",
    "Nome obrigatório.",
    "CPF obrigatório.",
    "CPF inválido.",
    "Telefone obrigatório.",
    "Telefone inválido.",
    "Loja não identificada.",
    "Loja inválida.",
    "Loja não encontrada.",
    "Carrinho não encontrado.",
    "Carrinho vazio.",
    "Carrinho indisponível para checkout.",
    "Um ou mais itens do carrinho expiraram.",
    "Um ou mais itens do carrinho expiraram durante o checkout.",
    "Um ou mais produtos não estão mais disponíveis.",
    "Um ou mais produtos já estão reservados por outro pedido.",
    "Prazo de pagamento inválido.",
  ];

  if (
    erros400.some(
      (erro) =>
        mensagem.includes(erro),
    )
  ) {
    return 400;
  }

  if (
    mensagem.includes(
      "Token da sacola",
    )
  ) {
    return 400;
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

      let body: CheckoutBody;

      try {
        body =
          await request.json() as
            CheckoutBody;
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

      if (body.operacao === "consultar") {
        const admin = criarSupabaseAdmin();
        const empresaId = await resolverEmpresa(admin, empresaSlug);
        const pedidoToken = validarToken(body.pedidoToken);
        const { data, error } = await admin.rpc("loja_consultar_pedido", {
          p_empresa_id: empresaId, p_pedido_token: pedidoToken,
        });
        if (error) throw new Error("Não foi possível consultar o pedido.");
        if (!data?.[0]) return respostaJson({ erro: "Pedido não encontrado." }, 404);
        return respostaJson(data[0]);
      }
      if (body.operacao && body.operacao !== "criar") {
        return respostaJson({ erro: "Operação inválida." }, 400);
      }

      const token =
        validarToken(
          body.token,
        );

      const nome =
        validarTexto(
          body.nome,
          "Nome",
          160,
        );

      const cpf =
        normalizarCpf(
          body.cpf,
        );

      const telefone =
        normalizarTelefone(
          body.telefone,
        );

      const supabase =
        criarSupabaseAdmin();

      const empresaId =
        await resolverEmpresa(
          supabase,
          empresaSlug,
        );

      const pedido =
        await criarPedido(
          supabase,
          empresaId,
          token,
          nome,
          cpf,
          telefone,
        );

      return respostaJson({
        pedidoId:
          pedido.pedido_id,
        pedidoToken:
          pedido.pedido_token,
        clienteId:
          pedido.cliente_id,
        status:
          pedido.status,
        subtotal:
          pedido.subtotal,
        total:
          pedido.total,
        pagamentoExpiraEm:
          pedido.pagamento_expira_em,
        quantidadeItens:
          pedido.quantidade_itens,
      });
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
        "Erro no checkout da Loja Online:",
        {
          status,
          mensagem,
        },
      );

      return respostaJson(
        {
          erro:
            status >= 500
              ? "Não foi possível iniciar o checkout."
              : mensagem,
        },
        status,
      );
    }
  },
};
