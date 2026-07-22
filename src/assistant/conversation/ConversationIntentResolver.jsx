/**
 * ConversationIntentResolver.jsx
 *
 * Resolve intenções de continuidade de conversa.
 */

const CONFIRMACOES = [
  "sim",
  "ok",
  "pode",
  "pode sim",
  "claro",
  "quero",
  "quero ver",
];

const CORES = {
  preta: "Preto",
  pretas: "Preto",
  preto: "Preto",
  pretos: "Preto",

  branca: "Branco",
  brancas: "Branco",
  branco: "Branco",
  brancos: "Branco",

  azul: "Azul",
  azuis: "Azul",

  vermelha: "Vermelho",
  vermelhas: "Vermelho",
  vermelho: "Vermelho",
  vermelhos: "Vermelho",

  verde: "Verde",
  verdes: "Verde",

  rosa: "Rosa",
  rosas: "Rosa",

  bege: "Bege",
  beges: "Bege",

  cinza: "Cinza",
  cinzas: "Cinza",
};

const GENEROS = {
  masculino: "Masculino",
  masculinos: "Masculino",
  masculina: "Masculino",
  masculinas: "Masculino",

  feminino: "Feminino",
  femininos: "Feminino",
  feminina: "Feminino",
  femininas: "Feminino",

  unissex: "Unissex",
};

const TAMANHOS = [
  "PP",
  "P",
  "M",
  "G",
  "GG",
  "XG",
  "XGG",
  "34",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "48",
  "50",
  "52",
];

const CATEGORIAS = {
  vestido: "Vestido",
  vestidos: "Vestido",

  calça: "Calça",
  calças: "Calça",
  calca: "Calça",
  calcas: "Calça",

  blusa: "Blusa",
  blusas: "Blusa",

  camisa: "Camisa",
  camisas: "Camisa",

  camiseta: "Camiseta",
  camisetas: "Camiseta",

  bermuda: "Bermuda",
  bermudas: "Bermuda",

  saia: "Saia",
  saias: "Saia",

  jaqueta: "Jaqueta",
  jaquetas: "Jaqueta",

  casaco: "Casaco",
  casacos: "Casaco",

  moletom: "Moletom",
  moletons: "Moletom",

  short: "Short",
  shorts: "Short",

  blazer: "Blazer",
  blazers: "Blazer",

  cardigan: "Cardigan",
  cardigans: "Cardigan",

  colete: "Colete",
  coletes: "Colete",
};

const COMANDOS_LISTAGEM = [
  "liste",
  "listar",
  "lista",
  "mostra",
  "mostrar",
  "mostre",
  "me mostra",
  "me mostre",
  "ver",
  "ver peças",
  "mostrar peças",
  "liste essas peças",
  "mostre essas peças",
  "essas peças",
  "essas",
  "elas",
  "quais sao",
  "quais são",
  "exiba",
];

const PREFIXOS_CONTINUIDADE = [
  /^e\s+/i,
  /^agora\s+s[oó]\s+/i,
  /^agora\s+apenas\s+/i,
  /^agora\s+somente\s+/i,
  /^agora\s+/i,
  /^s[oó]\s+/i,
  /^apenas\s+/i,
  /^somente\s+/i,
  /^mostre\s+s[oó]\s+/i,
  /^mostra\s+s[oó]\s+/i,
  /^mostrar\s+s[oó]\s+/i,
  /^quero\s+s[oó]\s+/i,
  /^quero\s+apenas\s+/i,
  /^filtre\s+por\s+/i,
  /^filtra\s+por\s+/i,
  /^filtrar\s+por\s+/i,
  /^com\s+/i,
];

function limparTexto(texto = "") {
  return String(texto)
    .trim()
    .toLowerCase()
    .replace(/[?!.,;:]+$/g, "")
    .replace(/\s+/g, " ");
}

function possuiPrefixoDeContinuidade(texto = "") {
  const frase = limparTexto(texto);

  return PREFIXOS_CONTINUIDADE.some(
    (expressao) => expressao.test(frase)
  );
}

function removerPrefixoPrincipal(texto = "") {
  let resultado = limparTexto(texto);

  for (const expressao of PREFIXOS_CONTINUIDADE) {
    if (expressao.test(resultado)) {
      resultado = resultado.replace(
        expressao,
        ""
      );

      break;
    }
  }

  return resultado.trim();
}

function limparPrefixosDeContinuidade(valor = "") {
  return removerPrefixoPrincipal(valor)
    .replace(
      /^(?:o|a|os|as|um|uma|uns|umas)\s+/i,
      ""
    )
    .replace(
      /^(?:no|na|nos|nas|do|da|dos|das|de)\s+/i,
      ""
    )
    .replace(
      /^(?:tamanho|tam)\s+/i,
      ""
    )
    .replace(
      /\s+(?:peça|peças|item|itens)$/i,
      ""
    )
    .trim();
}

function ehPedidoDeListagem(texto = "") {
  const frase = limparTexto(texto);

  return COMANDOS_LISTAGEM.some(
    (comando) =>
      frase === comando ||
      frase.startsWith(`${comando} `)
  );
}

function encontrarTamanho(texto = "") {
  const textoLimpo = limparTexto(texto);

  const tamanhoEncontrado = TAMANHOS.find(
    (tamanho) => {
      const tamanhoNormalizado =
        tamanho.toLowerCase();

      const expressao = new RegExp(
        `(?:^|\\s)(?:no|na|de|do|da|tamanho|tam)?\\s*${tamanhoNormalizado}(?:$|\\s)`,
        "i"
      );

      return expressao.test(textoLimpo);
    }
  );

  return tamanhoEncontrado || null;
}

function encontrarCor(texto = "") {
  const palavras = limparTexto(texto).split(" ");

  for (const palavra of palavras) {
    if (CORES[palavra]) {
      return CORES[palavra];
    }
  }

  return null;
}

function encontrarGenero(texto = "") {
  const palavras = limparTexto(texto).split(" ");

  for (const palavra of palavras) {
    if (GENEROS[palavra]) {
      return GENEROS[palavra];
    }
  }

  return null;
}

function encontrarCategoria(texto = "") {
  const frase = limparTexto(texto);

  if (CATEGORIAS[frase]) {
    return CATEGORIAS[frase];
  }

  const palavras = frase.split(" ");

  for (const palavra of palavras) {
    if (CATEGORIAS[palavra]) {
      return CATEGORIAS[palavra];
    }
  }

  return null;
}

function formatarMarca(valor = "") {
  return valor
    .split(" ")
    .filter(Boolean)
    .map(
      (palavra) =>
        palavra.charAt(0).toUpperCase() +
        palavra.slice(1)
    )
    .join(" ");
}

function resolverAlteracaoDeFiltro(texto = "") {
  const valorOriginal =
    removerPrefixoPrincipal(texto);

  const valor =
    limparPrefixosDeContinuidade(
      valorOriginal
    );

  if (!valor) {
    return null;
  }

  const cor = encontrarCor(valor);

  if (cor) {
    return {
      action: "replace_filter",
      field: "cor",
      value: cor,
    };
  }

  const genero = encontrarGenero(valor);

  if (genero) {
    return {
      action: "replace_filter",
      field: "genero",
      value: genero,
    };
  }

  const tamanho =
    encontrarTamanho(valorOriginal);

  if (tamanho) {
    return {
      action: "replace_filter",
      field: "tamanho",
      value: tamanho,
    };
  }

  const categoria =
    encontrarCategoria(valor);

  if (categoria) {
    return {
      action: "replace_filter",
      field: "categoria",
      value: categoria,
    };
  }

  /*
   * O fallback para marca só é utilizado quando existe
   * um prefixo claro de continuidade.
   *
   * Exemplo:
   * "E Zara"
   * "Agora só Columbia"
   */
  return {
    action: "replace_filter",
    field: "marca",
    value: formatarMarca(valor),
  };
}

function obterOperacaoDeListagem(context = {}) {
  const operacaoAtual =
    context?.operacao ||
    context?.ultimoPlano?.operacao ||
    "";

  if (
    !operacaoAtual ||
    operacaoAtual.startsWith(
      "quantidade_estoque"
    )
  ) {
    return "listar_pecas";
  }

  return operacaoAtual;
}

export function resolveConversationIntent(
  message = "",
  context = {}
) {
  const texto = limparTexto(message);

  if (!texto) {
    return {
      action: "none",
    };
  }

  /*
   * Confirmações.
   */
  if (CONFIRMACOES.includes(texto)) {
    return {
      action: "execute_last_suggestion",
      suggestion:
        context?.ultimaSugestao || null,
    };
  }

  /*
   * Pedido para listar o resultado anterior.
   *
   * Deve vir antes da alteração de filtro para que
   * frases como "mostre essas peças" não sejam
   * interpretadas como marca.
   */
  if (
    ehPedidoDeListagem(texto) &&
    (
      context?.ultimoPlano ||
      Object.keys(
        context?.filtros || {}
      ).length > 0
    )
  ) {
    return {
      action: "context_plan",
      operation:
        obterOperacaoDeListagem(context),
    };
  }

  /*
   * Continuação com alteração de filtro.
   *
   * Exemplos:
   * - e preta
   * - e tamanho M
   * - agora só as pretas
   * - apenas feminina
   * - somente tamanho G
   * - filtre por Zara
   */
  if (
    possuiPrefixoDeContinuidade(texto) &&
    (
      context?.ultimoPlano ||
      Object.keys(
        context?.filtros || {}
      ).length > 0
    )
  ) {
    const alteracao =
      resolverAlteracaoDeFiltro(texto);

    if (alteracao) {
      return alteracao;
    }
  }

  /*
   * Demais perguntas seguem para o Planner.
   */
  return {
    action: "planner",
  };
}

export default {
  resolveConversationIntent,
};