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
  cliente,
  setCliente,
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
  togglePagamentoClienteLive,
  cancelarVenda,
  formatarBRL,
}) {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={boxGrande}>
        <h2 style={tituloSecao}>Registro de Vendas</h2>

        <div className="grid-vendas" style={gridVendas}>
          <div style={gridForm}>
            <input
              style={input}
              placeholder="Código da peça"
              value={vendaId}
              onChange={(e) => setVendaId(e.target.value)}
            />

            <input
              style={input}
              placeholder="Nome da cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
            />

            <input
              style={input}
              placeholder="Valor com desconto (opcional)"
              value={valorDesconto}
              onChange={(e) => setValorDesconto(formatarValorDescontoInput(e.target.value))}
              inputMode="numeric"
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, auto)",
                gap: 12,
                width: "100%",
              }}
            >
              <button
                style={{
                  ...botao,
                  opacity: salvandoVenda ? 0.7 : 1,
                  cursor: salvandoVenda ? "not-allowed" : "pointer",
                  width: "100%",
                }}
                onClick={registrarVenda}
                disabled={salvandoVenda}
              >
                {salvandoVenda ? "Salvando..." : "Registrar venda"}
              </button>

              <button
                style={{ ...botao, background: "#0f766e", width: "100%" }}
                onClick={() => setScannerAtivo((prev) => !prev)}
              >
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

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              style={{ ...input, maxWidth: 320 }}
              placeholder="Buscar cliente"
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
            />

            <button
              style={
                filtroPagamentoCliente === "todos"
                  ? { ...botaoPequeno, background: "#111827" }
                  : { ...botaoPequeno, background: "#6b7280" }
              }
              onClick={() => setFiltroPagamentoCliente("todos")}
            >
              Todos
            </button>

            <button
              style={
                filtroPagamentoCliente === "pendentes"
                  ? { ...botaoPequeno, background: "#b45309" }
                  : { ...botaoPequeno, background: "#6b7280" }
              }
              onClick={() => setFiltroPagamentoCliente("pendentes")}
            >
              Pendentes
            </button>

            <button
              style={
                filtroPagamentoCliente === "pagos"
                  ? { ...botaoPequeno, background: "#15803d" }
                  : { ...botaoPequeno, background: "#6b7280" }
              }
              onClick={() => setFiltroPagamentoCliente("pagos")}
            >
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
              .map((c) => (
                <div key={c.nome} style={cardCliente}>
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
                            gridTemplateColumns:
                              "minmax(220px, 1.2fr) minmax(160px, 1fr) 140px 120px",
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
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 18,
                          padding: "4px 6px",
                          lineHeight: 1,
                          flexShrink: 0,
                          width: "auto",
                          minWidth: "auto",
                        }}
                      >
                        {clientesExpandidos[c.nome] ? "▼" : "▶"}
                      </button>

                      <strong
                        style={{
                          fontSize: 18,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={c.nome}
                      >
                        {c.nome}
                      </strong>
                    </div>

                    <div
                      style={
                        isMobile
                          ? {
                              display: "grid",
                              gridTemplateColumns: "1fr",
                              gap: 8,
                            }
                          : {
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-start",
                              gap: 8,
                              flexWrap: "nowrap",
                              whiteSpace: "nowrap",
                              paddingLeft: 8,
                            }
                      }
                    >
                      <button
                        style={{
                          ...botaoPequeno,
                          background: "#2563eb",
                          width: isMobile ? "100%" : "auto",
                        }}
                        onClick={() => exportarClienteCSV(c)}
                      >
                        CSV
                      </button>

                      <button
                        style={{
                          ...botaoPequeno,
                          background: "#111827",
                          width: isMobile ? "100%" : "auto",
                        }}
                        onClick={() => gerarComanda(c)}
                      >
                        Comanda
                      </button>

                      <button
                        style={{
                          ...botaoPequeno,
                          background: c.pago ? "#15803d" : "#b45309",
                          width: isMobile ? "100%" : "auto",
                        }}
                        onClick={() => togglePagamentoClienteLive(c.nome, c.pago)}
                      >
                        {c.pago ? "Pago" : "Pendente"}
                      </button>
                    </div>

                    <div
                      className="expedicao-info-direita"
                      style={
                        isMobile
                          ? {
                              display: "grid",
                              gap: 4,
                              textAlign: "left",
                            }
                          : {
                              display: "grid",
                              gridTemplateColumns: "90px 90px",
                              justifyContent: "start",
                              alignItems: "center",
                              columnGap: 12,
                              textAlign: "right",
                              whiteSpace: "nowrap",
                              paddingLeft: 10,
                            }
                      }
                    >
                      <span>{c.pecas} peça(s)</span>
                      <strong>{formatarBRL(c.total)}</strong>
                    </div>
                  </div>

                  {clientesExpandidos[c.nome] && (
                    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                      {c.itens.map((item, index) => (
                        <div key={`${item.codigo}-${index}`} style={itemCliente}>
                          <div><strong>Peça:</strong> {item.nomePeca}</div>
                          <div><strong>Código:</strong> {item.codigo}</div>
                          <div><strong>Valor:</strong> {formatarBRL(item.valor)}</div>
                          <div><strong>Vendido em:</strong> {item.dataVenda || "-"}</div>

                          <div style={{ marginTop: 8 }}>
                            <button
                              style={{
                                ...botaoPequeno,
                                background: "#b91c1c",
                                width: isMobile ? "100%" : "auto",
                              }}
                              onClick={() => cancelarVenda(item.codigo)}
                            >
                              Cancelar venda
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}