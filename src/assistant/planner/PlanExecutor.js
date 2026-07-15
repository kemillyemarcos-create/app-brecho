import {
  buscarUltimaLiveEncerrada,
  buscarVendasDaLive,
} from "../database/queries/lives.js";

function normalizarTexto(valor = "") {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obterValorVenda(venda) {
  return Number(
    venda?.valor_venda ||
      venda?.valor ||
      venda?.preco_venda ||
      venda?.total ||
      0
  );
}

function obterCustoVenda(venda) {
  return Number(
    venda?.valor_compra ||
      venda?.custo ||
      venda?.preco_compra ||
      venda?.peca?.custo ||
      0
  );
}

function obterNomeCliente(venda) {
  return (
    venda?.cliente_nome ||
    venda?.nome_cliente ||
    venda?.cliente ||
    venda?.clientes?.nome ||
    "Cliente não identificado"
  );
}

function obterNomePeca(venda) {
  return (
    venda?.peca_nome ||
    venda?.nome_peca ||
    venda?.nome ||
    venda?.peca?.nome ||
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

function agruparVendasPorCliente(vendas = []) {
  const mapa = new Map();

  for (const venda of vendas) {
    const nomeOriginal = obterNomeCliente(venda);
    const chave = normalizarTexto(nomeOriginal);

    if (!chave) continue;

    const atual = mapa.get(chave) || {
      nome: nomeOriginal,
      quantidade: 0,
      valor: 0,
      vendas: [],
    };

    atual.quantidade += 1;
    atual.valor += obterValorVenda(venda);
    atual.vendas.push(venda);

    mapa.set(chave, atual);
  }

  return Array.from(mapa.values());
}

function identificarMarca(venda) {
  const marcaDireta =
    venda?.marca ||
    venda?.peca?.marca ||
    "";

  if (marcaDireta) {
    return String(marcaDireta).trim();
  }

  const nomePeca = obterNomePeca(venda);

  if (!nomePeca) return "Sem marca";

  const marcasConhecidas = [
    "Zara",
    "Nike",
    "Adidas",
    "Levi's",
    "Levis",
    "Columbia",
    "The North Face",
    "Calvin Klein",
    "Tommy Hilfiger",
    "Michael Kors",
    "H&M",
    "Mango",
    "Puma",
    "Guess",
    "Ralph Lauren",
    "Gap",
  ];

  const nomeNormalizado = normalizarTexto(nomePeca);

  const encontrada = marcasConhecidas.find((marca) =>
    nomeNormalizado.includes(normalizarTexto(marca))
  );

  return encontrada || "Sem marca";
}

function extrairMarcaDaPergunta(pergunta = "") {
  const marcasConhecidas = [
    "Zara",
    "Nike",
    "Adidas",
    "Levi's",
    "Levis",
    "Columbia",
    "The North Face",
    "Calvin Klein",
    "Tommy Hilfiger",
    "Michael Kors",
    "H&M",
    "Mango",
    "Puma",
    "Guess",
    "Ralph Lauren",
    "Gap",
  ];

  const texto = normalizarTexto(pergunta);

  return (
    marcasConhecidas.find((marca) =>
      texto.includes(normalizarTexto(marca))
    ) || null
  );
}

function formatarBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarListaClientes(clientes = []) {
  if (!clientes.length) {
    return "Nenhum cliente encontrado.";
  }

  return clientes
    .map(
      (cliente, index) =>
        `${index + 1}. ${cliente.nome} — ${cliente.quantidade} peça(s) — ${formatarBRL(
          cliente.valor
        )}`
    )
    .join("\n");
}

class PlanExecutor {
  async executar({ plano, pergunta, supabase }) {
    if (!plano?.encontrado) {
      return {
        ok: false,
        resposta: "Nenhum plano válido foi encontrado para essa solicitação.",
      };
    }

    try {
      const live = await buscarUltimaLiveEncerrada(supabase);

      if (!live) {
        return {
          ok: true,
          resposta:
            "Ainda não encontrei nenhuma live encerrada para executar essa análise.",
        };
      }

      const vendas = await buscarVendasDaLive(supabase, live.id);

      switch (plano.operacao) {
        case "cliente_maior_compra":
          return this.executarClienteMaiorCompra({
            live,
            vendas,
          });

        case "lucro":
          return this.executarLucro({
            live,
            vendas,
          });

        case "clientes_pendentes":
          return this.executarClientesPendentes({
            live,
            vendas,
          });

        case "marca_mais_vendida":
          return this.executarMarcaMaisVendida({
            live,
            vendas,
          });

        case "quantidade_por_marca":
          return this.executarQuantidadePorMarca({
            live,
            vendas,
            pergunta,
          });

        case "ticket_medio":
          return this.executarTicketMedio({
            live,
            vendas,
          });

        default:
          return {
            ok: false,
            resposta:
              "O plano foi identificado, mas a operação ainda não possui um executor.",
          };
      }
    } catch (error) {
      console.error(
        `[PlanExecutor] Erro ao executar plano "${plano.planoId}"`,
        error
      );

      return {
        ok: false,
        resposta:
          "Ocorreu um erro ao executar essa análise.",
      };
    }
  }

  executarClienteMaiorCompra({ live, vendas }) {
    const clientes = agruparVendasPorCliente(vendas).sort(
      (a, b) => b.valor - a.valor
    );

    const cliente = clientes[0];

    if (!cliente) {
      return {
        ok: true,
        resposta:
          "Não encontrei clientes com compras registradas na última live.",
      };
    }

    return {
      ok: true,
      tipo: "planner",
      dados: {
        liveId: live.id,
        cliente,
      },
      resposta: `👑 Cliente destaque da última live

Cliente: ${cliente.nome}
Peças compradas: ${cliente.quantidade}
Valor total: ${formatarBRL(cliente.valor)}`,
    };
  }

  executarLucro({ live, vendas }) {
    const faturamento = vendas.reduce(
      (total, venda) => total + obterValorVenda(venda),
      0
    );

    const custo = vendas.reduce(
      (total, venda) => total + obterCustoVenda(venda),
      0
    );

    const lucro = faturamento - custo;

    const margem =
      faturamento > 0
        ? (lucro / faturamento) * 100
        : 0;

    return {
      ok: true,
      tipo: "planner",
      dados: {
        liveId: live.id,
        faturamento,
        custo,
        lucro,
        margem,
      },
      resposta: `💰 Resultado da última live

Faturamento: ${formatarBRL(faturamento)}
Custo das peças: ${formatarBRL(custo)}
Lucro estimado: ${formatarBRL(lucro)}
Margem estimada: ${margem.toFixed(1).replace(".", ",")}%`,
    };
  }

  executarClientesPendentes({ live, vendas }) {
    const pendentes = vendas.filter(
      (venda) => !vendaEstaPaga(venda)
    );

    const clientes = agruparVendasPorCliente(pendentes).sort(
      (a, b) => b.valor - a.valor
    );

    const totalPendente = clientes.reduce(
      (total, cliente) => total + cliente.valor,
      0
    );

    if (!clientes.length) {
      return {
        ok: true,
        tipo: "planner",
        resposta:
          "✅ Não existem clientes pendentes na última live.",
      };
    }

    return {
      ok: true,
      tipo: "planner",
      dados: {
        liveId: live.id,
        clientes,
        totalPendente,
      },
      resposta: `⏳ Clientes pendentes da última live

${formatarListaClientes(clientes)}

Total pendente: ${formatarBRL(totalPendente)}`,
    };
  }

  executarMarcaMaisVendida({ live, vendas }) {
    const mapa = new Map();

    for (const venda of vendas) {
      const marca = identificarMarca(venda);
      const chave = normalizarTexto(marca);

      const atual = mapa.get(chave) || {
        marca,
        quantidade: 0,
        valor: 0,
      };

      atual.quantidade += 1;
      atual.valor += obterValorVenda(venda);

      mapa.set(chave, atual);
    }

    const ranking = Array.from(mapa.values()).sort(
      (a, b) =>
        b.quantidade - a.quantidade ||
        b.valor - a.valor
    );

    const primeira = ranking[0];

    if (!primeira) {
      return {
        ok: true,
        resposta:
          "Não encontrei marcas nas vendas da última live.",
      };
    }

    return {
      ok: true,
      tipo: "planner",
      dados: {
        liveId: live.id,
        ranking,
      },
      resposta: `🏷️ Marca mais vendida da última live

Marca: ${primeira.marca}
Peças vendidas: ${primeira.quantidade}
Faturamento: ${formatarBRL(primeira.valor)}`,
    };
  }

  executarQuantidadePorMarca({ live, vendas, pergunta }) {
    const marca = extrairMarcaDaPergunta(pergunta);

    if (!marca) {
      return {
        ok: false,
        tipo: "planner",
        resposta:
          "Entendi que você deseja consultar uma marca, mas não consegui identificar qual.",
      };
    }

    const vendasDaMarca = vendas.filter((venda) => {
      const marcaVenda = identificarMarca(venda);

      return (
        normalizarTexto(marcaVenda) ===
        normalizarTexto(marca)
      );
    });

    const faturamento = vendasDaMarca.reduce(
      (total, venda) => total + obterValorVenda(venda),
      0
    );

    return {
      ok: true,
      tipo: "planner",
      dados: {
        liveId: live.id,
        marca,
        quantidade: vendasDaMarca.length,
        faturamento,
      },
      resposta: `🏷️ Vendas da marca ${marca}

Peças vendidas: ${vendasDaMarca.length}
Faturamento: ${formatarBRL(faturamento)}`,
    };
  }

  executarTicketMedio({ live, vendas }) {
    const clientes = agruparVendasPorCliente(vendas);

    const faturamento = vendas.reduce(
      (total, venda) => total + obterValorVenda(venda),
      0
    );

    const quantidadeClientes = clientes.length;
    const quantidadePecas = vendas.length;

    const ticketCliente =
      quantidadeClientes > 0
        ? faturamento / quantidadeClientes
        : 0;

    const ticketPeca =
      quantidadePecas > 0
        ? faturamento / quantidadePecas
        : 0;

    return {
      ok: true,
      tipo: "planner",
      dados: {
        liveId: live.id,
        ticketCliente,
        ticketPeca,
      },
      resposta: `📊 Ticket médio da última live

Por cliente: ${formatarBRL(ticketCliente)}
Por peça: ${formatarBRL(ticketPeca)}`,
    };
  }
}

const planExecutor = new PlanExecutor();

export default planExecutor;