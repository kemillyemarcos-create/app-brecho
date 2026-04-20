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
    const cardClienteMinimalista = {
        ...cardCliente,
        padding: 14,
        borderRadius: 16,
        boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
        background: "#fff",
    };

    const topoLista = {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 14,
    };

    const nomeClienteStyle = {
        fontSize: 16,
        fontWeight: 700,
        color: "#243746",
        margin: 0,
    };

    const infoClienteStyle = {
        margin: "4px 0",
        color: "#5b6b79",
        fontSize: 14,
        lineHeight: 1.45,
    };

    const acoesCliente = {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 12,
    };

    const secaoFormulario = {
        display: "grid",
        gap: 12,
        marginBottom: 24,
        padding: 18,
        border: "1px solid #e8edf2",
        borderRadius: 18,
        background: "#fcfdff",
    };

    const secaoBusca = {
        display: "grid",
        gap: 10,
        marginBottom: 18,
    };

    const listaClientes = {
        display: "grid",
        gap: 10,
    };

    return (
        <div style={boxGrande}>
            <h2 style={tituloSecao}>Cadastro de Clientes</h2>

            <div style={secaoFormulario}>
                <input
                    style={inputCliente}
                    placeholder="Nome completo"
                    value={formCliente.nome}
                    onChange={(e) =>
                        setFormCliente((prev) => ({ ...prev, nome: e.target.value }))
                    }
                />

                <input
                    style={inputCliente}
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
                    style={inputCliente}
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
                    style={inputCliente}
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

                <input
                    style={inputCliente}
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
                    style={inputCliente}
                    placeholder="Número"
                    value={formCliente.numero}
                    onChange={(e) =>
                        setFormCliente((prev) => ({
                            ...prev,
                            numero: e.target.value,
                        }))
                    }
                />

                <input
                    style={inputCliente}
                    placeholder="Complemento"
                    value={formCliente.complemento}
                    onChange={(e) =>
                        setFormCliente((prev) => ({
                            ...prev,
                            complemento: e.target.value,
                        }))
                    }
                />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button style={botao} onClick={salvarCliente}>
                        {clienteEditandoId ? "Atualizar cliente" : "Salvar cliente"}
                    </button>

                    {clienteEditandoId ? (
                        <button
                            style={{ ...botaoPequeno, background: "#6b7280", padding: "12px 16px" }}
                            onClick={cancelarEdicaoCliente}
                        >
                            Cancelar edição
                        </button>
                    ) : null}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                        style={{ ...botaoPequeno, background: "#2563eb", padding: "10px 14px" }}
                        onClick={copiarLinkCadastroCliente}
                    >
                        Copiar link de cadastro
                    </button>

                    <button
                        style={{ ...botaoPequeno, background: "#16a34a", padding: "10px 14px" }}
                        onClick={copiarMensagemWhatsAppCadastroCliente}
                    >
                        Copiar mensagem WhatsApp
                    </button>
                </div>
            </div>

            <div style={secaoBusca}>
                <div style={topoLista}>
                    <strong style={{ color: "#334155", fontSize: 16 }}>
                        Clientes cadastradas
                    </strong>
                    <span style={{ color: "#64748b", fontSize: 13 }}>
                        {clientesFiltradosCadastro.length} cliente(s)
                    </span>
                </div>

                <input
                    style={inputCliente}
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
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 12,
                                        }}
                                    >
                                        <p style={nomeClienteStyle}>{cliente.nome || "Sem nome"}</p>

                                        <button
                                            style={{
                                                ...botaoPequeno,
                                                background: expandido ? "#64748b" : "#8f2745",
                                            }}
                                            onClick={() => toggleExpandirCliente(cliente.nome)}
                                        >
                                            {expandido ? "Minimizar" : "Expandir"}
                                        </button>
                                    </div>

                                    {expandido ? (
                                        <div style={{ marginTop: 12 }}>
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

                                            <div style={acoesCliente}>
                                                <button
                                                    style={{ ...botaoPequeno, background: "#2563eb" }}
                                                    onClick={() => editarCliente(cliente)}
                                                >
                                                    Editar
                                                </button>

                                                <button
                                                    style={{ ...botaoPequeno, background: "#16a34a" }}
                                                    onClick={() => compartilharCliente(cliente)}
                                                >
                                                    Compartilhar
                                                </button>

                                                <button
                                                    style={{ ...botaoPequeno, background: "#dc2626" }}
                                                    onClick={() => excluirCliente(cliente.id)}
                                                >
                                                    Excluir
                                                </button>
                                            </div>
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