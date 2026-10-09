import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

const HCAPTCHA_SCRIPT_ID = "kchic-hcaptcha-script";
const HCAPTCHA_SCRIPT_URL =
  "https://js.hcaptcha.com/1/api.js?render=explicit";
import { valorEmReais } from "./preco";
import {
  catalogoTemMais,
  mesclarProdutosCatalogo,
  TAMANHO_PAGINA_CATALOGO,
} from "./catalogo";
import CheckoutLoja from "./CheckoutLoja";
import { restaurarPedido } from "./checkoutPedido";
import StoreHeader from "./components/StoreHeader";
import StoreHero from "./components/StoreHero";
import StoreBenefits from "./components/StoreBenefits";
import ProductGrid from "./components/ProductGrid";
import ProductDetail from "./components/ProductDetail";
import CartDrawer from "./components/CartDrawer";
import StoreFooter from "./components/StoreFooter";
import "./styles/loja-publica.css";

export default function LojaPublica({ empresaSlug }) {
  const [checkoutAberto, setCheckoutAberto] = useState(() => {
    try {
      return Boolean(restaurarPedido(sessionStorage, empresaSlug,
        localStorage.getItem(`loja:carrinho:${empresaSlug}`))?.pagamentoAberto);
    } catch { return false; }
  });
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMaisProdutos, setTemMaisProdutos] = useState(false);
  const [offsetCatalogo, setOffsetCatalogo] = useState(0);
  const [erro, setErro] = useState("");
  const [erroCarregarMais, setErroCarregarMais] = useState("");
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
  const [validandoCaptchaPublicacaoId, setValidandoCaptchaPublicacaoId] =
    useState(null);
  const [ultimaAdicionadaId, setUltimaAdicionadaId] = useState(null);
  const [sacolaAberta, setSacolaAberta] = useState(false);
  const [temTokenCarrinho, setTemTokenCarrinho] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaPronto, setCaptchaPronto] = useState(false);

  const captchaContainerRef = useRef(null);
  const captchaWidgetIdRef = useRef(null);
  const captchaRenderizadoRef = useRef(false);
  const captchaProdutoPendenteRef = useRef(null);
  const empresaSlugAtualRef = useRef(empresaSlug);

  empresaSlugAtualRef.current = empresaSlug;

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
            size: "invisible",
            hl: "pt-BR",
            callback: (token) => {
              if (!ativo) return;

              setCaptchaToken(token || "");
              setErroSacola("");

              const produtoPendente =
                captchaProdutoPendenteRef.current;

              captchaProdutoPendenteRef.current =
                null;
              setValidandoCaptchaPublicacaoId(null);

              if (
                produtoPendente &&
                token
              ) {
                adicionarNaSacola(
                  produtoPendente,
                  token
                );
              }
            },
            "expired-callback": () => {
              if (!ativo) return;
              setCaptchaToken("");
              setValidandoCaptchaPublicacaoId(null);
              captchaProdutoPendenteRef.current = null;
            },
            "error-callback": () => {
              if (!ativo) return;
              setCaptchaToken("");
              setValidandoCaptchaPublicacaoId(null);
              captchaProdutoPendenteRef.current = null;
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

  async function adicionarNaSacola(
    produto,
    captchaTokenExecutado = null
  ) {
    if (!produto?.publicacao_id) return;
    if (adicionandoPublicacaoId) return;

    const token = obterTokenCarrinho();

    if (
      !token &&
      !captchaTokenExecutado
    ) {
      if (
        !captchaPronto ||
        !window.hcaptcha ||
        captchaWidgetIdRef.current === null ||
        captchaWidgetIdRef.current === undefined
      ) {
        setErroSacola(
          "A verificação de segurança ainda está carregando. Tente novamente."
        );
        return;
      }

      captchaProdutoPendenteRef.current =
        produto;

      setValidandoCaptchaPublicacaoId(
        produto.publicacao_id
      );
      setErroSacola("");

      try {
        window.hcaptcha.execute(
          captchaWidgetIdRef.current
        );
      } catch {
        captchaProdutoPendenteRef.current =
          null;
        setValidandoCaptchaPublicacaoId(null);

        setErroSacola(
          "Não foi possível iniciar a verificação de segurança."
        );
      }

      return;
    }

    setAdicionandoPublicacaoId(
      produto.publicacao_id
    );
    setCarregandoSacola(true);
    setErroSacola("");

    try {
      const data = await chamarSacola({
        operacao: "adicionar",
        publicacaoId: produto.publicacao_id,
        token,
        captchaToken:
          token
            ? null
            : captchaTokenExecutado,
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
      setCarregandoMais(false);
      setTemMaisProdutos(false);
      setOffsetCatalogo(0);
      setProdutos([]);
      setErro("");
      setErroCarregarMais("");

      const { data, error } = await supabase.rpc(
        "loja_catalogo_publico_por_slug",
        {
          p_empresa_slug: empresaSlug,
          p_slug: null,
          p_categoria: null,
          p_marca: null,
          p_tamanho: null,
          p_limite: TAMANHO_PAGINA_CATALOGO,
          p_offset: 0,
        }
      );

      if (!ativo) return;

      if (error) {
        console.error("Erro ao carregar catálogo público:", error);
        setProdutos([]);
        setTemMaisProdutos(false);
        setErro("Não foi possível carregar a loja neste momento.");
        setCarregando(false);
        return;
      }

      const pagina = Array.isArray(data) ? data : [];

      setProdutos(pagina);
      setOffsetCatalogo(pagina.length);
      setTemMaisProdutos(catalogoTemMais(pagina.length));
      setCarregando(false);
    }

    if (empresaSlug) {
      carregarCatalogo();
    } else {
      setProdutos([]);
      setTemMaisProdutos(false);
      setErro("Loja não identificada.");
      setCarregando(false);
    }

    return () => {
      ativo = false;
    };
  }, [empresaSlug]);

  async function carregarMaisCatalogo() {
    if (
      !empresaSlug ||
      carregando ||
      carregandoMais ||
      !temMaisProdutos
    ) {
      return;
    }

    setCarregandoMais(true);
    setErroCarregarMais("");

    const slugRequisitado = empresaSlug;
    const offset = offsetCatalogo;

    const { data, error } = await supabase.rpc(
      "loja_catalogo_publico_por_slug",
      {
        p_empresa_slug: empresaSlug,
        p_slug: null,
        p_categoria: null,
        p_marca: null,
        p_tamanho: null,
        p_limite: TAMANHO_PAGINA_CATALOGO,
        p_offset: offset,
      }
    );

    if (
      empresaSlugAtualRef.current !== slugRequisitado
    ) {
      return;
    }

    if (error) {
      console.error(
        "Erro ao carregar mais produtos do catálogo:",
        error
      );
      setErroCarregarMais(
        "Não foi possível carregar mais peças neste momento."
      );
      setCarregandoMais(false);
      return;
    }

    const pagina = Array.isArray(data) ? data : [];

    setProdutos((atuais) =>
      mesclarProdutosCatalogo(atuais, pagina)
    );
    setOffsetCatalogo(
      (atual) => atual + pagina.length
    );
    setTemMaisProdutos(catalogoTemMais(pagina.length));
    setErroCarregarMais("");
    setCarregandoMais(false);
  }

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

  // Presentation-only selections; the catalog request and filters stay unchanged.
  const recentes = [...produtos].sort((a, b) => new Date(b.publicada_em) - new Date(a.publicada_em));
  const novidades = recentes.slice(0, 4);
  const vejaTambem = recentes.slice(4, 8);

  function abrirProduto(produto) {
    setFotoSelecionada(null);
    setProdutoSelecionado(produto);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function voltarLoja() {
    setProdutoSelecionado(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function irAoCatalogo() {
    requestAnimationFrame(() => document.getElementById("nosso-garimpo")?.scrollIntoView());
  }

  const header = <StoreHeader
    busca={busca}
    onBuscaChange={(event) => { setBusca(event.target.value); setProdutoSelecionado(null); }}
    categorias={categorias}
    categoriaAtiva={categoriaAtiva}
    onCategoriaChange={(categoria) => { setCategoriaAtiva(categoria); setProdutoSelecionado(null); irAoCatalogo(); }}
    quantidadeSacola={sacola.quantidadeItens}
    onAbrirSacola={() => setSacolaAberta(true)}
    onAcompanharPedido={() => setCheckoutAberto(true)}
    onHome={voltarLoja}
  />;

  const sacolaModal = sacolaAberta ? <CartDrawer
    sacola={sacola} carregando={carregandoSacola} erro={erroSacola}
    total={totalSacola} obterUrlFoto={obterUrlFoto} formatarPreco={formatarPrecoSacola}
    formatarTempo={formatarTempoSacola} onRemover={removerDaSacola}
    onFechar={() => setSacolaAberta(false)} onCheckout={() => setCheckoutAberto(true)}
  /> : null;

  if (checkoutAberto) {
    return <CheckoutLoja empresaSlug={empresaSlug} tokenCarrinho={obterTokenCarrinho()} onFechar={() => setCheckoutAberto(false)}
      resumoSacola={sacola} subtotal={totalSacola} formatarPreco={formatarPrecoSacola} obterUrlFoto={obterUrlFoto} />;
  }

  if (produtoSelecionado) {
    const fotoDetalhe = obterUrlFoto(fotoSelecionada || produtoSelecionado.foto_principal);
    return <div className="kc-store">
      {header}{sacolaModal}
      <ProductDetail produto={produtoSelecionado} fotoDetalhe={fotoDetalhe} fotoSelecionada={fotoSelecionada}
        obterUrlFoto={obterUrlFoto} onFotoChange={setFotoSelecionada} onVoltar={voltarLoja}
        preco={formatarPrecoSacola(produtoSelecionado.preco)}>
        <div className="kc-store-buy">
          {!temTokenCarrinho && hcaptchaSiteKey && <p className="kc-store-captcha-note">Ao adicionar sua primeira peça, podemos pedir uma rápida verificação de segurança para proteger sua sacola.</p>}
          {!temTokenCarrinho && hcaptchaSiteKey && <div ref={captchaContainerRef} style={{ width: 0, height: 0, overflow: "hidden" }} />}
          <button className="kc-store-primary" type="button"
            onClick={() => adicionarNaSacola(produtoSelecionado)}
            disabled={
              validandoCaptchaPublicacaoId === produtoSelecionado.publicacao_id ||
              adicionandoPublicacaoId === produtoSelecionado.publicacao_id ||
              (!temTokenCarrinho && (!hcaptchaSiteKey || !captchaPronto))
            }>
            {
              validandoCaptchaPublicacaoId === produtoSelecionado.publicacao_id
                ? "Validando..."
                : adicionandoPublicacaoId === produtoSelecionado.publicacao_id
                  ? "Adicionando..."
                  : ultimaAdicionadaId === produtoSelecionado.publicacao_id
                    ? "Peça adicionada à sacola"
                    : "ADICIONAR À SACOLA"
            }
          </button>
          {erroSacola && <p role="alert" className="kc-store-error">{erroSacola}</p>}
          <p className="kc-store-reservation">Reserva por tempo limitado</p>
        </div>
      </ProductDetail>
    </div>;
  }

  const gridProps = { obterUrlFoto, formatarPreco: formatarPrecoSacola, itensSacola: sacola.itens, onAbrir: abrirProduto };
  return <div className="kc-store">
    <a className="kc-store-skip" href="#nosso-garimpo">Pular para o catálogo</a>
    {header}{sacolaModal}
    <main>
      <StoreHero produtos={recentes} obterUrlFoto={obterUrlFoto} />
      {(carregando || erro || produtos.length > 0) && (
        <section className="kc-store-section kc-store-container" aria-labelledby="kc-new-title">
          <div className="kc-store-section-heading"><div><p className="kc-store-eyebrow">ACABARAM DE CHEGAR</p><h2 id="kc-new-title">NOVIDADES</h2></div><a className="kc-store-text-button" href="#nosso-garimpo">Ver todas as peças ↗</a></div>
          {carregando ? <p role="status" className="kc-store-empty">Preparando nossos achados...</p> : erro ? <p role="alert" className="kc-store-error">{erro}</p> : novidades.length ? <ProductGrid {...gridProps} produtos={novidades} novidades /> : null}
        </section>
      )}
      <StoreBenefits />
      {(carregando || erro || marcas.length > 0) && (
        <section className="kc-store-brands kc-store-container" aria-labelledby="kc-brands-title">
          <h2 id="kc-brands-title" className="kc-store-eyebrow">MARCAS QUE VOCÊ AMA</h2>
          <div>{marcas.map(marca => <button type="button" key={marca} aria-pressed={marcaAtiva === marca} onClick={() => { setMarcaAtiva(marca); irAoCatalogo(); }}>{marca}</button>)}</div>
        </section>
      )}
      <section id="nosso-garimpo" className="kc-store-section kc-store-container kc-store-catalog" aria-labelledby="kc-catalog-title">
        <div className="kc-store-section-heading"><div><p className="kc-store-eyebrow">ENCONTRE O SEU PRÓXIMO ACHADO</p><h2 id="kc-catalog-title">NOSSO GARIMPO</h2></div><p className="kc-store-muted" role="status">{produtosOrdenados.length} {produtosOrdenados.length === 1 ? "peça encontrada" : "peças encontradas"}</p></div>
        {(carregando || erro || produtos.length > 0) && (
          <div className="kc-store-filters">
            <label>Categoria<select value={categoriaAtiva} onChange={event => setCategoriaAtiva(event.target.value)}><option value="">Todas as categorias</option>{categorias.map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}</select></label>
            <label>Marca<select value={marcaAtiva} onChange={event => setMarcaAtiva(event.target.value)}><option value="">Todas as marcas</option>{marcas.map(marca => <option key={marca} value={marca}>{marca}</option>)}</select></label>
            <label>Tamanho<select value={tamanhoAtivo} onChange={event => setTamanhoAtivo(event.target.value)}><option value="">Todos os tamanhos</option>{tamanhos.map(tamanho => <option key={tamanho} value={tamanho}>{tamanho}</option>)}</select></label>
            <label>Ordenar<select value={ordenacao} onChange={event => setOrdenacao(event.target.value)}><option value="recentes">Mais recentes</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option><option value="nome">Nome A-Z</option></select></label>
          </div>
        )}
        {filtrosAtivos && <div className="kc-store-filter-summary"><span>{[busca && `Busca: “${busca}”`, categoriaAtiva, marcaAtiva, tamanhoAtivo && `Tam. ${tamanhoAtivo}`].filter(Boolean).join(" / ")}</span><button type="button" className="kc-store-text-button" onClick={limparFiltros}>Limpar filtros</button></div>}
        {carregando && <p role="status" className="kc-store-empty">Carregando produtos...</p>}
        {!carregando && erro && <p role="alert" className="kc-store-error">{erro}</p>}
        {!carregando && !erro && produtos.length === 0 && (
          <div className="kc-store-empty kc-store-catalog-empty">
            <p>Nenhum achado disponível no momento.</p>
            <span>Novas peças entram conforme a curadoria da K.Chic.</span>
          </div>
        )}
        {!carregando && !erro && produtos.length > 0 && produtosOrdenados.length === 0 && <div className="kc-store-empty"><p>Nenhuma peça encontrada com estes filtros.</p><button type="button" className="kc-store-text-button" onClick={limparFiltros}>Ver todas as peças</button></div>}
        {!carregando && !erro && produtosOrdenados.length > 0 && <ProductGrid {...gridProps} produtos={produtosOrdenados} />}
        {!carregando && produtos.length > 0 && temMaisProdutos && (
          <div className="kc-store-load-more">
            <button
              type="button"
              className="kc-store-text-button"
              onClick={carregarMaisCatalogo}
              disabled={carregandoMais}
            >
              {carregandoMais ? "CARREGANDO..." : "CARREGAR MAIS"}
            </button>
          </div>
        )}
        {!carregando && erroCarregarMais && (
          <p role="alert" className="kc-store-error kc-store-load-more-error">
            {erroCarregarMais}
          </p>
        )}
      </section>
      {vejaTambem.length > 0 && (
        <section className="kc-store-section kc-store-container" aria-labelledby="kc-also-title"><div className="kc-store-section-heading"><div><p className="kc-store-eyebrow">MAIS POSSIBILIDADES PARA O SEU ESTILO</p><h2 id="kc-also-title">VEJA TAMBÉM</h2></div></div>
          {vejaTambem.length ? <ProductGrid {...gridProps} produtos={vejaTambem} novidades /> : <p className="kc-store-muted">Explore todos os achados disponíveis no nosso garimpo.</p>}
        </section>
      )}
      <section className="kc-store-about" id="sobre-kchic"><div className="kc-store-container"><p className="kc-store-eyebrow">O OLHAR K.CHIC</p><h2>Estilo que encontra<br /><em>novas histórias.</em></h2><div><p>Acreditamos no encanto de encontrar uma peça que tem tudo a ver com você. Por isso, cada achado da K.Chic é selecionado individualmente.</p><p>Marcas que você ama, peças únicas e novas possibilidades para se vestir do seu jeito.</p><a className="kc-store-text-button" href="#nosso-garimpo">Conheça nosso garimpo ↗</a></div></div></section>
    </main>
    <StoreFooter onAcompanharPedido={() => setCheckoutAberto(true)} />
  </div>;
}
