// QueryRegistry.js
// Registro central de tabelas, campos, operações, períodos,
// filtros e agregações utilizados pelo Assistente Virtual.

const QueryRegistry = {
  fontes: {
    lives: {
      tabela: "lives",

      campos: {
        id: "id",
        nome: "nome",
        status: "status",
        data: "data_live",
        horaInicio: "hora_inicio",
        horaFim: "hora_fim",
        criadoEm: "criado_em",
      },
    },

    vendasLive: {
      tabela: "vendas_live",

      campos: {
        id: "id",
        liveId: "live_id",
        pecaId: "peca_id",
        sacolinhaId: "sacolinha_id",

        cliente: "cliente_nome",
        nomePeca: "nome_peca",

        /*
         * Estes campos ficam registrados aqui para permitir
         * evolução futura, caso sejam adicionados diretamente
         * à tabela vendas_live.
         *
         * Atualmente, marca e categoria podem continuar sendo
         * obtidas pelo relacionamento com a tabela pecas.
         */
        marca: "marca",
        categoria: "categoria",

        valorVenda: "valor_venda",
        dataHora: "data_hora",
        statusPagamento: "status_pagamento",
      },
    },

    pecas: {
      tabela: "pecas",

      campos: {
        id: "id",
        nome: "nome",

        marca: "marca",
        categoria: "categoria",

        custo: "custo",
        valorVenda: "venda",
        valorVendaFinal: "valor_venda_final",

        vendido: "vendido",
        status: "status",

        cliente: "cliente",

        dataCadastro: "data_cadastro",
        dataVenda: "data_venda",

        estoque: "estoque",
      },
    },
  },

  operacoes: {
    maiorCompra: "maior_compra",
    pendentes: "pendentes",
    ticketMedio: "ticket_medio",
    lucro: "lucro",
    marcaMaisVendida: "mais_vendida",
    quantidade: "quantidade",
    total: "total",
    compararLives: "comparar_lives",
  },

  operacoesSuportadas: [
    "maior_compra",
    "cliente_maior_compra",

    "pendentes",
    "clientes_pendentes",

    "ticket_medio",

    "lucro",

    "mais_vendida",
    "marca_mais_vendida",

    "quantidade",
    "quantidade_por_marca",

    "total",

    "comparar_lives",
  ],

  periodos: {
    ultimaLive: "ultima_live",
    ultimasLives: "ultimas_lives",
    hoje: "hoje",
    ontem: "ontem",
    semanaAtual: "semana_atual",
    mesAtual: "mes_atual",
    anoAtual: "ano_atual",
  },

  periodosSuportados: [
    "ultima_live",
    "ultimas_lives",
    "hoje",
    "ontem",
    "semana_atual",
    "mes_atual",
    "ano_atual",
  ],

  filtros: {
    statusPagamento: {
      pago: "pago",
      pendente: "pendente",
    },

    statusPeca: {
      disponivel: "disponivel",
      reservada: "reservada",
      vendido: "vendido",
    },

    statusLive: {
      aberta: "aberta",
      encerrada: "encerrada",
    },

    statusSacolinha: {
      aberta: "aberta",
      separada: "separada",
      enviada: "enviada",
    },

    statusPedidoEnvio: {
      montagem: "montagem",
      enviado: "enviado",
    },
  },

  agregacoes: {
    soma: "soma",
    media: "media",
    contagem: "contagem",
    agrupamento: "agrupamento",
    ordenacao: "ordenacao",
    minimo: "minimo",
    maximo: "maximo",
    variacaoPercentual: "variacao_percentual",
    tendencia: "tendencia",
  },

  limites: {
    comparacaoLivesPadrao: 5,
    comparacaoLivesMinimo: 2,
    comparacaoLivesMaximo: 50,
  },
};

export default QueryRegistry;
