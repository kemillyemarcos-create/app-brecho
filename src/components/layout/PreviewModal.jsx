export default function PreviewModal({
  previewAberto,
  tipoPreview,
  dadosPreview,
  PREVIEW_TIPO,
  botao,
  botaoPequeno,
  fecharPreview,
  copiarTextoComanda,
  abrirWhatsappComanda,
  formatarBRL,
  agruparEtiquetasEmPaginas,
  EtiquetaPrint,
}) {
  if (!previewAberto) return null;

  return (
    <div
      className="overlay-preview-impressao"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="modal-preview-impressao"
        style={{
          width: "min(1000px, 95vw)",
          maxHeight: "90vh",
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="no-print"
          style={{
            padding: 16,
            borderBottom: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <strong>
            {tipoPreview === PREVIEW_TIPO.COMANDA
              ? "Preview da Comanda"
              : "Preview de Etiquetas"}
          </strong>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={{ ...botao, background: "#2563eb" }}
              onClick={() => window.print()}
            >
              Imprimir
            </button>

            <button
              style={{ ...botao, background: "#6b7280" }}
              onClick={fecharPreview}
            >
              Fechar
            </button>
          </div>
        </div>

        <div
          id="area-preview-impressao"
          style={{
            padding: 20,
            overflow: "auto",
            background: "#f8fafc",
          }}
        >
          {tipoPreview === PREVIEW_TIPO.COMANDA && dadosPreview && (
            <div
              className="comanda-print"
              style={{
                maxWidth: 780,
                margin: "0 auto",
                background: "#fff",
                padding: 24,
                borderRadius: 12,
                display: "grid",
                gap: 16,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div
                className="no-print"
                style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
              >
                <button
                  style={{ ...botaoPequeno, background: "#2563eb" }}
                  onClick={() => copiarTextoComanda(dadosPreview)}
                >
                  Copiar texto
                </button>

                <button
                  style={{ ...botaoPequeno, background: "#16a34a" }}
                  onClick={() => abrirWhatsappComanda(dadosPreview)}
                >
                  Abrir WhatsApp
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 20,
                  borderBottom: "2px solid #eef2f7",
                  paddingBottom: 18,
                }}
              >
                <div>
                  <h1 style={{ margin: 0, fontSize: 28 }}>Comanda da Cliente</h1>
                  <div style={{ color: "#6b7280", marginTop: 6 }}>
                    Brechó • Resumo da compra
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>Data</div>
                  <div>{new Date().toLocaleString("pt-BR")}</div>
                </div>
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>Cliente</div>
                  <div style={{ fontWeight: "bold" }}>{dadosPreview.nome}</div>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>Status</div>
                  <div
                    style={{
                      color: dadosPreview.pago ? "#15803d" : "#b45309",
                      fontWeight: "bold",
                    }}
                  >
                    {dadosPreview.pago ? "Pago" : "Pendente"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>Peças</div>
                  <div style={{ fontWeight: "bold" }}>{dadosPreview.pecas}</div>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>Total</div>
                  <div style={{ fontWeight: "bold" }}>
                    {formatarBRL(dadosPreview.total)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <h3 style={{ marginTop: 0 }}>Itens</h3>

                <div style={{ display: "grid", gap: 10 }}>
                  {dadosPreview.itens?.map((item, i) => (
                    <div
                      key={`${item.codigo}-${i}`}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: 12,
                        background: "#fff",
                      }}
                    >
                      <div><strong>{i + 1}. Peça:</strong> {item.nomePeca}</div>
                      <div><strong>Código:</strong> {item.codigo}</div>
                      <div><strong>Valor:</strong> {formatarBRL(item.valor)}</div>
                      <div><strong>Data:</strong> {item.dataVenda || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 16,
                  lineHeight: 1.7,
                }}
              >
                <h3 style={{ marginTop: 0 }}>Pagamento</h3>

                <div>PIX para pagamento:</div>
                <div>
                  Chave: <strong>CELULAR</strong> – <strong>41988921085</strong>
                </div>

                <br />

                <div>🏦 Banco: <strong>cloudwalk</strong></div>
                <div>👩‍💼 Nome: <strong>Kemilly Lima</strong></div>

                <br />

                <div>💳 Cartão: solicitar link (até 12x com taxas)</div>

                <br />

                <div>❌ Pode deixar em sacolinha se quiser</div>
                <div>🚚 Solicitar envio para calcular frete</div>
              </div>
            </div>
          )}

          {tipoPreview === PREVIEW_TIPO.ETIQUETAS && Array.isArray(dadosPreview) && (
            <div className="paginas-etiquetas-preview" style={{ display: "grid", gap: 0 }}>
              {agruparEtiquetasEmPaginas(dadosPreview, 25).map((pagina, paginaIndex) => (
                <div
                  key={paginaIndex}
                  className="pagina-etiquetas"
                >
                  {pagina.map((peca) => (
                    <EtiquetaPrint key={peca.id} peca={peca} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}