const LARGURA_ETIQUETA = "37mm";
const ALTURA_ETIQUETA = "58mm";

const MODO_A4 = "a4";
const MODO_TERMICA = "termica";

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
      const canvasClonado = canvasesClonados[index];

      if (!canvasClonado) return;

      try {
        const imagemQr = document.createElement("img");

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

  elementoClonado.style.width = LARGURA_ETIQUETA;
  elementoClonado.style.height = ALTURA_ETIQUETA;
  elementoClonado.style.minWidth = LARGURA_ETIQUETA;
  elementoClonado.style.maxWidth = LARGURA_ETIQUETA;
  elementoClonado.style.minHeight = ALTURA_ETIQUETA;
  elementoClonado.style.maxHeight = ALTURA_ETIQUETA;
  elementoClonado.style.margin = "0";
  elementoClonado.style.padding = "0";
  elementoClonado.style.border = "0";
  elementoClonado.style.borderRadius = "0";
  elementoClonado.style.boxShadow = "none";
  elementoClonado.style.overflow = "hidden";
  elementoClonado.style.boxSizing = "border-box";

  return elementoClonado.outerHTML;
}

function dividirEmGrupos(lista, tamanho) {
  const grupos = [];

  for (let index = 0; index < lista.length; index += tamanho) {
    grupos.push(lista.slice(index, index + tamanho));
  }

  return grupos;
}

function criarFolhasA4(etiquetasHtml) {
  return dividirEmGrupos(etiquetasHtml, 25)
    .map(
      (grupo, indiceFolha) => `
        <section
          class="folha-a4"
          data-folha="${indiceFolha + 1}"
        >
          ${grupo.join("")}
        </section>
      `
    )
    .join("");
}

function criarListaTermica(etiquetasHtml) {
  return etiquetasHtml
    .map(
      (etiquetaHtml) => `
        <section class="pagina-termica">
          ${etiquetaHtml}
        </section>
      `
    )
    .join("");
}

function normalizarModo(modo) {
  if (modo === MODO_A4 || modo === MODO_TERMICA) {
    return modo;
  }

  return MODO_A4;
}

function criarHtmlImpressao({
  etiquetasHtml,
  quantidadeEtiquetas,
  modoInicial,
}) {
  const folhasA4Html = criarFolhasA4(etiquetasHtml);
  const termicaHtml = criarListaTermica(etiquetasHtml);

  return `
    <!DOCTYPE html>

    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <title>Impressão de etiquetas K.Chic</title>

        <style id="configuracao-pagina-impressao"></style>

        <style>
          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            min-height: 100%;
            background: #f3f4f6;
            font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            padding-top: 88px;
          }

          .barra-impressao {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 9999;
            min-height: 76px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 12px 16px;
            background: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
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
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .botao-impressao {
            min-height: 42px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 14px;
            border: 1px solid transparent;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            touch-action: manipulation;
          }

          .botao-voltar {
            color: #374151;
            background: #e5e7eb;
          }

          .botao-modo {
            color: #374151;
            background: #ffffff;
            border-color: #d1d5db;
          }

          .botao-modo.ativo {
            color: #ffffff;
            background: #b14a66;
            border-color: #b14a66;
          }

          .botao-imprimir {
            color: #ffffff;
            background: #2563eb;
          }

          .aviso-configuracao {
            width: min(calc(100% - 28px), 760px);
            margin: 16px auto 0;
            padding: 12px 14px;
            font-size: 13px;
            line-height: 1.45;
            color: #374151;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
          }

          .aviso-configuracao strong {
            color: #111827;
          }

          .area-visualizacao {
            width: 100%;
            display: flex;
            justify-content: center;
            padding: 18px 14px 30px;
            overflow-x: auto;
          }

          .preview-a4,
          .preview-termica {
            display: none;
          }

          body[data-modo="a4"] .preview-a4 {
            display: block;
          }

          body[data-modo="termica"] .preview-termica {
            display: block;
          }

          .folha-a4 {
            width: 210mm;
            min-width: 210mm;
            height: 297mm;
            margin: 0 auto 18px;
            padding: 3.5mm 12.5mm;
            display: grid;
            grid-template-columns: repeat(5, 37mm);
            grid-template-rows: repeat(5, 58mm);
            grid-auto-flow: row;
            align-content: start;
            justify-content: start;
            gap: 0;
            background: #ffffff;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.14);
          }

          .preview-termica {
            width: 37mm;
            min-width: 37mm;
            margin: 0 auto;
            background: #ffffff;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.14);
          }

          .pagina-termica {
            display: block;
            position: relative;
            width: 37mm;
            height: 58mm;
            min-width: 37mm;
            max-width: 37mm;
            min-height: 58mm;
            max-height: 58mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #ffffff;
          }

          .folha-a4 .pagina-etiqueta-rolo,
          .pagina-termica .pagina-etiqueta-rolo,
          .folha-a4 .etiqueta,
          .folha-a4 .etiqueta-termica-37x58,
          .pagina-termica .etiqueta,
          .pagina-termica .etiqueta-termica-37x58 {
            width: 37mm !important;
            height: 58mm !important;
            min-width: 37mm !important;
            max-width: 37mm !important;
            min-height: 58mm !important;
            max-height: 58mm !important;
            margin: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
          }

          .folha-a4 img,
          .pagina-termica img {
            image-rendering: auto;
          }

          img[alt="QR Code"] {
            display: block !important;
            margin: 0 auto !important;
            object-fit: contain !important;
          }

          @media (max-width: 900px) {
            body {
              padding-top: 156px;
            }

            .barra-impressao {
              position: absolute;
              align-items: stretch;
              flex-direction: column;
            }

            .barra-impressao-acoes {
              justify-content: flex-start;
            }

            .area-visualizacao {
              justify-content: flex-start;
            }
          }

          @media print {
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              overflow: visible !important;
            }

            .barra-impressao,
            .aviso-configuracao {
              display: none !important;
            }

            .area-visualizacao {
              display: block !important;
              width: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background: #ffffff !important;
            }

            body[data-modo="a4"] .preview-a4 {
              display: block !important;
            }

            body[data-modo="a4"] .preview-termica {
              display: none !important;
            }

            body[data-modo="termica"] .preview-a4 {
              display: none !important;
            }

            body[data-modo="termica"] .preview-termica {
              display: block !important;
              width: 37mm !important;
              min-width: 37mm !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
            }

            .folha-a4 {
              width: 185mm !important;
              min-width: 185mm !important;
              height: 290mm !important;
              min-height: 290mm !important;
              margin: 0 !important;
              padding: 0 !important;
              display: grid !important;
              grid-template-columns: repeat(5, 37mm) !important;
              grid-template-rows: repeat(5, 58mm) !important;
              gap: 0 !important;
              box-shadow: none !important;
              break-after: page !important;
              page-break-after: always !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .folha-a4:last-child {
              break-after: auto !important;
              page-break-after: auto !important;
            }

            .pagina-termica {
              display: block !important;
              width: 37mm !important;
              height: 58mm !important;
              min-width: 37mm !important;
              max-width: 37mm !important;
              min-height: 58mm !important;
              max-height: 58mm !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              break-after: page !important;
              page-break-after: always !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .pagina-termica:last-child {
              break-after: auto !important;
              page-break-after: auto !important;
            }
          }
        </style>
      </head>

      <body data-modo="${normalizarModo(modoInicial)}">
        <header class="barra-impressao">
          <div class="barra-impressao-info">
            <strong>Etiquetas K.Chic</strong>
            <span>
              ${quantidadeEtiquetas}
              ${
                quantidadeEtiquetas === 1
                  ? " etiqueta preparada"
                  : " etiquetas preparadas"
              }
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
              class="botao-impressao botao-modo"
              data-selecionar-modo="a4"
            >
              A4 · 25 etiquetas
            </button>

            <button
              type="button"
              class="botao-impressao botao-modo"
              data-selecionar-modo="termica"
            >
              Térmica · individual
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

        <div class="aviso-configuracao" id="aviso-configuracao"></div>

        <div class="area-visualizacao">
          <main class="preview-a4">
            ${folhasA4Html}
          </main>

          <main class="preview-termica">
            ${termicaHtml}
          </main>
        </div>

        <script>
          (() => {
            const MODO_A4 = "a4";
            const MODO_TERMICA = "termica";

            const estiloPagina = document.getElementById(
              "configuracao-pagina-impressao"
            );

            const aviso = document.getElementById(
              "aviso-configuracao"
            );

            const botoesModo = Array.from(
              document.querySelectorAll("[data-selecionar-modo]")
            );

            const botaoImprimir = document.getElementById(
              "botao-imprimir"
            );

            const botaoVoltar = document.getElementById(
              "botao-voltar"
            );

            let modoAtual = ${JSON.stringify(
              normalizarModo(modoInicial)
            )};

            let imprimindo = false;

            function atualizarConfiguracaoPagina() {
              if (modoAtual === MODO_TERMICA) {
                estiloPagina.textContent =
                  "@page { size: 37mm 58mm; margin: 0; }";

                aviso.innerHTML =
                  "<strong>Térmica individual:</strong> cada peça será impressa em uma página física de 37 × 58 mm. Use escala 100% e sem margens adicionais no driver da impressora.";
              } else {
                estiloPagina.textContent =
                  "@page { size: A4 portrait; margin: 3.5mm 12.5mm; }";

                aviso.innerHTML =
                  "<strong>A4 · 25 etiquetas:</strong> a folha será montada automaticamente em uma grade de 5 × 5, mantendo cada etiqueta com 37 × 58 mm. Use papel A4, escala 100% e desative cabeçalhos e rodapés.";
              }
            }

            function atualizarBotoes() {
              botoesModo.forEach((botao) => {
                const ativo =
                  botao.dataset.selecionarModo === modoAtual;

                botao.classList.toggle("ativo", ativo);
              });
            }

            function selecionarModo(modo) {
              if (
                modo !== MODO_A4 &&
                modo !== MODO_TERMICA
              ) {
                return;
              }

              modoAtual = modo;
              document.body.dataset.modo = modoAtual;

              atualizarConfiguracaoPagina();
              atualizarBotoes();
            }

            function executarImpressao() {
              if (imprimindo) return;

              imprimindo = true;
              atualizarConfiguracaoPagina();

              window.focus();

              window.setTimeout(() => {
                window.print();

                window.setTimeout(() => {
                  imprimindo = false;
                }, 1000);
              }, 120);
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

                  window.location.href = ${JSON.stringify(
                    window.location.origin
                  )};
                }
              }, 150);
            }

            botoesModo.forEach((botao) => {
              botao.addEventListener("click", () => {
                selecionarModo(
                  botao.dataset.selecionarModo
                );
              });
            });

            botaoImprimir?.addEventListener(
              "click",
              executarImpressao
            );

            botaoVoltar?.addEventListener(
              "click",
              voltarAoSistema
            );

            window.addEventListener("afterprint", () => {
              imprimindo = false;
            });

            selecionarModo(modoAtual);
          })();
        </script>
      </body>
    </html>
  `;
}

async function abrirImpressao(modoInicial = MODO_A4) {
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

  const janelaImpressao = window.open("", "_blank");

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
    const etiquetasHtml = etiquetasOriginais.map(
      (elementoOriginal) =>
        prepararEtiquetaParaImpressao(
          elementoOriginal
        )
    );

    const html = criarHtmlImpressao({
      etiquetasHtml,
      quantidadeEtiquetas: etiquetasOriginais.length,
      modoInicial: normalizarModo(modoInicial),
    });

    janelaImpressao.document.open();
    janelaImpressao.document.write(html);
    janelaImpressao.document.close();

    await aguardarDocumento(janelaImpressao);
    await aguardarImagens(janelaImpressao);

    janelaImpressao.focus();

    return {
      ok: true,
      quantidade: etiquetasOriginais.length,
      modoInicial: normalizarModo(modoInicial),
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

/**
 * Mantém compatibilidade com o uso atual:
 * imprimirEtiquetas()
 *
 * A tela de impressão abre com A4 selecionado e permite
 * alternar entre A4 5 × 5 e térmica individual.
 */
export default async function imprimirEtiquetas(
  modoInicial = MODO_A4
) {
  return abrirImpressao(modoInicial);
}

/**
 * Atalhos opcionais para criar botões separados no ERP.
 */
export async function imprimirEtiquetasA4() {
  return abrirImpressao(MODO_A4);
}

export async function imprimirEtiquetasTermica() {
  return abrirImpressao(MODO_TERMICA);
}
