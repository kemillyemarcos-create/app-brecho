const LARGURA_ETIQUETA = "37mm";
const ALTURA_ETIQUETA = "58mm";

function aguardarImagens(janela) {
  const imagens = Array.from(
    janela.document.querySelectorAll("img")
  );

  if (imagens.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(
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

function converterCanvasEmImagem(
  elementoOriginal,
  elementoClonado
) {
  const canvasesOriginais =
    elementoOriginal.querySelectorAll("canvas");

  const canvasesClonados =
    elementoClonado.querySelectorAll("canvas");

  canvasesOriginais.forEach(
    (canvasOriginal, index) => {
      const canvasClonado =
        canvasesClonados[index];

      if (!canvasClonado) return;

      try {
        const imagemQr =
          document.createElement("img");

        imagemQr.src =
          canvasOriginal.toDataURL("image/png");

        imagemQr.alt = "QR Code";

        const largura =
          canvasOriginal.offsetWidth ||
          canvasOriginal.width ||
          64;

        const altura =
          canvasOriginal.offsetHeight ||
          canvasOriginal.height ||
          64;

        imagemQr.width = largura;
        imagemQr.height = altura;

        imagemQr.style.width = `${largura}px`;
        imagemQr.style.height = `${altura}px`;
        imagemQr.style.maxWidth = "100%";
        imagemQr.style.display = "block";
        imagemQr.style.objectFit = "contain";
        imagemQr.style.margin = "0 auto";

        canvasClonado.replaceWith(imagemQr);
      } catch (error) {
        console.error(
          "Erro ao converter QR Code para imagem:",
          error
        );
      }
    }
  );
}

function prepararEtiquetaParaImpressao(
  elementoOriginal
) {
  const elementoClonado =
    elementoOriginal.cloneNode(true);

  converterCanvasEmImagem(
    elementoOriginal,
    elementoClonado
  );

  return elementoClonado.outerHTML;
}

export default async function imprimirEtiquetas() {
  const areaPreview = document.querySelector(
    ".area-preview-impressao-etiquetas"
  );

  if (!areaPreview) {
    alert(
      "A área de preview das etiquetas não foi encontrada."
    );
    return;
  }

  const etiquetasOriginais = Array.from(
    areaPreview.querySelectorAll(
      ".pagina-etiqueta-rolo"
    )
  );

  if (etiquetasOriginais.length === 0) {
    alert(
      "Nenhuma etiqueta disponível para impressão."
    );
    return;
  }

  const janelaImpressao = window.open(
    "",
    "_blank"
  );

  if (!janelaImpressao) {
    alert(
      "O navegador bloqueou a janela de impressão. Libere os pop-ups para este site."
    );
    return;
  }

  try {
    const etiquetasHtml = etiquetasOriginais
      .map((elementoOriginal) =>
        prepararEtiquetaParaImpressao(
          elementoOriginal
        )
      )
      .join("");

    janelaImpressao.document.open();

    janelaImpressao.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

          <title>Etiquetas K.Chic</title>

          <style>
            @page {
              size: ${LARGURA_ETIQUETA} ${ALTURA_ETIQUETA};
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              width: ${LARGURA_ETIQUETA};
              min-width: ${LARGURA_ETIQUETA};

              margin: 0;
              padding: 0;

              background: #ffffff;

              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body {
              display: block;
              overflow: visible;
            }

            .lista-etiquetas-impressao {
              display: block;

              width: ${LARGURA_ETIQUETA};
              min-width: ${LARGURA_ETIQUETA};

              margin: 0;
              padding: 0;

              background: #ffffff;
            }

            .pagina-etiqueta-rolo {
              display: block;
              position: relative;

              width: ${LARGURA_ETIQUETA} !important;
              height: ${ALTURA_ETIQUETA} !important;

              min-width: ${LARGURA_ETIQUETA} !important;
              max-width: ${LARGURA_ETIQUETA} !important;

              min-height: ${ALTURA_ETIQUETA} !important;
              max-height: ${ALTURA_ETIQUETA} !important;

              margin: 0 !important;
              padding: 0 !important;

              overflow: hidden !important;

              background: #ffffff !important;

              border: 0 !important;
              border-radius: 0 !important;

              box-sizing: border-box !important;

              break-inside: avoid-page !important;
              page-break-inside: avoid !important;

              break-before: auto !important;
              page-break-before: auto !important;

              break-after: page !important;
              page-break-after: always !important;
            }

            .pagina-etiqueta-rolo:last-child {
              break-after: auto !important;
              page-break-after: auto !important;
            }

            .pagina-etiqueta-rolo > .etiqueta,
            .pagina-etiqueta-rolo > .etiqueta-termica-37x58,
            .etiqueta,
            .etiqueta-termica-37x58 {
              display: grid !important;

              width: ${LARGURA_ETIQUETA} !important;
              height: ${ALTURA_ETIQUETA} !important;

              min-width: ${LARGURA_ETIQUETA} !important;
              max-width: ${LARGURA_ETIQUETA} !important;

              min-height: ${ALTURA_ETIQUETA} !important;
              max-height: ${ALTURA_ETIQUETA} !important;

              margin: 0 !important;

              overflow: hidden !important;

              background: #ffffff !important;

              border: 0 !important;
              border-radius: 0 !important;

              box-sizing: border-box !important;

              break-inside: avoid-page !important;
              page-break-inside: avoid !important;
            }

            .pagina-etiqueta-rolo img {
              image-rendering: auto;
            }

            .pagina-etiqueta-rolo img[alt="QR Code"] {
              display: block !important;
              margin: 0 auto !important;
              object-fit: contain !important;
            }

            @media screen {
              html,
              body {
                width: ${LARGURA_ETIQUETA};
                min-width: ${LARGURA_ETIQUETA};
              }

              body {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
              }
            }

            @media print {
              html,
              body {
                width: ${LARGURA_ETIQUETA} !important;
                min-width: ${LARGURA_ETIQUETA} !important;

                margin: 0 !important;
                padding: 0 !important;

                overflow: visible !important;

                background: #ffffff !important;
              }

              .lista-etiquetas-impressao {
                width: ${LARGURA_ETIQUETA} !important;

                margin: 0 !important;
                padding: 0 !important;

                overflow: visible !important;
              }
            }
          </style>
        </head>

        <body>
          <main class="lista-etiquetas-impressao">
            ${etiquetasHtml}
          </main>
        </body>
      </html>
    `);

    janelaImpressao.document.close();

    await aguardarImagens(janelaImpressao);

    await new Promise((resolve) => {
      janelaImpressao.setTimeout(
        resolve,
        800
      );
    });

    janelaImpressao.focus();
    janelaImpressao.print();

    janelaImpressao.addEventListener(
      "afterprint",
      () => {
        janelaImpressao.close();
      },
      {
        once: true,
      }
    );
  } catch (error) {
    console.error(
      "Erro ao preparar impressão das etiquetas:",
      error
    );

    if (!janelaImpressao.closed) {
      janelaImpressao.close();
    }

    alert(
      "Não foi possível preparar as etiquetas para impressão."
    );
  }
}