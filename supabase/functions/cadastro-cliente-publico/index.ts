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

const HCAPTCHA_SECRET =
  Deno.env.get(
    "HCAPTCHA_SECRET",
  );

const HCAPTCHA_SITE_KEY =
  Deno.env.get(
    "HCAPTCHA_SITE_KEY",
  );

type CadastroBody = {
  empresaSlug?: string;
  nome?: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  captchaToken?: string | null;
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

  const resultado =
    lista[0];

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

async function validarHcaptcha(
  captchaToken: unknown,
): Promise<boolean> {
  if (
    !HCAPTCHA_SECRET ||
    !HCAPTCHA_SITE_KEY
  ) {
    throw new Error(
      "Proteção CAPTCHA não configurada.",
    );
  }

  if (
    typeof captchaToken !== "string" ||
    !captchaToken.trim() ||
    captchaToken.length > 4096
  ) {
    return false;
  }

  const body =
    new URLSearchParams();

  body.set(
    "secret",
    HCAPTCHA_SECRET,
  );

  body.set(
    "response",
    captchaToken.trim(),
  );

  body.set(
    "sitekey",
    HCAPTCHA_SITE_KEY,
  );

  let response: Response;

  try {
    response = await fetch(
      "https://api.hcaptcha.com/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body,
      },
    );
  } catch {
    throw new Error(
      "Não foi possível validar a proteção CAPTCHA.",
    );
  }

  if (!response.ok) {
    throw new Error(
      "Não foi possível validar a proteção CAPTCHA.",
    );
  }

  let resultado: unknown;

  try {
    resultado =
      await response.json();
  } catch {
    throw new Error(
      "Não foi possível validar a proteção CAPTCHA.",
    );
  }

  return (
    typeof resultado === "object" &&
    resultado !== null &&
    "success" in resultado &&
    (resultado as {
      success?: unknown;
    }).success === true
  );
}

function validarTexto(
  valor: unknown,
  maximo: number,
): string {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  if (typeof valor !== "string") {
    throw new Error(
      "Dados de cadastro inválidos.",
    );
  }

  const texto =
    valor.trim();

  if (texto.length > maximo) {
    throw new Error(
      "Dados de cadastro inválidos.",
    );
  }

  return texto;
}

function somenteDigitos(
  valor: unknown,
  maximo: number,
): string {
  const digitos =
    validarTexto(
      valor,
      maximo + 16,
    ).replace(/\D/g, "");

  if (digitos.length > maximo) {
    throw new Error(
      "Dados de cadastro inválidos.",
    );
  }

  return digitos;
}

function validarEmpresaSlug(
  valor: unknown,
): string {
  const slug =
    validarTexto(
      valor,
      100,
    ).toLowerCase();

  if (
    !slug ||
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

function validarCadastro(
  body: CadastroBody,
) {
  const nome =
    validarTexto(
      body.nome,
      200,
    );

  const cpf =
    somenteDigitos(
      body.cpf,
      11,
    );

  const telefone =
    somenteDigitos(
      body.telefone,
      11,
    );

  const email =
    validarTexto(
      body.email,
      254,
    ).toLowerCase();

  const cep =
    somenteDigitos(
      body.cep,
      8,
    );

  const endereco =
    validarTexto(
      body.endereco,
      300,
    );

  const numero =
    validarTexto(
      body.numero,
      60,
    );

  const complemento =
    validarTexto(
      body.complemento,
      200,
    );

  if (!nome) {
    throw new Error(
      "Informe seu nome.",
    );
  }

  if (cpf.length !== 11) {
    throw new Error(
      "Informe um CPF válido com 11 dígitos.",
    );
  }

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    throw new Error(
      "Informe um e-mail válido.",
    );
  }

  return {
    nome,
    cpf,
    telefone,
    email,
    cep,
    endereco,
    numero,
    complemento,
  };
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

  return data.id;
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

      let body: CadastroBody;

      try {
        body =
          await request.json() as
            CadastroBody;
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

      const cadastro =
        validarCadastro(
          body,
        );

      const supabase =
        criarSupabaseAdmin();

      const empresaId =
        await resolverEmpresa(
          supabase,
          empresaSlug,
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

      const limiteTentativas =
        await consumirRateLimit(
          supabase,
          empresaId,
          origemHashHex,
          "cadastro:tentativa",
          60,
          20,
        );

      if (!limiteTentativas.permitido) {
        return respostaJson(
          {
            erro:
              "Muitas tentativas. Aguarde um momento e tente novamente.",
          },
          429,
        );
      }

      const captchaValido =
        await validarHcaptcha(
          body.captchaToken,
        );

      if (!captchaValido) {
        return respostaJson(
          {
            erro:
              "Confirme a verificação de segurança antes de enviar o cadastro.",
          },
          403,
        );
      }

      const limiteCadastro =
        await consumirRateLimit(
          supabase,
          empresaId,
          origemHashHex,
          "cadastro:cliente",
          600,
          5,
        );

      if (!limiteCadastro.permitido) {
        return respostaJson(
          {
            erro:
              "Muitos cadastros realizados. Aguarde alguns minutos e tente novamente.",
          },
          429,
        );
      }

      const {
        data,
        error,
      } = await supabase.rpc(
        "cadastrar_cliente_publico",
        {
          p_empresa_slug:
            empresaSlug,
          p_nome:
            cadastro.nome,
          p_cpf:
            cadastro.cpf,
          p_telefone:
            cadastro.telefone,
          p_email:
            cadastro.email,
          p_cep:
            cadastro.cep,
          p_endereco:
            cadastro.endereco,
          p_numero:
            cadastro.numero,
          p_complemento:
            cadastro.complemento,
        },
      );

      if (error) {
        throw new Error(
          "Não foi possível concluir o cadastro agora.",
        );
      }

      return respostaJson(
        data,
      );
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : String(error);

      const errosDeEntrada = new Set([
        "Dados de cadastro inválidos.",
        "Loja inválida.",
        "Informe seu nome.",
        "Informe um CPF válido com 11 dígitos.",
        "Informe um e-mail válido.",
      ]);

      if (errosDeEntrada.has(mensagem)) {
        return respostaJson(
          {
            erro: mensagem,
          },
          400,
        );
      }

      console.error(
        "Erro no cadastro público de cliente:",
        {
          mensagem,
        },
      );

      return respostaJson(
        {
          erro:
            "Não foi possível concluir o cadastro agora.",
        },
        500,
      );
    }
  },
};
