const LARGURA_ETIQUETA = "37mm";
const ALTURA_ETIQUETA = "58mm";

function dispositivoMovel() {
  const userAgent =
    navigator.userAgent ||
    navigator.vendor ||
    window.opera ||
    "";

  const porUserAgent =
    /android|iphone|ipad|ipod|mobile/i.test(
      userAgent
    );

  const porLargura = window.innerWidth < 768;

  return porUserAgent || porLargura;
}

function aguardarDocumento(janela) {
  return new Promise((resolve) => {
    if (
      janela.document.readyState === "complete" ||
      janela.document.readyState === "interactive"
    ) {
      resolve();
      return;
    }

    janela.addEventListener("load", resolve, {
      once: true,
    });
  });
}

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

  /*
   * Cada wrapper continuará representando
   * uma página individual de etiqueta.
   */
  elementoClonado.style.width =
    LARGURA_ETIQUETA;

  elementoClonado.style.height =
    ALTURA_ETIQUETA;

  elementoClonado.style.minWidth =
    LARGURA_ETIQUETA;

  elementoClonado.style.maxWidth =
    LARGURA_ETIQUETA;

  elementoClonado.style.minHeight =
    ALTURA_ETIQUETA;

  elementoClonado.style.maxHeight =
    ALTURA_ETIQUETA;

  elementoClonado.style.margin = "0";
  elementoClonado.style.padding = "0";
  elementoClonado.style.border = "0";
  elementoClonado.style.borderRadius = "0";
  elementoClonado.style.boxShadow = "none";
  elementoClonado.style.overflow = "hidden";

  return elementoClonado.outerHTML;
}

function criarHtmlImpressao({
  etiquetasHtml,
  imprimirAutomaticamente,
  quantidadeEtiquetas,
}) {
  return `
    <!DOCTYPE html>

    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        <!--
          O título fica vazio para não exibir
          "Etiquetas K.Chic" no cabeçalho do navegador.
        -->
        <title></title>

        <style>
          /*
           * Cada página do documento tem exatamente
           * o tamanho de uma etiqueta.
           *
           * Ao selecionar várias páginas por folha,
           * o navegador distribuirá apenas as etiquetas.
           */
          @page {
            size: ${LARGURA_ETIQUETA} ${ALTURA_ETIQUETA};
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;

            min-height: 100%;

            background: #f3f4f6;

            font-family:
              Arial,
              Helvetica,
              sans-serif;

            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            padding-top: 74px;
          }

          .barra-impressao {
            position: fixed;

            top: 0;
            left: 0;
            right: 0;

            z-index: 9999;

            min-height: 64px;

            display: flex;
            align-items: center;
            justify-content: space-between;

            gap: 12px;

            padding:
              max(12px, env(safe-area-inset-top))
              16px
              12px;

            background: #ffffff;

            border-bottom:
              1px solid #e5e7eb;

            box-shadow:
              0 4px 16px rgba(0, 0, 0, 0.08);
          }

          .barra-impressao-info {
            min-width: 0;

            display: flex;
            flex-direction: column;

            gap: 3px;
          }

          .barra-impressao-info strong {
            font-size: 15px;
            color: #111827;
          }

          .barra-impressao-info span {
            font-size: 12px;
            color: #6b7280;
          }

          .barra-impressao-acoes {
            display: flex;
            align-items: center;

            gap: 8px;
          }

          .botao-impressao {
            min-height: 42px;

            display: inline-flex;
            align-items: center;
            justify-content: center;

            padding: 10px 15px;

            border: none;
            border-radius: 10px;

            font-size: 14px;
            font-weight: 700;

            cursor: pointer;
            touch-action: manipulation;
          }

          .botao-voltar {
            color: #374151;
            background: #e5e7eb;
          }

          .botao-imprimir {
            color: #ffffff;
            background: #2563eb;
          }

          .aviso-configuracao {
            width: min(
              calc(100% - 28px),
              680px
            );

            margin: 16px auto 0;
            padding: 12px 14px;

            font-size: 13px;
            line-height: 1.45;

            color: #374151;
            background: #ffffff;

            border:
              1px solid #e5e7eb;

            border-radius: 10px;
          }

          .aviso-configuracao strong {
            color: #111827;
          }

          .aviso-mobile {
            display: none;

            margin: 12px 14px 0;
            padding: 11px 13px;

            font-size: 13px;
            line-height: 1.4;

            color: #92400e;
            background: #fffbeb;

            border:
              1px solid #fde68a;

            border-radius: 10px;
          }

          .area-visualizacao {
            width: 100%;

            display: flex;
            justify-content: center;

            padding:
              18px
              14px
              calc(
                24px +
                env(safe-area-inset-bottom)
              );
          }

          /*
           * Na visualização normal, as etiquetas
           * aparecem uma embaixo da outra.
           */
          .lista-etiquetas-impressao {
            display: flex;
            flex-direction: column;

            width: ${LARGURA_ETIQUETA};
            min-width: ${LARGURA_ETIQUETA};

            margin: 0;
            padding: 0;

            gap: 8px;

            background: #ffffff;

            box-shadow:
              0 5px 20px rgba(0, 0, 0, 0.12);
          }

          .pagina-etiqueta-rolo {
            display: block;
            position: relative;

            width:
              ${LARGURA_ETIQUETA} !important;

            height:
              ${ALTURA_ETIQUETA} !important;

            min-width:
              ${LARGURA_ETIQUETA} !important;

            max-width:
              ${LARGURA_ETIQUETA} !important;

            min-height:
              ${ALTURA_ETIQUETA} !important;

            max-height:
              ${ALTURA_ETIQUETA} !important;

            margin: 0 !important;
            padding: 0 !important;

            overflow: hidden !important;

            background: #ffffff !important;

            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;

            box-sizing: border-box !important;

            break-inside:
              avoid-page !important;

            page-break-inside:
              avoid !important;
          }

          .pagina-etiqueta-rolo >
            .etiqueta,
          .pagina-etiqueta-rolo >
            .etiqueta-termica-37x58,
          .etiqueta,
          .etiqueta-termica-37x58 {
            display: grid !important;

            width:
              ${LARGURA_ETIQUETA} !important;

            height:
              ${ALTURA_ETIQUETA} !important;

            min-width:
              ${LARGURA_ETIQUETA} !important;

            max-width:
              ${LARGURA_ETIQUETA} !important;

            min-height:
              ${ALTURA_ETIQUETA} !important;

            max-height:
              ${ALTURA_ETIQUETA} !important;

            margin: 0 !important;

            overflow: hidden !important;

            background: #ffffff !important;

            box-sizing: border-box !important;
          }

          .pagina-etiqueta-rolo img {
            image-rendering: auto;
          }

          .pagina-etiqueta-rolo
            img[alt="QR Code"] {
            display: block !important;

            margin: 0 auto !important;

            object-fit: contain !important;
          }

          @media (max-width: 767px) {
            body {
              padding-top:
                calc(
                  88px +
                  env(safe-area-inset-top)
                );
            }

            .barra-impressao {
              position: absolute;

              align-items: stretch;
              flex-direction: column;

              padding-left: 12px;
              padding-right: 12px;
            }

            .barra-impressao-acoes {
              width: 100%;
            }

            .botao-impressao {
              flex: 1;
            }

            .aviso-mobile {
              display: block;
            }

            .area-visualizacao {
              justify-content: flex-start;
              overflow-x: auto;
            }
          }

          @media print {
            @page {
              size:
                ${LARGURA_ETIQUETA}
                ${ALTURA_ETIQUETA};

              margin: 0 !important;
            }

            html,
            body {
              width:
                ${LARGURA_ETIQUETA} !important;

              min-width:
                ${LARGURA_ETIQUETA} !important;

              height: auto !important;
              min-height: 0 !important;

              margin: 0 !important;
              padding: 0 !important;

              overflow: visible !important;

              background: #ffffff !important;

              -webkit-print-color-adjust:
                exact !important;

              print-color-adjust:
                exact !important;
            }

            body {
              padding-top: 0 !important;
            }

            /*
             * Estes elementos existem apenas
             * na tela e nunca serão impressos.
             */
            .barra-impressao,
            .aviso-mobile,
            .aviso-configuracao {
              display: none !important;
            }

            .area-visualizacao {
              display: block !important;

              width:
                ${LARGURA_ETIQUETA} !important;

              min-width:
                ${LARGURA_ETIQUETA} !important;

              margin: 0 !important;
              padding: 0 !important;

              overflow: visible !important;

              background: #ffffff !important;
            }

            .lista-etiquetas-impressao {
              display: block !important;

              width:
                ${LARGURA_ETIQUETA} !important;

              min-width:
                ${LARGURA_ETIQUETA} !important;

              margin: 0 !important;
              padding: 0 !important;

              gap: 0 !important;

              overflow: visible !important;

              background: #ffffff !important;

              border: 0 !important;
              box-shadow: none !important;
            }

            /*
             * Cada etiqueta representa uma página.
             *
             * Não transformar esta lista em grade A4.
             * A distribuição por folha será feita pelo
             * navegador na opção "Páginas por folha".
             */
            .pagina-etiqueta-rolo {
              display: block !important;
              position: relative !important;

              width:
                ${LARGURA_ETIQUETA} !important;

              height:
                ${ALTURA_ETIQUETA} !important;

              min-width:
                ${LARGURA_ETIQUETA} !important;

              max-width:
                ${LARGURA_ETIQUETA} !important;

              min-height:
                ${ALTURA_ETIQUETA} !important;

              max-height:
                ${ALTURA_ETIQUETA} !important;

              margin: 0 !important;
              padding: 0 !important;

              overflow: hidden !important;

              background: #ffffff !important;

              border: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;

              box-sizing: border-box !important;

              break-before: auto !important;
              page-break-before: auto !important;

              break-after: page !important;
              page-break-after: always !important;

              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .pagina-etiqueta-rolo:last-child {
              break-after: auto !important;
              page-break-after: auto !important;
            }

            .pagina-etiqueta-rolo >
              .etiqueta,
            .pagina-etiqueta-rolo >
              .etiqueta-termica-37x58,
            .etiqueta,
            .etiqueta-termica-37x58 {
              display: grid !important;

              width:
                ${LARGURA_ETIQUETA} !important;

              height:
                ${ALTURA_ETIQUETA} !important;

              min-width:
                ${LARGURA_ETIQUETA} !important;

              max-width:
                ${LARGURA_ETIQUETA} !important;

              min-height:
                ${ALTURA_ETIQUETA} !important;

              max-height:
                ${ALTURA_ETIQUETA} !important;

              margin: 0 !important;

              overflow: hidden !important;

              background: #ffffff !important;

              box-sizing: border-box !important;

              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .pagina-etiqueta-rolo img {
              image-rendering: auto;
            }

            .pagina-etiqueta-rolo
              img[alt="QR Code"] {
              display: block !important;

              margin: 0 auto !important;

              object-fit: contain !important;
            }
          }
        </style>
      </head>

      <body>
        <header class="barra-impressao">
          <div class="barra-impressao-info">
            <strong>Etiquetas K.Chic</strong>

            <span>
              ${quantidadeEtiquetas}
              ${
                quantidadeEtiquetas === 1
                  ? "etiqueta preparada"
                  : "etiquetas preparadas"
              }.
            </span>
          </div>

          <div class="barra-impressao-acoes">
            <button
              type="button"
              class="botao-impressao botao-voltar"
              id="botao-voltar"
            >
              ← Voltar
            </button>

            <button
              type="button"
              class="botao-impressao botao-imprimir"
              id="botao-imprimir"
            >
              Imprimir
            </button>
          </div>
        </header>

        <div class="aviso-mobile">
          No iPhone, toque em
          <strong>Imprimir</strong>
          e selecione a impressora desejada.
        </div>

        <div class="aviso-configuracao">
          Para colocar várias etiquetas em uma folha,
          selecione a quantidade desejada em
          <strong>Páginas por folha</strong>.
          Também selecione
          <strong>Margens: nenhuma</strong>
          e desative
          <strong>Cabeçalhos e rodapés</strong>.
        </div>

        <div class="area-visualizacao">
          <main class="lista-etiquetas-impressao">
            ${etiquetasHtml}
          </main>
        </div>

        <script>
          (() => {
            const imprimirAutomaticamente =
              ${JSON.stringify(
                imprimirAutomaticamente
              )};

            const botaoImprimir =
              document.getElementById(
                "botao-imprimir"
              );

            const botaoVoltar =
              document.getElementById(
                "botao-voltar"
              );

            let imprimindo = false;

            function executarImpressao() {
              if (imprimindo) return;

              imprimindo = true;

              window.focus();

              window.setTimeout(() => {
                window.print();

                window.setTimeout(() => {
                  imprimindo = false;
                }, 1000);
              }, 100);
            }

            function voltarAoSistema() {
              try {
                window.close();
              } catch (error) {
                console.error(error);
              }

              window.setTimeout(() => {
                if (!window.closed) {
                  if (window.history.length > 1) {
                    window.history.back();
                    return;
                  }

                  window.location.href =
                    ${JSON.stringify(
                      window.location.origin
                    )};
                }
              }, 150);
            }

            botaoImprimir?.addEventListener(
              "click",
              executarImpressao
            );

            botaoVoltar?.addEventListener(
              "click",
              voltarAoSistema
            );

            window.addEventListener(
              "afterprint",
              () => {
                imprimindo = false;

                const mobile =
                  /android|iphone|ipad|ipod|mobile/i.test(
                    navigator.userAgent || ""
                  );

                if (!mobile) {
                  window.setTimeout(() => {
                    try {
                      window.close();
                    } catch (error) {
                      console.error(error);
                    }
                  }, 250);
                }
              }
            );

            if (imprimirAutomaticamente) {
              window.setTimeout(
                executarImpressao,
                500
              );
            }
          })();
        </script>
      </body>
    </html>
  `;
}

export default async function imprimirEtiquetas() {
  const areaPreview = document.querySelector(
    ".area-preview-impressao-etiquetas"
  );

  if (!areaPreview) {
    alert(
      "A área de preview das etiquetas não foi encontrada."
    );

    return {
      ok: false,
      motivo: "area_preview_nao_encontrada",
    };
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

    return {
      ok: false,
      motivo: "nenhuma_etiqueta",
    };
  }

  /*
   * A janela é aberta imediatamente após o clique
   * para reduzir o bloqueio de pop-up.
   */
  const janelaImpressao = window.open(
    "",
    "_blank"
  );

  if (!janelaImpressao) {
    alert(
      "O navegador bloqueou a janela de impressão. Libere os pop-ups para este site."
    );

    return {
      ok: false,
      motivo: "popup_bloqueado",
    };
  }

  try {
    const etiquetasHtml = etiquetasOriginais
      .map((elementoOriginal) =>
        prepararEtiquetaParaImpressao(
          elementoOriginal
        )
      )
      .join("");

    const mobile = dispositivoMovel();

    const html = criarHtmlImpressao({
      etiquetasHtml,
      imprimirAutomaticamente: !mobile,
      quantidadeEtiquetas:
        etiquetasOriginais.length,
    });

    janelaImpressao.document.open();
    janelaImpressao.document.write(html);
    janelaImpressao.document.close();

    await aguardarDocumento(
      janelaImpressao
    );

    await aguardarImagens(
      janelaImpressao
    );

    janelaImpressao.focus();

    return {
      ok: true,
      quantidade:
        etiquetasOriginais.length,
      dispositivoMovel: mobile,
    };
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

    return {
      ok: false,
      motivo: "erro_preparacao",
      error,
    };
  }
}