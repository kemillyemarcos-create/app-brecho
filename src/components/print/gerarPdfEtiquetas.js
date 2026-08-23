import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const LARGURA_ETIQUETA_MM = 37;
const ALTURA_ETIQUETA_MM = 58;

const LARGURA_A4_MM = 210;
const ALTURA_A4_MM = 297;

const COLUNAS_A4 = 5;
const LINHAS_A4 = 5;
const ETIQUETAS_POR_A4 = COLUNAS_A4 * LINHAS_A4;

const MARGEM_X_A4 =
  (LARGURA_A4_MM - COLUNAS_A4 * LARGURA_ETIQUETA_MM) / 2;

const MARGEM_Y_A4 =
  (ALTURA_A4_MM - LINHAS_A4 * ALTURA_ETIQUETA_MM) / 2;

async function aguardarImagens(elemento) {
  if (!elemento) return;

  const imagens = Array.from(
    elemento.querySelectorAll("img")
  );

  await Promise.all(
    imagens.map(
      (imagem) =>
        new Promise((resolve) => {
          if (
            imagem.complete &&
            imagem.naturalWidth > 0
          ) {
            resolve();
            return;
          }

          imagem.addEventListener("load", resolve, {
            once: true,
          });

          imagem.addEventListener("error", resolve, {
            once: true,
          });
        })
    )
  );
}

async function transformarEtiquetaEmCanvas(elemento) {
  await aguardarImagens(elemento);

  return html2canvas(elemento, {
    scale: 4,
    backgroundColor: "#ffffff",
    useCORS: true,
    allowTaint: true,
    logging: false,
    removeContainer: true,
    width: elemento.scrollWidth,
    height: elemento.scrollHeight,
    windowWidth: elemento.scrollWidth,
    windowHeight: elemento.scrollHeight,
    onclone: (documentoClonado) => {
      const elementosClonados =
        documentoClonado.querySelectorAll(
          ".pagina-etiqueta-pdf, .pagina-etiqueta-rolo"
        );

      elementosClonados.forEach((item) => {
        item.style.width = `${LARGURA_ETIQUETA_MM}mm`;
        item.style.height = `${ALTURA_ETIQUETA_MM}mm`;
        item.style.minWidth = `${LARGURA_ETIQUETA_MM}mm`;
        item.style.maxWidth = `${LARGURA_ETIQUETA_MM}mm`;
        item.style.minHeight = `${ALTURA_ETIQUETA_MM}mm`;
        item.style.maxHeight = `${ALTURA_ETIQUETA_MM}mm`;
        item.style.margin = "0";
        item.style.padding = "0";
        item.style.overflow = "hidden";
        item.style.background = "#ffffff";
        item.style.border = "0";
        item.style.borderRadius = "0";
        item.style.boxShadow = "none";
        item.style.boxSizing = "border-box";
      });

      const etiquetasClonadas =
        documentoClonado.querySelectorAll(
          ".etiqueta, .etiqueta-termica-37x58"
        );

      etiquetasClonadas.forEach((item) => {
        item.style.width = `${LARGURA_ETIQUETA_MM}mm`;
        item.style.height = `${ALTURA_ETIQUETA_MM}mm`;
        item.style.minWidth = `${LARGURA_ETIQUETA_MM}mm`;
        item.style.maxWidth = `${LARGURA_ETIQUETA_MM}mm`;
        item.style.minHeight = `${ALTURA_ETIQUETA_MM}mm`;
        item.style.maxHeight = `${ALTURA_ETIQUETA_MM}mm`;
        item.style.margin = "0";
        item.style.overflow = "hidden";
        item.style.background = "#ffffff";
        item.style.boxSizing = "border-box";
      });
    },
  });
}

async function gerarPdfTermico(etiquetasValidas) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [
      LARGURA_ETIQUETA_MM,
      ALTURA_ETIQUETA_MM,
    ],
    compress: true,
    hotfixes: ["px_scaling"],
  });

  for (
    let index = 0;
    index < etiquetasValidas.length;
    index += 1
  ) {
    const canvas = await transformarEtiquetaEmCanvas(
      etiquetasValidas[index]
    );

    const imagem = canvas.toDataURL("image/png", 1);

    if (index > 0) {
      pdf.addPage(
        [LARGURA_ETIQUETA_MM, ALTURA_ETIQUETA_MM],
        "portrait"
      );
    }

    pdf.addImage(
      imagem,
      "PNG",
      0,
      0,
      LARGURA_ETIQUETA_MM,
      ALTURA_ETIQUETA_MM,
      undefined,
      "FAST"
    );
  }

  return pdf;
}

async function gerarPdfA4(etiquetasValidas) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
    hotfixes: ["px_scaling"],
  });

  for (
    let index = 0;
    index < etiquetasValidas.length;
    index += 1
  ) {
    if (index > 0 && index % ETIQUETAS_POR_A4 === 0) {
      pdf.addPage("a4", "portrait");
    }

    const posicaoNaFolha = index % ETIQUETAS_POR_A4;
    const coluna = posicaoNaFolha % COLUNAS_A4;
    const linha = Math.floor(posicaoNaFolha / COLUNAS_A4);

    const x =
      MARGEM_X_A4 + coluna * LARGURA_ETIQUETA_MM;

    const y =
      MARGEM_Y_A4 + linha * ALTURA_ETIQUETA_MM;

    const canvas = await transformarEtiquetaEmCanvas(
      etiquetasValidas[index]
    );

    const imagem = canvas.toDataURL("image/png", 1);

    pdf.addImage(
      imagem,
      "PNG",
      x,
      y,
      LARGURA_ETIQUETA_MM,
      ALTURA_ETIQUETA_MM,
      undefined,
      "FAST"
    );
  }

  return pdf;
}

function abrirOuBaixarPdf({
  pdf,
  janelaDestino,
  nomeArquivo,
}) {
  const blobPdf = pdf.output("blob");
  const urlPdf = URL.createObjectURL(blobPdf);

  if (janelaDestino && !janelaDestino.closed) {
    janelaDestino.location.replace(urlPdf);
  } else {
    const link = document.createElement("a");

    link.href = urlPdf;
    link.download = nomeArquivo;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(urlPdf);
  }, 120000);

  return {
    blob: blobPdf,
    url: urlPdf,
  };
}

/**
 * Gera PDF em dois formatos:
 * - modo "termica": uma página de 37 × 58 mm por etiqueta.
 * - modo "a4": grade fixa de 5 × 5, até 25 etiquetas por A4.
 */
export default async function gerarPdfEtiquetas(
  elementos = [],
  {
    janelaDestino = null,
    nomeArquivo = "etiquetas-kchic.pdf",
    modo = "termica",
  } = {}
) {
  const etiquetasValidas = elementos.filter(Boolean);

  if (etiquetasValidas.length === 0) {
    throw new Error(
      "Nenhuma etiqueta disponível para gerar o PDF."
    );
  }

  const modoNormalizado =
    modo === "a4" ? "a4" : "termica";

  const pdf =
    modoNormalizado === "a4"
      ? await gerarPdfA4(etiquetasValidas)
      : await gerarPdfTermico(etiquetasValidas);

  const { blob, url } = abrirOuBaixarPdf({
    pdf,
    janelaDestino,
    nomeArquivo,
  });

  return {
    pdf,
    blob,
    url,
    nomeArquivo,
    modo: modoNormalizado,
    quantidadeEtiquetas: etiquetasValidas.length,
    quantidadePaginas:
      modoNormalizado === "a4"
        ? Math.ceil(
            etiquetasValidas.length / ETIQUETAS_POR_A4
          )
        : etiquetasValidas.length,
  };
}
