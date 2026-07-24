export default function CadastroSection({
  form,
  setForm,
  handleFoto,
  adicionarPeca,
  formatarMoeda,
  formatarBRL,
  isMobile = false,
  cores,
}) {
  const sectionStyle = {
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? 12 : 14,
  };

  const cardStyle = {
    border: `1px solid ${cores.borda}`,
    borderRadius: isMobile ? 18 : 20,
    padding: isMobile ? 14 : 18,
    background: cores.fundoPainel,
    boxShadow: cores.sombraLeve,
  };

  const headerStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginBottom: isMobile ? 10 : 12,
  };

  const titleStyle = {
    margin: 0,
    color: cores.texto,
    fontSize: isMobile ? 22 : 24,
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: "-0.3px",
  };

  const subtitleStyle = {
    margin: 0,
    color: cores.textoSuave,
    fontSize: 13,
    lineHeight: 1.4,
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "minmax(0, 1fr)"
      : "minmax(0, 1fr) 320px",
    gap: isMobile ? 14 : 18,
    alignItems: "start",
  };

  const formStyle = {
    display: "grid",
    gap: 8,
  };

  const fieldStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  };

  const labelStyle = {
    color: cores.texto,
    fontSize: 12,
    fontWeight: 700,
  };

  const inputStyle = {
    width: "100%",
    minHeight: 42,
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid #d7dee8",
    background: "#fff",
    color: cores.texto,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition:
      "border-color 160ms ease, box-shadow 160ms ease",
  };

  const fileFieldStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };

  const fileInputStyle = {
    width: "100%",
    minHeight: 40,
    padding: "7px 9px",
    borderRadius: 12,
    border: "1px solid #d7dee8",
    background: "#fff",
    color: cores.textoSuave,
    fontSize: 13,
    boxSizing: "border-box",
  };

  const buttonStyle = {
    width: "100%",
    minHeight: 42,
    marginTop: 2,
    padding: "9px 14px",
    border: "none",
    borderRadius: 13,
    background: cores.rosaPrincipal,
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    boxShadow:
      "0 8px 18px rgba(223,94,120,0.20)",
    transition:
      "transform 160ms ease, opacity 160ms ease",
  };

  const previewStyle = {
    border: `1px solid ${cores.borda}`,
    borderRadius: 16,
    padding: 12,
    background: "#fffafb",
  };

  const previewTitleStyle = {
    margin: "0 0 8px",
    color: cores.texto,
    fontSize: 15,
    fontWeight: 800,
  };

  const imageAreaStyle = {
    width: "100%",
    minHeight: isMobile ? 190 : 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 13,
    border: "1px dashed #d3dae4",
    background: "#fff",
    color: "#718096",
    fontSize: 13,
  };

  const imageStyle = {
    width: "100%",
    height: isMobile ? 210 : 220,
    objectFit: "cover",
  };

  const detailsStyle = {
    display: "grid",
    gap: 5,
    marginTop: 10,
  };

  const detailRowStyle = {
    display: "grid",
    gridTemplateColumns: "64px minmax(0, 1fr)",
    gap: 6,
    alignItems: "start",
    fontSize: 13,
    lineHeight: 1.35,
  };

  const detailLabelStyle = {
    color: cores.texto,
    fontWeight: 800,
  };

  const detailValueStyle = {
    color: cores.textoSuave,
    overflowWrap: "anywhere",
  };

  return (
    <section style={sectionStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            Cadastro de peças
          </h2>

          <p style={subtitleStyle}>
            Registre novas peças com valores,
            observações e foto.
          </p>
        </div>

        <div style={gridStyle}>
          <div style={formStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>
                Nome da peça
              </span>

              <input
                style={inputStyle}
                placeholder="Ex.: Jaqueta jeans"
                value={form.nome}
                onChange={(event) =>
                  setForm({
                    ...form,
                    nome: event.target.value,
                  })
                }
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>
                Valor de compra
              </span>

              <input
                style={inputStyle}
                placeholder="R$ 0,00"
                value={form.custo}
                onChange={(event) =>
                  setForm({
                    ...form,
                    custo: formatarMoeda(
                      event.target.value
                    ),
                  })
                }
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>
                Valor de venda
              </span>

              <input
                style={inputStyle}
                placeholder="R$ 0,00"
                value={form.venda}
                onChange={(event) =>
                  setForm({
                    ...form,
                    venda: formatarMoeda(
                      event.target.value
                    ),
                  })
                }
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>
                Observações
              </span>

              <input
                style={inputStyle}
                placeholder="Ex.: tamanho, marca ou estado"
                value={form.obs}
                onChange={(event) =>
                  setForm({
                    ...form,
                    obs: event.target.value,
                  })
                }
              />
            </label>

            <div style={fileFieldStyle}>
              <span style={labelStyle}>
                Foto da peça
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={handleFoto}
                style={fileInputStyle}
              />
            </div>

            <button
              type="button"
              style={buttonStyle}
              onClick={adicionarPeca}
            >
              Adicionar peça
            </button>
          </div>

          <aside style={previewStyle}>
            <h3 style={previewTitleStyle}>
              Pré-visualização
            </h3>

            <div style={imageAreaStyle}>
              {form.foto ? (
                <img
                  src={form.foto}
                  alt="Prévia da peça"
                  style={imageStyle}
                />
              ) : (
                <span>
                  Sem foto selecionada
                </span>
              )}
            </div>

            <div style={detailsStyle}>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>
                  Peça
                </span>

                <span style={detailValueStyle}>
                  {form.nome || "-"}
                </span>
              </div>

              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>
                  Compra
                </span>

                <span style={detailValueStyle}>
                  {form.custo || formatarBRL(0)}
                </span>
              </div>

              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>
                  Venda
                </span>

                <span style={detailValueStyle}>
                  {form.venda || formatarBRL(0)}
                </span>
              </div>

              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>
                  Obs.
                </span>

                <span style={detailValueStyle}>
                  {form.obs || "-"}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
