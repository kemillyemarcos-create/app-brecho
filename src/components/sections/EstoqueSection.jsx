import { QRCodeCanvas } from "qrcode.react";

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

  formatarBRL,

  boxGrande,
  cabecalhoSecao,
  tituloSecao,
  linhaResumoHorizontal,
  cardResumo,
  valorResumo,
  linhaFiltros,
  input,
  botao,
  botaoPequeno,
  gridPecas,
  cardPeca,
  textoItem,
}) {
  return (
    <div style={boxGrande}>
      <div style={cabecalhoSecao}>
        <h2 style={tituloSecao}>Peças</h2>

        <div style={linhaResumoHorizontal}>
          <div style={cardResumo}>
            <strong>Total de peças</strong>
            <div style={valorResumo}>{totalPecas}</div>
          </div>

          <div style={cardResumo}>
            <strong>Disponíveis</strong>
            <div style={valorResumo}>{totalDisponiveis}</div>
          </div>

          <div style={cardResumo}>
            <strong>Vendidas</strong>
            <div style={valorResumo}>{totalVendidas}</div>
          </div>
        </div>

        <div style={linhaFiltros}>
          <input
            style={{ ...input, maxWidth: 340 }}
            placeholder="Buscar por peça, código ou cliente"
            value={buscaPeca}
            onChange={(e) => setBuscaPeca(e.target.value)}
          />

          <button
            style={
              filtroEstoque === "todas"
                ? { ...botaoPequeno, background: "#111827" }
                : { ...botaoPequeno, background: "#6b7280" }
            }
            onClick={() => setFiltroEstoque("todas")}
          >
            Todas
          </button>

          <button
            style={
              filtroEstoque === "disponiveis"
                ? { ...botaoPequeno, background: "#2563eb" }
                : { ...botaoPequeno, background: "#6b7280" }
            }
            onClick={() => setFiltroEstoque("disponiveis")}
          >
            Disponíveis
          </button>

          <button
            style={
              filtroEstoque === "vendidas"
                ? { ...botaoPequeno, background: "#15803d" }
                : { ...botaoPequeno, background: "#6b7280" }
            }
            onClick={() => setFiltroEstoque("vendidas")}
          >
            Vendidas
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <button style={{ ...botao, background: "#111827" }} onClick={marcarTodasEtiquetas}>
          Marcar todas
        </button>

        <button style={{ ...botao, background: "#6b7280" }} onClick={desmarcarTodasEtiquetas}>
          Desmarcar todas
        </button>

        <button style={{ ...botao, background: "#2563eb" }} onClick={imprimirEtiquetasSelecionadas}>
          Imprimir selecionadas
        </button>
      </div>

      {pecasFiltradas.length === 0 ? (
        <p>Nenhuma peça encontrada.</p>
      ) : (
        <div style={gridPecas}>
          {pecasFiltradas.map((p, index) => {
            const codigo = String(p?.id || `sem-codigo-${index}`);
            const nome = p?.nome || "Sem nome";
            const custo = p?.custo ? p.custo : formatarBRL(0);
            const venda = p?.venda ? p.venda : formatarBRL(0);
            const obs = p?.obs || "-";
            const cadastro = p?.data_cadastro || "-";
            const clienteNome = p?.cliente || "";
            const vendido = !!p?.vendido;
            const dataVenda = p?.data_venda || "";

            return (
              <div key={codigo} style={cardPeca}>
                <input
                  type="checkbox"
                  checked={etiquetasSelecionadas.includes(codigo)}
                  onChange={() => toggleEtiqueta(codigo)}
                />

                <p><strong>{nome}</strong></p>

                <p style={textoItem}>Código: {codigo}</p>
                <p style={textoItem}>Compra: {custo}</p>
                <p style={textoItem}>Venda: {venda}</p>
                <p style={textoItem}>Obs: {obs}</p>

                <p style={textoItem}>
                  Status:{" "}
                  <strong style={{ color: vendido ? "green" : "#333" }}>
                    {vendido ? `Vendido para ${clienteNome}` : "Disponível"}
                  </strong>
                </p>

                {vendido && <p style={textoItem}>Data: {dataVenda}</p>}

                <QRCodeCanvas value={codigo} size={100} />

                <button
                  style={{ ...botao, background: "#2563eb" }}
                  onClick={() =>
                    abrirPreview(PREVIEW_TIPO.ETIQUETAS, [
                      { ...p, id: codigo, nome, venda, obs },
                    ])
                  }
                >
                  Imprimir
                </button>

                {vendido && (
                  <button
                    style={{ ...botao, background: "#b8860b" }}
                    onClick={() => cancelarVenda(codigo)}
                  >
                    Cancelar venda
                  </button>
                )}

                <button
                  style={{ ...botao, background: "#555" }}
                  onClick={() => removerPeca(codigo)}
                >
                  Remover
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}