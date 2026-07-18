// FilterExtractor.jsx
// Extrai filtros estruturados da pergunta.
// Reconhece simultaneamente marca, categoria, tamanho,
// cor, material, gênero e status.

import EntityPatterns from "./EntityPatterns";
import BrandRegistry from "../knowledge/BrandRegistry";
import { normalizarTexto } from "../utils/TextUtils";

const CATEGORIAS = [
  { nome: "Bermuda", termos: ["bermuda", "bermudas"] },
  { nome: "Blazer", termos: ["blazer", "blazers"] },
  { nome: "Blusa", termos: ["blusa", "blusas"] },
  { nome: "Body", termos: ["body", "bodys", "bodies"] },
  { nome: "Bolsa", termos: ["bolsa", "bolsas"] },
  { nome: "Calça", termos: ["calca", "calcas", "calça", "calças"] },
  { nome: "Camisa", termos: ["camisa", "camisas"] },
  { nome: "Camiseta", termos: ["camiseta", "camisetas"] },
  { nome: "Cardigan", termos: ["cardigan", "cardigans"] },
  { nome: "Casaco", termos: ["casaco", "casacos"] },
  { nome: "Colete", termos: ["colete", "coletes"] },
  { nome: "Cropped", termos: ["cropped", "croppeds"] },
  { nome: "Jaqueta", termos: ["jaqueta", "jaquetas"] },
  { nome: "Legging", termos: ["legging", "leggings"] },
  {
    nome: "Macacão",
    termos: [
      "macacao",
      "macacoes",
      "macacão",
      "macacões",
    ],
  },
  { nome: "Moletom", termos: ["moletom", "moletons"] },
  { nome: "Pantalona", termos: ["pantalona", "pantalonas"] },
  { nome: "Parka", termos: ["parka", "parkas"] },
  { nome: "Polo", termos: ["polo", "polos"] },
  {
    nome: "Pulôver",
    termos: [
      "pulover",
      "puloveres",
      "pulôver",
      "pulôveres",
    ],
  },
  { nome: "Regata", termos: ["regata", "regatas"] },
  { nome: "Saia", termos: ["saia", "saias"] },
  { nome: "Sapato", termos: ["sapato", "sapatos"] },
  { nome: "Short", termos: ["short", "shorts"] },
  { nome: "Sobretudo", termos: ["sobretudo", "sobretudos"] },
  {
    nome: "Suéter",
    termos: [
      "sueter",
      "sueteres",
      "suéter",
      "suéteres",
    ],
  },
  { nome: "Tênis", termos: ["tenis", "tênis"] },
  { nome: "Top", termos: ["top", "tops"] },
  { nome: "Vestido", termos: ["vestido", "vestidos"] },
];

const CORES = [
  { nome: "Amarelo", termos: ["amarela", "amarelas", "amarelo", "amarelos"] },
  { nome: "Azul", termos: ["azul", "azuis"] },
  { nome: "Bege", termos: ["bege", "beges"] },
  { nome: "Branco", termos: ["branca", "brancas", "branco", "brancos"] },
  { nome: "Bordô", termos: ["bordo", "bordô"] },
  { nome: "Cinza", termos: ["cinza", "cinzas"] },
  { nome: "Coral", termos: ["coral"] },
  { nome: "Creme", termos: ["creme"] },
  { nome: "Dourado", termos: ["dourada", "douradas", "dourado", "dourados"] },
  { nome: "Laranja", termos: ["laranja", "laranjas"] },
  { nome: "Lilás", termos: ["lilas", "lilás"] },
  { nome: "Marrom", termos: ["marrom", "marrons"] },
  { nome: "Nude", termos: ["nude"] },
  { nome: "Off white", termos: ["off white", "off-white"] },
  {
    nome: "Prata",
    termos: ["prata", "prateada", "prateadas", "prateado", "prateados"],
  },
  { nome: "Preto", termos: ["preta", "pretas", "preto", "pretos"] },
  { nome: "Rosa", termos: ["rosa", "rosas"] },
  { nome: "Roxo", termos: ["roxa", "roxas", "roxo", "roxos"] },
  { nome: "Terracota", termos: ["terracota"] },
  { nome: "Verde", termos: ["verde", "verdes"] },
  {
    nome: "Vermelho",
    termos: ["vermelha", "vermelhas", "vermelho", "vermelhos"],
  },
  { nome: "Vinho", termos: ["vinho"] },
];

const MATERIAIS = [
  { nome: "Algodão", termos: ["algodao", "algodão"] },
  { nome: "Cashmere", termos: ["cashmere"] },
  { nome: "Couro", termos: ["couro"] },
  { nome: "Elastano", termos: ["elastano"] },
  { nome: "Lã", termos: ["la", "lã"] },
  { nome: "Linho", termos: ["linho"] },
  { nome: "Modal", termos: ["modal"] },
  { nome: "Nylon", termos: ["nylon"] },
  { nome: "Pena de ganso", termos: ["pena de ganso", "penas de ganso"] },
  { nome: "Poliéster", termos: ["poliester", "poliéster"] },
  { nome: "Seda", termos: ["seda"] },
  { nome: "Tricô", termos: ["tricot", "tricô"] },
  { nome: "Viscose", termos: ["viscose"] },
];

const GENEROS = [
  {
    nome: "Feminino",
    termos: ["feminina", "femininas", "feminino", "femininos"],
  },
  {
    nome: "Masculino",
    termos: ["masculina", "masculinas", "masculino", "masculinos"],
  },
  { nome: "Infantil", termos: ["infantil", "infantis"] },
  { nome: "Unissex", termos: ["unissex"] },
];

function textoContemTermo(texto = "", termo = "") {
  const textoNormalizado =
    normalizarTexto(texto);

  const termoNormalizado =
    normalizarTexto(termo);

  if (!textoNormalizado || !termoNormalizado) {
    return false;
  }

  return ` ${textoNormalizado} `.includes(
    ` ${termoNormalizado} `
  );
}

function encontrarValorCanonico(
  texto,
  configuracoes = []
) {
  const candidatos =
    configuracoes
      .flatMap((configuracao) =>
        (configuracao?.termos || []).map(
          (termo) => ({
            nome: configuracao.nome,
            termo,
            tamanho:
              normalizarTexto(termo).length,
          })
        )
      )
      .sort(
        (a, b) =>
          b.tamanho - a.tamanho
      );

  const encontrado =
    candidatos.find((candidato) =>
      textoContemTermo(
        texto,
        candidato.termo
      )
    );

  return encontrado?.nome || null;
}

function encontrarValorLista(
  texto,
  lista = []
) {
  const termos =
    [...lista]
      .filter(Boolean)
      .sort(
        (a, b) =>
          normalizarTexto(b).length -
          normalizarTexto(a).length
      );

  return (
    termos.find((item) =>
      textoContemTermo(
        texto,
        item
      )
    ) || null
  );
}

class FilterExtractor {
  extrair(pergunta = "") {
    const texto =
      normalizarTexto(pergunta);

    const filtros = {};

    /*
     * Marca
     * O BrandRegistry é a fonte oficial de aliases
     * e normalização das marcas.
     */
    const marca =
      BrandRegistry.encontrarMarcaPorTexto(
        texto
      );

    if (marca) {
      filtros.marca = marca.nome;
    }

    /*
     * Categoria
     * Retorna sempre o valor canônico no singular.
     */
    const categoria =
      encontrarValorCanonico(
        texto,
        CATEGORIAS
      );

    if (categoria) {
      filtros.categoria =
        categoria;
    }

    /*
     * Tamanho
     * Mantém compatibilidade com EntityPatterns
     * caso a lista de tamanhos seja adicionada.
     */
    const tamanho =
      encontrarValorLista(
        texto,
        EntityPatterns.tamanhos || []
      );

    if (tamanho) {
      filtros.tamanho =
        tamanho;
    }

    /*
     * Cor
     */
    const cor =
      encontrarValorCanonico(
        texto,
        CORES
      );

    if (cor) {
      filtros.cor = cor;
    }

    /*
     * Material
     */
    const material =
      encontrarValorCanonico(
        texto,
        MATERIAIS
      );

    if (material) {
      filtros.material =
        material;
    }

    /*
     * Gênero
     */
    const genero =
      encontrarValorCanonico(
        texto,
        GENEROS
      );

    if (genero) {
      filtros.genero =
        genero;
    }

    /*
     * Status do pagamento
     */
    if (
      textoContemTermo(texto, "pago") ||
      textoContemTermo(texto, "pagos") ||
      textoContemTermo(texto, "paga") ||
      textoContemTermo(texto, "pagas")
    ) {
      filtros.statusPagamento =
        "pago";
    }

    if (
      textoContemTermo(texto, "pendente") ||
      textoContemTermo(texto, "pendentes") ||
      texto.includes("nao pagou") ||
      texto.includes("quem deve")
    ) {
      filtros.statusPagamento =
        "pendente";
    }

    /*
     * Status do estoque
     */
    if (
      textoContemTermo(
        texto,
        "disponivel"
      ) ||
      textoContemTermo(
        texto,
        "disponiveis"
      )
    ) {
      filtros.statusEstoque =
        "disponivel";
    }

    if (
      textoContemTermo(texto, "vendida") ||
      textoContemTermo(texto, "vendidas") ||
      textoContemTermo(texto, "vendido") ||
      textoContemTermo(texto, "vendidos")
    ) {
      filtros.statusEstoque =
        "vendida";
    }

    if (
      textoContemTermo(texto, "reservada") ||
      textoContemTermo(texto, "reservadas") ||
      textoContemTermo(texto, "reservado") ||
      textoContemTermo(texto, "reservados")
    ) {
      filtros.statusEstoque =
        "reservada";
    }

    return filtros;
  }
}

const filterExtractor =
  new FilterExtractor();

export default filterExtractor;
