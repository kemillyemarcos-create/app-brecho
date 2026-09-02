// PlanExecutor.jsx

import queryBuilder from "../query/QueryBuilder";
import queryExecutor from "../query/QueryExecutor";
import resultProcessor from "../results/ResultProcessor";
import responseRouter from "../responses/ResponseRouter";
import { normalizarTexto } from "../utils/TextUtils";
import plannerEngine from "../planner/PlannerEngine";
import conversationContextManager from "../conversation/ConversationContextManager";

function formatarBRL(
  valor,
  formatacao = {}
) {
  const locale =
    formatacao?.locale ||
    "pt-BR";

  const moeda =
    formatacao?.moeda ||
    "BRL";

  return Number(
    valor || 0
  ).toLocaleString(
    locale,
    {
      style: "currency",
      currency: moeda,
    }
  );
}

function formatarPercentual(valor) {
  if (
    valor === null ||
    valor === undefined ||
    !Number.isFinite(Number(valor))
  ) {
    return "-";
  }

  return `${Number(valor)
    .toFixed(1)
    .replace(".", ",")}%`;
}

function obterNomeLive(live) {
  return (
    live?.nome ||
    live?.titulo ||
    live?.descricao ||
    live?.nome_live ||
    (live?.id
      ? `Live ${live.id}`
      : "Live")
  );
}

function descricaoPeriodo(
  definicao = {},
  live = null
) {
  const descricoes = {
    ultima_live:
      "da última live",

    ultimas_lives:
      "das últimas lives",

    hoje:
      "de hoje",

    ontem:
      "de ontem",

    semana_atual:
      "desta semana",

    mes_atual:
      "deste mês",

    ano_atual:
      "deste ano",

    estoque_atual:
      "do estoque atual",
  };

  if (
    definicao?.periodo?.tipo ===
    "ultima_live" &&
    live
  ) {
    return `da última live (${obterNomeLive(
      live
    )})`;
  }

  return (
    descricoes[
    definicao?.periodo?.tipo
    ] ||
    "do período consultado"
  );
}

function formatarListaClientes(
  clientes = [],
  formatacao = {}
) {
  if (
    !Array.isArray(clientes) ||
    clientes.length === 0
  ) {
    return "Nenhum cliente encontrado.";
  }

  return clientes
    .map(
      (
        cliente,
        index
      ) => {
        const nome =
          cliente?.nome ||
          cliente?.cliente ||
          "Cliente não identificado";

        const quantidade =
          Number(
            cliente?.quantidade ??
            cliente?.pecas ??
            0
          );

        return `${index + 1}. ${nome} — ${quantidade} peça(s) — ${formatarBRL(
          cliente?.valor,
          formatacao
        )}`;
      }
    )
    .join("\n");
}

function formatarVariacao(valor) {
  if (
    valor === null ||
    valor === undefined ||
    !Number.isFinite(
      Number(valor)
    )
  ) {
    return "sem base anterior";
  }

  const numero =
    Number(valor);

  if (numero > 0) {
    return `alta de ${formatarPercentual(
      numero
    )}`;
  }

  if (numero < 0) {
    return `queda de ${formatarPercentual(
      Math.abs(numero)
    )}`;
  }

  return "estável";
}

function formatarTendencia(
  tendencia
) {
  const mapa = {
    crescimento:
      "crescimento",

    queda:
      "queda",

    estavel:
      "estabilidade",
  };

  return (
    mapa[tendencia] ||
    "estabilidade"
  );
}

function detectarObjetivoComparacao(
  definicao = {}
) {
  const objetivoConfigurado =
    definicao?.parametros
      ?.objetivoComparacao;

  if (
    [
      "melhor",
      "pior",
      "completo",
    ].includes(
      objetivoConfigurado
    )
  ) {
    return objetivoConfigurado;
  }

  const pergunta =
    normalizarTexto(
      definicao?.perguntaOriginal ||
      definicao?.entidades
        ?.perguntaOriginal ||
      ""
    );

  if (!pergunta) {
    return "completo";
  }

  const termosMelhor = [
    "qual foi a melhor",
    "qual a melhor",
    "melhor live",
    "melhor das lives",
    "melhor das ultimas",
    "maior faturamento",
    "faturou mais",
    "qual faturou mais",
    "teve maior faturamento",
  ];

  if (
    termosMelhor.some(
      (termo) =>
        pergunta.includes(
          normalizarTexto(
            termo
          )
        )
    )
  ) {
    return "melhor";
  }

  const termosPior = [
    "qual foi a pior",
    "qual a pior",
    "pior live",
    "pior das lives",
    "pior das ultimas",
    "menor faturamento",
    "faturou menos",
    "qual faturou menos",
    "teve menor faturamento",
  ];

  if (
    termosPior.some(
      (termo) =>
        pergunta.includes(
          normalizarTexto(
            termo
          )
        )
    )
  ) {
    return "pior";
  }

  return "completo";
}

function montarRespostaLiveDestaque({
  live,
  limite,
  tipo,
  formatacao = {},
}) {
  if (!live) {
    return `Não encontrei dados suficientes para identificar a ${tipo === "melhor"
        ? "melhor"
        : "pior"
      } live.`;
  }

  const titulo =
    tipo === "melhor"
      ? `🏆 Melhor das últimas ${limite} lives`
      : `📉 Pior das últimas ${limite} lives`;

  return `${titulo}

Live: ${live?.nome || "Live sem nome"}

Faturamento: ${formatarBRL(
    live?.faturamento,
    formatacao
  )}

Peças vendidas: ${Number(
    live?.quantidadeVendas ||
    0
  )}

Clientes: ${Number(
    live?.quantidadeClientes ||
    0
  )}

Ticket médio por peça: ${formatarBRL(
    live?.ticketMedioPorPeca,
    formatacao
  )}

Ticket médio por cliente: ${formatarBRL(
    live?.ticketMedioPorCliente,
    formatacao
  )}

Lucro estimado: ${formatarBRL(
    live?.lucro,
    formatacao
  )}

Margem estimada: ${formatarPercentual(
    live?.margem
  )}`;
}

function montarRespostaComparacaoCompleta(
  dados = {},
  definicao = {},
  formatacao = {}
) {
  const comparacoes =
    Array.isArray(
      dados?.comparacoes
    )
      ? dados.comparacoes
      : [];

  if (
    comparacoes.length === 0
  ) {
    return "Não encontrei lives encerradas suficientes para realizar a comparação.";
  }

  const linhas =
    comparacoes
      .map(
        (
          live,
          index
        ) => {
          const variacao =
            index === 0
              ? "base inicial"
              : formatarVariacao(
                live?.variacaoPercentual
              );

          return `${index + 1}. ${live?.nome ||
            "Live sem nome"
            } — ${formatarBRL(
              live?.faturamento,
              formatacao
            )} — ${Number(
              live?.quantidadeVendas ||
              0
            )} venda(s) — ${variacao}`;
        }
      )
      .join("\n");

  const maior =
    dados?.maiorFaturamento;

  const menor =
    dados?.menorFaturamento;

  const limite =
    Number(
      definicao?.parametros
        ?.limite ||
      dados?.quantidadeLives ||
      comparacoes.length
    );

  return `📈 Evolução das últimas ${limite} lives

${linhas}

💰 Faturamento total: ${formatarBRL(
    dados?.faturamentoTotal,
    formatacao
  )}

📊 Média por live: ${formatarBRL(
    dados?.faturamentoMedio,
    formatacao
  )}

🏆 Maior faturamento: ${maior?.nome ||
    "Não identificado"
    } — ${formatarBRL(
      maior?.faturamento,
      formatacao
    )}

📉 Menor faturamento: ${menor?.nome ||
    "Não identificado"
    } — ${formatarBRL(
      menor?.faturamento,
      formatacao
    )}

🔄 Variação total: ${formatarVariacao(
      dados?.variacaoTotalPercentual
    )}

📌 Tendência recente: ${formatarTendencia(
      dados?.tendencia
    )}`;
}

function montarRespostaComparacaoLives(
  dados = {},
  definicao = {},
  formatacao = {}
) {
  const limite =
    Number(
      definicao?.parametros
        ?.limite ||
      dados?.quantidadeLives ||
      5
    );

  const objetivo =
    detectarObjetivoComparacao(
      definicao
    );

  if (
    objetivo === "melhor"
  ) {
    return montarRespostaLiveDestaque({
      live:
        dados?.maiorFaturamento ||
        null,

      limite,

      tipo:
        "melhor",

      formatacao,
    });
  }

  if (
    objetivo === "pior"
  ) {
    return montarRespostaLiveDestaque({
      live:
        dados?.menorFaturamento ||
        null,

      limite,

      tipo:
        "pior",

      formatacao,
    });
  }

  return montarRespostaComparacaoCompleta(
    dados,
    definicao,
    formatacao
  );
}

function obterNomePeca(
  peca = {}
) {
  return (
    peca?.nome ||
    peca?.descricao ||
    peca?.titulo ||
    peca?.produto ||
    "Peça sem nome"
  );
}

function obterValorPeca(
  peca = {}
) {
  return (
    peca?.venda ??
    peca?.valor_venda ??
    peca?.valorVenda ??
    peca?.valor_venda_final ??
    peca?.valorVendaFinal ??
    0
  );
}

function montarDescricaoFiltroEstoque(
  dados = {}
) {
  if (
    dados?.marca
  ) {
    return ` da marca "${dados.marca}"`;
  }

  if (
    dados?.categoria
  ) {
    return ` da categoria "${dados.categoria}"`;
  }

  if (
    dados?.nome
  ) {
    return ` contendo "${dados.nome}" no nome`;
  }

  return "";
}

function montarRespostaQuantidadeEstoque(
  dados = {}
) {
  const quantidade =
    Number(
      dados?.quantidade ||
      0
    );

  const descricaoFiltro =
    montarDescricaoFiltroEstoque(
      dados
    );

  if (
    quantidade === 0
  ) {
    return `📦 Estoque atual

Não encontrei nenhuma peça${descricaoFiltro} disponível no estoque.`;
  }

  return `📦 Estoque atual

Foram encontradas ${quantidade} peça(s)${descricaoFiltro} disponíveis no estoque.`;
}

function montarRespostaListaPecasEstoque(
  dados = {},
  formatacao = {}
) {
  const pecas =
    Array.isArray(
      dados?.pecas
    )
      ? dados.pecas
      : [];

  if (
    pecas.length === 0
  ) {
    return "📦 Peças do estoque\n\nNão encontrei peças para esse filtro.";
  }

  const linhas =
    pecas
      .map(
        (
          peca,
          index
        ) =>
          `${index + 1}. ${obterNomePeca(
            peca
          )} — ${formatarBRL(
            obterValorPeca(
              peca
            ),
            formatacao
          )}`
      )
      .join("\n");

  return `📦 Peças encontradas

Total: ${pecas.length} peça(s)

${linhas}`;
}

function montarRespostaListaMarcasEstoque(
  dados = {}
) {
  const marcas =
    Array.isArray(
      dados?.marcas
    )
      ? dados.marcas
      : [];

  if (
    marcas.length === 0
  ) {
    return "🏷️ Marcas do estoque\n\nNão encontrei marcas identificadas nas peças disponíveis.";
  }

  const linhas =
    marcas
      .map(
        (
          marca,
          index
        ) =>
          `${index + 1}. ${marca?.nome ||
          marca?.marca ||
          "Marca não identificada"
          } — ${Number(
            marca?.quantidade ||
            0
          )} peça(s)`
      )
      .join("\n");

  return `🏷️ Marcas do estoque

Foram encontradas ${Number(
    dados?.quantidadeMarcas ||
    marcas.length
  )} marca(s).

${linhas}`;
}

function montarRespostaListaCategoriasEstoque(
  dados = {}
) {
  const categorias =
    Array.isArray(
      dados?.categorias
    )
      ? dados.categorias
      : [];

  if (
    categorias.length === 0
  ) {
    return "🧥 Categorias do estoque\n\nNão encontrei categorias identificadas nas peças disponíveis.";
  }

  const linhas =
    categorias
      .map(
        (
          categoria,
          index
        ) =>
          `${index + 1}. ${categoria?.nome ||
          categoria?.categoria ||
          "Categoria não identificada"
          } — ${Number(
            categoria?.quantidade ||
            0
          )} peça(s)`
      )
      .join("\n");

  return `🧥 Categorias do estoque

Foram encontradas ${Number(
    dados?.quantidadeCategorias ||
    categorias.length
  )} categoria(s).

${linhas}`;
}

function montarRespostaListaTamanhosEstoque(
  dados = {}
) {
  const tamanhos =
    Array.isArray(
      dados?.tamanhos
    )
      ? dados.tamanhos
      : [];

  if (
    tamanhos.length === 0
  ) {
    return "📏 Tamanhos do estoque\n\nNão encontrei tamanhos identificados nas peças disponíveis.";
  }

  const linhas =
    tamanhos
      .map(
        (
          tamanho,
          index
        ) =>
          `${index + 1}. ${tamanho?.nome ||
          tamanho?.tamanho ||
          tamanho?.valor ||
          tamanho?.descricao ||
          "Tamanho não identificado"
          } — ${Number(
            tamanho?.quantidade ||
            0
          )} peça(s)`
      )
      .join("\n");

  return `📏 Tamanhos do estoque

Foram encontrados ${Number(
    dados?.quantidadeTamanhos ||
    tamanhos.length
  )} tamanho(s).

${linhas}`;
}

function montarRespostaListaCoresEstoque(
  dados = {}
) {
  const cores =
    Array.isArray(
      dados?.cores
    )
      ? dados.cores
      : [];

  if (
    cores.length === 0
  ) {
    return "🎨 Cores do estoque\n\nNão encontrei cores identificadas nas peças disponíveis.";
  }

  const linhas =
    cores
      .map(
        (
          cor,
          index
        ) =>
          `${index + 1}. ${cor?.nome ||
          cor?.cor ||
          cor?.valor ||
          cor?.descricao ||
          "Cor não identificada"
          } — ${Number(
            cor?.quantidade ||
            0
          )} peça(s)`
      )
      .join("\n");

  return `🎨 Cores do estoque

Foram encontradas ${Number(
    dados?.quantidadeCores ||
    cores.length
  )} cor(es).

${linhas}`;
}

function montarResposta(
  resultado = {},
  definicao = {},
  formatacao = {}
) {
  if (
    !resultado?.ok
  ) {
    return (
      resultado?.resposta ||
      "Não foi possível processar o resultado dessa análise."
    );
  }

  const dados =
    resultado?.dados ||
    {};

  const periodo =
    descricaoPeriodo(
      definicao,
      dados?.live
    );

  switch (
  resultado?.tipo ||
  definicao?.operacao
  ) {
    case "listar_tamanhos":
    case "listar_tamanhos_estoque":
      return montarRespostaListaTamanhosEstoque(
        dados
      );

    case "listar_cores":
    case "listar_cores_estoque":
      return montarRespostaListaCoresEstoque(
        dados
      );

    case "maior_compra": {
      const cliente =
        dados?.cliente;

      if (
        !cliente
      ) {
        return `Não encontrei clientes com compras registradas ${periodo}.`;
      }

      return `👑 Cliente destaque ${periodo}

Cliente: ${cliente?.nome ||
        cliente?.cliente ||
        "Cliente não identificado"
        }

Peças compradas: ${Number(
          cliente?.quantidade ??
          cliente?.pecas ??
          0
        )}

Valor total: ${formatarBRL(
          cliente?.valor,
          formatacao
        )}`;
    }

    case "pendentes": {
      const clientes =
        Array.isArray(
          dados?.clientes
        )
          ? dados.clientes
          : [];

      if (
        clientes.length === 0
      ) {
        return `✅ Não existem clientes pendentes ${periodo}.`;
      }

      return `⏳ Clientes pendentes ${periodo}

${formatarListaClientes(
        clientes,
        formatacao
      )}

Total pendente: ${formatarBRL(
        dados?.totalPendente,
        formatacao
      )}`;
    }

    case "ticket_medio":
      return `📊 Ticket médio ${periodo}

Clientes: ${Number(
        dados?.quantidadeClientes ||
        0
      )}

Peças vendidas: ${Number(
        dados?.quantidadePecas ||
        0
      )}

Faturamento: ${formatarBRL(
        dados?.faturamento,
        formatacao
      )}

Por cliente: ${formatarBRL(
        dados?.ticketMedioPorCliente ??
        dados?.ticketCliente ??
        0,
        formatacao
      )}

Por peça: ${formatarBRL(
        dados?.ticketMedioPorPeca ??
        dados?.ticketPeca ??
        0,
        formatacao
      )}`;

    case "mais_vendida": {
      const marca =
        dados?.marca;

      if (
        !marca
      ) {
        return `Não encontrei marcas identificadas nas vendas ${periodo}.`;
      }

      return `🏷️ Marca mais vendida ${periodo}

Marca: ${marca?.marca ||
        "Sem marca"
        }

Peças vendidas: ${Number(
          marca?.quantidade ||
          0
        )}

Faturamento: ${formatarBRL(
          marca?.valor,
          formatacao
        )}`;
    }

    case "quantidade":
      if (
        dados?.marca
      ) {
        return `🏷️ Vendas da marca ${dados.marca} ${periodo}

Peças vendidas: ${Number(
          dados?.quantidade ||
          0
        )}

Faturamento: ${formatarBRL(
          dados?.faturamento,
          formatacao
        )}`;
      }

      return `🛍️ Vendas ${periodo}

Peças vendidas: ${Number(
        dados?.quantidade ||
        0
      )}

Faturamento: ${formatarBRL(
        dados?.faturamento,
        formatacao
      )}`;

    case "lucro": {
      const vendasSemCusto =
        Number(
          dados?.vendasSemCusto ||
          0
        );

      const aviso =
        vendasSemCusto > 0
          ? `\n\n⚠️ ${vendasSemCusto} venda(s) não possuem custo identificado. O lucro é uma estimativa.`
          : "";

      return `💰 Resultado ${periodo}

Faturamento: ${formatarBRL(
        dados?.faturamento,
        formatacao
      )}

Custo identificado: ${formatarBRL(
        dados?.custo,
        formatacao
      )}

Lucro estimado: ${formatarBRL(
        dados?.lucro,
        formatacao
      )}

Margem estimada: ${formatarPercentual(
        dados?.margem
      )}${aviso}`;
    }

    case "total":
      return `💰 Vendas ${periodo}

Peças vendidas: ${Number(
        dados?.quantidade ||
        0
      )}

Faturamento total: ${formatarBRL(
        dados?.faturamento,
        formatacao
      )}`;

    case "comparar_lives":
      return montarRespostaComparacaoLives(
        dados,
        definicao,
        formatacao
      );

    case "quantidade_estoque":
    case "quantidade_estoque_por_marca":
    case "quantidade_estoque_por_categoria":
      return montarRespostaQuantidadeEstoque(
        dados
      );

    case "listar_pecas":
    case "listar_pecas_estoque":
      return montarRespostaListaPecasEstoque(
        dados,
        formatacao
      );

    case "listar_marcas":
    case "listar_marcas_estoque":
      return montarRespostaListaMarcasEstoque(
        dados
      );

    case "listar_categorias":
    case "listar_categorias_estoque":
      return montarRespostaListaCategoriasEstoque(
        dados
      );

    default:
      return (
        resultado?.resposta ||
        "A análise foi concluída, mas ainda não possui uma resposta formatada."
      );
  }
}

class PlanExecutor {
  /**
   * Ponto de entrada completo do assistente.
   *
   * Fluxo:
   * mensagem
   * → ConversationContextManager
   * → plano contextual ou PlannerEngine
   * → executar()
   * → registro do resultado na memória
   *
   * O método executar() original continua disponível,
   * preservando compatibilidade com o fluxo atual.
   */
  async executarMensagem({
    pergunta = "",
    supabase,
    conversaId = "default",
    usuarioId = null,
    metadados = {},
    usarContexto = true,
    plano = null,
    formatacao = {},
  } = {}) {
    const texto =
      String(
        pergunta ||
        ""
      ).trim();

    if (
      !texto
    ) {
      return {
        ok: false,

        tipo:
          "conversa",

        resposta:
          "Digite uma pergunta para continuar.",
      };
    }

    let decisaoConversacional =
      null;

    let planoResolvido =
      plano ||
      null;

    /*
     * Primeiro tenta resolver a mensagem usando
     * o contexto da conversa.
     */
    if (
      usarContexto
    ) {
      decisaoConversacional =
        conversationContextManager.processar({
          mensagem:
            texto,

          pergunta:
            texto,

          conversaId,

          usuarioId,

          metadados,
        });

      /*
       * Algumas ações conversacionais produzem
       * resposta direta e não precisam consultar
       * o Planner nem o banco.
       *
       * Exemplo: limpar o contexto.
       */
      if (
        decisaoConversacional?.resolvido &&
        !decisaoConversacional?.plano
      ) {
        return {
          ok:
            true,

          tipo:
            "conversa",

          origem:
            decisaoConversacional?.origem ||
            "contexto",

          acao:
            decisaoConversacional?.acao ||
            null,

          resposta:
            decisaoConversacional?.resposta ||
            "A ação conversacional foi concluída.",

          conversa: {
            conversaId,

            usuarioId,

            contexto:
              decisaoConversacional?.contexto ||
              null,

            intent:
              decisaoConversacional?.intent ||
              null,
          },
        };
      }

      /*
       * Quando a continuação foi compreendida,
       * o manager já entrega um plano compatível
       * com QueryBuilder e PlanExecutor.
       */
      if (
        decisaoConversacional?.plano
      ) {
        planoResolvido =
          decisaoConversacional.plano;
      }
    }

    /*
     * Caso o contexto não tenha resolvido a
     * mensagem, usa o PlannerEngine normal.
     */
    if (
      !planoResolvido
    ) {
      planoResolvido =
        plannerEngine.criarPlano(
          texto
        );
    }

    const resultado =
      await this.executar({
        plano:
          planoResolvido,

        pergunta:
          texto,

        supabase,

        formatacao,
      });

    /*
     * Registra o plano, os filtros, o resultado
     * e a resposta para as próximas mensagens.
     */
    if (
      usarContexto
    ) {
      try {
        const sugestao =
          resultado?.sugestao ??
          resultado?.dados
            ?.sugestao;

        conversationContextManager
          .registrarResultado({
            conversaId,

            usuarioId,

            pergunta:
              texto,

            plano:
              planoResolvido,

            resultado,

            resposta:
              resultado?.resposta ||
              "",

            ...(sugestao !== undefined
              ? {
                sugestao,
              }
              : {}),

            metadados: {
              ...metadados,

              origemConversa:
                decisaoConversacional
                  ?.origem ||
                "planner",

              acaoConversa:
                decisaoConversacional
                  ?.acao ||
                null,
            },
          });
      } catch (
      error
      ) {
        /*
         * Uma falha ao salvar memória não deve
         * invalidar uma consulta já executada.
         */
        console.error(
          "[PlanExecutor] Erro ao registrar contexto conversacional",
          error
        );
      }
    }

    return {
      ...resultado,

      conversa: {
        conversaId,

        usuarioId,

        origem:
          decisaoConversacional
            ?.origem ||
          "planner",

        acao:
          decisaoConversacional
            ?.acao ||
          "planner",

        usouContexto:
          Boolean(
            decisaoConversacional
              ?.resolvido &&
            decisaoConversacional
              ?.plano
          ),

        intent:
          decisaoConversacional
            ?.intent ||
          null,

        contexto:
          usarContexto
            ? conversationContextManager
              .obterContexto({
                conversaId,
                usuarioId,
              })
            : null,
      },
    };
  }

  async executar({
    plano,
    pergunta,
    supabase,
    formatacao = {},
  }) {
    if (
      !plano?.encontrado
    ) {
      return {
        ok:
          false,

        tipo:
          "planner",

        resposta:
          "Nenhum plano válido foi encontrado para essa solicitação.",
      };
    }

    if (
      !supabase
    ) {
      return {
        ok:
          false,

        tipo:
          "planner",

        resposta:
          "Não foi possível acessar o banco de dados.",
      };
    }

    try {
      const perguntaOriginal =
        plano?.entidades
          ?.perguntaOriginal ||
        pergunta ||
        "";

      const definicao =
        queryBuilder.construir({
          ...plano,

          entidades: {
            ...(
              plano?.entidades ||
              {}
            ),

            perguntaOriginal,
          },
        });

      if (
        !definicao?.valido
      ) {
        return {
          ok:
            false,

          tipo:
            "planner",

          plano:
            plano?.planoId ||
            null,

          motivo:
            definicao?.motivo ||
            "definicao_invalida",

          definicao,

          resposta:
            "O plano foi reconhecido, mas a consulta ainda não está disponível.",
        };
      }

      /*
       * Garante que o texto original esteja disponível
       * para escolher entre:
       *
       * - comparação completa;
       * - melhor live;
       * - pior live.
       */
      definicao.perguntaOriginal =
        definicao?.perguntaOriginal ||
        perguntaOriginal;

      definicao.parametros = {
        ...(
          definicao?.parametros ||
          {}
        ),

        objetivoComparacao:
          definicao?.operacao ===
            "comparar_lives"
            ? detectarObjetivoComparacao({
              ...definicao,

              perguntaOriginal:
                definicao.perguntaOriginal,
            })
            : definicao?.parametros
              ?.objetivoComparacao,
      };

      const contexto =
        await queryExecutor.executar(
          definicao,
          supabase
        );

      if (
        definicao?.periodo
          ?.requerUltimaLive &&
        !contexto?.live
      ) {
        return {
          ok:
            true,

          tipo:
            "planner",

          plano:
            plano?.planoId ||
            null,

          definicao,

          dados: {
            live:
              null,

            vendas:
              [],

            pecas:
              [],
          },

          resposta:
            "Ainda não encontrei nenhuma live encerrada para executar essa análise.",
        };
      }

      if (
        definicao?.periodo
          ?.requerMultiplasLives &&
        (
          !Array.isArray(
            contexto?.lives
          ) ||
          contexto.lives
            .length === 0
        )
      ) {
        return {
          ok:
            true,

          tipo:
            "planner",

          plano:
            plano?.planoId ||
            null,

          definicao,

          dados: {
            lives:
              [],

            vendas:
              [],

            pecas:
              [],
          },

          resposta:
            "Ainda não encontrei lives encerradas suficientes para executar essa comparação.",
        };
      }

      const resultado =
        resultProcessor.processar(
          definicao,
          contexto
        );

      return {
        ok:
          Boolean(
            resultado?.ok
          ),

        tipo:
          "planner",

        plano:
          plano?.planoId ||
          null,

        origemPlano:
          plano?.origem ||
          null,

        dominio:
          definicao?.dominio ||
          plano?.dominio ||
          null,

        operacao:
          definicao?.operacao ||
          plano?.operacao ||
          null,

        periodo:
          definicao?.periodo
            ?.tipo ||
          plano?.periodo ||
          null,

        filtros:
          definicao?.filtros ||
          {},

        parametros:
          definicao?.parametros ||
          {},

        definicao,

        dados:
          resultado?.dados ||
          null,

        resposta:
          responseRouter.build(
            resultado,
            definicao,
            formatacao
          ) ||
          montarResposta(
            resultado,
            definicao,
            formatacao
          ),
      };
    } catch (
    error
    ) {
      console.error(
        `[PlanExecutor] Erro ao executar plano "${plano?.planoId ||
        "desconhecido"
        }"`,
        error
      );

      return {
        ok:
          false,

        tipo:
          "planner",

        plano:
          plano?.planoId ||
          null,

        resposta:
          "Ocorreu um erro ao executar essa análise.",

        erro:
          error?.message ||
          String(error),
      };
    }
  }
}

const planExecutor =
  new PlanExecutor();

export default planExecutor;