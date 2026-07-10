const BusinessRules = [
  {
    id: "cancelar-venda",

    titulo: "Cancelar venda",

    descricao:
      "Ao cancelar uma venda, a peça retorna automaticamente ao estoque e os valores são recalculados.",
  },

  {
    id: "fechar-sacolinha",

    titulo: "Fechar sacolinha",

    descricao:
      "A sacolinha permanece aberta até que todos os itens sejam enviados.",
  },

  {
    id: "expedicao",

    titulo: "Expedição",

    descricao:
      "Pedidos enviados deixam automaticamente a fila de expedição.",
  },

  {
    id: "live",

    titulo: "Venda em Live",

    descricao:
      "Toda venda realizada durante uma live fica vinculada à transmissão correspondente.",
  },

  {
    id: "pendencia",

    titulo: "Pendências",

    descricao:
      "Pedidos sem pagamento confirmado permanecem na lista de pendências.",
  },
];

export default BusinessRules;