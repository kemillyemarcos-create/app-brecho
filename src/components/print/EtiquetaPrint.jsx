import { QRCodeCanvas } from "qrcode.react";

function formatarBRL(numero) {
  return Number(numero || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function EtiquetaPrint({ peca }) {
  const valorEtiqueta =
    typeof peca.venda === "number"
      ? formatarBRL(peca.venda)
      : peca.venda || "R$ 0,00";

  const obsEtiqueta =
    typeof peca?.obs === "string"
      ? peca.obs.trim()
      : String(peca?.obs || "").trim();

  const linhaExtra =
    peca?.marca ||
    peca?.categoria ||
    peca?.tamanho ||
    peca?.ref ||
    peca?.referencia ||
    "";

  return (
    <div
      className="etiqueta etiqueta-40x50"
      style={{
        width: "40mm",
        height: "50mm",
        minWidth: "40mm",
        maxWidth: "40mm",
        minHeight: "50mm",
        maxHeight: "50mm",
        padding: "0.6mm 1mm 1mm 1mm",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "9mm 4mm 3.5mm 6.5mm 5mm 20mm",
        alignItems: "center",
        justifyItems: "center",
        rowGap: "0mm",
        breakInside: "avoid",
        pageBreakInside: "avoid",
        background: "#fff",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          fontWeight: 900,
          fontSize: "11px",
          lineHeight: 1.05,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          wordBreak: "keep-all",
          overflowWrap: "break-word",
          hyphens: "auto",
        }}
      >
        {peca.nome}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "7.2px",
          lineHeight: 1,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          color: "#333",
        }}
      >
        {obsEtiqueta || ""}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "7px",
          lineHeight: 1,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          color: "#444",
        }}
      >
        {linhaExtra ? `Marca/Ref.: ${linhaExtra}` : ""}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "12px",
          fontWeight: 900,
          lineHeight: 1,
          overflow: "hidden",
        }}
      >
        {valorEtiqueta}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "8.5px",
          fontWeight: 700,
          lineHeight: 1,
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        Código: <strong>{peca.id}</strong>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          marginTop: "-0.8mm",
        }}
      >
        <QRCodeCanvas value={String(peca.id || "")} size={76} />
      </div>
    </div>
  );
}