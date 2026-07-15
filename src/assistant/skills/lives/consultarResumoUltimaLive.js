import {
  buscarUltimaLiveEncerrada,
  buscarVendasDaLive,
  getDataReferenciaLive,
} from "../../database/queries/lives.js";

function formatarBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataBR(valor) {
  if (!valor) return "-";

  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return data.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizarTexto(valor = "") {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarNome(valor) {
  return normalizarTexto(valor);
}

function obterNomeLive(live) {
  return (
    live?.nome ||
    live?.titulo ||
    live?.descricao ||
    live?.nome_live ||
    `Live ${live?.id || ""}`.trim() ||
    "Sem nome"
  );
}

function obterValorVenda(venda) {
  return Number(
    venda?.valor_venda ??
      venda?.valor ??
      venda?.preco_venda ??
      venda?.total ??
      0
  );
}

function obterNomeCliente(venda) {
  return (
    venda?.cliente_nome ||
    venda?.nome_cliente ||
    venda?.cliente ||
    venda?.clientes?.nome ||
    ""
  );
}

function vendaEstaPaga(venda) {
  const status = normalizarTexto(
    venda?.status_pagamento ||
      venda?.status ||
      ""
  );

  return status === "pago";
}

const consultarResumoUltimaLive = {
  id: "consultar_resumo_ultima_live",
  nome: "Consultar resumo da última live",
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

  async execute({ supabase }) {
    const live = await buscarUltimaLiveEncerrada(supabase);

    if (!live) {
      return {
        ok: true,
        tipo: "consulta",
        resposta:
          "Ainda não encontrei nenhuma live encerrada para apresentar o resumo.",
      };
    }

    const vendas = await buscarVendasDaLive(supabase, live.id);

    const quantidadePecas = vendas.length;

    const faturamento = vendas.reduce(
      (total, venda) => total + obterValorVenda(venda),
      0
    );

    const vendasPagas = vendas.filter(vendaEstaPaga);

    const vendasPendentes = vendas.filter(
      (venda) => !vendaEstaPaga(venda)
    );

    const valorPago = vendasPagas.reduce(
      (total, venda) => total + obterValorVenda(venda),
      0
    );

    const valorPendente = vendasPendentes.reduce(
      (total, venda) => total + obterValorVenda(venda),
      0
    );

    const clientesUnicos = new Set(
      vendas
        .map((venda) => normalizarNome(obterNomeCliente(venda)))
        .filter(Boolean)
    );

    const quantidadeClientes = clientesUnicos.size;

    const ticketMedioPorPeca =
      quantidadePecas > 0
        ? faturamento / quantidadePecas
        : 0;

    const ticketMedioPorCliente =
      quantidadeClientes > 0
        ? faturamento / quantidadeClientes
        : 0;

    const nomeLive = obterNomeLive(live);
    const dataReferenciaLive = getDataReferenciaLive(live);
    const dataLiveFormatada = formatarDataBR(dataReferenciaLive);

    const dados = {
      liveId: live.id,
      liveNome: nomeLive,
      dataLive: dataReferenciaLive,
      quantidadePecas,
      quantidadeClientes,
      faturamento,
      valorPago,
      valorPendente,
      ticketMedioPorPeca,
      ticketMedioPorCliente,
    };

    if (quantidadePecas === 0) {
      return {
        ok: true,
        tipo: "consulta",
        dados,
        resposta: `📡 Resumo da última live

Live: ${nomeLive}
Data: ${dataLiveFormatada}

Nenhuma venda foi registrada nessa live.`,
      };
    }

    return {
      ok: true,
      tipo: "consulta",
      dados,

      resposta: `📡 Resumo da última live

Live: ${nomeLive}
Data: ${dataLiveFormatada}

🛍️ Peças vendidas: ${quantidadePecas}
👥 Clientes: ${quantidadeClientes}
💰 Faturamento total: ${formatarBRL(faturamento)}

✅ Valor pago: ${formatarBRL(valorPago)}
⏳ Valor pendente: ${formatarBRL(valorPendente)}

📊 Ticket médio por peça: ${formatarBRL(ticketMedioPorPeca)}
📈 Ticket médio por cliente: ${formatarBRL(ticketMedioPorCliente)}`,
    };
  },
};

export default consultarResumoUltimaLive;