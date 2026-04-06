import { QRCodeCanvas } from "qrcode.react";

function formatarBRL(numero) {
  return Number(numero || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function EtiquetaPrint({ peca }) {
  const valorEtiqueta =
    typeof peca.venda === "number" ? formatarBRL(peca.venda) : peca.venda || "R$ 0,00";

  const obsEtiqueta =
    typeof peca?.obs === "string" ? peca.obs.trim() : String(peca?.obs || "").trim();

  return (
    <div
      className="etiqueta"
      style={{
        width: "37mm",
        height: "46mm",
        padding: "1mm 0.8mm 0.8mm 0.8mm",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "9mm 4.5mm 4.5mm 5mm 18mm",
        alignItems: "start",
        justifyItems: "center",
        rowGap: "0.2mm",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      <div
        style={{
          width: "100%",
          fontWeight: "bold",
          fontSize: "9.5px",
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
        {obsEtiqueta || ""}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "8.5px",
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
          fontSize: "6.5px",
          lineHeight: 1,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
      >
        Código: {peca.id}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          marginTop: "-0.5mm",
        }}
      >
        <QRCodeCanvas value={peca.id} size={65} />
      </div>
    </div>
  );
}