import { QRCodeCanvas } from "qrcode.react";

export default function EstoqueSection({
    pecasFiltradas,
    totalPecas,
    totalDisponiveis,
    totalVendidas,
    buscaPeca,
    setBuscaPeca,
    filtroEstoque,
    setFiltroEstoque,
    etiquetasSelecionadas,
    toggleEtiqueta,
    marcarTodasEtiquetas,
    desmarcarTodasEtiquetas,
    imprimirEtiquetasSelecionadas,
    abrirPreview,
    PREVIEW_TIPO,
    cancelarVenda,
    removerPeca,
    formatarBRL,
    boxGrande,
    cabecalhoSecao,
    tituloSecao,
    linhaResumoHorizontal,
    cardResumo,
    valorResumo,
    linhaFiltros,
    input,
    botao,
    botaoPequeno,
    gridPecas,
    cardPeca,
    textoItem,
}) {
    const isMobile = typeof window !== "undefined" ? window.innerWidth <= 767 : false;

    const botaoFiltroBase = {
        ...botaoPequeno,
        width: "auto",
        minWidth: isMobile ? 82 : 100,
        minHeight: isMobile ? 34 : 38,
        padding: isMobile ? "6px 10px" : "7px 13px",
        borderRadius: 10,
        fontSize: isMobile ? 11 : 13,
        lineHeight: 1.05,
        boxShadow: "none",
    };

    const botaoAcaoTopo = {
        ...botao,
        width: "100%",
        minHeight: isMobile ? 34 : 44,
        padding: isMobile ? "7px 10px" : "9px 14px",
        borderRadius: isMobile ? 12 : 13,
        fontSize: isMobile ? 11.5 : 14,
        lineHeight: 1.05,
        boxShadow: "none",
    };

    const botaoAcaoCard = {
        ...botaoPequeno,
        width: "100%",
        minHeight: isMobile ? 28 : 40,
        padding: isMobile ? "4px 8px" : "8px 13px",
        borderRadius: isMobile ? 8 : 12,
        fontSize: isMobile ? 10.5 : 13,
        fontWeight: 600,
        lineHeight: 1.05,
        letterSpacing: 0.2,
        boxShadow: "none",
    };

    const textoCompacto = {
        ...textoItem,
        margin: 0,
        fontSize: isMobile ? 11.5 : 14,
        lineHeight: isMobile ? 1.18 : 1.35,
        color: "#475569",
    };

    const tituloPecaStyle = {
        display: "block",
        fontSize: isMobile ? 14 : 18,
        marginBottom: isMobile ? 4 : 8,
        lineHeight: 1.12,
        wordBreak: "break-word",
        color: "#111827",
    };

    const estiloInputBusca = {
        ...input,
        width: "100%",
        maxWidth: "100%",
        minHeight: isMobile ? 38 : input.minHeight,
        height: isMobile ? 38 : input.height,
        padding: isMobile ? "8px 12px" : input.padding,
        fontSize: isMobile ? 13 : undefined,
        borderRadius: isMobile ? 12 : input.borderRadius,
    };

    return (
        <div style={boxGrande}>
            <div style={cabecalhoSecao}>
                <h2 style={tituloSecao}>Peças</h2>

                <div style={linhaResumoHorizontal}>
                    <div style={cardResumo}>
                        <strong>Total de peças</strong>
                        <div style={valorResumo}>{totalPecas}</div>
                    </div>

                    <div style={cardResumo}>
                        <strong>Disponíveis</strong>
                        <div style={valorResumo}>{totalDisponiveis}</div>
                    </div>

                    <div style={cardResumo}>
                        <strong>Vendidas</strong>
                        <div style={valorResumo}>{totalVendidas}</div>
                    </div>
                </div>

                <div
                    style={{
                        ...linhaFiltros,
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "minmax(260px, 420px) auto auto auto",
                        gap: isMobile ? 8 : 10,
                        alignItems: "center",
                    }}
                >
                    <input
                        style={estiloInputBusca}
                        placeholder="Buscar por peça, código ou cliente"
                        value={buscaPeca}
                        onChange={(e) => setBuscaPeca(e.target.value)}
                    />

                    <button
                        style={
                            filtroEstoque === "todas"
                                ? { ...botaoFiltroBase, background: "#0f172a" }
                                : { ...botaoFiltroBase, background: "#6b7280" }
                        }
                        onClick={() => setFiltroEstoque("todas")}
                    >
                        Todas
                    </button>

                    <button
                        style={
                            filtroEstoque === "disponiveis"
                                ? { ...botaoFiltroBase, background: "#2563eb" }
                                : { ...botaoFiltroBase, background: "#6b7280" }
                        }
                        onClick={() => setFiltroEstoque("disponiveis")}
                    >
                        Disponíveis
                    </button>

                    <button
                        style={
                            filtroEstoque === "vendidas"
                                ? { ...botaoFiltroBase, background: "#15803d" }
                                : { ...botaoFiltroBase, background: "#6b7280" }
                        }
                        onClick={() => setFiltroEstoque("vendidas")}
                    >
                        Vendidas
                    </button>
                </div>
            </div>

            <div
                style={{
                    marginBottom: isMobile ? 10 : 14,
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                    gap: isMobile ? 8 : 10,
                    alignItems: "stretch",
                }}
            >
                <button
                    style={{ ...botaoAcaoTopo, background: "#0f172a" }}
                    onClick={marcarTodasEtiquetas}
                >
                    Marcar todas
                </button>

                <button
                    style={{ ...botaoAcaoTopo, background: "#6b7280" }}
                    onClick={desmarcarTodasEtiquetas}
                >
                    Desmarcar todas
                </button>

                <button
                    style={{ ...botaoAcaoTopo, background: "#2563eb" }}
                    onClick={imprimirEtiquetasSelecionadas}
                >
                    Imprimir selecionadas
                </button>
            </div>

            {pecasFiltradas.length === 0 ? (
                <p>Nenhuma peça encontrada.</p>
            ) : (
                <div
                    style={{
                        ...gridPecas,
                        gap: isMobile ? 10 : gridPecas.gap,
                    }}
                >
                    {pecasFiltradas.map((p, index) => {
                        const codigo = String(p?.id || `sem-codigo-${index}`);
                        const nome = p?.nome || "Sem nome";
                        const custo = p?.custo ? p.custo : formatarBRL(0);
                        const venda = p?.venda ? p.venda : formatarBRL(0);
                        const obs = p?.obs || "-";
                        const cadastro = p?.data_cadastro || "-";
                        const clienteNome = p?.cliente || "";
                        const vendido = !!p?.vendido;
                        const dataVenda = p?.data_venda || "";
                        const etiquetaSelecionada = etiquetasSelecionadas.includes(codigo);

                        return (
                            <div
                                key={codigo}
                                style={{
                                    ...cardPeca,
                                    display: "grid",
                                    gap: isMobile ? 10 : 14,
                                    alignContent: "start",
                                    padding: isMobile ? 10 : 16,
                                    borderRadius: isMobile ? 16 : 20,
                                }}
                            >
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: isMobile ? "20px 1fr" : "44px 1fr",
                                        gap: isMobile ? 8 : 12,
                                        alignItems: "start",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "grid",
                                            justifyItems: "center",
                                            alignContent: "start",
                                            gap: isMobile ? 2 : 4,
                                            paddingTop: isMobile ? 4 : 2,
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleEtiqueta(codigo)}
                                            aria-label={`Selecionar etiqueta da peça ${nome}`}
                                            style={{
                                                width: isMobile ? 8 : 28,
                                                height: isMobile ? 8 : 28,
                                                borderRadius: isMobile ? 2 : 8,
                                                border: etiquetaSelecionada
                                                    ? "1.5px solid #1d4ed8"
                                                    : isMobile
                                                    ? "1px solid #cbd5e1"
                                                    : "1.5px solid #94a3b8",
                                                background: etiquetaSelecionada ? "#1d4ed8" : "transparent",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: 800,
                                                fontSize: isMobile ? 6 : 12,
                                                cursor: "pointer",
                                                padding: 0,
                                                color: "#fff",
                                                boxShadow: "none",
                                                marginTop: isMobile ? 2 : 0,
                                            }}
                                        >
                                            {etiquetaSelecionada ? "✓" : ""}
                                        </button>

                                        {!isMobile && (
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    color: "#64748b",
                                                    textAlign: "center",
                                                    lineHeight: 1,
                                                    maxWidth: 44,
                                                    opacity: 0.6,
                                                }}
                                            >
                                                Etiq.
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ minWidth: 0 }}>
                                        <strong style={tituloPecaStyle}>{nome}</strong>

                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                                                gap: isMobile ? 4 : 12,
                                                alignItems: "start",
                                            }}
                                        >
                                            <div style={{ display: "grid", gap: isMobile ? 3 : 4 }}>
                                                <p style={textoCompacto}>Código: {codigo}</p>
                                                <p style={textoCompacto}>Compra: {custo}</p>
                                                <p style={textoCompacto}>Venda: {venda}</p>
                                                <p style={textoCompacto}>Obs: {obs}</p>
                                                <p style={textoCompacto}>Cadastro: {cadastro}</p>

                                                <p style={textoCompacto}>
                                                    Status:{" "}
                                                    <strong style={{ color: vendido ? "#15803d" : "#334155" }}>
                                                        {vendido ? `Vendido para ${clienteNome}` : "Disponível"}
                                                    </strong>
                                                </p>

                                                {vendido ? (
                                                    <p style={textoCompacto}>Data da venda: {dataVenda}</p>
                                                ) : null}
                                            </div>

                                            <div
                                                style={{
                                                    border: "1px solid #e5e7eb",
                                                    borderRadius: isMobile ? 12 : 14,
                                                    padding: isMobile ? 6 : 10,
                                                    background: "#fff",
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                    minHeight: isMobile ? 68 : 104,
                                                    minWidth: isMobile ? "100%" : 104,
                                                    marginTop: isMobile ? 2 : 0,
                                                }}
                                            >
                                                <QRCodeCanvas
                                                    value={codigo}
                                                    size={isMobile ? 54 : 84}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "grid",
                                        gap: isMobile ? 4 : 8,
                                    }}
                                >
                                    <button
                                        style={{
                                            ...botaoAcaoCard,
                                            background: "#2563eb",
                                        }}
                                        onClick={() =>
                                            abrirPreview(PREVIEW_TIPO.ETIQUETAS, [
                                                {
                                                    ...p,
                                                    id: codigo,
                                                    nome,
                                                    venda,
                                                    obs,
                                                },
                                            ])
                                        }
                                    >
                                        {isMobile ? "Imprimir" : "Imprimir etiqueta"}
                                    </button>

                                    {vendido ? (
                                        <button
                                            style={{
                                                ...botaoAcaoCard,
                                                background: "#b8860b",
                                            }}
                                            onClick={() => cancelarVenda(codigo)}
                                        >
                                            {isMobile ? "Cancelar" : "Cancelar venda"}
                                        </button>
                                    ) : null}

                                    <button
                                        style={{
                                            ...botaoAcaoCard,
                                            background: "#555",
                                        }}
                                        onClick={() => removerPeca(codigo)}
                                    >
                                        {isMobile ? "Remover" : "Remover peça"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}