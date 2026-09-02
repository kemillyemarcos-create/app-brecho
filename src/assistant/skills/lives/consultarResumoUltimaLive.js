import {
  buscarUltimaLiveEncerrada,
  buscarVendasDaLive,
  getDataReferenciaLive,
} from "../../database/queries/lives.js";

function obterFormatacao(
  formatacao = {}
) {
  return {
    locale:
      formatacao?.locale ||
      "pt-BR",

    moeda:
      formatacao?.moeda ||
      "BRL",

    timezone:
      formatacao?.timezone ||
      "America/Sao_Paulo",

    formatoData:
      formatacao?.formatoData ||
      "DD/MM/YYYY",
  };
}

function formatarMoeda(
  valor,
  formatacao = {}
) {
  const {
    locale,
    moeda,
  } = obterFormatacao(
    formatacao
  );

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

function formatarData(
  valor,
  formatacao = {}
) {
  if (!valor) return "-";

  const data =
    valor instanceof Date
      ? valor
      : new Date(valor);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return "-";
  }

  const {
    locale,
    timezone,
    formatoData,
  } = obterFormatacao(
    formatacao
  );

  const partes =
    new Intl.DateTimeFormat(
      locale,
      {
        timeZone: timezone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).formatToParts(data);

  const obterParte = (
    tipo
  ) =>
    partes.find(
      (parte) =>
        parte.type === tipo
    )?.value || "";

  const dia =
    obterParte("day");

  const mes =
    obterParte("month");

  const ano =
    obterParte("year");

  switch (formatoData) {
    case "MM/DD/YYYY":
      return `${mes}/${dia}/${ano}`;

    case "YYYY-MM-DD":
      return `${ano}-${mes}-${dia}`;

    case "DD/MM/YYYY":
    default:
      return `${dia}/${mes}/${ano}`;
  }
}

function normalizarTexto(
  valor = ""
) {
  return String(
    valor || ""
  )
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}

function normalizarNome(
  valor
) {
  return normalizarTexto(
    valor
  );
}

function obterNomeLive(
  live
) {
  return (
    live?.nome ||
    live?.titulo ||
    live?.descricao ||
    live?.nome_live ||
    `Live ${
      live?.id || ""
    }`.trim() ||
    "Sem nome"
  );
}

function obterValorVenda(
  venda
) {
  return Number(
    venda?.valor_venda ??
      venda?.valor ??
      venda?.preco_venda ??
      venda?.total ??
      0
  );
}

function obterNomeCliente(
  venda
) {
  return (
    venda?.cliente_nome ||
    venda?.nome_cliente ||
    venda?.cliente ||
    venda?.clientes?.nome ||
    ""
  );
}

function vendaEstaPaga(
  venda
) {
  const status =
    normalizarTexto(
      venda
        ?.status_pagamento ||
        venda?.status ||
        ""
    );

  return status === "pago";
}

const consultarResumoUltimaLive =
  {
    id:
      "consultar_resumo_ultima_live",

    nome:
      "Consultar resumo da última live",

    categoria: "lives",

    tipo: "consulta",

    /*
     * Evite aliases genéricos como "ultima live".
     *
     * Eles capturam perguntas analíticas, por exemplo:
     * "Qual cliente mais comprou na última live?"
     *
     * Essas perguntas precisam seguir para o Planner.
     */
    aliases: [
      "resumo da ultima live",
      "vendas da ultima live",
      "quanto vendeu na ultima live",
      "quanto faturou na ultima live",
      "quanto faturou a ultima live",
      "resultado da ultima live",
      "desempenho da ultima live",
      "como foi a ultima live",
    ],

    async execute({
      supabase,
      formatacao = {},
    }) {
      const live =
        await buscarUltimaLiveEncerrada(
          supabase
        );

      if (!live) {
        return {
          ok: true,

          tipo:
            "consulta",

          resposta:
            "Ainda não encontrei nenhuma live encerrada para apresentar o resumo.",
        };
      }

      const vendas =
        await buscarVendasDaLive(
          supabase,
          live.id
        );

      const quantidadePecas =
        vendas.length;

      const faturamento =
        vendas.reduce(
          (
            total,
            venda
          ) =>
            total +
            obterValorVenda(
              venda
            ),
          0
        );

      const vendasPagas =
        vendas.filter(
          vendaEstaPaga
        );

      const vendasPendentes =
        vendas.filter(
          (venda) =>
            !vendaEstaPaga(
              venda
            )
        );

      const valorPago =
        vendasPagas.reduce(
          (
            total,
            venda
          ) =>
            total +
            obterValorVenda(
              venda
            ),
          0
        );

      const valorPendente =
        vendasPendentes.reduce(
          (
            total,
            venda
          ) =>
            total +
            obterValorVenda(
              venda
            ),
          0
        );

      const clientesUnicos =
        new Set(
          vendas
            .map(
              (venda) =>
                normalizarNome(
                  obterNomeCliente(
                    venda
                  )
                )
            )
            .filter(Boolean)
        );

      const quantidadeClientes =
        clientesUnicos.size;

      const ticketMedioPorPeca =
        quantidadePecas > 0
          ? faturamento /
            quantidadePecas
          : 0;

      const ticketMedioPorCliente =
        quantidadeClientes >
        0
          ? faturamento /
            quantidadeClientes
          : 0;

      const nomeLive =
        obterNomeLive(
          live
        );

      const dataReferenciaLive =
        getDataReferenciaLive(
          live
        );

      const dataLiveFormatada =
        formatarData(
          dataReferenciaLive,
          formatacao
        );

      const dados = {
        liveId:
          live.id,

        liveNome:
          nomeLive,

        dataLive:
          dataReferenciaLive,

        quantidadePecas,

        quantidadeClientes,

        faturamento,

        valorPago,

        valorPendente,

        ticketMedioPorPeca,

        ticketMedioPorCliente,
      };

      if (
        quantidadePecas === 0
      ) {
        return {
          ok: true,

          tipo:
            "consulta",

          dados,

          resposta: `📡 Resumo da última live

Live: ${nomeLive}

Data: ${dataLiveFormatada}

Nenhuma venda foi registrada nessa live.`,
        };
      }

      return {
        ok: true,

        tipo:
          "consulta",

        dados,

        resposta: `📡 Resumo da última live

Live: ${nomeLive}

Data: ${dataLiveFormatada}

🛍️ Peças vendidas: ${quantidadePecas}

👥 Clientes: ${quantidadeClientes}

💰 Faturamento total: ${formatarMoeda(
          faturamento,
          formatacao
        )}

✅ Valor pago: ${formatarMoeda(
          valorPago,
          formatacao
        )}

⏳ Valor pendente: ${formatarMoeda(
          valorPendente,
          formatacao
        )}

📊 Ticket médio por peça: ${formatarMoeda(
          ticketMedioPorPeca,
          formatacao
        )}

📈 Ticket médio por cliente: ${formatarMoeda(
          ticketMedioPorCliente,
          formatacao
        )}`,
      };
    },
  };

export default consultarResumoUltimaLive;