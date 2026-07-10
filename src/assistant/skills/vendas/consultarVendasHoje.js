function inicioDoDiaIso() {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  return data.toISOString();
}

function fimDoDiaIso() {
  const data = new Date();
  data.setHours(23, 59, 59, 999);
  return data.toISOString();
}

function formatarBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default {
  id: "consultar_vendas_hoje",
  nome: "Consultar vendas de hoje",
  categoria: "Financeiro",
  tipo: "consulta",

  aliases: [
    "quanto vendemos hoje",
    "vendas hoje",
    "faturamento hoje",
    "quanto faturou hoje",
    "quanto entrou hoje",
  ],

  async execute({ supabase }) {
    const { data, error } = await supabase
      .from("vendas_live")
      .select("valor_venda, data_hora")
      .gte("data_hora", inicioDoDiaIso())
      .lte("data_hora", fimDoDiaIso());

    if (error) {
      return {
        ok: false,
        resposta: "Não consegui consultar as vendas de hoje.",
      };
    }

    const vendas = data || [];
    const total = vendas.reduce(
      (acc, venda) => acc + Number(venda.valor_venda || 0),
      0
    );

    return {
      ok: true,
      resposta: `Hoje foram registradas ${vendas.length} venda(s), totalizando ${formatarBRL(total)}.`,
      dados: {
        quantidade: vendas.length,
        total,
      },
    };
  },
};