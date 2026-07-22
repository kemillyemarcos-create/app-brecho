// QueryExecutor.js
// Sprint 4.2
// Executa as consultas construídas pelo QueryBuilder.
// Atualizado com suporte às consultas do estoque.

import QueryRegistry from "./QueryRegistry";

const TAMANHO_PAGINA = 1000;
const TAMANHO_BLOCO_IDS = 500;
const TAMANHO_BLOCO_LIVES = 100;

async function buscarPaginado(
  criarConsulta,
  mensagemErro
) {
  let inicio = 0;
  const registros = [];

  while (true) {
    const consulta = criarConsulta();

    if (
      !consulta ||
      typeof consulta.range !== "function"
    ) {
      throw new Error(
        "Não foi possível construir a consulta paginada."
      );
    }

    const { data, error } = await consulta.range(
      inicio,
      inicio + TAMANHO_PAGINA - 1
    );

    if (error) {
      throw new Error(
        `${mensagemErro}: ${error.message}`
      );
    }

    const pagina = Array.isArray(data)
      ? data
      : [];

    registros.push(...pagina);

    if (pagina.length < TAMANHO_PAGINA) {
      break;
    }

    inicio += TAMANHO_PAGINA;
  }

  return registros;
}

function dividirEmBlocos(
  lista = [],
  tamanho = TAMANHO_BLOCO_IDS
) {
  const blocos = [];

  for (
    let inicio = 0;
    inicio < lista.length;
    inicio += tamanho
  ) {
    blocos.push(
      lista.slice(
        inicio,
        inicio + tamanho
      )
    );
  }

  return blocos;
}

function converterData(valor) {
  if (!valor) {
    return null;
  }

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime())
      ? null
      : valor;
  }

  const texto = String(valor).trim();

  if (!texto) {
    return null;
  }

  /*
   * Datas brasileiras precisam ser interpretadas
   * antes de new Date().
   *
   * Caso contrário, 11/07/2026 pode ser lido
   * como 7 de novembro de 2026.
   */
  const brasileira = texto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (brasileira) {
    const [
      ,
      dia,
      mes,
      ano,
      hora = "0",
      minuto = "0",
      segundo = "0",
    ] = brasileira;

    const data = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto),
      Number(segundo),
      0
    );

    return Number.isNaN(data.getTime())
      ? null
      : data;
  }

  /*
   * Formatos ISO:
   * 2026-07-11T03:00:00.000Z
   * 2026-07-11
   */
  const dataIso = new Date(texto);

  return Number.isNaN(dataIso.getTime())
    ? null
    : dataIso;
}

function obterDataFallbackLive(live) {
  if (!live) {
    return null;
  }

  const possibilidades = [
    live?.hora_fim,
    live?.data_live,
    live?.hora_inicio,
    live?.criado_em,
    live?.created_at,
  ];

  for (const valor of possibilidades) {
    const data = converterData(valor);

    if (data) {
      return data;
    }
  }

  return null;
}

async function buscarLivesEncerradas(
  supabase
) {
  const fonte =
    QueryRegistry.fontes.lives;

  return buscarPaginado(
    () =>
      supabase
        .from(fonte.tabela)
        .select("*")
        .eq(
          fonte.campos.status,
          QueryRegistry.filtros.statusLive.encerrada
        ),
    "Erro ao buscar lives encerradas"
  );
}

async function buscarDatasVendasDasLives(
  supabase,
  idsLives = []
) {
  const fonte =
    QueryRegistry.fontes.vendasLive;

  const idsUnicos = [
    ...new Set(
      idsLives
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  if (idsUnicos.length === 0) {
    return [];
  }

  const blocos = dividirEmBlocos(
    idsUnicos,
    TAMANHO_BLOCO_LIVES
  );

  const vendas = [];

  for (const bloco of blocos) {
    const registrosBloco =
      await buscarPaginado(
        () =>
          supabase
            .from(fonte.tabela)
            .select(
              `${fonte.campos.liveId}, ${fonte.campos.dataHora}`
            )
            .in(
              fonte.campos.liveId,
              bloco
            ),
        "Erro ao buscar datas das vendas das lives"
      );

    vendas.push(...registrosBloco);
  }

  return vendas;
}

function criarMapaUltimaVendaPorLive(
  vendas = []
) {
  const mapa = new Map();

  for (const venda of vendas) {
    const liveId = String(
      venda?.live_id || ""
    );

    const dataVenda = converterData(
      venda?.data_hora
    );

    if (!liveId || !dataVenda) {
      continue;
    }

    const timestamp =
      dataVenda.getTime();

    const timestampAtual =
      mapa.get(liveId) || 0;

    if (timestamp > timestampAtual) {
      mapa.set(
        liveId,
        timestamp
      );
    }
  }

  return mapa;
}

function ordenarLivesPorRecencia(
  lives = [],
  ultimaVendaPorLive = new Map()
) {
  return [...lives].sort(
    (liveA, liveB) => {
      const idA = String(
        liveA?.id || ""
      );

      const idB = String(
        liveB?.id || ""
      );

      const ultimaVendaA =
        ultimaVendaPorLive.get(idA) || 0;

      const ultimaVendaB =
        ultimaVendaPorLive.get(idB) || 0;

      /*
       * Prioridade 1:
       * venda mais recente registrada em cada live.
       */
      if (
        ultimaVendaA !==
        ultimaVendaB
      ) {
        return (
          ultimaVendaB -
          ultimaVendaA
        );
      }

      /*
       * Prioridade 2:
       * data da própria live.
       */
      const dataFallbackA =
        obterDataFallbackLive(liveA);

      const dataFallbackB =
        obterDataFallbackLive(liveB);

      const tempoFallbackA =
        dataFallbackA
          ? dataFallbackA.getTime()
          : 0;

      const tempoFallbackB =
        dataFallbackB
          ? dataFallbackB.getTime()
          : 0;

      return (
        tempoFallbackB -
        tempoFallbackA
      );
    }
  );
}

async function buscarLivesOrdenadas(
  supabase
) {
  const livesEncerradas =
    await buscarLivesEncerradas(
      supabase
    );

  if (
    livesEncerradas.length === 0
  ) {
    return [];
  }

  const idsLives =
    livesEncerradas
      .map((live) => live?.id)
      .filter(Boolean);

  const vendasDasLives =
    await buscarDatasVendasDasLives(
      supabase,
      idsLives
    );

  const ultimaVendaPorLive =
    criarMapaUltimaVendaPorLive(
      vendasDasLives
    );

  return ordenarLivesPorRecencia(
    livesEncerradas,
    ultimaVendaPorLive
  );
}

async function buscarUltimaLive(
  supabase
) {
  const livesOrdenadas =
    await buscarLivesOrdenadas(
      supabase
    );

  return (
    livesOrdenadas[0] ||
    null
  );
}

async function buscarUltimasLives(
  supabase,
  limite
) {
  const minimo =
    Number(
      QueryRegistry?.limites
        ?.comparacaoLivesMinimo
    ) || 2;

  const maximo =
    Number(
      QueryRegistry?.limites
        ?.comparacaoLivesMaximo
    ) || 50;

  const padrao =
    Number(
      QueryRegistry?.limites
        ?.comparacaoLivesPadrao
    ) || 5;

  const numero = Number(limite);

  const limiteSeguro =
    Number.isInteger(numero) &&
      numero > 0
      ? Math.min(
        Math.max(numero, minimo),
        maximo
      )
      : padrao;

  const livesOrdenadas =
    await buscarLivesOrdenadas(
      supabase
    );

  return livesOrdenadas.slice(
    0,
    limiteSeguro
  );
}

async function buscarVendasDaLive(
  supabase,
  liveId
) {
  if (!liveId) {
    return [];
  }

  const fonte =
    QueryRegistry.fontes.vendasLive;

  return buscarPaginado(
    () =>
      supabase
        .from(fonte.tabela)
        .select("*")
        .eq(
          fonte.campos.liveId,
          liveId
        )
        .order(
          fonte.campos.dataHora,
          {
            ascending: true,
          }
        ),
    "Erro ao buscar vendas da live"
  );
}

async function buscarVendasDasLives(
  supabase,
  idsLives = []
) {
  const fonte =
    QueryRegistry.fontes.vendasLive;

  const idsUnicos = [
    ...new Set(
      idsLives
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  if (
    idsUnicos.length === 0
  ) {
    return [];
  }

  const blocos = dividirEmBlocos(
    idsUnicos,
    TAMANHO_BLOCO_LIVES
  );

  const vendas = [];

  for (const bloco of blocos) {
    const vendasBloco =
      await buscarPaginado(
        () =>
          supabase
            .from(fonte.tabela)
            .select("*")
            .in(
              fonte.campos.liveId,
              bloco
            )
            .order(
              fonte.campos.dataHora,
              {
                ascending: true,
              }
            ),
        "Erro ao buscar vendas das lives"
      );

    vendas.push(
      ...vendasBloco
    );
  }

  return vendas;
}

async function buscarVendasPorPeriodo(
  supabase,
  periodo
) {
  const fonte =
    QueryRegistry.fontes.vendasLive;

  if (
    !periodo?.dataInicialIso ||
    !periodo?.dataFinalIso
  ) {
    throw new Error(
      "O período não possui data inicial e data final válidas."
    );
  }

  return buscarPaginado(
    () =>
      supabase
        .from(fonte.tabela)
        .select("*")
        .gte(
          fonte.campos.dataHora,
          periodo.dataInicialIso
        )
        .lte(
          fonte.campos.dataHora,
          periodo.dataFinalIso
        )
        .order(
          fonte.campos.dataHora,
          {
            ascending: true,
          }
        ),
    "Erro ao buscar vendas por período"
  );
}

async function buscarPecasPorIds(
  supabase,
  ids = []
) {
  const fonte =
    QueryRegistry.fontes.pecas;

  const idsUnicos = [
    ...new Set(
      (ids || [])
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  if (
    idsUnicos.length === 0
  ) {
    return [];
  }

  const blocos = dividirEmBlocos(
    idsUnicos,
    TAMANHO_BLOCO_IDS
  );

  const pecas = [];

  for (const bloco of blocos) {
    const { data, error } =
      await supabase
        .from(fonte.tabela)
        .select("*")
        .in(
          fonte.campos.id,
          bloco
        );

    if (error) {
      throw new Error(
        `Erro ao buscar peças relacionadas às vendas: ${error.message}`
      );
    }

    pecas.push(
      ...(data || [])
    );
  }

  return pecas;
}


function normalizarFiltroTexto(
  valor
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  return String(valor).trim();
}


function criarConsultaPecasEstoque(
  supabase,
  filtros = {}
) {
  const fonte =
    QueryRegistry.fontes.pecas;

  let consulta = supabase
    .from(fonte.tabela)
    .select("*")
    .eq(
      fonte.campos.vendido,
      false
    );

  const aplicarFiltroTexto = (
    campo,
    singular,
    plural
  ) => {
    if (!campo) {
      return;
    }

    const valores = [
      ...(Array.isArray(plural)
        ? plural
        : plural
          ? [plural]
          : []),
      ...(singular ? [singular] : []),
    ]
      .map(normalizarFiltroTexto)
      .filter(Boolean);

    if (valores.length === 0) {
      return;
    }

    const unicos = [...new Set(valores)];

    if (unicos.length === 1) {
      consulta = consulta.eq(
        campo,
        unicos[0]
      );
    } else {
      consulta = consulta.in(
        campo,
        unicos
      );
    }
  };

  aplicarFiltroTexto(
    fonte?.campos?.marca,
    filtros?.marca,
    filtros?.marcas
  );

  aplicarFiltroTexto(
    fonte?.campos?.categoria,
    filtros?.categoria,
    filtros?.categorias
  );

  aplicarFiltroTexto(
    fonte?.campos?.cor,
    filtros?.cor,
    filtros?.cores
  );

  aplicarFiltroTexto(
    fonte?.campos?.tamanho,
    filtros?.tamanho,
    filtros?.tamanhos
  );

  aplicarFiltroTexto(
    fonte?.campos?.material,
    filtros?.material,
    filtros?.materiais
  );

  aplicarFiltroTexto(
    fonte?.campos?.genero,
    filtros?.genero,
    filtros?.generos
  );

  const nome = normalizarFiltroTexto(
    filtros?.nome
  );

  if (
    nome &&
    fonte?.campos?.nome
  ) {
    consulta = consulta.ilike(
      fonte.campos.nome,
      `%${nome}%`
    );
  }

  const status =
    normalizarFiltroTexto(
      filtros?.statusEstoque ||
      filtros?.status_estoque ||
      filtros?.status
    );

  if (
    status &&
    fonte?.campos?.status
  ) {
    consulta = consulta.eq(
      fonte.campos.status,
      status
    );
  }

  return consulta;
}

async function buscarPecasEstoque(
  supabase,
  filtros = {}
) {
  return buscarPaginado(
    () =>
      criarConsultaPecasEstoque(
        supabase,
        filtros
      ),
    "Erro ao buscar peças do estoque"
  );
}

function validarDefinicao(
  definicao
) {
  if (!definicao) {
    throw new Error(
      "Definição de consulta não informada."
    );
  }

  if (!definicao.valido) {
    throw new Error(
      `Definição de consulta inválida: ${definicao.motivo ||
      "motivo não informado"
      }`
    );
  }

  if (
    !Array.isArray(
      definicao.consultas
    ) ||
    definicao.consultas
      .length === 0
  ) {
    throw new Error(
      "A definição não possui consultas para executar."
    );
  }
}

class QueryExecutor {
  async executar(
    definicao,
    supabase
  ) {
    validarDefinicao(
      definicao
    );

    if (!supabase) {
      throw new Error(
        "Cliente Supabase não informado."
      );
    }

    const contexto = {
      live: null,
      lives: [],
      vendas: [],
      pecas: [],
    };

    for (
      const consulta of
      definicao.consultas
    ) {
      if (!consulta?.tipo) {
        throw new Error(
          "Foi encontrada uma consulta sem tipo definido."
        );
      }

      switch (
      consulta.tipo
      ) {
        case "buscar_ultima_live": {
          contexto.live =
            await buscarUltimaLive(
              supabase
            );

          break;
        }

        case "buscar_ultimas_lives": {
          contexto.lives =
            await buscarUltimasLives(
              supabase,
              consulta?.limite ||
              definicao?.parametros
                ?.limite
            );

          break;
        }

        case "buscar_vendas_da_live": {
          contexto.vendas =
            await buscarVendasDaLive(
              supabase,
              contexto.live?.id
            );

          break;
        }

        case "buscar_vendas_das_lives": {
          const idsLives =
            contexto.lives
              .map(
                (live) =>
                  live?.id
              )
              .filter(Boolean);

          contexto.vendas =
            await buscarVendasDasLives(
              supabase,
              idsLives
            );

          break;
        }

        case "buscar_vendas_por_periodo": {
          contexto.vendas =
            await buscarVendasPorPeriodo(
              supabase,
              consulta.periodo ||
              definicao.periodo
            );

          break;
        }

        case "buscar_pecas_por_ids_das_vendas": {
          const idsPecas =
            contexto.vendas
              .map(
                (venda) =>
                  venda?.peca_id
              )
              .filter(Boolean);

          contexto.pecas =
            await buscarPecasPorIds(
              supabase,
              idsPecas
            );

          break;
        }

        case "buscar_pecas_estoque": {
          const filtrosEstoque = {
            ...(
              definicao?.filtros ||
              {}
            ),
            ...(
              consulta?.filtros ||
              {}
            ),
          };

          contexto.pecas =
            await buscarPecasEstoque(
              supabase,
              filtrosEstoque
            );

          break;
        }

        default:
          throw new Error(
            `Consulta não suportada: ${consulta.tipo}`
          );
      }
    }

    return {
      definicao,
      live:
        contexto.live,
      lives:
        contexto.lives,
      vendas:
        contexto.vendas,
      pecas:
        contexto.pecas,
    };
  }
}

const queryExecutor =
  new QueryExecutor();

export default queryExecutor;
