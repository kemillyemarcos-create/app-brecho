import { useMemo, useState } from "react";
import {
    Archive,
    BadgeCheck,
    Boxes,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock3,
    CreditCard,
    FileCheck2,
    PackageCheck,
    PackageOpen,
    PackagePlus,
    RotateCcw,
    Send,
    ShieldCheck,
    Truck,
    Wallet,
    XCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatarDataHoraBR } from "../../utils/dateUtils";

function getItensDaSacolinhaLocal(sacolinha, vendas = []) {
    if (!sacolinha?.id) return [];

    return (vendas || []).filter(
        (v) => String(v.sacolinha_id) === String(sacolinha.id)
    );
}

function sacolinhaEstaPagaLocal(sacolinha, vendas = []) {
    const itens = getItensDaSacolinhaLocal(sacolinha, vendas);
    if (itens.length === 0) return false;
    return itens.every((v) => v.status_pagamento === "pago");
}

function getStatusSacolinhaLocal(sacolinha, vendas = [], getStatusSacolinha) {
    if (!sacolinha) return "desconhecido";
    if (sacolinha.status === "enviada") return "enviada";
    if (!sacolinhaEstaPagaLocal(sacolinha, vendas)) return "aguardando_pagamento";
    if (sacolinha.status === "separada") return "pronta_envio";

    if (typeof getStatusSacolinha === "function") {
        return getStatusSacolinha(sacolinha, vendas);
    }

    return "em_andamento";
}

function sacolinhaPodeIrParaExpedicaoLocal(
    sacolinha,
    vendas = [],
    sacolinhaEstaVencida,
    sacolinhaPodeIrParaExpedicao
) {
    if (!sacolinha) return false;

    if (typeof sacolinhaPodeIrParaExpedicao === "function") {
        const resultadoOriginal = sacolinhaPodeIrParaExpedicao(sacolinha, vendas);
        if (resultadoOriginal) return true;
    }

    const vencida =
        typeof sacolinhaEstaVencida === "function"
            ? sacolinhaEstaVencida(sacolinha, vendas)
            : false;

    return (
        sacolinhaEstaPagaLocal(sacolinha, vendas) &&
        sacolinha.status === "separada" &&
        !vencida
    );
}

function IconButton({ icon: Icon, label, onClick, disabled, tone = "default", isMobile }) {
    const tons = {
        default: { bg: "#f8fafc", border: "#e2e8f0", color: "#334155" },
        primary: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
        success: { bg: "#ecfdf5", border: "#bbf7d0", color: "#15803d" },
        warning: { bg: "#fffbeb", border: "#fde68a", color: "#b45309" },
        danger: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
        muted: { bg: "#f1f5f9", border: "#e2e8f0", color: "#64748b" },
    };

    const tema = tons[tone] || tons.default;

    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled && onClick) onClick();
            }}
            style={{
                minWidth: isMobile ? 42 : 46,
                height: isMobile ? 38 : 42,
                borderRadius: 14,
                border: `1px solid ${tema.border}`,
                background: tema.bg,
                color: tema.color,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
            }}
        >
            <Icon size={isMobile ? 17 : 18} strokeWidth={2.2} />
        </button>
    );
}

function Badge({ children, tone = "default", icon: Icon }) {
    const tons = {
        default: { bg: "#f8fafc", border: "#e2e8f0", color: "#334155" },
        success: { bg: "#ecfdf5", border: "#bbf7d0", color: "#15803d" },
        warning: { bg: "#fffbeb", border: "#fde68a", color: "#b45309" },
        danger: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
        primary: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
        muted: { bg: "#f1f5f9", border: "#e2e8f0", color: "#64748b" },
    };

    const tema = tons[tone] || tons.default;

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 9px",
                borderRadius: 999,
                border: `1px solid ${tema.border}`,
                background: tema.bg,
                color: tema.color,
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1,
                whiteSpace: "nowrap",
            }}
        >
            {Icon ? <Icon size={13} strokeWidth={2.4} /> : null}
            {children}
        </span>
    );
}

function StatusPagamentoToggle({ sacolinha, pago, alterandoPagamentoId, onTogglePagamento }) {
    const carregando = alterandoPagamentoId === sacolinha.id;

    return (
        <button
            type="button"
            disabled={carregando}
            title={pago ? "Clique para marcar como pendente" : "Clique para marcar como pago"}
            onClick={(e) => {
                e.stopPropagation();
                if (!carregando) onTogglePagamento(sacolinha, pago);
            }}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                border: "none",
                borderRadius: 999,
                padding: "6px 10px",
                background: pago ? "#ecfdf5" : "#fef2f2",
                color: pago ? "#15803d" : "#b91c1c",
                fontSize: 12,
                fontWeight: 900,
                cursor: carregando ? "not-allowed" : "pointer",
                opacity: carregando ? 0.65 : 1,
                whiteSpace: "nowrap",
            }}
        >
            {carregando ? (
                "..."
            ) : pago ? (
                <>
                    <CheckCircle2 size={13} /> Pago
                </>
            ) : (
                <>
                    <XCircle size={13} /> Pendente
                </>
            )}
        </button>
    );
}

function SectionHeader({ titulo, quantidade, aberto, onToggle, extra, icon: Icon, isMobile }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            style={{
                width: "100%",
                border: "none",
                background: "transparent",
                padding: isMobile ? "12px 0" : "16px 0",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
                cursor: "pointer",
                textAlign: "left",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span
                    style={{
                        width: isMobile ? 34 : 38,
                        height: isMobile ? 34 : 38,
                        borderRadius: 14,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        color: "#8f2745",
                        flexShrink: 0,
                    }}
                >
                    <Icon size={isMobile ? 17 : 19} />
                </span>

                <div style={{ minWidth: 0 }}>
                    <h3
                        style={{
                            margin: 0,
                            fontSize: isMobile ? 15 : 18,
                            color: "#111827",
                            lineHeight: 1.1,
                        }}
                    >
                        {titulo}
                    </h3>
                    <div style={{ marginTop: 4, color: "#64748b", fontSize: isMobile ? 12 : 13 }}>
                        {quantidade} registro(s){extra ? ` • ${extra}` : ""}
                    </div>
                </div>
            </div>

            <span
                style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: aberto ? "#fdf2f8" : "#f8fafc",
                    color: aberto ? "#8f2745" : "#64748b",
                    border: "1px solid #e2e8f0",
                }}
            >
                {aberto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </span>
        </button>
    );
}

function EmptyState({ children }) {
    return (
        <div
            style={{
                padding: 16,
                border: "1px dashed #cbd5e1",
                borderRadius: 18,
                background: "#f8fafc",
                color: "#64748b",
                textAlign: "center",
                fontSize: 14,
            }}
        >
            {children}
        </div>
    );
}

function ExpandButton({ expandido, onClick }) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            aria-label={expandido ? "Recolher" : "Expandir"}
            style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background: expandido ? "#fdf2f8" : "#f8fafc",
                color: expandido ? "#8f2745" : "#64748b",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
            }}
        >
            {expandido ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
    );
}

function ListaItensSacolinha({ itens, mapaPecasPorId, formatarBRL, isMobile }) {
    if (!itens || itens.length === 0) {
        return <EmptyState>Nenhum item encontrado nessa sacolinha.</EmptyState>;
    }

    return (
        <div style={{ display: "grid", gap: 8 }}>
            {itens.map((item, index) => {
                const peca = mapaPecasPorId[String(item.peca_id)] || {};
                const nome = peca.nome || item.nome_peca || item.nome || "-";
                const pago = item.status_pagamento === "pago";

                return (
                    <div
                        key={item.id || `${item.peca_id}-${index}`}
                        style={{
                            display: "grid",
                            gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                            gap: 8,
                            padding: 12,
                            border: "1px solid #e5e7eb",
                            borderRadius: 14,
                            background: "#fff",
                        }}
                    >
                        <div style={{ minWidth: 0 }}>
                            <strong style={{ color: "#111827", wordBreak: "break-word" }}>{nome}</strong>
                            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                                Código: <strong>{item.peca_id || "-"}</strong>
                            </div>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                alignItems: "center",
                                justifyContent: isMobile ? "flex-start" : "flex-end",
                            }}
                        >
                            <Badge tone="primary" icon={Wallet}>
                                {formatarBRL(item.valor_venda || item.valor || 0)}
                            </Badge>
                            <Badge tone={pago ? "success" : "danger"} icon={pago ? CheckCircle2 : XCircle}>
                                {pago ? "Pago" : "Pendente"}
                            </Badge>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function BlocoInfo({ titulo, icon: Icon, children }) {
    return (
        <div
            style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                padding: 14,
                display: "grid",
                gap: 10,
            }}
        >
            <strong style={{ display: "flex", alignItems: "center", gap: 8, color: "#111827" }}>
                {Icon ? <Icon size={17} color="#8f2745" /> : null}
                {titulo}
            </strong>
            {children}
        </div>
    );
}

function SacolinhaCard({
    sacolinha,
    isMobile,
    expandido,
    onExpandir,
    mapaLivesPorId,
    mapaPecasPorId,
    formatarBRL,
    itens,
    pago,
    vencida,
    statusLabel,
    statusTone,
    acoes,
    alterandoPagamentoId,
    alternarPagamentoSacolinha,
}) {
    return (
        <div
            style={{
                padding: isMobile ? 12 : 16,
                borderRadius: 20,
                border: vencida ? "1px solid #fecaca" : "1px solid #e5e7eb",
                background: vencida ? "#fff7f7" : "#fff",
                boxShadow: "0 4px 16px rgba(15,23,42,0.05)",
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                    gap: 12,
                    alignItems: "center",
                }}
            >
                <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "center", minWidth: 0 }}>
                        <ExpandButton expandido={expandido} onClick={onExpandir} />
                        <div style={{ minWidth: 0 }}>
                            <strong
                                style={{
                                    display: "block",
                                    fontSize: isMobile ? 15 : 17,
                                    color: "#111827",
                                    lineHeight: 1.15,
                                    wordBreak: "break-word",
                                }}
                            >
                                {sacolinha.cliente_nome || "Cliente sem nome"}
                            </strong>
                            <span style={{ color: "#64748b", fontSize: 12 }}>
                                Live: {mapaLivesPorId[String(sacolinha.live_id)]?.nome || sacolinha.live_id || "-"}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                        <Badge tone={statusTone}>{statusLabel}</Badge>
                        <Badge tone="muted" icon={Boxes}>{sacolinha.quantidade || 0} peça(s)</Badge>
                        <Badge tone="primary" icon={Wallet}>{formatarBRL(sacolinha.valorTotal || 0)}</Badge>
                        <StatusPagamentoToggle
                            sacolinha={sacolinha}
                            pago={pago}
                            alterandoPagamentoId={alterandoPagamentoId}
                            onTogglePagamento={alternarPagamentoSacolinha}
                        />
                        {vencida ? <Badge tone="danger" icon={Clock3}>Vencida</Badge> : null}
                    </div>
                </div>

                {acoes ? (
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            justifyContent: isMobile ? "flex-start" : "flex-end",
                            flexWrap: "wrap",
                        }}
                    >
                        {acoes}
                    </div>
                ) : null}
            </div>

            {expandido ? (
                <div style={{ marginTop: 14 }}>
                    <ListaItensSacolinha
                        itens={itens}
                        mapaPecasPorId={mapaPecasPorId}
                        formatarBRL={formatarBRL}
                        isMobile={isMobile}
                    />
                </div>
            ) : null}
        </div>
    );
}

export default function ExpedicaoSection({
    boxGrande,
    tituloSecao,
    sacolinhasAgrupadas,
    sacolinhasAbertas,
    sacolinhasSeparadas,
    pedidosEnvioEmMontagem,
    pedidosEnvioConcluidos,
    carregandoPedidosEnvio,
    mostrarAbertas,
    setMostrarAbertas,
    mostrarSeparadas,
    setMostrarSeparadas,
    totalSacolinhasVencidas,
    mostrarPedidosEnvio,
    setMostrarPedidosEnvio,
    mostrarEnviadas,
    setMostrarEnviadas,
    sacolinhasExpandidas,
    toggleExpandirSacolinha,
    pedidosEnvioExpandidos,
    toggleExpandirPedidoEnvio,
    mapaLivesPorId,
    mapaPecasPorId,
    todasVendasLive,
    getStatusSacolinha,
    sacolinhaPodeIrParaExpedicao,
    sacolinhaEstaVencida,
    marcarSacolinhaComoSeparada,
    marcarSacolinhaComoEnviada,
    criarPedidoDeEnvio,
    criandoPedidoEnvioCliente,
    formatarBRL,
    cancelarPedidoDeEnvio,
    pedidoEstaConferido,
    itensConferidosPedido,
    marcarPedidoComoEnviado,
    toggleItemConferidoPedido,
}) {
    const isMobile = typeof window !== "undefined" ? window.innerWidth <= 767 : false;
    const [alterandoPagamentoId, setAlterandoPagamentoId] = useState(null);
    const [statusPagamentoLocal, setStatusPagamentoLocal] = useState({});
    const [pedidoRastreioEditandoId, setPedidoRastreioEditandoId] = useState(null);
    const [salvandoRastreioPedidoId, setSalvandoRastreioPedidoId] = useState(null);
    const [formRastreioPedido, setFormRastreioPedido] = useState({
        codigo_rastreio: "",
        transportadora: "",
        link_rastreio: "",
    });

    const vendasLiveExpedicao = useMemo(() => {
        return (todasVendasLive || []).map((venda) => {
            const sacolinhaId = String(venda.sacolinha_id || "");

            if (!sacolinhaId || !statusPagamentoLocal[sacolinhaId]) return venda;

            return {
                ...venda,
                status_pagamento: statusPagamentoLocal[sacolinhaId],
            };
        });
    }, [todasVendasLive, statusPagamentoLocal]);

    function getSacolinhaComItensAtualizados(sacolinha) {
        return {
            ...sacolinha,
            itens: getItensDaSacolinhaLocal(sacolinha, vendasLiveExpedicao),
        };
    }

    async function alternarPagamentoSacolinha(sacolinha, pagoAtual) {
        if (!sacolinha?.id) return;

        const novoStatus = pagoAtual ? "pendente" : "pago";

        try {
            setAlterandoPagamentoId(sacolinha.id);

            const { data, error } = await supabase
                .from("vendas_live")
                .update({ status_pagamento: novoStatus })
                .eq("sacolinha_id", sacolinha.id)
                .select("id");

            if (error) {
                console.error("ERRO AO ALTERAR PAGAMENTO DA SACOLINHA:", error);
                alert(`Erro ao alterar pagamento: ${error.message}`);
                return;
            }

            if (!data || data.length === 0) {
                alert("Nenhuma venda encontrada dentro dessa sacolinha para atualizar.");
                return;
            }

            setStatusPagamentoLocal((prev) => ({
                ...prev,
                [String(sacolinha.id)]: novoStatus,
            }));
        } catch (error) {
            console.error("ERRO GERAL AO ALTERAR PAGAMENTO DA SACOLINHA:", error);
            alert("Erro inesperado ao alterar pagamento da sacolinha.");
        } finally {
            setAlterandoPagamentoId(null);
        }
    }

    function abrirEdicaoRastreioPedido(pedido) {
        setPedidoRastreioEditandoId(pedido?.id || null);
        setFormRastreioPedido({
            codigo_rastreio: pedido?.codigo_rastreio || "",
            transportadora: pedido?.transportadora || "",
            link_rastreio: pedido?.link_rastreio || "",
        });
    }

    function cancelarEdicaoRastreioPedido() {
        setPedidoRastreioEditandoId(null);
        setFormRastreioPedido({
            codigo_rastreio: "",
            transportadora: "",
            link_rastreio: "",
        });
    }

    async function salvarRastreioPedido(pedidoId) {
        if (!pedidoId || salvandoRastreioPedidoId) return;

        try {
            setSalvandoRastreioPedidoId(pedidoId);

            const payload = {
                codigo_rastreio: String(formRastreioPedido.codigo_rastreio || "").trim() || null,
                transportadora: String(formRastreioPedido.transportadora || "").trim() || null,
                link_rastreio: String(formRastreioPedido.link_rastreio || "").trim() || null,
                atualizado_em: new Date().toISOString(),
            };

            const { error } = await supabase
                .from("pedidos_envio")
                .update(payload)
                .eq("id", pedidoId);

            if (error) {
                console.error("ERRO AO SALVAR RASTREIO:", error);
                alert(`Erro ao salvar rastreio: ${error.message}`);
                return;
            }

            cancelarEdicaoRastreioPedido();
            alert("Rastreio salvo com sucesso. Atualize a expedição se os dados não aparecerem imediatamente.");
        } catch (error) {
            console.error("ERRO GERAL AO SALVAR RASTREIO:", error);
            alert("Erro inesperado ao salvar rastreio.");
        } finally {
            setSalvandoRastreioPedidoId(null);
        }
    }

    function renderRastreamentoPedido(pedido) {
        const editando = pedidoRastreioEditandoId === pedido?.id;
        const salvando = salvandoRastreioPedidoId === pedido?.id;

        if (editando) {
            return (
                <div style={{ display: "grid", gap: 8 }}>
                    <input
                        value={formRastreioPedido.codigo_rastreio}
                        onChange={(e) =>
                            setFormRastreioPedido((prev) => ({
                                ...prev,
                                codigo_rastreio: e.target.value,
                            }))
                        }
                        placeholder="Código de rastreio"
                        style={{
                            minHeight: 40,
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            padding: "0 12px",
                            outline: "none",
                            fontSize: 14,
                        }}
                    />

                    <input
                        value={formRastreioPedido.transportadora}
                        onChange={(e) =>
                            setFormRastreioPedido((prev) => ({
                                ...prev,
                                transportadora: e.target.value,
                            }))
                        }
                        placeholder="Transportadora / Correios"
                        style={{
                            minHeight: 40,
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            padding: "0 12px",
                            outline: "none",
                            fontSize: 14,
                        }}
                    />

                    <input
                        value={formRastreioPedido.link_rastreio}
                        onChange={(e) =>
                            setFormRastreioPedido((prev) => ({
                                ...prev,
                                link_rastreio: e.target.value,
                            }))
                        }
                        placeholder="Link de rastreio (opcional)"
                        style={{
                            minHeight: 40,
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            padding: "0 12px",
                            outline: "none",
                            fontSize: 14,
                        }}
                    />

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                            type="button"
                            disabled={salvando}
                            onClick={(e) => {
                                e.stopPropagation();
                                salvarRastreioPedido(pedido.id);
                            }}
                            style={{
                                minHeight: 40,
                                border: "none",
                                borderRadius: 12,
                                padding: "0 14px",
                                background: "#15803d",
                                color: "#fff",
                                fontWeight: 800,
                                cursor: salvando ? "not-allowed" : "pointer",
                                opacity: salvando ? 0.7 : 1,
                            }}
                        >
                            {salvando ? "Salvando..." : "Salvar rastreio"}
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                cancelarEdicaoRastreioPedido();
                            }}
                            style={{
                                minHeight: 40,
                                border: "1px solid #e2e8f0",
                                borderRadius: 12,
                                padding: "0 14px",
                                background: "#fff",
                                color: "#475569",
                                fontWeight: 800,
                                cursor: "pointer",
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 13, color: "#475569" }}>
                    <strong>Status:</strong> {pedido?.status === "enviado" ? "Enviado" : "Em montagem"}
                </div>

                <div style={{ fontSize: 13, color: "#475569" }}>
                    <strong>Transportadora:</strong> {pedido?.transportadora || "-"}
                </div>

                <div style={{ fontSize: 13, color: "#475569" }}>
                    <strong>Código de rastreio:</strong> {pedido?.codigo_rastreio || "-"}
                </div>

                <div style={{ fontSize: 13, color: "#475569" }}>
                    <strong>Link:</strong>{" "}
                    {pedido?.link_rastreio ? (
                        <a href={pedido.link_rastreio} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontWeight: 800 }}>
                            abrir rastreio
                        </a>
                    ) : (
                        "-"
                    )}
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        abrirEdicaoRastreioPedido(pedido);
                    }}
                    style={{
                        minHeight: 40,
                        border: "1px solid #bfdbfe",
                        borderRadius: 12,
                        padding: "0 14px",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        fontWeight: 900,
                        cursor: "pointer",
                        justifySelf: "start",
                    }}
                >
                    Alimentar rastreio
                </button>
            </div>
        );
    }

    const totais = {
        abertas: sacolinhasAbertas?.length || 0,
        separadas: sacolinhasSeparadas?.length || 0,
        montagem: pedidosEnvioEmMontagem?.length || 0,
        enviadas: pedidosEnvioConcluidos?.length || 0,
    };

    const resumoCards = [
        { label: "Abertas", value: totais.abertas, icon: PackageOpen, tone: "warning" },
        { label: "Separadas", value: totais.separadas, icon: PackageCheck, tone: "primary" },
        { label: "Pedidos", value: totais.montagem, icon: Truck, tone: "default" },
        { label: "Enviadas", value: totais.enviadas, icon: CheckCircle2, tone: "success" },
    ];

    const container = {
        ...boxGrande,
        display: "grid",
        gap: 18,
    };

    const painel = {
        border: "1px solid #f2dfe5",
        borderRadius: 28,
        padding: isMobile ? 14 : 22,
        background: "linear-gradient(180deg, #ffffff 0%, #fffafa 100%)",
        boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
    };

    const lista = {
        marginTop: 8,
        display: "grid",
        gap: 10,
    };

    const divisoria = {
        height: 1,
        background: "#f1e3e8",
        margin: isMobile ? "6px 0" : "8px 0",
    };

    return (
        <div style={container}>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                    gap: 12,
                    alignItems: "center",
                }}
            >
                <div>
                    <h2 style={{ ...tituloSecao, marginBottom: 4 }}>Expedição</h2>
                    <div style={{ color: "#64748b", fontSize: 13 }}>
                        Organização das sacolinhas, conferência e envio dos pedidos.
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end" }}>
                    {totalSacolinhasVencidas > 0 ? (
                        <Badge tone="danger" icon={Clock3}>{totalSacolinhasVencidas} vencida(s)</Badge>
                    ) : (
                        <Badge tone="success" icon={ShieldCheck}>Sem vencidas</Badge>
                    )}
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                }}
            >
                {resumoCards.map((card) => (
                    <div
                        key={card.label}
                        style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 20,
                            background: "#fff",
                            padding: isMobile ? 12 : 14,
                            display: "grid",
                            gap: 8,
                            boxShadow: "0 3px 12px rgba(15,23,42,0.04)",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{card.label}</span>
                            <span style={{ color: "#8f2745" }}><card.icon size={17} /></span>
                        </div>
                        <strong style={{ fontSize: isMobile ? 22 : 26, color: "#111827", lineHeight: 1 }}>{card.value}</strong>
                    </div>
                ))}
            </div>

            {sacolinhasAgrupadas.length === 0 ? (
                <EmptyState>Nenhuma sacolinha encontrada.</EmptyState>
            ) : (
                <div style={painel}>
                    <SectionHeader
                        titulo="Sacolinhas abertas"
                        quantidade={sacolinhasAbertas.length}
                        aberto={mostrarAbertas}
                        onToggle={() => setMostrarAbertas((prev) => !prev)}
                        icon={PackageOpen}
                        isMobile={isMobile}
                    />

                    {mostrarAbertas ? (
                        <div style={lista}>
                            {sacolinhasAbertas.length === 0 ? (
                                <EmptyState>Nenhuma sacolinha aberta.</EmptyState>
                            ) : (
                                sacolinhasAbertas.map((s) => {
                                    const sacolinhaAtualizada = getSacolinhaComItensAtualizados(s);
                                    const vencida = sacolinhaEstaVencida(sacolinhaAtualizada, vendasLiveExpedicao);
                                    const pago = sacolinhaEstaPagaLocal(sacolinhaAtualizada, vendasLiveExpedicao);

                                    return (
                                        <SacolinhaCard
                                            key={s.id}
                                            sacolinha={sacolinhaAtualizada}
                                            isMobile={isMobile}
                                            expandido={!!sacolinhasExpandidas[s.id]}
                                            onExpandir={() => toggleExpandirSacolinha(s.id)}
                                            mapaLivesPorId={mapaLivesPorId}
                                            mapaPecasPorId={mapaPecasPorId}
                                            formatarBRL={formatarBRL}
                                            itens={sacolinhaAtualizada.itens}
                                            pago={pago}
                                            vencida={vencida}
                                            statusLabel="Aberta"
                                            statusTone="warning"
                                            alterandoPagamentoId={alterandoPagamentoId}
                                            alternarPagamentoSacolinha={alternarPagamentoSacolinha}
                                            acoes={
                                                <IconButton
                                                    icon={PackageCheck}
                                                    label="Marcar como separada"
                                                    tone="warning"
                                                    isMobile={isMobile}
                                                    onClick={() => marcarSacolinhaComoSeparada(s.id)}
                                                />
                                            }
                                        />
                                    );
                                })
                            )}
                        </div>
                    ) : null}

                    <div style={divisoria} />

                    <SectionHeader
                        titulo="Separadas"
                        quantidade={sacolinhasSeparadas.length}
                        extra={`Vencidas ${totalSacolinhasVencidas}`}
                        aberto={mostrarSeparadas}
                        onToggle={() => setMostrarSeparadas((prev) => !prev)}
                        icon={PackageCheck}
                        isMobile={isMobile}
                    />

                    {mostrarSeparadas ? (
                        <div style={lista}>
                            {sacolinhasSeparadas.length === 0 ? (
                                <EmptyState>Nenhuma sacolinha separada.</EmptyState>
                            ) : (
                                sacolinhasSeparadas.map((s) => {
                                    const sacolinhaAtualizada = getSacolinhaComItensAtualizados(s);
                                    const statusSacolinha = getStatusSacolinhaLocal(
                                        sacolinhaAtualizada,
                                        vendasLiveExpedicao,
                                        getStatusSacolinha
                                    );
                                    const podeIrParaExpedicao = sacolinhaPodeIrParaExpedicaoLocal(
                                        sacolinhaAtualizada,
                                        vendasLiveExpedicao,
                                        sacolinhaEstaVencida,
                                        sacolinhaPodeIrParaExpedicao
                                    );
                                    const vencida = sacolinhaEstaVencida(sacolinhaAtualizada, vendasLiveExpedicao);
                                    const pago = sacolinhaEstaPagaLocal(sacolinhaAtualizada, vendasLiveExpedicao);

                                    return (
                                        <SacolinhaCard
                                            key={s.id}
                                            sacolinha={sacolinhaAtualizada}
                                            isMobile={isMobile}
                                            expandido={!!sacolinhasExpandidas[s.id]}
                                            onExpandir={() => toggleExpandirSacolinha(s.id)}
                                            mapaLivesPorId={mapaLivesPorId}
                                            mapaPecasPorId={mapaPecasPorId}
                                            formatarBRL={formatarBRL}
                                            itens={sacolinhaAtualizada.itens}
                                            pago={pago}
                                            vencida={vencida}
                                            statusLabel={vencida ? "Vencida" : statusSacolinha === "pronta_envio" ? "Pronta" : "Separada"}
                                            statusTone={vencida ? "danger" : "primary"}
                                            alterandoPagamentoId={alterandoPagamentoId}
                                            alternarPagamentoSacolinha={alternarPagamentoSacolinha}
                                            acoes={
                                                <>
                                                    <IconButton
                                                        icon={PackagePlus}
                                                        label={
                                                            criandoPedidoEnvioCliente === s.cliente_nome
                                                                ? "Criando pedido"
                                                                : "Criar pedido de envio"
                                                        }
                                                        tone="primary"
                                                        isMobile={isMobile}
                                                        disabled={criandoPedidoEnvioCliente === s.cliente_nome}
                                                        onClick={() => criarPedidoDeEnvio(s.cliente_nome)}
                                                    />
                                                    <IconButton
                                                        icon={Send}
                                                        label={podeIrParaExpedicao ? "Marcar como enviada" : "Aguardando pagamento"}
                                                        tone={podeIrParaExpedicao ? "success" : "muted"}
                                                        isMobile={isMobile}
                                                        disabled={!podeIrParaExpedicao}
                                                        onClick={() => marcarSacolinhaComoEnviada(s.id, sacolinhaAtualizada)}
                                                    />
                                                </>
                                            }
                                        />
                                    );
                                })
                            )}
                        </div>
                    ) : null}

                    <div style={divisoria} />

                    <SectionHeader
                        titulo="Pedidos de envio"
                        quantidade={pedidosEnvioEmMontagem.length}
                        aberto={mostrarPedidosEnvio}
                        onToggle={() => setMostrarPedidosEnvio((prev) => !prev)}
                        icon={Truck}
                        isMobile={isMobile}
                    />

                    {mostrarPedidosEnvio ? (
                        <div style={lista}>
                            {carregandoPedidosEnvio ? (
                                <EmptyState>Carregando pedidos de envio...</EmptyState>
                            ) : pedidosEnvioEmMontagem.length === 0 ? (
                                <EmptyState>Nenhum pedido de envio criado ainda.</EmptyState>
                            ) : (
                                pedidosEnvioEmMontagem.map((pedido) => {
                                    const expandido = !!pedidosEnvioExpandidos[pedido.id];
                                    const conferido = pedidoEstaConferido(pedido, itensConferidosPedido);
                                    const totalConferido = (itensConferidosPedido[pedido.id] || []).length;

                                    return (
                                        <div
                                            key={pedido.id}
                                            style={{
                                                padding: isMobile ? 12 : 16,
                                                borderRadius: 20,
                                                border: "1px solid #e5e7eb",
                                                background: "#fff",
                                                boxShadow: "0 4px 16px rgba(15,23,42,0.05)",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                                                    gap: 12,
                                                    alignItems: "center",
                                                }}
                                            >
                                                <div style={{ display: "grid", gap: 10 }}>
                                                    <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                                                        <ExpandButton
                                                            expandido={expandido}
                                                            onClick={() => toggleExpandirPedidoEnvio(pedido.id)}
                                                        />
                                                        <strong style={{ fontSize: isMobile ? 15 : 17, color: "#111827" }}>
                                                            {pedido.cliente_nome}
                                                        </strong>
                                                    </div>

                                                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                                                        <Badge tone="primary" icon={Truck}>{pedido.status}</Badge>
                                                        <Badge tone="muted" icon={Archive}>{pedido.sacolinhas?.length || 0} sacolinha(s)</Badge>
                                                        <Badge tone="muted" icon={Boxes}>{pedido.quantidadeCalculada} peça(s)</Badge>
                                                        <Badge tone="primary" icon={Wallet}>{formatarBRL(pedido.valorTotalPedido || 0)}</Badge>
                                                        <Badge tone={conferido ? "success" : "warning"} icon={FileCheck2}>
                                                            {totalConferido}/{pedido.quantidadeCalculada}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end" }}>
                                                    <IconButton
                                                        icon={RotateCcw}
                                                        label="Voltar para separadas"
                                                        tone="muted"
                                                        isMobile={isMobile}
                                                        onClick={() => cancelarPedidoDeEnvio(pedido.id, pedido.cliente_nome)}
                                                    />
                                                    <IconButton
                                                        icon={Check}
                                                        label="Marcar pedido como enviado"
                                                        tone={conferido ? "success" : "muted"}
                                                        isMobile={isMobile}
                                                        disabled={!conferido}
                                                        onClick={() => marcarPedidoComoEnviado(pedido)}
                                                    />
                                                </div>
                                            </div>

                                            {expandido ? (
                                                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                                                    <BlocoInfo titulo="Sacolinhas incluídas" icon={Archive}>
                                                        {!pedido.sacolinhas || pedido.sacolinhas.length === 0 ? (
                                                            <EmptyState>Nenhuma sacolinha vinculada.</EmptyState>
                                                        ) : (
                                                            pedido.sacolinhas.map((sacolinha) => (
                                                                <div key={sacolinha.id} style={{ padding: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14 }}>
                                                                    <div><strong>Live:</strong> {mapaLivesPorId[String(sacolinha.live_id)]?.nome || sacolinha.live_id || "-"}</div>
                                                                    <div><strong>Sacolinha:</strong> {sacolinha.id}</div>
                                                                    <div><strong>Peças:</strong> {sacolinha.quantidade || 0}</div>
                                                                    <div><strong>Total:</strong> {formatarBRL(sacolinha.valorTotal || 0)}</div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </BlocoInfo>

                                                    <BlocoInfo titulo="Rastreamento" icon={Truck}>
                                                        {renderRastreamentoPedido(pedido)}
                                                    </BlocoInfo>

                                                    <BlocoInfo titulo="Itens do pedido" icon={FileCheck2}>
                                                        {!pedido.itens || pedido.itens.length === 0 ? (
                                                            <EmptyState>Nenhum item encontrado.</EmptyState>
                                                        ) : (
                                                            <div style={{ display: "grid", gap: 8 }}>
                                                                {pedido.itens.map((item, index) => {
                                                                    const itemKey = item.id || `${item.peca_id}-${index}`;
                                                                    const checked = itensConferidosPedido[pedido.id]?.includes(itemKey) || false;
                                                                    const peca = mapaPecasPorId[String(item.peca_id)];

                                                                    return (
                                                                        <label
                                                                            key={itemKey}
                                                                            style={{
                                                                                display: "grid",
                                                                                gridTemplateColumns: "auto 1fr",
                                                                                gap: 10,
                                                                                padding: 12,
                                                                                border: checked ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
                                                                                borderRadius: 14,
                                                                                background: checked ? "#ecfdf5" : "#fff",
                                                                                cursor: "pointer",
                                                                            }}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() => toggleItemConferidoPedido(pedido.id, itemKey)}
                                                                            />
                                                                            <div>
                                                                                <strong>{peca?.nome || item.nome_peca || item.nome || "-"}</strong>
                                                                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Código: {item.peca_id || "-"}</div>
                                                                                <div style={{ fontSize: 12, color: "#64748b" }}>Valor: {formatarBRL(item.valor_venda || item.valor || 0)}</div>
                                                                            </div>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </BlocoInfo>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : null}

                    <div style={divisoria} />

                    <SectionHeader
                        titulo="Enviadas"
                        quantidade={pedidosEnvioConcluidos.length}
                        aberto={mostrarEnviadas}
                        onToggle={() => setMostrarEnviadas((prev) => !prev)}
                        icon={BadgeCheck}
                        isMobile={isMobile}
                    />

                    {mostrarEnviadas ? (
                        <div style={lista}>
                            {pedidosEnvioConcluidos.length === 0 ? (
                                <EmptyState>Nenhum pedido enviado ainda.</EmptyState>
                            ) : (
                                pedidosEnvioConcluidos.map((pedido) => {
                                    const expandido = !!pedidosEnvioExpandidos[pedido.id];

                                    return (
                                        <div
                                            key={pedido.id}
                                            style={{
                                                padding: isMobile ? 12 : 16,
                                                borderRadius: 20,
                                                border: "1px solid #d1fae5",
                                                background: "#f7fffb",
                                                boxShadow: "0 4px 16px rgba(15,23,42,0.04)",
                                            }}
                                        >
                                            <div style={{ display: "grid", gap: 10 }}>
                                                <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                                                    <ExpandButton expandido={expandido} onClick={() => toggleExpandirPedidoEnvio(pedido.id)} />
                                                    <strong style={{ fontSize: isMobile ? 15 : 17, color: "#111827" }}>{pedido.cliente_nome}</strong>
                                                </div>

                                                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                                                    <Badge tone="success" icon={CheckCircle2}>Enviado</Badge>
                                                    <Badge tone="muted" icon={Archive}>{pedido.sacolinhas?.length || 0} sacolinha(s)</Badge>
                                                    <Badge tone="muted" icon={Boxes}>{pedido.quantidadeCalculada} peça(s)</Badge>
                                                    <Badge tone="primary" icon={Wallet}>{formatarBRL(pedido.valorTotalPedido || 0)}</Badge>
                                                    <Badge tone="success" icon={Clock3}>{formatarDataHoraBR(pedido.enviado_em) || "-"}</Badge>
                                                </div>
                                            </div>

                                            {expandido ? (
                                                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                                                    <BlocoInfo titulo="Sacolinhas enviadas" icon={Archive}>
                                                        {!pedido.sacolinhas || pedido.sacolinhas.length === 0 ? (
                                                            <EmptyState>Nenhuma sacolinha vinculada.</EmptyState>
                                                        ) : (
                                                            pedido.sacolinhas.map((sacolinha) => (
                                                                <div key={sacolinha.id} style={{ padding: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14 }}>
                                                                    <div><strong>Live:</strong> {mapaLivesPorId[String(sacolinha.live_id)]?.nome || sacolinha.live_id || "-"}</div>
                                                                    <div><strong>Sacolinha:</strong> {sacolinha.id}</div>
                                                                    <div><strong>Peças:</strong> {sacolinha.quantidade || 0}</div>
                                                                    <div><strong>Total:</strong> {formatarBRL(sacolinha.valorTotal || 0)}</div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </BlocoInfo>

                                                    <BlocoInfo titulo="Rastreamento" icon={Truck}>
                                                        {renderRastreamentoPedido(pedido)}
                                                    </BlocoInfo>

                                                    <BlocoInfo titulo="Itens enviados" icon={CheckCircle2}>
                                                        {!pedido.itens || pedido.itens.length === 0 ? (
                                                            <EmptyState>Nenhum item encontrado.</EmptyState>
                                                        ) : (
                                                            <div style={{ display: "grid", gap: 8 }}>
                                                                {pedido.itens.map((item, index) => (
                                                                    <div key={item.id || `${item.peca_id}-${index}`} style={{ padding: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14 }}>
                                                                        <strong>{item.nome_peca || item.nome || "-"}</strong>
                                                                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Código: {item.peca_id || "-"}</div>
                                                                        <div style={{ fontSize: 12, color: "#64748b" }}>Valor: {formatarBRL(item.valor_venda || item.valor || 0)}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </BlocoInfo>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
