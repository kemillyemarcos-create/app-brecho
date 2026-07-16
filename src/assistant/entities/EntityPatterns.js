const EntityPatterns = {
  dominios: [
    {
      id: "clientes",
      termos: [
        "cliente",
        "clientes",
        "comprador",
        "compradora",
        "quem comprou",
        "quem gastou",
      ],
    },

    {
      id: "vendas",
      termos: [
        "venda",
        "vendas",
        "faturamento",
        "faturou",
        "vendeu",
        "receita",
        "evolucao do faturamento",
        "evolução do faturamento",
      ],
    },

    {
      id: "lives",
      termos: [
        "live",
        "lives",
        "transmissao",
        "transmissão",
        "ao vivo",
        "ultimas lives",
        "últimas lives",
        "lives recentes",
      ],
    },

    {
      id: "estoque",
      termos: [
        "estoque",
        "peca",
        "peça",
        "pecas",
        "peças",
        "produto",
        "produtos",
      ],
    },

    {
      id: "financeiro",
      termos: [
        "lucro",
        "margem",
        "custo",
        "financeiro",
        "resultado",
        "ticket",
      ],
    },

    {
      id: "expedicao",
      termos: [
        "expedicao",
        "expedição",
        "envio",
        "pedido",
        "rastreio",
        "frete",
      ],
    },
  ],

  operacoes: [
    {
      id: "maior_compra",
      termos: [
        "mais comprou",
        "maior compra",
        "mais gastou",
        "gastou mais",
        "cliente destaque",
        "top cliente",
      ],
    },

    {
      id: "menor_compra",
      termos: [
        "menos comprou",
        "menor compra",
        "menos gastou",
      ],
    },

    {
      id: "total",
      termos: [
        "quanto vendeu",
        "quanto faturou",
        "total vendido",
        "faturamento total",
        "valor total",
      ],
    },

    {
      id: "quantidade",
      termos: [
        "quantas",
        "quantos",
        "quantidade",
        "numero de",
        "número de",
      ],
    },

    {
      id: "ticket_medio",
      termos: [
        "ticket medio",
        "ticket médio",
        "media por cliente",
        "média por cliente",
        "media de compra",
        "média de compra",
      ],
    },

    {
      id: "lucro",
      termos: [
        "lucro",
        "quanto lucrou",
        "resultado financeiro",
      ],
    },

    {
      id: "margem",
      termos: [
        "margem",
        "percentual de lucro",
      ],
    },

    {
      id: "pendentes",
      termos: [
        "pendente",
        "pendentes",
        "nao pagou",
        "não pagou",
        "quem deve",
        "a receber",
      ],
    },

    {
      id: "mais_vendida",
      termos: [
        "mais vendida",
        "mais vendeu",
        "vendeu mais",
        "marca destaque",
      ],
    },

    {
      id: "ranking",
      termos: [
        "ranking",
        "top",
        "melhores",
        "maiores",
      ],
    },

    {
      id: "comparar_lives",
      termos: [
        /*
         * Termos curtos são necessários para reconhecer frases
         * com uma quantidade inserida no meio, como:
         *
         * "Compare as últimas 3 lives"
         * "Compare as últimas 5 lives"
         */
        "compare",
        "comparar",
        "comparacao",
        "comparação",

        "compare as lives",
        "comparar lives",
        "compare as ultimas lives",
        "compare as últimas lives",
        "comparacao entre lives",
        "comparação entre lives",

        /*
         * Evolução e desempenho.
         */
        "evolucao",
        "evolução",
        "desempenho das lives",
        "desempenho das ultimas lives",
        "desempenho das últimas lives",
        "evolucao das lives",
        "evolução das lives",
        "evolucao do faturamento",
        "evolução do faturamento",
        "faturamento das ultimas lives",
        "faturamento das últimas lives",
        "mostrar evolucao do faturamento",
        "mostrar evolução do faturamento",
        "mostre a evolucao do faturamento",
        "mostre a evolução do faturamento",
        "como foi o faturamento das ultimas lives",
        "como foi o faturamento das últimas lives",

        /*
         * Tendência.
         */
        "o faturamento esta aumentando",
        "o faturamento está aumentando",
        "faturamento esta aumentando",
        "faturamento está aumentando",
        "o faturamento esta caindo",
        "o faturamento está caindo",
        "faturamento esta caindo",
        "faturamento está caindo",

        /*
         * Melhor live.
         *
         * Os termos abaixo não dependem de a quantidade aparecer
         * imediatamente antes de "lives".
         */
        "qual foi a melhor",
        "qual a melhor",
        "melhor live",
        "melhor das lives",
        "melhor das ultimas",
        "melhor das últimas",
        "melhor das ultimas lives",
        "melhor das últimas lives",
        "maior faturamento entre as lives",
        "qual teve maior faturamento",
        "qual live teve maior faturamento",
        "qual faturou mais",

        /*
         * Pior live.
         */
        "qual foi a pior",
        "qual a pior",
        "pior live",
        "pior das lives",
        "pior das ultimas",
        "pior das últimas",
        "pior das ultimas lives",
        "pior das últimas lives",
        "menor faturamento entre as lives",
        "qual teve menor faturamento",
        "qual live teve menor faturamento",
        "qual faturou menos",
      ],
    },
  ],

  periodos: [
    {
      id: "hoje",
      termos: [
        "hoje",
        "do dia",
        "neste dia",
      ],
    },

    {
      id: "ontem",
      termos: [
        "ontem",
        "dia anterior",
      ],
    },

    {
      id: "semana_atual",
      termos: [
        "esta semana",
        "nessa semana",
        "na semana",
      ],
    },

    {
      id: "mes_atual",
      termos: [
        "este mes",
        "esse mes",
        "neste mes",
        "no mes",
        "este mês",
        "esse mês",
        "neste mês",
        "no mês",
      ],
    },

    {
      id: "ano_atual",
      termos: [
        "este ano",
        "esse ano",
        "neste ano",
        "no ano",
      ],
    },

    {
      id: "ultima_live",
      termos: [
        "ultima live",
        "última live",
        "live passada",
        "live anterior",
      ],
    },

    {
      id: "ultimas_lives",
      termos: [
        /*
         * Termos genéricos reconhecem qualquer quantidade:
         * "últimas 3 lives", "últimas 5 lives", etc.
         *
         * O número é extraído separadamente pelo EntityExtractor.
         */
        "ultimas",
        "últimas",
        "ultimos",
        "últimos",
        "ultimas lives",
        "últimas lives",
        "lives recentes",
        "ultimas transmissoes",
        "últimas transmissões",

        /*
         * Mantidos para compatibilidade e reforço de pontuação.
         */
        "ultimas 3 lives",
        "últimas 3 lives",
        "ultimas 5 lives",
        "últimas 5 lives",
        "ultimas 10 lives",
        "últimas 10 lives",
      ],
    },
  ],

  marcas: [
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
  ],
};

export default EntityPatterns;
