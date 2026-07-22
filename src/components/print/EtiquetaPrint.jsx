import { QRCodeCanvas } from "qrcode.react";
import logoKchic from "../../assets/logo-kchic.png";

function limparMoeda(valor) {
  if (!valor) return 0;

  return (
    Number(
      String(valor)
        .replace(/[^\d,]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    ) || 0
  );
}

function formatarBRL(numero) {
  return Number(numero || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function separarCodigo(codigo) {
  const numeros = String(codigo || "").replace(
    /\D/g,
    ""
  );

  return {
    completo:
      numeros || String(codigo || ""),

    inicio:
      numeros
        ? `KC-${numeros.slice(0, 4)}`
        : "KC-",

    restante: numeros.slice(4),
  };
}

function quebrarTexto(texto, limite = 16) {
  const palavras = String(texto || "")
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  const linhas = [];

  let linhaAtual = "";

  palavras.forEach((palavra) => {
    const tentativa = linhaAtual
      ? `${linhaAtual} ${palavra}`
      : palavra;

    if (tentativa.length <= limite) {
      linhaAtual = tentativa;
      return;
    }

    if (linhaAtual) {
      linhas.push(linhaAtual);
    }

    linhaAtual = palavra;
  });

  if (linhaAtual) {
    linhas.push(linhaAtual);
  }

  return linhas.slice(0, 4);
}

export default function EtiquetaPrint({
  peca,
}) {
  const valorVenda = limparMoeda(
    peca?.venda
  );

  const valorEtiqueta =
    valorVenda > 0
      ? formatarBRL(valorVenda)
      : "R$ 0,00";

  const codigoOriginal = String(
    peca?.id || ""
  );

  const {
    completo: codigoCompleto,
    inicio: codigoInicio,
    restante: codigoRestante,
  } = separarCodigo(codigoOriginal);

  const linhasNome = quebrarTexto(
    peca?.nome || "PEÇA",
    16
  );

  const observacao = String(
    peca?.obs ||
      peca?.observacao ||
      ""
  )
    .trim()
    .toUpperCase();

  return (
    <div
      className="etiqueta etiqueta-termica-37x58"
      style={{
        width: "37mm",
        height: "58mm",

        minWidth: "37mm",
        maxWidth: "37mm",

        minHeight: "58mm",
        maxHeight: "58mm",

        margin: 0,
        padding: 0,

        boxSizing: "border-box",

        background: "#ffffff",
        overflow: "hidden",

        borderRadius: "1.5mm",
        border: "0.2mm solid #dddddd",

        fontFamily:
          "Arial, Helvetica, sans-serif",

        color: "#000000",

        display: "grid",

        gridTemplateRows:
          "9mm 21mm 18mm 10mm",
      }}
    >
      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "1fr auto",

          alignItems: "start",

          padding:
            "2mm 2.2mm 0 2.2mm",
        }}
      >
        <img
          src={logoKchic}
          alt="K.Chic"
          style={{
            width: "13mm",
            maxHeight: "9mm",

            display: "block",

            objectFit: "contain",
          }}
        />

        <div
          style={{
            textAlign: "right",

            fontSize: "8px",
            lineHeight: 1,

            letterSpacing: "0.6px",

            fontWeight: 900,

            paddingTop: "0.8mm",

            whiteSpace: "nowrap",
          }}
        >
          {codigoInicio}
        </div>
      </div>

      <div
        style={{
          padding: "0 2mm",

          display: "grid",

          alignContent: "center",
          justifyItems: "center",

          textAlign: "center",

          fontWeight: 900,

          fontSize: "11px",

          letterSpacing: "1.4px",

          lineHeight: 1.25,

          overflow: "hidden",
        }}
      >
        {linhasNome.map(
          (linha, index) => (
            <div key={`${linha}-${index}`}>
              {linha}
            </div>
          )
        )}

        {observacao && (
          <div
            style={{
              marginTop: "0.7mm",

              maxWidth: "100%",

              fontSize: "7px",

              color: "#666666",

              fontWeight: 700,

              letterSpacing: "0.5px",

              textTransform: "uppercase",

              lineHeight: 1.1,

              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {observacao}
          </div>
        )}

        <div
          style={{
            marginTop: "0.7mm",

            fontSize: "10px",

            letterSpacing: "1.5px",

            fontWeight: 900,

            whiteSpace: "nowrap",
          }}
        >
          {codigoRestante}
        </div>
      </div>

      <div
        style={{
          borderTop:
            "0.25mm dashed #c65b78",

          margin: "0 2mm",

          paddingTop: "1.4mm",

          display: "grid",

          justifyItems: "center",
          alignContent: "center",

          overflow: "hidden",
        }}
      >
        <QRCodeCanvas
          value={codigoCompleto}
          size={64}
          includeMargin={false}
        />
      </div>

      <div
        style={{
          padding:
            "0 2.2mm 1mm 2.2mm",

          display: "grid",

          gridTemplateColumns:
            "1fr auto",

          alignItems: "end",

          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontSize: "8px",

            color: "#b14a66",

            fontWeight: 500,

            letterSpacing: "0.4px",

            paddingBottom: "0.5mm",
          }}
        >
          PREÇO
        </div>

        <div
          style={{
            fontSize: "14px",

            fontWeight: 900,

            letterSpacing: "0.6px",

            lineHeight: 1,

            whiteSpace: "nowrap",
          }}
        >
          {valorEtiqueta}
        </div>
      </div>
    </div>
  );
}