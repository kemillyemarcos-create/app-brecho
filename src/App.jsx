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

import {
  gerarLinkCadastroCliente,
  copiarTexto,
  copiarLinkCadastroCliente,
  gerarMensagemWhatsAppCadastroCliente,
  copiarMensagemWhatsAppCadastroCliente,
} from "./utils/cadastroClienteLinks";

import {
  montarPayloadCliente,
  buscarClientePorCpf,
  cadastrarClientePublico,
  formatarCPF,
  formatarTelefone,
  formatarCEP,
  normalizarCPF,
  normalizarTelefone,
  buscarEnderecoPorCep,
} from "./utils/clientes";

import {
  inserirCliente,
  atualizarCliente,
  deletarCliente,
} from "./services/clientes";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Menu,
  X,
  Package,
  Boxes,
  ShoppingBag,
  Radio,
  Users,
  BarChart3,
  Truck,
  CreditCard,
  Sparkles,
  NotebookPen,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import SidebarERP from "./components/layout/SidebarERP";
import HeaderERP from "./components/layout/HeaderERP";
import MainLayout from "./components/layout/MainLayout";
import PreviewModal from "./components/layout/PreviewModal";
import EtiquetaPrint from "./components/print/EtiquetaPrint";
import CadastroSection from "./components/sections/CadastroSection";
import ClientesSection from "./components/sections/ClientesSection";
import CadastroPublicoCliente from "./components/CadastroPublicoCliente";
import EstoqueSection from "./components/sections/EstoqueSection";
import ExpedicaoSection from "./components/sections/ExpedicaoSection";
import PendenciasSection from "./components/sections/PendenciasSection";
import VendasSection from "./components/sections/VendasSection";
import LivesSection from "./components/sections/LivesSection";
import NotesSection from "./components/sections/NotesSection";
import FaturamentoSection from "./components/sections/FaturamentoSection";
import AssistenteVirtual from "./components/assistant/AssistenteVirtual";
import PortalCliente from "./components/portalcliente/PortalCliente";
import LoginAdmin from "./components/login/LoginAdmin";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { UserProvider, useUser } from "./contexts/UserContext";
import useExpedicaoMemo from "./hooks/useExpedicaoMemo";
import useFinanceiroMemo from "./hooks/useFinanceiroMemo";
import { lerArquivoComoDataURL } from "./utils/arquivos";
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

function gerarCodigo(prefixo = "KC", custo = "") {
  const valorCusto = limparMoeda(custo);
  const custoInteiro = Math.floor(valorCusto || 0);
  return `${prefixo}-${custoInteiro}${Date.now()}`;
}

function gerarPortalToken() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "KC";

  for (let i = 0; i < 6; i += 1) {
    token += caracteres[Math.floor(Math.random() * caracteres.length)];
  }

  return token;
}

function agruparEtiquetasEmPaginas(lista, porPagina = 25) {
  const paginas = [];

  for (let i = 0; i < lista.length; i += porPagina) {
    paginas.push(lista.slice(i, i + porPagina));
  }

  return paginas;
}

function converterDataPtBrParaIso(dataStr) {
  const data = parseDataFlex(dataStr);
  if (!data) return null;

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function agoraIso() {
  return new Date().toISOString();
}

function parseDataFlex(valor) {
  if (!valor) return null;

  if (valor instanceof Date) {
    return isNaN(valor.getTime()) ? null : valor;
  }

  const texto = String(valor).trim();

  if (!texto) return null;

  // ISO ou formato já aceito pelo JS
  const tentativaDireta = new Date(texto);
  if (!isNaN(tentativaDireta.getTime()) && (texto.includes("T") || texto.includes("-"))) {
    return tentativaDireta;
  }

  // dd/mm/yyyy ou dd/mm/yyyy, hh:mm[:ss]
  const match = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (match) {
    const [, dia, mes, ano, hora = "00", minuto = "00", segundo = "00"] = match;

    const data = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto),
      Number(segundo)
    );

    return isNaN(data.getTime()) ? null : data;
  }

  return null;
}

function formatarDataHoraBR(valor) {
  if (!valor) return "";

  // Se já vier formatado em pt-BR, mantém sem tentar converter de novo.
  if (typeof valor === "string" && valor.includes("/") && valor.includes(":")) {
    return valor;
  }

  const data = parseDataFlex(valor);
  if (!data) return "";

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatarDataBR(valor) {
  const data = parseDataFlex(valor);
  if (!data) return "";
  return data.toLocaleDateString("pt-BR");

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

function getSaudacaoDinamica() {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );

  if (hora >= 5 && hora < 12) return "bom dia";
  if (hora >= 12 && hora < 18) return "boa tarde";
  return "boa noite";
}

function formatarDataLiveCurta(valor) {
  if (!valor) return "";

  const data = parseDataFlex(valor);
  if (!data) return "";

  return data.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
}

function normalizarTelefoneWhatsApp(valor) {
  const numeros = String(valor || "").replace(/\D/g, "");

  if (!numeros) return "";
  if (numeros.startsWith("55")) return numeros;

  return `55${numeros}`;
}

function montarTextoComanda(clienteResumo) {
  const saudacao = getSaudacaoDinamica();
  const dataLiveFormatada =
    formatarDataLiveCurta(clienteResumo?.liveData || clienteResumo?.live_data) ||
    formatarDataLiveCurta(clienteResumo?.data_live) ||
    "";

  const complementoLive = dataLiveFormatada ? ` *${dataLiveFormatada}*` : "";
  const pago = !!clienteResumo?.pago;

  const itensTexto = (clienteResumo.itens || [])
    .map((item, index) => {
      const dataVendaFormatada = formatarDataHoraBR(item.dataVenda);

      return `${index + 1}. ${item.nomePeca}
💲 ${formatarBRL(item.valor)}
🏷️ Código: ${item.codigo}${dataVendaFormatada ? `\n🕒 ${dataVendaFormatada}` : ""}`;
    })
    .join("\n\n");

  if (pago) {
    return `Oie! ${saudacao}, amiga! 🌸

Segue sua comandinha da live:${complementoLive} 🛍️

🧾 *Comanda da Cliente*

👤 Cliente: ${clienteResumo.nome}

💳 Status do pagamento: *Pago*

🛍️ Total de peças: ${clienteResumo.pecas}

💰 Valor total: *${formatarBRL(clienteResumo.total)}*

━━━━━━━━━━━━━━

${itensTexto}

━━━━━━━━━━━━━━

❌ Caso queira deixar em sacolinha, é só nos avisar. 😊

🚚 Caso deseje envio, solicite o fechamento que encaminhamos os dados para pagamento do frete.

Obrigada! ☺️🌸`;
  }

  return `Oie! ${saudacao}, amiga! 🌸

Segue sua comandinha da live:${complementoLive} 🛍️

🧾 *Comanda da Cliente*

👤 Cliente: ${clienteResumo.nome}

💳 Status do pagamento: *Pendente*

🛍️ Total de peças: ${clienteResumo.pecas}

💰 Valor total: *${formatarBRL(clienteResumo.total)}*

━━━━━━━━━━━━━━

${itensTexto}

━━━━━━━━━━━━━━

PIX para pagamento:
Chave: *CELULAR* – *41988921085*

🏦 Banco: *Nubank*
👩‍💼 Nome: *Kemilly Lima*

💳 Para pagamento via cartão, solicite o link de pagamento.

❌ Caso queira deixar em sacolinha, é só nos avisar. 😊

🚚 Caso deseje envio, solicite o fechamento que encaminhamos os dados para pagamento do frete.

Obrigada! ☺️🌸`;
}

function AppContent() {
  const paramsPortal = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const portalClienteAtivo =
    paramsPortal.has("portal") || paramsPortal.get("portal") === "cliente";

  const cadastroPublicoAtivo = paramsPortal.get("cadastro") === "cliente";
  const rotaPublica = portalClienteAtivo || cadastroPublicoAtivo;

  const { session, carregando: carregandoAuth, sair: sairDoApp } = useAuth();
  const {
    usuarioSistema,
    carregando: carregandoUsuario,
    acessoLiberado,
    motivoBloqueio,
    isAdmin,
  } = useUser();
  const podeAcessarDadosAdministrativos =
    !rotaPublica &&
    !carregandoAuth &&
    !!session &&
    !carregandoUsuario &&
    acessoLiberado;

  const [abaAtiva, setAbaAtiva] = useState("cadastro");
  const [carregando, setCarregando] = useState(true);

  const [pecas, setPecas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [listaLives, setListaLives] = useState([]);
  const [vendasLive, setVendasLive] = useState([]);
  const [todasVendasLive, setTodasVendasLive] = useState([]);
  const [pagamentosClientes, setPagamentosClientes] = useState({});

  const [form, setForm] = useState(FORM_INICIAL_PECA);
  const [pecaEditando, setPecaEditando] = useState(null);
  const [formEdicaoPeca, setFormEdicaoPeca] = useState(FORM_INICIAL_PECA);
  const [salvandoEdicaoPeca, setSalvandoEdicaoPeca] = useState(false);
  const [formCliente, setFormCliente] = useState(FORM_INICIAL_CLIENTE);
  const [buscaClienteCadastro, setBuscaClienteCadastro] = useState("");
  const [salvandoCadastroPublico, setSalvandoCadastroPublico] = useState(false);
  const [cadastroPublicoConcluido, setCadastroPublicoConcluido] = useState(false);

  const [clienteEditandoId, setClienteEditandoId] = useState(null);
  const [liveAtual, setLiveAtual] = useState(null);
  const [liveSelecionada, setLiveSelecionada] = useState(null);
  const [nomeNovaLive, setNomeNovaLive] = useState("");
  const [abaInternaLive, setAbaInternaLive] = useState("ativa");
  const [clientesLiveExpandido, setClientesLiveExpandido] = useState(false);

  const [vendaId, setVendaId] = useState("");
  const [filaEspera, setFilaEspera] = useState("");
  const [mostrarSugestoesVenda, setMostrarSugestoesVenda] = useState(false);
  const [cliente, setCliente] = useState("");
  const [clienteId, setClienteId] = useState(null);
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
  const [mostrarBotaoTopo, setMostrarBotaoTopo] = useState(false);

  const scannerRef = useRef(null);
  const scannerElementId = "reader";

  const liveEmVisualizacao = liveSelecionada || liveAtual;

  const obterOuCriarSacolinha = async (
    clienteNome,
    liveId,
    clienteId = null
  ) => {
    try {
      const nomeNormalizado = String(clienteNome || "").trim().toLowerCase();
      const liveIdNormalizado = String(liveId || "");

      // 1. Caminho rápido:
      // procura primeiro nas sacolinhas que já estão carregadas no navegador.
      const sacolinhasAbertasDaLive = (sacolinhasLive || []).filter(
        (item) =>
          String(item?.live_id || "") === liveIdNormalizado &&
          item?.status === "aberta"
      );

      let existente = null;

      if (clienteId) {
        // Cliente cadastrada: identidade oficial sempre tem prioridade.
        existente =
          sacolinhasAbertasDaLive.find(
            (item) => String(item?.cliente_id || "") === String(clienteId)
          ) || null;

        if (existente) {
          await garantirPortalTokenSacolinha(existente);
          return existente.id;
        }

        // Compatibilidade com sacolinha antiga:
        // somente nome EXATO e sem cliente_id.
        const legada =
          sacolinhasAbertasDaLive.find(
            (item) =>
              !item?.cliente_id &&
              String(item?.cliente_nome || "").trim().toLowerCase() ===
                nomeNormalizado
          ) || null;

        if (legada) {
          const { error: erroVinculo } = await supabase
            .from("sacolinhas_live")
            .update({
              cliente_id: clienteId,
              cliente_nome: clienteNome,
            })
            .eq("id", legada.id);

          if (erroVinculo) throw erroVinculo;

          const legadaVinculada = {
            ...legada,
            cliente_id: clienteId,
            cliente_nome: clienteNome,
          };

          setSacolinhasLive((prev) =>
            (prev || []).map((item) =>
              String(item?.id) === String(legada.id)
                ? { ...item, ...legadaVinculada }
                : item
            )
          );

          await garantirPortalTokenSacolinha(legadaVinculada);
          return legada.id;
        }
      } else {
        // Cliente não cadastrada:
        // reutiliza somente sacolinha sem cliente_id e com nome exato.
        existente =
          sacolinhasAbertasDaLive.find(
            (item) =>
              !item?.cliente_id &&
              String(item?.cliente_nome || "").trim().toLowerCase() ===
                nomeNormalizado
          ) || null;

        if (existente) {
          await garantirPortalTokenSacolinha(existente);
          return existente.id;
        }
      }

      // 2. Não estava no estado local.
      // Confirma no banco antes de criar para manter segurança entre aparelhos.
      if (clienteId) {
        const { data, error } = await supabase
          .from("sacolinhas_live")
          .select("*")
          .eq("live_id", liveId)
          .eq("status", "aberta")
          .eq("cliente_id", clienteId)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        existente = data;

        if (!existente) {
          const { data: legada, error: erroLegada } = await supabase
            .from("sacolinhas_live")
            .select("*")
            .eq("live_id", liveId)
            .eq("status", "aberta")
            .eq("cliente_nome", clienteNome)
            .is("cliente_id", null)
            .order("criado_em", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (erroLegada) throw erroLegada;

          if (legada) {
            const { error: erroVinculo } = await supabase
              .from("sacolinhas_live")
              .update({
                cliente_id: clienteId,
                cliente_nome: clienteNome,
              })
              .eq("id", legada.id);

            if (erroVinculo) throw erroVinculo;

            existente = {
              ...legada,
              cliente_id: clienteId,
              cliente_nome: clienteNome,
            };
          }
        }
      } else {
        const { data, error } = await supabase
          .from("sacolinhas_live")
          .select("*")
          .eq("live_id", liveId)
          .eq("status", "aberta")
          .eq("cliente_nome", clienteNome)
          .is("cliente_id", null)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        existente = data;
      }

      if (existente) {
        await garantirPortalTokenSacolinha(existente);
        return existente.id;
      }

      // 3. Nenhuma sacolinha encontrada:
      // cria uma nova.
      const novaId = `SAC-${Date.now()}`;
      const criadoEm = agoraIso();
      const portalToken = gerarPortalToken();

      const novaSacolinha = {
        id: novaId,
        cliente_id: clienteId || null,
        cliente_nome: clienteNome,
        live_id: liveId,
        status: "aberta",
        criado_em: criadoEm,
        portal_token: portalToken,
      };

      const { error: erroCriar } = await supabase
        .from("sacolinhas_live")
        .insert([novaSacolinha]);

      if (erroCriar) throw erroCriar;

      setSacolinhasLive((prev) => {
        const lista = prev || [];

        if (
          lista.some(
            (item) => String(item?.id) === String(novaSacolinha.id)
          )
        ) {
          return lista;
        }

        return [novaSacolinha, ...lista];
      });

      return novaId;
    } catch (err) {
      console.error("Erro ao obter/criar sacolinha:", err);
      alert("Erro ao criar sacolinha");
      return null;
    }
  };

  async function garantirPortalTokenSacolinha(sacolinha) {
    if (!sacolinha?.id) return "";

    if (sacolinha.portal_token) {
      return sacolinha.portal_token;
    }

    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      const novoToken = gerarPortalToken();

      const { data, error } = await supabase
        .from("sacolinhas_live")
        .update({ portal_token: novoToken })
        .eq("id", sacolinha.id)
        .select("portal_token")
        .maybeSingle();

      if (!error && data?.portal_token) {
        return data.portal_token;
      }

      console.error("Erro ao gerar token do portal:", error);
    }

    return "";
  }

  function gerarUrlPortalCliente(portalToken) {
    const origem = typeof window !== "undefined" ? window.location.origin : "";
    return `${origem}/?portal=cliente&t=${encodeURIComponent(portalToken)}`;
  }

  function montarMensagemPortalCliente({ clienteNome, liveNome, portalToken }) {
    const link = gerarUrlPortalCliente(portalToken);

    return `🤎 Oie!

Sua sacolinha da K.Chic já está disponível para consulta.

📺 Live: ${liveNome || "-"}

Acompanhe suas peças por aqui:
${link}

⚠️ Essa é uma prévia da sua sacolinha. Os itens e valores passam por conferência antes do fechamento final.

Qualquer dúvida, é só nos chamar! 💕`;
  }

  async function copiarMensagemPortalCliente(clienteResumo) {
    if (!clienteResumo?.nome) {
      alert("Cliente não encontrada para gerar o link do portal.");
      return;
    }

    if (!liveEmVisualizacao?.id) {
      alert("Nenhuma live selecionada para gerar o link do portal.");
      return;
    }

    try {
      const nomeCliente = String(clienteResumo.nome || "").trim();

      let sacolinha = (sacolinhasLive || []).find(
        (item) =>
          String(item?.cliente_nome || "").trim().toLowerCase() ===
          nomeCliente.toLowerCase() &&
          String(item?.live_id || "") === String(liveEmVisualizacao.id)
      );

      if (!sacolinha) {
        const { data, error } = await supabase
          .from("sacolinhas_live")
          .select("*")
          .eq("cliente_nome", nomeCliente)
          .eq("live_id", liveEmVisualizacao.id)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        sacolinha = data;
      }

      if (!sacolinha) {
        alert("Não encontrei a sacolinha dessa cliente nesta live.");
        return;
      }

      const portalToken = await garantirPortalTokenSacolinha(sacolinha);

      if (!portalToken) {
        alert("Não foi possível gerar o token do portal desta sacolinha.");
        return;
      }

      const texto = montarMensagemPortalCliente({
        clienteNome: nomeCliente,
        liveNome: liveEmVisualizacao.nome,
        portalToken,
      });

      await navigator.clipboard.writeText(texto);
      await carregarSacolinhasLive();

      alert("Mensagem do portal copiada com sucesso.");
    } catch (error) {
      console.error("ERRO AO COPIAR MENSAGEM DO PORTAL:", error);
      alert("Não foi possível copiar a mensagem do portal.");
    }
  }

  async function carregarPagamentosClientes() {
    const { data, error } = await supabase.from("clientes_pagamento").select("*");

    if (error) {
      console.error("ERRO AO CARREGAR PAGAMENTOS DOS CLIENTES:", error);
      throw new Error(`Erro ao carregar pagamentos dos clientes: ${error.message}`);
    }

    const mapa = {};
    (data || []).forEach((item) => {
      mapa[item.cliente] = !!item.pago;
    });

    setPagamentosClientes(mapa);
  }

  async function carregarPecas() {
    let todas = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("pecas")
        .select("*")
        .order("data_cadastro", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("ERRO AO CARREGAR PEÇAS:", error);
        throw new Error(`Erro ao carregar peças: ${error.message}`);
      }

      if (!data || data.length === 0) break;

      todas = [...todas, ...data];

      if (data.length < pageSize) break;

      from += pageSize;
    }

    setPecas(todas);
  }

  async function carregarClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("ERRO AO CARREGAR CLIENTES:", error);
      throw new Error(`Erro ao carregar clientes: ${error.message}`);
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
      throw new Error(`Erro ao carregar lives: ${error.message}`);
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

      setLiveSelecionada((prev) => {
        if (prev?.id) return prev;
        return data;
      });

      return;
    }

    setLiveAtual(null);

    setLiveSelecionada((prev) => {
      if (prev?.id) return prev;
      return null;
    });

    setVendasLive((prev) => prev || []);
  }

  async function carregarTodasVendasLive() {
    const pageSize = 1000;
    let from = 0;
    let todas = [];
    let continuar = true;

    while (continuar) {
      const { data, error } = await supabase
        .from("vendas_live")
        .select("*")
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("ERRO AO CARREGAR TODAS AS VENDAS:", error);
        throw new Error(`Erro ao carregar vendas da live: ${error.message}`);
      }

      if (data && data.length > 0) {
        todas = [...todas, ...data];
        from += pageSize;
      }

      if (!data || data.length < pageSize) {
        continuar = false;
      }
    }

    console.log("TOTAL vendas carregadas:", todas.length);

    setTodasVendasLive(todas);
  }

  async function carregarVendasLive(live = liveAtual) {
    if (!live?.id) {
      setVendasLive([]);
      return;
    }

    const pageSize = 1000;
    let from = 0;
    let todas = [];
    let continuar = true;

    while (continuar) {
      const { data, error } = await supabase
        .from("vendas_live")
        .select("*")
        .eq("live_id", live.id)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("ERRO AO CARREGAR vendas_live:", error);
        return;
      }

      if (data && data.length > 0) {
        todas = [...todas, ...data];
        from += pageSize;
      }

      if (!data || data.length < pageSize) {
        continuar = false;
      }
    }

    console.log("TOTAL vendas da live carregadas:", todas.length);

    setVendasLive(todas);
  }

  async function abrirLiveHistorica(live) {
    setLiveSelecionada(live);
    await carregarVendasLive(live);
  }

  async function carregarTudoInicial() {
    try {
      setCarregando(true);

      await Promise.all([
        carregarPecas(),
        carregarClientes(),
        carregarLives(),
        carregarPagamentosClientes(),
        carregarTodasVendasLive(),
        carregarSacolinhasLive(),
        carregarPedidosEnvio(),
        carregarPedidoEnvioSacolinhas(),
      ]);

      await carregarLiveAberta();
    } catch (error) {
      console.error("ERRO NO CARREGAMENTO INICIAL:", error);
      alert(error.message || "Erro ao carregar dados iniciais.");
    } finally {
      setCarregando(false);
    }
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
    if (rotaPublica) {
      setCarregando(false);
      return;
    }

    if (!podeAcessarDadosAdministrativos) {
      setCarregando(false);
      return;
    }

    carregarTudoInicial();
  }, [rotaPublica, podeAcessarDadosAdministrativos]);

  useEffect(() => {
    if (!podeAcessarDadosAdministrativos) return undefined;

    let ativo = true;

    async function sincronizarLiveAtual() {
      if (liveAtual) {
        await carregarVendasLive(liveAtual);
        if (!ativo) return;

        await carregarTodasVendasLive();
        if (!ativo) return;

        setLiveSelecionada(liveAtual);
        return;
      }

      setVendasLive([]);
      await carregarTodasVendasLive();
    }

    sincronizarLiveAtual();

    return () => {
      ativo = false;
    };
  }, [liveAtual, podeAcessarDadosAdministrativos]);


  useEffect(() => {
    if (!podeAcessarDadosAdministrativos) return undefined;

    const channelPecas = supabase
      .channel("pecas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pecas" },
        (payload) => {
          const evento = payload?.eventType;
          const novaPeca = payload?.new;
          const pecaAntiga = payload?.old;
          const id = String(novaPeca?.id || pecaAntiga?.id || "");

          if (!id) return;

          setPecas((prev) => {
            const lista = prev || [];

            if (evento === "DELETE") {
              return lista.filter(
                (item) => String(item?.id) !== id
              );
            }

            const indice = lista.findIndex(
              (item) => String(item?.id) === id
            );

            if (indice === -1) {
              return [novaPeca, ...lista];
            }

            return lista.map((item, index) =>
              index === indice ? { ...item, ...novaPeca } : item
            );
          });
        }
      )
      .subscribe();

    const channelPagamentos = supabase
      .channel("clientes-pagamento-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes_pagamento" },
        carregarPagamentosClientes
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

    const channelSacolinhas = supabase
      .channel("sacolinhas-live-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sacolinhas_live" },
        (payload) => {
          const evento = payload?.eventType;
          const novaSacolinha = payload?.new;
          const sacolinhaAntiga = payload?.old;
          const id = String(
            novaSacolinha?.id || sacolinhaAntiga?.id || ""
          );

          if (!id) return;

          setSacolinhasLive((prev) => {
            const lista = prev || [];

            if (evento === "DELETE") {
              return lista.filter(
                (item) => String(item?.id) !== id
              );
            }

            const indice = lista.findIndex(
              (item) => String(item?.id) === id
            );

            if (indice === -1) {
              return [novaSacolinha, ...lista];
            }

            return lista.map((item, index) =>
              index === indice
                ? { ...item, ...novaSacolinha }
                : item
            );
          });
        }
      )
      .subscribe();

    const channelPedidosEnvio = supabase
      .channel("pedidos-envio-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos_envio" },
        carregarPedidosEnvio
      )
      .subscribe();

    const channelPedidoEnvioSacolinhas = supabase
      .channel("pedido-envio-sacolinhas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_envio_sacolinhas" },
        carregarPedidoEnvioSacolinhas
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelPecas);
      supabase.removeChannel(channelPagamentos);
      supabase.removeChannel(channelLives);
      supabase.removeChannel(channelSacolinhas);
      supabase.removeChannel(channelPedidosEnvio);
      supabase.removeChannel(channelPedidoEnvioSacolinhas);
    };
  }, [podeAcessarDadosAdministrativos]);

  useEffect(() => {
    if (!podeAcessarDadosAdministrativos || !liveEmVisualizacao?.id) {
      return undefined;
    }

    const channelVendasLive = supabase
      .channel("vendas-live-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas_live" },
        (payload) => {
          const evento = payload?.eventType;
          const novaVenda = payload?.new;
          const vendaAntiga = payload?.old;
          const id = String(
            novaVenda?.id || vendaAntiga?.id || ""
          );

          if (!id) return;

          const atualizarLista = (listaAtual) => {
            const lista = listaAtual || [];

            if (evento === "DELETE") {
              return lista.filter(
                (item) => String(item?.id) !== id
              );
            }

            const indice = lista.findIndex(
              (item) => String(item?.id) === id
            );

            if (indice === -1) {
              return [...lista, novaVenda];
            }

            return lista.map((item, index) =>
              index === indice
                ? { ...item, ...novaVenda }
                : item
            );
          };

          setTodasVendasLive(atualizarLista);

          setVendasLive((prev) => {
            const liveVisualizadaId = String(
              liveEmVisualizacao?.id || ""
            );

            const liveNova = String(novaVenda?.live_id || "");
            const liveAntiga = String(vendaAntiga?.live_id || "");

            if (
              liveVisualizadaId !== liveNova &&
              liveVisualizadaId !== liveAntiga
            ) {
              return prev || [];
            }

            if (
              evento !== "DELETE" &&
              liveNova !== liveVisualizadaId
            ) {
              return (prev || []).filter(
                (item) => String(item?.id) !== id
              );
            }

            return atualizarLista(prev);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelVendasLive);
    };
  }, [liveEmVisualizacao?.id, podeAcessarDadosAdministrativos]);


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

  useEffect(() => {
    function handleScroll() {
      setMostrarBotaoTopo(window.scrollY > 300);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function voltarAoTopo() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function trocarAba(novaAba) {
    setAbaAtiva(novaAba);

    if (isMobile) {
      setMenuMobileAberto(false);
    }

    setTimeout(() => {
      voltarAoTopo();
    }, 0);
  }

  function modoCadastroPublicoAtivo() {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("cadastro") === "cliente";
  }

  async function salvarCliente() {
    if (!formCliente.nome.trim()) {
      alert("Preencha pelo menos o nome.");
      return;
    }

    try {
      const payload = montarPayloadCliente(formCliente);
      const clienteExistente = await buscarClientePorCpf(payload.cpf, clienteEditandoId);

      if (clienteExistente) {
        alert(`Já existe cliente cadastrada com este CPF: ${clienteExistente.nome}`);
        return;
      }

      if (clienteEditandoId) {
        await atualizarCliente(clienteEditandoId, payload);
        alert("Cliente atualizado com sucesso.");
      } else {
        await inserirCliente({
          id: gerarCodigo("CLI"),
          ...payload,
          criado_em: agoraIso(),
        });
        alert("Cliente salvo com sucesso.");
      }

      resetFormularioCliente();
      await carregarClientes();
    } catch (error) {
      console.error("ERRO AO SALVAR CLIENTE:", error);
      alert(error.message || "Erro ao salvar cliente.");
    }
  }

  async function salvarCadastroClientePublico() {
    try {
      setSalvandoCadastroPublico(true);

      const payload = montarPayloadCliente(formCliente, { exigirCpf: true });
      const resultado = await cadastrarClientePublico(payload);

      if (!resultado?.ok && resultado?.code === "CPF_JA_CADASTRADO") {
        alert(
          resultado.nome
            ? `Já existe cadastro com este CPF: ${resultado.nome}`
            : "Já existe cadastro com este CPF."
        );
        return;
      }

      setFormCliente(FORM_INICIAL_CLIENTE);
      setCadastroPublicoConcluido(true);
    } catch (error) {
      console.error("ERRO NO CADASTRO PÚBLICO:", error);
      alert(error.message || "Erro ao validar ou salvar cadastro.");
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
    resetFormularioCliente();
  }

  function resetFormularioCliente() {
    setFormCliente(FORM_INICIAL_CLIENTE);
    setClienteEditandoId(null);
  }

  function resetFormularioVenda() {
    setMostrarSugestoesVenda(false);
    setVendaId("");
    setCliente("");
    setClienteId(null);
    setFilaEspera("");
    setValorDesconto("");
  }

  async function buscarCep(cep) {
    try {
      const resultado = await buscarEnderecoPorCep(cep);

      if (!resultado) return;

      setFormCliente((prev) => ({
        ...prev,
        endereco: resultado.endereco || prev.endereco,
      }));
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    }
  }

  async function excluirCliente(id) {
    const confirmar = window.confirm("Deseja excluir este cliente?");
    if (!confirmar) return;

    try {
      await deletarCliente(id);

      if (clienteEditandoId === id) {
        cancelarEdicaoCliente();
      }

      await carregarClientes();
      alert("Cliente excluído com sucesso.");
    } catch (error) {
      console.error("ERRO AO EXCLUIR CLIENTE:", error);
      alert(error.message || "Erro ao excluir cliente.");
    }
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

  async function handleFoto(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    try {
      const fotoBase64 = await lerArquivoComoDataURL(arquivo);

      if (!fotoBase64) return;

      setForm((prev) => ({
        ...prev,
        foto: fotoBase64,
      }));
    } catch (error) {
      console.error("Erro ao carregar foto:", error);
      alert("Não foi possível carregar a foto.");
    }
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
      data_cadastro: agoraIso(),
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

  function abrirEdicaoPeca(pecaSelecionada) {
    if (!pecaSelecionada?.id) return;

    setPecaEditando(pecaSelecionada);
    setFormEdicaoPeca({
      nome: pecaSelecionada.nome || "",
      custo: pecaSelecionada.custo || "",
      venda: pecaSelecionada.venda || "",
      obs: pecaSelecionada.obs || "",
      foto: pecaSelecionada.foto || "",
    });
  }

  function cancelarEdicaoPeca() {
    setPecaEditando(null);
    setFormEdicaoPeca(FORM_INICIAL_PECA);
    setSalvandoEdicaoPeca(false);
  }

  async function salvarEdicaoPeca() {
    if (salvandoEdicaoPeca) return;

    if (!pecaEditando?.id) {
      alert("Nenhuma peça selecionada para edição.");
      return;
    }

    if (!String(formEdicaoPeca.nome || "").trim()) {
      alert("Preencha o nome da peça.");
      return;
    }

    try {
      setSalvandoEdicaoPeca(true);

      const payload = {
        nome: String(formEdicaoPeca.nome || "").trim(),
        custo: formEdicaoPeca.custo || "",
        venda: formEdicaoPeca.venda || "",
        obs: String(formEdicaoPeca.obs || "").trim(),
        foto: formEdicaoPeca.foto || "",
      };

      const { error } = await supabase
        .from("pecas")
        .update(payload)
        .eq("id", pecaEditando.id);

      if (error) {
        console.error("ERRO AO EDITAR PEÇA:", error);
        alert(`Erro ao editar peça: ${error.message}`);
        return;
      }

      cancelarEdicaoPeca();
      await carregarPecas();
      alert("Peça atualizada com sucesso.");
    } finally {
      setSalvandoEdicaoPeca(false);
    }
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

    const codigoPeca = vendaId.trim();
    const nomeCliente = cliente.trim();

    const clientesEncontradas = (clientes || []).filter(
      (item) =>
        String(item?.nome || "").trim().toLowerCase() ===
        nomeCliente.toLowerCase()
    );

    const clienteIdResolvido =
      clienteId ||
      (clientesEncontradas.length === 1
        ? clientesEncontradas[0]?.id
        : null);

    const peca = mapaPecasPorId[String(codigoPeca)];

    if (!peca) {
      alert("Código da peça não encontrado.");
      return;
    }

    if (peca.vendido) {
      alert("Essa peça já está marcada como vendida.");
      return;
    }

    setSalvandoVenda(true);

    try {
      const sacolinhaId = await obterOuCriarSacolinha(
        nomeCliente,
        liveAtual.id,
        clienteIdResolvido
      );
      if (!sacolinhaId) return;

      const valorFinal = valorDesconto
        ? limparMoeda(valorDesconto)
        : limparMoeda(peca.venda);
      const { data: pecaAtualizada, error: errorPeca } = await supabase
        .from("pecas")
        .update({
          vendido: true,
          cliente: nomeCliente,
          data_venda: agoraIso(),
          valor_venda_final: valorFinal,
        })
        .eq("id", codigoPeca)
        .eq("vendido", false)
        .select();

      if (errorPeca) {
        console.error("ERRO AO ATUALIZAR PEÇA:", errorPeca);
        alert("Erro ao registrar venda.");
        return;
      }

      if (!pecaAtualizada || pecaAtualizada.length === 0) {
        alert("Essa peça já foi vendida ou a venda já foi registrada.");
        await carregarPecas();
        return;
      }

      const novaVendaLive = {
        id: gerarCodigo("VENDA"),
        live_id: liveAtual.id,
        sacolinha_id: sacolinhaId,
        peca_id: codigoPeca,
        nome_peca: peca.nome || "-",
        cliente_nome: nomeCliente,
        fila_espera_nome: String(filaEspera || "").trim() || null,
        valor_venda: valorFinal,
        data_hora: agoraIso(),
        status_pagamento: "pendente",
      };
      const { error: errorVendaLive } = await supabase
        .from("vendas_live")
        .insert(novaVendaLive);

      if (errorVendaLive) {
        console.error("ERRO AO SALVAR EM vendas_live:", errorVendaLive);

        // rollback manual da peça
        const { error: rollbackError } = await supabase
          .from("pecas")
          .update({
            vendido: false,
            cliente: null,
            data_venda: null,
            valor_venda_final: null,
          })
          .eq("id", codigoPeca);

        if (rollbackError) {
          console.error("ERRO NO ROLLBACK DA PEÇA:", rollbackError);
        }

        alert(`Erro ao salvar na vendas_live: ${errorVendaLive.message}`);
        await Promise.all([
          carregarPecas(),
          carregarTodasVendasLive(),
        ]);
        return;
      }

      const pecaVendidaAtualizada = pecaAtualizada[0];

      setPecas((prev) =>
        (prev || []).map((item) =>
          String(item?.id) === String(codigoPeca)
            ? { ...item, ...pecaVendidaAtualizada }
            : item
        )
      );

      setVendasLive((prev) => [...(prev || []), novaVendaLive]);
      setTodasVendasLive((prev) => [...(prev || []), novaVendaLive]);

      setSacolinhasLive((prev) => {
        const listaAtual = prev || [];
        const jaExiste = listaAtual.some(
          (item) => String(item?.id) === String(sacolinhaId)
        );

        if (jaExiste) return listaAtual;

        return [
          ...listaAtual,
          {
            id: sacolinhaId,
            cliente_id: clienteIdResolvido || null,
            cliente_nome: nomeCliente,
            live_id: liveAtual.id,
            status: "aberta",
          },
        ];
      });

      resetFormularioVenda();
    } finally {
      setSalvandoVenda(false);
    }
  }

  async function passarVendaParaFila(itemCodigo) {
    if (!liveEmVisualizacao) {
      alert("Nenhuma live selecionada.");
      return;
    }

    const venda = vendasLive.find(
      (v) =>
        String(v.peca_id || "").trim() === String(itemCodigo || "").trim() &&
        String(v.live_id || "") === String(liveEmVisualizacao.id || "")
    );

    if (!venda) {
      alert("Venda não encontrada.");
      return;
    }

    const clienteAnterior = String(venda.cliente_nome || "").trim();
    const proximaCliente = String(venda.fila_espera_nome || "").trim();
    const sacolinhaAntigaId = venda.sacolinha_id || null;

    if (!proximaCliente) {
      alert("Essa peça não possui cliente na fila.");
      return;
    }

    const novaData = agoraIso();

    const clientesFilaEncontradas = (clientes || []).filter(
      (item) =>
        String(item?.nome || "").trim().toLowerCase() ===
        proximaCliente.toLowerCase()
    );

    const proximaClienteId =
      clientesFilaEncontradas.length === 1
        ? clientesFilaEncontradas[0]?.id || null
        : null;

    const novaSacolinhaId = await obterOuCriarSacolinha(
      proximaCliente,
      liveEmVisualizacao.id,
      proximaClienteId
    );

    if (!novaSacolinhaId) {
      alert("Não foi possível criar ou localizar a sacolinha da nova cliente.");
      return;
    }

    const { error: errorVenda } = await supabase
      .from("vendas_live")
      .update({
        cliente_nome: proximaCliente,
        fila_espera_nome: null,
        status_pagamento: "pendente",
        data_hora: novaData,
        sacolinha_id: novaSacolinhaId,
      })
      .eq("id", venda.id);

    if (errorVenda) {
      console.error("ERRO AO PASSAR VENDA PARA FILA:", errorVenda);
      alert("Erro ao transferir venda para a cliente da fila.");
      return;
    }

    const { error: errorPeca } = await supabase
      .from("pecas")
      .update({
        cliente: proximaCliente,
        data_venda: novaData,
        vendido: true,
      })
      .eq("id", venda.peca_id);

    if (errorPeca) {
      console.error("ERRO AO ATUALIZAR PEÇA PARA FILA:", errorPeca);

      const { error: rollbackError } = await supabase
        .from("vendas_live")
        .update({
          cliente_nome: clienteAnterior,
          fila_espera_nome: proximaCliente,
          sacolinha_id: sacolinhaAntigaId,
        })
        .eq("id", venda.id);

      if (rollbackError) {
        console.error("ERRO NO ROLLBACK DA VENDA PARA FILA:", rollbackError);
      }

      alert("A venda foi alterada, mas houve erro ao atualizar a peça.");
      await Promise.all([
        carregarVendasLive(
          liveEmVisualizacao.id === liveAtual?.id ? liveAtual : liveEmVisualizacao
        ),
        carregarPecas(),
      ]);
      return;
    }

    if (sacolinhaAntigaId) {
      const { data: vendasRestantes, error: erroRestantes } = await supabase
        .from("vendas_live")
        .select("id")
        .eq("sacolinha_id", sacolinhaAntigaId)
        .limit(1);

      if (erroRestantes) {
        console.error("ERRO AO VERIFICAR SACOLINHA ANTIGA:", erroRestantes);
      } else if (!vendasRestantes || vendasRestantes.length === 0) {
        const { error: erroExcluirSacolinha } = await supabase
          .from("sacolinhas_live")
          .delete()
          .eq("id", sacolinhaAntigaId);

        if (erroExcluirSacolinha) {
          console.error("ERRO AO EXCLUIR SACOLINHA ANTIGA VAZIA:", erroExcluirSacolinha);
        }
      }
    }

    await recarregarDadosGerais();
    await recarregarLiveEmVisualizacaoAtual();

    alert(`Venda transferida para ${proximaCliente}.`);
  }

  async function cancelarVenda(id) {
    const confirmar = window.confirm(
      "Deseja cancelar essa venda e devolver a peça para disponível?"
    );
    if (!confirmar) return;

    try {
      let queryVenda = supabase
        .from("vendas_live")
        .select("*")
        .eq("peca_id", id)
        .order("data_hora", { ascending: false })
        .limit(1);

      if (liveEmVisualizacao?.id) {
        queryVenda = queryVenda.eq("live_id", liveEmVisualizacao.id);
      }

      const { data: vendaAlvo, error: erroBuscaVenda } = await queryVenda.maybeSingle();

      if (erroBuscaVenda) {
        console.error("ERRO AO BUSCAR VENDA PARA CANCELAMENTO:", erroBuscaVenda);
        alert(`Erro ao localizar venda: ${erroBuscaVenda.message}`);
        return;
      }

      if (!vendaAlvo) {
        const { data: pecaAlvo, error: erroBuscaPeca } = await supabase
          .from("pecas")
          .select("id, vendido")
          .eq("id", id)
          .maybeSingle();

        if (erroBuscaPeca) {
          console.error("ERRO AO BUSCAR PEÇA PARA CANCELAMENTO:", erroBuscaPeca);
          alert(`Erro ao localizar peça: ${erroBuscaPeca.message}`);
          return;
        }

        if (!pecaAlvo) {
          alert("Não encontrei essa peça no estoque.");
          return;
        }

        if (!pecaAlvo.vendido) {
          alert("Essa peça já está disponível.");
          return;
        }

        const { error: errorPecaSemVenda } = await supabase
          .from("pecas")
          .update({
            vendido: false,
            cliente: null,
            data_venda: null,
            valor_venda_final: null,
          })
          .eq("id", id);

        if (errorPecaSemVenda) {
          console.error("ERRO AO LIMPAR PEÇA SEM VENDA_LIVE:", errorPecaSemVenda);
          alert(`Erro ao limpar peça: ${errorPecaSemVenda.message}`);
          return;
        }

        await recarregarDadosGerais();
        await recarregarLiveEmVisualizacaoAtual();

        alert("Venda cancelada na peça. Nenhum registro em vendas_live foi encontrado.");
        return;
      }

      const sacolinhaId = vendaAlvo.sacolinha_id || null;

      const { data: removidas, error: errorVendaLive } = await supabase
        .from("vendas_live")
        .delete()
        .eq("id", vendaAlvo.id)
        .select();

      if (errorVendaLive) {
        console.error("ERRO AO REMOVER VENDA DA LIVE:", errorVendaLive);
        alert(`Erro ao remover da live: ${errorVendaLive.message}`);
        return;
      }

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

        if (removidas && removidas.length > 0) {
          const { error: rollbackError } = await supabase
            .from("vendas_live")
            .insert(removidas);

          if (rollbackError) {
            console.error("ERRO NO ROLLBACK DA VENDA CANCELADA:", rollbackError);
          }
        }

        alert(`Erro ao cancelar venda: ${errorPeca.message}`);

        await Promise.all([
          carregarPecas(),
          carregarTodasVendasLive(),
          carregarSacolinhasLive(),
        ]);

        return;
      }

      if (sacolinhaId) {
        const { data: vendasRestantes, error: erroRestantes } = await supabase
          .from("vendas_live")
          .select("id")
          .eq("sacolinha_id", sacolinhaId)
          .limit(1);

        if (erroRestantes) {
          console.error("ERRO AO VERIFICAR SACOLINHA RESTANTE:", erroRestantes);
        } else if (!vendasRestantes || vendasRestantes.length === 0) {
          const { error: erroExcluirSacolinha } = await supabase
            .from("sacolinhas_live")
            .delete()
            .eq("id", sacolinhaId);

          if (erroExcluirSacolinha) {
            console.error(
              "ERRO AO EXCLUIR SACOLINHA VAZIA:",
              erroExcluirSacolinha
            );
          }
        }
      }

      await recarregarDadosGerais();
      await recarregarLiveEmVisualizacaoAtual();

      alert("Venda cancelada com sucesso.");
    } catch (error) {
      console.error("ERRO GERAL AO CANCELAR VENDA:", error);
      alert("Erro inesperado ao cancelar venda.");
    }
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

    // 🔥 mantém a live atual travada
    const liveAtualAberta = liveSelecionada;

    await carregarPagamentosClientes();

    // 🔥 re-aplica a live que estava aberta
    if (liveAtualAberta?.id) {
      setLiveSelecionada(liveAtualAberta);
    }
  }

  async function iniciarLive() {
    if (!nomeNovaLive.trim()) {
      alert("Digite um nome para a live.");
      return;
    }

    const agora = agoraIso();

    const novaLive = {
      id: gerarCodigo("LIVE"),
      nome: nomeNovaLive,
      data_live: agora,
      hora_inicio: agora,
      status: "aberta",
      criado_em: agora,
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
        hora_fim: agoraIso(),
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

  async function marcarClientePendenteComoPago(clientePendente) {
    const vendaIds = (clientePendente?.vendaIdsPendentes || [])
      .map((id) => String(id || "").trim())
      .filter(Boolean);

    if (vendaIds.length === 0) {
      alert("Nenhuma venda pendente encontrada para essa cliente.");
      return;
    }

    const confirmar = window.confirm(
      `Marcar ${vendaIds.length} peça(s) de ${clientePendente.nome} como pagas?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("vendas_live")
      .update({ status_pagamento: "pago" })
      .in("id", vendaIds);

    if (error) {
      console.error("ERRO AO MARCAR PENDÊNCIAS COMO PAGAS:", error);
      alert(`Erro ao marcar como pago: ${error.message}`);
      return;
    }

    await Promise.all([
      carregarTodasVendasLive(),
      carregarSacolinhasLive(),
    ]);

    if (liveEmVisualizacao?.id) {
      await carregarVendasLive(liveEmVisualizacao);
    }
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
        formatarDataHoraBR(p.data_cadastro) || "",
        formatarDataHoraBR(p.data_venda) || "",
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
        formatarDataHoraBR(item.dataVenda) || item.dataVenda || "",
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
    const comandaFormatada = {
      ...clienteResumo,

      // 🔥 ADICIONA DADOS DA LIVE PARA A COMANDA E WHATSAPP
      liveNome:
        clienteResumo?.liveNome ||
        liveEmVisualizacao?.nome ||
        liveSelecionada?.nome ||
        liveAtual?.nome ||
        "-",

      liveData:
        clienteResumo?.liveData ||
        liveEmVisualizacao?.data_live ||
        liveSelecionada?.data_live ||
        liveAtual?.data_live ||
        liveEmVisualizacao?.criado_em ||
        liveSelecionada?.criado_em ||
        liveAtual?.criado_em ||
        null,

      clienteTelefone:
        clienteResumo?.clienteTelefone ||
        (clientes || []).find(
          (c) =>
            String(c?.nome || "").trim().toLowerCase() ===
            String(clienteResumo?.nome || "").trim().toLowerCase()
        )?.telefone || "",

      // Mantém a data original em ISO para o Preview formatar corretamente.
      // Isso evita o erro "Invalid Date" quando a data já foi convertida para pt-BR antes.
      itens: (clienteResumo.itens || []).map((item) => ({
        ...item,
        dataVenda: item.dataVenda || "",
      })),
    };

    abrirPreview(PREVIEW_TIPO.COMANDA, comandaFormatada);
  }

  async function carregarSacolinhasLive() {
    setCarregandoSacolinhas(true);

    const pageSize = 1000;
    let from = 0;
    let todas = [];

    try {
      while (true) {
        const { data, error } = await supabase
          .from("sacolinhas_live")
          .select("*")
          .order("criado_em", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error("ERRO AO CARREGAR SACOLINHAS:", error);
          throw new Error(`Erro ao carregar sacolinhas: ${error.message}`);
        }

        if (!data || data.length === 0) break;

        todas = [...todas, ...data];

        if (data.length < pageSize) break;

        from += pageSize;
      }

      console.log("TOTAL sacolinhas carregadas:", todas.length);
      setSacolinhasLive(todas);
    } finally {
      setCarregandoSacolinhas(false);
    }
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
      `Cancelar pedido de ${clienteNome}?`
    );
    if (!confirmar) return;

    try {
      // guarda vínculos
      const { data: vinculos } = await supabase
        .from("pedido_envio_sacolinhas")
        .select("*")
        .eq("pedido_envio_id", pedidoId);

      const { error: erroVinculos } = await supabase
        .from("pedido_envio_sacolinhas")
        .delete()
        .eq("pedido_envio_id", pedidoId);

      if (erroVinculos) {
        throw new Error(`Erro ao remover vínculos: ${erroVinculos.message}`);
      }

      const { error: erroPedido } = await supabase
        .from("pedidos_envio")
        .delete()
        .eq("id", pedidoId);

      if (erroPedido) {
        // rollback dos vínculos
        if (vinculos && vinculos.length > 0) {
          await supabase.from("pedido_envio_sacolinhas").insert(vinculos);
        }

        throw new Error(`Erro ao cancelar pedido: ${erroPedido.message}`);
      }

      await recarregarExpedicao();
      resetExpansoesExpedicao();

      alert("Pedido cancelado com sucesso.");
    } catch (error) {
      console.error("ERRO AO CANCELAR PEDIDO:", error);
      alert(error.message || "Erro ao cancelar pedido.");
    }
  }

  async function recarregarDadosGerais() {
    await Promise.all([
      carregarPecas(),
      carregarTodasVendasLive(),
      carregarSacolinhasLive(),
      carregarLives(),
      carregarLiveAberta(),
    ]);
  }

  async function recarregarLiveEmVisualizacaoAtual() {
    if (liveEmVisualizacao) {
      await carregarVendasLive(
        liveEmVisualizacao.id === liveAtual?.id ? liveAtual : liveEmVisualizacao
      );
    } else {
      setVendasLive([]);
    }
  }

  async function marcarPedidoComoEnviado(pedido) {
    const itensConferidos = itensConferidosPedido[pedido.id] || [];
    const totalItens = pedido.quantidadeCalculada || 0;

    if (itensConferidos.length !== totalItens) {
      alert("Confira todos os itens antes.");
      return;
    }

    const confirmar = window.confirm("Finalizar envio?");
    if (!confirmar) return;

    try {
      const agora = agoraIso();

      const { error: erroPedido } = await supabase
        .from("pedidos_envio")
        .update({
          status: "enviado",
          conferido: true,
          quantidade_conferida: totalItens,
          enviado_em: agora,
        })
        .eq("id", pedido.id);

      if (erroPedido) {
        throw new Error(`Erro ao atualizar pedido: ${erroPedido.message}`);
      }

      const idsSacolinhas = (pedido.sacolinhas || []).map((s) => s.id);

      if (idsSacolinhas.length > 0) {
        const { error: erroSacolinhas } = await supabase
          .from("sacolinhas_live")
          .update({ status: "enviada" })
          .in("id", idsSacolinhas);

        if (erroSacolinhas) {
          // rollback pedido
          await supabase
            .from("pedidos_envio")
            .update({
              status: "montagem",
              conferido: false,
            })
            .eq("id", pedido.id);

          throw new Error(`Erro ao atualizar sacolinhas: ${erroSacolinhas.message}`);
        }
      }

      await recarregarExpedicao();
      resetExpansoesExpedicao();

      alert("Pedido enviado com sucesso.");
    } catch (error) {
      console.error("ERRO AO FINALIZAR PEDIDO:", error);
      alert(error.message || "Erro ao finalizar envio.");
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
      alert("Não há sacolinhas separadas disponíveis.");
      return;
    }

    const confirmar = window.confirm(
      `Criar pedido de envio para ${clienteNome}?`
    );
    if (!confirmar) return;

    try {
      setCriandoPedidoEnvioCliente(clienteNome);

      const pedidoId = gerarCodigo("ENV");
      const criadoEm = agoraIso();

      const itensDoPedido = sacolinhasElegiveis.flatMap((s) =>
        getItensDaSacolinha(s, todasVendasLive)
      );

      const quantidadeEsperada = itensDoPedido.length;

      // 1️⃣ cria pedido
      const { error: erroPedido } = await supabase
        .from("pedidos_envio")
        .insert([
          {
            id: pedidoId,
            cliente_nome: clienteNome,
            status: "montagem",
            quantidade_esperada: quantidadeEsperada,
            criado_em: criadoEm,
            atualizado_em: criadoEm,
          },
        ]);

      if (erroPedido) {
        throw new Error(`Erro ao criar pedido: ${erroPedido.message}`);
      }

      // 2️⃣ cria vínculos
      const baseTimestamp = Date.now();

      const vinculos = sacolinhasElegiveis.map((s, index) => ({
        id: `${pedidoId}-${s.id}-${baseTimestamp}-${index}-${Math.random()
          .toString(36)
          .slice(2, 10)}`,
        pedido_envio_id: pedidoId,
        sacolinha_id: s.id,
      }));

      const { error: erroVinculos } = await supabase
        .from("pedido_envio_sacolinhas")
        .insert(vinculos);

      if (erroVinculos) {
        // rollback do pedido
        await supabase.from("pedidos_envio").delete().eq("id", pedidoId);

        throw new Error(`Erro ao vincular sacolinhas: ${erroVinculos.message}`);
      }

      await recarregarExpedicao();
      resetExpansoesExpedicao();

      alert("Pedido criado com sucesso.");
    } catch (error) {
      console.error("ERRO AO CRIAR PEDIDO:", error);
      alert(error.message || "Erro ao criar pedido.");
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
      throw new Error(`Erro ao carregar pedidos de envio: ${error.message}`);
    }

    setPedidosEnvio(data || []);
    setCarregandoPedidosEnvio(false);
  }

  async function carregarPedidoEnvioSacolinhas() {
    const pageSize = 1000;
    let from = 0;
    let todos = [];

    while (true) {
      const { data, error } = await supabase
        .from("pedido_envio_sacolinhas")
        .select("*")
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("ERRO AO CARREGAR VÍNCULOS DE PEDIDOS DE ENVIO:", error);
        throw new Error(
          `Erro ao carregar vínculos dos pedidos de envio: ${error.message}`
        );
      }

      if (!data || data.length === 0) break;

      todos = [...todos, ...data];

      if (data.length < pageSize) break;

      from += pageSize;
    }

    setPedidoEnvioSacolinhas(todos);
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
              criado_em: agoraIso(),
              portal_token: gerarPortalToken(),
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

      await recarregarDadosGerais();
      await recarregarLiveEmVisualizacaoAtual();

      alert("Sacolinhas antigas corrigidas com sucesso.");
    } catch (err) {
      console.error("ERRO GERAL AO CORRIGIR SACOLINHAS ANTIGAS:", err);
      alert("Erro inesperado ao corrigir sacolinhas antigas.");
    }
  }

  function abrirWhatsappComanda(clienteResumo) {
    const clienteCadastro = (clientes || []).find(
      (c) =>
        String(c?.nome || "").trim().toLowerCase() ===
        String(clienteResumo?.nome || "").trim().toLowerCase()
    );

    const telefoneCliente = normalizarTelefoneWhatsApp(
      clienteResumo?.clienteTelefone || clienteCadastro?.telefone || ""
    );

    const textoCodificado = encodeURIComponent(montarTextoComanda(clienteResumo));
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const url = telefoneCliente
      ? `https://wa.me/${telefoneCliente}?text=${textoCodificado}`
      : isMobile
        ? `https://wa.me/?text=${textoCodificado}`
        : `https://web.whatsapp.com/send?text=${textoCodificado}`;

    window.open(url, "_blank");
  }

  function toggleEtiqueta(id) {
    setEtiquetasSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function normalizarListaEtiquetas(lista = []) {
    return (Array.isArray(lista) ? lista : [])
      .filter(Boolean)
      .map((peca, index) => ({
        ...peca,
        id: String(peca?.id || `sem-codigo-${index}`),
      }));
  }

  function marcarTodasEtiquetas(listaVisivel = pecasFiltradas) {
    const itensVisiveis = normalizarListaEtiquetas(listaVisivel);
    const idsVisiveis = itensVisiveis.map((peca) => peca.id);

    /*
     * A seleção passa a representar exatamente o resultado
     * exibido na tela, inclusive filtros avançados do EstoqueSection.
     */
    setEtiquetasSelecionadas(idsVisiveis);
  }

  function desmarcarTodasEtiquetas(listaVisivel = null) {
    /*
     * Quando o EstoqueSection envia a lista visível, remove somente
     * as etiquetas daquele filtro. Sem argumento, limpa tudo.
     */
    if (!Array.isArray(listaVisivel)) {
      setEtiquetasSelecionadas([]);
      return;
    }

    const idsVisiveis = new Set(
      normalizarListaEtiquetas(listaVisivel).map((peca) => peca.id)
    );

    setEtiquetasSelecionadas((atuais) =>
      atuais.filter((id) => !idsVisiveis.has(String(id)))
    );
  }

  function imprimirEtiquetasSelecionadas(
    listaVisivel = pecasFiltradas
  ) {
    const itensVisiveis = normalizarListaEtiquetas(listaVisivel);
    const idsSelecionados = new Set(
      etiquetasSelecionadas.map((id) => String(id))
    );

    const selecionadas = itensVisiveis
      .filter((peca) => idsSelecionados.has(peca.id))
      .map((peca) => ({
        ...peca,
        nome: peca?.nome || "Sem nome",
        venda: peca?.venda ? peca.venda : formatarBRL(0),
        obs: peca?.obs || "-",
      }));

    if (!selecionadas.length) {
      alert(
        "Selecione pelo menos uma etiqueta dentro do filtro atual."
      );
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

  const sugestoesPecasVenda = useMemo(() => {
    const termo = String(vendaId || "").trim().toLowerCase();

    // só começa a sugerir com 4 ou mais caracteres
    if (termo.length < 4) return [];

    return (pecas || [])
      .filter((p) => {
        if (p?.vendido) return false;

        const codigoCompleto = String(p?.id || "");
        const codigo = codigoCompleto.toLowerCase();
        const nome = String(p?.nome || "").toLowerCase();

        const numeros = codigoCompleto.replace(/\D/g, "");
        const ultimos4 = numeros.slice(-4);

        return (
          nome.includes(termo) ||
          codigo.includes(termo) ||
          ultimos4.includes(termo)
        );
      })
      .slice(0, 8);
  }, [pecas, vendaId]);

  const mapaLivesPorId = useMemo(() => {
    if (!Array.isArray(listaLives)) return {};

    return Object.fromEntries(
      listaLives.map((live) => [String(live.id), live])
    );
  }, [listaLives]);

  const pecasVendidasLiveCronologicas = useMemo(() => {
    return [...(vendasLive || [])]
      .map((venda) => {
        const peca = mapaPecasPorId[String(venda.peca_id)] || {};
        const dataVenda = venda.data_hora || venda.criado_em || venda.data_venda || "";

        return {
          ...venda,
          nomePeca: venda.nome_peca || peca.nome || venda.peca_id || "-",
          codigo: venda.peca_id || "-",
          valor: Number(venda.valor_venda || 0),
          horario: dataVenda,
          cliente: venda.cliente_nome || "-",
          fila: venda.fila_espera_nome || "",
          timestamp: parseDataFlex(dataVenda)?.getTime() || 0,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((venda, index) => ({
        ...venda,
        numeroCronologico: index + 1,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [vendasLive, mapaPecasPorId]);

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
    totalSacolinhasVencidas,
  } = useExpedicaoMemo({
    todasVendasLive,
    sacolinhasLive,
    pedidoEnvioSacolinhas,
    pedidosEnvio,
    mapaPecasPorId,
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

  useEffect(() => {
  }, [
    liveAtual,
    liveSelecionada,
    liveEmVisualizacao,
    vendasLive,
    todasVendasLive,
    resumoFaturamentoPorLive,
  ]);
  useEffect(() => {
    const liveIdAtual = String(liveAtual?.id || "");

    const vendasDaLiveAtual = (todasVendasLive || []).filter(
      (v) => String(v.live_id) === liveIdAtual
    );
  }, [liveAtual, vendasLive, todasVendasLive, resumoFaturamentoPorLive]);

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
        const dataA =
          parseDataFlex(a?.data_cadastro || a?.criado_em || a?.created_at)?.getTime() || 0;
        const dataB =
          parseDataFlex(b?.data_cadastro || b?.criado_em || b?.created_at)?.getTime() || 0;

        if (dataB !== dataA) return dataB - dataA;

        return String(b?.id || "").localeCompare(String(a?.id || ""), "pt-BR", {
          numeric: true,
          sensitivity: "base",
        });
      });
  }, [pecas, buscaPeca, filtroEstoque, pecaIdsEnviados]);

  const MENU_ITEMS = [
    { id: "cadastro", label: "Cadastro", icon: Package, adminOnly: false },
    { id: "pecas", label: "Estoque", icon: Boxes, adminOnly: false },
    { id: "vendas", label: "Vendas", icon: ShoppingBag, adminOnly: false },
    { id: "lives", label: "Lives", icon: Radio, adminOnly: false },
    { id: "clientes", label: "Clientes", icon: Users, adminOnly: false },
    { id: "notes", label: "Notas", icon: NotebookPen, adminOnly: false, },
    { id: "expedicao", label: "Expedição", icon: Truck, adminOnly: false },
    { id: "pendencias", label: "Pendências", icon: CreditCard, adminOnly: false },
    { id: "faturamento", label: "Faturamento", icon: BarChart3, adminOnly: true },
  ];

  const menuVisivel = MENU_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  function getTituloAba(aba) {
    if (aba === "cadastro") return "Cadastro";
    if (aba === "pecas") return "Estoque";
    if (aba === "vendas") return "Vendas";
    if (aba === "lives") return "Lives";
    if (aba === "clientes") return "Clientes";
    if (aba === "notes") return "Notas";
    if (aba === "expedicao") return "Expedição";
    if (aba === "pendencias") return "Pendências";
    if (aba === "assistente") return "Assistente Virtual";
    if (aba === "faturamento") return "Faturamento";

    return "Painel";
  }

  const sidebarNova = {
    ...sidebar,
    width: isMobile ? 300 : 286,
    minWidth: isMobile ? 300 : 286,
    padding: isMobile ? "18px 16px" : "22px 18px",
    borderRadius: isMobile ? 24 : 28,
    background: CORES_APP.fundoPainel,
    border: `1px solid ${CORES_APP.borda}`,
    boxShadow: CORES_APP.sombraLeve,
    display: "flex",
    flexDirection: "column",
    gap: 18,
    position: isMobile ? "relative" : "sticky",
    top: isMobile ? "auto" : 16,
    alignSelf: "start",
    maxHeight: isMobile ? "none" : "calc(100vh - 32px)",
    overflowY: "auto",
  };

  const sidebarTopoNovo = {
    display: "grid",
    gap: 14,
  };

  const logoWrapNovo = {
    width: isMobile ? 132 : 150,
    height: isMobile ? 132 : 150,
    borderRadius: 28,
    background: "#fff7f9",
    border: `1px solid ${CORES_APP.borda}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const logoImagemNovo = {
    width: "76%",
    height: "76%",
    objectFit: "contain",
  };

  const marcaBadgeNova = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    padding: "10px 16px",
    borderRadius: 999,
    background: CORES_APP.rosaClaro,
    border: `1px solid ${CORES_APP.borda}`,
    color: CORES_APP.rosaPrincipal,
    fontWeight: 700,
    fontSize: 14,
  };

  const sidebarSubtituloNovo = {
    margin: 0,
    color: CORES_APP.textoSuave,
    fontSize: 14,
    lineHeight: 1.45,
    maxWidth: 220,
  };

  const linhaDivisoriaNova = {
    width: "100%",
    height: 1,
    background: CORES_APP.borda,
    border: "none",
    margin: "2px 0 0",
  };

  const menuListaNovo = {
    display: "grid",
    gap: 8,
  };

  const menuBotaoNovo = {
    width: "100%",
    border: "1px solid transparent",
    background: "transparent",
    color: CORES_APP.textoSuave,
    padding: "14px 16px",
    borderRadius: 18,
    display: "grid",
    gridTemplateColumns: "20px 1fr",
    alignItems: "center",
    gap: 14,
    textAlign: "left",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    transition: "all 0.18s ease",
  };

  const menuBotaoAtivoNovo = {
    ...menuBotaoNovo,
    background: CORES_APP.rosaClaro,
    color: CORES_APP.rosaPrincipal,
    border: `1px solid ${CORES_APP.borda}`,
    boxShadow: "none",
  };

  const assistenteTopoBotao = {
    width: "100%",
    border: abaAtiva === "assistente"
      ? `1px solid ${CORES_APP.rosaPrincipal}`
      : `1px solid ${CORES_APP.borda}`,
    background: abaAtiva === "assistente"
      ? CORES_APP.rosaPrincipal
      : "linear-gradient(135deg, #fff7f9 0%, #ffffff 100%)",
    color: abaAtiva === "assistente" ? "#fff" : CORES_APP.rosaPrincipal,
    padding: "13px 14px",
    borderRadius: 18,
    display: "grid",
    gridTemplateColumns: "22px 1fr auto",
    alignItems: "center",
    gap: 12,
    textAlign: "left",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 800,
    boxShadow: abaAtiva === "assistente"
      ? "0 10px 22px rgba(143,39,69,0.18)"
      : "0 6px 16px rgba(15,23,42,0.05)",
    transition: "all 0.18s ease",
  };

  const assistenteSelo = {
    justifySelf: "end",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.04em",
    padding: "4px 7px",
    borderRadius: 999,
    background: abaAtiva === "assistente" ? "rgba(255,255,255,0.20)" : CORES_APP.rosaClaro,
    color: abaAtiva === "assistente" ? "#fff" : CORES_APP.rosaPrincipal,
    border: abaAtiva === "assistente" ? "1px solid rgba(255,255,255,0.25)" : `1px solid ${CORES_APP.borda}`,
  };

  const sidebarRodapeNovo = {
    marginTop: "auto",
    fontSize: 12,
    color: CORES_APP.textoSuave,
    lineHeight: 1.4,
    paddingTop: 8,
  };

  const topoMobileNovo = {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    marginBottom: 8,
    background: CORES_APP.fundoPainel,
    backdropFilter: "blur(8px)",
    borderRadius: 18,
    padding: "12px 14px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 12,
    boxShadow: CORES_APP.sombraLeve,
  };

  const botaoMenuMobileNovo = {
    background: CORES_APP.rosaPrincipal,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    width: 44,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: "none",
    padding: 0,
  };

  if (portalClienteAtivo) {
    return <PortalCliente />;
  }

  if (modoCadastroPublicoAtivo()) {
    return (
      <CadastroPublicoCliente
        logoKchic={logoKchic}
        formCliente={formCliente}
        setFormCliente={setFormCliente}
        cadastroPublicoConcluido={cadastroPublicoConcluido}
        salvandoCadastroPublico={salvandoCadastroPublico}
        salvarCadastroClientePublico={salvarCadastroClientePublico}
      />
    );
  }

  if (carregandoAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CORES_APP.fundo,
          color: CORES_APP.textoPrincipal,
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          padding: 24,
        }}
      >
        Carregando acesso...
      </div>
    );
  }

  if (!session) {
    return <LoginAdmin />;
  }

  if (carregandoUsuario) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CORES_APP.fundo,
          color: CORES_APP.textoPrincipal,
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          padding: 24,
        }}
      >
        Carregando usuário...
      </div>
    );
  }

  if (!acessoLiberado) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CORES_APP.fundo,
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "min(420px, 100%)",
            background: "#fff",
            border: `1px solid ${CORES_APP.borda}`,
            borderRadius: 24,
            padding: 24,
            boxShadow: CORES_APP.sombraLeve,
            display: "grid",
            gap: 12,
            textAlign: "center",
          }}
        >
          <strong style={{ fontSize: 20, color: CORES_APP.textoPrincipal }}>
            Acesso não liberado
          </strong>

          <p style={{ margin: 0, color: CORES_APP.textoSuave, lineHeight: 1.5 }}>
            {motivoBloqueio || "Seu usuário ainda não foi liberado no painel interno."}
          </p>

          <button
            type="button"
            onClick={sairDoApp}
            style={{
              border: "none",
              borderRadius: 14,
              background: CORES_APP.rosaPrincipal,
              color: "#fff",
              fontWeight: 800,
              padding: "12px 16px",
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
    html, body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    * {
      box-sizing: border-box;
      min-width: 0;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    img {
      max-width: 100%;
      height: auto;
    }

    .sidebar-app {
      scrollbar-width: thin;
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

    .painel-principal h1,
    .painel-principal h2,
    .painel-principal h3 {
      line-height: 1.12;
      word-break: break-word;
    }

    .painel-principal p,
    .painel-principal span,
    .painel-principal div,
    .painel-principal label,
    .painel-principal strong,
    .painel-principal input,
    .painel-principal button {
      word-break: break-word;
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
    position: relative !important;
    top: auto !important;
    max-height: none !important;
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
    align-items: center !important;
    gap: 10px !important;
    padding: 10px 12px !important;
    border-radius: 16px !important;
  }

  .topo-mobile strong {
    font-size: 16px !important;
    line-height: 1.1 !important;
  }

  .painel-principal h1,
  .painel-principal h2 {
    line-height: 1.08 !important;
    margin-bottom: 10px !important;
  }

  .painel-principal h3 {
    line-height: 1.12 !important;
    margin-bottom: 10px !important;
  }

  .painel-principal h2 {
    font-size: 28px !important;
  }

  .painel-principal h3 {
    font-size: 20px !important;
  }

  button {
    font-size: 14px !important;
    line-height: 1.15 !important;
  }

  .painel-principal p,
  .painel-principal span,
  .painel-principal div,
  .painel-principal label,
  .painel-principal strong,
  .painel-principal input,
  .painel-principal button {
    font-size: 14px !important;
  }

  .painel-principal p,
  .painel-principal span,
  .painel-principal label,
  .painel-principal div {
    line-height: 1.35 !important;
  }

  .painel-principal input {
    min-height: 44px !important;
    padding: 10px 12px !important;
    border-radius: 12px !important;
  }

  .painel-principal button,
  .grid-cadastro button,
  .grid-vendas button,
  .grid-clientes button,
  .linha-resumo button {
    width: 100%;
    min-height: 36px !important;
    padding: 7px 10px !important;
    border-radius: 10px !important;
  }

  .painel-principal .card-cliente button,
  .painel-principal .card-peca button {
    min-height: 24px !important;
    padding: 3px 7px !important;
    border-radius: 7px !important;
    font-size: 10px !important;
    line-height: 1 !important;
  }
  .painel-principal .item-cliente button {
    min-height: 34px !important;
    padding: 6px 10px !important;
  }

  input {
    width: 100% !important;
  }

  .painel-principal img,
  .painel-principal canvas {
    max-width: 100% !important;
    height: auto !important;
  }

  .painel-principal > div,
  .painel-principal section,
  .painel-principal article {
    min-width: 0 !important;
  }
}

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

      <HeaderERP
        isMobile={isMobile}
        abaAtiva={abaAtiva}
        getTituloAba={getTituloAba}
        menuMobileAberto={menuMobileAberto}
        setMenuMobileAberto={setMenuMobileAberto}
        cores={CORES_APP}
      />

      <div className="layout-app" style={layoutApp}>
        <SidebarERP
          isMobile={isMobile}
          menuMobileAberto={menuMobileAberto}
          abaAtiva={abaAtiva}
          menuVisivel={menuVisivel}
          trocarAba={trocarAba}
          sairDoApp={sairDoApp}
          carregando={carregando}
          usuarioSistema={usuarioSistema}
          session={session}
          logoKchic={logoKchic}
          cores={CORES_APP}
        />

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
                  {abaAtiva === "notes" && "Notas"}
                  {abaAtiva === "expedicao" && "Expedição"}
                  {abaAtiva === "pendencias" && "Pendências de Pagamento"}
                  {abaAtiva === "assistente" && "Assistente Virtual"}
                  {abaAtiva === "faturamento" && "Faturamento"}
                </h2>

                <p style={topoPainelTexto}>
                  {carregando
                    ? "Atualizando informações do sistema..."
                    : `Olá, ${usuarioSistema?.apelido || usuarioSistema?.nome || "admin"} 👋`}
                </p>
              </div>
            </div>

            {abaAtiva === "cadastro" && (
              <CadastroSection
                form={form}
                setForm={setForm}
                handleFoto={handleFoto}
                adicionarPeca={adicionarPeca}
                formatarMoeda={formatarMoeda}
                formatarBRL={formatarBRL}
                isMobile={isMobile}
                cores={CORES_APP}
              />
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
                abrirEdicaoPeca={abrirEdicaoPeca}
                pecaEditando={pecaEditando}
                formEdicaoPeca={formEdicaoPeca}
                setFormEdicaoPeca={setFormEdicaoPeca}
                salvarEdicaoPeca={salvarEdicaoPeca}
                cancelarEdicaoPeca={cancelarEdicaoPeca}
                salvandoEdicaoPeca={salvandoEdicaoPeca}
                formatarMoeda={formatarMoeda}

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
                sugestoesPecasVenda={sugestoesPecasVenda}
                mostrarSugestoesVenda={mostrarSugestoesVenda}
                setMostrarSugestoesVenda={setMostrarSugestoesVenda}
                cliente={cliente}
                setCliente={setCliente}
                setClienteId={setClienteId}
                clientes={clientes}
                todasVendasLive={todasVendasLive}
                filaEspera={filaEspera}
                setFilaEspera={setFilaEspera}
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
                copiarMensagemPortalCliente={copiarMensagemPortalCliente}
                togglePagamentoClienteLive={togglePagamentoClienteLive}
                cancelarVenda={cancelarVenda}
                passarVendaParaFila={passarVendaParaFila}
                formatarBRL={formatarBRL}
                formatarDataHoraBR={formatarDataHoraBR}
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
                clientesExpandidos={clientesExpandidos}
                toggleExpandirCliente={toggleExpandirCliente}
              />
            )}

            {abaAtiva === "notes" && (
              <NotesSection />
            )}

            {abaAtiva === "lives" && (
              <LivesSection
                boxGrande={boxGrande}
                tituloSecao={tituloSecao}
                input={input}
                botao={botao}
                linhaResumo={linhaResumo}
                cardResumo={cardResumo}
                valorResumo={valorResumo}
                cardCliente={cardCliente}
                isMobile={isMobile}
                liveAtual={liveAtual}
                liveEmVisualizacao={liveEmVisualizacao}
                nomeNovaLive={nomeNovaLive}
                setNomeNovaLive={setNomeNovaLive}
                iniciarLive={iniciarLive}
                encerrarLive={encerrarLive}
                abaInternaLive={abaInternaLive}
                setAbaInternaLive={setAbaInternaLive}
                clientesLiveExpandido={clientesLiveExpandido}
                setClientesLiveExpandido={setClientesLiveExpandido}
                resumoClientesLive={resumoClientesLive}
                listaLives={listaLives}
                vendasLive={vendasLive}
                pecasVendidasLiveCronologicas={pecasVendidasLiveCronologicas}
                abrirLiveHistorica={abrirLiveHistorica}
                setAbaAtiva={setAbaAtiva}
                formatarDataHoraBR={formatarDataHoraBR}
                formatarDataBR={formatarDataBR}
                formatarBRL={formatarBRL}
              />
            )}


            {abaAtiva === "pendencias" && (
              <PendenciasSection
                boxGrande={boxGrande}
                tituloSecao={tituloSecao}
                linhaResumo={linhaResumo}
                cardResumo={cardResumo}
                valorResumo={valorResumo}
                cardCliente={cardCliente}
                itemCliente={itemCliente}
                input={input}
                botaoPequeno={botaoPequeno}
                isMobile={isMobile}
                todasVendasLive={todasVendasLive}
                mapaPecasPorId={mapaPecasPorId}
                mapaLivesPorId={mapaLivesPorId}
                clientes={clientes}
                liveAtual={liveAtual}
                formatarBRL={formatarBRL}
                formatarDataHoraBR={formatarDataHoraBR}
                gerarComanda={gerarComanda}
                marcarClientePendenteComoPago={marcarClientePendenteComoPago}
              />
            )}


            {abaAtiva === "assistente" && (
              <AssistenteVirtual />
            )}

            {abaAtiva === "faturamento" && (
              <FaturamentoSection
                boxGrande={boxGrande}
                tituloSecao={tituloSecao}
                input={input}
                isMobile={isMobile}
                dataInicialFiltro={dataInicialFiltro}
                setDataInicialFiltro={setDataInicialFiltro}
                dataFinalFiltro={dataFinalFiltro}
                setDataFinalFiltro={setDataFinalFiltro}
                exportarRelatorioCSV={exportarRelatorioCSV}
                resumoFaturamentoPorLive={resumoFaturamentoPorLive}
                faturamentoFiltrado={faturamentoFiltrado}
                lucroFiltrado={lucroFiltrado}
                quantidadeVendidaFiltrada={quantidadeVendidaFiltrada}
                ticketMedioFiltrado={ticketMedioFiltrado}
                formatarBRL={formatarBRL}
              />
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
                totalSacolinhasVencidas={totalSacolinhasVencidas}
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
          formatarDataHoraBR={formatarDataHoraBR}
          agruparEtiquetasEmPaginas={agruparEtiquetasEmPaginas}
          EtiquetaPrint={EtiquetaPrint}
        />

        {mostrarBotaoTopo && (
          <button
            type="button"
            onClick={voltarAoTopo}
            aria-label="Voltar ao início"
            title="Voltar ao início"
            style={{
              position: "fixed",
              right: isMobile ? 16 : 24,
              bottom: isMobile ? 18 : 24,
              zIndex: 9999,
              width: isMobile ? 48 : 54,
              height: isMobile ? 48 : 54,
              borderRadius: "50%",
              border: "none",
              background: CORES_APP.rosaPrincipal,
              color: "#fff",
              fontSize: isMobile ? 22 : 24,
              fontWeight: 800,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 28px rgba(15,23,42,0.25)",
            }}
          >
            ↑
          </button>
        )}

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

          button:aactive {
            transform: translateY(2px);
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

export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </AuthProvider>
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
  fontSize: "clamp(14px, 1.8vw, 15px)",
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

const CORES_APP = {
  fundoApp: "#FFF7F9",
  fundoPainel: "#FFFFFF",
  borda: "#F2E3E8",
  bordaSuave: "#F7E9EE",
  rosaClaro: "#FAE3E8",
  rosaHover: "#FDF1F4",
  rosaPrincipal: "#DF5E78",
  rosaEscuro: "#B94A62",
  texto: "#2F2F35",
  textoSuave: "#8D727B",
  sombraLeve: "0 10px 30px rgba(223,94,120,0.08)",
};

const boxGrande = {
  border: `1px solid ${CORES_APP.borda}`,
  borderRadius: 22,
  padding: 22,
  background: CORES_APP.fundoPainel,
  boxShadow: CORES_APP.sombraLeve,
};

const tituloSecao = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: "clamp(20px, 2.2vw, 22px)",
  fontWeight: 800,
  color: CORES_APP.texto,
  letterSpacing: "-0.3px",
  lineHeight: 1.15,
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
  border: `1px solid ${CORES_APP.borda}`,
  borderRadius: 18,
  padding: 16,
  background: "#fffafb",
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
  fontSize: "clamp(14px, 1.8vw, 15px)",
  background: "#fff",
  outline: "none",
  transition: "all 0.2s ease",
  width: "100%",
  boxSizing: "border-box",
};

const botao = {
  padding: "12px 16px",
  minHeight: 44,
  borderRadius: 14,
  border: "none",
  background: CORES_APP.rosaPrincipal,
  color: "#fff",
  fontSize: "clamp(13px, 1.6vw, 15px)",
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 8px 18px rgba(223,94,120,0.22)",
  transition: "all 0.2s ease",
  width: "100%",
};

const botaoPequeno = {
  padding: "8px 12px",
  minHeight: 40,
  borderRadius: 12,
  border: "none",
  color: "#fff",
  fontSize: "clamp(12px, 1.4vw, 13px)",
  cursor: "pointer",
  fontWeight: 700,
  width: "auto",
};

const gridPecas = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 20,
};

const cardPeca = {
  border: `1px solid ${CORES_APP.borda}`,
  borderRadius: 18,
  padding: 16,
  background: "#fff",
  boxShadow: CORES_APP.sombraLeve,
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
  border: `1px solid ${CORES_APP.borda}`,
  borderRadius: 20,
  padding: 18,
  background: "#fff",
  boxShadow: CORES_APP.sombraLeve,
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
  fontSize: "clamp(24px, 4vw, 32px)",
  fontWeight: 800,
  color: CORES_APP.rosaPrincipal,
  letterSpacing: "-0.5px",
  lineHeight: 1.1,
};

const textoItem = {
  margin: "4px 0",
  color: CORES_APP.textoSuave,
  fontSize: "clamp(13px, 1.7vw, 14px)",
  lineHeight: 1.4,
};

const cardCliente = {
  border: `1px solid ${CORES_APP.borda}`,
  borderRadius: 18,
  padding: 16,
  background: "#fff",
  boxShadow: CORES_APP.sombraLeve,
  transition: "all 0.2s ease",
};

const itemCliente = {
  border: `1px solid ${CORES_APP.bordaSuave}`,
  borderRadius: 12,
  padding: 12,
  background: "#fffafb",
};

const layoutApp = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "280px 1fr",
  gap: 16,
  padding: 16,
  background: CORES_APP.fundoApp,
  boxSizing: "border-box",
};

const sidebar = {
  background: CORES_APP.fundoPainel,
  borderRadius: 24,
  padding: 20,
  color: CORES_APP.texto,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  boxShadow: CORES_APP.sombraLeve,
};

const sidebarTopo = {
  paddingBottom: 16,
  borderBottom: `1px solid ${CORES_APP.borda}`,
  marginBottom: 8,
};

const sidebarTitulo = {
  margin: 0,
  fontSize: "clamp(20px, 2.5vw, 22px)",
  fontWeight: 800,
  letterSpacing: "-0.3px",
  lineHeight: 1.1,
};

const sidebarSubtitulo = {
  margin: "6px 0 0 0",
  fontSize: "clamp(12px, 1.6vw, 13px)",
  color: CORES_APP.textoSuave,
  lineHeight: 1.4,
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
  color: CORES_APP.textoSuave,
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
  color: CORES_APP.textoSuave,
};

const areaPrincipal = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const painelPrincipal = {
  background: CORES_APP.fundoPainel,
  borderRadius: 24,
  minHeight: "calc(100vh - 32px)",
  padding: 24,
  boxShadow: CORES_APP.sombraLeve,
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
  marginBottom: 14,
};

const topoPainelTitulo = {
  margin: 0,
  fontSize: "clamp(26px, 3.5vw, 28px)",
  fontWeight: 800,
  color: CORES_APP.rosaPrincipal,
  letterSpacing: "-0.4px",
  lineHeight: 1.1,
};

const topoPainelTexto = {
  color: CORES_APP.textoSuave,
  marginTop: 6,
  marginBottom: 0,
  fontSize: "clamp(13px, 1.8vw, 14px)",
  lineHeight: 1.4,
};