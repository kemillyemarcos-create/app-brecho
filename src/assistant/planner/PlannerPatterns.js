const PlannerPatterns = [
  {
    id: "cliente_maior_compra_ultima_live",
    dominio: "lives",
    operacao: "cliente_maior_compra",
    periodo: "ultima_live",

    patterns: [
      "qual cliente mais comprou na ultima live",
      "qual foi a cliente que mais comprou na ultima live",
      "quem mais comprou na ultima live",
      "maior cliente da ultima live",
      "cliente destaque da ultima live",
      "cliente que mais gastou na ultima live",
      "quem gastou mais na ultima live",
      "top cliente da ultima live",
    ],

    etapas: [
      "buscar_ultima_live",
      "buscar_vendas_da_live",
      "agrupar_vendas_por_cliente",
      "ordenar_clientes_por_valor",
    ],
  },

  {
    id: "lucro_ultima_live",
    dominio: "financeiro",
    operacao: "lucro",
    periodo: "ultima_live",

    patterns: [
      "qual foi o lucro da ultima live",
      "lucro da ultima live",
      "quanto lucramos na ultima live",
      "quanto foi o lucro na ultima live",
      "margem da ultima live",
      "resultado financeiro da ultima live",
    ],

    etapas: [
      "buscar_ultima_live",
      "buscar_vendas_da_live",
      "buscar_custos_das_pecas",
      "calcular_lucro",
    ],
  },

  {
    id: "clientes_pendentes_ultima_live",
    dominio: "lives",
    operacao: "clientes_pendentes",
    periodo: "ultima_live",

    patterns: [
      "clientes pendentes da ultima live",
      "quem ainda nao pagou a ultima live",
      "quem deve da ultima live",
      "quem esta pendente na ultima live",
      "pagamentos pendentes da ultima live",
      "quem ainda precisa pagar",
      "quem nao pagou",
    ],

    etapas: [
      "buscar_ultima_live",
      "buscar_vendas_da_live",
      "filtrar_vendas_pendentes",
      "agrupar_vendas_por_cliente",
    ],
  },

  {
    id: "marca_mais_vendida_ultima_live",
    dominio: "lives",
    operacao: "marca_mais_vendida",
    periodo: "ultima_live",

    patterns: [
      "qual marca mais vendeu na ultima live",
      "marca mais vendida da ultima live",
      "qual foi a marca mais vendida",
      "qual marca vendeu mais",
      "ranking de marcas da ultima live",
      "marca destaque da ultima live",
    ],

    etapas: [
      "buscar_ultima_live",
      "buscar_vendas_da_live",
      "identificar_marcas",
      "agrupar_vendas_por_marca",
      "ordenar_marcas_por_quantidade",
    ],
  },

  {
    id: "quantidade_marca_ultima_live",
    dominio: "lives",
    operacao: "quantidade_por_marca",
    periodo: "ultima_live",

    patterns: [
      "quantas pecas de uma marca vendemos na ultima live",
      "quantas pecas da marca vendemos",
      "quantas pecas da zara vendemos",
      "quantas pecas da nike vendemos",
      "quantas pecas da adidas vendemos",
      "vendas por marca na ultima live",
    ],

    etapas: [
      "buscar_ultima_live",
      "buscar_vendas_da_live",
      "extrair_marca_da_pergunta",
      "filtrar_vendas_por_marca",
      "contar_vendas",
    ],
  },

  {
    id: "ticket_medio_ultima_live",
    dominio: "financeiro",
    operacao: "ticket_medio",
    periodo: "ultima_live",

    patterns: [
      "qual foi o ticket medio da ultima live",
      "ticket medio da ultima live",
      "ticket por cliente da ultima live",
      "media de compra da ultima live",
      "quanto cada cliente gastou em media",
    ],

    etapas: [
      "buscar_ultima_live",
      "buscar_vendas_da_live",
      "agrupar_vendas_por_cliente",
      "calcular_ticket_medio",
    ],
  },
];

export default PlannerPatterns;