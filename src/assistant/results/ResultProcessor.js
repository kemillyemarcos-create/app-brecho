// ResultProcessor.js
// Recebe os dados brutos do QueryExecutor,
// aplica filtros e executa a operação analítica adequada.

import {
  calcularTotal,
  clientesPendentes,
  filtrarPorMarca,
  filtrarPorStatusPagamento,
  lucro,
  maiorCompra,
  marcaMaisVendida,
  quantidadePorMarca,
  ticketMedio,
} from "./ResultOperations";

function validarContexto(contexto) {
  if (!contexto || typeof contexto !== "object") {
    return {
      valido: false,
      motivo: "contexto_invalido",
    };
  }

  return {
    valido: true,
    motivo: null,
  };
}

function aplicarFiltros(
  vendas = [],
  pecas = [],
  filtros = {},
  operacao = null
) {
  let resultado = Array.isArray(vendas)
    ? [...vendas]
    : [];

  /*
   * A operação "pendentes" já filtra internamente
   * tudo o que não está pago.
   */
  if (
    filtros.statusPagamento &&
    operacao !== "pendentes"
  ) {
    resultado = filtrarPorStatusPagamento(
      resultado,
      filtros.statusPagamento
    );
  }

  /*
   * Marca é aplicada aqui nas operações gerais.
   *
   * Na operação "quantidade", o próprio
   * quantidadePorMarca retorna também faturamento
   * e registros da marca.
   */
  if (
    filtros.marca &&
    operacao !== "quantidade"
  ) {
    resultado = filtrarPorMarca(
      resultado,
      pecas,
      filtros.marca
    );
  }

  return resultado;
}

function obterNomeLive(live) {
  return (
    live?.nome ||
    live?.titulo ||
    live?.descricao ||
    live?.nome_live ||
    (live?.id
      ? `Live ${live.id}`
      : "Live sem nome")
  );
}

function obterDataLive(live) {
  return (
    live?.data_live ||
    live?.hora_fim ||
    live?.hora_inicio ||
    live?.criado_em ||
    live?.created_at ||
    null
  );
}

function calcularVariacaoPercentual(
  valorAnterior,
  valorAtual
) {
  const anterior =
    Number(valorAnterior || 0);

  const atual =
    Number(valorAtual || 0);

  if (anterior === 0) {
    if (atual === 0) {
      return 0;
    }

    return null;
  }

  return (
    ((atual - anterior) /
      anterior) *
    100
  );
}

function identificarTendencia(
  comparacoes = []
) {
  const variacoesValidas =
    comparacoes
      .map(
        (item) =>
          item?.variacaoPercentual
      )
      .filter(
        (valor) =>
          typeof valor === "number" &&
          Number.isFinite(valor)
      );

  if (
    variacoesValidas.length === 0
  ) {
    return "estavel";
  }

  const media =
    variacoesValidas.reduce(
      (total, valor) =>
        total + valor,
      0
    ) /
    variacoesValidas.length;

  if (media > 3) {
    return "crescimento";
  }

  if (media < -3) {
    return "queda";
  }

  return "estavel";
}

function processarMaiorCompra({
  vendas,
  live,
}) {
  const cliente = maiorCompra(vendas);

  return {
    ok: true,
    tipo: "maior_compra",

    dados: {
      liveId: live?.id || null,
      live,
      cliente,
      quantidadeVendas:
        vendas.length,
    },
  };
}

function processarPendentes({
  vendas,
  live,
}) {
  const clientes =
    clientesPendentes(vendas);

  const totalPendente =
    clientes.reduce(
      (total, cliente) =>
        total +
        Number(
          cliente.valor || 0
        ),
      0
    );

  const quantidadePecas =
    clientes.reduce(
      (total, cliente) =>
        total +
        Number(
          cliente.quantidade ||
            cliente.pecas ||
            0
        ),
      0
    );

  return {
    ok: true,
    tipo: "pendentes",

    dados: {
      liveId:
        live?.id || null,

      live,

      clientes,

      totalPendente,

      quantidadeClientes:
        clientes.length,

      quantidadePecas,
    },
  };
}

function processarTicketMedio({
  vendas,
  live,
}) {
  const resultado =
    ticketMedio(vendas);

  return {
    ok: true,
    tipo: "ticket_medio",

    dados: {
      liveId:
        live?.id || null,

      live,

      faturamento:
        resultado.faturamento,

      quantidadePecas:
        resultado.quantidadePecas,

      quantidadeClientes:
        resultado.quantidadeClientes,

      ticketMedioPorPeca:
        resultado.porPeca,

      ticketMedioPorCliente:
        resultado.porCliente,

      /*
       * Mantém aliases para compatibilidade
       * com respostas e código anteriores.
       */
      ticketPeca:
        resultado.porPeca,

      ticketCliente:
        resultado.porCliente,
    },
  };
}

function processarMarcaMaisVendida({
  vendas,
  pecas,
  live,
}) {
  const marca =
    marcaMaisVendida(
      vendas,
      pecas
    );

  return {
    ok: true,
    tipo: "mais_vendida",

    dados: {
      liveId:
        live?.id || null,

      live,

      marca,
    },
  };
}

function processarQuantidade({
  vendas,
  pecas,
  filtros,
  live,
}) {
  /*
   * Quando existe marca, retorna a análise
   * específica da marca.
   */
  if (filtros?.marca) {
    const resultado =
      quantidadePorMarca(
        vendas,
        pecas,
        filtros.marca
      );

    return {
      ok: true,
      tipo: "quantidade",

      dados: {
        liveId:
          live?.id || null,

        live,

        marca:
          resultado.marca,

        quantidade:
          resultado.quantidade,

        faturamento:
          resultado.faturamento,

        vendas:
          resultado.vendas,
      },
    };
  }

  /*
   * Quantidade genérica:
   * "Quantas peças vendemos hoje?"
   */
  return {
    ok: true,
    tipo: "quantidade",

    dados: {
      liveId:
        live?.id || null,

      live,

      marca: null,

      quantidade:
        vendas.length,

      faturamento:
        calcularTotal(vendas),

      vendas,
    },
  };
}

function processarLucro({
  vendas,
  pecas,
  live,
}) {
  const resultado =
    lucro(
      vendas,
      pecas
    );

  return {
    ok: true,
    tipo: "lucro",

    dados: {
      liveId:
        live?.id || null,

      live,

      faturamento:
        resultado.faturamento,

      custo:
        resultado.custo,

      lucro:
        resultado.lucro,

      margem:
        resultado.margem,

      vendasSemCusto:
        resultado.vendasSemCusto,

      quantidadeVendas:
        resultado.quantidadeVendas,
    },
  };
}

function processarTotal({
  vendas,
  live,
}) {
  return {
    ok: true,
    tipo: "total",

    dados: {
      liveId:
        live?.id || null,

      live,

      quantidade:
        vendas.length,

      faturamento:
        calcularTotal(vendas),
    },
  };
}

function processarComparacaoLives({
  lives,
  vendas,
  pecas,
  limite,
}) {
  const livesValidas =
    Array.isArray(lives)
      ? lives
          .filter(
            (live) =>
              live?.id
          )
          .slice(
            0,
            Number(limite || 5)
          )
      : [];

  if (
    livesValidas.length === 0
  ) {
    return {
      ok: true,
      tipo: "comparar_lives",

      dados: {
        lives: [],
        comparacoes: [],
        quantidadeLives: 0,
        faturamentoTotal: 0,
        faturamentoMedio: 0,
        maiorFaturamento: null,
        menorFaturamento: null,
        variacaoTotalPercentual: 0,
        tendencia: "estavel",
      },
    };
  }

  const vendasValidas =
    Array.isArray(vendas)
      ? vendas
      : [];

  const pecasValidas =
    Array.isArray(pecas)
      ? pecas
      : [];

  /*
   * O QueryExecutor entrega as lives da mais recente
   * para a mais antiga. Para calcular evolução,
   * processamos em ordem cronológica.
   */
  const livesCronologicas = [
    ...livesValidas,
  ].reverse();

  const resumos =
    livesCronologicas.map(
      (live) => {
        const liveId =
          String(
            live?.id || ""
          );

        const vendasLive =
          vendasValidas.filter(
            (venda) =>
              String(
                venda?.live_id ||
                  ""
              ) === liveId
          );

        const resultadoLucro =
          lucro(
            vendasLive,
            pecasValidas
          );

        const resultadoTicket =
          ticketMedio(
            vendasLive
          );

        return {
          id: live?.id,
          nome:
            obterNomeLive(live),
          data:
            obterDataLive(live),
          status:
            live?.status || null,
          live,

          quantidadeVendas:
            vendasLive.length,

          faturamento:
            resultadoLucro
              .faturamento,

          custo:
            resultadoLucro
              .custo,

          lucro:
            resultadoLucro
              .lucro,

          margem:
            resultadoLucro
              .margem,

          vendasSemCusto:
            resultadoLucro
              .vendasSemCusto,

          quantidadeClientes:
            resultadoTicket
              .quantidadeClientes,

          ticketMedioPorPeca:
            resultadoTicket
              .porPeca,

          ticketMedioPorCliente:
            resultadoTicket
              .porCliente,

          vendas:
            vendasLive,
        };
      }
    );

  const comparacoes =
    resumos.map(
      (
        resumo,
        index
      ) => {
        if (index === 0) {
          return {
            ...resumo,
            faturamentoAnterior:
              null,
            variacaoAbsoluta:
              null,
            variacaoPercentual:
              null,
          };
        }

        const anterior =
          resumos[index - 1];

        return {
          ...resumo,

          faturamentoAnterior:
            anterior.faturamento,

          variacaoAbsoluta:
            resumo.faturamento -
            anterior.faturamento,

          variacaoPercentual:
            calcularVariacaoPercentual(
              anterior.faturamento,
              resumo.faturamento
            ),
        };
      }
    );

  const faturamentoTotal =
    resumos.reduce(
      (total, live) =>
        total +
        Number(
          live.faturamento ||
            0
        ),
      0
    );

  const faturamentoMedio =
    resumos.length > 0
      ? faturamentoTotal /
        resumos.length
      : 0;

  const maiorFaturamento =
    [...resumos].sort(
      (a, b) =>
        Number(
          b.faturamento ||
            0
        ) -
        Number(
          a.faturamento ||
            0
        )
    )[0] || null;

  const menorFaturamento =
    [...resumos].sort(
      (a, b) =>
        Number(
          a.faturamento ||
            0
        ) -
        Number(
          b.faturamento ||
            0
        )
    )[0] || null;

  const primeiro =
    resumos[0] || null;

  const ultimo =
    resumos[
      resumos.length - 1
    ] || null;

  const variacaoTotalPercentual =
    primeiro && ultimo
      ? calcularVariacaoPercentual(
          primeiro.faturamento,
          ultimo.faturamento
        )
      : 0;

  const tendencia =
    identificarTendencia(
      comparacoes
    );

  return {
    ok: true,
    tipo: "comparar_lives",

    dados: {
      /*
       * "lives" é devolvido em ordem cronológica
       * para facilitar a leitura da evolução.
       */
      lives: resumos,

      comparacoes,

      quantidadeLives:
        resumos.length,

      faturamentoTotal,

      faturamentoMedio,

      maiorFaturamento,

      menorFaturamento,

      variacaoTotalPercentual,

      tendencia,

      primeiraLive:
        primeiro,

      ultimaLive:
        ultimo,
    },
  };
}

class ResultProcessor {
  processar(
    definicao = {},
    contexto = {}
  ) {
    const validacao =
      validarContexto(contexto);

    if (!validacao.valido) {
      return {
        ok: false,
        tipo:
          "result_processor",
        motivo:
          validacao.motivo,
        resposta:
          "Os dados da consulta não estão disponíveis para análise.",
      };
    }

    if (
      !definicao?.operacao
    ) {
      return {
        ok: false,
        tipo:
          "result_processor",
        motivo:
          "operacao_ausente",
        resposta:
          "A operação da análise não foi informada.",
      };
    }

    const operacao =
      definicao.operacao;

    const filtros =
      definicao.filtros ||
      {};

    const parametros =
      definicao.parametros ||
      {};

    const live =
      contexto.live || null;

    const lives =
      Array.isArray(
        contexto.lives
      )
        ? contexto.lives
        : [];

    const pecas =
      Array.isArray(
        contexto.pecas
      )
        ? contexto.pecas
        : [];

    const vendasOriginais =
      Array.isArray(
        contexto.vendas
      )
        ? contexto.vendas
        : [];

    const vendas =
      aplicarFiltros(
        vendasOriginais,
        pecas,
        filtros,
        operacao
      );

    switch (operacao) {
      case "maior_compra":
        return processarMaiorCompra({
          vendas,
          live,
        });

      case "pendentes":
        return processarPendentes({
          vendas,
          live,
        });

      case "ticket_medio":
        return processarTicketMedio({
          vendas,
          live,
        });

      case "mais_vendida":
        return processarMarcaMaisVendida({
          vendas,
          pecas,
          live,
        });

      case "quantidade":
        return processarQuantidade({
          vendas:
            vendasOriginais,
          pecas,
          filtros,
          live,
        });

      case "lucro":
        return processarLucro({
          vendas,
          pecas,
          live,
        });

      case "total":
        return processarTotal({
          vendas,
          live,
        });

      case "comparar_lives":
        return processarComparacaoLives({
          lives,
          vendas:
            vendasOriginais,
          pecas,
          limite:
            parametros?.limite ||
            5,
        });

      default:
        return {
          ok: false,
          tipo:
            "result_processor",
          motivo:
            "operacao_nao_suportada",
          operacao,
          resposta:
            `A operação "${operacao}" ainda não possui processamento configurado.`,
        };
    }
  }
}

const resultProcessor =
  new ResultProcessor();

export default resultProcessor;
