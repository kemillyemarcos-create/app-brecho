import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

const HCAPTCHA_SCRIPT_ID = "kchic-hcaptcha-script";
const HCAPTCHA_SCRIPT_URL =
  "https://js.hcaptcha.com/1/api.js?render=explicit";
import { valorEmReais } from "./preco";
import CheckoutLoja from "./CheckoutLoja";
import logoKchic from "../../assets/logo-kchic.png";

export default function LojaPublica({ empresaSlug }) {
  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("");
  const [marcaAtiva, setMarcaAtiva] = useState("");
  const [tamanhoAtivo, setTamanhoAtivo] = useState("");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [fotoSelecionada, setFotoSelecionada] = useState(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  const [sacola, setSacola] = useState({
    quantidadeItens: 0,
    itens: [],
  });
  const [carregandoSacola, setCarregandoSacola] = useState(false);
  const [erroSacola, setErroSacola] = useState("");
  const [adicionandoPublicacaoId, setAdicionandoPublicacaoId] =
    useState(null);
  const [ultimaAdicionadaId, setUltimaAdicionadaId] = useState(null);
  const [sacolaAberta, setSacolaAberta] = useState(false);
  const [temTokenCarrinho, setTemTokenCarrinho] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaPronto, setCaptchaPronto] = useState(false);

  const captchaContainerRef = useRef(null);
  const captchaWidgetIdRef = useRef(null);
  const captchaRenderizadoRef = useRef(false);

  const hcaptchaSiteKey =
    import.meta.env.VITE_HCAPTCHA_SITE_KEY;

  const chaveTokenCarrinho = `loja:carrinho:${empresaSlug}`;

  function obterTokenCarrinho() {
    if (!empresaSlug) return null;

    try {
      return window.localStorage.getItem(chaveTokenCarrinho);
    } catch (error) {
      console.error(
        "Não foi possível acessar o token da sacola:",
        error
      );
      return null;
    }
  }

  function salvarTokenCarrinho(token) {
    if (!empresaSlug || !token) return;

    try {
      window.localStorage.setItem(
        chaveTokenCarrinho,
        token
      );
      setTemTokenCarrinho(true);
    } catch (error) {
      console.error(
        "Não foi possível salvar o token da sacola:",
        error
      );
    }
  }

  useEffect(() => {
    setTemTokenCarrinho(
      Boolean(obterTokenCarrinho())
    );
  }, [empresaSlug]);

  useEffect(() => {
    if (
      !hcaptchaSiteKey ||
      temTokenCarrinho ||
      !produtoSelecionado
    ) {
      return undefined;
    }

    let ativo = true;

    function renderizarCaptcha() {
      if (
        !ativo ||
        captchaRenderizadoRef.current ||
        !captchaContainerRef.current ||
        !window.hcaptcha
      ) {
        return;
      }

      captchaWidgetIdRef.current =
        window.hcaptcha.render(
          captchaContainerRef.current,
          {
            sitekey: hcaptchaSiteKey,
            callback: (token) => {
              if (!ativo) return;
              setCaptchaToken(token || "");
              setErroSacola("");
            },
            "expired-callback": () => {
              if (!ativo) return;
              setCaptchaToken("");
            },
            "error-callback": () => {
              if (!ativo) return;
              setCaptchaToken("");
              setErroSacola(
                "Não foi possível validar a verificação de segurança."
              );
            },
          }
        );

      captchaRenderizadoRef.current = true;
      setCaptchaPronto(true);
    }

    if (window.hcaptcha) {
      renderizarCaptcha();
    }

    let script =
      document.getElementById(
        HCAPTCHA_SCRIPT_ID
      );

    if (!script) {
      script =
        document.createElement("script");
      script.id = HCAPTCHA_SCRIPT_ID;
      script.src = HCAPTCHA_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const aoCarregar =
      () => renderizarCaptcha();

    const aoFalhar = () => {
      if (!ativo) return;
      setErroSacola(
        "Não foi possível carregar a verificação de segurança."
      );
    };

    script.addEventListener(
      "load",
      aoCarregar
    );
    script.addEventListener(
      "error",
      aoFalhar
    );

    const intervalo =
      window.setInterval(() => {
        if (window.hcaptcha) {
          renderizarCaptcha();

          if (
            captchaRenderizadoRef.current
          ) {
            window.clearInterval(
              intervalo
            );
          }
        }
      }, 250);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);

      script?.removeEventListener(
        "load",
        aoCarregar
      );
      script?.removeEventListener(
        "error",
        aoFalhar
      );

      if (
        window.hcaptcha &&
        captchaWidgetIdRef.current !== null &&
        captchaWidgetIdRef.current !==
          undefined
      ) {
        try {
          window.hcaptcha.remove(
            captchaWidgetIdRef.current
          );
        } catch {
          // O widget pode já ter sido removido.
        }
      }

      captchaWidgetIdRef.current = null;
      captchaRenderizadoRef.current =
        false;
      setCaptchaPronto(false);
      setCaptchaToken("");
    };
  }, [
    hcaptchaSiteKey,
    temTokenCarrinho,
    produtoSelecionado,
  ]);

  function resetarCaptcha() {
    setCaptchaToken("");

    if (
      window.hcaptcha &&
      captchaWidgetIdRef.current !== null &&
      captchaWidgetIdRef.current !==
        undefined
    ) {
      try {
        window.hcaptcha.reset(
          captchaWidgetIdRef.current
        );
      } catch {
        // O widget pode já ter sido desmontado.
      }
    }
  }

  async function chamarSacola(body) {
    const { data, error } =
      await supabase.functions.invoke(
        "loja-carrinho",
        {
          body: {
            empresaSlug,
            ...body,
          },
        }
      );

    if (error) {
      let mensagem =
        error.message ||
        "Não foi possível comunicar com a sacola.";

      try {
        if (error.context instanceof Response) {
          const respostaErro =
            await error.context.clone().json();

          if (respostaErro?.erro) {
            mensagem = respostaErro.erro;
          }
        }
      } catch {
        // Mantém a mensagem original caso a resposta não seja JSON.
      }

      throw new Error(mensagem);
    }

    if (data?.erro) {
      throw new Error(data.erro);
    }

    return data;
  }

  useEffect(() => {
    let ativo = true;

    async function carregarSacola() {
      const token = obterTokenCarrinho();

      if (!token) {
        if (ativo) {
          setSacola({
            quantidadeItens: 0,
            itens: [],
          });
        }
        return;
      }

      try {
        const data = await chamarSacola({
          operacao: "consultar",
          token,
        });

        if (!ativo) return;

        setSacola({
          quantidadeItens:
            Number(data?.quantidadeItens) || 0,
          itens: Array.isArray(data?.itens)
            ? data.itens
            : [],
        });

        setErroSacola("");
      } catch (error) {
        if (!ativo) return;

        console.error(
          "Erro ao consultar sacola:",
          error
        );

        if (
          error instanceof Error &&
          (
            error.message ===
              "Carrinho não encontrado ou finalizado." ||
            error.message ===
              "Carrinho inválido."
          )
        ) {
          try {
            window.localStorage.removeItem(
              chaveTokenCarrinho
            );
            setTemTokenCarrinho(false);
          } catch (storageError) {
            console.error(
              "Não foi possível remover o token antigo da sacola:",
              storageError
            );
          }
        }

        setSacola({
          quantidadeItens: 0,
          itens: [],
        });

        setErroSacola(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a sacola."
        );
      }
    }

    if (empresaSlug) {
      carregarSacola();
    }

    return () => {
      ativo = false;
    };
  }, [empresaSlug]);

  function formatarPrecoSacola(valor) {
    return valorEmReais(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  const obterValorNumericoSacola = valorEmReais;

  function formatarTempoSacola(segundos) {
    const total = Math.max(
      0,
      Number(segundos) || 0
    );

    const minutos = Math.floor(total / 60);
    const segundosRestantes = total % 60;

    return `${minutos}:${String(
      segundosRestantes
    ).padStart(2, "0")}`;
  }

  async function removerDaSacola(publicacaoId) {
    if (!publicacaoId || carregandoSacola) {
      return;
    }

    const token = obterTokenCarrinho();

    if (!token) {
      return;
    }

    setCarregandoSacola(true);
    setErroSacola("");

    try {
      const data = await chamarSacola({
        operacao: "remover",
        publicacaoId,
        token,
      });

      setSacola((atual) => ({
        quantidadeItens:
          Number(data?.quantidadeItens) || 0,

        itens: atual.itens.filter(
          (item) =>
            item.publicacaoId !== publicacaoId
        ),
      }));

      if (
        Number(data?.quantidadeItens) === 0
      ) {
        setUltimaAdicionadaId(null);
      }
    } catch (error) {
      console.error(
        "Erro ao remover peça da sacola:",
        error
      );

      setErroSacola(
        error instanceof Error
          ? error.message
          : "Não foi possível remover a peça da sacola."
      );
    } finally {
      setCarregandoSacola(false);
    }
  }

  async function adicionarNaSacola(produto) {
    if (!produto?.publicacao_id) return;
    if (adicionandoPublicacaoId) return;

    setAdicionandoPublicacaoId(
      produto.publicacao_id
    );
    setCarregandoSacola(true);
    setErroSacola("");

    try {
      const token = obterTokenCarrinho();

      const data = await chamarSacola({
        operacao: "adicionar",
        publicacaoId: produto.publicacao_id,
        token,
        captchaToken:
          token
            ? null
            : captchaToken,
      });

      if (data?.token) {
        salvarTokenCarrinho(data.token);
        resetarCaptcha();
      }

      const itemNovo = {
        carrinhoId: data?.carrinhoId,
        publicacaoId:
          produto.publicacao_id,
        slug: produto.slug,
        nome: produto.nome,
        preco: produto.preco,
        marca: produto.marca,
        categoria: produto.categoria,
        tamanho: produto.tamanho,
        condicao: produto.condicao,
        descricao: produto.descricao,
        fotoPrincipal:
          produto.foto_principal,
        adicionadoEm:
          data?.adicionadoEm,
        expiraEm:
          data?.expiraEm,
        segundosRestantes:
          Math.max(
            0,
            Math.floor(
              (
                new Date(
                  data?.expiraEm
                ).getTime() -
                Date.now()
              ) / 1000
            )
          ),
      };

      setSacola((atual) => ({
        quantidadeItens:
          Number(data?.quantidadeItens) ||
          atual.quantidadeItens,

        itens: atual.itens.some(
          (item) =>
            item.publicacaoId ===
            produto.publicacao_id
        )
          ? atual.itens
          : [
              ...atual.itens,
              itemNovo,
            ],
      }));

      setUltimaAdicionadaId(produto.publicacao_id);
      setErroSacola("");
    } catch (error) {
      console.error(
        "Erro ao adicionar peça à sacola:",
        error
      );

      if (
        error instanceof Error &&
        (
          error.message ===
            "Carrinho não encontrado ou finalizado." ||
          error.message ===
            "Carrinho inválido."
        )
      ) {
        try {
          window.localStorage.removeItem(
            chaveTokenCarrinho
          );
          setTemTokenCarrinho(false);
        } catch (storageError) {
          console.error(
            "Não foi possível remover o token antigo da sacola:",
            storageError
          );
        }
      }

      setErroSacola(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar a peça à sacola."
      );
    } finally {
      setCarregandoSacola(false);
      setAdicionandoPublicacaoId(null);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function carregarCatalogo() {
      setCarregando(true);
      setErro("");

      const { data, error } = await supabase.rpc(
        "loja_catalogo_publico_por_slug",
        {
          p_empresa_slug: empresaSlug,
          p_slug: null,
          p_categoria: null,
          p_marca: null,
          p_tamanho: null,
          p_limite: 24,
          p_offset: 0,
        }
      );

      if (!ativo) return;

      if (error) {
        console.error("Erro ao carregar catálogo público:", error);
        setProdutos([]);
        setErro("Não foi possível carregar a loja neste momento.");
        setCarregando(false);
        return;
      }

      setProdutos(Array.isArray(data) ? data : []);
      setCarregando(false);
    }

    if (empresaSlug) {
      carregarCatalogo();
    } else {
      setProdutos([]);
      setErro("Loja não identificada.");
      setCarregando(false);
    }

    return () => {
      ativo = false;
    };
  }, [empresaSlug]);

  function obterUrlFoto(storagePath) {
    if (!storagePath) return "";

    const { data } = supabase.storage
      .from("loja-produtos")
      .getPublicUrl(storagePath);

    return data?.publicUrl || "";
  }

  const categorias = [
    ...new Set(
      produtos
        .map((produto) => produto.categoria)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const marcas = [
    ...new Set(
      produtos
        .map((produto) => produto.marca)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const tamanhos = [
    ...new Set(
      produtos
        .map((produto) => produto.tamanho)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const produtosFiltrados = produtos.filter((produto) => {
    const termo = busca.trim().toLowerCase();

    if (
      categoriaAtiva &&
      produto.categoria !== categoriaAtiva
    ) {
      return false;
    }

    if (
      marcaAtiva &&
      produto.marca !== marcaAtiva
    ) {
      return false;
    }

    if (
      tamanhoAtivo &&
      produto.tamanho !== tamanhoAtivo
    ) {
      return false;
    }

    if (!termo) {
      return true;
    }

    const textoBusca = [
      produto.nome,
      produto.marca,
      produto.categoria,
      produto.tamanho,
      produto.condicao,
      produto.descricao,
      produto.obs,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return textoBusca.includes(termo);
  });

  function limparFiltros() {
    setBusca("");
    setCategoriaAtiva("");
    setMarcaAtiva("");
    setTamanhoAtivo("");
    setOrdenacao("recentes");
  }

  const filtrosAtivos =
    Boolean(busca.trim()) ||
    Boolean(categoriaAtiva) ||
    Boolean(marcaAtiva) ||
    Boolean(tamanhoAtivo);

  const produtosOrdenados = [...produtosFiltrados].sort((a, b) => {
    if (ordenacao === "menor-preco") {
      return (
        valorEmReais(a.preco) -
        valorEmReais(b.preco)
      );
    }

    if (ordenacao === "maior-preco") {
      return (
        valorEmReais(b.preco) -
        valorEmReais(a.preco)
      );
    }

    if (ordenacao === "nome") {
      return String(a.nome || "").localeCompare(
        String(b.nome || ""),
        "pt-BR"
      );
    }

    return new Date(b.publicada_em) - new Date(a.publicada_em);
  });

  const totalSacola =
    sacola.itens.reduce(
      (total, item) =>
        total +
        obterValorNumericoSacola(
          item.preco
        ),
      0
    );

  const sacolaModal = sacolaAberta ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sua sacola"
      onClick={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          setSacolaAberta(false);
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background:
          "rgba(47, 37, 41, 0.38)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        style={{
          width:
            "min(430px, 100%)",
          height: "100%",
          background: "#ffffff",
          boxShadow:
            "-8px 0 30px rgba(47, 37, 41, 0.12)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            padding: "18px 20px",
            borderBottom:
              "1px solid #eadfe3",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                color: "#2f2529",
              }}
            >
              Sua sacola
            </h2>

            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "#9a8a90",
              }}
            >
              {sacola.quantidadeItens}{" "}
              {sacola.quantidadeItens === 1
                ? "item"
                : "itens"}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setSacolaAberta(false)
            }
            aria-label="Fechar sacola"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border:
                "1px solid #dfcfd5",
              background: "#ffffff",
              color: "#7a2f46",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </header>

        <button type="button" onClick={() => setCheckoutAberto(true)}>Acompanhar meu pedido</button>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
          }}
        >
          {sacola.itens.length === 0 ? (
            <div
              style={{
                minHeight: 260,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent:
                  "center",
                textAlign: "center",
                color: "#76666d",
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  marginBottom: 12,
                }}
              >
                🛍
              </div>

              <strong
                style={{
                  color: "#2f2529",
                  fontSize: 16,
                }}
              >
                Sua sacola está vazia
              </strong>

              <p
                style={{
                  margin: "7px 0 0",
                  fontSize: 13,
                }}
              >
                Escolha uma peça para
                reservar por alguns
                minutos.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {sacola.itens.map(
                (item) => {
                  const fotoUrl =
                    obterUrlFoto(
                      item.fotoPrincipal
                    );

                  return (
                    <article
                      key={
                        item.publicacaoId
                      }
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "78px minmax(0, 1fr)",
                        gap: 12,
                        paddingBottom: 14,
                        borderBottom:
                          "1px solid #eadfe3",
                      }}
                    >
                      <div
                        style={{
                          width: 78,
                          height: 96,
                          borderRadius: 8,
                          overflow:
                            "hidden",
                          background:
                            "#f4edef",
                          border:
                            "1px solid #eadfe3",
                        }}
                      >
                        {fotoUrl ? (
                          <img
                            src={fotoUrl}
                            alt={item.nome}
                            style={{
                              width:
                                "100%",
                              height:
                                "100%",
                              objectFit:
                                "cover",
                              display:
                                "block",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width:
                                "100%",
                              height:
                                "100%",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              fontSize: 22,
                            }}
                          >
                            🛍
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 10,
                            textTransform:
                              "uppercase",
                            letterSpacing:
                              "0.08em",
                            color:
                              "#9b7a84",
                            fontWeight:
                              700,
                          }}
                        >
                          {item.marca ||
                            "K.Chic"}
                        </p>

                        <h3
                          style={{
                            margin:
                              "4px 0 0",
                            fontSize: 14,
                            lineHeight:
                              1.3,
                            color:
                              "#2f2529",
                          }}
                        >
                          {item.nome}
                        </h3>

                        <p
                          style={{
                            margin:
                              "5px 0 0",
                            fontSize: 12,
                            color:
                              "#76666d",
                          }}
                        >
                          {item.tamanho
                            ? `Tam. ${item.tamanho}`
                            : ""}
                        </p>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop: 6,
                            fontSize: 15,
                            color:
                              "#7a2f46",
                          }}
                        >
                          {formatarPrecoSacola(
                            item.preco
                          )}
                        </strong>

                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color:
                                "#7a2f46",
                              background:
                                "#f3e6ea",
                              borderRadius:
                                999,
                              padding:
                                "5px 8px",
                              fontWeight:
                                700,
                            }}
                          >
                            Reserva ·{" "}
                            {formatarTempoSacola(
                              item.segundosRestantes
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removerDaSacola(
                                item.publicacaoId
                              )
                            }
                            disabled={
                              carregandoSacola
                            }
                            style={{
                              border: "none",
                              background:
                                "transparent",
                              color:
                                "#9a3f52",
                              fontSize: 11,
                              fontWeight:
                                600,
                              cursor:
                                carregandoSacola
                                  ? "wait"
                                  : "pointer",
                              padding: 4,
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}

              {erroSacola && (
                <p
                  style={{
                    margin: 0,
                    color: "#9a3f52",
                    fontSize: 12,
                  }}
                >
                  {erroSacola}
                </p>
              )}
            </div>
          )}
        </div>

        {sacola.itens.length > 0 && (
          <footer
            style={{
              borderTop:
                "1px solid #eadfe3",
              padding: 20,
              background:
                "#fffafb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "#76666d",
                }}
              >
                Total
              </span>

              <strong
                style={{
                  fontSize: 20,
                  color: "#7a2f46",
                }}
              >
                {formatarPrecoSacola(
                  totalSacola
                )}
              </strong>
            </div>

            <button
              type="button"
              disabled={carregandoSacola || sacola.itens.length === 0}
              onClick={() => setCheckoutAberto(true)}
              style={{
                width: "100%",
                height: 46,
                marginTop: 12,
                border: "none",
                borderRadius: 9,
                background:
                  "#7a2f46",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 700,
                opacity: carregandoSacola ? 0.55 : 1,
                cursor:
                  "pointer",
              }}
            >
              Continuar para pagamento
            </button>

            <p
              style={{
                margin:
                  "8px 0 0",
                textAlign:
                  "center",
                color: "#9a8a90",
                fontSize: 11,
              }}
            >
              Pagamento seguro pelo Mercado Pago. Retirada combinada com a loja.
            </p>
          </footer>
        )}
      </aside>
    </div>
  ) : null;

  if (checkoutAberto) {
    return <CheckoutLoja empresaSlug={empresaSlug} tokenCarrinho={obterTokenCarrinho()} onFechar={() => setCheckoutAberto(false)} />;
  }

  if (produtoSelecionado) {
    const fotoDetalhe = obterUrlFoto(
      fotoSelecionada || produtoSelecionado.foto_principal
    );

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#fbf7f8",
          color: "#2f2529",
          fontFamily:
            "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {sacolaModal}

        <style>{`
          @media (max-width: 760px) {
            .loja-produto-detalhe-grid {
              grid-template-columns: 1fr !important;
              gap: 18px !important;
            }

            .loja-produto-info {
              padding-top: 0 !important;
            }
          }
        `}</style>
        <header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #eadfe3",
          }}
        >
          <div
            style={{
              width: "min(1180px, calc(100% - 32px))",
              margin: "0 auto",
              minHeight: 58,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setProdutoSelecionado(null);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#7a2f46",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              ← Voltar
            </button>

            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#7a2f46",
              }}
            >
              K.Chic
            </span>
          </div>
        </header>

        <main
          style={{
            width: "min(1060px, calc(100% - 32px))",
            margin: "0 auto",
            padding: "18px 0 36px",
          }}
        >
          <div
            style={{
              marginBottom: 14,
              color: "#9a8a90",
              fontSize: 12,
            }}
          >
            Loja / {produtoSelecionado.categoria || "Peças"} /{" "}
            <span style={{ color: "#6f6066" }}>
              {produtoSelecionado.nome}
            </span>
          </div>

          <div
            className="loja-produto-detalhe-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(280px, 520px) minmax(260px, 1fr)",
              gap: 28,
              alignItems: "start",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #eadfe3",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(produtoSelecionado.fotos || []).map(foto => <button key={foto.storage_path} type="button" onClick={() => setFotoSelecionada(foto.storage_path)} aria-label="Ver foto da peça">
                  <img src={obterUrlFoto(foto.storage_path)} alt="Miniatura da peça" width="56" height="70" style={{ objectFit: 'cover' }} />
                </button>)}
              </div>
              {fotoDetalhe && (
                <img
                  src={fotoDetalhe}
                  alt={produtoSelecionado.nome}
                  style={{
                    width: "100%",
                    display: "block",
                    aspectRatio: "4 / 5",
                    objectFit: "cover",
                  }}
                />
              )}
            </div>

            <section
              className="loja-produto-info"
              style={{
                paddingTop: 4,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#9b7a84",
                  fontWeight: 700,
                }}
              >
                {produtoSelecionado.marca}
              </p>

              <h1
                style={{
                  margin: "6px 0 0",
                  fontSize: 26,
                  lineHeight: 1.2,
                }}
              >
                {produtoSelecionado.nome}
              </h1>

              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 23,
                  fontWeight: 700,
                  color: "#7a2f46",
                }}
              >
                {formatarPrecoSacola(produtoSelecionado.preco)}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 18,
                }}
              >
                {produtoSelecionado.tamanho && (
                  <span
                    style={{
                      background: "#ffffff",
                      border: "1px solid #dfcfd5",
                      borderRadius: 999,
                      padding: "7px 11px",
                      fontSize: 13,
                    }}
                  >
                    Tam. {produtoSelecionado.tamanho}
                  </span>
                )}

                {produtoSelecionado.condicao && (
                  <span
                    style={{
                      background: "#f3e6ea",
                      borderRadius: 999,
                      padding: "7px 11px",
                      fontSize: 13,
                      color: "#7a2f46",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {produtoSelecionado.condicao}
                  </span>
                )}
              </div>

              {produtoSelecionado.descricao && (
                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 18,
                    borderTop: "1px solid #eadfe3",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 15,
                    }}
                  >
                    Descrição
                  </h2>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#6f6066",
                      lineHeight: 1.6,
                      fontSize: 14,
                    }}
                  >
                    {produtoSelecionado.descricao}
                  </p>
                </div>
              )}

              {produtoSelecionado.obs && (
                <div style={{ marginTop: 20 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 15,
                    }}
                  >
                    Detalhes da peça
                  </h2>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#6f6066",
                      lineHeight: 1.6,
                      fontSize: 14,
                    }}
                  >
                    {produtoSelecionado.obs}
                  </p>
                </div>
              )}

              <div
                style={{
                  marginTop: 24,
                  paddingTop: 18,
                  borderTop: "1px solid #eadfe3",
                }}
              >
                {!temTokenCarrinho && (
                  <div
                    style={{
                      marginBottom: 14,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6f6066",
                        textAlign: "center",
                      }}
                    >
                      Verificação de segurança
                    </div>

                    {hcaptchaSiteKey ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "center",
                          minHeight: 78,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          ref={
                            captchaContainerRef
                          }
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#9a3f52",
                          textAlign: "center",
                        }}
                      >
                        Verificação de segurança indisponível.
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    adicionarNaSacola(produtoSelecionado)
                  }
                  disabled={
                    adicionandoPublicacaoId ===
                      produtoSelecionado.publicacao_id ||
                    (
                      !temTokenCarrinho &&
                      (
                        !captchaPronto ||
                        !captchaToken
                      )
                    )
                  }
                  style={{
                    width: "100%",
                    height: 46,
                    border: "none",
                    borderRadius: 9,
                    background:
                      ultimaAdicionadaId ===
                      produtoSelecionado.publicacao_id
                        ? "#9a6a79"
                        : "#7a2f46",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor:
                      adicionandoPublicacaoId ===
                      produtoSelecionado.publicacao_id
                        ? "wait"
                        : "pointer",
                    opacity:
                      adicionandoPublicacaoId ===
                      produtoSelecionado.publicacao_id
                        ? 0.72
                        : 1,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  {adicionandoPublicacaoId ===
                  produtoSelecionado.publicacao_id
                    ? "Adicionando..."
                    : ultimaAdicionadaId ===
                      produtoSelecionado.publicacao_id
                    ? "✓ Peça adicionada à sacola"
                    : "Adicionar à sacola"}
                </button>
              </div>

              {erroSacola && (
                <p
                  style={{
                    margin: "9px 0 0",
                    color: "#9a3f52",
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  {erroSacola}
                </p>
              )}

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#9a8a90",
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                A peça fica reservada na sacola por tempo limitado.
              </p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fbf7f8",
        color: "#2f2529",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {sacolaModal}

      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #eadfe3",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: "min(1180px, calc(100% - 32px))",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "10px 0",
          }}
        >
          <div
            style={{
              width: 96,
              height: 46,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img
              src={logoKchic}
              alt="K.Chic"
              style={{
                width: 108,
                height: "auto",
                display: "block",
                transform: "scale(2.05)",
              }}
            />
          </div>

          <div
            style={{
              flex: 1,
              maxWidth: 520,
              position: "relative",
            }}
          >
            <input
              type="search"
              placeholder="Buscar peças, marcas e categorias"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 999,
                border: "1px solid #dfcfd5",
                background: "#fbf7f8",
                padding: "0 18px",
                fontSize: 14,
                outline: "none",
                color: "#2f2529",
              }}
            />
          </div>

          <button
            type="button"
            aria-label={`Sacola com ${sacola.quantidadeItens} ${
              sacola.quantidadeItens === 1 ? "item" : "itens"
            }`}
            onClick={() => {
              setSacolaAberta(true);
            }}
            style={{
              position: "relative",
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid #dfcfd5",
              background: "#ffffff",
              color: "#7a2f46",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            🛍

            {sacola.quantidadeItens > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 999,
                  background: "#7a2f46",
                  color: "#ffffff",
                  fontSize: 10,
                  lineHeight: "18px",
                  fontWeight: 700,
                  textAlign: "center",
                  boxSizing: "border-box",
                  border: "2px solid #ffffff",
                }}
              >
                {sacola.quantidadeItens > 99
                  ? "99+"
                  : sacola.quantidadeItens}
              </span>
            )}
          </button>
        </div>

        <nav
          style={{
            borderTop: "1px solid #f0e7ea",
            background: "#fffafb",
          }}
        >
          <div
            style={{
              width: "min(1180px, calc(100% - 32px))",
              margin: "0 auto",
              display: "flex",
              gap: 8,
              overflowX: "auto",
              padding: "6px 0",
              whiteSpace: "nowrap",
            }}
          >
            <button
              type="button"
              onClick={() => setCategoriaAtiva("")}
              style={{
                border: "none",
                borderRadius: 999,
                background:
                  categoriaAtiva === ""
                    ? "#f3e6ea"
                    : "transparent",
                padding: "7px 13px",
                fontSize: 14,
                fontWeight: categoriaAtiva === "" ? 700 : 500,
                color:
                  categoriaAtiva === ""
                    ? "#7a2f46"
                    : "#3f3539",
                cursor: "pointer",
              }}
            >
              Todos
            </button>

            {categorias.map((categoria) => (
              <button
                key={categoria}
                type="button"
                onClick={() => setCategoriaAtiva(categoria)}
                style={{
                  border: "none",
                  borderRadius: 999,
                  background:
                    categoriaAtiva === categoria
                      ? "#f3e6ea"
                      : "transparent",
                  padding: "7px 13px",
                  fontSize: 14,
                  fontWeight:
                    categoriaAtiva === categoria ? 700 : 500,
                  color:
                    categoriaAtiva === categoria
                      ? "#7a2f46"
                      : "#3f3539",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {categoria}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main
        style={{
          width: "min(1180px, calc(100% - 32px))",
          margin: "0 auto",
          padding: "18px 0 36px",
        }}
      >
        <section
          style={{
            marginBottom: 16,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#9c6a79",
              fontWeight: 600,
            }}
          >
            Curadoria K.Chic
          </p>

          <h1
            style={{
              margin: "6px 0 0",
              fontSize: 26,
              lineHeight: 1.15,
              fontWeight: 700,
            }}
          >
            Peças únicas para você garimpar
          </h1>

          <p
            style={{
              margin: "5px 0 0",
              color: "#7d6a70",
              fontSize: 15,
            }}
          >
            Seleção de peças escolhidas uma a uma pela K.Chic.
          </p>
        </section>

        {!carregando && !erro && produtos.length > 0 && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  Nosso garimpo
                </h2>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#85747a",
                    fontSize: 13,
                  }}
                >
                  {produtosOrdenados.length}{" "}
                  {produtosOrdenados.length === 1
                    ? "peça encontrada"
                    : "peças encontradas"}
                </p>
              </div>

              {filtrosAtivos && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#7a2f46",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "8px 0",
                  }}
                >
                  Limpar filtros
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
            <select
              value={marcaAtiva}
              onChange={(event) => setMarcaAtiva(event.target.value)}
              aria-label="Filtrar por marca"
              style={{
                minWidth: 160,
                height: 38,
                borderRadius: 10,
                border: "1px solid #dfcfd5",
                background: "#ffffff",
                padding: "0 12px",
                color: "#3f3539",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Todas as marcas</option>

              {marcas.map((marca) => (
                <option key={marca} value={marca}>
                  {marca}
                </option>
              ))}
            </select>

            <select
              value={tamanhoAtivo}
              onChange={(event) => setTamanhoAtivo(event.target.value)}
              aria-label="Filtrar por tamanho"
              style={{
                minWidth: 140,
                height: 38,
                borderRadius: 10,
                border: "1px solid #dfcfd5",
                background: "#ffffff",
                padding: "0 12px",
                color: "#3f3539",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Todos os tamanhos</option>

              {tamanhos.map((tamanho) => (
                <option key={tamanho} value={tamanho}>
                  {tamanho}
                </option>
              ))}
            </select>

            <select
              value={ordenacao}
              onChange={(event) => setOrdenacao(event.target.value)}
              aria-label="Ordenar produtos"
              style={{
                minWidth: 160,
                height: 38,
                borderRadius: 10,
                border: "1px solid #dfcfd5",
                background: "#ffffff",
                padding: "0 12px",
                color: "#3f3539",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="recentes">Mais recentes</option>
              <option value="menor-preco">Menor preço</option>
              <option value="maior-preco">Maior preço</option>
              <option value="nome">Nome A-Z</option>
            </select>
            </div>
          </>
        )}

        {carregando && (
          <p style={{ color: "#76666d" }}>Carregando produtos...</p>
        )}

        {!carregando && erro && (
          <p style={{ color: "#9a3f52" }}>{erro}</p>
        )}

        {!carregando && !erro && produtos.length === 0 && (
          <p style={{ color: "#76666d" }}>
            Nenhuma peça disponível no momento.
          </p>
        )}

        {!carregando &&
          !erro &&
          produtos.length > 0 &&
          produtosOrdenados.length === 0 && (
            <div
              style={{
                padding: "40px 0",
                color: "#76666d",
              }}
            >
              Nenhuma peça encontrada para “{busca}”.
            </div>
          )}

        {!carregando && !erro && produtosOrdenados.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(210px, 245px))",
              gap: 16,
              justifyContent: "start",
            }}
          >
            {produtosOrdenados.map((produto) => {
              const fotoUrl = obterUrlFoto(produto.foto_principal);

              const estaNaSacola = sacola.itens.some(
                (item) =>
                  item.publicacaoId === produto.publicacao_id
              );

              return (
                <article
                  key={produto.publicacao_id}
                  onClick={() => {
                    setFotoSelecionada(null);
                    setProdutoSelecionado(produto);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                  style={{
                    background: "#ffffff",
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid #eadfe3",
                    boxShadow: "0 3px 12px rgba(75, 45, 55, 0.045)",
                    cursor: "pointer",
                  }}
                >
                  {fotoUrl && (
                    <div
                      style={{
                        background: "#f4edef",
                        aspectRatio: "4 / 5",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {produto.condicao && (
                        <span
                          style={{
                            position: "absolute",
                            top: 12,
                            left: 12,
                            zIndex: 2,
                            background: "rgba(255, 255, 255, 0.94)",
                            borderRadius: 999,
                            padding: "5px 9px",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#7a2f46",
                            textTransform: "capitalize",
                            boxShadow:
                              "0 2px 10px rgba(47, 37, 41, 0.08)",
                          }}
                        >
                          {produto.condicao}
                        </span>
                      )}
                      <img
                        src={fotoUrl}
                        alt={produto.nome}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                  )}

                  <div style={{ padding: 11 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "#9b7a84",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontWeight: 600,
                      }}
                    >
                      {produto.marca}
                    </p>

                    <h2
                      style={{
                        margin: "5px 0 0",
                        fontSize: 16,
                        fontWeight: 600,
                        lineHeight: 1.35,
                      }}
                    >
                      {produto.nome}
                    </h2>

                    <p
                      style={{
                        margin: "5px 0 0",
                        color: "#76666d",
                        fontSize: 13,
                      }}
                    >
                      {produto.tamanho
                        ? `Tam. ${produto.tamanho}`
                        : ""}

                      {produto.categoria
                        ? ` · ${produto.categoria}`
                        : ""}
                    </p>

                    <p
                      style={{
                        margin: "9px 0 0",
                        fontSize: 19,
                        fontWeight: 700,
                        color: "#7a2f46",
                      }}
                    >
                      {formatarPrecoSacola(produto.preco)}
                    </p>

                    {estaNaSacola && (
                      <div
                        style={{
                          marginTop: 9,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          borderRadius: 999,
                          padding: "5px 9px",
                          background: "#f3e6ea",
                          color: "#7a2f46",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        ✓ Na sacola
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
