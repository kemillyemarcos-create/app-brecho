import {
    ChevronDown,
    ChevronRight,
    Copy,
    Edit3,
    ExternalLink,
    Save,
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
    const isMobile = typeof window !== "undefined" ? window.innerWidth <= 767 : false;

    const cardClienteMinimalista = {
        ...cardCliente,
        padding: isMobile ? 14 : 16,
        borderRadius: 20,
        boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
        background: "#fff",
        border: "1px solid #eef2f7",
    };

    const topoLista = {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 10,
    };

    const nomeClienteStyle = {
        margin: 0,
        fontSize: isMobile ? 15 : 16,
        fontWeight: 800,
        color: "#243746",
        lineHeight: 1.2,
        wordBreak: "break-word",
    };

    const infoClienteStyle = {
        margin: "2px 0",
        color: "#5b6b79",
        fontSize: isMobile ? 12.5 : 13.5,
        lineHeight: 1.35,
        wordBreak: "break-word",
    };

    const secaoFormulario = {
        display: "grid",
        gap: 8,
        marginBottom: 18,
        padding: isMobile ? 12 : 14,
        border: "1px solid #e8edf2",
        borderRadius: 20,
        background: "#fcfdff",
    };

    const secaoBusca = {
        display: "grid",
        gap: 8,
        marginBottom: 14,
    };

    const listaClientes = {
        display: "grid",
        gap: 10,
    };

    const inputCompacto = {
        ...inputCliente,
        minHeight: isMobile ? 36 : 38,
        height: isMobile ? 36 : 38,
        padding: isMobile ? "7px 12px" : "7px 13px",
        borderRadius: 12,
        fontSize: isMobile ? 13 : 14,
        lineHeight: 1.1,
        boxShadow: "none",
    };

    const botaoPrincipal = {
        ...botao,
        width: "100%",
        minHeight: isMobile ? 38 : 40,
        padding: isMobile ? "8px 12px" : "8px 14px",
        borderRadius: 12,
        fontSize: isMobile ? 13 : 14,
        boxShadow: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    };

    const botaoSecundario = {
        ...botaoPequeno,
        width: "100%",
        minHeight: isMobile ? 34 : 36,
        padding: isMobile ? "7px 10px" : "7px 12px",
        borderRadius: 10,
        fontSize: isMobile ? 12 : 13,
        boxShadow: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
    };

    const botaoIcone = {
        width: isMobile ? 38 : 42,
        height: isMobile ? 38 : 42,
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        color: "#243746",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 2px 6px rgba(15,23,42,0.05)",
        padding: 0,
        flexShrink: 0,
    };

    const botaoIconePrimario = {
        ...botaoIcone,
        background: "#8f2745",
        border: "1px solid #8f2745",
        color: "#fff",
    };

    const botaoIconeAzul = {
        ...botaoIcone,
        background: "#2563eb",
        border: "1px solid #2563eb",
        color: "#fff",
    };

    const botaoIconeVerde = {
        ...botaoIcone,
        background: "#16a34a",
        border: "1px solid #16a34a",
        color: "#fff",
    };

    const botaoIconeVermelho = {
        ...botaoIcone,
        background: "#dc2626",
        border: "1px solid #dc2626",
        color: "#fff",
    };

    const gridCamposEndereco = {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.5fr) minmax(100px, 130px)",
        gap: 8,
    };

    const gridAcoesFormulario = {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : clienteEditandoId ? "repeat(2, minmax(0, 1fr))" : "1fr",
        gap: 8,
    };

    const gridAcoesCadastro = {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
        gap: 8,
    };

    return (
        <div style={boxGrande}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 12,
                }}
            >
                <h2 style={{ ...tituloSecao, margin: 0 }}>Cadastro de Clientes</h2>

                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        borderRadius: 999,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        color: "#475569",
                        fontSize: isMobile ? 12 : 13,
                        fontWeight: 700,
                    }}
                >
                    <UserRound size={16} />
                    {clientesFiltradosCadastro.length} cliente(s)
                </div>
            </div>

            <div style={secaoFormulario}>
                <input
                    style={inputCompacto}
                    placeholder="Nome completo"
                    value={formCliente.nome}
                    onChange={(e) =>
                        setFormCliente((prev) => ({ ...prev, nome: e.target.value }))
                    }
                />

                <input
                    style={inputCompacto}
                    placeholder="CPF"
                    value={formCliente.cpf}
                    onChange={(e) =>
                        setFormCliente((prev) => ({
                            ...prev,
                            cpf: formatarCPF(e.target.value),
                        }))
                    }
                />

                <input
                    style={inputCompacto}
                    placeholder="Telefone"
                    value={formCliente.telefone}
                    onChange={(e) =>
                        setFormCliente((prev) => ({
                            ...prev,
                            telefone: formatarTelefone(e.target.value),
                        }))
                    }
                />

                <input
                    style={inputCompacto}
                    placeholder="CEP"
                    value={formCliente.cep}
                    onChange={(e) => {
                        const cepFormatado = formatarCEP(e.target.value);

                        setFormCliente((prev) => ({
                            ...prev,
                            cep: cepFormatado,
                        }));

                        const cepLimpo = cepFormatado.replace(/\D/g, "");
                        if (cepLimpo.length === 8) {
                            buscarCep(cepLimpo);
                        }
                    }}
                />

                <div style={gridCamposEndereco}>
                    <input
                        style={inputCompacto}
                        placeholder="Endereço"
                        value={formCliente.endereco}
                        onChange={(e) =>
                            setFormCliente((prev) => ({
                                ...prev,
                                endereco: e.target.value,
                            }))
                        }
                    />

                    <input
                        style={inputCompacto}
                        placeholder="Número"
                        value={formCliente.numero}
                        onChange={(e) =>
                            setFormCliente((prev) => ({
                                ...prev,
                                numero: e.target.value,
                            }))
                        }
                    />
                </div>

                <input
                    style={inputCompacto}
                    placeholder="Complemento"
                    value={formCliente.complemento}
                    onChange={(e) =>
                        setFormCliente((prev) => ({
                            ...prev,
                            complemento: e.target.value,
                        }))
                    }
                />

                <div style={gridAcoesFormulario}>
                    <button style={botaoPrincipal} onClick={salvarCliente}>
                        <Save size={16} />
                        {clienteEditandoId ? "Atualizar cliente" : "Salvar cliente"}
                    </button>

                    {clienteEditandoId ? (
                        <button
                            style={{
                                ...botaoSecundario,
                                background: "#6b7280",
                            }}
                            onClick={cancelarEdicaoCliente}
                        >
                            <X size={15} />
                            Cancelar edição
                        </button>
                    ) : null}
                </div>

                <div style={gridAcoesCadastro}>
                    <button
                        style={{
                            ...botaoSecundario,
                            background: "#2563eb",
                        }}
                        onClick={copiarLinkCadastroCliente}
                    >
                        <Copy size={15} />
                        Copiar link de cadastro
                    </button>

                    <button
                        style={{
                            ...botaoSecundario,
                            background: "#16a34a",
                        }}
                        onClick={copiarMensagemWhatsAppCadastroCliente}
                    >
                        <Send size={15} />
                        Copiar mensagem WhatsApp
                    </button>
                </div>
            </div>

            <div style={secaoBusca}>
                <div style={topoLista}>
                    <strong style={{ color: "#334155", fontSize: isMobile ? 15 : 16 }}>
                        Clientes cadastradas
                    </strong>
                    <span style={{ color: "#64748b", fontSize: isMobile ? 12 : 13 }}>
                        Busca e gerenciamento
                    </span>
                </div>

                <input
                    style={inputCompacto}
                    placeholder="Buscar cliente por nome, CPF ou telefone"
                    value={buscaClienteCadastro}
                    onChange={(e) => setBuscaClienteCadastro(e.target.value)}
                />
            </div>

            <div style={listaClientes}>
                {clientesFiltradosCadastro.length === 0 ? (
                    <div
                        style={{
                            ...cardClienteMinimalista,
                            textAlign: "center",
                            color: "#64748b",
                        }}
                    >
                        Nenhuma cliente encontrada.
                    </div>
                ) : (
                    [...clientesFiltradosCadastro]
                        .sort((a, b) =>
                            (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
                                sensitivity: "base",
                            })
                        )
                        .map((cliente) => {
                            const expandido = !!clientesExpandidos[cliente.nome];

                            return (
                                <div key={cliente.id || cliente.nome} style={cardClienteMinimalista}>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "auto 1fr auto",
                                            gap: 10,
                                            alignItems: "center",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            style={expandido ? botaoIconePrimario : botaoIcone}
                                            onClick={() => toggleExpandirCliente(cliente.nome)}
                                            aria-label={expandido ? "Minimizar cliente" : "Expandir cliente"}
                                            title={expandido ? "Minimizar" : "Expandir"}
                                        >
                                            {expandido ? (
                                                <ChevronDown size={18} />
                                            ) : (
                                                <ChevronRight size={18} />
                                            )}
                                        </button>

                                        <div style={{ minWidth: 0 }}>
                                            <p style={nomeClienteStyle}>{cliente.nome || "Sem nome"}</p>

                                            {!expandido ? (
                                                <p
                                                    style={{
                                                        ...infoClienteStyle,
                                                        marginTop: 3,
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                >
                                                    {cliente.telefone || cliente.cpf || "Sem telefone/CPF"}
                                                </p>
                                            ) : null}
                                        </div>

                                        <div
                                            style={{
                                                display: "inline-flex",
                                                gap: 6,
                                                justifyContent: "flex-end",
                                                alignItems: "center",
                                            }}
                                        >
                                            <button
                                                type="button"
                                                style={botaoIconeAzul}
                                                onClick={() => editarCliente(cliente)}
                                                aria-label={`Editar ${cliente.nome}`}
                                                title="Editar"
                                            >
                                                <Edit3 size={17} />
                                            </button>

                                            <button
                                                type="button"
                                                style={botaoIconeVerde}
                                                onClick={() => compartilharCliente(cliente)}
                                                aria-label={`Compartilhar ${cliente.nome}`}
                                                title="Compartilhar"
                                            >
                                                <Share2 size={17} />
                                            </button>

                                            <button
                                                type="button"
                                                style={botaoIconeVermelho}
                                                onClick={() => excluirCliente(cliente.id)}
                                                aria-label={`Excluir ${cliente.nome}`}
                                                title="Excluir"
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                        </div>
                                    </div>

                                    {expandido ? (
                                        <div
                                            style={{
                                                marginTop: 10,
                                                paddingTop: 10,
                                                borderTop: "1px solid #eef2f7",
                                                display: "grid",
                                                gap: 3,
                                            }}
                                        >
                                            <p style={infoClienteStyle}>
                                                <strong>CPF:</strong> {cliente.cpf || "-"}
                                            </p>
                                            <p style={infoClienteStyle}>
                                                <strong>Telefone:</strong> {cliente.telefone || "-"}
                                            </p>
                                            <p style={infoClienteStyle}>
                                                <strong>CEP:</strong> {cliente.cep || "-"}
                                            </p>
                                            <p style={infoClienteStyle}>
                                                <strong>Endereço:</strong> {cliente.endereco || "-"}
                                            </p>
                                            <p style={infoClienteStyle}>
                                                <strong>Número:</strong> {cliente.numero || "-"}
                                            </p>
                                            <p style={infoClienteStyle}>
                                                <strong>Complemento:</strong> {cliente.complemento || "-"}
                                            </p>
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
