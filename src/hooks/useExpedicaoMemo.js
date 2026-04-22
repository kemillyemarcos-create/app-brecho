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

export default function useExpedicaoMemo({
    todasVendasLive,
    sacolinhasLive,
    pedidoEnvioSacolinhas,
    pedidosEnvio,
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
                const quantidade = Array.isArray(itens) ? itens.length : 0;
                const vencida = sacolinhaEstaVencida(sacolinha, vendas);
                const diasDesdeReferencia = getDiasSacolinha(sacolinha, vendas);
                const statusVisual = getStatusVisualSacolinha(sacolinha, vendas);

                return {
                    ...sacolinha,
                    itens: Array.isArray(itens) ? itens : [],
                    quantidade,
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
    }, [sacolinhasLive, todasVendasLive]);

    const sacolinhasAbertas = useMemo(() => {
        return sacolinhasAgrupadas.filter((s) => s.status === "aberta");
    }, [sacolinhasAgrupadas]);

    const sacolinhasSeparadas = useMemo(() => {
        return sacolinhasAgrupadas.filter(
            (s) =>
                s.status === "separada" &&
                !sacolinhaJaEstaEmPedidoAtivo(s.id, pedidoEnvioSacolinhas, pedidosEnvio)
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

            const sacolinhasComItens = sacolinhasDoPedido.map((sacolinha) => ({
                ...sacolinha,
                quantidade: sacolinha.quantidade || 0,
                itens: sacolinha.itens || [],
            }));

            const itens = sacolinhasComItens.flatMap((sacolinha) => sacolinha.itens || []);

            const quantidadeTotal = sacolinhasComItens.reduce(
                (acc, s) => acc + s.quantidade,
                0
            );

            return {
                ...pedido,
                sacolinhas: sacolinhasComItens,
                quantidadeCalculada: quantidadeTotal,
                itens,
            };
        });
    }, [pedidosEnvio, pedidoEnvioSacolinhas, mapaSacolinhasPorId]);

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