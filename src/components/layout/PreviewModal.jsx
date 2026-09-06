import { useState } from "react";

import {
  formatarDataHoraBR as formatarDataHoraPadrao,
} from "../../utils/dateUtils";

import imprimirEtiquetas from "../print/ImprimirEtiquetas";

import { useConfig } from "../../contexts/ConfigContext";

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
  alterarGrupoVipComanda,
  formatarBRL,
  formatarDataHoraBR = formatarDataHoraPadrao,
  EtiquetaPrint,
}) {
  const { impressao } = useConfig();

  const [preparandoImpressao, setPreparandoImpressao] =
    useState(false);

  const [salvandoGrupoVip, setSalvandoGrupoVip] =
    useState(false);

  if (!previewAberto) return null;

  const ehPreviewComanda =
    tipoPreview === PREVIEW_TIPO.COMANDA;

  const ehPreviewEtiquetas =
    tipoPreview === PREVIEW_TIPO.ETIQUETAS;

  const etiquetas =
    ehPreviewEtiquetas && Array.isArray(dadosPreview)
      ? dadosPreview
      : [];

  const percentualGrupoVip = 5;

  const grupoVip =
    ehPreviewComanda &&
    !!(
      dadosPreview?.grupoVip ||
      dadosPreview?.grupo_vip
    );

  const valorOriginal = Number(
    dadosPreview?.total || 0
  );

  const valorDescontoGrupoVip = grupoVip
    ? Math.round(
        valorOriginal *
          (percentualGrupoVip / 100) *
          100
      ) / 100
    : 0;

  const valorTotalGrupoVip =
    Math.round(
      (valorOriginal - valorDescontoGrupoVip) * 100
    ) / 100;

  async function alterarGrupoVip(event) {
    const novoValor = event.target.checked;

    if (
      salvandoGrupoVip ||
      typeof alterarGrupoVipComanda !== "function"
    ) {
      return;
    }

    try {
      setSalvandoGrupoVip(true);

      await alterarGrupoVipComanda(
        dadosPreview,
        novoValor
      );
    } finally {
      setSalvandoGrupoVip(false);
    }
  }

  async function imprimir() {
    if (preparandoImpressao) return;

    if (!ehPreviewEtiquetas) {
      window.print();
      return;
    }

    try {
      setPreparandoImpressao(true);

      await imprimirEtiquetas(
        impressao?.impressoraPadrao || "a4"
      );
    } catch (error) {
      console.error(
        "Erro ao iniciar impressão das etiquetas:",
        error
      );

      alert(
        "Não foi possível preparar as etiquetas para impressão."
      );
    } finally {
      setPreparandoImpressao(false);
    }
  }

  return (
    <div
      className={`overlay-preview-impressao ${
        ehPreviewEtiquetas
          ? "preview-modo-etiquetas"
          : "preview-modo-comanda"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={
        ehPreviewComanda
          ? "Preview da comanda"
          : "Preview das etiquetas"
      }
    >
      <div className="modal-preview-impressao">
        <div className="no-print preview-topo">
          <div className="preview-titulo">
            <strong>
              {ehPreviewComanda
                ? "Preview da Comanda"
                : "Preview de Etiquetas"}
            </strong>

            {ehPreviewEtiquetas && (
              <small>
                {etiquetas.length} etiqueta(s) selecionada(s)
              </small>
            )}
          </div>

          <div className="preview-acoes">
            <button
              type="button"
              style={{
                ...botao,
                background: "#2563eb",
                opacity: preparandoImpressao ? 0.7 : 1,
                cursor: preparandoImpressao
                  ? "wait"
                  : "pointer",
              }}
              onClick={imprimir}
              disabled={
                preparandoImpressao ||
                (ehPreviewEtiquetas &&
                  etiquetas.length === 0)
              }
            >
              {preparandoImpressao
                ? "Preparando..."
                : "Imprimir"}
            </button>

            <button
              type="button"
              style={{
                ...botao,
                background: "#6b7280",
              }}
              onClick={fecharPreview}
              disabled={
                preparandoImpressao ||
                salvandoGrupoVip
              }
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

              {/* CONTROLE ADMINISTRATIVO DO GRUPO VIP */}
              <div
                className="no-print"
                style={{
                  marginBottom: 14,
                  padding: "12px 14px",
                  border: "1px solid #f0b8cc",
                  borderRadius: 10,
                  background: "#fff7fa",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: salvandoGrupoVip
                      ? "wait"
                      : "pointer",
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={grupoVip}
                    onChange={alterarGrupoVip}
                    disabled={salvandoGrupoVip}
                    style={{
                      width: 18,
                      height: 18,
                      cursor: salvandoGrupoVip
                        ? "wait"
                        : "pointer",
                    }}
                  />

                  <span>
                    Cliente participa do Grupo VIP
                  </span>

                  {salvandoGrupoVip && (
                    <small
                      style={{
                        marginLeft: "auto",
                        fontWeight: 500,
                      }}
                    >
                      Salvando...
                    </small>
                  )}
                </label>
              </div>

              {/* AÇÕES DA COMANDA */}
              <div className="no-print comanda-acoes">
                <button
                  type="button"
                  style={{
                    ...botaoPequeno,
                    background: "#2563eb",
                    opacity: salvandoGrupoVip
                      ? 0.7
                      : 1,
                  }}
                  onClick={() =>
                    copiarTextoComanda(dadosPreview)
                  }
                  disabled={salvandoGrupoVip}
                >
                  Copiar texto
                </button>

                <button
                  type="button"
                  style={{
                    ...botaoPequeno,
                    background: "#16a34a",
                    opacity: salvandoGrupoVip
                      ? 0.7
                      : 1,
                  }}
                  onClick={() =>
                    abrirWhatsappComanda(dadosPreview)
                  }
                  disabled={salvandoGrupoVip}
                >
                  Abrir WhatsApp
                </button>
              </div>

              <div className="comanda-header">
                <div>
                  <h1>Comanda da Cliente</h1>

                  <div>
                    Brechó • Resumo da compra
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                  }}
                >
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
                    {formatarBRL(
                      dadosPreview.total
                    )}
                  </strong>
                </div>
              </div>

              {/* BENEFÍCIO VIP */}
              {grupoVip && (
                <div
                  style={{
                    marginTop: 14,
                    marginBottom: 14,
                    padding: 16,
                    border: "1px solid #f0b8cc",
                    borderRadius: 10,
                    background: "#fff7fa",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      marginBottom: 12,
                    }}
                  >
                    ⭐ Benefício Grupo VIP
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 7,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 16,
                      }}
                    >
                      <span>
                        Valor das peças
                      </span>

                      <strong>
                        {formatarBRL(
                          valorOriginal
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 16,
                      }}
                    >
                      <span>
                        Desconto Grupo VIP (
                        {percentualGrupoVip}%)
                      </span>

                      <strong>
                        -{" "}
                        {formatarBRL(
                          valorDescontoGrupoVip
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        height: 1,
                        background: "#e5e7eb",
                        margin: "4px 0",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 16,
                        fontSize: 17,
                      }}
                    >
                      <strong>
                        Total com desconto
                      </strong>

                      <strong>
                        {formatarBRL(
                          valorTotalGrupoVip
                        )}
                      </strong>
                    </div>
                  </div>

                  {!dadosPreview?.pago && (
                    <div
                      style={{
                        marginTop: 12,
                        fontSize: 13,
                        lineHeight: 1.45,
                      }}
                    >
                      ⏰ Benefício válido para
                      pagamento até o final do dia
                      em que esta comanda for
                      enviada. Após esse período,
                      permanece o valor normal da
                      comanda.
                    </div>
                  )}
                </div>
              )}

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
                          <strong>
                            Código:
                          </strong>{" "}
                          {item.codigo || "-"}
                        </div>

                        <div>
                          <strong>
                            Valor:
                          </strong>{" "}
                          {formatarBRL(
                            item.valor
                          )}
                        </div>

                        <div>
                          <strong>
                            Data:
                          </strong>{" "}
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

                <div>
                  PIX para pagamento:
                </div>

                <div>
                  Chave:{" "}
                  <strong>CELULAR</strong> –{" "}
                  <strong>
                    41988921085
                  </strong>
                </div>

                <br />

                <div>
                  🏦 Banco:{" "}
                  <strong>
                    cloudwalk
                  </strong>
                </div>

                <div>
                  👩‍💼 Nome:{" "}
                  <strong>
                    Kemilly Lima
                  </strong>
                </div>

                <br />

                <div>
                  💳 Cartão: solicitar link de
                  pagamento
                </div>

                <div>
                  🚚 Solicitar envio para calcular
                  frete
                </div>
              </div>
            </div>
          )}

          {ehPreviewEtiquetas && (
            <div className="etiquetas-rolo-preview">
              {etiquetas.length > 0 ? (
                etiquetas.map(
                  (peca, index) => (
                    <div
                      key={
                        peca?.id ||
                        `etiqueta-${index}`
                      }
                      className="pagina-etiqueta-rolo"
                    >
                      <EtiquetaPrint
                        peca={peca}
                      />
                    </div>
                  )
                )
              ) : (
                <div className="no-print preview-vazio">
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