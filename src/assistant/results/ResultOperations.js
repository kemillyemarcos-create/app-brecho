// ResultOperations.js
// Centraliza os cálculos e transformações dos resultados
// retornados pelo QueryExecutor.

import { normalizarTexto } from "../utils/TextUtils";

const MARCAS_CONHECIDAS = [
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

export function converterNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return 0;
  }

  if (typeof valor === "number") {
    return Number.isFinite(valor)
      ? valor
      : 0;
  }

  const texto = String(valor).trim();

  if (!texto) {
    return 0;
  }

  let normalizado = texto.replace(
    /[^\d,.-]/g,
    ""
  );

  /*
   * Quando existe vírgula, consideramos o padrão brasileiro:
   *
   * 1.299,90 → 1299.90
   * R$ 25,00 → 25.00
   */
  if (normalizado.includes(",")) {
    normalizado = normalizado
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const numero = Number(normalizado);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

export function obterValorVenda(venda) {
  return converterNumero(
    venda?.valor_venda ??
      venda?.valor ??
      venda?.preco_venda ??
      venda?.valor_venda_final ??
      venda?.total ??
      venda?.venda ??
      0
  );
}

export function obterCustoVenda(
  venda,
  mapaPecas = new Map()
) {
  const pecaRelacionada =
    mapaPecas.get(
      String(venda?.peca_id || "")
    );

  return converterNumero(
    pecaRelacionada?.custo ??
      venda?.valor_compra ??
      venda?.custo ??
      venda?.preco_compra ??
      venda?.peca?.custo ??
      venda?.pecas?.custo ??
      0
  );
}

export function obterNomeCliente(venda) {
  return (
    venda?.cliente_nome ||
    venda?.nome_cliente ||
    venda?.cliente ||
    venda?.clientes?.nome ||
    "Cliente não identificado"
  );
}

export function obterNomePeca(venda) {
  return (
    venda?.nome_peca ||
    venda?.peca_nome ||
    venda?.nome ||
    venda?.produto_nome ||
    venda?.peca?.nome ||
    venda?.pecas?.nome ||
    ""
  );
}

export function vendaEstaPaga(venda) {
  const status = normalizarTexto(
    venda?.status_pagamento ||
      venda?.status ||
      ""
  );

  return status === "pago";
}

export function filtrarPorStatusPagamento(
  vendas = [],
  statusPagamento = null
) {
  if (!statusPagamento) {
    return [...vendas];
  }

  const statusNormalizado =
    normalizarTexto(statusPagamento);

  if (statusNormalizado === "pago") {
    return vendas.filter(
      vendaEstaPaga
    );
  }

  if (
    statusNormalizado ===
    "pendente"
  ) {
    return vendas.filter(
      (venda) =>
        !vendaEstaPaga(venda)
    );
  }

  return [...vendas];
}

export function agruparPorCliente(
  vendas = []
) {
  const mapa = new Map();

  for (const venda of vendas) {
    const nomeOriginal =
      obterNomeCliente(venda);

    const chave =
      normalizarTexto(
        nomeOriginal
      );

    if (!chave) {
      continue;
    }

    const atual =
      mapa.get(chave) || {
        nome:
          nomeOriginal,
        cliente:
          nomeOriginal,
        quantidade: 0,
        pecas: 0,
        valor: 0,
        vendas: [],
      };

    atual.quantidade += 1;
    atual.pecas += 1;
    atual.valor +=
      obterValorVenda(venda);

    atual.vendas.push(
      venda
    );

    mapa.set(
      chave,
      atual
    );
  }

  return Array.from(
    mapa.values()
  );
}

export function maiorCompra(
  vendas = []
) {
  const clientes =
    agruparPorCliente(
      vendas
    ).sort(
      (a, b) =>
        b.valor - a.valor ||
        b.quantidade -
          a.quantidade
    );

  return clientes[0] || null;
}

export function clientesPendentes(
  vendas = []
) {
  const vendasPendentes =
    vendas.filter(
      (venda) =>
        !vendaEstaPaga(venda)
    );

  return agruparPorCliente(
    vendasPendentes
  ).sort(
    (a, b) =>
      b.valor - a.valor ||
      b.quantidade -
        a.quantidade
  );
}

export function calcularTotal(
  vendas = []
) {
  return vendas.reduce(
    (total, venda) =>
      total +
      obterValorVenda(venda),
    0
  );
}

export function ticketMedio(
  vendas = []
) {
  const faturamento =
    calcularTotal(vendas);

  const clientes =
    agruparPorCliente(
      vendas
    );

  const quantidadePecas =
    vendas.length;

  const quantidadeClientes =
    clientes.length;

  return {
    faturamento,
    quantidadePecas,
    quantidadeClientes,

    porPeca:
      quantidadePecas > 0
        ? faturamento /
          quantidadePecas
        : 0,

    porCliente:
      quantidadeClientes > 0
        ? faturamento /
          quantidadeClientes
        : 0,
  };
}

export function criarMapaPecas(
  pecas = []
) {
  return new Map(
    pecas
      .filter(
        (peca) =>
          peca?.id
      )
      .map(
        (peca) => [
          String(
            peca.id
          ),
          peca,
        ]
      )
  );
}

export function identificarMarca(
  venda,
  mapaPecas = new Map()
) {
  const marcaDireta =
    venda?.marca ||
    venda?.marca_nome ||
    venda?.marca_peca ||
    venda?.peca?.marca ||
    venda?.pecas?.marca ||
    "";

  if (marcaDireta) {
    return String(
      marcaDireta
    ).trim();
  }

  const pecaRelacionada =
    mapaPecas.get(
      String(
        venda?.peca_id ||
          ""
      )
    );

  if (
    pecaRelacionada?.marca
  ) {
    return String(
      pecaRelacionada.marca
    ).trim();
  }

  /*
   * Fallback pelo nome da peça.
   * É importante porque algumas peças podem ter
   * a marca somente dentro do nome.
   */
  const nomePecaNormalizado =
    normalizarTexto(
      obterNomePeca(
        venda
      ) ||
        pecaRelacionada?.nome ||
        ""
    );

  if (!nomePecaNormalizado) {
    return "Sem marca";
  }

  const marcaEncontrada =
    MARCAS_CONHECIDAS.find(
      (marca) =>
        nomePecaNormalizado.includes(
          normalizarTexto(
            marca
          )
        )
    );

  return (
    marcaEncontrada ||
    "Sem marca"
  );
}

export function agruparPorMarca(
  vendas = [],
  pecas = []
) {
  const mapaPecas =
    criarMapaPecas(
      pecas
    );

  const mapaMarcas =
    new Map();

  for (const venda of vendas) {
    const marca =
      identificarMarca(
        venda,
        mapaPecas
      );

    const chave =
      normalizarTexto(
        marca
      );

    const atual =
      mapaMarcas.get(
        chave
      ) || {
        marca,
        quantidade: 0,
        valor: 0,
        vendas: [],
      };

    atual.quantidade += 1;
    atual.valor +=
      obterValorVenda(venda);

    atual.vendas.push(
      venda
    );

    mapaMarcas.set(
      chave,
      atual
    );
  }

  return Array.from(
    mapaMarcas.values()
  );
}

export function marcaMaisVendida(
  vendas = [],
  pecas = []
) {
  const ranking =
    agruparPorMarca(
      vendas,
      pecas
    )
      .filter(
        (item) =>
          normalizarTexto(
            item.marca
          ) !==
          "sem marca"
      )
      .sort(
        (a, b) =>
          b.quantidade -
            a.quantidade ||
          b.valor -
            a.valor
      );

  return ranking[0] || null;
}

export function filtrarPorMarca(
  vendas = [],
  pecas = [],
  marca = ""
) {
  const marcaNormalizada =
    normalizarTexto(
      marca
    );

  if (!marcaNormalizada) {
    return [...vendas];
  }

  const mapaPecas =
    criarMapaPecas(
      pecas
    );

  return vendas.filter(
    (venda) =>
      normalizarTexto(
        identificarMarca(
          venda,
          mapaPecas
        )
      ) ===
      marcaNormalizada
  );
}

export function quantidadePorMarca(
  vendas = [],
  pecas = [],
  marca = ""
) {
  const vendasDaMarca =
    filtrarPorMarca(
      vendas,
      pecas,
      marca
    );

  return {
    marca,

    quantidade:
      vendasDaMarca.length,

    faturamento:
      calcularTotal(
        vendasDaMarca
      ),

    vendas:
      vendasDaMarca,
  };
}

export function lucro(
  vendas = [],
  pecas = []
) {
  const mapaPecas =
    criarMapaPecas(
      pecas
    );

  let faturamento = 0;
  let custo = 0;
  let vendasSemCusto = 0;

  for (const venda of vendas) {
    const valorVenda =
      obterValorVenda(
        venda
      );

    const custoPeca =
      obterCustoVenda(
        venda,
        mapaPecas
      );

    faturamento +=
      valorVenda;

    custo +=
      custoPeca;

    if (custoPeca <= 0) {
      vendasSemCusto += 1;
    }
  }

  const lucroCalculado =
    faturamento -
    custo;

  const margem =
    faturamento > 0
      ? (
          lucroCalculado /
          faturamento
        ) * 100
      : 0;

  return {
    faturamento,
    custo,
    lucro:
      lucroCalculado,
    margem,
    vendasSemCusto,
    quantidadeVendas:
      vendas.length,
  };
}
