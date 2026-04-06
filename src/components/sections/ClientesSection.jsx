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
}) {
  return (
    <div style={boxGrande}>
      <h2 style={tituloSecao}>Cadastro de Clientes</h2>

      <div
        style={{
          display: "grid",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            style={{ ...inputCliente, maxWidth: 360 }}
            placeholder="Buscar cliente por nome, CPF, telefone ou endereço"
            value={buscaClienteCadastro}
            onChange={(e) => setBuscaClienteCadastro(e.target.value)}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              style={{ ...botao, background: "#111827" }}
              onClick={copiarLinkCadastroCliente}
            >
              Copiar link
            </button>

            <button
              style={{ ...botao, background: "#15803d" }}
              onClick={copiarMensagemWhatsAppCadastroCliente}
            >
              WhatsApp
            </button>
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 14,
            color: "#334155",
            fontSize: 14,
          }}
        >
          <strong>Link público para clientes:</strong>
          <div
            style={{
              marginTop: 6,
              wordBreak: "break-word",
              fontSize: 13,
              color: "#64748b",
            }}
          >
            {gerarLinkCadastroCliente()}
          </div>
        </div>
      </div>

      <div
        className="grid-clientes"
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <input
            style={inputCliente}
            placeholder="Nome completo"
            value={formCliente.nome}
            onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })}
          />

          <input
            style={inputCliente}
            placeholder="CPF"
            value={formCliente.cpf}
            onChange={(e) =>
              setFormCliente({ ...formCliente, cpf: formatarCPF(e.target.value) })
            }
          />

          <input
            style={inputCliente}
            placeholder="Telefone com DDD"
            value={formCliente.telefone}
            onChange={(e) =>
              setFormCliente({
                ...formCliente,
                telefone: formatarTelefone(e.target.value),
              })
            }
          />

          <input
            style={inputCliente}
            placeholder="CEP"
            value={formCliente.cep}
            onChange={(e) => {
              const cepFormatado = formatarCEP(e.target.value);
              setFormCliente({ ...formCliente, cep: cepFormatado });
              buscarCep(cepFormatado);
            }}
          />

          <input
            style={inputCliente}
            placeholder="Endereço"
            value={formCliente.endereco}
            onChange={(e) =>
              setFormCliente({ ...formCliente, endereco: e.target.value })
            }
          />

          <input
            style={inputCliente}
            placeholder="Número"
            value={formCliente.numero}
            onChange={(e) =>
              setFormCliente({ ...formCliente, numero: e.target.value })
            }
          />

          <input
            style={inputCliente}
            placeholder="Complemento"
            value={formCliente.complemento}
            onChange={(e) =>
              setFormCliente({ ...formCliente, complemento: e.target.value })
            }
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={botao} onClick={salvarCliente}>
              {clienteEditandoId ? "Atualizar Cliente" : "Salvar Cliente"}
            </button>

            {clienteEditandoId && (
              <button
                style={{ ...botao, background: "#6b7280" }}
                onClick={cancelarEdicaoCliente}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          {clientesFiltradosCadastro.length === 0 ? (
            <p>Nenhum cliente encontrado.</p>
          ) : (
            clientesFiltradosCadastro.map((c) => (
              <div key={c.id} style={cardCliente}>
                <strong>{c.nome}</strong>
                <div><strong>CPF:</strong> {c.cpf ? formatarCPF(c.cpf) : "-"}</div>
                <div>
                  <strong>Telefone:</strong> {c.telefone ? formatarTelefone(c.telefone) : "-"}
                </div>
                <div><strong>CEP:</strong> {c.cep ? formatarCEP(c.cep) : "-"}</div>
                <div><strong>Endereço:</strong> {c.endereco || "-"}</div>
                <div>
                  <strong>Nº:</strong> {c.numero || "-"}
                  {c.complemento ? ` - ${c.complemento}` : ""}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <button
                    style={{ ...botaoPequeno, background: "#2563eb" }}
                    onClick={() => editarCliente(c)}
                  >
                    Editar
                  </button>

                  <button
                    style={{ ...botaoPequeno, background: "#111827" }}
                    onClick={() => compartilharCliente(c)}
                  >
                    Compartilhar
                  </button>

                  <button
                    style={{ ...botaoPequeno, background: "#b91c1c" }}
                    onClick={() => excluirCliente(c.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}