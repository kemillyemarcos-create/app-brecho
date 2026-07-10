export function formatarLista(titulo, itens = []) {
  return `✨ ${titulo}

${itens.map((item) => `• ${item}`).join("\n")}`;
}

export function formatarResultado({ titulo, descricao, detalhes = [] }) {
  return `${titulo}

${descricao ? `${descricao}\n` : ""}${detalhes.length ? detalhes.map((item) => `• ${item}`).join("\n") : ""}`;
}

export function formatarErro(mensagem) {
  return `⚠️ Atenção

${mensagem}`;
}

export function formatarNaoAprendido() {
  return `Ainda não consigo responder isso.

Mas já entendi que essa é uma habilidade importante para aprender. 😊`;
}