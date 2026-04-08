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

                <div style={linhaFiltros}>
                    <input
                        style={{ ...input, maxWidth: 340 }}
                        placeholder="Buscar por peça, código ou cliente"
                        value={buscaPeca}
                        onChange={(e) => setBuscaPeca(e.target.value)}
                    />

                    <button
                        style={
                            filtroEstoque === "todas"
                                ? { ...botaoPequeno, background: "#111827" }
                                : { ...botaoPequeno, background: "#6b7280" }
                        }
                        onClick={() => setFiltroEstoque("todas")}
                    >
                        Todas
                    </button>

                    <button
                        style={
                            filtroEstoque === "disponiveis"
                                ? { ...botaoPequeno, background: "#2563eb" }
                                : { ...botaoPequeno, background: "#6b7280" }
                        }
                        onClick={() => setFiltroEstoque("disponiveis")}
                    >
                        Disponíveis
                    </button>

                    <button
                        style={
                            filtroEstoque === "vendidas"
                                ? { ...botaoPequeno, background: "#15803d" }
                                : { ...botaoPequeno, background: "#6b7280" }
                        }
                        onClick={() => setFiltroEstoque("vendidas")}
                    >
                        Vendidas
                    </button>
                </div>
            </div>

            <div
                style={{
                    marginBottom: 12,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                }}
            >
                <button
                    style={{ ...botao, background: "#111827" }}
                    onClick={marcarTodasEtiquetas}
                >
                    Marcar todas
                </button>

                <button
                    style={{ ...botao, background: "#6b7280" }}
                    onClick={desmarcarTodasEtiquetas}
                >
                    Desmarcar todas
                </button>

                <button
                    style={{ ...botao, background: "#2563eb" }}
                    onClick={imprimirEtiquetasSelecionadas}
                >
                    Imprimir selecionadas
                </button>
            </div>

            {pecasFiltradas.length === 0 ? (
                <p>Nenhuma peça encontrada.</p>
            ) : (
                <div style={gridPecas}>
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

                        return (
                            <div
                                key={codigo}
                                style={{
                                    ...cardPeca,
                                    display: "grid",
                                    gap: 10,
                                    alignContent: "start",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 2,
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={etiquetasSelecionadas.includes(codigo)}
                                        onChange={() => toggleEtiqueta(codigo)}
                                    />

                                    <span style={{ fontSize: 14, color: "#374151" }}>
                                        Selecionar etiqueta
                                    </span>
                                </div>

                                {p?.foto ? (
                                    <img
                                        src={p.foto}
                                        alt={nome}
                                        style={{
                                            width: "100%",
                                            height: 220,
                                            objectFit: "cover",
                                            borderRadius: 10,
                                        }}
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                ) : null}

                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 18,
                                        lineHeight: 1.3,
                                        wordBreak: "break-word",
                                    }}
                                >
                                    <strong>{nome}</strong>
                                </p>

                                <div style={{ display: "grid", gap: 4 }}>
                                    <p style={textoItem}>Código: {codigo}</p>
                                    <p style={textoItem}>Compra: {custo}</p>
                                    <p style={textoItem}>Venda: {venda}</p>
                                    <p style={textoItem}>Obs: {obs}</p>
                                    <p style={textoItem}>Cadastro: {cadastro}</p>

                                    <p style={textoItem}>
                                        Status:{" "}
                                        <strong style={{ color: vendido ? "green" : "#333" }}>
                                            {vendido ? `Vendido para ${clienteNome}` : "Disponível"}
                                        </strong>
                                    </p>

                                    {vendido && <p style={textoItem}>Data da venda: {dataVenda}</p>}
                                </div>

                                <div
                                    style={{
                                        marginTop: 6,
                                        marginBottom: 6,
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        minHeight: 120,
                                        background: "#fff",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 10,
                                        padding: 10,
                                    }}
                                >
                                    <QRCodeCanvas value={codigo} size={100} />
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: 10,
                                        flexWrap: "wrap",
                                        alignItems: "stretch",
                                    }}
                                >
                                    <button
                                        style={{ ...botao, background: "#2563eb" }}
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
                                        Imprimir etiqueta
                                    </button>

                                    {vendido ? (
                                        <button
                                            style={{ ...botao, background: "#b8860b" }}
                                            onClick={() => cancelarVenda(codigo)}
                                        >
                                            Cancelar venda
                                        </button>
                                    ) : null}

                                    <button
                                        style={{ ...botao, background: "#555" }}
                                        onClick={() => removerPeca(codigo)}
                                    >
                                        Remover peça
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