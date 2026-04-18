// src/utils/expedicaoRules.js

function parseDataFlex(valor) {
    if (!valor) return null;

    const texto = String(valor).trim();
    if (!texto) return null;

    if (texto.includes("T")) {
        const dataIso = new Date(texto);
        return Number.isNaN(dataIso.getTime()) ? null : dataIso;
    }

    const match = texto.match(
        /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
    );

    if (match) {
        const [, dia, mes, ano, hora = "00", minuto = "00", segundo = "00"] = match;

        const dataBr = new Date(
            Number(ano),
            Number(mes) - 1,
            Number(dia),
            Number(hora),
            Number(minuto),
            Number(segundo)
        );

        return Number.isNaN(dataBr.getTime()) ? null : dataBr;
    }

    const dataDireta = new Date(texto);
    return Number.isNaN(dataDireta.getTime()) ? null : dataDireta;
}

export function getItensDaSacolinha(sacolinha, todasVendasLive = []) {
    if (!sacolinha?.id) return [];

    return (todasVendasLive || []).filter(
        (v) => String(v.sacolinha_id) === String(sacolinha.id)
    );
}

export function sacolinhaEstaPaga(sacolinha, todasVendasLive = []) {
    const itensDaSacolinha = getItensDaSacolinha(sacolinha, todasVendasLive);

    if (itensDaSacolinha.length === 0) return false;

    return itensDaSacolinha.every((v) => v.status_pagamento === "pago");
}

export function sacolinhaEstaVencida(sacolinha) {
    if (!sacolinha?.criado_em) return false;

    const dataCriacao = parseDataFlex(sacolinha.criado_em);
    if (!dataCriacao) return false;

    const agora = new Date();
    const diffDias = (agora - dataCriacao) / (1000 * 60 * 60 * 24);

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

export function pedidoEstaConferido(pedido, itensConferidosPedido = {}) {
    const conferidos = itensConferidosPedido?.[pedido?.id] || [];
    return conferidos.length === (pedido?.quantidadeCalculada || 0);
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

export function getStatusSacolinha(sacolinha, todasVendasLive = []) {
    if (!sacolinha) return "desconhecido";

    if (sacolinhaEstaEnviada(sacolinha)) return "enviada";

    if (!sacolinhaEstaPaga(sacolinha, todasVendasLive)) {
        return "aguardando_pagamento";
    }

    if (sacolinhaEstaSeparada(sacolinha)) {
        return "pronta_envio";
    }

    return "em_andamento";
}