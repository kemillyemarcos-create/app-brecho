import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const LARGURA_ETIQUETA_MM = 37;
const ALTURA_ETIQUETA_MM = 58;

/**
 * Aguarda o carregamento de todas as imagens presentes
 * no elemento antes de gerar o canvas.
 *
 * Isso evita que o logo fique ausente no PDF.
 */
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

          imagem.addEventListener(
            "load",
            resolve,
            {
              once: true,
            }
          );

          imagem.addEventListener(
            "error",
            resolve,
            {
              once: true,
            }
          );
        })
    )
  );
}

/**
 * Gera um canvas com a proporção exata
 * da etiqueta de 37 × 58 mm.
 */
async function transformarEtiquetaEmCanvas(
  elemento
) {
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
      /*
       * Aceita tanto a classe utilizada no PDF
       * quanto a classe usada na impressão direta.
       */
      const elementosClonados =
        documentoClonado.querySelectorAll(
          ".pagina-etiqueta-pdf, .pagina-etiqueta-rolo"
        );

      elementosClonados.forEach(
        (item) => {
          item.style.width =
            `${LARGURA_ETIQUETA_MM}mm`;

          item.style.height =
            `${ALTURA_ETIQUETA_MM}mm`;

          item.style.minWidth =
            `${LARGURA_ETIQUETA_MM}mm`;

          item.style.maxWidth =
            `${LARGURA_ETIQUETA_MM}mm`;

          item.style.minHeight =
            `${ALTURA_ETIQUETA_MM}mm`;

          item.style.maxHeight =
            `${ALTURA_ETIQUETA_MM}mm`;

          item.style.margin = "0";
          item.style.padding = "0";

          item.style.overflow = "hidden";

          item.style.background = "#ffffff";

          item.style.border = "0";
          item.style.borderRadius = "0";
          item.style.boxShadow = "none";

          item.style.boxSizing = "border-box";
        }
      );

      /*
       * Garante também o tamanho correto do componente
       * interno da etiqueta.
       */
      const etiquetasClonadas =
        documentoClonado.querySelectorAll(
          ".etiqueta, .etiqueta-termica-37x58"
        );

      etiquetasClonadas.forEach(
        (item) => {
          item.style.width =
            `${LARGURA_ETIQUETA_MM}mm`;

          item.style.height =
            `${ALTURA_ETIQUETA_MM}mm`;

          item.style.minWidth =
            `${LARGURA_ETIQUETA_MM}mm`;

          item.style.maxWidth =
            `${LARGURA_ETIQUETA_MM}mm`;

          item.style.minHeight =
            `${ALTURA_ETIQUETA_MM}mm`;

          item.style.maxHeight =
            `${ALTURA_ETIQUETA_MM}mm`;

          item.style.margin = "0";

          item.style.overflow = "hidden";

          item.style.background = "#ffffff";

          item.style.boxSizing = "border-box";
        }
      );
    },
  });
}

/**
 * Gera um PDF em que cada página possui exatamente
 * o tamanho de uma etiqueta de 37 × 58 mm.
 *
 * Dessa forma, o usuário pode escolher na tela
 * de impressão quantas páginas serão distribuídas
 * por folha A4.
 *
 * @param {HTMLElement[]} elementos
 * Elementos HTML das etiquetas.
 *
 * @param {Object} opcoes
 *
 * @param {Window|null} opcoes.janelaDestino
 * Aba previamente aberta, especialmente útil no Safari.
 *
 * @param {string} opcoes.nomeArquivo
 * Nome utilizado para o arquivo PDF.
 */
export default async function gerarPdfEtiquetas(
  elementos = [],
  {
    janelaDestino = null,
    nomeArquivo = "etiquetas-kchic.pdf",
  } = {}
) {
  const etiquetasValidas =
    elementos.filter(Boolean);

  if (etiquetasValidas.length === 0) {
    throw new Error(
      "Nenhuma etiqueta disponível para gerar o PDF."
    );
  }

  /*
   * O documento inteiro usa páginas de 37 × 58 mm.
   * Cada etiqueta ocupará uma página individual.
   */
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
    const elemento =
      etiquetasValidas[index];

    const canvas =
      await transformarEtiquetaEmCanvas(
        elemento
      );

    const imagem = canvas.toDataURL(
      "image/png",
      1
    );

    /*
     * A primeira página já é criada pelo jsPDF.
     * As demais são adicionadas conforme a quantidade
     * de etiquetas.
     */
    if (index > 0) {
      pdf.addPage(
        [
          LARGURA_ETIQUETA_MM,
          ALTURA_ETIQUETA_MM,
        ],
        "portrait"
      );
    }

    /*
     * A imagem ocupa toda a página, começando
     * em 0 × 0 e sem qualquer margem.
     */
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

  const blobPdf =
    pdf.output("blob");

  const urlPdf =
    URL.createObjectURL(blobPdf);

  /*
   * No iPhone, usar uma aba aberta diretamente
   * pelo clique reduz o risco de bloqueio do Safari.
   */
  if (
    janelaDestino &&
    !janelaDestino.closed
  ) {
    janelaDestino.location.replace(
      urlPdf
    );
  } else {
    const link =
      document.createElement("a");

    link.href = urlPdf;

    link.download = nomeArquivo;

    link.target = "_blank";

    link.rel =
      "noopener noreferrer";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  }

  /*
   * Mantém a URL ativa por tempo suficiente para
   * o navegador ou aplicativo externo abrir o PDF.
   */
  window.setTimeout(() => {
    URL.revokeObjectURL(urlPdf);
  }, 120000);

  return {
    pdf,

    blob: blobPdf,

    url: urlPdf,

    nomeArquivo,

    quantidadePaginas:
      etiquetasValidas.length,
  };
}