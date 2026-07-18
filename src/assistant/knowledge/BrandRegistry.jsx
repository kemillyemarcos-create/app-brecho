// BrandRegistry.jsx
// Fonte central para reconhecimento, normalização
// e aliases das marcas utilizadas pela K.Chic.

const marcas = [
  {
    id: "levis",
    nome: "Levi's",
    aliases: [
      "levis",
      "levi's",
      "levi",
    ],
  },

  {
    id: "nike",
    nome: "Nike",
    aliases: [
      "nike",
    ],
  },

  {
    id: "adidas",
    nome: "Adidas",
    aliases: [
      "adidas",
      "adidas originals",
      "adidas performance",
    ],
  },

  {
    id: "zara",
    nome: "Zara",
    aliases: [
      "zara",
    ],
  },

  {
    id: "columbia",
    nome: "Columbia",
    aliases: [
      "columbia",
      "columbia sportswear",
    ],
  },

  {
    id: "the-north-face",
    nome: "The North Face",
    aliases: [
      "the north face",
      "north face",
      "tnf",
    ],
  },

  {
    id: "hm",
    nome: "H&M",
    aliases: [
      "h&m",
      "h & m",
      "hm",
    ],
  },

  {
    id: "michael-kors",
    nome: "Michael Kors",
    aliases: [
      "michael kors",
      "michael",
      "kors",
      "mk",
    ],
  },

  {
    id: "calvin-klein",
    nome: "Calvin Klein",
    aliases: [
      "calvin klein",
      "calvin",
      "ck",
    ],
  },

  {
    id: "tommy-hilfiger",
    nome: "Tommy Hilfiger",
    aliases: [
      "tommy hilfiger",
      "tommy",
      "hilfiger",
    ],
  },

  {
    id: "ralph-lauren",
    nome: "Ralph Lauren",
    aliases: [
      "ralph lauren",
      "polo ralph lauren",
      "ralph",
    ],
  },
];

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, " e ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function obterAliasesNormalizados(marca) {
  return [
    marca?.nome,
    ...(Array.isArray(marca?.aliases)
      ? marca.aliases
      : []),
  ]
    .map(normalizarTexto)
    .filter(Boolean);
}

function encontrarMarcaPorTexto(texto) {
  const textoNormalizado =
    normalizarTexto(texto);

  if (!textoNormalizado) {
    return null;
  }

  const marcasOrdenadas = [...marcas].sort(
    (a, b) => {
      const maiorAliasA = Math.max(
        ...obterAliasesNormalizados(a).map(
          (alias) => alias.length
        )
      );

      const maiorAliasB = Math.max(
        ...obterAliasesNormalizados(b).map(
          (alias) => alias.length
        )
      );

      return maiorAliasB - maiorAliasA;
    }
  );

  for (const marca of marcasOrdenadas) {
    const aliases =
      obterAliasesNormalizados(marca).sort(
        (a, b) => b.length - a.length
      );

    const aliasEncontrado = aliases.find(
      (alias) =>
        textoNormalizado === alias ||
        textoNormalizado.includes(alias)
    );

    if (aliasEncontrado) {
      return {
        ...marca,
        aliasEncontrado,
      };
    }
  }

  return null;
}

function normalizarMarca(valor) {
  const marca =
    encontrarMarcaPorTexto(valor);

  return marca?.nome || null;
}

function listarNomesMarcas() {
  return marcas.map(
    (marca) => marca.nome
  );
}

function listarAliasesMarcas() {
  return marcas.flatMap((marca) =>
    obterAliasesNormalizados(marca).map(
      (alias) => ({
        alias,
        nome: marca.nome,
        id: marca.id,
      })
    )
  );
}

const BrandRegistry = {
  marcas,
  normalizarTexto,
  encontrarMarcaPorTexto,
  normalizarMarca,
  listarNomesMarcas,
  listarAliasesMarcas,
};

export {
  marcas,
  normalizarTexto,
  encontrarMarcaPorTexto,
  normalizarMarca,
  listarNomesMarcas,
  listarAliasesMarcas,
};

export default BrandRegistry;