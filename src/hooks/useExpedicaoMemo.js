import { useMemo } from "react";
import {
  getItensDaSacolinha,
  sacolinhaJaEstaEmPedidoAtivo,
  pedidoEstaEmMontagem,
  pedidoEstaEnviado,
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
    return (sacolinhasLive || [])
      .map((sacolinha) => {
        const itens = getItensDaSacolinha(sacolinha, todasVendasLive);

        return {
          ...sacolinha,
          itens,
          quantidade: itens.length,
        };
      })
      .filter((sacolinha) => sacolinha.quantidade > 0)
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

  const mapaSacolinhasPorId = useMemo(() => {
    if (!Array.isArray(sacolinhasLive)) return {};

    return Object.fromEntries(
      sacolinhasLive.map((s) => [String(s.id), s])
    );
  }, [sacolinhasLive]);

  const pedidosEnvioAgrupados = useMemo(() => {
    return (pedidosEnvio || []).map((pedido) => {
      const vinculos = (pedidoEnvioSacolinhas || []).filter(
        (v) => String(v.pedido_envio_id) === String(pedido.id)
      );

      const sacolinhasDoPedido = vinculos
        .map((v) => mapaSacolinhasPorId[String(v.sacolinha_id)])
        .filter(Boolean);

      const sacolinhasComItens = sacolinhasDoPedido.map((sacolinha) => {
        const itensDaSacolinha = getItensDaSacolinha(sacolinha, todasVendasLive);

        return {
          ...sacolinha,
          quantidade: itensDaSacolinha.length,
          itens: itensDaSacolinha,
        };
      });

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
  }, [pedidosEnvio, pedidoEnvioSacolinhas, mapaSacolinhasPorId, todasVendasLive]);

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
  };
}