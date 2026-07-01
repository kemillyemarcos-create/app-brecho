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
  const [carregandoLives, setCarregandoLives] = useState(true);
  const [carregandoConsulta, setCarregandoConsulta] = useState(false);
  const [consultado, setConsultado] = useState(false);
  const [erro, setErro] = useState("");

  const liveDaSacolinhaId = sacolinhaAtual?.live_id || vendas[0]?.live_id || liveId;
  const liveSelecionada =
    lives.find((live) => String(live.id) === String(liveDaSacolinhaId)) ||
    lives.find((live) => String(live.id) === String(liveId));

  async function carregarLives() {
    try {
      setCarregandoLives(true);
      setErro("");

      const { data: liveAberta, error: erroAberta } = await supabase
        .from("lives")
        .select("*")
        .eq("status", "aberta")
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (erroAberta) {
        console.error("ERRO AO CARREGAR LIVE ABERTA DO PORTAL:", erroAberta);
        setErro("Não foi possível carregar a live atual. Tente novamente em instantes.");
        return;
      }

      if (liveAberta) {
        setTemLiveAberta(true);
        setLives([liveAberta]);
        setLiveId(liveAberta.id);
        return;
      }

      setTemLiveAberta(false);

      const { data, error } = await supabase
        .from("lives")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(3);

      if (error) {
        console.error("ERRO AO CARREGAR ÚLTIMAS LIVES DO PORTAL:", error);
        setErro("Não foi possível carregar as lives. Tente novamente em instantes.");
        return;
      }

      setLives(data || []);

      if (!liveId && data?.length) {
        setLiveId(data[0].id);
      }
    } finally {
      setCarregandoLives(false);
    }
  }

  async function buscarSacolinhaPorCodigo(codigo) {
    const token = normalizarCodigo(codigo);
    if (!token) return null;

    const { data: porToken, error: erroToken } = await supabase
      .from("sacolinhas_live")
      .select("*")
      .eq("portal_token", token)
      .maybeSingle();

    if (erroToken) throw erroToken;
    if (porToken) return porToken;

    // Compatibilidade temporária: permite consultar pelo ID antigo da sacolinha.
    const { data: porId, error: erroId } = await supabase
      .from("sacolinhas_live")
      .select("*")
      .eq("id", codigo)
      .maybeSingle();

    if (erroId) throw erroId;
    return porId || null;
  }

  async function consultarSacolinha(codigoManual = codigoPortal) {
    const codigo = normalizarCodigo(codigoManual);

    if (!codigo) {
      alert("Digite o código da sua sacolinha.");
      return;
    }

    try {
      setErro("");
      setCarregandoConsulta(true);
      setConsultado(true);

      const sacolinha = await buscarSacolinhaPorCodigo(codigo);

      if (!sacolinha) {
        setSacolinhaAtual(null);
        setVendas([]);
        setPecas({});
        setErro("Não encontramos uma sacolinha com esse código.");
        return;
      }

      setSacolinhaAtual(sacolinha);

      if (sacolinha.live_id) {
        setLiveId(sacolinha.live_id);
      }

      const { data, error } = await supabase
        .from("vendas_live")
        .select("*")
        .eq("sacolinha_id", sacolinha.id)
        .order("data_hora", { ascending: false });

      if (error) {
        console.error("ERRO AO CONSULTAR SACOLINHA:", error);
        setErro("Não foi possível consultar sua sacolinha agora.");
        return;
      }

      const vendasDaSacolinha = data || [];
      setVendas(vendasDaSacolinha);

      const idsPecas = [
        ...new Set(vendasDaSacolinha.map((venda) => venda.peca_id).filter(Boolean)),
      ];

      if (idsPecas.length === 0) {
        setPecas({});
        return;
      }

      const { data: pecasData, error: erroPecas } = await supabase
        .from("pecas")
        .select("*")
        .in("id", idsPecas);

      if (erroPecas) {
        console.error("ERRO AO BUSCAR PEÇAS DO PORTAL:", erroPecas);
        return;
      }

      const mapa = {};
      (pecasData || []).forEach((peca) => {
        mapa[String(peca.id)] = peca;
      });

      setPecas(mapa);
    } catch (error) {
      console.error("ERRO AO CONSULTAR PORTAL:", error);
      setErro("Não foi possível consultar sua sacolinha agora.");
    } finally {
      setCarregandoConsulta(false);
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

  useEffect(() => {
    if (!sacolinhaAtual?.id || !consultado) return undefined;

    const canal = supabase
      .channel(`portal-cliente-sacolinha-${sacolinhaAtual.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vendas_live",
          filter: `sacolinha_id=eq.${sacolinhaAtual.id}`,
        },
        () => {
          consultarSacolinha(codigoPortal);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [sacolinhaAtual?.id, codigoPortal, consultado]);

  const resumo = useMemo(() => {
    const total = vendas.reduce(
      (acc, venda) => acc + Number(venda.valor_venda || 0),
      0
    );

    return {
      itensComprados: vendas,
      total,
      quantidade: vendas.length,
      statusPagamento: statusPagamentoDasVendas(vendas),
    };
  }, [vendas]);

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
                resumo.statusPagamento === "pago"
                  ? "#ecfdf5"
                  : resumo.statusPagamento === "pendente"
                  ? "#fff7ed"
                  : "#f8fafc",
              border:
                resumo.statusPagamento === "pago"
                  ? "1px solid #bbf7d0"
                  : resumo.statusPagamento === "pendente"
                  ? "1px solid #fed7aa"
                  : "1px solid #e2e8f0",
              color:
                resumo.statusPagamento === "pago"
                  ? "#15803d"
                  : resumo.statusPagamento === "pendente"
                  ? "#b45309"
                  : "#64748b",
            }}
          >
            {resumo.statusPagamento === "pago"
              ? "Pagamento confirmado"
              : resumo.statusPagamento === "pendente"
              ? "Pagamento pendente"
              : "Nenhuma peça confirmada para essa sacolinha"}
          </div>

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
