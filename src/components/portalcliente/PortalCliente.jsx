import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import logoKchic from "../../assets/logo-kchic.png";

function formatarBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataHoraBR(valor) {
  if (!valor) return "-";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";

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

function normalizarCodigo(valor) {
  return String(valor || "").trim().toUpperCase();
}

function statusPagamentoDasVendas(vendas) {
  if (!vendas.length) return "nenhum";
  return vendas.every((venda) => venda.status_pagamento === "pago")
    ? "pago"
    : "pendente";
}

function getParametroUrl(nome) {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get(nome) || "";
}

function normalizarRespostaPortal(data) {
  return {
    lives: Array.isArray(data?.lives) ? data.lives : [],
    sacolinha: data?.sacolinha || null,
    vendas: Array.isArray(data?.vendas) ? data.vendas : [],
    pecas: Array.isArray(data?.pecas) ? data.pecas : [],
    pedidoEnvio: data?.pedido_envio || null,
  };
}

export default function PortalCliente() {
  const tokenInicial =
    normalizarCodigo(getParametroUrl("t")) ||
    normalizarCodigo(getParametroUrl("token")) ||
    normalizarCodigo(getParametroUrl("sacolinha"));

  const [lives, setLives] = useState([]);
  const [liveId, setLiveId] = useState("");
  const [temLiveAberta, setTemLiveAberta] = useState(false);
  const [codigoPortal, setCodigoPortal] = useState(tokenInicial);
  const [sacolinhaAtual, setSacolinhaAtual] = useState(null);
  const [vendas, setVendas] = useState([]);
  const [pecas, setPecas] = useState({});
  const [pedidoEnvio, setPedidoEnvio] = useState(null);
  const [carregandoLives, setCarregandoLives] = useState(true);
  const [carregandoConsulta, setCarregandoConsulta] = useState(false);
  const [consultado, setConsultado] = useState(false);
  const [erro, setErro] = useState("");

  const liveDaSacolinhaId = sacolinhaAtual?.live_id || vendas[0]?.live_id || liveId;
  const liveSelecionada =
    lives.find((live) => String(live.id) === String(liveDaSacolinhaId)) ||
    lives.find((live) => String(live.id) === String(liveId));

  function aplicarLives(livesRecebidas) {
    const lista = Array.isArray(livesRecebidas) ? livesRecebidas : [];
    setLives(lista);

    const aberta = lista.find((live) => live.status === "aberta") || null;
    setTemLiveAberta(Boolean(aberta));

    if (aberta) {
      setLiveId(aberta.id);
      return;
    }

    if (lista.length) {
      setLiveId((atual) => atual || lista[0].id);
    }
  }

  function aplicarDadosSacolinha(payload) {
    const resposta = normalizarRespostaPortal(payload);
    aplicarLives(resposta.lives);

    setSacolinhaAtual(resposta.sacolinha);
    setVendas(resposta.vendas);
    setPedidoEnvio(resposta.pedidoEnvio);

    const mapa = {};
    resposta.pecas.forEach((peca) => {
      mapa[String(peca.id)] = peca;
    });
    setPecas(mapa);

    if (resposta.sacolinha?.live_id) {
      setLiveId(resposta.sacolinha.live_id);
    }

    return resposta;
  }

  async function carregarLives() {
    try {
      setCarregandoLives(true);
      setErro("");

      const { data, error } = await supabase.rpc("portal_cliente_dados", {
        p_codigo: null,
      });

      if (error) throw error;

      aplicarLives(normalizarRespostaPortal(data).lives);
    } catch (error) {
      console.error("ERRO AO CARREGAR LIVES DO PORTAL:", error);
      setErro("Não foi possível carregar as lives. Tente novamente em instantes.");
    } finally {
      setCarregandoLives(false);
    }
  }

  async function consultarSacolinha(
    codigoManual = codigoPortal,
    { silencioso = false } = {}
  ) {
    const codigo = normalizarCodigo(codigoManual);

    if (!codigo) {
      if (!silencioso) alert("Digite o código da sua sacolinha.");
      return;
    }

    try {
      if (!silencioso) {
        setErro("");
        setCarregandoConsulta(true);
        setConsultado(true);
      }

      const { data, error } = await supabase.rpc("portal_cliente_dados", {
        p_codigo: codigo,
      });

      if (error) throw error;

      const resposta = aplicarDadosSacolinha(data);

      if (!resposta.sacolinha) {
        setSacolinhaAtual(null);
        setVendas([]);
        setPecas({});
        setPedidoEnvio(null);
        if (!silencioso) {
          setErro("Não encontramos uma sacolinha com esse código.");
        }
      } else if (!silencioso) {
        setErro("");
      }
    } catch (error) {
      console.error("ERRO AO CONSULTAR PORTAL:", error);
      if (!silencioso) {
        setErro("Não foi possível consultar sua sacolinha agora.");
      }
    } finally {
      if (!silencioso) setCarregandoConsulta(false);
    }
  }

  useEffect(() => {
    carregarLives();
  }, []);

  useEffect(() => {
    if (tokenInicial) {
      consultarSacolinha(tokenInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O portal público não assina mais diretamente tabelas do banco.
  // Enquanto a sacolinha estiver aberta na tela, atualizamos via RPC controlada.
  useEffect(() => {
    if (!sacolinhaAtual?.id || !consultado || !codigoPortal) return undefined;

    const intervalo = window.setInterval(() => {
      consultarSacolinha(codigoPortal, { silencioso: true });
    }, 15000);

    return () => window.clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sacolinhaAtual?.id, codigoPortal, consultado]);

  const resumo = useMemo(() => {
    const total = vendas.reduce(
      (acc, venda) => acc + Number(venda.valor_venda || 0),
      0
    );

    const statusPagamento = statusPagamentoDasVendas(vendas);

    let statusOperacional = "nenhuma_sacolinha";
    let statusTexto = "Nenhuma peça confirmada para essa sacolinha";

    if (statusPagamento === "pendente") {
      statusOperacional = "aguardando_pagamento";
      statusTexto = "Pagamento pendente";
    }

    if (statusPagamento === "pago") {
      statusOperacional = "aguardando_envio";
      statusTexto = "Pagamento confirmado • aguardando solicitação de envio";
    }

    if (pedidoEnvio?.status === "montagem") {
      statusOperacional = "pedido_em_montagem";
      statusTexto = "Pedido de envio em montagem";
    }

    if (pedidoEnvio?.status === "enviado") {
      statusOperacional = "pedido_enviado";
      statusTexto = "Pedido enviado";
    }

    return {
      itensComprados: vendas,
      total,
      quantidade: vendas.length,
      statusPagamento,
      statusOperacional,
      statusTexto,
    };
  }, [vendas, pedidoEnvio]);

  const container = {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #fff7fa 0%, #ffffff 45%, #f8fafc 100%)",
    padding: "22px 14px 34px",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
    boxSizing: "border-box",
  };

  const card = {
    width: "100%",
    maxWidth: 540,
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #f3d7e2",
    borderRadius: 28,
    padding: 22,
    boxShadow: "0 18px 45px rgba(148, 43, 82, 0.10)",
    boxSizing: "border-box",
  };

  const input = {
    width: "100%",
    minHeight: 46,
    border: "1px solid #ead5dd",
    borderRadius: 14,
    padding: "0 14px",
    fontSize: 15,
    boxSizing: "border-box",
    outline: "none",
    background: "#fff",
    textTransform: "uppercase",
  };

  const botao = {
    width: "100%",
    minHeight: 48,
    border: "none",
    borderRadius: 14,
    background: "linear-gradient(135deg, #db4f7a, #ee7aa0)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(219,79,122,0.24)",
  };

  const resumoCard = {
    background: "#fff7fa",
    border: "1px solid #f4d7e1",
    borderRadius: 18,
    padding: 16,
    textAlign: "center",
  };

  const itemCard = {
    border: "1px solid #edf0f4",
    borderRadius: 18,
    padding: 14,
    background: "#fff",
    display: "grid",
    gap: 6,
  };

  const statusBox = {
    borderRadius: 16,
    padding: 14,
    fontWeight: 800,
    marginBottom: 18,
    textAlign: "center",
  };

  return (
    <div style={container}>
      <div style={{ ...card, textAlign: "center", marginBottom: 18 }}>
        <img
          src={logoKchic}
          alt="K.Chic"
          style={{
            width: 82,
            height: 82,
            objectFit: "contain",
            marginBottom: 8,
          }}
        />

        <h1 style={{ margin: "0 0 6px", fontSize: 28, color: "#db4f7a" }}>
          Minha Sacolinha
        </h1>

        <p style={{ margin: "0 0 22px", color: "#7b6470", fontSize: 14 }}>
          Consulte seus arremates da live K.Chic.
        </p>

        {temLiveAberta && liveSelecionada ? (
          <div
            style={{
              background: "#fff1f4",
              border: "1px solid #ffc7d6",
              borderRadius: 18,
              padding: 14,
              textAlign: "left",
              marginBottom: 18,
            }}
          >
            <strong style={{ color: "#be123c", fontSize: 13 }}>🔴 LIVE AO VIVO</strong>
            <div style={{ marginTop: 8, fontWeight: 800 }}>{liveSelecionada.nome}</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8, textAlign: "left", marginBottom: 14 }}>
            <label style={{ fontWeight: 700, fontSize: 13 }}>Últimas lives</label>
            <select
              style={{ ...input, textTransform: "none" }}
              value={liveId}
              disabled={carregandoLives || lives.length === 0}
              onChange={(e) => setLiveId(e.target.value)}
            >
              {lives.length === 0 ? (
                <option value="">
                  {carregandoLives ? "Carregando lives..." : "Nenhuma live encontrada"}
                </option>
              ) : (
                lives.map((live) => (
                  <option key={live.id} value={live.id}>
                    {live.nome}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <div style={{ display: "grid", gap: 12, textAlign: "left" }}>
          <label style={{ fontWeight: 700, fontSize: 13 }}>Código da sacolinha</label>

          <input
            style={input}
            placeholder="Ex.: KC8M4PZ2"
            value={codigoPortal}
            onChange={(e) => {
              setCodigoPortal(normalizarCodigo(e.target.value));
              setConsultado(false);
              setVendas([]);
              setPecas({});
              setPedidoEnvio(null);
              setSacolinhaAtual(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") consultarSacolinha();
            }}
          />

          <button type="button" style={botao} onClick={() => consultarSacolinha()}>
            {carregandoConsulta ? "Consultando..." : "Consultar minha sacolinha"}
          </button>
        </div>
      </div>

      {erro ? (
        <div
          style={{
            ...card,
            borderColor: "#fecaca",
            color: "#b91c1c",
            background: "#fff5f5",
            marginBottom: 18,
          }}
        >
          {erro}
        </div>
      ) : null}

      {consultado && !erro && (
        <div style={card}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 22 }}>
              Olá, {sacolinhaAtual?.cliente_nome || "cliente"}! 🤎
            </h2>

            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
              {liveSelecionada?.nome || "Live da sacolinha"}
            </p>
          </div>

          <div
            style={{
              background: "#fff8db",
              border: "1px solid #f5dc7a",
              borderRadius: 14,
              padding: 12,
              color: "#8a6400",
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.35,
            }}
          >
            ⚠️ Essa é uma prévia da sua sacolinha. Os itens e valores podem ser
            conferidos pela equipe K.Chic antes do fechamento final.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={resumoCard}>
              <div style={{ fontSize: 12, color: "#8a6473", fontWeight: 700 }}>
                PEÇAS
              </div>
              <strong style={{ fontSize: 28 }}>{resumo.quantidade}</strong>
            </div>

            <div style={resumoCard}>
              <div style={{ fontSize: 12, color: "#8a6473", fontWeight: 700 }}>
                TOTAL
              </div>
              <strong style={{ fontSize: 24, color: "#db4f7a" }}>
                {formatarBRL(resumo.total)}
              </strong>
            </div>
          </div>

          <div
            style={{
              ...statusBox,
              background:
                resumo.statusOperacional === "pedido_enviado"
                  ? "#ecfdf5"
                  : resumo.statusOperacional === "pedido_em_montagem"
                  ? "#eff6ff"
                  : resumo.statusOperacional === "aguardando_envio"
                  ? "#f0fdf4"
                  : resumo.statusOperacional === "aguardando_pagamento"
                  ? "#fff7ed"
                  : "#f8fafc",
              border:
                resumo.statusOperacional === "pedido_enviado"
                  ? "1px solid #bbf7d0"
                  : resumo.statusOperacional === "pedido_em_montagem"
                  ? "1px solid #bfdbfe"
                  : resumo.statusOperacional === "aguardando_envio"
                  ? "1px solid #bbf7d0"
                  : resumo.statusOperacional === "aguardando_pagamento"
                  ? "1px solid #fed7aa"
                  : "1px solid #e2e8f0",
              color:
                resumo.statusOperacional === "pedido_enviado"
                  ? "#15803d"
                  : resumo.statusOperacional === "pedido_em_montagem"
                  ? "#1d4ed8"
                  : resumo.statusOperacional === "aguardando_envio"
                  ? "#15803d"
                  : resumo.statusOperacional === "aguardando_pagamento"
                  ? "#b45309"
                  : "#64748b",
            }}
          >
            {resumo.statusTexto}
          </div>

          {pedidoEnvio ? (
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                padding: 14,
                background: "#f8fafc",
                marginBottom: 16,
                display: "grid",
                gap: 8,
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: "#111827" }}>🚚 Acompanhamento do envio</strong>

              <div style={{ fontSize: 13, color: "#475569" }}>
                Status: <strong>{pedidoEnvio.status === "enviado" ? "Enviado" : "Em montagem"}</strong>
              </div>

              {pedidoEnvio.transportadora ? (
                <div style={{ fontSize: 13, color: "#475569" }}>
                  Transportadora: <strong>{pedidoEnvio.transportadora}</strong>
                </div>
              ) : null}

              {pedidoEnvio.codigo_rastreio ? (
                <div style={{ fontSize: 13, color: "#475569" }}>
                  Código de rastreio: <strong>{pedidoEnvio.codigo_rastreio}</strong>
                </div>
              ) : null}

              {pedidoEnvio.link_rastreio ? (
                <a
                  href={pedidoEnvio.link_rastreio}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: 42,
                    marginTop: 4,
                    borderRadius: 14,
                    background: "#db4f7a",
                    color: "#fff",
                    fontWeight: 800,
                    textDecoration: "none",
                  }}
                >
                  Acompanhar rastreio
                </a>
              ) : pedidoEnvio.status === "enviado" ? (
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  O pedido foi marcado como enviado. O código de rastreio será exibido aqui assim que for informado.
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Seu pedido está sendo preparado. Assim que for enviado, o rastreio aparecerá aqui.
                </div>
              )}
            </div>
          ) : resumo.statusPagamento === "pago" ? (
            <div
              style={{
                border: "1px solid #bbf7d0",
                borderRadius: 18,
                padding: 14,
                background: "#f0fdf4",
                color: "#166534",
                marginBottom: 16,
                lineHeight: 1.4,
                fontSize: 13,
              }}
            >
              ✅ Pagamento confirmado. Quando você solicitar o envio e o pedido for gerado, o acompanhamento aparecerá aqui.
            </div>
          ) : null}

          <h3 style={{ margin: "0 0 12px" }}>Peças arrematadas</h3>

          {resumo.itensComprados.length === 0 ? (
            <div
              style={{
                border: "1px dashed #cbd5e1",
                borderRadius: 18,
                padding: 20,
                color: "#64748b",
                textAlign: "center",
              }}
            >
              Nenhuma peça encontrada para esse código de sacolinha.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {resumo.itensComprados.map((venda, index) => {
                const peca = pecas[String(venda.peca_id)] || {};

                return (
                  <div key={venda.id || index} style={itemCard}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <strong style={{ fontSize: 15 }}>
                        {venda.nome_peca || peca.nome || "Peça"}
                      </strong>

                      <strong style={{ color: "#db4f7a", whiteSpace: "nowrap" }}>
                        {formatarBRL(venda.valor_venda)}
                      </strong>
                    </div>

                    <div style={{ fontSize: 13, color: "#475569" }}>
                      Código: <strong>{venda.peca_id}</strong>
                    </div>

                    <div style={{ fontSize: 13, color: "#475569" }}>
                      Vendido em: {formatarDataHoraBR(venda.data_hora)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
