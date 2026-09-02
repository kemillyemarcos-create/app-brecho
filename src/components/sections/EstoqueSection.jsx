import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
    ArrowUpDown,
    CalendarDays,
    CheckSquare,
    Eraser,
    Filter,
    Image,
    ListChecks,
    PackageCheck,
    PackageX,
    Pencil,
    Printer,
    RotateCcw,
    Save,
    StickyNote,
    Square,
    Trash2,
    X,
} from "lucide-react";

import {
    formatarDataHoraBR as formatarDataHoraBRPadrao,
} from "../../utils/dateUtils";

function parseDataFlex(valor) {
    if (!valor) return null;

    if (valor instanceof Date) {
        return Number.isNaN(valor.getTime())
            ? null
            : valor;
    }

    const texto = String(valor).trim();

    if (!texto) return null;

    if (texto.includes("T")) {
        const dataIso = new Date(texto);

        return Number.isNaN(dataIso.getTime())
            ? null
            : dataIso;
    }

    const matchBr = texto.match(
        /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
    );

    if (matchBr) {
        const [
            ,
            dia,
            mes,
            ano,
            hora = "00",
            minuto = "00",
            segundo = "00",
        ] = matchBr;

        const dataBr = new Date(
            Number(ano),
            Number(mes) - 1,
            Number(dia),
            Number(hora),
            Number(minuto),
            Number(segundo)
        );

        return Number.isNaN(dataBr.getTime())
            ? null
            : dataBr;
    }

    const dataDireta = new Date(texto);

    return Number.isNaN(dataDireta.getTime())
        ? null
        : dataDireta;
}

function getTimestampCadastro(peca) {
    const data =
        parseDataFlex(peca?.data_cadastro) ||
        parseDataFlex(peca?.criado_em) ||
        parseDataFlex(peca?.created_at);

    return data ? data.getTime() : 0;
}

function getTimestampVenda(peca) {
    const data = parseDataFlex(
        peca?.data_venda
    );

    return data ? data.getTime() : 0;
}

function limparMoedaLocal(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return 0;
    }

    const texto = String(valor).trim();

    if (typeof valor === "number") {
        return valor;
    }

    const numero = Number(
        texto
            .replace(/[^\d,.-]/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
    );

    return Number.isFinite(numero)
        ? numero
        : 0;
}

function inicioDoDia(valor) {
    if (!valor) return null;

    const data = new Date(
        `${valor}T00:00:00`
    );

    return Number.isNaN(data.getTime())
        ? null
        : data;
}

function fimDoDia(valor) {
    if (!valor) return null;

    const data = new Date(
        `${valor}T23:59:59.999`
    );

    return Number.isNaN(data.getTime())
        ? null
        : data;
}

function formatarDataLocal(
    valor,
    formatador = formatarDataHoraBRPadrao
) {
    return formatador(valor) || "-";
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
    const corPrincipal = "var(--kc-primary)";
    const corSuaveTema = "var(--kc-soft)";
    const corPainel = "var(--kc-panel)";
    const corTexto = "var(--kc-text)";
    const corTextoSuave = "var(--kc-text-muted)";
    const corBorda = "var(--kc-border)";

    const background = danger
        ? "#fff1f2"
        : active
            ? corSuaveTema
            : corPainel;

    const color = danger
        ? "#b91c1c"
        : active
            ? corPrincipal
            : corTextoSuave;

    const border = danger
        ? "1px solid #fecdd3"
        : active
            ? `1px solid ${corPrincipal}`
            : `1px solid ${corBorda}`;

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
                color: disabled ? corTextoSuave : color,
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
    formatarDataHoraBR = formatarDataHoraBRPadrao,
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
    const isMobile =
        typeof window !== "undefined" ? window.innerWidth <= 767 : false;

    // =====================================================
    // TEMA GLOBAL
    // =====================================================

    const corPrincipal = "var(--kc-primary)";
    const corSuaveTema = "var(--kc-soft)";
    const corFundo = "var(--kc-background)";
    const corPainel = "var(--kc-panel)";
    const corTexto = "var(--kc-text)";
    const corTextoSuave = "var(--kc-text-muted)";
    const corBorda = "var(--kc-border)";

    // Cores semânticas
    const corSucesso = "#15803d";
    const corPerigo = "#b91c1c";

    const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] =
        useState(false);
    const [ordenacao, setOrdenacao] = useState("cadastro_desc");
    const [tipoData, setTipoData] = useState("cadastro");
    const [dataInicialLocal, setDataInicialLocal] = useState("");
    const [dataFinalLocal, setDataFinalLocal] = useState("");
    const [filtroObservacao, setFiltroObservacao] = useState("todas");
    const [filtroFoto, setFiltroFoto] = useState("todas");

    const filtrosAvancadosAtivos =
        !!dataInicialLocal ||
        !!dataFinalLocal ||
        filtroObservacao !== "todas" ||
        filtroFoto !== "todas";

    function limparFiltrosAvancados() {
        setTipoData("cadastro");
        setDataInicialLocal("");
        setDataFinalLocal("");
        setFiltroObservacao("todas");
        setFiltroFoto("todas");
        setOrdenacao("cadastro_desc");
    }

    const pecasOrdenadas = useMemo(() => {
        const inicio = inicioDoDia(dataInicialLocal);
        const fim = fimDoDia(dataFinalLocal);

        const filtradas = [...(pecasFiltradas || [])].filter((peca) => {
            const observacao = String(peca?.obs || "").trim();
            const foto = String(peca?.foto || "").trim();

            if (filtroObservacao === "com" && !observacao) return false;
            if (filtroObservacao === "sem" && observacao) return false;

            if (filtroFoto === "com" && !foto) return false;
            if (filtroFoto === "sem" && foto) return false;

            if (inicio || fim) {
                const timestamp =
                    tipoData === "venda"
                        ? getTimestampVenda(peca)
                        : getTimestampCadastro(peca);

                if (!timestamp) return false;
                if (inicio && timestamp < inicio.getTime()) return false;
                if (fim && timestamp > fim.getTime()) return false;
            }

            return true;
        });

        filtradas.sort((a, b) => {
            const nomeA = String(a?.nome || "");
            const nomeB = String(b?.nome || "");
            const codigoA = String(a?.id || "");
            const codigoB = String(b?.id || "");
            const cadastroA = getTimestampCadastro(a);
            const cadastroB = getTimestampCadastro(b);
            const vendaA = getTimestampVenda(a);
            const vendaB = getTimestampVenda(b);
            const custoA = limparMoedaLocal(a?.custo);
            const custoB = limparMoedaLocal(b?.custo);
            const precoA = limparMoedaLocal(a?.venda);
            const precoB = limparMoedaLocal(b?.venda);

            switch (ordenacao) {
                case "cadastro_asc":
                    return cadastroA - cadastroB;
                case "venda_desc":
                    return vendaB - vendaA;
                case "venda_asc":
                    return vendaA - vendaB;
                case "preco_desc":
                    return precoB - precoA;
                case "preco_asc":
                    return precoA - precoB;
                case "custo_desc":
                    return custoB - custoA;
                case "custo_asc":
                    return custoA - custoB;
                case "nome_asc":
                    return nomeA.localeCompare(nomeB, "pt-BR", {
                        sensitivity: "base",
                    });
                case "nome_desc":
                    return nomeB.localeCompare(nomeA, "pt-BR", {
                        sensitivity: "base",
                    });
                case "codigo_asc":
                    return codigoA.localeCompare(codigoB, "pt-BR", {
                        numeric: true,
                        sensitivity: "base",
                    });
                case "codigo_desc":
                    return codigoB.localeCompare(codigoA, "pt-BR", {
                        numeric: true,
                        sensitivity: "base",
                    });
                case "cadastro_desc":
                default:
                    if (cadastroB !== cadastroA) return cadastroB - cadastroA;

                    return codigoB.localeCompare(codigoA, "pt-BR", {
                        numeric: true,
                        sensitivity: "base",
                    });
            }
        });

        return filtradas;
    }, [
        pecasFiltradas,
        ordenacao,
        tipoData,
        dataInicialLocal,
        dataFinalLocal,
        filtroObservacao,
        filtroFoto,
    ]);

    const textoCompacto = {
        ...textoItem,
        margin: 0,
        fontSize: isMobile ? 11.5 : 14,
        lineHeight: isMobile ? 1.18 : 1.35,
        color: corTextoSuave,
    };

    const tituloPecaStyle = {
        display: "block",
        fontSize: isMobile ? 14 : 18,
        marginBottom: isMobile ? 4 : 8,
        lineHeight: 1.12,
        wordBreak: "break-word",
        color: corTexto,
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
        border: `1px solid ${corBorda}`,
        background: corPainel,
        color: corTexto,
    };

    const estiloInputModal = {
        ...input,
        width: "100%",
        minHeight: 40,
        height: 40,
        padding: "8px 12px",
        fontSize: 14,
        borderRadius: 12,
        border: `1px solid ${corBorda}`,
        background: corPainel,
        color: corTexto,
    };

    return (
        <div
            style={{
                ...boxGrande,
                padding: isMobile ? 10 : 12,
                background: corPainel,
                border: `1px solid ${corBorda}`,
                color: corTexto,
            }}
        >
            <div
                style={{
                    ...cabecalhoSecao,
                    display: "grid",
                    gap: isMobile ? 10 : 12,
                    marginBottom: isMobile ? 10 : 12,
                }}
            >
                <div>
                    <h2
                        style={{
                            ...tituloSecao,
                            marginBottom: 5,
                            color: corTexto,
                        }}
                    >
                        Gestão de estoque
                    </h2>

                    <p
                        style={{
                            margin: 0,
                            color: corTextoSuave,
                            fontSize: isMobile ? 12 : 13,
                            lineHeight: 1.4,
                        }}
                    >
                        Pesquise, filtre e gerencie todas as peças cadastradas.
                    </p>
                </div>

                <div
                    style={{
                        ...linhaResumoHorizontal,
                        display: "grid",
                        gridTemplateColumns: isMobile
                            ? "1fr"
                            : "repeat(3, minmax(0, 1fr))",
                        gap: 8,
                        margin: 0,
                    }}
                >
                    {[
                        { label: "Total de peças", value: totalPecas },
                        { label: "Disponíveis", value: totalDisponiveis },
                        { label: "Vendidas", value: totalVendidas },
                    ].map((resumo) => (
                        <div
                            key={resumo.label}
                            style={{
                                ...cardResumo,
                                minWidth: 0,
                                padding: isMobile ? 10 : 12,
                                borderRadius: 16,
                                boxShadow: "none",
                                display: "grid",
                                gap: 4,
                                background: corPainel,
                                border: `1px solid ${corBorda}`,
                                color: corTexto,
                            }}
                        >
                            <span
                                style={{
                                    color: corTextoSuave,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                }}
                            >
                                {resumo.label}
                            </span>

                            <div
                                style={{
                                    ...valorResumo,
                                    margin: 0,
                                    fontSize: isMobile ? 24 : 28,
                                    lineHeight: 1,
                                    color: corPrincipal,
                                }}
                            >
                                {resumo.value}
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        ...linhaFiltros,
                        display: "grid",
                        gridTemplateColumns: isMobile
                            ? "1fr"
                            : "minmax(300px, 1fr) auto auto auto",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 0,
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

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                            ? "1fr"
                            : "minmax(250px, 330px) auto auto",
                        gap: 8,
                        alignItems: "center",
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "auto 1fr",
                            gap: 8,
                            alignItems: "center",
                        }}
                    >
                        <ArrowUpDown size={17} color={corTextoSuave} />

                        <select
                            style={{
                                ...estiloInputBusca,
                                cursor: "pointer",
                                textTransform: "none",
                            }}
                            value={ordenacao}
                            onChange={(e) => setOrdenacao(e.target.value)}
                        >
                            <option value="cadastro_desc">Cadastro: mais recente</option>
                            <option value="cadastro_asc">Cadastro: mais antigo</option>
                            <option value="venda_desc">Venda: mais recente</option>
                            <option value="venda_asc">Venda: mais antiga</option>
                            <option value="preco_desc">Preço de venda: maior</option>
                            <option value="preco_asc">Preço de venda: menor</option>
                            <option value="custo_desc">Preço de compra: maior</option>
                            <option value="custo_asc">Preço de compra: menor</option>
                            <option value="nome_asc">Nome: A–Z</option>
                            <option value="nome_desc">Nome: Z–A</option>
                            <option value="codigo_asc">Código: crescente</option>
                            <option value="codigo_desc">Código: decrescente</option>
                        </select>
                    </div>

                    <IconButton
                        icon={Filter}
                        label={
                            filtrosAvancadosAtivos
                                ? "Filtros ativos"
                                : "Filtros avançados"
                        }
                        active={mostrarFiltrosAvancados || filtrosAvancadosAtivos}
                        onClick={() =>
                            setMostrarFiltrosAvancados((aberto) => !aberto)
                        }
                    />

                    <IconButton
                        icon={Eraser}
                        label="Limpar filtros"
                        disabled={
                            !filtrosAvancadosAtivos &&
                            ordenacao === "cadastro_desc"
                        }
                        onClick={limparFiltrosAvancados}
                    />
                </div>

                {mostrarFiltrosAvancados ? (
                    <div
                        style={{
                            marginTop: 8,
                            padding: isMobile ? 12 : 16,
                            border: `1px solid ${corBorda}`,
                            borderRadius: 16,
                            background: corFundo,
                            display: "grid",
                            gap: 14,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                color: corPrincipal,
                                fontWeight: 900,
                            }}
                        >
                            <Filter size={18} />
                            Filtros avançados
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: isMobile
                                    ? "1fr"
                                    : "repeat(3, minmax(0, 1fr))",
                                gap: 12,
                            }}
                        >
                            <label style={{ display: "grid", gap: 6 }}>
                                <span
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: corTextoSuave,
                                    }}
                                >
                                    <CalendarDays size={15} />
                                    Consultar data
                                </span>

                                <select
                                    style={{
                                        ...estiloInputBusca,
                                        cursor: "pointer",
                                        textTransform: "none",
                                    }}
                                    value={tipoData}
                                    onChange={(e) => setTipoData(e.target.value)}
                                >
                                    <option value="cadastro">Data de cadastro</option>
                                    <option value="venda">Data da venda</option>
                                </select>
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: corTextoSuave,
                                    }}
                                >
                                    Data inicial
                                </span>

                                <input
                                    type="date"
                                    style={estiloInputBusca}
                                    value={dataInicialLocal}
                                    max={dataFinalLocal || undefined}
                                    onChange={(e) =>
                                        setDataInicialLocal(e.target.value)
                                    }
                                />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: corTextoSuave,
                                    }}
                                >
                                    Data final
                                </span>

                                <input
                                    type="date"
                                    style={estiloInputBusca}
                                    value={dataFinalLocal}
                                    min={dataInicialLocal || undefined}
                                    onChange={(e) =>
                                        setDataFinalLocal(e.target.value)
                                    }
                                />
                            </label>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: isMobile
                                    ? "1fr"
                                    : "repeat(2, minmax(0, 1fr))",
                                gap: 12,
                            }}
                        >
                            <label style={{ display: "grid", gap: 6 }}>
                                <span
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: corTextoSuave,
                                    }}
                                >
                                    <StickyNote size={15} />
                                    Observação
                                </span>

                                <select
                                    style={{
                                        ...estiloInputBusca,
                                        cursor: "pointer",
                                        textTransform: "none",
                                    }}
                                    value={filtroObservacao}
                                    onChange={(e) =>
                                        setFiltroObservacao(e.target.value)
                                    }
                                >
                                    <option value="todas">Todas</option>
                                    <option value="com">
                                        Somente com observação
                                    </option>
                                    <option value="sem">
                                        Somente sem observação
                                    </option>
                                </select>
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <span
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: corTextoSuave,
                                    }}
                                >
                                    <Image size={15} />
                                    Foto
                                </span>

                                <select
                                    style={{
                                        ...estiloInputBusca,
                                        cursor: "pointer",
                                        textTransform: "none",
                                    }}
                                    value={filtroFoto}
                                    onChange={(e) =>
                                        setFiltroFoto(e.target.value)
                                    }
                                >
                                    <option value="todas">Todas</option>
                                    <option value="com">Somente com foto</option>
                                    <option value="sem">Somente sem foto</option>
                                </select>
                            </label>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                            }}
                        >
                            <span
                                style={{
                                    color: corTextoSuave,
                                    fontSize: 13,
                                }}
                            >
                                {pecasOrdenadas.length} peça(s) encontrada(s)
                            </span>

                            <IconButton
                                icon={Eraser}
                                label="Restaurar filtros"
                                disabled={
                                    !filtrosAvancadosAtivos &&
                                    ordenacao === "cadastro_desc"
                                }
                                onClick={limparFiltrosAvancados}
                            />
                        </div>
                    </div>
                ) : null}
            </div>

            <div
                style={{
                    marginBottom: isMobile ? 10 : 12,
                    padding: isMobile ? 8 : 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 8,
                    alignItems: "stretch",
                    border: `1px solid ${corBorda}`,
                    borderRadius: 14,
                    background: corFundo,
                }}
            >
                <IconButton
                    icon={CheckSquare}
                    label={isMobile ? "Marcar" : "Marcar todas"}
                    active
                    onClick={() => marcarTodasEtiquetas(pecasOrdenadas)}
                />

                <IconButton
                    icon={Square}
                    label={isMobile ? "Limpar" : "Desmarcar todas"}
                    onClick={() => desmarcarTodasEtiquetas(pecasOrdenadas)}
                />

                <IconButton
                    icon={Printer}
                    label={isMobile ? "Imprimir" : "Imprimir selecionadas"}
                    active
                    onClick={() =>
                        imprimirEtiquetasSelecionadas(pecasOrdenadas)
                    }
                />
            </div>

            {pecasOrdenadas.length === 0 ? (
                <p style={{ color: corTextoSuave }}>
                    Nenhuma peça encontrada.
                </p>
            ) : (
                <div
                    style={{
                        ...gridPecas,
                        gap: isMobile ? 10 : gridPecas.gap,
                    }}
                >
                    {pecasOrdenadas.map((p, index) => {
                        const codigo = String(
                            p?.id || `sem-codigo-${index}`
                        );
                        const nome = p?.nome || "Sem nome";
                        const custo = p?.custo
                            ? p.custo
                            : formatarBRL(0);
                        const venda = p?.venda
                            ? p.venda
                            : formatarBRL(0);
                        const obs = p?.obs || "-";
                        const cadastro = formatarDataLocal(
                            p?.data_cadastro ||
                            p?.criado_em ||
                            p?.created_at,
                            formatarDataHoraBR
                        );

                        const clienteNome = p?.cliente || "";
                        const vendido = !!p?.vendido;

                        const dataVenda = formatarDataLocal(
                            p?.data_venda,
                            formatarDataHoraBR
                        );

                        const etiquetaSelecionada =
                            etiquetasSelecionadas.includes(codigo);

                        return (
                            <div
                                key={codigo}
                                style={{
                                    ...cardPeca,
                                    display: "grid",
                                    gap: isMobile ? 7 : 8,
                                    alignContent: "start",
                                    padding: isMobile ? 9 : 11,
                                    borderRadius: isMobile ? 13 : 15,
                                    boxShadow:
                                        "0 4px 14px rgba(15, 23, 42, 0.04)",
                                    background: corPainel,
                                    border: `1px solid ${corBorda}`,
                                    color: corTexto,
                                }}
                            >
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: isMobile
                                            ? "28px 1fr"
                                            : "44px 1fr",
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
                                            onClick={() =>
                                                toggleEtiqueta(codigo)
                                            }
                                            aria-label={`Selecionar etiqueta da peça ${nome}`}
                                            style={{
                                                width: isMobile ? 24 : 28,
                                                height: isMobile ? 24 : 28,
                                                borderRadius: isMobile ? 9 : 8,
                                                border: etiquetaSelecionada
                                                    ? `1.5px solid ${corPrincipal}`
                                                    : `1.5px solid ${corBorda}`,
                                                background:
                                                    etiquetaSelecionada
                                                        ? corPrincipal
                                                        : corPainel,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: 800,
                                                fontSize: isMobile ? 11 : 12,
                                                cursor: "pointer",
                                                padding: 0,
                                                color: etiquetaSelecionada
                                                    ? "#fff"
                                                    : corTexto,
                                                boxShadow:
                                                    "0 2px 8px rgba(15, 23, 42, 0.04)",
                                            }}
                                        >
                                            {etiquetaSelecionada ? "✓" : ""}
                                        </button>

                                        {!isMobile && (
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    color: corTextoSuave,
                                                    textAlign: "center",
                                                    lineHeight: 1,
                                                    maxWidth: 44,
                                                    opacity: 0.7,
                                                }}
                                            >
                                                Etiq.
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ minWidth: 0 }}>
                                        <strong style={tituloPecaStyle}>
                                            {nome}
                                        </strong>

                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: isMobile
                                                    ? "1fr"
                                                    : "1fr auto",
                                                gap: isMobile ? 4 : 12,
                                                alignItems: "start",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gap: isMobile ? 3 : 4,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "grid",
                                                        gridTemplateColumns:
                                                            isMobile
                                                                ? "1fr"
                                                                : "repeat(2, minmax(0, 1fr))",
                                                        gap: isMobile
                                                            ? 3
                                                            : "4px 12px",
                                                    }}
                                                >
                                                    <p style={textoCompacto}>
                                                        Código: {codigo}
                                                    </p>

                                                    <p style={textoCompacto}>
                                                        Cadastro: {cadastro}
                                                    </p>

                                                    <p style={textoCompacto}>
                                                        Compra: {custo}
                                                    </p>

                                                    <p style={textoCompacto}>
                                                        Venda: {venda}
                                                    </p>
                                                </div>

                                                <p style={textoCompacto}>
                                                    Status:{" "}
                                                    <strong
                                                        style={{
                                                            color: vendido
                                                                ? corSucesso
                                                                : corTexto,
                                                        }}
                                                    >
                                                        {vendido
                                                            ? `Vendido para ${clienteNome}`
                                                            : "Disponível"}
                                                    </strong>
                                                </p>

                                                {vendido ? (
                                                    <p style={textoCompacto}>
                                                        Data da venda:{" "}
                                                        {dataVenda}
                                                    </p>
                                                ) : null}

                                                {obs && obs !== "-" ? (
                                                    <p
                                                        style={{
                                                            ...textoCompacto,
                                                            paddingTop: 4,
                                                            borderTop: `1px solid ${corBorda}`,
                                                        }}
                                                    >
                                                        Obs.: {obs}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <div
                                                style={{
                                                    border: `1px solid ${corBorda}`,
                                                    borderRadius: isMobile
                                                        ? 10
                                                        : 12,
                                                    padding: isMobile ? 5 : 8,

                                                    // QR precisa permanecer branco
                                                    // para garantir contraste de leitura.
                                                    background: "#fff",

                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                    minHeight: isMobile
                                                        ? 58
                                                        : 82,
                                                    minWidth: isMobile
                                                        ? "100%"
                                                        : 82,
                                                    marginTop: isMobile ? 2 : 0,
                                                }}
                                            >
                                                <QRCodeCanvas
                                                    value={codigo}
                                                    size={isMobile ? 44 : 64}
                                                />
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
                                            abrirPreview(
                                                PREVIEW_TIPO.ETIQUETAS,
                                                [
                                                    {
                                                        ...p,
                                                        id: codigo,
                                                        nome,
                                                        venda,
                                                        obs,
                                                    },
                                                ]
                                            )
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
                                            onClick={() =>
                                                cancelarVenda(codigo)
                                            }
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
                            background: corPainel,
                            color: corTexto,
                            border: `1px solid ${corBorda}`,
                            borderRadius: 18,
                            padding: isMobile ? 14 : 16,
                            boxShadow:
                                "0 24px 60px rgba(15, 23, 42, 0.28)",
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
                                <strong
                                    style={{
                                        fontSize: 18,
                                        color: corTexto,
                                    }}
                                >
                                    Editar peça
                                </strong>

                                <div
                                    style={{
                                        fontSize: 12,
                                        color: corTextoSuave,
                                        marginTop: 3,
                                    }}
                                >
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
                                setFormEdicaoPeca((prev) => ({
                                    ...prev,
                                    nome: e.target.value,
                                }))
                            }
                        />

                        <input
                            style={estiloInputModal}
                            placeholder="Valor de compra"
                            value={formEdicaoPeca.custo}
                            onChange={(e) =>
                                setFormEdicaoPeca((prev) => ({
                                    ...prev,
                                    custo: formatarMoeda
                                        ? formatarMoeda(e.target.value)
                                        : e.target.value,
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
                                    venda: formatarMoeda
                                        ? formatarMoeda(e.target.value)
                                        : e.target.value,
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
                                setFormEdicaoPeca((prev) => ({
                                    ...prev,
                                    obs: e.target.value,
                                }))
                            }
                        />

                        <input
                            style={estiloInputModal}
                            placeholder="Foto / URL / Base64 (opcional)"
                            value={formEdicaoPeca.foto || ""}
                            onChange={(e) =>
                                setFormEdicaoPeca((prev) => ({
                                    ...prev,
                                    foto: e.target.value,
                                }))
                            }
                        />

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: isMobile
                                    ? "1fr"
                                    : "1fr 1fr",
                                gap: 8,
                                marginTop: 4,
                            }}
                        >
                            <IconButton
                                icon={Save}
                                label={
                                    salvandoEdicaoPeca
                                        ? "Salvando..."
                                        : "Salvar alterações"
                                }
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