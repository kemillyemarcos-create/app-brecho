// src/utils/expedicaoRules.js

export function sacolinhaEstaPaga(sacolinha, todasVendasLive) {
  if (!sacolinha) return false;

  const itensDaSacolinha = (todasVendasLive || []).filter(
    (v) => String(v.sacolinha_id) === String(sacolinha.id)
  );

  if (itensDaSacolinha.length === 0) return false;

  return itensDaSacolinha.every((v) => v.status_pagamento === "pago");
}

export function sacolinhaEstaVencida(sacolinha) {
  if (!sacolinha?.criado_em) return false;

  const parteDataHora = String(sacolinha.criado_em)
    .split(",")
    .map((p) => p.trim());

  const parteData = parteDataHora[0];
  if (!parteData) return false;

  const [dia, mes, ano] = parteData.split("/");
  if (!dia || !mes || !ano) return false;

  const dataCriacao = new Date(
    `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}T00:00:00`
  );

  const hoje = new Date();
  const diffDias = (hoje - dataCriacao) / (1000 * 60 * 60 * 24);

  return diffDias > 30 && sacolinha.status !== "enviada";
}

export function sacolinhaEstaSeparada(sacolinha) {
  return sacolinha?.status === "separada";
}

export function sacolinhaEstaEnviada(sacolinha) {
  return sacolinha?.status === "enviada";
}

export function sacolinhaPodeIrParaExpedicao(sacolinha, todasVendasLive) {
  return (
    sacolinhaEstaPaga(sacolinha, todasVendasLive) &&
    sacolinhaEstaSeparada(sacolinha)
  );
}

export function pedidoEstaEmMontagem(pedido) {
  return pedido?.status === "montagem";
}

export function pedidoEstaEnviado(pedido) {
  return pedido?.status === "enviado";
}

export function pedidoEstaConferido(pedido, itensConferidosPedido) {
  const conferidos = itensConferidosPedido[pedido.id] || [];
  return conferidos.length === pedido.quantidadeCalculada;
}

export function clienteJaTemPedidoAtivo(clienteNome, pedidosEnvio) {
  return (pedidosEnvio || []).some(
    (p) =>
      String(p.cliente_nome || "").trim().toLowerCase() ===
        String(clienteNome || "").trim().toLowerCase() &&
      p.status === "montagem"
  );
}

export function sacolinhaJaEstaEmPedidoAtivo(
  sacolinhaId,
  pedidoEnvioSacolinhas,
  pedidosEnvio
) {
  return (pedidoEnvioSacolinhas || []).some((rel) => {
    if (String(rel.sacolinha_id) !== String(sacolinhaId)) return false;

    const pedido = (pedidosEnvio || []).find(
      (p) => String(p.id) === String(rel.pedido_envio_id)
    );

    return pedido && pedido.status === "montagem";
  });
}