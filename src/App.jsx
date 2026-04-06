import {
  getItensDaSacolinha,
  sacolinhaEstaPaga,
  sacolinhaEstaVencida,
  sacolinhaEstaSeparada,
  sacolinhaEstaEnviada,
  sacolinhaPodeIrParaExpedicao,
  getStatusSacolinha,
  pedidoEstaEmMontagem,
  pedidoEstaEnviado,
  pedidoEstaConferido,
  clienteJaTemPedidoAtivo,
  sacolinhaJaEstaEmPedidoAtivo
} from "./utils/expedicaoRules";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import PreviewModal from "./components/layout/PreviewModal";
import EtiquetaPrint from "./components/print/EtiquetaPrint";
import ClientesSection from "./components/sections/ClientesSection";
import EstoqueSection from "./components/sections/EstoqueSection";
import ExpedicaoSection from "./components/sections/ExpedicaoSection";
import VendasSection from "./components/sections/VendasSection";
import useExpedicaoMemo from "./hooks/useExpedicaoMemo";
import useFinanceiroMemo from "./hooks/useFinanceiroMemo";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "./lib/supabase";
import logoKchic from "./assets/logo-kchic.png";

const FORM_INICIAL_PECA = {
  nome: "",
  custo: "",
  venda: "",
  obs: "",
  foto: "",
};

const FORM_INICIAL_CLIENTE = {
  nome: "",
  cpf: "",
  telefone: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
};

const PREVIEW_TIPO = {
  COMANDA: "comanda",
  ETIQUETAS: "etiquetas",
};

function formatarMoeda(valor) {
  const numeros = String(valor || "").replace(/\D/g, "");
  const numeroFloat = Number(numeros || 0) / 100;

  return numeroFloat.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarValorDescontoInput(valor) {
  let numeros = String(valor || "").replace(/\D/g, "");

  if (!numeros) return "";

  numeros = numeros.replace(/^0+/, "") || "0";

  if (numeros.length === 1) return `0,0${numeros}`;
  if (numeros.length === 2) return `0,${numeros}`;

  const inteiro = numeros.slice(0, -2);
  const decimal = numeros.slice(-2);

  return `${parseInt(inteiro, 10)},${decimal}`;
}

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
  return Number(numero || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function csvEscape(valor) {
  const texto = String(valor ?? "");
  if (texto.includes(";") || texto.includes('"') || texto.includes("\n")) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function formatarCPF(valor) {
  const numeros = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  return numeros
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarTelefone(valor) {
  const numeros = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return numeros
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatarCEP(valor) {
  const numeros = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 8);

  return numeros.replace(/^(\d{5})(\d)/, "$1-$2");
}

function gerarCodigo(prefixo = "KC", custo = "") {
  const valorCusto = limparMoeda(custo);
  const custoInteiro = Math.floor(valorCusto || 0);
  return `${prefixo}-${custoInteiro}${Date.now()}`;
}

function agruparEtiquetasEmPaginas(lista, porPagina = 25) {
  const paginas = [];

  for (let i = 0; i < lista.length; i += porPagina) {
    paginas.push(lista.slice(i, i + porPagina));
  }

  return paginas;
}

function converterDataPtBrParaIso(dataStr) {
  if (!dataStr) return null;

  const parteData = String(dataStr).split(",")[0].trim();
  const partes = parteData.split("/");

  if (partes.length !== 3) return null;

  const [dia, mes, ano] = partes;
  if (!dia || !mes || !ano) return null;

  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function baixarCSV(nomeArquivo, linhas) {
  const csv = linhas.map((linha) => linha.map(csvEscape).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", nomeArquivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function montarTextoComanda(clienteResumo) {
  return `🧾 *Comanda da Cliente*

Cliente: ${clienteResumo.nome}
Status do pagamento: ${clienteResumo.pago ? "Pago" : "Pendente"}
Total de peças: ${clienteResumo.pecas}
Valor total: ${formatarBRL(clienteResumo.total)}

${clienteResumo.itens
      .map(
        (item, index) =>
          `${index + 1}. ${item.nomePeca} - ${formatarBRL(item.valor)} - Código: ${item.codigo} - ${item.dataVenda || ""}`
      )
      .join("\n")}

PIX para pagamento:
Chave: CELULAR – 41988921085

🏦 Banco: *cloudwalk*
👩‍💼 Nome: *Kemilly Lima*

💳 Para pagamento via Cartão solicite o link de pagamento (em até 12x com taxas da operadora)

❌Caso queira deixar em sacolinha nos avisar! Obrigada ☺️🌸

🚚 Caso deseje envio, solicitar o envio que encaminho os dados para envio 🚚`;
}

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState("cadastro");
  const [carregando, setCarregando] = useState(true);

  const [pecas, setPecas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [listaLives, setListaLives] = useState([]);
  const [vendasLive, setVendasLive] = useState([]);
  const [todasVendasLive, setTodasVendasLive] = useState([]);
  const [pagamentosClientes, setPagamentosClientes] = useState({});

  const [form, setForm] = useState(FORM_INICIAL_PECA);
  const [formCliente, setFormCliente] = useState(FORM_INICIAL_CLIENTE);
  const [buscaClienteCadastro, setBuscaClienteCadastro] = useState("");
  const [salvandoCadastroPublico, setSalvandoCadastroPublico] = useState(false);
  const [cadastroPublicoConcluido, setCadastroPublicoConcluido] = useState(false);

  const [clienteEditandoId, setClienteEditandoId] = useState(null);
  const [liveAtual, setLiveAtual] = useState(null);
  const [liveSelecionada, setLiveSelecionada] = useState(null);
  const [nomeNovaLive, setNomeNovaLive] = useState("");

  const [vendaId, setVendaId] = useState("");
  const [cliente, setCliente] = useState("");
  const [valorDesconto, setValorDesconto] = useState("");
  const [salvandoVenda, setSalvandoVenda] = useState(false);

  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaPeca, setBuscaPeca] = useState("");
  const [scannerAtivo, setScannerAtivo] = useState(false);
  const [etiquetasSelecionadas, setEtiquetasSelecionadas] = useState([]);
  const [clientesExpandidos, setClientesExpandidos] = useState({});

  const [filtroPagamentoCliente, setFiltroPagamentoCliente] = useState("todos");
  const [filtroEstoque, setFiltroEstoque] = useState("todas");
  const [dataInicialFiltro, setDataInicialFiltro] = useState("");
  const [dataFinalFiltro, setDataFinalFiltro] = useState("");

  const [sacolinhasLive, setSacolinhasLive] = useState([]);
  const [carregandoSacolinhas, setCarregandoSacolinhas] = useState(false);
  const [sacolinhasExpandidas, setSacolinhasExpandidas] = useState({});
  const [pedidosEnvio, setPedidosEnvio] = useState([]);
  const [pedidoEnvioSacolinhas, setPedidoEnvioSacolinhas] = useState([]);
  const [carregandoPedidosEnvio, setCarregandoPedidosEnvio] = useState(false);
  const [pedidosEnvioExpandidos, setPedidosEnvioExpandidos] = useState({});
  const [mostrarPedidosEnvio, setMostrarPedidosEnvio] = useState(true);
  const [criandoPedidoEnvioCliente, setCriandoPedidoEnvioCliente] = useState("");
  const [itensConferidosPedido, setItensConferidosPedido] = useState({});

  const [mostrarAbertas, setMostrarAbertas] = useState(true);
  const [mostrarSeparadas, setMostrarSeparadas] = useState(true);
  const [mostrarEnviadas, setMostrarEnviadas] = useState(true);

  const [previewAberto, setPreviewAberto] = useState(false);
  const [tipoPreview, setTipoPreview] = useState(null);
  const [dadosPreview, setDadosPreview] = useState(null);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const scannerRef = useRef(null);
  const scannerElementId = "reader";

  const liveEmVisualizacao = liveSelecionada || liveAtual;

  const obterOuCriarSacolinha = async (clienteNome, liveId) => {
    try {
      const { data: existente, error: erroBusca } = await supabase
        .from("sacolinhas_live")
        .select("*")
        .eq("cliente_nome", clienteNome)
        .eq("live_id", liveId)
        .eq("status", "aberta")
        .maybeSingle();

      if (erroBusca) throw erroBusca;

      if (existente) {
        return existente.id;
      }

      const novaId = `SAC-${Date.now()}`;

      const { error: erroCriar } = await supabase
        .from("sacolinhas_live")
        .insert([
          {
            id: novaId,
            cliente_nome: clienteNome,
            live_id: liveId,
            status: "aberta",
            criado_em: new Date().toLocaleString("pt-BR"),
          },
        ]);

      if (erroCriar) throw erroCriar;

      return novaId;
    } catch (err) {
      console.error("Erro ao obter/criar sacolinha:", err);
      alert("Erro ao criar sacolinha");
      return null;
    }
  };

  async function carregarPagamentosClientes() {
    const { data, error } = await supabase.from("clientes_pagamento").select("*");

    if (error) {
      console.error(error);
      return;
    }

    const mapa = {};
    (data || []).forEach((item) => {
      mapa[item.cliente] = !!item.pago;
    });

    setPagamentosClientes(mapa);
  }

  async function carregarPecas() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("pecas")
      .select("*")
      .order("data_cadastro", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erro ao carregar peças do banco.");
      setCarregando(false);
      return;
    }

    setPecas(data || []);
    setCarregando(false);
  }

  async function carregarClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erro ao carregar clientes");
      return;
    }

    setClientes(data || []);
  }

  async function carregarLives() {
    const { data, error } = await supabase
      .from("lives")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("ERRO AO CARREGAR LIVES:", error);
      return;
    }

    setListaLives(data || []);
  }

  async function carregarLiveAberta() {
    const { data, error } = await supabase
      .from("lives")
      .select("*")
      .eq("status", "aberta")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("ERRO AO CARREGAR LIVE ABERTA:", error);
      return;
    }

    if (data) {
      setLiveAtual(data);
      setLiveSelecionada(data);
    } else {
      setLiveAtual(null);
      setLiveSelecionada(null);
      setVendasLive([]);
    }
  }

  async function carregarTodasVendasLive() {
    const { data, error } = await supabase.from("vendas_live").select("*");

    if (error) {
      console.error("ERRO AO CARREGAR TODAS AS VENDAS:", error);
      return;
    }

    setTodasVendasLive(data || []);
  }

  async function carregarVendasLive(live = liveAtual) {
    if (!live?.id) {
      setVendasLive([]);
      return;
    }

    const { data, error } = await supabase
      .from("vendas_live")
      .select("*")
      .eq("live_id", live.id);

    if (error) {
      console.error("ERRO AO CARREGAR vendas_live:", error);
      return;
    }

    setVendasLive(data || []);
  }

  async function abrirLiveHistorica(live) {
    setLiveSelecionada(live);
    await carregarVendasLive(live);
  }

  async function buscarCep(cep) {
    const cepLimpo = String(cep || "").replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();

      if (data.erro) return;

      const enderecoMontado = `${data.logradouro || ""}${data.bairro ? " - " + data.bairro : ""
        }${data.localidade ? " - " + data.localidade : ""}${data.uf ? "/" + data.uf : ""
        }`;

      setFormCliente((prev) => ({
        ...prev,
        endereco: enderecoMontado || prev.endereco,
      }));
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    }
  }

  async function carregarTudoInicial() {
    await Promise.all([
      carregarPecas(),
      carregarClientes(),
      carregarLives(),
      carregarLiveAberta(),
      carregarPagamentosClientes(),
      carregarTodasVendasLive(),
      carregarSacolinhasLive(),
      carregarPedidosEnvio(),
      carregarPedidoEnvioSacolinhas(),
    ]);
  }

  async function recarregarExpedicao() {
    await Promise.all([
      carregarSacolinhasLive(),
      carregarPedidosEnvio(),
      carregarPedidoEnvioSacolinhas(),
      carregarTodasVendasLive(),
    ]);
  }

  useEffect(() => {
    carregarTudoInicial();
  }, []);

  useEffect(() => {
    if (liveAtual) {
      carregarVendasLive(liveAtual);
      setLiveSelecionada((prev) => prev || liveAtual);
    } else if (!liveSelecionada) {
      setVendasLive([]);
    }
  }, [liveAtual]);

  useEffect(() => {
    const channelPecas = supabase
      .channel("pecas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pecas" },
        async () => {
          await carregarPecas();
        }
      )
      .subscribe();

    const channelPagamentos = supabase
      .channel("clientes-pagamento-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes_pagamento" },
        async () => {
          await carregarPagamentosClientes();
        }
      )
      .subscribe();

    const channelLives = supabase
      .channel("lives-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lives" },
        async () => {
          await carregarLives();
          await carregarLiveAberta();
        }
      )
      .subscribe();

    const channelVendasLive = supabase
      .channel("vendas-live-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas_live" },
        async () => {
          await carregarTodasVendasLive();
          await carregarSacolinhasLive();
          if (liveEmVisualizacao) {
            await carregarVendasLive(liveEmVisualizacao);
          }
        }
      )
      .subscribe();

    const channelSacolinhas = supabase
      .channel("sacolinhas-live-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sacolinhas_live" },
        async () => {
          await carregarSacolinhasLive();
        }
      )
      .subscribe();

    const channelPedidosEnvio = supabase
      .channel("pedidos-envio-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos_envio" },
        async () => {
          await carregarPedidosEnvio();
        }
      )
      .subscribe();

    const channelPedidoEnvioSacolinhas = supabase
      .channel("pedido-envio-sacolinhas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_envio_sacolinhas" },
        async () => {
          await carregarPedidoEnvioSacolinhas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelPecas);
      supabase.removeChannel(channelPagamentos);
      supabase.removeChannel(channelLives);
      supabase.removeChannel(channelVendasLive);
      supabase.removeChannel(channelSacolinhas);
      supabase.removeChannel(channelPedidosEnvio);
      supabase.removeChannel(channelPedidoEnvioSacolinhas);
    };
  }, [liveEmVisualizacao]);

  useEffect(() => {
    if (!scannerAtivo) return;

    const timer = setTimeout(() => {
      try {
        if (!scannerRef.current) {
          const scanner = new Html5QrcodeScanner(
            scannerElementId,
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
              rememberLastUsedCamera: true,
            },
            false
          );

          scanner.render(
            (decodedText) => {
              setVendaId(decodedText);
              setScannerAtivo(false);
            },
            () => { }
          );

          scannerRef.current = scanner;
        }
      } catch (error) {
        console.error(error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [scannerAtivo]);

  useEffect(() => {
    if (!scannerAtivo && scannerRef.current) {
      const scanner = scannerRef.current;
      scanner
        .clear()
        .catch(() => { })
        .finally(() => {
          scannerRef.current = null;
        });
    }
  }, [scannerAtivo]);

  useEffect(() => {
    if (abaAtiva === "expedicao") {
      resetExpansoesExpedicao();
      setMostrarAbertas(false);
      setMostrarSeparadas(false);
      setMostrarPedidosEnvio(false);
      setMostrarEnviadas(false);
    }
  }, [abaAtiva]);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function normalizarCPF(valor) {
    return String(valor || "").replace(/\D/g, "").slice(0, 11);
  }

  function normalizarTelefone(valor) {
    return String(valor || "").replace(/\D/g, "").slice(0, 11);
  }

  function modoCadastroPublicoAtivo() {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("cadastro") === "cliente";
  }

  async function buscarClientePorCpf(cpf, idIgnorar = null) {
    const cpfLimpo = normalizarCPF(cpf);

    if (!cpfLimpo || cpfLimpo.length !== 11) return null;

    let query = supabase
      .from("clientes")
      .select("id, nome, cpf")
      .eq("cpf", cpfLimpo)
      .limit(1);

    if (idIgnorar) {
      query = query.neq("id", idIgnorar);
    }

    const { data, error } = await query;

    if (error) {
      console.error("ERRO AO BUSCAR CPF:", error);
      throw error;
    }

    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  function gerarLinkCadastroCliente() {
    if (typeof window === "undefined") return "";

    const url = new URL(window.location.origin);
    url.searchParams.set("cadastro", "cliente");

    return url.toString();
  }

  async function copiarTexto(texto, mensagemSucesso, mensagemErro) {
    try {
      if (!navigator?.clipboard) {
        alert(mensagemErro);
        return false;
      }

      await navigator.clipboard.writeText(texto);
      alert(mensagemSucesso);
      return true;
    } catch (error) {
      console.error(error);
      alert(mensagemErro);
      return false;
    }
  }

  async function copiarLinkCadastroCliente() {
    const link = gerarLinkCadastroCliente();

    await copiarTexto(
      link,
      "Link de cadastro copiado com sucesso.",
      "Não foi possível copiar o link."
    );
  }

  async function salvarCliente() {
    if (!formCliente.nome.trim()) {
      alert("Preencha pelo menos o nome.");
      return;
    }

    const cpfLimpo = normalizarCPF(formCliente.cpf);

    if (cpfLimpo && cpfLimpo.length !== 11) {
      alert("CPF inválido. Preencha os 11 dígitos.");
      return;
    }

    try {
      const clienteExistente = await buscarClientePorCpf(cpfLimpo, clienteEditandoId);

      if (clienteExistente) {
        alert(`Já existe cliente cadastrada com este CPF: ${clienteExistente.nome}`);
        return;
      }

      const payload = {
        nome: formCliente.nome.trim(),
        cpf: cpfLimpo,
        telefone: normalizarTelefone(formCliente.telefone),
        cep: String(formCliente.cep || "").replace(/\D/g, "").slice(0, 8),
        endereco: formCliente.endereco,
        numero: formCliente.numero,
        complemento: formCliente.complemento,
      };

      if (clienteEditandoId) {
        const { error } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", clienteEditandoId);

        if (error) {
          console.error("ERRO AO ATUALIZAR CLIENTE:", error);
          alert(`Erro ao atualizar cliente: ${error.message}`);
          return;
        }

        alert("Cliente atualizado com sucesso.");
      } else {
        const novo = {
          id: gerarCodigo("CLI"),
          ...payload,
          criado_em: new Date().toLocaleString("pt-BR"),
        };

        const { error } = await supabase.from("clientes").insert(novo);

        if (error) {
          console.error("ERRO AO SALVAR CLIENTE:", error);
          alert(`Erro ao salvar cliente: ${error.message}`);
          return;
        }

        alert("Cliente salvo com sucesso.");
      }

      setFormCliente(FORM_INICIAL_CLIENTE);
      setClienteEditandoId(null);
      await carregarClientes();
    } catch (error) {
      console.error("ERRO AO VALIDAR CPF:", error);
      alert("Erro ao validar CPF no banco.");
    }
  }

  async function salvarCadastroClientePublico() {
    if (!formCliente.nome.trim()) {
      alert("Preencha seu nome.");
      return;
    }

    const cpfLimpo = normalizarCPF(formCliente.cpf);

    if (!cpfLimpo || cpfLimpo.length !== 11) {
      alert("Informe um CPF válido com 11 dígitos.");
      return;
    }

    try {
      setSalvandoCadastroPublico(true);

      const clienteExistente = await buscarClientePorCpf(cpfLimpo);

      if (clienteExistente) {
        alert(`Já existe cadastro com este CPF: ${clienteExistente.nome}`);
        return;
      }

      const novo = {
        id: gerarCodigo("CLI"),
        nome: formCliente.nome.trim(),
        cpf: cpfLimpo,
        telefone: normalizarTelefone(formCliente.telefone),
        cep: String(formCliente.cep || "").replace(/\D/g, "").slice(0, 8),
        endereco: formCliente.endereco,
        numero: formCliente.numero,
        complemento: formCliente.complemento,
        criado_em: new Date().toLocaleString("pt-BR"),
      };

      const { error } = await supabase.from("clientes").insert(novo);

      if (error) {
        console.error("ERRO AO SALVAR CADASTRO PÚBLICO:", error);
        alert(`Erro ao enviar cadastro: ${error.message}`);
        return;
      }

      setFormCliente(FORM_INICIAL_CLIENTE);
      setCadastroPublicoConcluido(true);
    } catch (error) {
      console.error("ERRO NO CADASTRO PÚBLICO:", error);
      alert("Erro ao validar ou salvar cadastro.");
    } finally {
      setSalvandoCadastroPublico(false);
    }
  }

  function editarCliente(clienteSelecionado) {
    setClienteEditandoId(clienteSelecionado.id);
    setFormCliente({
      nome: clienteSelecionado.nome || "",
      cpf: clienteSelecionado.cpf || "",
      telefone: clienteSelecionado.telefone || "",
      cep: clienteSelecionado.cep || "",
      endereco: clienteSelecionado.endereco || "",
      numero: clienteSelecionado.numero || "",
      complemento: clienteSelecionado.complemento || "",
    });
    setAbaAtiva("clientes");
  }

  function cancelarEdicaoCliente() {
    setClienteEditandoId(null);
    setFormCliente(FORM_INICIAL_CLIENTE);
  }

  async function excluirCliente(id) {
    const confirmar = window.confirm("Deseja excluir este cliente?");
    if (!confirmar) return;

    const { error } = await supabase.from("clientes").delete().eq("id", id);

    if (error) {
      console.error("ERRO AO EXCLUIR CLIENTE:", error);
      alert(`Erro ao excluir cliente: ${error.message}`);
      return;
    }

    if (clienteEditandoId === id) {
      cancelarEdicaoCliente();
    }

    await carregarClientes();
    alert("Cliente excluído com sucesso.");
  }

  async function compartilharCliente(clienteSelecionado) {
    const texto = `Cliente: ${clienteSelecionado.nome}
CPF: ${clienteSelecionado.cpf || "-"}
Telefone: ${clienteSelecionado.telefone || "-"}
CEP: ${clienteSelecionado.cep || "-"}
Endereço: ${clienteSelecionado.endereco || "-"}
Número: ${clienteSelecionado.numero || "-"}
Complemento: ${clienteSelecionado.complemento || "-"}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Cliente ${clienteSelecionado.nome}`,
          text: texto,
        });
        return;
      } catch (err) {
        console.error(err);
      }
    }

    await copiarTexto(
      texto,
      "Dados do cliente copiados.",
      "Não foi possível compartilhar."
    );
  }

  function gerarMensagemWhatsAppCadastroCliente() {
    const link = gerarLinkCadastroCliente();
    return `Oi! Para agilizar seu atendimento, preencha seu cadastro neste link: ${link}`;
  }

  async function copiarMensagemWhatsAppCadastroCliente() {
    const mensagem = gerarMensagemWhatsAppCadastroCliente();

    await copiarTexto(
      mensagem,
      "Mensagem de WhatsApp copiada com sucesso.",
      "Não foi possível copiar a mensagem."
    );
  }

  function handleFoto(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        foto: reader.result,
      }));
    };
    reader.readAsDataURL(arquivo);
  }

  async function adicionarPeca() {
    if (!form.nome.trim()) return;

    const nova = {
      id: gerarCodigo("KC", form.custo),
      nome: form.nome.trim(),
      custo: form.custo,
      venda: form.venda,
      obs: form.obs.trim(),
      foto: form.foto || "",
      vendido: false,
      cliente: "",
      data_cadastro: new Date().toLocaleString("pt-BR"),
      data_venda: "",
    };

    const { error } = await supabase.from("pecas").insert(nova);

    if (error) {
      console.error(error);
      alert("Erro ao salvar peça.");
      return;
    }

    setForm(FORM_INICIAL_PECA);
    setAbaAtiva("pecas");
    await carregarPecas();
  }

  async function removerPeca(id) {
    const confirmar = window.confirm("Tem certeza que deseja remover esta peça?");
    if (!confirmar) return;

    const { error } = await supabase.from("pecas").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("Erro ao remover peça.");
      return;
    }

    await carregarPecas();
  }

  async function limparTudo() {
    const confirmar = window.confirm("Deseja apagar todas as peças e vendas?");
    if (!confirmar) return;

    const { error: errorPecas } = await supabase.from("pecas").delete().neq("id", "");
    if (errorPecas) {
      console.error(errorPecas);
      alert("Erro ao apagar peças.");
      return;
    }

    await supabase.from("clientes_pagamento").delete().neq("cliente", "");

    await carregarPecas();
    setEtiquetasSelecionadas([]);
  }

  async function registrarVenda() {
    if (salvandoVenda) return;

    if (!liveAtual) {
      alert("Você precisa iniciar uma live antes de vender.");
      return;
    }

    if (!vendaId.trim() || !cliente.trim()) return;

    const peca = mapaPecasPorId[String(vendaId.trim())];

    if (!peca) {
      alert("Código da peça não encontrado.");
      return;
    }

    if (peca.vendido) {
      alert("Essa peça já está marcada como vendida.");
      return;
    }

    const sacolinhaId = await obterOuCriarSacolinha(cliente.trim(), liveAtual.id);

    if (!sacolinhaId) {
      return;
    }

    setSalvandoVenda(true);

    try {
      const valorFinal = valorDesconto
        ? limparMoeda(valorDesconto)
        : limparMoeda(peca.venda);

      const { data: pecaAtualizada, error: errorPeca } = await supabase
        .from("pecas")
        .update({
          vendido: true,
          cliente: cliente.trim(),
          data_venda: new Date().toLocaleString("pt-BR"),
          valor_venda_final: valorFinal,
        })
        .eq("id", vendaId.trim())
        .eq("vendido", false)
        .select();

      if (errorPeca) {
        console.error(errorPeca);
        alert("Erro ao registrar venda.");
        return;
      }

      if (!pecaAtualizada || pecaAtualizada.length === 0) {
        alert("Essa peça já foi vendida ou a venda já foi registrada.");
        await carregarPecas();
        return;
      }

      const { data: vendaExistente, error: errorBuscaVenda } = await supabase
        .from("vendas_live")
        .select("id")
        .eq("peca_id", vendaId.trim())
        .limit(1);

      if (errorBuscaVenda) {
        console.error("ERRO AO VERIFICAR venda existente:", errorBuscaVenda);
        alert("Erro ao verificar venda existente.");
        return;
      }

      if (vendaExistente && vendaExistente.length > 0) {
        alert("Essa peça já está registrada na live.");
        await carregarPecas();
        await carregarVendasLive();
        return;
      }

      const novaVendaLive = {
        id: gerarCodigo("VENDA"),
        live_id: liveAtual.id,
        sacolinha_id: sacolinhaId,
        peca_id: vendaId.trim(),
        nome_peca: peca.nome || "-",
        cliente_nome: cliente.trim(),
        valor_venda: valorFinal,
        data_hora: new Date().toLocaleString("pt-BR"),
        status_pagamento: "pendente",
      };

      const { error: errorVendaLive } = await supabase
        .from("vendas_live")
        .insert(novaVendaLive);

      if (errorVendaLive) {
        console.error("ERRO AO SALVAR EM vendas_live:", errorVendaLive);
        alert(`Erro ao salvar na vendas_live: ${errorVendaLive.message}`);
        return;
      }

      await Promise.all([
        carregarVendasLive(),
        carregarPecas(),
        carregarTodasVendasLive(),
      ]);

      setVendaId("");
      setCliente("");
      setValorDesconto("");
    } finally {
      setSalvandoVenda(false);
    }
  }

  async function cancelarVenda(id) {
    const confirmar = window.confirm(
      "Deseja cancelar essa venda e devolver a peça para disponível?"
    );
    if (!confirmar) return;

    const { error: errorPeca } = await supabase
      .from("pecas")
      .update({
        vendido: false,
        cliente: null,
        data_venda: null,
        valor_venda_final: null,
      })
      .eq("id", id);

    if (errorPeca) {
      console.error("ERRO AO VOLTAR PEÇA:", errorPeca);
      alert(`Erro ao cancelar venda: ${errorPeca.message}`);
      return;
    }

    const { data: removidas, error: errorVendaLive } = await supabase
      .from("vendas_live")
      .delete()
      .eq("peca_id", id)
      .select();

    if (errorVendaLive) {
      console.error("ERRO AO REMOVER DA LIVE:", errorVendaLive);
      alert(`Erro ao remover da live: ${errorVendaLive.message}`);
      return;
    }

    if (!removidas || removidas.length === 0) {
      console.warn("Nenhum registro foi removido da vendas_live para a peça:", id);
      alert(
        `A peça voltou para disponível, mas não encontrei registro na vendas_live para o código ${id}.`
      );
      await Promise.all([carregarPecas(), carregarTodasVendasLive()]);
      return;
    }

    await Promise.all([carregarPecas(), carregarTodasVendasLive()]);

    if (liveEmVisualizacao) {
      await carregarVendasLive(
        liveEmVisualizacao.id === liveAtual?.id ? liveAtual : liveEmVisualizacao
      );
    } else {
      setVendasLive([]);
    }

    alert("Venda cancelada com sucesso.");
  }

  async function togglePagamentoCliente(nomeCliente, statusAtual) {
    const novoStatus = !statusAtual;

    const { error } = await supabase.from("clientes_pagamento").upsert({
      cliente: nomeCliente,
      pago: novoStatus,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(error);
      alert("Erro ao atualizar pagamento.");
      return;
    }

    await carregarPagamentosClientes();
  }

  async function iniciarLive() {
    if (!nomeNovaLive.trim()) {
      alert("Digite um nome para a live.");
      return;
    }

    const novaLive = {
      id: gerarCodigo("LIVE"),
      nome: nomeNovaLive,
      data_live: new Date().toLocaleDateString("pt-BR"),
      hora_inicio: new Date().toLocaleTimeString("pt-BR"),
      status: "aberta",
      criado_em: new Date().toLocaleString("pt-BR"),
    };

    const { error } = await supabase.from("lives").insert(novaLive);

    if (error) {
      console.error("ERRO AO INICIAR LIVE:", error);
      alert(`Erro ao iniciar live: ${error.message}`);
      return;
    }

    setNomeNovaLive("");
    await carregarLives();
    await carregarLiveAberta();
    alert("Live iniciada com sucesso!");
  }

  async function encerrarLive() {
    if (!liveAtual) return;

    const confirmar = window.confirm("Deseja encerrar esta live?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("lives")
      .update({
        status: "encerrada",
        hora_fim: new Date().toLocaleTimeString("pt-BR"),
      })
      .eq("id", liveAtual.id);

    if (error) {
      console.error(error);
      alert("Erro ao encerrar live");
      return;
    }

    setLiveSelecionada(null);
    await carregarLives();
    await carregarLiveAberta();
    alert("Live encerrada!");
  }

  async function togglePagamentoClienteLive(nomeCliente, statusAtual) {
    if (!liveEmVisualizacao) {
      alert("Nenhuma live selecionada para atualizar pagamento.");
      return;
    }

    const novoStatus = statusAtual ? "pendente" : "pago";

    const { error } = await supabase
      .from("vendas_live")
      .update({ status_pagamento: novoStatus })
      .eq("live_id", liveEmVisualizacao.id)
      .eq("cliente_nome", nomeCliente);

    if (error) {
      console.error("ERRO AO ATUALIZAR PAGAMENTO DA LIVE:", error);
      alert(`Erro ao atualizar pagamento: ${error.message}`);
      return;
    }

    await carregarVendasLive(
      liveEmVisualizacao.id === liveAtual?.id ? liveAtual : liveEmVisualizacao
    );
  }

  function exportarRelatorioCSV() {
    const linhas = [
      [
        "codigo",
        "nome",
        "custo",
        "venda",
        "observacoes",
        "status",
        "cliente",
        "data_cadastro",
        "data_venda",
      ],
      ...pecas.map((p) => [
        p.id,
        p.nome,
        limparMoeda(p.custo).toFixed(2),
        limparMoeda(p.venda).toFixed(2),
        p.obs || "",
        p.vendido ? "Vendido" : "Disponivel",
        p.cliente || "",
        p.data_cadastro || "",
        p.data_venda || "",
      ]),
    ];

    baixarCSV("relatorio-brecho.csv", linhas);
  }

  function exportarClienteCSV(clienteResumo) {
    const linhas = [
      ["cliente", clienteResumo.nome],
      ["status_pagamento", clienteResumo.pago ? "Pago" : "Pendente"],
      ["total_pecas", String(clienteResumo.pecas)],
      ["valor_total", clienteResumo.total.toFixed(2)],
      [],
      ["codigo", "peca", "valor", "data_venda"],
      ...clienteResumo.itens.map((item) => [
        item.codigo,
        item.nomePeca,
        Number(item.valor || 0).toFixed(2),
        item.dataVenda || "",
      ]),
    ];

    const nomeArquivo = `cliente-${clienteResumo.nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "-")
      .toLowerCase()}.csv`;

    baixarCSV(nomeArquivo, linhas);
  }

  function abrirPreview(tipo, dados) {
    setTipoPreview(tipo);
    setDadosPreview(dados);
    setPreviewAberto(true);
  }

  function fecharPreview() {
    setPreviewAberto(false);
    setTipoPreview(null);
    setDadosPreview(null);
  }

  function gerarComanda(clienteResumo) {
    abrirPreview(PREVIEW_TIPO.COMANDA, clienteResumo);
  }

  async function carregarSacolinhasLive() {
    setCarregandoSacolinhas(true);

    const { data, error } = await supabase
      .from("sacolinhas_live")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("ERRO AO CARREGAR SACOLINHAS:", error);
      setCarregandoSacolinhas(false);
      return;
    }

    setSacolinhasLive(data || []);
    setCarregandoSacolinhas(false);
  }

  function resetExpansoesExpedicao() {
    setSacolinhasExpandidas({});
    setPedidosEnvioExpandidos({});
  }

  async function copiarTextoComanda(clienteResumo) {
    try {
      await navigator.clipboard.writeText(montarTextoComanda(clienteResumo));
      alert("Texto da comanda copiado com sucesso.");
    } catch {
      alert("Não foi possível copiar o texto da comanda.");
    }
  }

  async function marcarSacolinhaComoEnviada(sacolinhaId, sacolinha) {
    if (!sacolinhaEstaPaga(sacolinha, todasVendasLive)) {
      alert("Só é possível enviar após pagamento.");
      return;
    }

    const confirmar = window.confirm("Deseja marcar essa sacolinha como enviada?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("sacolinhas_live")
      .update({
        status: "enviada",
      })
      .eq("id", sacolinhaId);

    if (error) {
      console.error("ERRO AO MARCAR SACOLINHA COMO ENVIADA:", error);
      alert(`Erro ao atualizar envio: ${error.message}`);
      return;
    }

    await carregarSacolinhasLive();
  }

  async function cancelarPedidoDeEnvio(pedidoId, clienteNome) {
    const confirmar = window.confirm(
      `Cancelar o pedido de envio de ${clienteNome} e devolver as sacolinhas para Separadas?`
    );

    if (!confirmar) return;

    try {
      const { error: erroVinculos } = await supabase
        .from("pedido_envio_sacolinhas")
        .delete()
        .eq("pedido_envio_id", pedidoId);

      if (erroVinculos) {
        console.error("ERRO AO REMOVER VÍNCULOS DO PEDIDO DE ENVIO:", erroVinculos);
        alert(`Erro ao remover vínculos do pedido: ${erroVinculos.message}`);
        return;
      }

      const { error: erroPedido } = await supabase
        .from("pedidos_envio")
        .delete()
        .eq("id", pedidoId);

      if (erroPedido) {
        console.error("ERRO AO CANCELAR PEDIDO DE ENVIO:", erroPedido);
        alert(`Erro ao cancelar pedido de envio: ${erroPedido.message}`);
        return;
      }

      await recarregarExpedicao();
      resetExpansoesExpedicao();

      alert("Pedido de envio cancelado com sucesso.");
    } catch (error) {
      console.error("ERRO GERAL AO CANCELAR PEDIDO DE ENVIO:", error);
      alert("Erro inesperado ao cancelar pedido de envio.");
    }
  }

  async function marcarPedidoComoEnviado(pedido) {
    const itensConferidos = itensConferidosPedido[pedido.id] || [];
    const totalItens = pedido.quantidadeCalculada || 0;

    if (totalItens === 0) {
      alert("Esse pedido não possui itens.");
      return;
    }

    if (itensConferidos.length !== totalItens) {
      alert("Confira todos os itens antes de marcar como enviado.");
      return;
    }

    const confirmar = window.confirm(
      `Deseja marcar o pedido de ${pedido.cliente_nome} como enviado?`
    );
    if (!confirmar) return;

    try {
      const agora = new Date().toLocaleString("pt-BR");

      const { error: erroPedido } = await supabase
        .from("pedidos_envio")
        .update({
          status: "enviado",
          conferido: true,
          quantidade_conferida: totalItens,
          atualizado_em: agora,
          enviado_em: agora,
        })
        .eq("id", pedido.id);

      if (erroPedido) {
        console.error("ERRO AO MARCAR PEDIDO COMO ENVIADO:", erroPedido);
        alert(`Erro ao finalizar pedido: ${erroPedido.message}`);
        return;
      }

      const idsSacolinhas = (pedido.sacolinhas || []).map((s) => s.id);

      if (idsSacolinhas.length > 0) {
        const { error: erroSacolinhas } = await supabase
          .from("sacolinhas_live")
          .update({
            status: "enviada",
          })
          .in("id", idsSacolinhas);

        if (erroSacolinhas) {
          console.error("ERRO AO MARCAR SACOLINHAS COMO ENVIADAS:", erroSacolinhas);
          alert(`Erro ao atualizar sacolinhas: ${erroSacolinhas.message}`);
          return;
        }
      }

      await recarregarExpedicao();
      resetExpansoesExpedicao();

      alert("Pedido marcado como enviado com sucesso.");
    } catch (error) {
      console.error("ERRO GERAL AO ENVIAR PEDIDO:", error);
      alert("Erro inesperado ao finalizar envio.");
    }
  }

  async function criarPedidoDeEnvio(clienteNome) {
    if (criandoPedidoEnvioCliente === clienteNome) return;

    if (clienteJaTemPedidoAtivo(clienteNome, pedidosEnvio)) {
      alert("Essa cliente já possui um pedido de envio em andamento.");
      return;
    }

    const sacolinhasElegiveis = obterSacolinhasSeparadasElegiveisPorCliente(clienteNome);

    if (!sacolinhasElegiveis.length) {
      alert("Não há sacolinhas separadas disponíveis para criar pedido de envio.");
      return;
    }

    const confirmar = window.confirm(
      `Criar pedido de envio para ${clienteNome} com ${sacolinhasElegiveis.length} sacolinha(s)?`
    );
    if (!confirmar) return;

    try {
      setCriandoPedidoEnvioCliente(clienteNome);

      const itensDoPedido = sacolinhasElegiveis.flatMap((sacolinha) =>
        getItensDaSacolinha(sacolinha, todasVendasLive)
      );

      const quantidadeEsperada = itensDoPedido.length;
      const pedidoId = gerarCodigo("ENV");
      const criadoEm = new Date().toLocaleString("pt-BR");

      const { error: erroPedido } = await supabase
        .from("pedidos_envio")
        .insert([
          {
            id: pedidoId,
            cliente_nome: clienteNome,
            status: "montagem",
            quantidade_esperada: quantidadeEsperada,
            quantidade_conferida: null,
            conferido: false,
            altura_cm: null,
            largura_cm: null,
            comprimento_cm: null,
            peso_kg: null,
            observacoes: "",
            criado_em: criadoEm,
            atualizado_em: criadoEm,
            enviado_em: null,
          },
        ]);

      if (erroPedido) {
        console.error("ERRO AO CRIAR PEDIDO DE ENVIO:", erroPedido);
        alert(`Erro ao criar pedido de envio: ${erroPedido.message}`);
        return;
      }

      const vinculos = sacolinhasElegiveis.map((sacolinha) => ({
        id: crypto.randomUUID(),
        pedido_envio_id: pedidoId,
        sacolinha_id: sacolinha.id,
      }));

      const { error: erroVinculos } = await supabase
        .from("pedido_envio_sacolinhas")
        .insert(vinculos);

      if (erroVinculos) {
        console.error("ERRO AO VINCULAR SACOLINHAS AO PEDIDO:", erroVinculos);
        alert(`Erro ao vincular sacolinhas: ${erroVinculos.message}`);
        return;
      }

      await recarregarExpedicao();
      resetExpansoesExpedicao();

      alert("Pedido de envio criado com sucesso.");
    } catch (error) {
      console.error("ERRO GERAL AO CRIAR PEDIDO DE ENVIO:", error);
      alert("Erro inesperado ao criar pedido de envio.");
    } finally {
      setCriandoPedidoEnvioCliente("");
    }
  }

  function obterSacolinhasSeparadasElegiveisPorCliente(clienteNome) {
    return sacolinhasLive.filter((s) => {
      return (
        s.status === "separada" &&
        String(s.cliente_nome || "").trim().toLowerCase() ===
        String(clienteNome || "").trim().toLowerCase() &&
        !sacolinhaJaEstaEmPedidoAtivo(s.id, pedidoEnvioSacolinhas, pedidosEnvio)
      );
    });
  }

  async function marcarSacolinhaComoSeparada(sacolinhaId) {
    const { error } = await supabase
      .from("sacolinhas_live")
      .update({
        status: "separada",
      })
      .eq("id", sacolinhaId);

    if (error) {
      console.error("ERRO AO MARCAR SACOLINHA COMO SEPARADA:", error);
      alert(`Erro ao atualizar separação: ${error.message}`);
      return;
    }

    await carregarSacolinhasLive();
    resetExpansoesExpedicao();
  }

  async function carregarPedidosEnvio() {
    setCarregandoPedidosEnvio(true);

    const { data, error } = await supabase
      .from("pedidos_envio")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("ERRO AO CARREGAR PEDIDOS DE ENVIO:", error);
      setCarregandoPedidosEnvio(false);
      return;
    }

    setPedidosEnvio(data || []);
    setCarregandoPedidosEnvio(false);
  }

  async function carregarPedidoEnvioSacolinhas() {
    const { data, error } = await supabase
      .from("pedido_envio_sacolinhas")
      .select("*");

    if (error) {
      console.error("ERRO AO CARREGAR VÍNCULOS DE PEDIDOS DE ENVIO:", error);
      return;
    }

    setPedidoEnvioSacolinhas(data || []);
  }

  async function corrigirSacolinhasAntigas() {
    const confirmar = window.confirm(
      "Isso vai criar sacolinhas para vendas antigas sem vínculo. Deseja continuar?"
    );
    if (!confirmar) return;

    try {
      const { data: vendasSemSacolinha, error: erroBuscar } = await supabase
        .from("vendas_live")
        .select("*")
        .is("sacolinha_id", null);

      if (erroBuscar) {
        console.error("ERRO AO BUSCAR VENDAS SEM SACOLINHA:", erroBuscar);
        alert(`Erro ao buscar vendas antigas: ${erroBuscar.message}`);
        return;
      }

      if (!vendasSemSacolinha || vendasSemSacolinha.length === 0) {
        alert("Nenhuma venda antiga sem sacolinha foi encontrada.");
        return;
      }

      const grupos = {};

      vendasSemSacolinha.forEach((venda) => {
        const clienteNome = String(venda.cliente_nome || "").trim();
        const liveId = String(venda.live_id || "").trim();

        if (!clienteNome || !liveId) return;

        const chave = `${liveId}__${clienteNome}`;

        if (!grupos[chave]) {
          grupos[chave] = {
            live_id: liveId,
            cliente_nome: clienteNome,
            vendas: [],
          };
        }

        grupos[chave].vendas.push(venda);
      });

      const gruposLista = Object.values(grupos);

      if (gruposLista.length === 0) {
        alert("Não encontrei grupos válidos para corrigir.");
        return;
      }

      for (const grupo of gruposLista) {
        const novoIdSacolinha = `SAC-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;

        const { error: erroCriarSacolinha } = await supabase
          .from("sacolinhas_live")
          .insert([
            {
              id: novoIdSacolinha,
              live_id: grupo.live_id,
              cliente_nome: grupo.cliente_nome,
              status: "aberta",
              criado_em: new Date().toLocaleString("pt-BR"),
            },
          ]);

        if (erroCriarSacolinha) {
          console.error("ERRO AO CRIAR SACOLINHA:", erroCriarSacolinha, grupo);
          alert(
            `Erro ao criar sacolinha de ${grupo.cliente_nome}: ${erroCriarSacolinha.message}`
          );
          return;
        }

        const idsVendas = grupo.vendas.map((v) => v.id);

        const { error: erroAtualizarVendas } = await supabase
          .from("vendas_live")
          .update({ sacolinha_id: novoIdSacolinha })
          .in("id", idsVendas);

        if (erroAtualizarVendas) {
          console.error("ERRO AO ATUALIZAR VENDAS:", erroAtualizarVendas, grupo);
          alert(
            `Erro ao vincular vendas de ${grupo.cliente_nome}: ${erroAtualizarVendas.message}`
          );
          return;
        }
      }

      await Promise.all([
        carregarSacolinhasLive(),
        carregarTodasVendasLive(),
        carregarLives(),
      ]);

      alert("Sacolinhas antigas corrigidas com sucesso.");
    } catch (err) {
      console.error("ERRO GERAL AO CORRIGIR SACOLINHAS ANTIGAS:", err);
      alert("Erro inesperado ao corrigir sacolinhas antigas.");
    }
  }

  function abrirWhatsappComanda(clienteResumo) {
    const textoCodificado = encodeURIComponent(montarTextoComanda(clienteResumo));
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const url = isMobile
      ? `https://wa.me/?text=${textoCodificado}`
      : `https://web.whatsapp.com/send?text=${textoCodificado}`;

    window.open(url, "_blank");
  }

  function toggleEtiqueta(id) {
    setEtiquetasSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function marcarTodasEtiquetas() {
    const idsVisiveis = pecasFiltradas.map((p, index) =>
      String(p?.id || `sem-codigo-${index}`)
    );
    setEtiquetasSelecionadas(idsVisiveis);
  }

  function desmarcarTodasEtiquetas() {
    setEtiquetasSelecionadas([]);
  }

  function imprimirEtiquetasSelecionadas() {
    const selecionadas = pecasFiltradas
      .map((p, index) => {
        const codigo = String(p?.id || `sem-codigo-${index}`);
        return {
          ...p,
          id: codigo,
          nome: p?.nome || "Sem nome",
          venda: p?.venda ? p.venda : formatarBRL(0),
          obs: p?.obs || "-",
        };
      })
      .filter((p) => etiquetasSelecionadas.includes(p.id));

    if (!selecionadas.length) {
      alert("Selecione pelo menos uma etiqueta.");
      return;
    }

    abrirPreview(PREVIEW_TIPO.ETIQUETAS, selecionadas);
  }

  function toggleExpandirCliente(nomeCliente) {
    setClientesExpandidos((prev) => ({
      ...prev,
      [nomeCliente]: !prev[nomeCliente],
    }));
  }

  function toggleExpandirSacolinha(id) {
    setSacolinhasExpandidas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function toggleExpandirPedidoEnvio(id) {
    setPedidosEnvioExpandidos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function toggleItemConferidoPedido(pedidoId, itemId) {
    setItensConferidosPedido((prev) => {
      const atuais = prev[pedidoId] || [];

      if (atuais.includes(itemId)) {
        return {
          ...prev,
          [pedidoId]: atuais.filter((id) => id !== itemId),
        };
      }

      return {
        ...prev,
        [pedidoId]: [...atuais, itemId],
      };
    });
  }

  const mapaPecasPorId = useMemo(() => {
    if (!Array.isArray(pecas)) return {};

    return Object.fromEntries(
      pecas.map((p) => [String(p.id), p])
    );
  }, [pecas]);

  const mapaLivesPorId = useMemo(() => {
    if (!Array.isArray(listaLives)) return {};

    return Object.fromEntries(
      listaLives.map((live) => [String(live.id), live])
    );
  }, [listaLives]);

  const {
    pecaIdsEnviados,
    sacolinhasAgrupadas,
    sacolinhasAbertas,
    sacolinhasSeparadas,
    sacolinhasEnviadas,
    mapaSacolinhasPorId,
    pedidosEnvioAgrupados,
    pedidosEnvioEmMontagem,
    pedidosEnvioConcluidos,
  } = useExpedicaoMemo({
    todasVendasLive,
    sacolinhasLive,
    pedidoEnvioSacolinhas,
    pedidosEnvio,
  });

  const {
    resumoClientes,
    resumoClientesLive,
    clientesFiltrados,
    clientesFiltradosCadastro,
    pecasVendidasFiltradas,
    livesFiltradas,
    resumoFaturamentoPorLive,
    totalPecas,
    totalVendidas,
    totalDisponiveis,
    faturamento,
    lucroEstimado,
    totalPecasLive,
    faturamentoLive,
    lucroEstimadoLive,
    faturamentoFiltrado,
    lucroFiltrado,
    quantidadeVendidaFiltrada,
    ticketMedioFiltrado,
  } = useFinanceiroMemo({
    pecas,
    pagamentosClientes,
    vendasLive,
    clientes,
    buscaCliente,
    filtroPagamentoCliente,
    buscaClienteCadastro,
    dataInicialFiltro,
    dataFinalFiltro,
    listaLives,
    todasVendasLive,
    mapaPecasPorId,
    limparMoeda,
    formatarCPF,
    formatarTelefone,
    converterDataPtBrParaIso,
  });
  const pecasFiltradas = useMemo(() => {
    const termo = buscaPeca.trim().toLowerCase();

    return pecas
      .filter((p) => {
        const nome = String(p?.nome || "").toLowerCase();
        const codigo = String(p?.id || "").toLowerCase();
        const clienteNome = String(p?.cliente || "").toLowerCase();

        const bateBusca =
          !termo ||
          nome.includes(termo) ||
          codigo.includes(termo) ||
          clienteNome.includes(termo);

        if (pecaIdsEnviados.includes(String(p?.id))) return false;
        if (!bateBusca) return false;

        if (filtroEstoque === "todas") return true;
        if (filtroEstoque === "disponiveis") return !p?.vendido;
        if (filtroEstoque === "vendidas") return !!p?.vendido;

        return true;
      })
      .sort((a, b) => {
        function toTimestamp(dataStr) {
          if (!dataStr) return 0;

          const texto = String(dataStr).trim();

          const match = texto.match(
            /^(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})(?::(\d{2}))?$/
          );

          if (!match) return 0;

          const [, dia, mes, ano, hora, minuto, segundo = "00"] = match;

          return new Date(
            Number(ano),
            Number(mes) - 1,
            Number(dia),
            Number(hora),
            Number(minuto),
            Number(segundo)
          ).getTime();
        }

        const dataA = toTimestamp(a?.data_cadastro);
        const dataB = toTimestamp(b?.data_cadastro);

        return dataB - dataA;
      });
  }, [pecas, buscaPeca, filtroEstoque, pecaIdsEnviados]);

  return (
    <>
      <style>
        {`
    html, body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
    }

    * {
      box-sizing: border-box;
    }

    img {
      max-width: 100%;
      height: auto;
    }

    .layout-app,
    .sidebar-app,
    .painel-principal,
    .grid-cadastro,
    .grid-vendas,
    .grid-clientes,
    .linha-resumo,
    .menu-lista,
    .area-principal {
      min-width: 0;
    }

    @media (max-width: 767px) {
      .layout-app {
        grid-template-columns: 1fr !important;
        padding: 8px !important;
        gap: 8px !important;
      }

      .sidebar-app {
        width: 100% !important;
        border-radius: 18px !important;
        padding: 14px !important;
      }

      .painel-principal {
        min-height: auto !important;
        padding: 14px !important;
        border-radius: 18px !important;
      }

      .area-principal {
        width: 100% !important;
      }

      .grid-cadastro,
      .grid-vendas,
      .grid-clientes,
      .linha-resumo {
        grid-template-columns: 1fr !important;
      }

      .menu-lista {
        display: grid !important;
        gap: 8px !important;
      }

      .topo-mobile {
        display: flex !important;
        position: sticky !important;
        top: 8px !important;
      }

      .topo-mobile strong {
        font-size: 18px !important;
      }

      button {
        font-size: 14px;
      }

      .painel-principal button,
      .grid-cadastro button,
      .grid-vendas button,
      .grid-clientes button,
      .linha-resumo button {
        width: 100%;
      }

      input {
        width: 100% !important;
      }

      * {
        min-width: 0;
      }
    }

    /* PREVIEW EM TELA */
    .paginas-etiquetas-preview {
      display: grid;
      gap: 12px;
      justify-content: center;
    }

    .pagina-etiquetas {
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 4mm 4mm 4mm;
      box-sizing: border-box;
      background: #fff;
      display: grid;
      grid-template-columns: repeat(5, 37mm);
      grid-template-rows: repeat(5, 46mm);
      column-gap: 2mm;
      row-gap: 2mm;
      justify-content: start;
      align-content: start;
    }

    @media print {
  html,
  body {
    width: 210mm !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    overflow: visible !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .topo-mobile,
  .sidebar-app,
  .no-print {
    display: none !important;
  }

  .layout-app {
    display: block !important;
    grid-template-columns: 1fr !important;
    padding: 0 !important;
    gap: 0 !important;
    background: #fff !important;
    min-height: auto !important;
  }

  .area-principal {
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .painel-principal {
    display: block !important;
    min-height: auto !important;
    padding: 0 !important;
    margin: 0 !important;
    background: #fff !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
  }

  .painel-principal > *:not(.overlay-preview-impressao) {
    display: none !important;
  }

  .overlay-preview-impressao,
  .modal-preview-impressao,
  #area-preview-impressao,
  .paginas-etiquetas-preview {
    display: block !important;
    position: static !important;
    width: auto !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    overflow: visible !important;
    page-break-before: auto !important;
    page-break-after: auto !important;
    break-before: auto !important;
    break-after: auto !important;
  }

  .pagina-etiquetas {
    width: 210mm !important;
    min-height: 297mm !important;
    height: auto !important;
    margin: 0 !important;
    padding: 14mm 4mm 4mm 4mm !important;
    box-sizing: border-box !important;
    background: #fff !important;
    display: grid !important;
    grid-template-columns: repeat(5, 37mm) !important;
    grid-template-rows: repeat(5, 46mm) !important;
    column-gap: 2mm !important;
    row-gap: 2mm !important;
    justify-content: start !important;
    align-content: start !important;
    page-break-before: auto !important;
    page-break-after: auto !important;
    break-before: auto !important;
    break-after: auto !important;
  }

  .pagina-etiquetas:not(:last-child) {
    page-break-after: always !important;
    break-after: page !important;
  }

  .etiqueta {
    display: grid !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  canvas {
    display: block !important;
  }

  @page {
    size: A4 portrait;
    margin: 0;
  }
}
  `}
      </style>

      {isMobile && (
        <div
          className="topo-mobile"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1000,
            marginBottom: 8,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(8px)",
            borderRadius: 18,
            padding: "12px 14px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
          }}
        >
          <div
            style={{
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: 18,
                color: "#8f2745",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {abaAtiva === "cadastro" && "Cadastro"}
              {abaAtiva === "pecas" && "Estoque"}
              {abaAtiva === "vendas" && "Vendas"}
              {abaAtiva === "lives" && "Lives"}
              {abaAtiva === "clientes" && "Clientes"}
              {abaAtiva === "faturamento" && "Faturamento"}
              {abaAtiva === "expedicao" && "Expedição"}
            </strong>
          </div>

          <button
            onClick={() => setMenuMobileAberto((prev) => !prev)}
            style={{
              background: "#8f2745",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 14px",
              fontWeight: "bold",
              cursor: "pointer",
              width: "auto",
              minWidth: 96,
              flexShrink: 0,
            }}
          >
            {menuMobileAberto ? "Fechar" : "Menu"}
          </button>
        </div>
      )}

      <div className="layout-app" style={layoutApp}>
        <aside
          className="sidebar-app"
          style={{
            ...sidebar,
            display: isMobile ? (menuMobileAberto ? "flex" : "none") : "flex",
          }}
        >
          <div style={sidebarTopo}>
            <div style={logoWrap}>
              <img src={logoKchic} alt="K.chic" style={logoImagem} />
            </div>

            <div style={marcaBadge}>Painel de gestão</div>
            <p style={sidebarSubtitulo}>
              Estoque, vendas, clientes e lives em um só lugar.
            </p>
          </div>

          <div className="menu-lista" style={menuLista}>
            <button
              style={abaAtiva === "cadastro" ? menuBotaoAtivo : menuBotao}
              onClick={() => {
                setAbaAtiva("cadastro");
                if (isMobile) {
                  setMenuMobileAberto(false);
                }
              }}
            >
              Cadastro
            </button>

            <button
              style={abaAtiva === "pecas" ? menuBotaoAtivo : menuBotao}
              onClick={() => {
                setAbaAtiva("pecas");
                if (isMobile) {
                  setMenuMobileAberto(false);
                }
              }}
            >
              Estoque
            </button>

            <button
              style={abaAtiva === "vendas" ? menuBotaoAtivo : menuBotao}
              onClick={() => {
                setAbaAtiva("vendas");
                if (isMobile) {
                  setMenuMobileAberto(false);
                }
              }}
            >
              Vendas
            </button>

            <button
              style={abaAtiva === "lives" ? menuBotaoAtivo : menuBotao}
              onClick={() => {
                setAbaAtiva("lives");
                if (isMobile) {
                  setMenuMobileAberto(false);
                }
              }}
            >
              Lives
            </button>

            <button
              style={abaAtiva === "clientes" ? menuBotaoAtivo : menuBotao}
              onClick={() => {
                setAbaAtiva("clientes");
                if (isMobile) {
                  setMenuMobileAberto(false);
                }
              }}
            >
              Clientes
            </button>

            <button
              style={abaAtiva === "faturamento" ? menuBotaoAtivo : menuBotao}
              onClick={() => {
                setAbaAtiva("faturamento");
                if (isMobile) {
                  setMenuMobileAberto(false);
                }
              }}
            >
              Faturamento
            </button>

            <button
              style={abaAtiva === "expedicao" ? menuBotaoAtivo : menuBotao}
              onClick={() => {
                setAbaAtiva("expedicao");
                if (isMobile) {
                  setMenuMobileAberto(false);
                }
              }}
            >
              Expedição
            </button>
          </div>

          <div style={sidebarRodape}>
            {carregando ? "Carregando dados..." : "Dados sincronizados com Supabase"}
          </div>
        </aside>

        <main className="area-principal" style={areaPrincipal}>
          <div className="painel-principal" style={painelPrincipal}>
            <div style={topoPainel}>
              <div>
                <h2 style={topoPainelTitulo}>
                  {abaAtiva === "cadastro" && "Cadastro de Peças"}
                  {abaAtiva === "pecas" && "Estoque"}
                  {abaAtiva === "vendas" && "Registro de Vendas"}
                  {abaAtiva === "lives" && "Controle de Lives"}
                  {abaAtiva === "clientes" && "Cadastro de Clientes"}
                  {abaAtiva === "faturamento" && "Faturamento"}
                  {abaAtiva === "expedicao" && "Expedição"}
                </h2>

                <p style={topoPainelTexto}>
                  {carregando
                    ? "Atualizando informações do sistema..."
                    : "Painel operacional do brechó"}
                </p>
              </div>
            </div>

            {abaAtiva === "cadastro" && (
              <div style={boxGrande}>
                <h2 style={tituloSecao}>Cadastro de Peças</h2>

                <div className="grid-cadastro" style={gridCadastro}>
                  <div style={gridForm}>
                    <input
                      style={input}
                      placeholder="Nome da peça"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    />

                    <input
                      style={input}
                      placeholder="Valor de compra"
                      value={form.custo}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          custo: formatarMoeda(e.target.value),
                        })
                      }
                    />

                    <input
                      style={input}
                      placeholder="Valor de venda"
                      value={form.venda}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          venda: formatarMoeda(e.target.value),
                        })
                      }
                    />

                    <input
                      style={input}
                      placeholder="Observações"
                      value={form.obs}
                      onChange={(e) => setForm({ ...form, obs: e.target.value })}
                    />

                    <div>
                      <label style={{ display: "block", marginBottom: 8 }}>
                        Foto da peça
                      </label>
                      <input type="file" accept="image/*" onChange={handleFoto} />
                    </div>

                    <button style={botao} onClick={adicionarPeca}>
                      Adicionar peça
                    </button>
                  </div>

                  <div style={previewBox}>
                    <h3 style={{ marginTop: 0 }}>Pré-visualização</h3>
                    {form.foto ? (
                      <img
                        src={form.foto}
                        alt="Prévia"
                        style={{
                          width: "100%",
                          maxWidth: 280,
                          height: 280,
                          objectFit: "cover",
                          borderRadius: 12,
                          border: "1px solid #ddd",
                        }}
                      />
                    ) : (
                      <div style={semFoto}>Sem foto selecionada</div>
                    )}

                    <div style={{ marginTop: 16 }}>
                      <p style={{ margin: "6px 0" }}>
                        <strong>Peça:</strong> {form.nome || "-"}
                      </p>
                      <p style={{ margin: "6px 0" }}>
                        <strong>Compra:</strong> {form.custo || "R$ 0,00"}
                      </p>
                      <p style={{ margin: "6px 0" }}>
                        <strong>Venda:</strong> {form.venda || "R$ 0,00"}
                      </p>
                      <p style={{ margin: "6px 0" }}>
                        <strong>Obs:</strong> {form.obs || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {abaAtiva === "pecas" && (
              <EstoqueSection
                pecasFiltradas={pecasFiltradas}
                totalPecas={totalPecas}
                totalDisponiveis={totalDisponiveis}
                totalVendidas={totalVendidas}

                buscaPeca={buscaPeca}
                setBuscaPeca={setBuscaPeca}
                filtroEstoque={filtroEstoque}
                setFiltroEstoque={setFiltroEstoque}

                etiquetasSelecionadas={etiquetasSelecionadas}
                toggleEtiqueta={toggleEtiqueta}
                marcarTodasEtiquetas={marcarTodasEtiquetas}
                desmarcarTodasEtiquetas={desmarcarTodasEtiquetas}
                imprimirEtiquetasSelecionadas={imprimirEtiquetasSelecionadas}

                abrirPreview={abrirPreview}
                PREVIEW_TIPO={PREVIEW_TIPO}
                cancelarVenda={cancelarVenda}
                removerPeca={removerPeca}

                formatarBRL={formatarBRL}

                boxGrande={boxGrande}
                cabecalhoSecao={cabecalhoSecao}
                tituloSecao={tituloSecao}
                linhaResumoHorizontal={linhaResumoHorizontal}
                cardResumo={cardResumo}
                valorResumo={valorResumo}
                linhaFiltros={linhaFiltros}
                input={input}
                botao={botao}
                botaoPequeno={botaoPequeno}
                gridPecas={gridPecas}
                cardPeca={cardPeca}
                textoItem={textoItem}
              />
            )}

            {abaAtiva === "vendas" && (
              <VendasSection
                boxGrande={boxGrande}
                tituloSecao={tituloSecao}
                cabecalhoSecao={cabecalhoSecao}
                linhaResumo={linhaResumo}
                cardResumo={cardResumo}
                valorResumo={valorResumo}
                cardCliente={cardCliente}
                itemCliente={itemCliente}
                botao={botao}
                botaoPequeno={botaoPequeno}
                input={input}
                gridVendas={gridVendas}
                gridForm={gridForm}
                previewBox={previewBox}
                semFoto={semFoto}
                isMobile={isMobile}
                scannerAtivo={scannerAtivo}
                setScannerAtivo={setScannerAtivo}
                scannerElementId={scannerElementId}
                vendaId={vendaId}
                setVendaId={setVendaId}
                cliente={cliente}
                setCliente={setCliente}
                valorDesconto={valorDesconto}
                setValorDesconto={setValorDesconto}
                formatarValorDescontoInput={formatarValorDescontoInput}
                registrarVenda={registrarVenda}
                salvandoVenda={salvandoVenda}
                liveEmVisualizacao={liveEmVisualizacao}
                buscaCliente={buscaCliente}
                setBuscaCliente={setBuscaCliente}
                filtroPagamentoCliente={filtroPagamentoCliente}
                setFiltroPagamentoCliente={setFiltroPagamentoCliente}
                totalPecasLive={totalPecasLive}
                faturamentoLive={faturamentoLive}
                lucroEstimadoLive={lucroEstimadoLive}
                clientesFiltrados={clientesFiltrados}
                clientesExpandidos={clientesExpandidos}
                toggleExpandirCliente={toggleExpandirCliente}
                exportarClienteCSV={exportarClienteCSV}
                gerarComanda={gerarComanda}
                togglePagamentoClienteLive={togglePagamentoClienteLive}
                cancelarVenda={cancelarVenda}
                formatarBRL={formatarBRL}
              />
            )}

            {abaAtiva === "clientes" && (
              <ClientesSection
                boxGrande={boxGrande}
                tituloSecao={tituloSecao}
                inputCliente={inputCliente}
                botao={botao}
                botaoPequeno={botaoPequeno}
                cardCliente={cardCliente}
                clientesFiltradosCadastro={clientesFiltradosCadastro}
                buscaClienteCadastro={buscaClienteCadastro}
                setBuscaClienteCadastro={setBuscaClienteCadastro}
                copiarLinkCadastroCliente={copiarLinkCadastroCliente}
                copiarMensagemWhatsAppCadastroCliente={copiarMensagemWhatsAppCadastroCliente}
                gerarLinkCadastroCliente={gerarLinkCadastroCliente}
                formCliente={formCliente}
                setFormCliente={setFormCliente}
                formatarCPF={formatarCPF}
                formatarTelefone={formatarTelefone}
                formatarCEP={formatarCEP}
                buscarCep={buscarCep}
                salvarCliente={salvarCliente}
                clienteEditandoId={clienteEditandoId}
                cancelarEdicaoCliente={cancelarEdicaoCliente}
                editarCliente={editarCliente}
                compartilharCliente={compartilharCliente}
                excluirCliente={excluirCliente}
              />
            )}

            {abaAtiva === "lives" && (
              <div style={boxGrande}>
                <h2 style={tituloSecao}>Controle de Lives</h2>

                {!liveAtual ? (
                  <div style={{ display: "grid", gap: 10, maxWidth: 400 }}>
                    <input
                      style={input}
                      placeholder="Nome da live (ex: Live 20/03 Noite)"
                      value={nomeNovaLive}
                      onChange={(e) => setNomeNovaLive(e.target.value)}
                    />

                    <button style={botao} onClick={iniciarLive}>
                      Iniciar Live
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 16 }}>
                    <div>
                      <strong>Live ativa: {liveAtual.nome}</strong>
                      <div>Iniciada em: {liveAtual.hora_inicio}</div>
                    </div>

                    <button
                      style={{ ...botao, background: "#b91c1c", maxWidth: 220 }}
                      onClick={encerrarLive}
                    >
                      Encerrar Live
                    </button>

                    <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                      <div className="linha-resumo" style={linhaResumo}>
                        <div style={cardResumo}>
                          <strong>Peças na live</strong>
                          <div style={valorResumo}>{vendasLive.length}</div>
                        </div>

                        <div style={cardResumo}>
                          <strong>Faturamento</strong>
                          <div style={valorResumo}>
                            {formatarBRL(
                              vendasLive.reduce(
                                (acc, v) => acc + Number(v.valor_venda || 0),
                                0
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={boxGrande}>
                        <h3 style={{ marginTop: 0 }}>
                          Clientes da live {liveEmVisualizacao ? `- ${liveEmVisualizacao.nome}` : ""}
                        </h3>

                        {resumoClientesLive.length === 0 ? (
                          <p>Nenhuma venda nessa live ainda.</p>
                        ) : (
                          <div style={{ display: "grid", gap: 10 }}>
                            {resumoClientesLive.map((c) => (
                              <div key={c.nome} style={cardCliente}>
                                <strong>{c.nome}</strong>
                                <div>{c.pecas} peça(s)</div>
                                <div>{formatarBRL(c.total)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 20 }}>
                  <h3 style={{ marginBottom: 12 }}>Histórico de Lives</h3>

                  {listaLives.length === 0 ? (
                    <p>Nenhuma live cadastrada ainda.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {listaLives.map((live) => (
                        <div
                          key={live.id}
                          style={{
                            ...cardCliente,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <strong>{live.nome}</strong>
                            <div>Data: {live.data_live || "-"}</div>
                            <div>Status: {live.status || "-"}</div>
                          </div>

                          <button
                            style={{ ...botaoPequeno, background: "#2563eb" }}
                            onClick={async () => {
                              await abrirLiveHistorica(live);
                              setAbaAtiva("vendas");
                            }}
                          >
                            Abrir
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}


            {abaAtiva === "faturamento" && (
              <div style={{ display: "grid", gap: 24 }}>
                <div style={boxGrande}>
                  <h2 style={tituloSecao}>Faturamento</h2>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "end",
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      <label>Data inicial</label>
                      <input
                        type="date"
                        style={input}
                        value={dataInicialFiltro}
                        onChange={(e) => setDataInicialFiltro(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <label>Data final</label>
                      <input
                        type="date"
                        style={input}
                        value={dataFinalFiltro}
                        onChange={(e) => setDataFinalFiltro(e.target.value)}
                      />
                    </div>

                    <button
                      style={{ ...botao, background: "#6b7280" }}
                      onClick={() => {
                        setDataInicialFiltro("");
                        setDataFinalFiltro("");
                      }}
                    >
                      Limpar filtro
                    </button>

                    <button style={botao} onClick={exportarRelatorioCSV}>
                      Exportar relatório
                    </button>
                  </div>

                  <div className="linha-resumo" style={linhaResumo}>
                    <div style={cardResumo}>
                      <strong>Faturamento</strong>
                      <div style={valorResumo}>{formatarBRL(faturamentoFiltrado)}</div>
                    </div>

                    <div style={cardResumo}>
                      <strong>Lucro estimado</strong>
                      <div style={valorResumo}>{formatarBRL(lucroFiltrado)}</div>
                    </div>

                    <div style={cardResumo}>
                      <strong>Peças vendidas</strong>
                      <div style={valorResumo}>{quantidadeVendidaFiltrada}</div>
                    </div>

                    <div style={cardResumo}>
                      <strong>Ticket médio</strong>
                      <div style={valorResumo}>{formatarBRL(ticketMedioFiltrado)}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <h3 style={{ marginBottom: 12 }}>Resumo por Live</h3>

                    {resumoFaturamentoPorLive.length === 0 ? (
                      <p>Nenhuma live encontrada no período.</p>
                    ) : (
                      <div style={{ display: "grid", gap: 10 }}>
                        {resumoFaturamentoPorLive.map((live) => (
                          <div key={live.id} style={cardCliente}>
                            <strong>{live.nome}</strong>
                            <div>Data: {live.data}</div>
                            <div>Status: {live.status}</div>
                            <div>Quantidade de vendas: {live.quantidade}</div>
                            <div>Faturamento: {formatarBRL(live.faturamento)}</div>
                            <div>Lucro: {formatarBRL(live.lucro)}</div>
                            <div>Ticket médio: {formatarBRL(live.ticketMedio)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {abaAtiva === "expedicao" && (
              <ExpedicaoSection
                boxGrande={boxGrande}
                tituloSecao={tituloSecao}
                cardCliente={cardCliente}
                itemCliente={itemCliente}
                botaoPequeno={botaoPequeno}
                sacolinhasAgrupadas={sacolinhasAgrupadas}
                sacolinhasAbertas={sacolinhasAbertas}
                sacolinhasSeparadas={sacolinhasSeparadas}
                pedidosEnvioEmMontagem={pedidosEnvioEmMontagem}
                pedidosEnvioConcluidos={pedidosEnvioConcluidos}
                carregandoPedidosEnvio={carregandoPedidosEnvio}
                mostrarAbertas={mostrarAbertas}
                setMostrarAbertas={setMostrarAbertas}
                mostrarSeparadas={mostrarSeparadas}
                setMostrarSeparadas={setMostrarSeparadas}
                mostrarPedidosEnvio={mostrarPedidosEnvio}
                setMostrarPedidosEnvio={setMostrarPedidosEnvio}
                mostrarEnviadas={mostrarEnviadas}
                setMostrarEnviadas={setMostrarEnviadas}
                sacolinhasExpandidas={sacolinhasExpandidas}
                toggleExpandirSacolinha={toggleExpandirSacolinha}
                pedidosEnvioExpandidos={pedidosEnvioExpandidos}
                toggleExpandirPedidoEnvio={toggleExpandirPedidoEnvio}
                mapaLivesPorId={mapaLivesPorId}
                mapaPecasPorId={mapaPecasPorId}
                todasVendasLive={todasVendasLive}
                getStatusSacolinha={getStatusSacolinha}
                sacolinhaPodeIrParaExpedicao={sacolinhaPodeIrParaExpedicao}
                sacolinhaEstaVencida={sacolinhaEstaVencida}
                marcarSacolinhaComoSeparada={marcarSacolinhaComoSeparada}
                marcarSacolinhaComoEnviada={marcarSacolinhaComoEnviada}
                criarPedidoDeEnvio={criarPedidoDeEnvio}
                criandoPedidoEnvioCliente={criandoPedidoEnvioCliente}
                formatarBRL={formatarBRL}
                cancelarPedidoDeEnvio={cancelarPedidoDeEnvio}
                pedidoEstaConferido={pedidoEstaConferido}
                itensConferidosPedido={itensConferidosPedido}
                marcarPedidoComoEnviado={marcarPedidoComoEnviado}
                toggleItemConferidoPedido={toggleItemConferidoPedido}
              />
            )}
          </div>
        </main>

        <PreviewModal
          previewAberto={previewAberto}
          tipoPreview={tipoPreview}
          dadosPreview={dadosPreview}
          PREVIEW_TIPO={PREVIEW_TIPO}
          botao={botao}
          botaoPequeno={botaoPequeno}
          fecharPreview={fecharPreview}
          copiarTextoComanda={copiarTextoComanda}
          abrirWhatsappComanda={abrirWhatsappComanda}
          formatarBRL={formatarBRL}
          agruparEtiquetasEmPaginas={agruparEtiquetasEmPaginas}
          EtiquetaPrint={EtiquetaPrint}
        />

        <style>
          {`
          input:focus {
            border-color: #1d8fe1;
            box-shadow: 0 0 0 3px rgba(29,143,225,0.15);
          }

          button:hover {
            transform: translateY(-2px) scale(1.01);
            opacity: 0.98;
          }

          button:active {
            transform: translateY(0);
          }

          img {
            transition: all 0.2s ease;
          }
        `}
        </style>
      </div>
    </>
  );
}

const logoWrap = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 0 10px",
};

const logoImagem = {
  width: 132,
  maxWidth: "100%",
  objectFit: "contain",
  filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.18))",
};

const marcaBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#f8d7df",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.3px",
  marginBottom: 10,
};

const inputCliente = {
  padding: "12px 14px",
  height: 48,
  borderRadius: 12,
  border: "1px solid #cfd8e3",
  fontSize: 15,
  background: "#fff",
  boxSizing: "border-box",
  width: "100%",
  outline: "none",
};

const linhaResumo = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 20,
  marginBottom: 24,
};

const boxGrande = {
  border: "1px solid rgba(233, 142, 157, 0.18)",
  borderRadius: 22,
  padding: 22,
  background: "linear-gradient(180deg, #ffffff 0%, #fff7f9 100%)",
  boxShadow: "0 10px 30px rgba(191,75,101,0.08)",
};

const tituloSecao = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: 22,
  fontWeight: 800,
  color: "#123044",
  letterSpacing: "-0.3px",
};

const cabecalhoSecao = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const gridCadastro = {
  display: "grid",
  gridTemplateColumns: "1fr 360px",
  gap: 24,
  alignItems: "start",
};

const gridVendas = {
  display: "grid",
  gridTemplateColumns: "1fr 360px",
  gap: 24,
  alignItems: "start",
};

const previewBox = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 16,
  background: "#f8fbfd",
};

const semFoto = {
  width: "100%",
  minHeight: 220,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 14,
  border: "1px dashed #cbd5e1",
  color: "#64748b",
  background: "#fff",
};

const gridForm = {
  display: "grid",
  gap: 12,
};

const input = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #cfd8e3",
  fontSize: 15,
  background: "#fff",
  outline: "none",
  transition: "all 0.2s ease",
};

const botao = {
  padding: "13px 18px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #d96b82 0%, #b83c57 100%)",
  color: "#fff",
  fontSize: 15,
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 10px 20px rgba(184,60,87,0.28)",
  transition: "all 0.2s ease",
};

const botaoPequeno = {
  padding: "7px 11px",
  borderRadius: 10,
  border: "none",
  color: "#fff",
  fontSize: 13,
  cursor: "pointer",
  fontWeight: 700,
};

const gridPecas = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 20,
};

const cardPeca = {
  border: "1px solid #dbe4ec",
  borderRadius: 18,
  padding: 16,
  background: "#fff",
  boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
  transition: "all 0.2s ease",
};

const linhaResumoHorizontal = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 20,
};

const cardResumo = {
  flex: 1,
  minWidth: 180,
  border: "1px solid rgba(191,75,101,0.18)",
  borderRadius: 20,
  padding: 18,
  background: "linear-gradient(135deg, #ffffff 0%, #fff1f4 100%)",
  boxShadow: "0 10px 22px rgba(191,75,101,0.10)",
};

const linhaAcoes = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 20,
};

const linhaFiltros = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 20,
};

const valorResumo = {
  marginTop: 10,
  fontSize: 32,
  fontWeight: 800,
  color: "#9f4156",
  letterSpacing: "-0.5px",
};

const textoItem = {
  margin: "4px 0",
  color: "#475569",
};

const cardCliente = {
  border: "1px solid #dbe4ec",
  borderRadius: 18,
  padding: 16,
  background: "#fff",
  boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
  transition: "all 0.2s ease",
};

const itemCliente = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  background: "#f8fafc",
};

const layoutApp = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "280px 1fr",
  gap: 16,
  padding: 16,
  background: "linear-gradient(180deg, #052c3b 0%, #08364a 100%)",
  boxSizing: "border-box",
};

const sidebar = {
  background: "linear-gradient(180deg, #7c2d3c 0%, #9f4156 100%)",
  borderRadius: 24,
  padding: 20,
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  boxShadow: "0 12px 30px rgba(124,45,60,0.28)",
};

const sidebarTopo = {
  paddingBottom: 16,
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  marginBottom: 8,
};

const sidebarTitulo = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: "-0.3px",
};

const sidebarSubtitulo = {
  margin: "6px 0 0 0",
  fontSize: 13,
  color: "rgba(255,255,255,0.72)",
};

const menuLista = {
  display: "grid",
  gap: 8,
};

const menuBotao = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid transparent",
  background: "transparent",
  color: "#fff",
  textAlign: "left",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

const menuBotaoAtivo = {
  ...menuBotao,
  background: "linear-gradient(135deg, #f3a6b2 0%, #e98e9d 100%)",
  color: "#5e2230",
  border: "1px solid rgba(255,255,255,0.25)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
};

const sidebarRodape = {
  marginTop: "auto",
  paddingTop: 16,
  borderTop: "1px solid rgba(255,255,255,0.12)",
  fontSize: 12,
  color: "rgba(255,255,255,0.65)",
};

const areaPrincipal = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const painelPrincipal = {
  background: "rgba(255,255,255,0.90)",
  backdropFilter: "blur(6px)",
  borderRadius: 24,
  minHeight: "calc(100vh - 32px)",
  padding: 24,
  boxShadow: "0 12px 30px rgba(149,79,96,0.14)",
  overflow: "hidden",
  width: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const topoPainel = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 24,
};

const topoPainelTitulo = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
  color: "#7c2d3c",
  letterSpacing: "-0.4px",
};

const topoPainelTexto = {
  color: "#5b6b79",
  marginTop: 6,
  marginBottom: 0,
  fontSize: 14,
};