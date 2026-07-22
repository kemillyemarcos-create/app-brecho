/**
 * ConversationContextManager.jsx
 *
 * Orquestra:
 * - memória da conversa;
 * - resolução de intenções de continuidade;
 * - criação de planos contextuais;
 * - fallback para o PlannerEngine.
 *
 * Este arquivo NÃO:
 * - acessa o Supabase;
 * - executa QueryBuilder ou QueryExecutor;
 * - processa resultados;
 * - formata respostas.
 */

import {
  criarContextoInicial,
  atualizarContexto,
  alterarFiltroContexto,
  removerFiltrosContexto,
  contextoEstaValido,
  contextoTemInformacao,
  adicionarEventoContexto,
} from "./ConversationContext.jsx";

import conversationMemory, {
  recuperarContexto,
  salvarContexto,
  atualizarMemoria,
  resetarContexto,
  removerContexto,
  DEFAULT_CONVERSATION_ID,
} from "./ConversationMemory.jsx";

import {
  resolveConversationIntent,
} from "./ConversationIntentResolver.jsx";

export const CONVERSATION_MANAGER_ACTIONS = Object.freeze({
  NONE: "none",
  PLANNER: "planner",
  EXECUTE_LAST_SUGGESTION: "execute_last_suggestion",
  REPLACE_FILTER: "replace_filter",
  REMOVE_FILTER: "remove_filter",
  RESET_CONTEXT: "reset_context",
  CONTEXT_PLAN: "context_plan",
});

const OPERACOES_ESTOQUE = new Set([
  "quantidade_estoque",
  "quantidade_estoque_por_marca",
  "quantidade_estoque_por_categoria",
  "listar_pecas",
  "listar_pecas_estoque",
  "listar_marcas",
  "listar_marcas_estoque",
  "listar_categorias",
  "listar_categorias_estoque",
]);

function normalizarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).trim();
}

function normalizarIdentificacao({
  conversaId = DEFAULT_CONVERSATION_ID,
  usuarioId = null,
  metadados = {},
} = {}) {
  return {
    conversaId:
      normalizarTexto(conversaId) ||
      DEFAULT_CONVERSATION_ID,

    usuarioId:
      normalizarTexto(usuarioId) ||
      null,

    metadados:
      metadados && typeof metadados === "object"
        ? { ...metadados }
        : {},
  };
}

function copiarObjeto(valor, fallback = {}) {
  if (!valor || typeof valor !== "object") {
    return { ...fallback };
  }

  return { ...valor };
}

function obterDominioPorOperacao(operacao) {
  if (OPERACOES_ESTOQUE.has(operacao)) {
    return "estoque";
  }

  return null;
}

function obterPeriodoPorDominio(dominio) {
  if (dominio === "estoque") {
    return "estoque_atual";
  }

  return null;
}

function obterOperacaoContextual(contexto = {}) {
  const sugestao = contexto?.ultimaSugestao;

  return (
    sugestao?.operacao ||
    contexto?.operacao ||
    null
  );
}

function obterFiltrosDaSugestao(
  sugestao = null,
  contexto = {}
) {
  return {
    ...(contexto?.filtros || {}),
    ...(sugestao?.filtros || {}),
  };
}

function criarPlanoId({
  dominio,
  operacao,
  filtros = {},
}) {
  const partes = [
    dominio || "geral",
    operacao || "operacao",
    "contexto",
  ];

  Object.entries(filtros)
    .filter(([, valor]) => {
      if (Array.isArray(valor)) {
        return valor.length > 0;
      }

      return (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
      );
    })
    .forEach(([chave, valor]) => {
      const texto = Array.isArray(valor)
        ? valor.join("_")
        : String(valor);

      partes.push(
        `${chave}_${texto}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\w]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .toLowerCase()
      );
    });

  return partes.filter(Boolean).join("_");
}

function criarEntidadesContextuais({
  pergunta,
  dominio,
  operacao,
  periodo,
  filtros,
  parametros = {},
  contexto,
}) {
  return {
    encontrado: true,
    dominio,
    operacao,

    periodo: periodo
      ? {
        tipo: periodo,
        termo:
          periodo === "estoque_atual"
            ? "estoque atual"
            : periodo,
      }
      : null,

    filtros: copiarObjeto(filtros),
    parametros: copiarObjeto(parametros),

    perguntaOriginal: pergunta,

    confianca: {
      dominio: 1,
      operacao: 1,
      periodo: periodo ? 1 : 0,
      contexto: 1,
    },

    origem: "conversation_context",

    contexto: {
      id: contexto?.id || null,
      conversaId:
        contexto?.conversaId ||
        DEFAULT_CONVERSATION_ID,
    },
  };
}

/**
 * Cria um plano compatível com PlannerEngine e PlanExecutor.
 */
export function criarPlanoContextual({
  pergunta = "",
  contexto = {},
  operacao = null,
  filtros = null,
  parametros = {},
  origem = "conversation_context",
} = {}) {
  const operacaoResolvida =
    operacao ||
    obterOperacaoContextual(contexto);

  if (!operacaoResolvida) {
    return null;
  }

  const dominio =
    contexto?.dominio ||
    obterDominioPorOperacao(
      operacaoResolvida
    );

  if (!dominio) {
    return null;
  }

  const periodo =
    contexto?.ultimoPlano?.periodo ||
    obterPeriodoPorDominio(dominio);

  if (!periodo) {
    return null;
  }

  const filtrosResolvidos =
    filtros === null
      ? copiarObjeto(contexto?.filtros)
      : copiarObjeto(filtros);

  const entidades =
    criarEntidadesContextuais({
      pergunta,
      dominio,
      operacao: operacaoResolvida,
      periodo,
      filtros: filtrosResolvidos,
      parametros,
      contexto,
    });

  return {
    encontrado: true,

    planoId: criarPlanoId({
      dominio,
      operacao: operacaoResolvida,
      filtros: filtrosResolvidos,
    }),

    dominio,
    operacao: operacaoResolvida,
    periodo,
    filtros: filtrosResolvidos,

    parametros: {
      ...parametros,

      ...(dominio === "estoque"
        ? {
          estoqueAtual: true,
        }
        : {}),
    },

    etapas: [],

    pontuacao: 200,

    origem,

    entidades,
  };
}

function criarRetornoBase({
  pergunta,
  identificacao,
  contexto,
  intent,
}) {
  return {
    resolvido: false,
    usarPlanner: true,
    origem: "planner",
    acao:
      intent?.action ||
      CONVERSATION_MANAGER_ACTIONS.PLANNER,

    pergunta,
    conversaId: identificacao.conversaId,
    usuarioId: identificacao.usuarioId,

    contexto,
    intent,

    plano: null,
    motivo: null,
  };
}

function contextoPodeResolver(contexto) {
  return Boolean(
    contexto &&
    contextoTemInformacao(contexto) &&
    contextoEstaValido(contexto)
  );
}

function resolverConfirmacao({
  pergunta,
  identificacao,
  contexto,
  intent,
}) {
  if (!contextoPodeResolver(contexto)) {
    return {
      ...criarRetornoBase({
        pergunta,
        identificacao,
        contexto,
        intent,
      }),

      motivo: "contexto_ausente_ou_invalido",
    };
  }

  const sugestao =
    intent?.suggestion ||
    contexto?.ultimaSugestao ||
    null;

  if (!sugestao) {
    return {
      ...criarRetornoBase({
        pergunta,
        identificacao,
        contexto,
        intent,
      }),

      motivo: "ultima_sugestao_ausente",
    };
  }

  const operacao =
    sugestao?.operacao ||
    sugestao?.tipo ||
    contexto?.operacao ||
    null;

  const filtros =
    obterFiltrosDaSugestao(
      sugestao,
      contexto
    );

  const plano = criarPlanoContextual({
    pergunta,
    contexto,
    operacao,
    filtros,
    parametros:
      sugestao?.metadados?.parametros ||
      {},
    origem:
      "conversation_confirmation",
  });

  if (!plano) {
    return {
      ...criarRetornoBase({
        pergunta,
        identificacao,
        contexto,
        intent,
      }),

      motivo:
        "nao_foi_possivel_criar_plano_da_sugestao",
    };
  }

  const contextoAtualizado =
    adicionarEventoContexto(
      atualizarContexto(contexto, {
        operacao: plano.operacao,
        filtros: plano.filtros,
        ultimaPergunta: pergunta,
        ultimoPlano: plano,
      }),
      {
        tipo: "confirmacao",
        mensagem: pergunta,
        dominio: plano.dominio,
        operacao: plano.operacao,
        metadados: {
          sugestaoExecutada:
            sugestao?.tipo || null,
        },
      }
    );

  salvarContexto(contextoAtualizado);

  return {
    resolvido: true,
    usarPlanner: false,
    origem: "contexto",
    acao:
      CONVERSATION_MANAGER_ACTIONS
        .EXECUTE_LAST_SUGGESTION,

    pergunta,
    conversaId: identificacao.conversaId,
    usuarioId: identificacao.usuarioId,

    contexto: contextoAtualizado,
    intent,
    plano,
    motivo: null,
  };
}

function resolverSubstituicaoFiltro({
  pergunta,
  identificacao,
  contexto,
  intent,
}) {
  if (!contextoPodeResolver(contexto)) {
    return {
      ...criarRetornoBase({
        pergunta,
        identificacao,
        contexto,
        intent,
      }),

      motivo: "contexto_ausente_ou_invalido",
    };
  }

  const campo =
    normalizarTexto(intent?.field);

  const valor = intent?.value;

  if (!campo || valor === undefined) {
    return {
      ...criarRetornoBase({
        pergunta,
        identificacao,
        contexto,
        intent,
      }),

      motivo: "alteracao_de_filtro_invalida",
    };
  }

  const contextoComFiltro =
    alterarFiltroContexto(
      contexto,
      campo,
      valor
    );

  const operacao =
    contexto?.operacao ||
    "quantidade_estoque";

  const plano = criarPlanoContextual({
    pergunta,
    contexto: contextoComFiltro,
    operacao,
    filtros:
      contextoComFiltro.filtros,
    origem:
      "conversation_filter_replacement",
  });

  if (!plano) {
    return {
      ...criarRetornoBase({
        pergunta,
        identificacao,
        contexto,
        intent,
      }),

      motivo:
        "nao_foi_possivel_criar_plano_com_filtro",
    };
  }

  const contextoAtualizado =
    adicionarEventoContexto(
      atualizarContexto(
        contextoComFiltro,
        {
          operacao: plano.operacao,
          ultimaPergunta: pergunta,
          ultimoPlano: plano,
        }
      ),
      {
        tipo: "filtro_alterado",
        mensagem: pergunta,
        dominio: plano.dominio,
        operacao: plano.operacao,
        metadados: {
          campo,
          valor,
        },
      }
    );

  salvarContexto(contextoAtualizado);

  return {
    resolvido: true,
    usarPlanner: false,
    origem: "contexto",
    acao:
      CONVERSATION_MANAGER_ACTIONS
        .REPLACE_FILTER,

    pergunta,
    conversaId: identificacao.conversaId,
    usuarioId: identificacao.usuarioId,

    contexto: contextoAtualizado,
    intent,
    plano,

    filtrosAlterados: [campo],
    filtrosRemovidos: [],

    motivo: null,
  };
}

/**
 * Processa uma mensagem antes de enviá-la ao Planner.
 *
 * Retorno:
 *
 * {
 *   resolvido: boolean,
 *   usarPlanner: boolean,
 *   plano: object | null,
 *   contexto: object,
 *   intent: object
 * }
 */
export function processarMensagemConversacional({
  mensagem = "",
  pergunta = "",
  conversaId = DEFAULT_CONVERSATION_ID,
  usuarioId = null,
  metadados = {},
} = {}) {
  const texto =
    normalizarTexto(mensagem) ||
    normalizarTexto(pergunta);

  const identificacao =
    normalizarIdentificacao({
      conversaId,
      usuarioId,
      metadados,
    });

  let contexto = recuperarContexto(
    identificacao,
    {
      criarSeNaoExistir: true,
    }
  );

  if (!contexto) {
    contexto =
      criarContextoInicial(identificacao);

    salvarContexto(contexto);
  }

  if (!texto) {
    return {
      ...criarRetornoBase({
        pergunta: texto,
        identificacao,
        contexto,
        intent: {
          action:
            CONVERSATION_MANAGER_ACTIONS.NONE,
        },
      }),

      usarPlanner: false,
      motivo: "mensagem_vazia",
    };
  }

  const intent =
    resolveConversationIntent(
      texto,
      contexto
    );

  switch (intent?.action) {
    case CONVERSATION_MANAGER_ACTIONS
      .EXECUTE_LAST_SUGGESTION:
      return resolverConfirmacao({
        pergunta: texto,
        identificacao,
        contexto,
        intent,
      });

    case CONVERSATION_MANAGER_ACTIONS
      .REPLACE_FILTER:
      return resolverSubstituicaoFiltro({
        pergunta: texto,
        identificacao,
        contexto,
        intent,
      });

    case CONVERSATION_MANAGER_ACTIONS
      .RESET_CONTEXT: {
        const contextoLimpo =
          resetarContexto(
            identificacao
          );

        return {
          resolvido: true,
          usarPlanner: false,
          origem: "contexto",
          acao:
            CONVERSATION_MANAGER_ACTIONS
              .RESET_CONTEXT,

          pergunta: texto,
          conversaId:
            identificacao.conversaId,
          usuarioId:
            identificacao.usuarioId,

          contexto: contextoLimpo,
          intent,
          plano: null,

          resposta:
            "O contexto da conversa foi limpo.",

          motivo: null,
        };
      }

    case CONVERSATION_MANAGER_ACTIONS
      .CONTEXT_PLAN: {

        if (!contextoPodeResolver(contexto)) {
          return criarRetornoBase({
            pergunta: texto,
            identificacao,
            contexto,
            intent,
          });
        }

        const filtrosContextuais =
          Object.keys(contexto?.filtros || {}).length > 0
            ? contexto.filtros
            : contexto?.ultimoPlano?.filtros || {};

        const plano =
          criarPlanoContextual({
            pergunta: texto,
            contexto,

            operacao:
              intent?.operation ||
              contexto?.operacao ||
              "listar_pecas",

            filtros: filtrosContextuais,

            origem:
              "conversation_context_plan",
          });

        console.log("=== FILTROS CONTEXTO ===");
        console.log(contexto?.filtros);

        console.log("=== ÚLTIMO PLANO ===");
        console.log(contexto?.ultimoPlano);

        console.log("=== FILTROS ÚLTIMO PLANO ===");
        console.log(contexto?.ultimoPlano?.filtros);

        console.log("=== PLANO CONTEXTUAL ===");
        console.log(plano);

        console.log("=== FILTROS PLANO CONTEXTUAL ===");
        console.log(plano?.filtros);

        if (!plano) {
          return criarRetornoBase({
            pergunta: texto,
            identificacao,
            contexto,
            intent,
          });
        }


        const contextoAtualizado =
          adicionarEventoContexto(
            atualizarContexto(
              contexto,
              {
                operacao:
                  plano.operacao,

                filtros:
                  plano.filtros,

                ultimaPergunta:
                  texto,

                ultimoPlano:
                  plano,
              }
            ),
            {
              tipo: "context_plan",
              mensagem: texto,
              dominio:
                plano.dominio,
              operacao:
                plano.operacao,
            }
          );

        salvarContexto(
          contextoAtualizado
        );

        return {
          resolvido: true,
          usarPlanner: false,
          origem: "contexto",

          acao:
            CONVERSATION_MANAGER_ACTIONS
              .CONTEXT_PLAN,

          pergunta: texto,
          conversaId:
            identificacao.conversaId,

          usuarioId:
            identificacao.usuarioId,

          contexto:
            contextoAtualizado,

          intent,
          plano,

          motivo: null,
        };
      }

    case CONVERSATION_MANAGER_ACTIONS
      .PLANNER:

    default: {

      const contextoAtualizado =
        adicionarEventoContexto(
          atualizarContexto(
            contexto,
            {
              ultimaPergunta:
                texto,
            }
          ),
          {
            tipo:
              "encaminhado_ao_planner",
            mensagem:
              texto,
          }
        );

      salvarContexto(
        contextoAtualizado
      );

      return {
        ...criarRetornoBase({
          pergunta: texto,
          identificacao,
          contexto:
            contextoAtualizado,
          intent,
        }),

        motivo:
          "mensagem_requer_planner",
      };
    }
  }
}

/**
 * Salva no contexto os dados gerados após o Planner.
 *
 * Esta função será chamada pela integração posterior,
 * depois que o plano e a resposta forem produzidos.
 */
export function registrarResultadoConversacional({
  conversaId = DEFAULT_CONVERSATION_ID,
  usuarioId = null,
  pergunta = "",
  plano = null,
  resultado = null,
  resposta = "",
  sugestao = undefined,
  metadados = {},
} = {}) {
  const identificacao =
    normalizarIdentificacao({
      conversaId,
      usuarioId,
      metadados,
    });

  const contextoAtual =
    recuperarContexto(
      identificacao,
      {
        criarSeNaoExistir: true,
      }
    ) ||
    criarContextoInicial(
      identificacao
    );

  const dominio =
    resultado?.dominio ||
    resultado?.dados?.dominio ||
    plano?.dominio ||
    contextoAtual?.dominio ||
    null;

  const operacao =
    resultado?.operacao ||
    resultado?.dados?.operacao ||
    plano?.operacao ||
    contextoAtual?.operacao ||
    null;

  const possuiFiltrosNoPlano =
    plano?.filtros &&
    typeof plano.filtros === "object";

  const filtrosBase =
    possuiFiltrosNoPlano
      ? plano.filtros
      : contextoAtual?.filtros || {};

  const filtros = {
    ...filtrosBase,
    ...(resultado?.filtros || {}),
    ...(resultado?.dados?.filtros || {}),
  };

  const alteracoes = {
    dominio,
    operacao,
    filtros,

    ultimaPergunta:
      normalizarTexto(pergunta) ||
      contextoAtual?.ultimaPergunta,

    ultimaResposta:
      normalizarTexto(resposta) ||
      resultado?.resposta ||
      contextoAtual?.ultimaResposta,

    ultimoPlano:
      plano && typeof plano === "object"
        ? plano
        : contextoAtual?.ultimoPlano,

    ultimoResultado:
      resultado &&
        typeof resultado === "object"
        ? resultado
        : contextoAtual?.ultimoResultado,

    metadados,
  };

  if (sugestao !== undefined) {
    alteracoes.ultimaSugestao =
      sugestao;
  }

  let contextoAtualizado =
    atualizarContexto(
      contextoAtual,
      alteracoes
    );

  contextoAtualizado =
    adicionarEventoContexto(
      contextoAtualizado,
      {
        tipo: "resultado_registrado",
        mensagem:
          alteracoes.ultimaResposta,
        dominio,
        operacao,
        metadados: {
          ok:
            resultado?.ok !== false,
        },
      }
    );

  return salvarContexto(
    contextoAtualizado
  );
}

/**
 * Registra apenas uma sugestão de continuidade.
 */
export function registrarSugestaoConversacional({
  conversaId = DEFAULT_CONVERSATION_ID,
  usuarioId = null,
  sugestao = null,
} = {}) {
  return atualizarMemoria(
    {
      conversaId,
      usuarioId,
    },
    {
      ultimaSugestao: sugestao,
    }
  );
}

/**
 * Retorna o contexto atual sem modificá-lo.
 */
export function obterContextoConversacional({
  conversaId = DEFAULT_CONVERSATION_ID,
  usuarioId = null,
  criarSeNaoExistir = false,
} = {}) {
  return recuperarContexto(
    {
      conversaId,
      usuarioId,
    },
    {
      criarSeNaoExistir,
    }
  );
}

/**
 * Limpa o contexto mantendo a sessão.
 */
export function limparContextoConversacional({
  conversaId = DEFAULT_CONVERSATION_ID,
  usuarioId = null,
} = {}) {
  return resetarContexto({
    conversaId,
    usuarioId,
  });
}

/**
 * Exclui totalmente o contexto.
 */
export function excluirContextoConversacional({
  conversaId = DEFAULT_CONVERSATION_ID,
  usuarioId = null,
} = {}) {
  return removerContexto({
    conversaId,
    usuarioId,
  });
}

export class ConversationContextManager {
  constructor(opcoes = {}) {
    this.memory =
      opcoes.memory ||
      conversationMemory;
  }

  processar(dados = {}) {
    return processarMensagemConversacional(
      dados
    );
  }

  registrarResultado(dados = {}) {
    return registrarResultadoConversacional(
      dados
    );
  }

  registrarSugestao(dados = {}) {
    return registrarSugestaoConversacional(
      dados
    );
  }

  obterContexto(dados = {}) {
    return obterContextoConversacional(
      dados
    );
  }

  limpar(dados = {}) {
    return limparContextoConversacional(
      dados
    );
  }

  excluir(dados = {}) {
    return excluirContextoConversacional(
      dados
    );
  }

  criarPlano(dados = {}) {
    return criarPlanoContextual(dados);
  }
}

export const conversationContextManager =
  new ConversationContextManager();

export default conversationContextManager;
