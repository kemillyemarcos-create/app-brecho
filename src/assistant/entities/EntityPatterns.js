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
        "em estoque",
        "no estoque",
        "nosso estoque",
        "estoque atual",
        "saldo em estoque",
        "quantidade em estoque",
        "disponivel",
        "disponível",
        "disponiveis",
        "disponíveis",
        "temos disponivel",
        "temos disponível",
        "temos disponiveis",
        "temos disponíveis",
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

    /*
     * Operação específica do estoque.
     *
     * Ela fica antes da operação genérica "quantidade"
     * para que frases como:
     *
     * "Quantas Nike temos no estoque?"
     * "Quantas peças da Zara estão disponíveis?"
     *
     * sejam interpretadas como consulta de estoque,
     * e não como quantidade vendida.
     */
    {
      id: "quantidade_estoque",
      termos: [
        "quantidade em estoque",
        "quantidade no estoque",
        "saldo em estoque",
        "saldo do estoque",
        "total em estoque",
        "total no estoque",

        "temos no estoque",
        "tem no estoque",
        "estao no estoque",
        "estão no estoque",

        "temos em estoque",
        "tem em estoque",
        "estao em estoque",
        "estão em estoque",

        "temos disponivel",
        "temos disponível",
        "temos disponiveis",
        "temos disponíveis",

        "estao disponiveis",
        "estão disponíveis",
        "esta disponivel",
        "está disponível",

        "quantas temos",
        "quantos temos",
        "quantas ainda temos",
        "quantos ainda temos",

        "quantas pecas temos",
        "quantas peças temos",
        "quantos produtos temos",

        "quantas pecas existem",
        "quantas peças existem",
        "quantos produtos existem",

        "quantas sobraram",
        "quantos sobraram",
        "quantas restam",
        "quantos restam",
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

  /*
   * Marcas reconhecidas pelo FilterExtractor.
   *
   * Algumas variações no plural foram adicionadas
   * para entender perguntas naturais como:
   *
   * "Quantas Nikes temos no estoque?"
   */
  marcas: [
    "Zara",
    "Nike",
    "Nikes",
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

  /*
   * Categorias iniciais do módulo de estoque.
   *
   * Serão utilizadas pelo FilterExtractor para reconhecer:
   * "Quantas jaquetas temos?"
   * "Quantos vestidos estão disponíveis?"
   */
  categorias: [
"Blusa",
"Blusas",

"Camiseta",
"Camisetas",

"Camisa",
"Camisas",

"Regata",
"Regatas",

"Top",
"Tops",

"Body",
"Bodys",

"Cropped",
"Croppeds",

"Calça",
"Calças",
"Calca",
"Calcas",

"Legging",
"Leggings",

"Short",
"Shorts",

"Bermuda",
"Bermudas",

"Saia",
"Saias",

"Vestido",
"Vestidos",

"Macacão",
"Macacões",
"Macacao",
"Macacoes",

"Jaqueta",
"Jaquetas",

"Casaco",
"Casacos",

"Parka",
"Parkas",

"Cardigan",
"Cardigans",

"Colete",
"Coletes",

"Blazer",
"Blazers",

"Moletom",
"Moletons",

"Suéter",
"Suéteres",
"Sueter",
"Suteres",

"Pulôver",
"Pulôveres",
"Pulover",
"Puloveres",

"Pantalona",
"Pantalonas",

"Bolsa",
"Bolsas",

"tenis",
"tenis",

"Sapato",
"Sapatos",

"Tênis",
"Tênis"
  ],

  /*
   * Status reconhecidos nas consultas de estoque.
   */
  statusEstoque: [
    {
      id: "disponivel",
      termos: [
        "disponivel",
        "disponível",
        "disponiveis",
        "disponíveis",
        "em estoque",
      ],
    },

    {
      id: "reservada",
      termos: [
        "reservada",
        "reservadas",
        "reservado",
        "reservados",
      ],
    },

    {
      id: "vendida",
      termos: [
        "vendida",
        "vendidas",
        "vendido",
        "vendidos",
      ],
    },
  ],
};

export default EntityPatterns;