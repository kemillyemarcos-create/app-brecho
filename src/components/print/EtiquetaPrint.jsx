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
      className="etiqueta"
      style={{
        width: "37mm",
        height: "46mm",
        padding: "0.3mm 0.8mm 0.8mm 0.8mm",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "8mm 3.4mm 3.6mm 4mm 4.2mm 17mm",
        alignItems: "start",
        justifyItems: "center",
        rowGap: "0.05mm",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      <div
        style={{
          width: "100%",
          fontWeight: "bold",
          fontSize: "9.2px",
          lineHeight: 1.02,
          marginTop: "-0.4mm",
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
          fontSize: "6.5px",
          lineHeight: 1,
          marginTop: "-0.2mm",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          color: "#444",
        }}
      >
        {obsEtiqueta || ""}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "6.5px",
          lineHeight: 1,
          marginTop: "-0.2mm",
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
          fontSize: "8.3px",
          fontWeight: "bold",
          lineHeight: 1,
          marginTop: "-0.2mm",
          overflow: "hidden",
        }}
      >
        {valorEtiqueta}
      </div>

<div
  style={{
    width: "100%",
    fontSize: "6.3px",
    lineHeight: 1,
    marginTop: "-0.2mm",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    wordBreak: "break-word",
    overflowWrap: "break-word",
  }}
>
  Código: <strong>{peca.id}</strong>
</div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          marginTop: "-1.2mm",
        }}
      >
        <QRCodeCanvas value={String(peca.id || "")} size={63} />
      </div>
    </div>
  );
}