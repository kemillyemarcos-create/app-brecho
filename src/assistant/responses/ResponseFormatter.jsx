// ResponseFormatter.jsx
// Utilitários de apresentação usados pelos builders de resposta.
// Não contém regras de negócio nem acesso a dados.

function normalizarQuantidade(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return Math.max(0, Math.trunc(numero));
}

function capitalizar(valor = "") {
  const texto = String(valor || "").trim();

  if (!texto) {
    return "";
  }

  return (
    texto.charAt(0).toLocaleUpperCase("pt-BR") +
    texto.slice(1)
  );
}

function formatarBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const PLURAIS = {
  peça: "peças",
  vestido: "vestidos",
  jaqueta: "jaquetas",
  casaco: "casacos",
  calça: "calças",
  camisa: "camisas",
  camiseta: "camisetas",
  blusa: "blusas",
  regata: "regatas",
  top: "tops",
  body: "bodys",
  cropped: "croppeds",
  legging: "leggings",
  short: "shorts",
  bermuda: "bermudas",
  saia: "saias",
  macacão: "macacões",
  parka: "parkas",
  cardigan: "cardigans",
  colete: "coletes",
  blazer: "blazers",
  moletom: "moletons",
  suéter: "suéteres",
  pulôver: "pulôveres",
  pantalona: "pantalonas",
  bolsa: "bolsas",
  tênis: "tênis",
  sapato: "sapatos",
  sobretudo: "sobretudos",
  polo: "polos",
};

function pluralizar(palavra = "peça", quantidade = 0) {
  const texto = String(palavra || "peça").trim();

  if (normalizarQuantidade(quantidade) === 1) {
    return texto;
  }

  const chave = texto.toLocaleLowerCase("pt-BR");

  if (PLURAIS[chave]) {
    return PLURAIS[chave];
  }

  if (chave.endsWith("ão")) {
    return `${texto.slice(0, -2)}ões`;
  }

  if (chave.endsWith("m")) {
    return `${texto.slice(0, -1)}ns`;
  }

  if (chave.endsWith("s")) {
    return texto;
  }

  return `${texto}s`;
}

const CATEGORIAS_FEMININAS = new Set([
  "blusa",
  "bolsa",
  "calça",
  "camisa",
  "camiseta",
  "jaqueta",
  "legging",
  "bermuda",
  "saia",
  "parka",
  "pantalona",
]);

function categoriaEhFeminina(categoria = "") {
  return CATEGORIAS_FEMININAS.has(
    String(categoria || "")
      .trim()
      .toLocaleLowerCase("pt-BR")
  );
}

function ajustarAdjetivo(
  valor = "",
  {
    feminino = false,
    plural = false,
  } = {}
) {
  let texto = String(valor || "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  if (!texto) {
    return "";
  }

  const invariaveis = new Set([
    "azul",
    "bege",
    "bordô",
    "cinza",
    "coral",
    "creme",
    "laranja",
    "lilás",
    "marrom",
    "nude",
    "off white",
    "rosa",
    "terracota",
    "verde",
    "vinho",
    "unissex",
    "infantil",
  ]);

  if (!invariaveis.has(texto)) {
    if (feminino && texto.endsWith("o")) {
      texto = `${texto.slice(0, -1)}a`;
    }

    if (plural) {
      if (texto.endsWith("m")) {
        texto = `${texto.slice(0, -1)}ns`;
      } else if (!texto.endsWith("s")) {
        texto = `${texto}s`;
      }
    }
  } else if (
    plural &&
    ["azul", "verde", "marrom"].includes(texto)
  ) {
    const mapa = {
      azul: "azuis",
      verde: "verdes",
      marrom: "marrons",
    };

    texto = mapa[texto];
  }

  return texto;
}

function artigoDaMarca(marca = "") {
  const nome = String(marca || "").trim();

  if (!nome) {
    return "";
  }

  const marcasComDa = new Set([
    "zara",
    "nike",
    "adidas",
    "columbia",
    "the north face",
    "h&m",
    "michael kors",
    "calvin klein",
    "tommy hilfiger",
    "ralph lauren",
    "levi's",
    "levis",
  ]);

  const artigo = marcasComDa.has(
    nome.toLocaleLowerCase("pt-BR")
  )
    ? "da"
    : "de";

  return `${artigo} ${nome}`;
}

export {
  normalizarQuantidade,
  capitalizar,
  formatarBRL,
  pluralizar,
  categoriaEhFeminina,
  ajustarAdjetivo,
  artigoDaMarca,
};

const ResponseFormatter = {
  normalizarQuantidade,
  capitalizar,
  formatarBRL,
  pluralizar,
  categoriaEhFeminina,
  ajustarAdjetivo,
  artigoDaMarca,
};

export default ResponseFormatter;
