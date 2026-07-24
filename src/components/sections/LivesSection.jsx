import {
    ChevronDown,
    ChevronRight,
    Copy,
    Edit3,
    Save,
    Search,
    Send,
    Share2,
    Trash2,
    UserRound,
    X,
} from "lucide-react";

export default function ClientesSection({
    boxGrande,
    tituloSecao,
    inputCliente,
    botao,
    botaoPequeno,
    cardCliente,
    clientesFiltradosCadastro,
    buscaClienteCadastro,
    setBuscaClienteCadastro,
    copiarLinkCadastroCliente,
    copiarMensagemWhatsAppCadastroCliente,
    gerarLinkCadastroCliente,
    formCliente,
    setFormCliente,
    formatarCPF,
    formatarTelefone,
    formatarCEP,
    buscarCep,
    salvarCliente,
    clienteEditandoId,
    cancelarEdicaoCliente,
    editarCliente,
    compartilharCliente,
    excluirCliente,
    clientesExpandidos,
    toggleExpandirCliente,
}) {
    const isMobile =
        typeof window !== "undefined" ? window.innerWidth <= 767 : false;

    const corPrincipal = "#8f2745";
    const corPrincipalClara = "#f7dce6";
    const corBorda = "#ead1da";
    const corTexto = "#243746";
    const corSuave = "#64748b";
    const corFundoSuave = "#fff7fa";

    const cardBase = {
        border: "1px solid #eef2f7",
        borderRadius: 18,
        background: "#fff",
        boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
    };

    const miniIcone = {
        width: 34,
        height: 34,
        borderRadius: 12,
        border: `1px solid ${corBorda}`,
        background: "#fff",
        color: corPrincipal,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    };

    const inputPadrao = {
        ...inputCliente,
        width: "100%",
        minHeight: isMobile ? 40 : 42,
        padding: isMobile ? "9px 12px" : "10px 13px",
        borderRadius: 13,
        border: "1px solid #dfe6ee",
        background: "#fff",
        color: corTexto,
        fontSize: isMobile ? 13 : 14,
        lineHeight: 1.2,
        boxShadow: "none",
        outline: "none",
    };

    const botaoBase = {
        minHeight: isMobile ? 40 : 42,
        padding: isMobile ? "9px 12px" : "10px 14px",
        borderRadius: 14,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: "pointer",
        fontWeight: 800,
        fontSize: isMobile ? 12.5 : 13.5,
        lineHeight: 1,
        whiteSpace: "nowrap",
    };

    const botaoPrincipal = {
        ...botao,
        ...botaoBase,
        width: "100%",
        border: `1px solid ${corPrincipal}`,
        background: corPrincipal,
        color: "#fff",
        boxShadow: "0 8px 18px rgba(143,39,69,0.18)",
    };

    const botaoSecundario = {
        ...botaoPequeno,
        ...botaoBase,
        width: "100%",
        border: "1px solid #dfe6ee",
        background: "#fff",
        color: corTexto,
        boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
    };

    const botaoMensagem = {
        ...botaoSecundario,
        border: "1px solid #bbf7d0",
        background: "#ecfdf5",
        color: "#15803d",
    };

    const botaoLink = {
        ...botaoSecundario,
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        color: "#1d4ed8",
    };

    const botaoCancelar = {
        ...botaoSecundario,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        color: "#475569",
    };

    const botaoIcone = ({
        ativo = false,
        danger = false,
        success = false,
        info = false,
    } = {}) => ({
        width: isMobile ? 36 : 38,
        height: isMobile ? 36 : 38,
        borderRadius: 12,
        border: ativo
            ? `1px solid ${corPrincipal}`
            : danger
            ? "1px solid #fecaca"
            : success
            ? "1px solid #bbf7d0"
            : info
            ? "1px solid #bfdbfe"
            : "1px solid #e2e8f0",
        background: ativo
            ? corPrincipal
            : danger
            ? "#fff1f2"
            : success
            ? "#ecfdf5"
            : info
            ? "#eff6ff"
            : "#fff",
        color: ativo
            ? "#fff"
            : danger
            ? "#b91c1c"
            : success
            ? "#15803d"
            : info
            ? "#1d4ed8"
            : corTexto,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        boxShadow: ativo
            ? "0 6px 14px rgba(143,39,69,0.16)"
            : "0 2px 8px rgba(15,23,42,0.04)",
    });

    const labelStyle = {
        display: "grid",
        gap: 3,
        color: corTexto,
        fontSize: 12.5,
        fontWeight: 800,
    };

    const gridDoisCampos = {
        display: "grid",
        gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(2, minmax(0, 1fr))",
        gap: 8,
    };

    const gridEndereco = {
        display: "grid",
        gridTemplateColumns: isMobile
            ? "1fr"
            : "minmax(0, 1.5fr) minmax(110px, 140px)",
        gap: 8,
    };

    const gridAcoesFormulario = {
        display: "grid",
        gridTemplateColumns: isMobile
            ? "1fr"
            : clienteEditandoId
            ? "repeat(2, minmax(0, 1fr))"
            : "1fr",
        gap: 10,
    };

    const gridAcoesCompartilhamento = {
        display: "grid",
        gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(2, minmax(0, 1fr))",
        gap: 10,
    };

    return (
        <div
            style={{
                ...boxGrande,
                display: "grid",
                gap: isMobile ? 14 : 16,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <h2 style={{ ...tituloSecao, marginBottom: 4 }}>
                        Cadastro de clientes
                    </h2>

                    <div
                        style={{
                            color: corSuave,
                            fontSize: isMobile ? 13 : 14,
                        }}
                    >
                        Cadastre, edite e compartilhe os dados das clientes.
                    </div>
                </div>

                <div
                    style={{
                        minHeight: 38,
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: `1px solid ${corBorda}`,
                        background: corFundoSuave,
                        color: corPrincipal,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: isMobile ? 12 : 13,
                        fontWeight: 900,
                    }}
                >
                    <UserRound size={16} />
                    {clientesFiltradosCadastro.length} cliente(s)
                </div>
            </div>

            <div
                style={{
                    ...cardBase,
                    padding: isMobile ? 13 : 16,
                    display: "grid",
                    gap: 10,
                    background: "#fcfdff",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <span
                        style={{
                            ...miniIcone,
                            background: corPrincipalClara,
                        }}
                    >
                        <UserRound size={17} />
                    </span>

                    <div>
                        <strong
                            style={{
                                display: "block",
                                color: corTexto,
                                fontSize: isMobile ? 15 : 16,
                            }}
                        >
                            {clienteEditandoId
                                ? "Editar cliente"
                                : "Nova cliente"}
                        </strong>

                        <span
                            style={{
                                display: "block",
                                color: corSuave,
                                fontSize: 12.5,
                                marginTop: 2,
                            }}
                        >
                            Preencha os dados principais e o endereço.
                        </span>
                    </div>
                </div>

                <div style={gridDoisCampos}>
                    <label style={labelStyle}>
                        Nome completo
                        <input
                            style={inputPadrao}
                            placeholder="Digite o nome completo"
                            value={formCliente.nome}
                            onChange={(e) =>
                                setFormCliente((prev) => ({
                                    ...prev,
                                    nome: e.target.value,
                                }))
                            }
                        />
                    </label>

                    <label style={labelStyle}>
                        CPF
                        <input
                            style={inputPadrao}
                            placeholder="000.000.000-00"
                            value={formCliente.cpf}
                            onChange={(e) =>
                                setFormCliente((prev) => ({
                                    ...prev,
                                    cpf: formatarCPF(e.target.value),
                                }))
                            }
                        />
                    </label>
                </div>

                <div style={gridDoisCampos}>
                    <label style={labelStyle}>
                        Telefone
                        <input
                            style={inputPadrao}
                            placeholder="(00) 00000-0000"
                            value={formCliente.telefone}
                            onChange={(e) =>
                                setFormCliente((prev) => ({
                                    ...prev,
                                    telefone: formatarTelefone(e.target.value),
                                }))
                            }
                        />
                    </label>

                    <label style={labelStyle}>
                        CEP
                        <input
                            style={inputPadrao}
                            placeholder="00000-000"
                            value={formCliente.cep}
                            onChange={(e) => {
                                const cepFormatado = formatarCEP(
                                    e.target.value
                                );

                                setFormCliente((prev) => ({
                                    ...prev,
                                    cep: cepFormatado,
                                }));

                                const cepLimpo = cepFormatado.replace(
                                    /\D/g,
                                    ""
                                );

                                if (cepLimpo.length === 8) {
                                    buscarCep(cepLimpo);
                                }
                            }}
                        />
                    </label>
                </div>

                <div style={gridEndereco}>
                    <label style={labelStyle}>
                        Endereço
                        <input
                            style={inputPadrao}
                            placeholder="Rua, avenida ou travessa"
                            value={formCliente.endereco}
                            onChange={(e) =>
                                setFormCliente((prev) => ({
                                    ...prev,
                                    endereco: e.target.value,
                                }))
                            }
                        />
                    </label>

                    <label style={labelStyle}>
                        Número
                        <input
                            style={inputPadrao}
                            placeholder="Nº"
                            value={formCliente.numero}
                            onChange={(e) =>
                                setFormCliente((prev) => ({
                                    ...prev,
                                    numero: e.target.value,
                                }))
                            }
                        />
                    </label>
                </div>

                <label style={labelStyle}>
                    Complemento
                    <input
                        style={inputPadrao}
                        placeholder="Apartamento, bloco ou referência"
                        value={formCliente.complemento}
                        onChange={(e) =>
                            setFormCliente((prev) => ({
                                ...prev,
                                complemento: e.target.value,
                            }))
                        }
                    />
                </label>

                <div style={gridAcoesFormulario}>
                    <button style={botaoPrincipal} onClick={salvarCliente}>
                        <Save size={16} />
                        {clienteEditandoId
                            ? "Atualizar cliente"
                            : "Salvar cliente"}
                    </button>

                    {clienteEditandoId ? (
                        <button
                            style={botaoCancelar}
                            onClick={cancelarEdicaoCliente}
                        >
                            <X size={15} />
                            Cancelar edição
                        </button>
                    ) : null}
                </div>

                <div style={gridAcoesCompartilhamento}>
                    <button
                        style={botaoLink}
                        onClick={copiarLinkCadastroCliente}
                    >
                        <Copy size={15} />
                        Copiar link de cadastro
                    </button>

                    <button
                        style={botaoMensagem}
                        onClick={copiarMensagemWhatsAppCadastroCliente}
                    >
                        <Send size={15} />
                        Copiar mensagem WhatsApp
                    </button>
                </div>
            </div>

            <div
                style={{
                    ...cardBase,
                    padding: isMobile ? 13 : 16,
                    display: "grid",
                    gap: 12,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                    }}
                >
                    <div>
                        <strong
                            style={{
                                display: "block",
                                color: corTexto,
                                fontSize: isMobile ? 15 : 16,
                            }}
                        >
                            Clientes cadastradas
                        </strong>

                        <span
                            style={{
                                color: corSuave,
                                fontSize: 12.5,
                            }}
                        >
                            Busque e gerencie os cadastros existentes.
                        </span>
                    </div>

                    <span style={miniIcone}>
                        <Search size={16} />
                    </span>
                </div>

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
                        style={{
                            ...inputPadrao,
                            paddingLeft: 38,
                        }}
                        placeholder="Buscar por nome, CPF ou telefone"
                        value={buscaClienteCadastro}
                        onChange={(e) =>
                            setBuscaClienteCadastro(e.target.value)
                        }
                    />
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gap: 10,
                }}
            >
                {clientesFiltradosCadastro.length === 0 ? (
                    <div
                        style={{
                            ...cardBase,
                            padding: isMobile ? 18 : 22,
                            textAlign: "center",
                            color: corSuave,
                        }}
                    >
                        Nenhuma cliente encontrada.
                    </div>
                ) : (
                    [...clientesFiltradosCadastro]
                        .sort((a, b) =>
                            (a.nome || "").localeCompare(
                                b.nome || "",
                                "pt-BR",
                                {
                                    sensitivity: "base",
                                }
                            )
                        )
                        .map((cliente) => {
                            const expandido =
                                !!clientesExpandidos[cliente.nome];

                            return (
                                <div
                                    key={cliente.id || cliente.nome}
                                    style={{
                                        ...cardCliente,
                                        ...cardBase,
                                        padding: isMobile ? 11 : 13,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "auto minmax(0, 1fr) auto",
                                            gap: isMobile ? 8 : 10,
                                            alignItems: "center",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            style={botaoIcone({
                                                ativo: expandido,
                                            })}
                                            onClick={() =>
                                                toggleExpandirCliente(
                                                    cliente.nome
                                                )
                                            }
                                            aria-label={
                                                expandido
                                                    ? "Minimizar cliente"
                                                    : "Expandir cliente"
                                            }
                                            title={
                                                expandido
                                                    ? "Minimizar"
                                                    : "Expandir"
                                            }
                                        >
                                            {expandido ? (
                                                <ChevronDown size={17} />
                                            ) : (
                                                <ChevronRight size={17} />
                                            )}
                                        </button>

                                        <div style={{ minWidth: 0 }}>
                                            <strong
                                                style={{
                                                    display: "block",
                                                    color: corTexto,
                                                    fontSize: isMobile
                                                        ? 14.5
                                                        : 15.5,
                                                    lineHeight: 1.2,
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {cliente.nome || "Sem nome"}
                                            </strong>

                                            <div
                                                style={{
                                                    color: corSuave,
                                                    fontSize: isMobile
                                                        ? 12
                                                        : 12.5,
                                                    marginTop: 3,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {cliente.telefone ||
                                                    cliente.cpf ||
                                                    "Sem telefone ou CPF"}
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "flex-end",
                                                gap: 6,
                                            }}
                                        >
                                            <button
                                                type="button"
                                                style={botaoIcone({
                                                    info: true,
                                                })}
                                                onClick={() =>
                                                    editarCliente(cliente)
                                                }
                                                aria-label={`Editar ${cliente.nome}`}
                                                title="Editar"
                                            >
                                                <Edit3 size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                style={botaoIcone({
                                                    success: true,
                                                })}
                                                onClick={() =>
                                                    compartilharCliente(
                                                        cliente
                                                    )
                                                }
                                                aria-label={`Compartilhar ${cliente.nome}`}
                                                title="Compartilhar"
                                            >
                                                <Share2 size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                style={botaoIcone({
                                                    danger: true,
                                                })}
                                                onClick={() =>
                                                    excluirCliente(cliente.id)
                                                }
                                                aria-label={`Excluir ${cliente.nome}`}
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {expandido ? (
                                        <div
                                            style={{
                                                marginTop: 11,
                                                paddingTop: 11,
                                                borderTop:
                                                    "1px solid #eef2f7",
                                                display: "grid",
                                                gridTemplateColumns: isMobile
                                                    ? "1fr"
                                                    : "repeat(2, minmax(0, 1fr))",
                                                gap: 8,
                                            }}
                                        >
                                            {[
                                                ["CPF", cliente.cpf],
                                                [
                                                    "Telefone",
                                                    cliente.telefone,
                                                ],
                                                ["CEP", cliente.cep],
                                                [
                                                    "Endereço",
                                                    cliente.endereco,
                                                ],
                                                ["Número", cliente.numero],
                                                [
                                                    "Complemento",
                                                    cliente.complemento,
                                                ],
                                            ].map(([label, value]) => (
                                                <div
                                                    key={label}
                                                    style={{
                                                        padding:
                                                            isMobile
                                                                ? "9px 10px"
                                                                : "10px 11px",
                                                        borderRadius: 12,
                                                        border:
                                                            "1px solid #eef2f7",
                                                        background:
                                                            corFundoSuave,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            color:
                                                                corSuave,
                                                            fontSize: 11,
                                                            fontWeight: 800,
                                                            textTransform:
                                                                "uppercase",
                                                            letterSpacing:
                                                                "0.04em",
                                                        }}
                                                    >
                                                        {label}
                                                    </div>

                                                    <div
                                                        style={{
                                                            color:
                                                                corTexto,
                                                            fontSize:
                                                                isMobile
                                                                    ? 12.5
                                                                    : 13,
                                                            fontWeight: 700,
                                                            marginTop: 3,
                                                            wordBreak:
                                                                "break-word",
                                                        }}
                                                    >
                                                        {value || "-"}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })
                )}
            </div>
        </div>
    );
}
