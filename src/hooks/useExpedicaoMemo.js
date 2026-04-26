import { useMemo } from "react";
import {
    getItensDaSacolinha,
    sacolinhaJaEstaEmPedidoAtivo,
    pedidoEstaEmMontagem,
    pedidoEstaEnviado,
    sacolinhaEstaVencida,
    getStatusVisualSacolinha,
    getDiasSacolinha,
} from "../utils/expedicaoRules";

function limparValor(valor) {
    if (valor === null || valor === undefined || valor === "") return 0;

    if (typeof valor === "number") {
        return Number.isNaN(valor) ? 0 : valor;
    }

    const texto = String(valor)
        .trim()
        .replace("R$", "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

    const numero = Number(texto);

    return Number.isNaN(numero) ? 0 : numero;
}

function getValorItemExpedicao(item, mapaPecasPorId = {}) {
    const valorDireto =
        limparValor(item?.valor_venda) ||
        limparValor(item?.valor_venda_final) ||
        limparValor(item?.valor) ||
        limparValor(item?.venda) ||
        limparValor(item?.preco);

    if (valorDireto > 0) return valorDireto;

    const peca =
        mapaPecasPorId[String(item?.peca_id)] ||
        mapaPecasPorId[String(item?.id)] ||
        mapaPecasPorId[String(item?.codigo)] ||
        null;

    return (
        limparValor(peca?.valor_venda_final) ||
        limparValor(peca?.valor_venda) ||
        limparValor(peca?.venda) ||
        limparValor(peca?.valor) ||
        limparValor(peca?.preco) ||
        0
    );
}

export default function useExpedicaoMemo({
    todasVendasLive,
    sacolinhasLive,
    pedidoEnvioSacolinhas,
    pedidosEnvio,
    mapaPecasPorId = {},
}) {
    const pecaIdsEnviados = useMemo(() => {
        const sacolinhasEnviadasIds = new Set(
            (sacolinhasLive || [])
                .filter((s) => s.status === "enviada")
                .map((s) => String(s.id))
        );

        return (todasVendasLive || [])
            .filter((v) => sacolinhasEnviadasIds.has(String(v.sacolinha_id)))
            .map((v) => String(v.peca_id));
    }, [todasVendasLive, sacolinhasLive]);

    const sacolinhasAgrupadas = useMemo(() => {
        const vendas = todasVendasLive || [];

        return (sacolinhasLive || [])
            .map((sacolinha) => {
                const itens = getItensDaSacolinha(sacolinha, vendas) || [];
                const itensValidos = Array.isArray(itens) ? itens : [];

                const valorTotal = itensValidos.reduce((acc, item) => {
                    return acc + getValorItemExpedicao(item, mapaPecasPorId);
                }, 0);

                const quantidade = itensValidos.length;
                const vencida = sacolinhaEstaVencida(sacolinha, vendas);
                const diasDesdeReferencia = getDiasSacolinha(sacolinha, vendas);
                const statusVisual = getStatusVisualSacolinha(sacolinha, vendas);

                return {
                    ...sacolinha,
                    itens: itensValidos,
                    quantidade,
                    valorTotal,
                    vencida,
                    diasDesdeReferencia,
                    statusVisual,
                };
            })
            .sort((a, b) =>
                String(a.cliente_nome || "").localeCompare(
                    String(b.cliente_nome || ""),
                    "pt-BR",
                    { sensitivity: "base" }
                )
            );
    }, [sacolinhasLive, todasVendasLive, mapaPecasPorId]);

    const sacolinhasAbertas = useMemo(() => {
        return sacolinhasAgrupadas.filter((s) => s.status === "aberta");
    }, [sacolinhasAgrupadas]);

    const sacolinhasSeparadas = useMemo(() => {
        return sacolinhasAgrupadas.filter(
            (s) =>
                s.status === "separada" &&
                !sacolinhaJaEstaEmPedidoAtivo(
                    s.id,
                    pedidoEnvioSacolinhas,
                    pedidosEnvio
                )
        );
    }, [sacolinhasAgrupadas, pedidoEnvioSacolinhas, pedidosEnvio]);

    const sacolinhasEnviadas = useMemo(() => {
        return sacolinhasAgrupadas.filter((s) => s.status === "enviada");
    }, [sacolinhasAgrupadas]);

    const totalSacolinhasVencidas = useMemo(() => {
        return sacolinhasSeparadas.filter((s) => s.vencida).length;
    }, [sacolinhasSeparadas]);

    const mapaSacolinhasPorId = useMemo(() => {
        return Object.fromEntries(
            (sacolinhasAgrupadas || []).map((s) => [String(s.id), s])
        );
    }, [sacolinhasAgrupadas]);

    const pedidosEnvioAgrupados = useMemo(() => {
        return (pedidosEnvio || []).map((pedido) => {
            const vinculos = (pedidoEnvioSacolinhas || []).filter(
                (v) => String(v.pedido_envio_id) === String(pedido.id)
            );

            const sacolinhasDoPedido = vinculos
                .map((v) => mapaSacolinhasPorId[String(v.sacolinha_id)])
                .filter(Boolean);

            const sacolinhasComItens = sacolinhasDoPedido.map((sacolinha) => {
                const itens = sacolinha.itens || [];
                const quantidade = sacolinha.quantidade || itens.length || 0;

                const valorTotal =
                    Number(sacolinha.valorTotal) ||
                    itens.reduce((acc, item) => {
                        return acc + getValorItemExpedicao(item, mapaPecasPorId);
                    }, 0);

                return {
                    ...sacolinha,
                    quantidade,
                    valorTotal,
                    itens,
                };
            });

            const itens = sacolinhasComItens.flatMap(
                (sacolinha) => sacolinha.itens || []
            );

            const quantidadeTotal = sacolinhasComItens.reduce(
                (acc, s) => acc + (s.quantidade || 0),
                0
            );

            const valorTotalPedido = sacolinhasComItens.reduce(
                (acc, s) => acc + (Number(s.valorTotal) || 0),
                0
            );

            return {
                ...pedido,
                sacolinhas: sacolinhasComItens,
                quantidadeCalculada: quantidadeTotal,
                valorTotalPedido,
                valorTotal: valorTotalPedido,
                itens,
            };
        });
    }, [
        pedidosEnvio,
        pedidoEnvioSacolinhas,
        mapaSacolinhasPorId,
        mapaPecasPorId,
    ]);

    const pedidosEnvioEmMontagem = useMemo(() => {
        return pedidosEnvioAgrupados.filter((p) => pedidoEstaEmMontagem(p));
    }, [pedidosEnvioAgrupados]);

    const pedidosEnvioConcluidos = useMemo(() => {
        return pedidosEnvioAgrupados.filter((p) => pedidoEstaEnviado(p));
    }, [pedidosEnvioAgrupados]);

    return {
        pecaIdsEnviados,
        sacolinhasAgrupadas,
        sacolinhasAbertas,
        sacolinhasSeparadas,
        sacolinhasEnviadas,
        mapaSacolinhasPorId,
        pedidosEnvioAgrupados,
        pedidosEnvioEmMontagem,
        pedidosEnvioConcluidos,
        totalSacolinhasVencidas,
    };
}