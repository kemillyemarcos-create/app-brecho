// src/utils/expedicaoRules.js

function parseDataFlex(valor) {
    if (!valor) return null;

    if (valor instanceof Date) {
        return Number.isNaN(valor.getTime()) ? null : valor;
    }

    const texto = String(valor).trim();
    if (!texto) return null;

    // ISO
    if (texto.includes("T")) {
        const dataIso = new Date(texto);
        return Number.isNaN(dataIso.getTime()) ? null : dataIso;
    }

    // yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        const [ano, mes, dia] = texto.split("-");
        const dataIsoCurta = new Date(Number(ano), Number(mes) - 1, Number(dia));
        return Number.isNaN(dataIsoCurta.getTime()) ? null : dataIsoCurta;
    }

    // pt-BR com ou sem hora
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

    // fallback final
    const dataDireta = new Date(texto);
    return Number.isNaN(dataDireta.getTime()) ? null : dataDireta;
}

function getItensDaSacolinhaInterno(sacolinha, todasVendasLive = []) {
    if (!sacolinha?.id) return [];

    return (todasVendasLive || []).filter(
        (v) => String(v.sacolinha_id) === String(sacolinha.id)
    );
}

function getDataMaisAntigaValida(datas = []) {
    const validas = datas.filter(Boolean).sort((a, b) => a.getTime() - b.getTime());
    return validas[0] || null;
}

export function getDataReferenciaSacolinha(sacolinha, todasVendasLive = []) {
    if (!sacolinha) return null;

    const itensDaSacolinha = getItensDaSacolinhaInterno(sacolinha, todasVendasLive);

    const datasDosItens = itensDaSacolinha
        .map((item) =>
            parseDataFlex(item?.data_hora) ||
            parseDataFlex(item?.criado_em) ||
            parseDataFlex(item?.data_venda)
        );

    const dataItens = getDataMaisAntigaValida(datasDosItens);

    if (dataItens) return dataItens;

    const dataSacolinha =
        parseDataFlex(sacolinha?.criado_em) ||
        parseDataFlex(sacolinha?.data_hora) ||
        parseDataFlex(sacolinha?.data) ||
        parseDataFlex(sacolinha?.created_at);

    return dataSacolinha || null;
}

export function getDiasSacolinha(sacolinha, todasVendasLive = []) {
    const dataReferencia = getDataReferenciaSacolinha(sacolinha, todasVendasLive);
    if (!dataReferencia) return 0;

    const agora = new Date();
    return Math.floor((agora - dataReferencia) / (1000 * 60 * 60 * 24));
}

export function getItensDaSacolinha(sacolinha, todasVendasLive = []) {
    return getItensDaSacolinhaInterno(sacolinha, todasVendasLive);
}

export function sacolinhaEstaPaga(sacolinha, todasVendasLive = []) {
    const itensDaSacolinha = getItensDaSacolinhaInterno(sacolinha, todasVendasLive);

    if (itensDaSacolinha.length === 0) return false;

    return itensDaSacolinha.every((v) => v.status_pagamento === "pago");
}

export function sacolinhaEstaVencida(sacolinha, todasVendasLive = []) {
    if (!sacolinha || sacolinha.status === "enviada") return false;

    const diffDias = getDiasSacolinha(sacolinha, todasVendasLive);
    return diffDias > 30;
}

export function sacolinhaEstaSeparada(sacolinha) {
    return sacolinha?.status === "separada";
}

export function sacolinhaEstaEnviada(sacolinha) {
    return sacolinha?.status === "enviada";
}

export function sacolinhaPodeIrParaExpedicao(sacolinha, todasVendasLive = []) {
    return (
        sacolinhaEstaPaga(sacolinha, todasVendasLive) &&
        sacolinhaEstaSeparada(sacolinha) &&
        !sacolinhaEstaVencida(sacolinha, todasVendasLive)
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

export function clienteJaTemPedidoAtivo(clienteNome, pedidosEnvio = []) {
    return (pedidosEnvio || []).some(
        (p) =>
            String(p.cliente_nome || "").trim().toLowerCase() ===
            String(clienteNome || "").trim().toLowerCase() &&
            p.status === "montagem"
    );
}

export function sacolinhaJaEstaEmPedidoAtivo(
    sacolinhaId,
    pedidoEnvioSacolinhas = [],
    pedidosEnvio = []
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

export function getStatusVisualSacolinha(sacolinha, todasVendasLive = []) {
    if (!sacolinha) return "desconhecido";

    if (sacolinhaEstaEnviada(sacolinha)) return "enviada";

    if (sacolinhaEstaVencida(sacolinha, todasVendasLive)) return "vencida";

    if (!sacolinhaEstaPaga(sacolinha, todasVendasLive)) {
        return "aguardando_pagamento";
    }

    if (sacolinhaEstaSeparada(sacolinha)) {
        return "separada";
    }

    if (sacolinha?.status === "aberta") {
        return "aberta";
    }

    return "em_andamento";
}