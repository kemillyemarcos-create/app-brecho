export function formatarLista(titulo, itens = []) {
  const lista = Array.isArray(itens) ? itens.filter(Boolean) : [];

  return `✨ ${titulo}

${lista.map((item) => `• ${item}`).join("\n")}`;
}

export function formatarResultado({
  titulo = "✨ Resultado",
  descricao = "",
  detalhes = [],
}) {
  const linhas = [];

  if (titulo) {
    linhas.push(titulo);
  }

  if (descricao) {
    linhas.push("", descricao);
  }

  if (Array.isArray(detalhes) && detalhes.length > 0) {
    linhas.push(
      "",
      ...detalhes
        .filter(Boolean)
        .map((item) => `• ${item}`)
    );
  }

  return linhas.join("\n");
}

export function formatarErro(mensagem = "Não foi possível concluir a solicitação.") {
  return `⚠️ Atenção

${mensagem}`;
}

export function formatarNaoAprendido() {
  return `✨ Ainda não consigo responder essa solicitação.

Essa habilidade ainda não foi adicionada ao Assistente Virtual.`;
}

export function formatarMoedaBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

export function formatarPercentual(valor, casasDecimais = 1) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  })}%`;
}