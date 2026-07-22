// InventorySemanticAnalyzer.jsx
// Analisa o campo "nome" das peças do estoque e identifica
// marca, categoria, cor, material, gênero e palavras-chave.

import BrandRegistry from "../knowledge/BrandRegistry";

const CATEGORIAS = [
  "bermuda",
  "blazer",
  "blusa",
  "body",
  "bolsa",
  "calca",
  "calça",
  "camisa",
  "camiseta",
  "cardigan",
  "casaco",
  "colete",
  "cropped",
  "jaqueta",
  "legging",
  "macacao",
  "macacão",
  "moletom",
  "pantalona",
  "parka",
  "polo",
  "pulover",
  "pulôver",
  "regata",
  "saia",
  "short",
  "shorts",
  "sobretudo",
  "sueter",
  "suéter",
  "tenis",
  "tênis",
  "top",
  "vestido",
];

const CORES = [
  "amarela",
  "amarelo",
  "azul",
  "bege",
  "branca",
  "branco",
  "bordo",
  "bordô",
  "cinza",
  "coral",
  "creme",
  "dourada",
  "dourado",
  "laranja",
  "lilas",
  "lilás",
  "marrom",
  "nude",
  "off white",
  "prata",
  "prateada",
  "preta",
  "preto",
  "rosa",
  "roxa",
  "roxo",
  "terracota",
  "verde",
  "vermelha",
  "vermelho",
  "vinho",
];

const MATERIAIS = [
  "algodao",
  "algodão",
  "cashmere",
  "couro",
  "elastano",
  "la",
  "lã",
  "linho",
  "modal",
  "nylon",
  "pena de ganso",
  "poliester",
  "poliéster",
  "seda",
  "tricot",
  "tricô",
  "viscose",
];

const GENEROS = [
  "feminina",
  "feminino",
  "masculina",
  "masculino",
  "infantil",
  "unissex",
];

const TERMOS_IGNORADOS = new Set([
  "a",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "estoque",
  "no",
  "nos",
  "o",
  "os",
  "peca",
  "peça",
  "pecas",
  "peças",
  "tem",
  "temos",
]);

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

function removerAcentos(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizarTextoEstoque(
  valor = ""
) {
  return removerAcentos(valor)
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Verifica o termo como palavra ou expressão completa.
 *
 * Evita, por exemplo, que o material "la"
 * seja reconhecido dentro da palavra "calca".
 */
function textoContemTermo(
  textoNormalizado,
  termo
) {
  const termoNormalizado =
    normalizarTextoEstoque(termo);

  if (!textoNormalizado || !termoNormalizado) {
    return false;
  }

  const textoPreparado =
    ` ${textoNormalizado} `;

  const termoPreparado =
    ` ${termoNormalizado} `;

  return textoPreparado.includes(
    termoPreparado
  );
}

function encontrarTermo(
  textoNormalizado,
  termos = []
) {
  const termosOrdenados =
    [...termos].sort(
      (a, b) =>
        normalizarTextoEstoque(b).length -
        normalizarTextoEstoque(a).length
    );

  return (
    termosOrdenados.find((termo) =>
      textoContemTermo(
        textoNormalizado,
        termo
      )
    ) || null
  );
}

function padronizarCategoria(categoria) {
  const mapa = {
    calca: "Calça",
    calça: "Calça",
    macacao: "Macacão",
    macacão: "Macacão",
    pulover: "Pulôver",
    pulôver: "Pulôver",
    sueter: "Suéter",
    suéter: "Suéter",
    tenis: "Tênis",
    tênis: "Tênis",
    shorts: "Short",
  };

  if (!categoria) {
    return null;
  }

  return (
    mapa[categoria] ||
    categoria.charAt(0).toUpperCase() +
    categoria.slice(1)
  );
}

function padronizarCor(cor) {
  if (!cor) {
    return null;
  }

  const chave =
    normalizarTextoEstoque(cor);

  const mapa = {
    amarela: "Amarelo",
    amarelo: "Amarelo",

    branca: "Branco",
    branco: "Branco",

    dourada: "Dourado",
    dourado: "Dourado",

    prata: "Prata",
    prateada: "Prata",
    prateado: "Prata",

    preta: "Preto",
    preto: "Preto",

    roxa: "Roxo",
    roxo: "Roxo",

    vermelha: "Vermelho",
    vermelho: "Vermelho",

    azul: "Azul",
    bege: "Bege",
    bordo: "Bordô",
    cinza: "Cinza",
    coral: "Coral",
    creme: "Creme",
    laranja: "Laranja",
    lilas: "Lilás",
    marrom: "Marrom",
    nude: "Nude",
    "off white": "Off White",
    rosa: "Rosa",
    terracota: "Terracota",
    verde: "Verde",
    vinho: "Vinho",
  };

  return (
    mapa[chave] ||
    chave.charAt(0).toUpperCase() +
    chave.slice(1)
  );
}

function extrairTamanhoObservacao(observacao = "") {
  const textoNormalizado =
    normalizarTextoEstoque(observacao);

  if (!textoNormalizado) {
    return null;
  }

  const tamanhoEncontrado =
    encontrarTermo(
      textoNormalizado,
      TAMANHOS
    );

  return tamanhoEncontrado
    ? String(tamanhoEncontrado).toUpperCase()
    : null;
}

function padronizarValor(valor) {
  if (!valor) {
    return null;
  }

  return (
    valor.charAt(0).toUpperCase() +
    valor.slice(1)
  );
}

function extrairPalavrasChave(
  textoNormalizado
) {
  return [
    ...new Set(
      textoNormalizado
        .split(" ")
        .map((item) => item.trim())
        .filter(
          (item) =>
            item.length >= 3 &&
            !TERMOS_IGNORADOS.has(item)
        )
    ),
  ];
}

function valoresCorrespondem(
  valorPeca,
  valorFiltro
) {
  const pecaNormalizada =
    normalizarTextoEstoque(valorPeca);

  const filtroNormalizado =
    normalizarTextoEstoque(valorFiltro);

  if (!filtroNormalizado) {
    return true;
  }

  if (!pecaNormalizada) {
    return false;
  }

  return (
    pecaNormalizada === filtroNormalizado
  );
}

function marcaCorresponde(
  marcaPeca,
  marcaFiltro
) {
  if (!marcaFiltro) {
    return true;
  }

  if (!marcaPeca) {
    return false;
  }

  const marcaPecaNormalizada =
    BrandRegistry.normalizarMarca(
      marcaPeca
    ) || marcaPeca;

  const marcaFiltroNormalizada =
    BrandRegistry.normalizarMarca(
      marcaFiltro
    ) || marcaFiltro;

  return valoresCorrespondem(
    marcaPecaNormalizada,
    marcaFiltroNormalizada
  );
}

export function analisarNomePeca(
  nome = ""
) {
  const textoNormalizado =
    normalizarTextoEstoque(nome);

  const marcaEncontrada =
    BrandRegistry.encontrarMarcaPorTexto(
      textoNormalizado
    );

  const categoriaEncontrada =
    encontrarTermo(
      textoNormalizado,
      CATEGORIAS
    );

  const corEncontrada =
    encontrarTermo(
      textoNormalizado,
      CORES
    );

  const materialEncontrado =
    encontrarTermo(
      textoNormalizado,
      MATERIAIS
    );

  const generoEncontrado =
    encontrarTermo(
      textoNormalizado,
      GENEROS
    );

  return {
    nomeOriginal:
      String(nome || "").trim(),

    textoNormalizado,

    marca:
      marcaEncontrada?.nome || null,

    categoria:
      padronizarCategoria(
        categoriaEncontrada
      ),

    cor:
      padronizarCor(
        corEncontrada
      ),

    material:
      padronizarValor(
        materialEncontrado
      ),

    genero:
      padronizarValor(
        generoEncontrado
      ),

    palavrasChave:
      extrairPalavrasChave(
        textoNormalizado
      ),
  };
}

export function analisarPecaEstoque(
  peca = {}
) {
  const nome =
    peca?.nome ||
    peca?.descricao ||
    peca?.titulo ||
    peca?.produto ||
    "";

  const observacao =
    peca?.observacao ||
    peca?.obs ||
    "";

  const analiseNome =
    analisarNomePeca(nome);

  return {
    ...peca,

    analiseEstoque: {
      ...analiseNome,

      tamanho:
        extrairTamanhoObservacao(
          observacao
        ),
    },
  };
}

export function analisarListaPecasEstoque(
  pecas = []
) {
  if (!Array.isArray(pecas)) {
    return [];
  }

  return pecas.map(
    analisarPecaEstoque
  );
}

function normalizarListaFiltros(
  valorSingular,
  valoresPlurais
) {
  const lista = [
    ...(Array.isArray(valoresPlurais) ? valoresPlurais : []),
    ...(valorSingular ? [valorSingular] : []),
  ].filter(Boolean);

  return Array.from(new Set(lista));
}

/*
 * Verifica se o valor da peça corresponde a pelo menos
 * um dos valores informados no mesmo atributo.
 *
 * Regra:
 * - OR dentro do mesmo atributo;
 * - AND entre atributos diferentes.
 */
function correspondeAAlgumValor(
  valorPeca,
  valoresFiltro = [],
  comparador = valoresCorrespondem
) {
  if (
    !Array.isArray(valoresFiltro) ||
    valoresFiltro.length === 0
  ) {
    return true;
  }

  return valoresFiltro.some(
    (valorFiltro) =>
      comparador(
        valorPeca,
        valorFiltro
      )
  );
}

export function pecaCorrespondeAosFiltros(
  peca = {},
  filtros = {}
) {
  const analisada =
    peca?.analiseEstoque
      ? peca
      : analisarPecaEstoque(peca);

  const analise =
    analisada.analiseEstoque;

  const tamanhos =
    normalizarListaFiltros(
      filtros?.tamanho,
      filtros?.tamanhos
    );

  if (
    !correspondeAAlgumValor(
      analise.tamanho,
      tamanhos
    )
  ) {
    return false;
  }

  const marcas =
    normalizarListaFiltros(
      filtros?.marca,
      filtros?.marcas
    );

  if (
    !correspondeAAlgumValor(
      analise.marca,
      marcas,
      marcaCorresponde
    )
  ) {
    return false;
  }

  const categorias =
    normalizarListaFiltros(
      filtros?.categoria,
      filtros?.categorias
    );

  if (
    !correspondeAAlgumValor(
      analise.categoria,
      categorias
    )
  ) {
    return false;
  }

  const cores =
    normalizarListaFiltros(
      filtros?.cor,
      filtros?.cores
    );

  if (
    !correspondeAAlgumValor(
      padronizarCor(analise.cor),
      cores.map(padronizarCor)
    )
  ) {
    return false;
  }

  const materiais =
    normalizarListaFiltros(
      filtros?.material,
      filtros?.materiais
    );

  if (
    !correspondeAAlgumValor(
      analise.material,
      materiais
    )
  ) {
    return false;
  }

  const generos =
    normalizarListaFiltros(
      filtros?.genero,
      filtros?.generos
    );

  if (
    !correspondeAAlgumValor(
      analise.genero,
      generos
    )
  ) {
    return false;
  }

  const filtrosLivres = [
    filtros?.nome,
    filtros?.descricao,
    filtros?.termo,
  ]
    .map(normalizarTextoEstoque)
    .filter(Boolean);

  return filtrosLivres.every((termo) => {
    return (
      textoContemTermo(
        analise.textoNormalizado,
        termo
      ) ||
      analise.textoNormalizado.includes(
        termo
      )
    );
  });
}

export function agruparPecasPorAtributo(
  pecas = [],
  atributo
) {
  const grupos = new Map();

  for (const pecaOriginal of pecas) {
    const peca =
      pecaOriginal?.analiseEstoque
        ? pecaOriginal
        : analisarPecaEstoque(
          pecaOriginal
        );

    const valor =
      peca?.analiseEstoque?.[
      atributo
      ];

    if (!valor) {
      continue;
    }

    const chave =
      normalizarTextoEstoque(valor);

    const grupoAtual =
      grupos.get(chave);

    if (grupoAtual) {
      grupoAtual.quantidade += 1;
      grupoAtual.pecas.push(
        pecaOriginal
      );
      continue;
    }

    grupos.set(chave, {
      nome: valor,
      quantidade: 1,
      pecas: [pecaOriginal],
    });
  }

  return [...grupos.values()].sort(
    (a, b) => {
      if (
        b.quantidade !==
        a.quantidade
      ) {
        return (
          b.quantidade -
          a.quantidade
        );
      }

      return a.nome.localeCompare(
        b.nome,
        "pt-BR"
      );
    }
  );
}

const inventorySemanticAnalyzer = {
  analisarNomePeca,
  analisarPecaEstoque,
  analisarListaPecasEstoque,
  pecaCorrespondeAosFiltros,
  agruparPecasPorAtributo,
  normalizarTextoEstoque,
};

export default inventorySemanticAnalyzer;
