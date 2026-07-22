// FilterExtractor.jsx
// Extrai filtros estruturados da pergunta.
// Reconhece simultaneamente marca, categoria, tamanho,
// cor, material, gênero e status.

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

const TAMANHOS = [
  "XGG",
  "XG",
  "GG",
  "PP",
  "G",
  "M",
  "P",
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

const MAPA_TAMANHOS = new Map(
  TAMANHOS.map((tamanho) => [
    tamanho.toLowerCase(),
    tamanho,
  ])
);

/*
 * Prepara o texto para comparação lexical.
 *
 * A função global normalizarTexto remove acentos,
 * mas preserva pontuação. Aqui a pontuação é convertida
 * em espaço para que "G?", "preta," e "off-white" sejam
 * reconhecidos como termos independentes.
 */
function prepararTextoBusca(valor = "") {
  return normalizarTexto(valor)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textoContemTermo(texto = "", termo = "") {
  const textoNormalizado =
    prepararTextoBusca(texto);

  const termoNormalizado =
    prepararTextoBusca(termo);

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
  const valores =
    encontrarValoresCanonicos(
      texto,
      configuracoes
    );

  return valores[0] || null;
}

/*
 * Localiza todos os valores canônicos presentes no texto.
 *
 * Exemplo:
 * "vestidos pretos e azuis"
 *
 * Resultado:
 * ["Preto", "Azul"]
 *
 * Os termos maiores são avaliados primeiro para evitar
 * colisões entre expressões compostas e palavras menores.
 */
function encontrarValoresCanonicos(
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
              prepararTextoBusca(termo).length,
          })
        )
      )
      .sort(
        (a, b) =>
          b.tamanho - a.tamanho
      );

  const encontrados = [];

  candidatos.forEach((candidato) => {
    if (
      textoContemTermo(
        texto,
        candidato.termo
      ) &&
      !encontrados.includes(
        candidato.nome
      )
    ) {
      encontrados.push(
        candidato.nome
      );
    }
  });

  return encontrados;
}

/*
 * Mantém compatibilidade com os filtros antigos.
 *
 * Quando existe apenas um valor:
 * filtros.cor = "Preto"
 *
 * Quando existem vários valores:
 * filtros.cores = ["Preto", "Azul"]
 */
function aplicarFiltroSingularOuPlural(
  filtros,
  chaveSingular,
  chavePlural,
  valores = []
) {
  const valoresValidos =
    Array.from(
      new Set(
        (Array.isArray(valores)
          ? valores
          : [valores]
        ).filter(Boolean)
      )
    );

  if (valoresValidos.length === 1) {
    filtros[chaveSingular] =
      valoresValidos[0];

    return;
  }

  if (valoresValidos.length > 1) {
    filtros[chavePlural] =
      valoresValidos;
  }
}

function normalizarResultadoMarca(
  resultado
) {
  if (!resultado) {
    return null;
  }

  if (typeof resultado === "string") {
    return resultado;
  }

  return (
    resultado.nome ||
    resultado.marca ||
    resultado.nomeCanonico ||
    resultado.canonico ||
    null
  );
}

/*
 * Extrai todas as marcas reconhecidas pelo BrandRegistry.
 *
 * A função aceita três níveis de compatibilidade:
 *
 * 1. encontrarMarcasPorTexto()
 * 2. listarAliasesMarcas()
 * 3. encontrarMarcaPorTexto()
 *
 * Dessa maneira, o FilterExtractor continua funcionando
 * mesmo antes da atualização definitiva do BrandRegistry.
 */
function extrairMarcas(texto = "") {
  if (
    typeof BrandRegistry
      ?.encontrarMarcasPorTexto ===
    "function"
  ) {
    const resultados =
      BrandRegistry
        .encontrarMarcasPorTexto(
          texto
        );

    const marcas =
      (Array.isArray(resultados)
        ? resultados
        : [resultados]
      )
        .map(normalizarResultadoMarca)
        .filter(Boolean);

    return Array.from(
      new Set(marcas)
    );
  }

  if (
    typeof BrandRegistry
      ?.listarAliasesMarcas ===
    "function"
  ) {
    const registros =
      BrandRegistry
        .listarAliasesMarcas() || [];

    const candidatos =
      (Array.isArray(registros)
        ? registros
        : []
      )
        .flatMap((registro) => {
          if (
            typeof registro ===
            "string"
          ) {
            return [{
              alias: registro,
              nome: registro,
            }];
          }

          const nome =
            normalizarResultadoMarca(
              registro
            );

          const aliases =
            registro.aliases ||
            registro.termos ||
            (
              registro.alias
                ? [registro.alias]
                : []
            );

          return (
            Array.isArray(aliases)
              ? aliases
              : [aliases]
          )
            .filter(Boolean)
            .map((alias) => ({
              alias,
              nome:
                nome || alias,
            }));
        })
        .sort(
          (a, b) =>
            prepararTextoBusca(
              b.alias
            ).length -
            prepararTextoBusca(
              a.alias
            ).length
        );

    const marcas = [];

    candidatos.forEach(
      (candidato) => {
        if (
          textoContemTermo(
            texto,
            candidato.alias
          ) &&
          candidato.nome &&
          !marcas.includes(
            candidato.nome
          )
        ) {
          marcas.push(
            candidato.nome
          );
        }
      }
    );

    if (marcas.length > 0) {
      return marcas;
    }
  }

  if (
    typeof BrandRegistry
      ?.encontrarMarcaPorTexto ===
    "function"
  ) {
    const marca =
      BrandRegistry
        .encontrarMarcaPorTexto(
          texto
        );

    const nome =
      normalizarResultadoMarca(
        marca
      );

    return nome ? [nome] : [];
  }

  return [];
}

/*
 * Extrator dedicado de tamanho.
 *
 * Não usa a busca genérica de listas porque tamanhos
 * como P, M e G são entidades curtas e precisam de
 * regras lexicais próprias.
 *
 * A função retorna todos os tamanhos encontrados,
 * preservando a ordem em que aparecem na pergunta.
 */
function extrairTamanhos(texto = "") {
  const textoNormalizado =
    prepararTextoBusca(texto);

  if (!textoNormalizado) {
    return [];
  }

  const tokens =
    textoNormalizado
      .split(" ")
      .filter(Boolean);

  const encontrados = [];

  tokens.forEach((token) => {
    const tamanho =
      MAPA_TAMANHOS.get(
        token.toLowerCase()
      );

    if (
      tamanho &&
      !encontrados.includes(
        tamanho
      )
    ) {
      encontrados.push(
        tamanho
      );
    }
  });

  return encontrados;
}

/*
 * Compatibilidade com chamadas antigas.
 *
 * Continua retornando somente o primeiro tamanho
 * reconhecido pela pergunta.
 */
function extrairTamanho(texto = "") {
  const tamanhos =
    extrairTamanhos(texto);

  return tamanhos[0] || null;
}

class FilterExtractor {
  extrair(pergunta = "") {
    const texto =
      prepararTextoBusca(pergunta);

    const filtros = {};

    /*
     * Marca
     *
     * Uma marca mantém a chave antiga:
     * filtros.marca
     *
     * Duas ou mais marcas usam:
     * filtros.marcas
     */
    const marcas =
      extrairMarcas(texto);

    aplicarFiltroSingularOuPlural(
      filtros,
      "marca",
      "marcas",
      marcas
    );

    /*
     * Categoria
     */
    const categorias =
      encontrarValoresCanonicos(
        texto,
        CATEGORIAS
      );

    aplicarFiltroSingularOuPlural(
      filtros,
      "categoria",
      "categorias",
      categorias
    );

    /*
     * Tamanho
     *
     * Exemplos reconhecidos:
     *
     * - Tem Zara no G?
     * - Tem vestido tamanho M?
     * - E GG?
     * - Tem blazer 42?
     * - Tem peças M e G?
     */
    const tamanhos =
      extrairTamanhos(texto);

    aplicarFiltroSingularOuPlural(
      filtros,
      "tamanho",
      "tamanhos",
      tamanhos
    );

    /*
     * Cor
     */
    const cores =
      encontrarValoresCanonicos(
        texto,
        CORES
      );

    aplicarFiltroSingularOuPlural(
      filtros,
      "cor",
      "cores",
      cores
    );

    /*
     * Material
     */
    const materiais =
      encontrarValoresCanonicos(
        texto,
        MATERIAIS
      );

    aplicarFiltroSingularOuPlural(
      filtros,
      "material",
      "materiais",
      materiais
    );

    /*
     * Gênero
     */
    const generos =
      encontrarValoresCanonicos(
        texto,
        GENEROS
      );

    aplicarFiltroSingularOuPlural(
      filtros,
      "genero",
      "generos",
      generos
    );

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
