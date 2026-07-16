import {
  describe,
  expect,
  test,
} from "vitest";

import {
  agruparPorCliente,
  agruparPorMarca,
  calcularTotal,
  clientesPendentes,
  converterNumero,
  criarMapaPecas,
  filtrarPorMarca,
  filtrarPorStatusPagamento,
  identificarMarca,
  lucro,
  maiorCompra,
  marcaMaisVendida,
  obterCustoVenda,
  obterNomeCliente,
  obterNomePeca,
  obterValorVenda,
  quantidadePorMarca,
  ticketMedio,
  vendaEstaPaga,
} from "../results/ResultOperations";

const pecas = [
  {
    id: "p1",
    nome: "Jaqueta Nike",
    marca: "Nike",
    custo: 40,
  },
  {
    id: "p2",
    nome: "Calça Zara",
    marca: "Zara",
    custo: "R$ 30,00",
  },
  {
    id: "p3",
    nome: "Moletom Adidas",
    marca: "",
    custo: 20,
  },
  {
    id: "p4",
    nome: "Blusa sem marca",
    marca: null,
    custo: null,
  },
];

const vendas = [
  {
    id: "v1",
    peca_id: "p1",
    cliente_nome: "Ana",
    nome_peca: "Jaqueta Nike",
    valor_venda: 100,
    status_pagamento: "pago",
  },
  {
    id: "v2",
    peca_id: "p2",
    cliente_nome: "Ana",
    nome_peca: "Calça Zara",
    valor_venda: "R$ 80,00",
    status_pagamento: "pendente",
  },
  {
    id: "v3",
    peca_id: "p3",
    cliente_nome: "Bruna",
    nome_peca: "Moletom Adidas",
    valor_venda: "70,00",
    status_pagamento: "pago",
  },
  {
    id: "v4",
    peca_id: "p4",
    cliente_nome: "Carla",
    nome_peca: "Blusa sem marca",
    valor_venda: 50,
    status_pagamento: "",
  },
];

describe("ResultOperations", () => {
  describe("converterNumero", () => {
    test("converte número nativo", () => {
      expect(
        converterNumero(129.9)
      ).toBe(129.9);
    });

    test("converte valor brasileiro com moeda", () => {
      expect(
        converterNumero(
          "R$ 1.299,90"
        )
      ).toBe(1299.9);
    });

    test("converte valor com vírgula", () => {
      expect(
        converterNumero("25,50")
      ).toBe(25.5);
    });

    test("retorna zero para valor vazio ou inválido", () => {
      expect(
        converterNumero(null)
      ).toBe(0);

      expect(
        converterNumero("")
      ).toBe(0);

      expect(
        converterNumero("abc")
      ).toBe(0);
    });
  });

  describe("obtenção de campos", () => {
    test("obtém valor de venda usando os aliases suportados", () => {
      expect(
        obterValorVenda({
          valor_venda: "R$ 99,90",
        })
      ).toBe(99.9);

      expect(
        obterValorVenda({
          valor_venda_final: 75,
        })
      ).toBe(75);

      expect(
        obterValorVenda({
          venda: 60,
        })
      ).toBe(60);
    });

    test("obtém nome do cliente", () => {
      expect(
        obterNomeCliente({
          cliente_nome: "Ana",
        })
      ).toBe("Ana");

      expect(
        obterNomeCliente({
          clientes: {
            nome: "Bruna",
          },
        })
      ).toBe("Bruna");
    });

    test("usa fallback quando cliente não está identificado", () => {
      expect(
        obterNomeCliente({})
      ).toBe(
        "Cliente não identificado"
      );
    });

    test("obtém nome da peça", () => {
      expect(
        obterNomePeca({
          nome_peca: "Jaqueta",
        })
      ).toBe("Jaqueta");

      expect(
        obterNomePeca({
          pecas: {
            nome: "Calça",
          },
        })
      ).toBe("Calça");
    });
  });

  describe("pagamento", () => {
    test("identifica venda paga", () => {
      expect(
        vendaEstaPaga({
          status_pagamento: "PAGO",
        })
      ).toBe(true);
    });

    test("identifica venda não paga", () => {
      expect(
        vendaEstaPaga({
          status_pagamento:
            "pendente",
        })
      ).toBe(false);
    });

    test("filtra vendas pagas", () => {
      const resultado =
        filtrarPorStatusPagamento(
          vendas,
          "pago"
        );

      expect(resultado).toHaveLength(2);

      expect(
        resultado.map(
          (venda) => venda.id
        )
      ).toEqual(["v1", "v3"]);
    });

    test("filtra vendas pendentes", () => {
      const resultado =
        filtrarPorStatusPagamento(
          vendas,
          "pendente"
        );

      expect(resultado).toHaveLength(2);

      expect(
        resultado.map(
          (venda) => venda.id
        )
      ).toEqual(["v2", "v4"]);
    });

    test("sem filtro retorna cópia da lista", () => {
      const resultado =
        filtrarPorStatusPagamento(
          vendas
        );

      expect(resultado).toEqual(
        vendas
      );

      expect(resultado).not.toBe(
        vendas
      );
    });
  });

  describe("clientes", () => {
    test("agrupa vendas por cliente", () => {
      const clientes =
        agruparPorCliente(vendas);

      expect(clientes).toHaveLength(3);

      const ana =
        clientes.find(
          (cliente) =>
            cliente.nome === "Ana"
        );

      expect(ana).toMatchObject({
        nome: "Ana",
        cliente: "Ana",
        quantidade: 2,
        pecas: 2,
        valor: 180,
      });

      expect(
        ana.vendas
      ).toHaveLength(2);
    });

    test("agrupa nomes ignorando caixa e espaços", () => {
      const resultado =
        agruparPorCliente([
          {
            cliente_nome:
              " Ana ",
            valor_venda: 40,
          },
          {
            cliente_nome:
              "ana",
            valor_venda: 60,
          },
        ]);

      expect(resultado).toHaveLength(1);
      expect(
        resultado[0].valor
      ).toBe(100);
      expect(
        resultado[0].quantidade
      ).toBe(2);
    });

    test("encontra cliente com maior compra", () => {
      const cliente =
        maiorCompra(vendas);

      expect(cliente.nome).toBe(
        "Ana"
      );

      expect(cliente.valor).toBe(
        180
      );

      expect(
        cliente.quantidade
      ).toBe(2);
    });

    test("retorna null quando não existem vendas", () => {
      expect(
        maiorCompra([])
      ).toBeNull();
    });

    test("agrupa clientes pendentes", () => {
      const resultado =
        clientesPendentes(
          vendas
        );

      expect(resultado).toHaveLength(2);

      expect(
        resultado.map(
          (cliente) =>
            cliente.nome
        )
      ).toEqual([
        "Ana",
        "Carla",
      ]);

      expect(
        resultado[0].valor
      ).toBe(80);
    });
  });

  describe("totais e ticket médio", () => {
    test("calcula faturamento total", () => {
      expect(
        calcularTotal(vendas)
      ).toBe(300);
    });

    test("calcula ticket médio por peça e por cliente", () => {
      const resultado =
        ticketMedio(vendas);

      expect(
        resultado.faturamento
      ).toBe(300);

      expect(
        resultado.quantidadePecas
      ).toBe(4);

      expect(
        resultado.quantidadeClientes
      ).toBe(3);

      expect(
        resultado.porPeca
      ).toBe(75);

      expect(
        resultado.porCliente
      ).toBe(100);
    });

    test("retorna médias zero quando não existem vendas", () => {
      const resultado =
        ticketMedio([]);

      expect(
        resultado.faturamento
      ).toBe(0);

      expect(
        resultado.porPeca
      ).toBe(0);

      expect(
        resultado.porCliente
      ).toBe(0);
    });
  });

  describe("peças, marcas e filtros", () => {
    test("cria mapa de peças por id", () => {
      const mapa =
        criarMapaPecas(pecas);

      expect(
        mapa.get("p1")?.marca
      ).toBe("Nike");

      expect(
        mapa.get("p2")?.marca
      ).toBe("Zara");
    });

    test("identifica marca diretamente na venda", () => {
      expect(
        identificarMarca({
          marca: "Puma",
        })
      ).toBe("Puma");
    });

    test("identifica marca pela peça relacionada", () => {
      const mapa =
        criarMapaPecas(pecas);

      expect(
        identificarMarca(
          {
            peca_id: "p1",
          },
          mapa
        )
      ).toBe("Nike");
    });

    test("identifica marca pelo nome da peça", () => {
      const mapa =
        criarMapaPecas(pecas);

      expect(
        identificarMarca(
          {
            peca_id: "p3",
            nome_peca:
              "Moletom Adidas",
          },
          mapa
        )
      ).toBe("Adidas");
    });

    test("retorna Sem marca quando não identifica marca", () => {
      expect(
        identificarMarca({
          nome_peca:
            "Blusa básica",
        })
      ).toBe("Sem marca");
    });

    test("agrupa vendas por marca", () => {
      const resultado =
        agruparPorMarca(
          vendas,
          pecas
        );

      const nike =
        resultado.find(
          (item) =>
            item.marca === "Nike"
        );

      const zara =
        resultado.find(
          (item) =>
            item.marca === "Zara"
        );

      expect(nike).toMatchObject({
        quantidade: 1,
        valor: 100,
      });

      expect(zara).toMatchObject({
        quantidade: 1,
        valor: 80,
      });
    });

    test("encontra marca mais vendida usando desempate por faturamento", () => {
      const resultado =
        marcaMaisVendida(
          vendas,
          pecas
        );

      /*
       * Nike, Zara e Adidas têm uma venda cada.
       * O desempate ocorre pelo maior faturamento.
       */
      expect(resultado.marca).toBe(
        "Nike"
      );

      expect(
        resultado.quantidade
      ).toBe(1);

      expect(resultado.valor).toBe(
        100
      );
    });

    test("filtra vendas por marca", () => {
      const resultado =
        filtrarPorMarca(
          vendas,
          pecas,
          "zara"
        );

      expect(resultado).toHaveLength(1);

      expect(
        resultado[0].id
      ).toBe("v2");
    });

    test("quantidade por marca retorna quantidade e faturamento", () => {
      const resultado =
        quantidadePorMarca(
          vendas,
          pecas,
          "Nike"
        );

      expect(resultado.marca).toBe(
        "Nike"
      );

      expect(
        resultado.quantidade
      ).toBe(1);

      expect(
        resultado.faturamento
      ).toBe(100);

      expect(
        resultado.vendas
      ).toHaveLength(1);
    });
  });

  describe("custos e lucro", () => {
    test("obtém custo pela peça relacionada", () => {
      const mapa =
        criarMapaPecas(pecas);

      expect(
        obterCustoVenda(
          {
            peca_id: "p2",
          },
          mapa
        )
      ).toBe(30);
    });

    test("usa custo registrado diretamente na venda como fallback", () => {
      expect(
        obterCustoVenda({
          custo: "R$ 25,00",
        })
      ).toBe(25);
    });

    test("calcula faturamento, custo, lucro e margem", () => {
      const resultado =
        lucro(
          vendas,
          pecas
        );

      expect(
        resultado.faturamento
      ).toBe(300);

      expect(
        resultado.custo
      ).toBe(90);

      expect(
        resultado.lucro
      ).toBe(210);

      expect(
        resultado.margem
      ).toBe(70);

      expect(
        resultado.vendasSemCusto
      ).toBe(1);

      expect(
        resultado.quantidadeVendas
      ).toBe(4);
    });

    test("retorna valores zero sem vendas", () => {
      const resultado =
        lucro([], pecas);

      expect(resultado).toEqual({
        faturamento: 0,
        custo: 0,
        lucro: 0,
        margem: 0,
        vendasSemCusto: 0,
        quantidadeVendas: 0,
      });
    });
  });
});