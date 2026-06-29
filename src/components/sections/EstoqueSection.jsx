import { QRCodeCanvas } from "qrcode.react";
import {
    CheckSquare,
    ListChecks,
    PackageCheck,
    PackageX,
    Pencil,
    Printer,
    RotateCcw,
    Save,
    Square,
    Trash2,
    X,
} from "lucide-react";
import { formatarDataHoraBR } from "../../utils/dateUtils";

function parseDataFlex(valor) {
    if (!valor) return null;

    if (valor instanceof Date) {
        return Number.isNaN(valor.getTime()) ? null : valor;
    }

    const texto = String(valor).trim();
    if (!texto) return null;

    if (texto.includes("T")) {
        const dataIso = new Date(texto);
        return Number.isNaN(dataIso.getTime()) ? null : dataIso;
    }

    const matchBr = texto.match(
        /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
    );

    if (matchBr) {
        const [, dia, mes, ano, hora = "00", minuto = "00", segundo = "00"] = matchBr;

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

function getTimestampCadastro(peca) {
    const data =
        parseDataFlex(peca?.data_cadastro) ||
        parseDataFlex(peca?.criado_em) ||
        parseDataFlex(peca?.created_at);

    return data ? data.getTime() : 0;
}

function formatarDataLocal(valor) {
    return formatarDataHoraBR(valor) || "-";
}

function IconButton({
    icon: Icon,
    label,
    title,
    active = false,
    danger = false,
    disabled = false,
    compact = false,
    onClick,
}) {
    const background = danger ? "#fff1f2" : active ? "#fde7ee" : "#fff";
    const color = danger ? "#b91c1c" : active ? "#e45c7d" : "#9b7582";
    const border = danger ? "1px solid #fecdd3" : active ? "1px solid #f7c8d6" : "1px solid #f1dce4";

    return (
        <button
            type="button"
            title={title || label}
            aria-label={title || label}
            disabled={disabled}
            onClick={onClick}
            style={{
                minHeight: compact ? 38 : 44,
                minWidth: compact ? 38 : 44,
                width: label ? "auto" : compact ? 38 : 44,
                padding: label ? "8px 12px" : 0,
                borderRadius: compact ? 12 : 14,
                border,
                background,
                color,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                fontWeight: 800,
                fontSize: 13,
                lineHeight: 1,
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <Icon size={compact ? 17 : 19} strokeWidth={2.3} />
            {label ? <span>{label}</span> : null}
        </button>
    );
}

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
    abrirEdicaoPeca,
    pecaEditando,
    formEdicaoPeca,
    setFormEdicaoPeca,
    salvarEdicaoPeca,
    cancelarEdicaoPeca,
    salvandoEdicaoPeca,
    formatarMoeda,
    formatarBRL,
    boxGrande,
    cabecalhoSecao,
    tituloSecao,
    linhaResumoHorizontal,
    cardResumo,
    valorResumo,
    linhaFiltros,
    input,
    gridPecas,
    cardPeca,
    textoItem,
}) {
    const isMobile = typeof window !== "undefined" ? window.innerWidth <= 767 : false;

    const pecasOrdenadas = [...(pecasFiltradas || [])].sort((a, b) => {
        const dataB = getTimestampCadastro(b);
        const dataA = getTimestampCadastro(a);

        if (dataB !== dataA) return dataB - dataA;

        return String(b?.id || "").localeCompare(String(a?.id || ""), "pt-BR", {
            numeric: true,
            sensitivity: "base",
        });
    });

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

    const estiloInputModal = {
        ...input,
        width: "100%",
        minHeight: 40,
        height: 40,
        padding: "8px 12px",
        fontSize: 14,
        borderRadius: 12,
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

                    <IconButton
                        icon={ListChecks}
                        label="Todas"
                        active={filtroEstoque === "todas"}
                        onClick={() => setFiltroEstoque("todas")}
                    />

                    <IconButton
                        icon={PackageCheck}
                        label="Disponíveis"
                        active={filtroEstoque === "disponiveis"}
                        onClick={() => setFiltroEstoque("disponiveis")}
                    />

                    <IconButton
                        icon={PackageX}
                        label="Vendidas"
                        active={filtroEstoque === "vendidas"}
                        onClick={() => setFiltroEstoque("vendidas")}
                    />
                </div>
            </div>

            <div
                style={{
                    marginBottom: isMobile ? 10 : 14,
                    display: "grid",
                    gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(3, minmax(0, 1fr))",
                    gap: isMobile ? 8 : 10,
                    alignItems: "stretch",
                }}
            >
                <IconButton
                    icon={CheckSquare}
                    label={isMobile ? "Marcar" : "Marcar todas"}
                    active
                    onClick={marcarTodasEtiquetas}
                />

                <IconButton
                    icon={Square}
                    label={isMobile ? "Limpar" : "Desmarcar todas"}
                    onClick={desmarcarTodasEtiquetas}
                />

                <IconButton
                    icon={Printer}
                    label={isMobile ? "Imprimir" : "Imprimir selecionadas"}
                    active
                    onClick={imprimirEtiquetasSelecionadas}
                />
            </div>

            {pecasOrdenadas.length === 0 ? (
                <p>Nenhuma peça encontrada.</p>
            ) : (
                <div
                    style={{
                        ...gridPecas,
                        gap: isMobile ? 10 : gridPecas.gap,
                    }}
                >
                    {pecasOrdenadas.map((p, index) => {
                        const codigo = String(p?.id || `sem-codigo-${index}`);
                        const nome = p?.nome || "Sem nome";
                        const custo = p?.custo ? p.custo : formatarBRL(0);
                        const venda = p?.venda ? p.venda : formatarBRL(0);
                        const obs = p?.obs || "-";
                        const cadastro = formatarDataLocal(p?.data_cadastro || p?.criado_em || p?.created_at);
                        const clienteNome = p?.cliente || "";
                        const vendido = !!p?.vendido;
                        const dataVenda = formatarDataLocal(p?.data_venda);
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
                                        gridTemplateColumns: isMobile ? "28px 1fr" : "44px 1fr",
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
                                                width: isMobile ? 24 : 28,
                                                height: isMobile ? 24 : 28,
                                                borderRadius: isMobile ? 9 : 8,
                                                border: etiquetaSelecionada
                                                    ? "1.5px solid #e45c7d"
                                                    : "1.5px solid #e7cbd5",
                                                background: etiquetaSelecionada ? "#e45c7d" : "#fff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: 800,
                                                fontSize: isMobile ? 11 : 12,
                                                cursor: "pointer",
                                                padding: 0,
                                                color: "#fff",
                                                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
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
                                                    Status: {" "}
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
                                                <QRCodeCanvas value={codigo} size={isMobile ? 54 : 84} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: isMobile ? 8 : 10,
                                        justifyContent: "flex-end",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <IconButton
                                        icon={Printer}
                                        title="Imprimir etiqueta"
                                        compact
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
                                    />

                                    <IconButton
                                        icon={Pencil}
                                        title="Editar peça"
                                        compact
                                        active
                                        onClick={() => abrirEdicaoPeca(p)}
                                    />

                                    {vendido ? (
                                        <IconButton
                                            icon={RotateCcw}
                                            title="Cancelar venda"
                                            compact
                                            onClick={() => cancelarVenda(codigo)}
                                        />
                                    ) : null}

                                    <IconButton
                                        icon={Trash2}
                                        title="Remover peça"
                                        compact
                                        danger
                                        onClick={() => removerPeca(codigo)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {pecaEditando ? (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 10000,
                        background: "rgba(15, 23, 42, 0.48)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 18,
                    }}
                >
                    <div
                        style={{
                            width: "min(560px, 96vw)",
                            maxHeight: "90vh",
                            overflow: "auto",
                            background: "#fff",
                            borderRadius: 22,
                            padding: isMobile ? 16 : 20,
                            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.28)",
                            display: "grid",
                            gap: 12,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                            }}
                        >
                            <div>
                                <strong style={{ fontSize: 18, color: "#111827" }}>
                                    Editar peça
                                </strong>
                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                                    Código: {pecaEditando.id}
                                </div>
                            </div>

                            <IconButton
                                icon={X}
                                title="Fechar edição"
                                compact
                                onClick={cancelarEdicaoPeca}
                            />
                        </div>

                        <input
                            style={estiloInputModal}
                            placeholder="Nome da peça"
                            value={formEdicaoPeca.nome}
                            onChange={(e) =>
                                setFormEdicaoPeca((prev) => ({ ...prev, nome: e.target.value }))
                            }
                        />

                        <input
                            style={estiloInputModal}
                            placeholder="Valor de compra"
                            value={formEdicaoPeca.custo}
                            onChange={(e) =>
                                setFormEdicaoPeca((prev) => ({
                                    ...prev,
                                    custo: formatarMoeda ? formatarMoeda(e.target.value) : e.target.value,
                                }))
                            }
                        />

                        <input
                            style={estiloInputModal}
                            placeholder="Valor de venda"
                            value={formEdicaoPeca.venda}
                            onChange={(e) =>
                                setFormEdicaoPeca((prev) => ({
                                    ...prev,
                                    venda: formatarMoeda ? formatarMoeda(e.target.value) : e.target.value,
                                }))
                            }
                        />

                        <textarea
                            style={{
                                ...estiloInputModal,
                                minHeight: 86,
                                height: 86,
                                resize: "vertical",
                                fontFamily: "inherit",
                            }}
                            placeholder="Observações"
                            value={formEdicaoPeca.obs}
                            onChange={(e) =>
                                setFormEdicaoPeca((prev) => ({ ...prev, obs: e.target.value }))
                            }
                        />

                        <input
                            style={estiloInputModal}
                            placeholder="Foto / URL / Base64 (opcional)"
                            value={formEdicaoPeca.foto || ""}
                            onChange={(e) =>
                                setFormEdicaoPeca((prev) => ({ ...prev, foto: e.target.value }))
                            }
                        />

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                                gap: 10,
                                marginTop: 4,
                            }}
                        >
                            <IconButton
                                icon={Save}
                                label={salvandoEdicaoPeca ? "Salvando..." : "Salvar alterações"}
                                active
                                disabled={salvandoEdicaoPeca}
                                onClick={salvarEdicaoPeca}
                            />

                            <IconButton
                                icon={X}
                                label="Cancelar"
                                onClick={cancelarEdicaoPeca}
                            />
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
