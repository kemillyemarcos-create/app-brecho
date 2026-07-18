// StockDescriptionBuilder.jsx
// Responsável por transformar os filtros utilizados
// na consulta em uma descrição amigável para o usuário.

function existe(valor) {
  return (
    valor !== undefined &&
    valor !== null &&
    String(valor).trim() !== ""
  );
}

function pluralCategoria(categoria = "") {
  const texto = String(categoria).trim();

  if (!texto) {
    return "";
  }

  const mapa = {
    "Blusa": "blusas",
    "Camiseta": "camisetas",
    "Camisa": "camisas",
    "Regata": "regatas",
    "Top": "tops",
    "Body": "bodys",
    "Cropped": "croppeds",

    "Calça": "calças",
    "Legging": "leggings",
    "Short": "shorts",
    "Bermuda": "bermudas",
    "Saia": "saias",

    "Vestido": "vestidos",
    "Macacão": "macacões",

    "Jaqueta": "jaquetas",
    "Casaco": "casacos",
    "Parka": "parkas",
    "Colete": "coletes",
    "Cardigan": "cardigans",
    "Blazer": "blazers",
    "Moletom": "moletons",
    "Pulôver": "pulôveres",
    "Suéter": "suéteres",

    "Pantalona": "pantalonas",

    "Bolsa": "bolsas",

    "Tênis": "tênis",
    "Sapato": "sapatos",
  };

  return mapa[texto] || texto.toLowerCase();
}

function corDescricao(cor = "") {
  if (!cor) {
    return "";
  }

  const mapa = {
    Preto: "pretas",
    Preta: "pretas",

    Branco: "brancas",
    Branca: "brancas",

    Azul: "azuis",

    Verde: "verdes",

    Vermelho: "vermelhas",
    Vermelha: "vermelhas",

    Rosa: "rosas",

    Cinza: "cinzas",

    Bege: "beges",

    Nude: "nudes",

    OffWhite: "off white",

    Marrom: "marrons",

    Laranja: "laranjas",

    Roxo: "roxas",
    Roxa: "roxas",

    Lilás: "lilases",
    Lilas: "lilases",

    Amarelo: "amarelas",
    Amarela: "amarelas",
  };

  return mapa[cor] || cor.toLowerCase();
}

export function construirDescricaoEstoque(
  filtros = {}
) {
  const partes = [];

  const categoria =
    filtros?.categoria;

  const marca =
    filtros?.marca;

  const cor =
    filtros?.cor;

  const tamanho =
    filtros?.tamanho;

  const genero =
    filtros?.genero;

  const material =
    filtros?.material;

  if (existe(categoria)) {
    partes.push(
      pluralCategoria(categoria)
    );
  } else {
    partes.push("peças");
  }

  if (existe(cor)) {
    partes.push(
      corDescricao(cor)
    );
  }

  if (existe(marca)) {
    partes.push(
      `da marca ${marca}`
    );
  }

  if (existe(material)) {
    partes.push(
      `em ${material}`
    );
  }

  if (existe(genero)) {
    partes.push(
      genero.toLowerCase()
    );
  }

  if (existe(tamanho)) {
    partes.push(
      `tamanho ${tamanho.toUpperCase()}`
    );
  }

  return partes.join(" ");
}

export function construirMensagemEncontrado(
  filtros,
  quantidade
) {
  const descricao =
    construirDescricaoEstoque(
      filtros
    );

  return `Foram encontradas ${quantidade} peça(s) de ${descricao} disponíveis no estoque.`;
}

export function construirMensagemNaoEncontrado(
  filtros
) {
  const descricao =
    construirDescricaoEstoque(
      filtros
    );

  return `Não encontrei nenhuma peça de ${descricao} disponível no estoque.`;
}

const stockDescriptionBuilder = {
  construirDescricaoEstoque,
  construirMensagemEncontrado,
  construirMensagemNaoEncontrado,
};

export default stockDescriptionBuilder;