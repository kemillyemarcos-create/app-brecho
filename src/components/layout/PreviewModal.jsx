import { formatarDataHoraBR } from "../../utils/dateUtils";
import imprimirEtiquetas from "../print/imprimirEtiquetas";

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
  EtiquetaPrint,
}) {
  if (!previewAberto) return null;

  const ehPreviewComanda =
    tipoPreview === PREVIEW_TIPO.COMANDA;

  const ehPreviewEtiquetas =
    tipoPreview === PREVIEW_TIPO.ETIQUETAS;

  const etiquetas =
    ehPreviewEtiquetas && Array.isArray(dadosPreview)
      ? dadosPreview
      : [];

  function imprimir() {
    if (ehPreviewEtiquetas) {
      imprimirEtiquetas();
      return;
    }

    window.print();
  }

  return (
    <div
      className={`overlay-preview-impressao ${
        ehPreviewEtiquetas
          ? "preview-modo-etiquetas"
          : "preview-modo-comanda"
      }`}
    >
      <div className="modal-preview-impressao">
        <div className="no-print preview-topo">
          <strong>
            {ehPreviewComanda
              ? "Preview da Comanda"
              : "Preview de Etiquetas"}
          </strong>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              style={{
                ...botao,
                background: "#2563eb",
              }}
              onClick={imprimir}
            >
              Imprimir
            </button>

            <button
              type="button"
              style={{
                ...botao,
                background: "#6b7280",
              }}
              onClick={fecharPreview}
            >
              Fechar
            </button>
          </div>
        </div>

        <div
          id="area-preview-impressao"
          className={`area-preview-impressao ${
            ehPreviewEtiquetas
              ? "area-preview-impressao-etiquetas"
              : "area-preview-impressao-comanda"
          }`}
        >
          {ehPreviewComanda && dadosPreview && (
            <div className="comanda-print">
              <div
                className="no-print"
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  style={{
                    ...botaoPequeno,
                    background: "#2563eb",
                  }}
                  onClick={() =>
                    copiarTextoComanda(dadosPreview)
                  }
                >
                  Copiar texto
                </button>

                <button
                  type="button"
                  style={{
                    ...botaoPequeno,
                    background: "#16a34a",
                  }}
                  onClick={() =>
                    abrirWhatsappComanda(dadosPreview)
                  }
                >
                  Abrir WhatsApp
                </button>
              </div>

              <div className="comanda-header">
                <div>
                  <h1>Comanda da Cliente</h1>
                  <div>Brechó • Resumo da compra</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <small>Data</small>

                  <div>
                    {formatarDataHoraBR(new Date())}
                  </div>
                </div>
              </div>

              <div className="comanda-resumo">
                <div>
                  <small>Cliente</small>

                  <strong>
                    {dadosPreview.nome || "-"}
                  </strong>
                </div>

                <div>
                  <small>Live</small>

                  <strong>
                    {dadosPreview.liveNome ||
                      dadosPreview.live ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <small>Status</small>

                  <strong
                    style={{
                      color: dadosPreview.pago
                        ? "#15803d"
                        : "#b45309",
                    }}
                  >
                    {dadosPreview.pago
                      ? "Pago"
                      : "Pendente"}
                  </strong>
                </div>

                <div>
                  <small>Peças</small>

                  <strong>
                    {dadosPreview.pecas || 0}
                  </strong>
                </div>

                <div>
                  <small>Total</small>

                  <strong>
                    {formatarBRL(dadosPreview.total)}
                  </strong>
                </div>
              </div>

              <div className="comanda-box">
                <h3>Itens</h3>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >
                  {(dadosPreview.itens || []).map(
                    (item, index) => (
                      <div
                        key={`${
                          item.codigo || "item"
                        }-${index}`}
                        className="comanda-item"
                      >
                        <div>
                          <strong>
                            {index + 1}. Peça:
                          </strong>{" "}
                          {item.nomePeca || "-"}
                        </div>

                        <div>
                          <strong>Código:</strong>{" "}
                          {item.codigo || "-"}
                        </div>

                        <div>
                          <strong>Valor:</strong>{" "}
                          {formatarBRL(item.valor)}
                        </div>

                        <div>
                          <strong>Data:</strong>{" "}
                          {formatarDataHoraBR(
                            item.dataVenda
                          ) || "-"}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="comanda-box">
                <h3>Pagamento</h3>

                <div>PIX para pagamento:</div>

                <div>
                  Chave: <strong>CELULAR</strong> –{" "}
                  <strong>41988921085</strong>
                </div>

                <br />

                <div>
                  🏦 Banco: <strong>cloudwalk</strong>
                </div>

                <div>
                  👩‍💼 Nome:{" "}
                  <strong>Kemilly Lima</strong>
                </div>

                <br />

                <div>
                  💳 Cartão: solicitar link de pagamento
                </div>

                <div>
                  🚚 Solicitar envio para calcular frete
                </div>
              </div>
            </div>
          )}

          {ehPreviewEtiquetas && (
            <div className="etiquetas-rolo-preview">
              {etiquetas.length > 0 ? (
                etiquetas.map((peca, index) => (
                  <div
                    key={
                      peca?.id ||
                      `etiqueta-${index}`
                    }
                    className="pagina-etiqueta-rolo"
                  >
                    <EtiquetaPrint peca={peca} />
                  </div>
                ))
              ) : (
                <div className="no-print">
                  Nenhuma etiqueta selecionada.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}