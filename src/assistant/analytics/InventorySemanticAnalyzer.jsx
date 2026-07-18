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
      padronizarValor(
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

  return {
    ...peca,

    analiseEstoque:
      analisarNomePeca(nome),
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

  if (
    !marcaCorresponde(
      analise.marca,
      filtros?.marca
    )
  ) {
    return false;
  }

  if (
    filtros?.categoria &&
    !valoresCorrespondem(
      analise.categoria,
      filtros.categoria
    )
  ) {
    return false;
  }

  if (
    filtros?.cor &&
    !valoresCorrespondem(
      analise.cor,
      filtros.cor
    )
  ) {
    return false;
  }

  if (
    filtros?.material &&
    !valoresCorrespondem(
      analise.material,
      filtros.material
    )
  ) {
    return false;
  }

  if (
    filtros?.genero &&
    !valoresCorrespondem(
      analise.genero,
      filtros.genero
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
    analise.textoNormalizado.includes(termo)
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