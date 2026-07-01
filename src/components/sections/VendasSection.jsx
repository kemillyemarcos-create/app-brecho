import { useState, useMemo, useEffect } from "react";
import {
    Banknote,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    FileSpreadsheet,
    Link2,
    QrCode,
    ReceiptText,
    RotateCcw,
    Save,
    Search,
    Send,
    UserCheck,
    Users,
    XCircle,
} from "lucide-react";
import { formatarDataHoraBR } from "../../utils/dateUtils";

export default function VendasSection({
    boxGrande,
    tituloSecao,
    cabecalhoSecao,
    linhaResumo,
    cardResumo,
    valorResumo,
    cardCliente,
    itemCliente,
    botao,
    botaoPequeno,
    input,
    gridVendas,
    gridForm,
    previewBox,
    semFoto,
    isMobile,
    scannerAtivo,
    setScannerAtivo,
    scannerElementId,
    vendaId,
    setVendaId,
    sugestoesPecasVenda,
    mostrarSugestoesVenda,
    setMostrarSugestoesVenda,
    cliente,
    setCliente,
    filaEspera,
    setFilaEspera,
    valorDesconto,
    setValorDesconto,
    formatarValorDescontoInput,
    registrarVenda,
    salvandoVenda,
    liveEmVisualizacao,
    buscaCliente,
    setBuscaCliente,
    filtroPagamentoCliente,
    setFiltroPagamentoCliente,
    totalPecasLive,
    faturamentoLive,
    lucroEstimadoLive,
    clientesFiltrados,
    clientesExpandidos,
    toggleExpandirCliente,
    exportarClienteCSV,
    gerarComanda,
    copiarMensagemPortalCliente,
    togglePagamentoClienteLive,
    cancelarVenda,
    passarVendaParaFila,
    formatarBRL,
}) {
    const [mostrarSugestoesCliente, setMostrarSugestoesCliente] = useState(false);
    const [indiceSugestaoClienteAtiva, setIndiceSugestaoClienteAtiva] = useState(-1);
    const [indiceSugestaoPecaAtiva, setIndiceSugestaoPecaAtiva] = useState(-1);
    const [mostrarSugestoesFila, setMostrarSugestoesFila] = useState(false);
    const [indiceSugestaoFilaAtiva, setIndiceSugestaoFilaAtiva] = useState(-1);

    const sugestoesClientesLive = useMemo(() => {
        const termo = String(cliente || "").trim().toLowerCase();
        if (termo.length < 1) return [];

        const mapaNomes = new Map();

        (clientesFiltrados || []).forEach((clienteResumo) => {
            const nomeOriginal = String(clienteResumo?.nome || "").trim();
            const nomeNormalizado = nomeOriginal.toLowerCase();

            if (!nomeOriginal) return;
            if (!nomeNormalizado.startsWith(termo)) return;

            if (!mapaNomes.has(nomeNormalizado)) {
                mapaNomes.set(nomeNormalizado, nomeOriginal);
            }
        });

        return [...mapaNomes.values()]
            .sort((a, b) =>
                a.localeCompare(b, "pt-BR", {
                    sensitivity: "base",
                })
            )
            .slice(0, 8);
    }, [cliente, clientesFiltrados]);

    const sugestoesFilaLive = useMemo(() => {
        const termo = String(filaEspera || "").trim().toLowerCase();
        if (termo.length < 1) return [];

        const mapaNomes = new Map();

        (clientesFiltrados || []).forEach((clienteResumo) => {
            const nomeOriginal = String(clienteResumo?.nome || "").trim();
            const nomeNormalizado = nomeOriginal.toLowerCase();

            if (!nomeOriginal) return;
            if (!nomeNormalizado.startsWith(termo)) return;

            if (!mapaNomes.has(nomeNormalizado)) {
                mapaNomes.set(nomeNormalizado, nomeOriginal);
            }
        });

        return [...mapaNomes.values()]
            .sort((a, b) =>
                a.localeCompare(b, "pt-BR", {
                    sensitivity: "base",
                })
            )
            .slice(0, 8);
    }, [filaEspera, clientesFiltrados]);

    useEffect(() => {
        if (mostrarSugestoesCliente && sugestoesClientesLive.length > 0) {
            setIndiceSugestaoClienteAtiva(0);
        } else {
            setIndiceSugestaoClienteAtiva(-1);
        }
    }, [mostrarSugestoesCliente, sugestoesClientesLive]);

    useEffect(() => {
        if (mostrarSugestoesVenda && sugestoesPecasVenda.length > 0) {
            setIndiceSugestaoPecaAtiva(0);
        } else {
            setIndiceSugestaoPecaAtiva(-1);
        }
    }, [mostrarSugestoesVenda, sugestoesPecasVenda]);

    useEffect(() => {
        if (mostrarSugestoesFila && sugestoesFilaLive.length > 0) {
            setIndiceSugestaoFilaAtiva(0);
        } else {
            setIndiceSugestaoFilaAtiva(-1);
        }
    }, [mostrarSugestoesFila, sugestoesFilaLive]);

    function selecionarSugestaoCliente(nomeSugestao) {
        setCliente(nomeSugestao);
        setMostrarSugestoesCliente(false);
        setIndiceSugestaoClienteAtiva(-1);
    }

    function selecionarSugestaoPeca(peca) {
        setVendaId(String(peca.id));
        setMostrarSugestoesVenda(false);
        setIndiceSugestaoPecaAtiva(-1);
    }

    function selecionarSugestaoFila(nomeSugestao) {
        setFilaEspera(nomeSugestao);
        setMostrarSugestoesFila(false);
        setIndiceSugestaoFilaAtiva(-1);
    }

    function handleKeyDownCliente(e) {
        if (!mostrarSugestoesCliente || sugestoesClientesLive.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndiceSugestaoClienteAtiva((prev) =>
                prev < sugestoesClientesLive.length - 1 ? prev + 1 : 0
            );
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndiceSugestaoClienteAtiva((prev) =>
                prev > 0 ? prev - 1 : sugestoesClientesLive.length - 1
            );
            return;
        }

        if (e.key === "Enter") {
            if (indiceSugestaoClienteAtiva >= 0) {
                e.preventDefault();
                selecionarSugestaoCliente(sugestoesClientesLive[indiceSugestaoClienteAtiva]);
            }
            return;
        }

        if (e.key === "Escape") {
            e.preventDefault();
            setMostrarSugestoesCliente(false);
            setIndiceSugestaoClienteAtiva(-1);
        }
    }

    function handleKeyDownPeca(e) {
        if (!mostrarSugestoesVenda || sugestoesPecasVenda.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndiceSugestaoPecaAtiva((prev) =>
                prev < sugestoesPecasVenda.length - 1 ? prev + 1 : 0
            );
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndiceSugestaoPecaAtiva((prev) =>
                prev > 0 ? prev - 1 : sugestoesPecasVenda.length - 1
            );
            return;
        }

        if (e.key === "Enter") {
            if (indiceSugestaoPecaAtiva >= 0) {
                e.preventDefault();
                selecionarSugestaoPeca(sugestoesPecasVenda[indiceSugestaoPecaAtiva]);
            }
            return;
        }

        if (e.key === "Escape") {
            e.preventDefault();
            setMostrarSugestoesVenda(false);
            setIndiceSugestaoPecaAtiva(-1);
        }
    }

    function handleKeyDownFila(e) {
        if (!mostrarSugestoesFila || sugestoesFilaLive.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndiceSugestaoFilaAtiva((prev) =>
                prev < sugestoesFilaLive.length - 1 ? prev + 1 : 0
            );
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndiceSugestaoFilaAtiva((prev) =>
                prev > 0 ? prev - 1 : sugestoesFilaLive.length - 1
            );
            return;
        }

        if (e.key === "Enter") {
            if (indiceSugestaoFilaAtiva >= 0) {
                e.preventDefault();
                selecionarSugestaoFila(sugestoesFilaLive[indiceSugestaoFilaAtiva]);
            }
            return;
        }

        if (e.key === "Escape") {
            e.preventDefault();
            setMostrarSugestoesFila(false);
            setIndiceSugestaoFilaAtiva(-1);
        }
    }

    const iconeBotao = ({ ativo = false, danger = false, warning = false, success = false, width = "auto" } = {}) => ({
        minHeight: isMobile ? 36 : 40,
        width,
        padding: isMobile ? "7px 10px" : "8px 12px",
        borderRadius: 12,
        border: ativo
            ? "1px solid rgba(221, 83, 116, 0.35)"
            : danger
            ? "1px solid rgba(185, 28, 28, 0.22)"
            : warning
            ? "1px solid rgba(180, 83, 9, 0.22)"
            : success
            ? "1px solid rgba(21, 128, 61, 0.22)"
            : "1px solid #ead8df",
        background: ativo
            ? "#f8dce6"
            : danger
            ? "#fff1f2"
            : warning
            ? "#fffbeb"
            : success
            ? "#ecfdf5"
            : "#fff",
        color: danger ? "#b91c1c" : warning ? "#b45309" : success ? "#15803d" : "#8f2745",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        cursor: "pointer",
        fontWeight: 800,
        fontSize: isMobile ? 11.5 : 13,
        lineHeight: 1,
        boxShadow: "0 2px 8px rgba(143,39,69,0.05)",
        whiteSpace: "nowrap",
    });

    const botaoCircular = ({ danger = false, warning = false, success = false } = {}) => ({
        width: isMobile ? 38 : 40,
        height: isMobile ? 38 : 40,
        borderRadius: 12,
        border: danger
            ? "1px solid rgba(185, 28, 28, 0.22)"
            : warning
            ? "1px solid rgba(180, 83, 9, 0.22)"
            : success
            ? "1px solid rgba(21, 128, 61, 0.22)"
            : "1px solid #ead8df",
        background: danger ? "#fff1f2" : warning ? "#fffbeb" : success ? "#ecfdf5" : "#fff",
        color: danger ? "#b91c1c" : warning ? "#b45309" : success ? "#15803d" : "#8f2745",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(143,39,69,0.05)",
        flexShrink: 0,
    });

    const filtroButtonStyle = (ativo, tipo = "padrao") =>
        iconeBotao({
            ativo,
            warning: tipo === "pendente" && ativo,
            success: tipo === "pago" && ativo,
            width: isMobile ? "100%" : "auto",
        });

    return (
        <div style={{ display: "grid", gap: 24 }}>
            <div style={boxGrande}>
                <h2 style={tituloSecao}>Registro de Vendas</h2>

                <div className="grid-vendas" style={gridVendas}>
                    <div style={gridForm}>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                                gap: 12,
                                width: "100%",
                            }}
                        >
                            <div style={{ position: "relative", width: "100%" }}>
                                <input
                                    style={input}
                                    placeholder="Código da peça"
                                    value={vendaId}
                                    onChange={(e) => {
                                        const valor = e.target.value;
                                        setVendaId(valor);

                                        if (valor.trim().length >= 4) {
                                            setMostrarSugestoesVenda(true);
                                        } else {
                                            setMostrarSugestoesVenda(false);
                                        }
                                    }}
                                    onFocus={() => {
                                        if (String(vendaId || "").trim().length >= 4) {
                                            setMostrarSugestoesVenda(true);
                                        }
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            setMostrarSugestoesVenda(false);
                                            setIndiceSugestaoPecaAtiva(-1);
                                        }, 150);
                                    }}
                                    onKeyDown={handleKeyDownPeca}
                                    autoComplete="off"
                                />

                                {mostrarSugestoesVenda && sugestoesPecasVenda.length > 0 && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "100%",
                                            left: 0,
                                            right: 0,
                                            zIndex: 30,
                                            background: "#fff",
                                            border: "1px solid #d1d5db",
                                            borderRadius: 10,
                                            marginTop: 4,
                                            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                                            maxHeight: 260,
                                            overflowY: "auto",
                                        }}
                                    >
                                        {sugestoesPecasVenda.map((peca, index) => {
                                            const ativo = index === indiceSugestaoPecaAtiva;

                                            return (
                                                <button
                                                    key={peca.id}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => selecionarSugestaoPeca(peca)}
                                                    onMouseEnter={() => setIndiceSugestaoPecaAtiva(index)}
                                                    style={{
                                                        width: "100%",
                                                        textAlign: "left",
                                                        padding: "10px 12px",
                                                        border: "none",
                                                        borderBottom: "1px solid #f1f5f9",
                                                        background: ativo ? "#e2e8f0" : "#fff",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <div style={{ fontWeight: "bold" }}>
                                                        {peca.id} • {peca.nome || "Sem nome"}
                                                    </div>
                                                    <div style={{ fontSize: 13, color: "#64748b" }}>
                                                        {peca.venda || "Sem valor"} {peca.obs ? `• ${peca.obs}` : ""}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <input
                                style={input}
                                placeholder="Valor com desconto (opcional)"
                                value={valorDesconto}
                                onChange={(e) => setValorDesconto(formatarValorDescontoInput(e.target.value))}
                                inputMode="numeric"
                            />

                            <div style={{ position: "relative", width: "100%" }}>
                                <input
                                    style={input}
                                    placeholder="Nome da cliente"
                                    value={cliente}
                                    onChange={(e) => {
                                        const valor = e.target.value;
                                        setCliente(valor);
                                        setMostrarSugestoesCliente(valor.trim().length > 0);
                                    }}
                                    onFocus={() => {
                                        if (String(cliente || "").trim().length > 0) {
                                            setMostrarSugestoesCliente(true);
                                        }
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            setMostrarSugestoesCliente(false);
                                            setIndiceSugestaoClienteAtiva(-1);
                                        }, 150);
                                    }}
                                    onKeyDown={handleKeyDownCliente}
                                    autoComplete="off"
                                />

                                {mostrarSugestoesCliente && sugestoesClientesLive.length > 0 && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "100%",
                                            left: 0,
                                            right: 0,
                                            zIndex: 30,
                                            background: "#fff",
                                            border: "1px solid #d1d5db",
                                            borderRadius: 10,
                                            marginTop: 4,
                                            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                                            maxHeight: 260,
                                            overflowY: "auto",
                                        }}
                                    >
                                        {sugestoesClientesLive.map((nomeSugestao, index) => {
                                            const ativo = index === indiceSugestaoClienteAtiva;

                                            return (
                                                <button
                                                    key={nomeSugestao}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => selecionarSugestaoCliente(nomeSugestao)}
                                                    onMouseEnter={() => setIndiceSugestaoClienteAtiva(index)}
                                                    style={{
                                                        width: "100%",
                                                        textAlign: "left",
                                                        padding: "10px 12px",
                                                        border: "none",
                                                        borderBottom: "1px solid #f1f5f9",
                                                        background: ativo ? "#e2e8f0" : "#fff",
                                                        cursor: "pointer",
                                                        fontSize: 15,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {nomeSugestao}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div style={{ position: "relative", width: "100%" }}>
                                <input
                                    style={input}
                                    placeholder="Fila (opcional)"
                                    value={filaEspera}
                                    onChange={(e) => {
                                        const valor = e.target.value;
                                        setFilaEspera(valor);
                                        setMostrarSugestoesFila(valor.trim().length > 0);
                                    }}
                                    onFocus={() => {
                                        if (String(filaEspera || "").trim().length > 0) {
                                            setMostrarSugestoesFila(true);
                                        }
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            setMostrarSugestoesFila(false);
                                            setIndiceSugestaoFilaAtiva(-1);
                                        }, 150);
                                    }}
                                    onKeyDown={handleKeyDownFila}
                                    autoComplete="off"
                                />

                                {mostrarSugestoesFila && sugestoesFilaLive.length > 0 && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "100%",
                                            left: 0,
                                            right: 0,
                                            zIndex: 30,
                                            background: "#fff",
                                            border: "1px solid #d1d5db",
                                            borderRadius: 10,
                                            marginTop: 4,
                                            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                                            maxHeight: 260,
                                            overflowY: "auto",
                                        }}
                                    >
                                        {sugestoesFilaLive.map((nomeSugestao, index) => {
                                            const ativo = index === indiceSugestaoFilaAtiva;

                                            return (
                                                <button
                                                    key={nomeSugestao}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => selecionarSugestaoFila(nomeSugestao)}
                                                    onMouseEnter={() => setIndiceSugestaoFilaAtiva(index)}
                                                    style={{
                                                        width: "100%",
                                                        textAlign: "left",
                                                        padding: "10px 12px",
                                                        border: "none",
                                                        borderBottom: "1px solid #f1f5f9",
                                                        background: ativo ? "#e2e8f0" : "#fff",
                                                        cursor: "pointer",
                                                        fontSize: 15,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {nomeSugestao}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                                gap: 10,
                                width: "100%",
                            }}
                        >
                            <button
                                style={{
                                    ...iconeBotao({ ativo: true, width: "100%" }),
                                    opacity: salvandoVenda ? 0.7 : 1,
                                    cursor: salvandoVenda ? "not-allowed" : "pointer",
                                }}
                                onClick={registrarVenda}
                                disabled={salvandoVenda}
                            >
                                <Save size={16} />
                                {salvandoVenda ? "Salvando..." : "Registrar venda"}
                            </button>

                            <button
                                style={iconeBotao({ success: scannerAtivo, width: "100%" })}
                                onClick={() => setScannerAtivo((prev) => !prev)}
                            >
                                <QrCode size={16} />
                                {scannerAtivo ? "Fechar scanner" : "Ler QR Code"}
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            ...previewBox,
                            minHeight: isMobile ? "auto" : undefined,
                            padding: isMobile ? 16 : previewBox.padding,
                        }}
                    >
                        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Scanner</h3>

                        {scannerAtivo ? (
                            <div>
                                <div
                                    id={scannerElementId}
                                    style={{
                                        width: "100%",
                                        minHeight: isMobile ? 220 : 280,
                                        overflow: "hidden",
                                        borderRadius: 12,
                                        border: "1px solid #ddd",
                                        padding: 8,
                                        background: "#fff",
                                        boxSizing: "border-box",
                                    }}
                                />
                                <p style={{ fontSize: 14, color: "#555", marginTop: 10 }}>
                                    Aponte a câmera para o QR Code da peça.
                                </p>
                            </div>
                        ) : (
                            <div
                                style={{
                                    ...semFoto,
                                    minHeight: isMobile ? 120 : 180,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                Scanner fechado
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={boxGrande}>
                <div style={cabecalhoSecao}>
                    <h2 style={tituloSecao}>
                        {liveEmVisualizacao
                            ? `Resumo por Clientes - ${liveEmVisualizacao.nome}`
                            : "Resumo por Clientes"}
                    </h2>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 320px) auto auto auto",
                            gap: 8,
                            alignItems: "center",
                        }}
                    >
                        <div style={{ position: "relative" }}>
                            <Search
                                size={16}
                                style={{
                                    position: "absolute",
                                    left: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "#94a3b8",
                                    pointerEvents: "none",
                                }}
                            />
                            <input
                                style={{ ...input, maxWidth: "100%", paddingLeft: 36 }}
                                placeholder="Buscar cliente"
                                value={buscaCliente}
                                onChange={(e) => setBuscaCliente(e.target.value)}
                            />
                        </div>

                        <button
                            style={filtroButtonStyle(filtroPagamentoCliente === "todos")}
                            onClick={() => setFiltroPagamentoCliente("todos")}
                            title="Todos"
                        >
                            <Users size={16} />
                            Todos
                        </button>

                        <button
                            style={filtroButtonStyle(filtroPagamentoCliente === "pendentes", "pendente")}
                            onClick={() => setFiltroPagamentoCliente("pendentes")}
                            title="Pendentes"
                        >
                            <XCircle size={16} />
                            Pendentes
                        </button>

                        <button
                            style={filtroButtonStyle(filtroPagamentoCliente === "pagos", "pago")}
                            onClick={() => setFiltroPagamentoCliente("pagos")}
                            title="Pagos"
                        >
                            <CheckCircle2 size={16} />
                            Pagos
                        </button>
                    </div>
                </div>

                {liveEmVisualizacao && (
                    <div className="linha-resumo" style={linhaResumo}>
                        <div style={cardResumo}>
                            <strong>Peças da live</strong>
                            <div style={valorResumo}>{totalPecasLive}</div>
                        </div>

                        <div style={cardResumo}>
                            <strong>Faturamento da live</strong>
                            <div style={valorResumo}>{formatarBRL(faturamentoLive)}</div>
                        </div>

                        <div style={cardResumo}>
                            <strong>Lucro estimado da live</strong>
                            <div style={valorResumo}>{formatarBRL(lucroEstimadoLive)}</div>
                        </div>
                    </div>
                )}

                {!liveEmVisualizacao ? (
                    <p>Inicie uma live ou abra uma live do histórico para visualizar o resumo por clientes.</p>
                ) : clientesFiltrados.length === 0 ? (
                    <p>Nenhuma cliente registrada nessa live ainda.</p>
                ) : (
                    <div style={{ display: "grid", gap: 14 }}>
                        {[...clientesFiltrados]
                            .sort((a, b) =>
                                (a.nome || "")
                                    .toString()
                                    .localeCompare((b.nome || "").toString(), "pt-BR", {
                                        sensitivity: "base",
                                    })
                            )
                            .map((c) => {
                                const expandido = !!clientesExpandidos[c.nome];

                                return (
                                    <div key={c.nome} style={{ ...cardCliente, padding: isMobile ? 13 : cardCliente.padding }}>
                                        <div
                                            style={
                                                isMobile
                                                    ? {
                                                          display: "grid",
                                                          gap: 12,
                                                          alignItems: "start",
                                                      }
                                                    : {
                                                          display: "grid",
                                                          gridTemplateColumns: "minmax(220px, 1.2fr) auto minmax(180px, auto)",
                                                          gap: 16,
                                                          alignItems: "center",
                                                      }
                                            }
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    minWidth: 0,
                                                    overflow: "hidden",
                                                }}
                                            >
                                                <button
                                                    onClick={() => toggleExpandirCliente(c.nome)}
                                                    style={botaoCircular()}
                                                    title={expandido ? "Minimizar" : "Expandir"}
                                                >
                                                    <ChevronRight
                                                        size={18}
                                                        style={{
                                                            transform: expandido ? "rotate(90deg)" : "rotate(0deg)",
                                                            transition: "transform 0.15s ease",
                                                        }}
                                                    />
                                                </button>

                                                <div style={{ minWidth: 0 }}>
                                                    <strong
                                                        style={{
                                                            display: "block",
                                                            fontSize: isMobile ? 16 : 18,
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                        title={c.nome}
                                                    >
                                                        {c.nome}
                                                    </strong>
                                                    <span style={{ color: "#64748b", fontSize: 13 }}>
                                                        {c.pecas} peça(s) • {formatarBRL(c.total)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: isMobile ? "stretch" : "flex-start",
                                                    gap: 8,
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <button
                                                    style={iconeBotao({ width: isMobile ? "100%" : "auto" })}
                                                    onClick={() => exportarClienteCSV(c)}
                                                    title="Exportar CSV"
                                                >
                                                    <FileSpreadsheet size={16} />
                                                    CSV
                                                </button>

                                                <button
                                                    style={iconeBotao({ ativo: true, width: isMobile ? "100%" : "auto" })}
                                                    onClick={() => gerarComanda(c)}
                                                    title="Gerar comanda"
                                                >
                                                    <ReceiptText size={16} />
                                                    Comanda
                                                </button>

                                                <button
                                                    style={iconeBotao({ width: isMobile ? "100%" : "auto" })}
                                                    onClick={() => copiarMensagemPortalCliente?.(c)}
                                                    title="Copiar mensagem do portal da cliente"
                                                >
                                                    <Link2 size={16} />
                                                    Portal
                                                </button>

                                                <button
                                                    style={iconeBotao({
                                                        success: c.pago,
                                                        warning: !c.pago,
                                                        width: isMobile ? "100%" : "auto",
                                                    })}
                                                    onClick={() => togglePagamentoClienteLive(c.nome, c.pago)}
                                                    title={c.pago ? "Marcar como pendente" : "Marcar como pago"}
                                                >
                                                    {c.pago ? <CheckCircle2 size={16} /> : <Banknote size={16} />}
                                                    {c.pago ? "Pago" : "Pendente"}
                                                </button>
                                            </div>

                                            {!isMobile && (
                                                <div
                                                    className="expedicao-info-direita"
                                                    style={{
                                                        display: "grid",
                                                        gap: 2,
                                                        justifyContent: "end",
                                                        textAlign: "right",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    <span>{c.pecas} peça(s)</span>
                                                    <strong>{formatarBRL(c.total)}</strong>
                                                </div>
                                            )}
                                        </div>

                                        {expandido && (
                                            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                                                {c.itens.map((item, index) => (
                                                    <div key={`${item.codigo}-${index}`} style={itemCliente}>
                                                        <div>
                                                            <strong>Peça:</strong> {item.nomePeca}
                                                        </div>

                                                        <div>
                                                            <strong>Código:</strong> {item.codigo}
                                                        </div>

                                                        <div>
                                                            <strong>Valor:</strong> {formatarBRL(item.valor)}
                                                        </div>

                                                        <div>
                                                            <strong>Vendido em:</strong>{" "}
                                                            {item.dataVenda ? formatarDataHoraBR(item.dataVenda) : "-"}
                                                        </div>

                                                        {item.filaEspera ? (
                                                            <div>
                                                                <strong>Fila:</strong> {item.filaEspera}
                                                            </div>
                                                        ) : null}

                                                        <div
                                                            style={{
                                                                marginTop: 8,
                                                                display: "flex",
                                                                gap: 8,
                                                                flexWrap: "wrap",
                                                                alignItems: "center",
                                                            }}
                                                        >
                                                            <button
                                                                style={iconeBotao({ danger: true, width: isMobile ? "100%" : "auto" })}
                                                                onClick={() => cancelarVenda(item.codigo)}
                                                                title="Cancelar venda"
                                                            >
                                                                <RotateCcw size={16} />
                                                                Cancelar venda
                                                            </button>

                                                            {item.filaEspera ? (
                                                                <button
                                                                    style={iconeBotao({ ativo: true, width: isMobile ? "100%" : "auto" })}
                                                                    onClick={() => passarVendaParaFila(item.codigo)}
                                                                    title="Passar para fila"
                                                                >
                                                                    <Send size={16} />
                                                                    Passar para fila
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>
        </div>
    );
}
