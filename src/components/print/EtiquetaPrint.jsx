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
      className="etiqueta etiqueta-termica-58"
      style={{
        width: "58mm",
        minWidth: "58mm",
        maxWidth: "58mm",
        height: "46mm",
        minHeight: "46mm",
        maxHeight: "46mm",
        flexShrink: 0,
        transform: "none",
        padding: "1mm 2mm 1mm 2mm",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "8mm 4mm 4mm 5mm 5.5mm 19.5mm",
        alignItems: "start",
        justifyItems: "center",
        rowGap: "0.2mm",
        breakInside: "avoid",
        pageBreakInside: "avoid",
        background: "#fff",
      }}
    >
      <div
        style={{
          width: "100%",
          fontWeight: "bold",
          fontSize: "11px",
          lineHeight: 1.05,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          wordBreak: "keep-all",
          overflowWrap: "break-word",
        }}
      >
        {peca.nome}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "8px",
          lineHeight: 1,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          color: "#444",
        }}
      >
        {obsEtiqueta || ""}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "8px",
          lineHeight: 1,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          color: "#444",
        }}
      >
        {linhaExtra ? `Marca/Ref.: ${linhaExtra}` : ""}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "10px",
          fontWeight: "bold",
          lineHeight: 1,
          overflow: "hidden",
        }}
      >
        {valorEtiqueta}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "9px",
          fontWeight: 700,
          lineHeight: 1,
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        Código: {peca.id}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
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