import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";

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

  // remove zeros à esquerda (mas mantém pelo menos 1 dígito)
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

function imprimirPreview() {
  window.print();
}

function agruparEtiquetasEmPaginas(lista, porPagina = 30) {
  const paginas = [];

  for (let i = 0; i < lista.length; i += porPagina) {
    paginas.push(lista.slice(i, i + porPagina));
  }

  return paginas;
}

function EtiquetaPrint({ peca }) {
  const valorEtiqueta =
    typeof peca.venda === "number"
      ? formatarBRL(peca.venda)
      : peca.venda || "R$ 0,00";

  const obsEtiqueta =
    typeof peca?.obs === "string" ? peca.obs.trim() : String(peca?.obs || "").trim();

  return (
    <div
      style={{
        width: "37mm",
        height: "46mm",
        padding: "1.2mm 1mm 1mm 1mm",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "8mm 4mm 4mm 5mm 20mm",
        alignItems: "start",
        justifyItems: "center",
        rowGap: "0.5mm",
      }}
    >
      <div
        style={{
          width: "100%",
          fontWeight: "bold",
          fontSize: "8px",
          lineHeight: 1,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
      >
        {peca.nome}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "6.5px",
          lineHeight: 1,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          color: "#444",
        }}
      >
        {obsEtiqueta || ""}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "8px",
          fontWeight: "bold",
          lineHeight: 1,
          overflow: "hidden",
        }}
      >
        {valorEtiqueta}
      </div>

      <div
        style={{
          width: "100%",
          fontSize: "6px",
          lineHeight: 1.0,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
      >
        Código: {peca.id}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <QRCodeCanvas value={peca.id} size={56} />
      </div>
    </div>
  );
}

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState("cadastro");
  const [pecas, setPecas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pagamentosClientes, setPagamentosClientes] = useState({});

  const [form, setForm] = useState({
    nome: "",
    custo: "",
    venda: "",
    obs: "",
    foto: "",
  });

  const [vendaId, setVendaId] = useState("");
  const [cliente, setCliente] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaPeca, setBuscaPeca] = useState("");
  const [scannerAtivo, setScannerAtivo] = useState(false);
  const [etiquetasSelecionadas, setEtiquetasSelecionadas] = useState([]);
  const [filtroPagamentoCliente, setFiltroPagamentoCliente] = useState("todos");
  const [clientesExpandidos, setClientesExpandidos] = useState({});
  const [filtroEstoque, setFiltroEstoque] = useState("todas");
  const [clientes, setClientes] = useState([]);
  const [clienteEditandoId, setClienteEditandoId] = useState(null);
  const [liveAtual, setLiveAtual] = useState(null);
  const [nomeNovaLive, setNomeNovaLive] = useState("");
  const [vendasLive, setVendasLive] = useState([]);
  const [listaLives, setListaLives] = useState([]);
  const [liveSelecionada, setLiveSelecionada] = useState(null);
  const liveEmVisualizacao = liveSelecionada || liveAtual;
  const [valorDesconto, setValorDesconto] = useState("");
  const [salvandoVenda, setSalvandoVenda] = useState(false);
  const [previewAberto, setPreviewAberto] = useState(false);
  const [tipoPreview, setTipoPreview] = useState(null); // "comanda" | "etiqueta"
  const [dadosPreview, setDadosPreview] = useState(null);
  const [dataInicialFiltro, setDataInicialFiltro] = useState("");
  const [dataFinalFiltro, setDataFinalFiltro] = useState("");
  const [todasVendasLive, setTodasVendasLive] = useState([]);
  const [formCliente, setFormCliente] = useState({

    nome: "",
    cpf: "",
    telefone: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
  });

  const scannerRef = useRef(null);
  const scannerElementId = "reader";

  async function carregarPagamentosClientes() {
    const { data, error } = await supabase
      .from("clientes_pagamento")
      .select("*");

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
    await carregarPagamentosClientes();
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

  async function salvarCliente() {
    if (!formCliente.nome.trim()) {
      alert("Preencha pelo menos o nome.");
      return;
    }

    const payload = {
      nome: formCliente.nome,
      cpf: formCliente.cpf,
      telefone: formCliente.telefone,
      cep: formCliente.cep,
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
        id: "CLI-" + Date.now(),
        ...payload,
        criado_em: new Date().toLocaleString("pt-BR"),
      };

      const { error } = await supabase
        .from("clientes")
        .insert(novo);

      if (error) {
        console.error("ERRO AO SALVAR CLIENTE:", error);
        alert(`Erro ao salvar cliente: ${error.message}`);
        return;
      }

      alert("Cliente salvo com sucesso.");
    }

    setFormCliente({
      nome: "",
      cpf: "",
      telefone: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
    });

    setClienteEditandoId(null);
    await carregarClientes();
  }

  function editarCliente(cliente) {
    setClienteEditandoId(cliente.id);
    setFormCliente({
      nome: cliente.nome || "",
      cpf: cliente.cpf || "",
      telefone: cliente.telefone || "",
      cep: cliente.cep || "",
      endereco: cliente.endereco || "",
      numero: cliente.numero || "",
      complemento: cliente.complemento || "",
    });
    setAbaAtiva("clientes");
  }

  async function excluirCliente(id) {
    const confirmar = window.confirm("Deseja excluir este cliente?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("ERRO AO EXCLUIR CLIENTE:", error);
      alert(`Erro ao excluir cliente: ${error.message}`);
      return;
    }

    if (clienteEditandoId === id) {
      setClienteEditandoId(null);
      setFormCliente({
        nome: "",
        cpf: "",
        telefone: "",
        cep: "",
        endereco: "",
        numero: "",
        complemento: "",
      });
    }

    await carregarClientes();
    alert("Cliente excluído com sucesso.");
  }

  async function carregarVendasLive() {
    if (!liveAtual) return;

    const { data, error } = await supabase
      .from("vendas_live")
      .select("*")
      .eq("live_id", liveAtual.id);

    if (error) {
      console.error(error);
      return;
    }

    setVendasLive(data || []);
  }

  async function iniciarLive() {
    if (!nomeNovaLive.trim()) {
      alert("Digite um nome para a live.");
      return;
    }

    const novaLive = {
      id: "LIVE-" + Date.now(),
      nome: nomeNovaLive,
      data_live: new Date().toLocaleDateString("pt-BR"),
      hora_inicio: new Date().toLocaleTimeString("pt-BR"),
      status: "aberta",
      criado_em: new Date().toLocaleString("pt-BR"),
    };

    const { data, error } = await supabase
      .from("lives")
      .insert(novaLive)
      .select();

    if (error) {
      console.error("ERRO AO INICIAR LIVE:", error);
      alert(`Erro ao iniciar live: ${error.message}`);
      return;
    }

    console.log("LIVE CRIADA:", data);

    setNomeNovaLive("");
    await carregarLives();
    await carregarLiveAberta();
    alert("Live iniciada com sucesso!");
  }

  async function encerrarLive() {
    if (!liveAtual) return;

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

  async function compartilharCliente(cliente) {
    const texto = `Cliente: ${cliente.nome}
CPF: ${cliente.cpf || "-"}
Telefone: ${cliente.telefone || "-"}
CEP: ${cliente.cep || "-"}
Endereço: ${cliente.endereco || "-"}
Número: ${cliente.numero || "-"}
Complemento: ${cliente.complemento || "-"}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Cliente ${cliente.nome}`,
          text: texto,
        });
        return;
      } catch (err) {
        console.error(err);
      }
    }

    try {
      await navigator.clipboard.writeText(texto);
      alert("Dados do cliente copiados.");
    } catch (err) {
      console.error(err);
      alert("Não foi possível compartilhar.");
    }
  }

  function cancelarEdicaoCliente() {
    setClienteEditandoId(null);
    setFormCliente({
      nome: "",
      cpf: "",
      telefone: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
    });
  }

  function formatarCPF(valor) {
    const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);

    return numeros
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  function formatarTelefone(valor) {
    const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);

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
    const numeros = String(valor || "").replace(/\D/g, "").slice(0, 8);
    return numeros.replace(/^(\d{5})(\d)/, "$1-$2");
  }

  function formatarCEP(valor) {
    const numeros = String(valor || "").replace(/\D/g, "").slice(0, 8);
    return numeros.replace(/^(\d{5})(\d)/, "$1-$2");

    function limparMoeda(valor) {
      if (!valor) return 0;

      return Number(
        String(valor)
          .replace("R$", "")
          .replace(/\./g, "")
          .replace(",", ".")
          .trim()
      );
    }
  }

  async function buscarCep(cep) {
    const cepLimpo = String(cep || "").replace(/\D/g, "");

    if (cepLimpo.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();

      if (data.erro) return;

      setFormCliente((prev) => ({
        ...prev,
        endereco: `${data.logradouro || ""}${data.bairro ? " - " + data.bairro : ""}${data.localidade ? " - " + data.localidade : ""}${data.uf ? "/" + data.uf : ""}`,
      }));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    carregarPecas();
    carregarLives();
    carregarLiveAberta();
    carregarPagamentosClientes();
    carregarTodasVendasLive();
    carregarClientes();
  }, []);

  useEffect(() => {
    const channelPecas = supabase
      .channel("pecas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pecas" },
        () => {
          carregarPecas();
        }
      )
      .subscribe();

    const channelPagamentos = supabase
      .channel("clientes-pagamento-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes_pagamento" },
        () => {
          carregarPagamentosClientes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelPecas);
      supabase.removeChannel(channelPagamentos);
    };
  }, []);

  useEffect(() => {
    if (liveAtual) {
      carregarVendasLive();
    }
  }, [liveAtual]);

  useEffect(() => {
    if (liveAtual) {
      carregarVendasLive();
      setLiveSelecionada(liveAtual);
    } else if (!liveSelecionada) {
      setVendasLive([]);
    }
  }, [liveAtual]);

  useEffect(() => {
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

    return () => {
      supabase.removeChannel(channelLives);
    };
  }, []);

  useEffect(() => {
    const channelVendasLive = supabase
      .channel("vendas-live-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas_live" },
        async () => {
          if (liveEmVisualizacao) {
            if (liveEmVisualizacao.id === liveAtual?.id) {
              await carregarVendasLive();
            } else {
              await abrirLiveHistorica(liveEmVisualizacao);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelVendasLive);
    };
  }, [liveEmVisualizacao, liveAtual]);

  useEffect(() => {
    const channelPecas = supabase
      .channel("pecas-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pecas" },
        async () => {
          await carregarPecas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelPecas);
    };
  }, []);

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

  function gerarCodigo() {
    return "PC-" + Date.now();
  }

  async function adicionarPeca() {
    if (!form.nome.trim()) return;

    const nova = {
      id: gerarCodigo(),
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

    setForm({
      nome: "",
      custo: "",
      venda: "",
      obs: "",
      foto: "",
    });

    setAbaAtiva("pecas");
    await carregarPecas();
  }

  async function registrarVenda() {
    if (salvandoVenda) return;

    if (!liveAtual) {
      alert("Você precisa iniciar uma live antes de vender.");
      return;
    }

    if (!vendaId.trim() || !cliente.trim()) return;

    const peca = pecas.find((p) => String(p.id) === String(vendaId.trim()));

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
      const valorFinal = valorDesconto
        ? limparMoeda(valorDesconto)
        : limparMoeda(peca?.venda);

      // atualiza a peça SOMENTE se ainda estiver disponível
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

      // proteção extra: não inserir se já existir em vendas_live
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
        id: "VENDA-" + Date.now(),
        live_id: liveAtual.id,
        peca_id: vendaId.trim(),
        nome_peca: peca?.nome || "-",
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

      await carregarVendasLive();
      await carregarPecas();
      await carregarTodasVendasLive();

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

    // 1. Voltar peça para disponível
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

    // 2. Remover da vendas_live e confirmar se removeu mesmo
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
      await carregarPecas();
      await carregarTodasVendasLive();
      return;
    }

    // 3. Recarregar tudo
    await carregarPecas();
    await carregarTodasVendasLive();

    if (liveEmVisualizacao) {
      if (liveEmVisualizacao.id === liveAtual?.id) {
        await carregarVendasLive();
      } else {
        await abrirLiveHistorica(liveEmVisualizacao);
      }
    } else {
      setVendasLive([]);
    }

    alert("Venda cancelada com sucesso.");
  }

  async function removerPeca(id) {
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

  async function togglePagamentoCliente(nomeCliente, statusAtual) {
    const novoStatus = !statusAtual;

    const { error } = await supabase
      .from("clientes_pagamento")
      .upsert({
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
    }
  }

  async function abrirLiveHistorica(live) {
    setLiveSelecionada(live);

    const { data, error } = await supabase
      .from("vendas_live")
      .select("*")
      .eq("live_id", live.id);

    if (error) {
      console.error("ERRO AO ABRIR LIVE HISTÓRICA:", error);
      return;
    }

    setVendasLive(data || []);
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

    if (liveEmVisualizacao.id === liveAtual?.id) {
      await carregarVendasLive();
    } else {
      await abrirLiveHistorica(liveEmVisualizacao);
    }
  }

  async function carregarTodasVendasLive() {
    const { data, error } = await supabase
      .from("vendas_live")
      .select("*");

    if (error) {
      console.error("ERRO AO CARREGAR TODAS AS VENDAS:", error);
      return;
    }

    setTodasVendasLive(data || []);
  }

  async function carregarVendasLive() {
    if (!liveAtual) {
      setVendasLive([]);
      return;
    }

    const { data, error } = await supabase
      .from("vendas_live")
      .select("*")
      .eq("live_id", liveAtual.id);

    if (error) {
      console.error("ERRO AO CARREGAR vendas_live:", error);
      return;
    }

    setVendasLive(data || []);
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

  function gerarComanda(clienteResumo) {
    setTipoPreview("comanda");
    setDadosPreview(clienteResumo);
    setPreviewAberto(true);
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

  async function copiarTextoComanda(clienteResumo) {
    try {
      await navigator.clipboard.writeText(montarTextoComanda(clienteResumo));
      alert("Texto da comanda copiado com sucesso.");
    } catch {
      alert("Não foi possível copiar o texto da comanda.");
    }
  }

  function abrirWhatsappComanda(clienteResumo) {
    const texto = montarTextoComanda(clienteResumo);
    const textoCodificado = encodeURIComponent(texto);

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

    setTipoPreview("etiquetas");
    setDadosPreview(selecionadas);
    setPreviewAberto(true);
  }

  const resumoClientes = useMemo(() => {
    const mapa = {};

    pecas
      .filter((p) => p.vendido && p.cliente)
      .forEach((p) => {
        if (!mapa[p.cliente]) {
          mapa[p.cliente] = {
            nome: p.cliente,
            pecas: 0,
            total: 0,
            itens: [],
          };
        }

        mapa[p.cliente].pecas += 1;
        mapa[p.cliente].total += limparMoeda(p.venda);
        mapa[p.cliente].itens.push({
          codigo: p.id,
          nomePeca: p.nome,
          valor: limparMoeda(p.venda),
          dataVenda: p.data_venda || "",
        });
      });

    return Object.values(mapa)
      .map((c) => ({
        ...c,
        pago: !!pagamentosClientes[c.nome],
      }))
      .sort((a, b) => b.total - a.total);
  }, [pecas, pagamentosClientes]);

  const totalPecas = pecas.length;
  const totalVendidas = pecas.filter((p) => p.vendido).length;
  const totalDisponiveis = pecas.filter((p) => !p.vendido).length;

  const faturamento = pecas
    .filter((p) => p.vendido)
    .reduce(
      (acc, p) =>
        acc + Number(p.valor_venda_final ?? limparMoeda(p.venda)),
      0
    );

  const lucroEstimado = pecas
    .filter((p) => p.vendido)
    .reduce(
      (acc, p) =>
        acc +
        (
          Number(p.valor_venda_final ?? limparMoeda(p.venda)) -
          limparMoeda(p.custo)
        ),
      0
    );

  const pecasFiltradas = useMemo(() => {
    const termo = buscaPeca.trim().toLowerCase();

    return pecas.filter((p) => {
      const nome = String(p?.nome || "").toLowerCase();
      const codigo = String(p?.id || "").toLowerCase();
      const cliente = String(p?.cliente || "").toLowerCase();

      const bateBusca =
        !termo ||
        nome.includes(termo) ||
        codigo.includes(termo) ||
        cliente.includes(termo);

      if (!bateBusca) return false;

      if (filtroEstoque === "todas") return true;
      if (filtroEstoque === "disponiveis") return !p?.vendido;
      if (filtroEstoque === "vendidas") return !!p?.vendido;

      return true;
    });
  }, [pecas, buscaPeca, filtroEstoque]);

  const resumoClientesLive = Object.values(
    vendasLive.reduce((acc, venda) => {
      const nome = venda.cliente_nome || "Sem nome";

      if (!acc[nome]) {
        acc[nome] = {
          nome,
          total: 0,
          pecas: 0,
          pago: true,
          itens: [],
        };
      }

      acc[nome].total += Number(venda.valor_venda || 0);
      acc[nome].pecas += 1;

      if (venda.status_pagamento !== "pago") {
        acc[nome].pago = false;
      }

      acc[nome].itens.push({
        codigo: venda.peca_id || "-",
        nomePeca:
          venda.nome_peca ||
          pecas.find((p) => String(p.id) === String(venda.peca_id))?.nome ||
          venda.peca_id ||
          "-",
        valor: Number(venda.valor_venda || 0),
        dataVenda: venda.data_hora || "-",
      });

      return acc;
    }, {})
  );

  const clientesFiltrados = resumoClientesLive.filter((c) => {
    const bateBusca = c.nome.toLowerCase().includes(buscaCliente.toLowerCase());

    if (!bateBusca) return false;

    if (filtroPagamentoCliente === "todos") return true;
    if (filtroPagamentoCliente === "pagos") return c.pago === true;
    if (filtroPagamentoCliente === "pendentes") return c.pago === false;

    return true;
  });

  const totalPecasLive = vendasLive.length;

  const faturamentoLive = vendasLive.reduce((acc, venda) => {
    return acc + Number(venda.valor_venda || 0);
  }, 0);

  function toggleExpandirCliente(nomeCliente) {
    setClientesExpandidos((prev) => ({
      ...prev,
      [nomeCliente]: !prev[nomeCliente],
    }));
  }

  const lucroEstimadoLive = vendasLive.reduce((acc, venda) => {
    const pecaOriginal = pecas.find(
      (p) => String(p.id) === String(venda.peca_id)
    );

    const custo = limparMoeda(pecaOriginal?.custo || 0);
    const valorVenda = Number(venda.valor_venda || 0);

    return acc + (valorVenda - custo);
  }, 0);

  const livesFiltradas = listaLives.filter((live) => {
    if (!live?.data_live) return true;

    const partes = String(live.data_live).split("/");
    if (partes.length !== 3) return true;

    const [dia, mes, ano] = partes;
    const dataLive = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;

    if (dataInicialFiltro && dataLive < dataInicialFiltro) return false;
    if (dataFinalFiltro && dataLive > dataFinalFiltro) return false;

    return true;
  });

  const resumoFaturamentoPorLive = livesFiltradas.map((live) => {
    const vendasDaLive = todasVendasLive.filter(
      (v) => String(v.live_id) === String(live.id)
    );

    const faturamento = vendasDaLive.reduce(
      (acc, v) => acc + Number(v.valor_venda || 0),
      0
    );

    const lucro = vendasDaLive.reduce((acc, v) => {
      const pecaOriginal = pecas.find(
        (p) => String(p.id) === String(v.peca_id)
      );

      const custo = limparMoeda(pecaOriginal?.custo || 0);
      return acc + (Number(v.valor_venda || 0) - custo);
    }, 0);

    const quantidade = vendasDaLive.length;
    const ticketMedio = quantidade > 0 ? faturamento / quantidade : 0;

    return {
      id: live.id,
      nome: live.nome,
      data: live.data_live || "-",
      status: live.status || "-",
      quantidade,
      faturamento,
      lucro,
      ticketMedio,
    };
  });

  function converterDataPtBrParaIso(dataStr) {
    if (!dataStr) return null;

    const parteData = String(dataStr).split(",")[0].trim();
    const partes = parteData.split("/");

    if (partes.length !== 3) return null;

    const [dia, mes, ano] = partes;

    if (!dia || !mes || !ano) return null;

    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  const pecasVendidasFiltradas = pecas.filter((p) => {
    if (!p.vendido || !p.data_venda) return false;

    const dataVendaIso = converterDataPtBrParaIso(p.data_venda);
    if (!dataVendaIso) return false;

    if (dataInicialFiltro && dataVendaIso < dataInicialFiltro) return false;
    if (dataFinalFiltro && dataVendaIso > dataFinalFiltro) return false;

    return true;
  });

  const faturamentoFiltrado = pecasVendidasFiltradas.reduce(
    (acc, p) => acc + Number(p.valor_venda_final ?? limparMoeda(p.venda)),
    0
  );

  const lucroFiltrado = pecasVendidasFiltradas.reduce(
    (acc, p) =>
      acc +
      (Number(p.valor_venda_final ?? limparMoeda(p.venda)) - limparMoeda(p.custo)),
    0
  );

  const quantidadeVendidaFiltrada = pecasVendidasFiltradas.length;

  const ticketMedioFiltrado =
    quantidadeVendidaFiltrada > 0
      ? faturamentoFiltrado / quantidadeVendidaFiltrada
      : 0;

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "Arial, sans-serif",
        maxWidth: 1280,
        margin: "0 auto",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      <div style={topoApp}>
        <div>
          <h1 style={{ margin: 0 }}>📦 Sistema Brechó</h1>
          <p style={{ color: "#555", marginTop: 6 }}>
            {carregando ? "Carregando dados..." : "Dados sincronizados com Supabase"}
          </p>
        </div>
      </div>

      <div style={abasContainer}>
        <button
          style={abaAtiva === "cadastro" ? abaBotaoAtiva : abaBotao}
          onClick={() => setAbaAtiva("cadastro")}
        >
          Cadastro
        </button>

        <button
          style={abaAtiva === "pecas" ? abaBotaoAtiva : abaBotao}
          onClick={() => setAbaAtiva("pecas")}
        >
          Estoque
        </button>

        <button
          style={abaAtiva === "vendas" ? abaBotaoAtiva : abaBotao}
          onClick={() => setAbaAtiva("vendas")}
        >
          Vendas
        </button>

        <button
          style={abaAtiva === "lives" ? abaBotaoAtiva : abaBotao}
          onClick={() => setAbaAtiva("lives")}
        >
          Lives
        </button>

        <button
          style={abaAtiva === "clientes" ? abaBotaoAtiva : abaBotao}
          onClick={() => setAbaAtiva("clientes")}
        >
          Clientes
        </button>

        <button
          style={abaAtiva === "faturamento" ? abaBotaoAtiva : abaBotao}
          onClick={() => setAbaAtiva("faturamento")}
        >
          Faturamento
        </button>
      </div>

      {abaAtiva === "cadastro" && (
        <div style={boxGrande}>
          <h2 style={tituloSecao}>Cadastro de Peças</h2>

          <div style={gridCadastro}>
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
        <div style={boxGrande}>
          <div style={cabecalhoSecao}>
            <h2 style={tituloSecao}>Peças</h2>

            <div style={linhaResumo}>
              <div style={cardResumo}>
                <strong>Total de peças</strong>
                <div style={valorResumo}>{totalPecas}</div>
              </div>

              <div style={cardResumo}>
                <strong>Disponíveis</strong>
                <div style={valorResumo}>{totalDisponiveis}</div>
              </div>

              <div style={cardResumo}>
                <strong>Vendidas</strong>
                <div style={valorResumo}>{totalVendidas}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                style={{ ...input, maxWidth: 340 }}
                placeholder="Buscar por peça, código ou cliente"
                value={buscaPeca}
                onChange={(e) => setBuscaPeca(e.target.value)}
              />

              <button
                style={
                  filtroEstoque === "todas"
                    ? { ...botaoPequeno, background: "#111827" }
                    : { ...botaoPequeno, background: "#6b7280" }
                }
                onClick={() => setFiltroEstoque("todas")}
              >
                Todas
              </button>

              <button
                style={
                  filtroEstoque === "disponiveis"
                    ? { ...botaoPequeno, background: "#2563eb" }
                    : { ...botaoPequeno, background: "#6b7280" }
                }
                onClick={() => setFiltroEstoque("disponiveis")}
              >
                Disponíveis
              </button>

              <button
                style={
                  filtroEstoque === "vendidas"
                    ? { ...botaoPequeno, background: "#15803d" }
                    : { ...botaoPequeno, background: "#6b7280" }
                }
                onClick={() => setFiltroEstoque("vendidas")}
              >
                Vendidas
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <button
              style={{ ...botao, background: "#111827" }}
              onClick={marcarTodasEtiquetas}
            >
              Marcar todas
            </button>

            <button
              style={{ ...botao, background: "#6b7280" }}
              onClick={desmarcarTodasEtiquetas}
            >
              Desmarcar todas
            </button>

            <button
              style={{ ...botao, background: "#2563eb" }}
              onClick={imprimirEtiquetasSelecionadas}
            >
              Imprimir selecionadas
            </button>
          </div>

          {pecasFiltradas.length === 0 ? (
            <p>Nenhuma peça encontrada.</p>
          ) : (
            <div style={gridPecas}>
              {pecasFiltradas.map((p, index) => {
                const codigo = String(p?.id || `sem-codigo-${index}`);
                const nome = p?.nome || "Sem nome";
                const custo = p?.custo ? p.custo : formatarBRL(0);
                const venda = p?.venda ? p.venda : formatarBRL(0);
                const obs = p?.obs || "-";
                const cadastro = p?.data_cadastro || "-";
                const clienteNome = p?.cliente || "";
                const vendido = !!p?.vendido;
                const dataVenda = p?.data_venda || "";

                return (
                  <div key={codigo} style={cardPeca}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <input
                        type="checkbox"
                        checked={etiquetasSelecionadas.includes(codigo)}
                        onChange={() => toggleEtiqueta(codigo)}
                      />
                      <span style={{ fontSize: 14, color: "#374151" }}>
                        Selecionar etiqueta
                      </span>
                    </div>

                    {p?.foto ? (
                      <img
                        src={p.foto}
                        alt={nome}
                        style={{
                          width: "100%",
                          height: 220,
                          objectFit: "cover",
                          borderRadius: 10,
                          marginBottom: 12,
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}

                    <p style={{ margin: "0 0 8px 0", fontSize: 18 }}>
                      <strong>{nome}</strong>
                    </p>

                    <p style={textoItem}>Código: {codigo}</p>
                    <p style={textoItem}>Compra: {custo}</p>
                    <p style={textoItem}>Venda: {venda}</p>
                    <p style={textoItem}>Obs: {obs}</p>
                    <p style={textoItem}>Cadastro: {cadastro}</p>
                    <p style={textoItem}>
                      Status:{" "}
                      <strong style={{ color: vendido ? "green" : "#333" }}>
                        {vendido ? `Vendido para ${clienteNome}` : "Disponível"}
                      </strong>
                    </p>

                    {vendido && <p style={textoItem}>Data da venda: {dataVenda}</p>}

                    <div style={{ marginTop: 12, marginBottom: 12 }}>
                      <QRCodeCanvas value={codigo} size={120} />
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        style={{ ...botao, background: "#2563eb" }}
                        onClick={() => {
                          setTipoPreview("etiquetas");
                          setDadosPreview([
                            {
                              ...p,
                              id: codigo,
                              nome,
                              venda,
                              obs,
                            },
                          ]);
                          setPreviewAberto(true);
                        }}
                      >
                        Imprimir etiqueta
                      </button>

                      {vendido ? (
                        <button
                          style={{ ...botao, background: "#b8860b" }}
                          onClick={() => cancelarVenda(codigo)}
                        >
                          Cancelar venda
                        </button>
                      ) : null}

                      <button
                        style={{ ...botao, background: "#555" }}
                        onClick={() => removerPeca(codigo)}
                      >
                        Remover peça
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {abaAtiva === "vendas" && (
        <div style={{ display: "grid", gap: 24 }}>
          <div style={boxGrande}>
            <h2 style={tituloSecao}>Registro de Vendas</h2>

            <div style={gridVendas}>
              <div style={gridForm}>
                <input
                  style={input}
                  placeholder="Código da peça"
                  value={vendaId}
                  onChange={(e) => setVendaId(e.target.value)}
                />

                <input
                  style={input}
                  placeholder="Nome da cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                />

                <input
                  style={input}
                  placeholder="Valor com desconto (opcional)"
                  value={valorDesconto}
                  onChange={(e) => setValorDesconto(formatarValorDescontoInput(e.target.value))}
                  inputMode="numeric"
                />

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    style={{
                      ...botao,
                      opacity: salvandoVenda ? 0.7 : 1,
                      cursor: salvandoVenda ? "not-allowed" : "pointer",
                    }}
                    onClick={registrarVenda}
                    disabled={salvandoVenda}
                  >
                    {salvandoVenda ? "Salvando..." : "Registrar venda"}
                  </button>

                  <button
                    style={{ ...botao, background: "#0f766e" }}
                    onClick={() => setScannerAtivo((prev) => !prev)}
                  >
                    {scannerAtivo ? "Fechar scanner" : "Ler QR Code"}
                  </button>
                </div>
              </div>
              <div style={previewBox}>
                <h3 style={{ marginTop: 0 }}>Scanner</h3>
                {scannerAtivo ? (
                  <div>
                    <div
                      id={scannerElementId}
                      style={{
                        width: "100%",
                        overflow: "hidden",
                        borderRadius: 12,
                        border: "1px solid #ddd",
                        padding: 8,
                        background: "#fff",
                      }}
                    />
                    <p style={{ fontSize: 14, color: "#555" }}>
                      Aponte a câmera para o QR Code da peça.
                    </p>
                  </div>
                ) : (
                  <div style={semFoto}>Scanner fechado</div>
                )}
              </div>
            </div>
          </div>

          <div style={boxGrande}>
            <div style={cabecalhoSecao}>
              <h2 style={tituloSecao}>
                {liveEmVisualizacao
                  ? `Resumo por Clientes - ${liveEmVisualizacao.nome}`
                  : "Resumo por Clientes"}
              </h2>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  style={{ ...input, maxWidth: 320 }}
                  placeholder="Buscar cliente"
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                />

                <button
                  style={
                    filtroPagamentoCliente === "todos"
                      ? { ...botaoPequeno, background: "#111827" }
                      : { ...botaoPequeno, background: "#6b7280" }
                  }
                  onClick={() => setFiltroPagamentoCliente("todos")}
                >
                  Todos
                </button>

                <button
                  style={
                    filtroPagamentoCliente === "pendentes"
                      ? { ...botaoPequeno, background: "#b45309" }
                      : { ...botaoPequeno, background: "#6b7280" }
                  }
                  onClick={() => setFiltroPagamentoCliente("pendentes")}
                >
                  Pendentes
                </button>

                <button
                  style={
                    filtroPagamentoCliente === "pagos"
                      ? { ...botaoPequeno, background: "#15803d" }
                      : { ...botaoPequeno, background: "#6b7280" }
                  }
                  onClick={() => setFiltroPagamentoCliente("pagos")}
                >
                  Pagos
                </button>
              </div>
            </div>

            {liveEmVisualizacao && (
              <div style={linhaResumo}>
                <div style={cardResumo}>
                  <strong>Peças da live</strong>
                  <div style={valorResumo}>{totalPecasLive}</div>
                </div>

                <div style={cardResumo}>
                  <strong>Faturamento da live</strong>
                  <div style={valorResumo}>{formatarBRL(faturamentoLive)}</div>
                </div>

                <div style={cardResumo}>
                  <strong>Lucro estimado da live</strong>
                  <div style={valorResumo}>{formatarBRL(lucroEstimadoLive)}</div>
                </div>
              </div>
            )}

            {!liveEmVisualizacao ? (
              <p>Inicie uma live ou abra uma live do histórico para visualizar o resumo por clientes.</p>
            ) : clientesFiltrados.length === 0 ? (
              <p>Nenhuma cliente registrada nessa live ainda.</p>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {clientesFiltrados.map((c) => (
                  <div key={c.nome} style={cardCliente}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(220px, 320px) minmax(260px, 360px) 180px",
                        gap: 22,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          minWidth: 0,
                          overflow: "hidden",
                        }}
                      >
                        <button
                          onClick={() => toggleExpandirCliente(c.nome)}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 18,
                            padding: "4px 6px",
                            lineHeight: 1,
                            flexShrink: 0,
                          }}
                        >
                          {clientesExpandidos[c.nome] ? "▼" : "▶"}
                        </button>

                        <strong
                          style={{
                            fontSize: 18,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={c.nome}
                        >
                          {c.nome}
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          gap: 8,
                          flexWrap: "nowrap",
                          whiteSpace: "nowrap",
                          paddingLeft: 8,
                        }}
                      >
                        <button
                          style={{ ...botaoPequeno, background: "#2563eb" }}
                          onClick={() => exportarClienteCSV(c)}
                        >
                          CSV
                        </button>

                        <button
                          style={{ ...botaoPequeno, background: "#111827" }}
                          onClick={() => {
                            setTipoPreview("comanda");
                            setDadosPreview(c);
                            setPreviewAberto(true);
                          }}
                        >
                          Comanda
                        </button>

                        <button
                          style={{
                            ...botaoPequeno,
                            background: c.pago ? "#15803d" : "#b45309",
                          }}
                          onClick={() => togglePagamentoClienteLive(c.nome, c.pago)}
                        >
                          {c.pago ? "Pago" : "Pendente"}
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "90px 90px",
                          justifyContent: "start",
                          alignItems: "center",
                          columnGap: 12,
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          paddingLeft: 10,
                        }}
                      >
                        <span>{c.pecas} peça(s)</span>
                        <strong>{formatarBRL(c.total)}</strong>
                      </div>
                    </div>

                    {clientesExpandidos[c.nome] && (
                      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                        {c.itens.map((item, index) => (
                          <div key={`${item.codigo}-${index}`} style={itemCliente}>
                            <div><strong>Peça:</strong> {item.nomePeca}</div>
                            <div><strong>Código:</strong> {item.codigo}</div>
                            <div><strong>Valor:</strong> {formatarBRL(item.valor)}</div>
                            <div><strong>Vendido em:</strong> {item.dataVenda || "-"}</div>

                            <div style={{ marginTop: 8 }}>
                              <button
                                style={{ ...botaoPequeno, background: "#b91c1c" }}
                                onClick={() => cancelarVenda(item.codigo)}
                              >
                                Cancelar venda
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {abaAtiva === "clientes" && (
        <div style={boxGrande}>
          <h2 style={tituloSecao}>Cadastro de Clientes</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: 20,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
              <input
                style={inputCliente}
                placeholder="Nome completo"
                value={formCliente.nome}
                onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })}
              />

              <input
                style={inputCliente}
                placeholder="CPF"
                value={formCliente.cpf}
                onChange={(e) =>
                  setFormCliente({ ...formCliente, cpf: formatarCPF(e.target.value) })
                }
              />

              <input
                style={inputCliente}
                placeholder="Telefone com DDD"
                value={formCliente.telefone}
                onChange={(e) =>
                  setFormCliente({ ...formCliente, telefone: formatarTelefone(e.target.value) })
                }
              />

              <input
                style={inputCliente}
                placeholder="CEP"
                value={formCliente.cep}
                onChange={(e) => {
                  const cepFormatado = formatarCEP(e.target.value);
                  setFormCliente({ ...formCliente, cep: cepFormatado });
                  buscarCep(cepFormatado);
                }}
              />

              <input
                style={inputCliente}
                placeholder="Endereço"
                value={formCliente.endereco}
                onChange={(e) => setFormCliente({ ...formCliente, endereco: e.target.value })}
              />

              <input
                style={inputCliente}
                placeholder="Número"
                value={formCliente.numero}
                onChange={(e) => setFormCliente({ ...formCliente, numero: e.target.value })}
              />

              <input
                style={inputCliente}
                placeholder="Complemento"
                value={formCliente.complemento}
                onChange={(e) => setFormCliente({ ...formCliente, complemento: e.target.value })}
              />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={botao} onClick={salvarCliente}>
                  {clienteEditandoId ? "Atualizar Cliente" : "Salvar Cliente"}
                </button>

                {clienteEditandoId && (
                  <button
                    style={{ ...botao, background: "#6b7280" }}
                    onClick={cancelarEdicaoCliente}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
              {clientes.length === 0 ? (
                <p>Nenhum cliente cadastrado ainda.</p>
              ) : (
                clientes.map((c) => (
                  <div key={c.id} style={cardCliente}>
                    <strong>{c.nome}</strong>
                    <div><strong>CPF:</strong> {c.cpf ? formatarCPF(c.cpf) : "-"}</div>
                    <div><strong>Telefone:</strong> {c.telefone ? formatarTelefone(c.telefone) : "-"}</div>
                    <div><strong>CEP:</strong> {c.cep || "-"}</div>
                    <div><strong>Endereço:</strong> {c.endereco || "-"}</div>
                    <div>
                      <strong>Nº:</strong> {c.numero || "-"}
                      {c.complemento ? ` - ${c.complemento}` : ""}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button
                        style={{ ...botaoPequeno, background: "#2563eb" }}
                        onClick={() => editarCliente(c)}
                      >
                        Editar
                      </button>

                      <button
                        style={{ ...botaoPequeno, background: "#111827" }}
                        onClick={() => compartilharCliente(c)}
                      >
                        Compartilhar
                      </button>

                      <button
                        style={{ ...botaoPequeno, background: "#b91c1c" }}
                        onClick={() => excluirCliente(c.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
                <div style={linhaResumo}>
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

            <div style={linhaResumo}>
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
          </div>
        </div>
      )}

      {previewAberto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "min(1000px, 95vw)",
              maxHeight: "90vh",
              background: "#fff",
              borderRadius: 16,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="no-print"
              style={{
                padding: 16,
                borderBottom: "1px solid #ddd",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <strong>
                {tipoPreview === "comanda"
                  ? "Preview da Comanda"
                  : "Preview de Etiquetas"}
              </strong>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  style={{ ...botao, background: "#2563eb" }}
                  onClick={() => window.print()}
                >
                  Imprimir
                </button>

                <button
                  style={{ ...botao, background: "#6b7280" }}
                  onClick={() => {
                    setPreviewAberto(false);
                    setTipoPreview(null);
                    setDadosPreview(null);
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>

            <div
              id="area-preview-impressao"
              style={{
                padding: 20,
                overflow: "auto",
                background: "#f8fafc",
              }}
            >
              {tipoPreview === "comanda" && dadosPreview && (
                <div
                  className="comanda-print"
                  style={{
                    maxWidth: 780,
                    margin: "0 auto",
                    background: "#fff",
                    padding: 24,
                    borderRadius: 12,
                    display: "grid",
                    gap: 16,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  {/* AÇÕES */}
                  <div
                    className="no-print"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                  >
                    <button
                      style={{ ...botaoPequeno, background: "#2563eb" }}
                      onClick={() => copiarTextoComanda(dadosPreview)}
                    >
                      Copiar texto
                    </button>

                    <button
                      style={{ ...botaoPequeno, background: "#16a34a" }}
                      onClick={() => abrirWhatsappComanda(dadosPreview)}
                    >
                      Abrir WhatsApp
                    </button>
                  </div>

                  {/* TOPO */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 20,
                      borderBottom: "2px solid #eef2f7",
                      paddingBottom: 18,
                    }}
                  >
                    <div>
                      <h1 style={{ margin: 0, fontSize: 28 }}>
                        Comanda da Cliente
                      </h1>
                      <div style={{ color: "#6b7280", marginTop: 6 }}>
                        Brechó • Resumo da compra
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        Data
                      </div>
                      <div>{new Date().toLocaleString("pt-BR")}</div>
                    </div>
                  </div>

                  {/* RESUMO */}
                  <div
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      padding: 16,
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>Cliente</div>
                      <div style={{ fontWeight: "bold" }}>{dadosPreview.nome}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>Status</div>
                      <div
                        style={{
                          color: dadosPreview.pago ? "#15803d" : "#b45309",
                          fontWeight: "bold",
                        }}
                      >
                        {dadosPreview.pago ? "Pago" : "Pendente"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>Peças</div>
                      <div style={{ fontWeight: "bold" }}>{dadosPreview.pecas}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>Total</div>
                      <div style={{ fontWeight: "bold" }}>
                        {formatarBRL(dadosPreview.total)}
                      </div>
                    </div>
                  </div>

                  {/* ITENS */}
                  <div
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>Itens</h3>

                    <div style={{ display: "grid", gap: 10 }}>
                      {dadosPreview.itens?.map((item, i) => (
                        <div
                          key={`${item.codigo}-${i}`}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 10,
                            padding: 12,
                            background: "#fff",
                          }}
                        >
                          <div><strong>{i + 1}. Peça:</strong> {item.nomePeca}</div>
                          <div><strong>Código:</strong> {item.codigo}</div>
                          <div><strong>Valor:</strong> {formatarBRL(item.valor)}</div>
                          <div><strong>Data:</strong> {item.dataVenda || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PAGAMENTO */}
                  <div
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      padding: 16,
                      lineHeight: 1.7,
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>Pagamento</h3>

                    <div>PIX para pagamento:</div>
                    <div>
                      Chave: <strong>CELULAR</strong> – <strong>41988921085</strong>
                    </div>

                    <br />

                    <div>🏦 Banco: <strong>cloudwalk</strong></div>
                    <div>👩‍💼 Nome: <strong>Kemilly Lima</strong></div>

                    <br />

                    <div>
                      💳 Cartão: solicitar link (até 12x com taxas)
                    </div>

                    <br />

                    <div>❌ Pode deixar em sacolinha se quiser</div>
                    <div>🚚 Solicitar envio para calcular frete</div>
                  </div>
                </div>
              )}

              {tipoPreview === "etiquetas" && Array.isArray(dadosPreview) && (
                <div style={{ display: "grid", gap: 0 }}>
                  {agruparEtiquetasEmPaginas(dadosPreview, 25).map((pagina, paginaIndex) => (
                    <div
                      key={paginaIndex}
                      className="pagina-etiquetas"
                      style={{
                        width: "210mm",
                        minHeight: "297mm",
                        padding: "10mm 4mm 6mm 4mm",
                        boxSizing: "border-box",
                        background: "#fff",
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 37mm)",
                        gridAutoRows: "46mm",
                        columnGap: "2mm",
                        rowGap: "3mm",
                        justifyContent: "center",
                        alignContent: "start",
                        pageBreakAfter: "always",
                      }}
                    >
                      {pagina.map((peca) => (
                        <EtiquetaPrint key={peca.id} peca={peca} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>
        {`
    @media print {
      body * {
        visibility: hidden !important;
      }

      #area-preview-impressao,
      #area-preview-impressao * {
        visibility: visible !important;
      }

      #area-preview-impressao {
        position: absolute !important;
        left: 0 !important;
        top: 1mm !important;
        width: 210mm !important;
        min-height: 297mm !important;
        background: #fff !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
      }

      .no-print {
        display: none !important;
      }

      .pagina-etiquetas {
        width: 210mm !important;
        min-height: 297mm !important;
        padding: 10mm 4mm 6mm 4mm !important;
        box-sizing: border-box !important;
        display: grid !important;
        grid-template-columns: repeat(5, 37mm) !important;
        grid-auto-rows: 46mm !important;
        column-gap: 2mm !important;
        row-gap: 3mm !important;
        justify-content: center !important;
        align-content: start !important;
        page-break-after: always !important;
        break-after: page !important;
      }

      .pagina-etiquetas:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }

      @page {
        size: A4 portrait;
        margin-top: 1mm;
        margin-left: 0;
        margin-right: 0;
        margin-bottom: 0;
      }

      html, body {
        width: 210mm !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  `}
      </style>
    </div>
  );
}

const topoApp = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 24,
};

const etiqueta40x46 = {
  width: "36mm",
  height: "42mm",
  padding: "1mm",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  fontFamily: "Arial, sans-serif",
  boxSizing: "border-box",
  textAlign: "center",
  overflow: "hidden",
  lineHeight: 1.05,
};

const inputCliente = {
  padding: 12,
  height: 48,
  borderRadius: 10,
  border: "1px solid #ccc",
  fontSize: 16,
  background: "#fff",
  boxSizing: "border-box",
  width: "100%",
};

const linhaResumo = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 20,
  marginBottom: 24,
};

const abasContainer = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 20,
};

const abaBotao = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid #d0d7e2",
  background: "#fff",
  color: "#111",
  fontSize: 15,
  cursor: "pointer",
  fontWeight: 600,
};

const abaBotaoAtiva = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  fontSize: 15,
  cursor: "pointer",
  fontWeight: 600,
};

const boxGrande = {
  border: "1px solid #dde3ec",
  borderRadius: 16,
  padding: 20,
  background: "#fff",
  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
};

const tituloSecao = {
  marginTop: 0,
  marginBottom: 16,
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
  borderRadius: 14,
  padding: 16,
  background: "#fafafa",
};

const semFoto = {
  width: "100%",
  minHeight: 220,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  border: "1px dashed #ccc",
  color: "#666",
  background: "#fff",
};

const gridForm = {
  display: "grid",
  gap: 12,
};

const input = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ccc",
  fontSize: 16,
  background: "#fff",
};

const botao = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  background: "#111",
  color: "#fff",
  fontSize: 15,
  cursor: "pointer",
  fontWeight: 600,
};

const botaoPequeno = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "none",
  color: "#fff",
  fontSize: 13,
  cursor: "pointer",
};

const gridPecas = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const cardPeca = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 14,
  background: "#fff",
};

const cardResumo = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 16,
  background: "#fff",
};

const valorResumo = {
  marginTop: 8,
  fontSize: 22,
  fontWeight: "bold",
};

const textoItem = {
  margin: "4px 0",
};

const linhaClienteTopo = {
  display: "grid",
  gridTemplateColumns: "1.5fr 1fr 1fr",
  gap: 12,
  alignItems: "center",
};

const cardCliente = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 14,
  background: "#fff",
};

const itemCliente = {
  border: "1px solid #eee",
  borderRadius: 10,
  padding: 10,
  background: "#fafafa",
};
