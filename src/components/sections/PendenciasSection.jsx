import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Package,
  Radio,
  Search,
  Users,
  Wallet,
} from "lucide-react";

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getTimestampVenda(valor) {
  if (!valor) return 0;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? 0 : data.getTime();
}

function BotaoIcone({
  icon,
  label,
  onClick,
  active = false,
  color = "#8f2745",
  disabled = false,
  full = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      style={{
        minHeight: 40,
        minWidth: full ? "100%" : 40,
        width: full ? "100%" : "auto",
        padding: full ? "9px 13px" : "9px 12px",
        borderRadius: 13,
        border: active ? `1px solid ${color}` : "1px solid #e2e8f0",
        background: active ? color : "#fff",
        color: active ? "#fff" : "#334155",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        fontWeight: 700,
        fontSize: 13,
        lineHeight: 1,
        boxShadow: active
          ? "0 8px 18px rgba(143,39,69,0.18)"
          : "0 2px 8px rgba(15,23,42,0.05)",
      }}
    >
      {icon}
      {full ? <span>{label}</span> : null}
    </button>
  );
}

function ResumoCard({ icon, label, value, accent = "#8f2745", cardResumo }) {
  return (
    <div
      style={{
        ...cardResumo,
        padding: 12,
        borderRadius: 18,
        border: "1px solid #eef2f7",
        background: "#fff",
        boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
        display: "grid",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <strong
          style={{
            fontSize: 26,
            lineHeight: 1,
            color: "#243746",
          }}
        >
          {value}
        </strong>

        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            background: `${accent}12`,
            color: accent,
            border: `1px solid ${accent}26`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </span>
      </div>

      <span
        style={{
          color: "#64748b",
          fontSize: 12.5,
          fontWeight: 800,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function PendenciasSection({
  boxGrande,
  tituloSecao,
  linhaResumo,
  cardResumo,
  valorResumo,
  cardCliente,
  itemCliente,
  input,
  botaoPequeno,
  isMobile,
  todasVendasLive,
  mapaPecasPorId,
  mapaLivesPorId,
  liveAtual,
  formatarBRL,
  formatarDataHoraBR,
  marcarClientePendenteComoPago,
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [clientesExpandidas, setClientesExpandidas] = useState({});

  const pendencias = useMemo(() => {
    const mapa = new Map();

    (todasVendasLive || []).forEach((venda) => {
      const status = String(venda?.status_pagamento || "pendente").toLowerCase();
      if (status === "pago") return;

      const nomeCliente = String(venda?.cliente_nome || "Sem nome").trim() || "Sem nome";
      const chaveCliente = normalizarTexto(nomeCliente) || nomeCliente;
      const peca = mapaPecasPorId?.[String(venda?.peca_id)] || {};
      const live = mapaLivesPorId?.[String(venda?.live_id)] || {};
      const valor = Number(venda?.valor_venda || 0);
      const dataVenda = venda?.data_hora || venda?.criado_em || venda?.data_venda || "";

      if (!mapa.has(chaveCliente)) {
        mapa.set(chaveCliente, {
          nome: nomeCliente,
          total: 0,
          pecas: 0,
          pago: false,
          itens: [],
          vendaIdsPendentes: [],
          lives: new Map(),
          dataMaisRecenteTimestamp: 0,
          liveData: null,
        });
      }

      const grupo = mapa.get(chaveCliente);

      grupo.total += valor;
      grupo.pecas += 1;
      grupo.vendaIdsPendentes.push(venda.id);

      if (venda?.live_id) {
        const liveId = String(venda.live_id);
        grupo.lives.set(liveId, {
          id: liveId,
          nome: live?.nome || liveId,
          data: live?.data_live || live?.criado_em || "",
        });
      }

      const timestamp = getTimestampVenda(dataVenda);

      if (timestamp > grupo.dataMaisRecenteTimestamp) {
        grupo.dataMaisRecenteTimestamp = timestamp;
        grupo.liveData = dataVenda;
      }

      grupo.itens.push({
        vendaId: venda.id,
        codigo: venda.peca_id || "-",
        nomePeca: venda.nome_peca || peca?.nome || venda.peca_id || "-",
        valor,
        dataVenda,
        liveId: venda.live_id || "",
        liveNome: live?.nome || venda.live_id || "-",
        sacolinhaId: venda.sacolinha_id || "",
        filaEspera: venda.fila_espera_nome || "",
      });
    });

    return Array.from(mapa.values())
      .map((cliente) => ({
        ...cliente,
        livesLista: Array.from(cliente.lives.values()),
        itens: cliente.itens.sort(
          (a, b) => getTimestampVenda(b.dataVenda) - getTimestampVenda(a.dataVenda)
        ),
      }))
      .sort((a, b) => b.total - a.total);
  }, [todasVendasLive, mapaPecasPorId, mapaLivesPorId]);

  const pendenciasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);
    const liveAtualId = String(liveAtual?.id || "");

    return pendencias.filter((cliente) => {
      const bateBusca = !termo || normalizarTexto(cliente.nome).includes(termo);
      if (!bateBusca) return false;

      if (filtro === "liveAtual") {
        if (!liveAtualId) return false;
        return cliente.itens.some((item) => String(item.liveId) === liveAtualId);
      }

      if (filtro === "maisAntigas") {
        const agora = Date.now();
        const seteDias = 7 * 24 * 60 * 60 * 1000;

        return (
          cliente.dataMaisRecenteTimestamp > 0 &&
          agora - cliente.dataMaisRecenteTimestamp >= seteDias
        );
      }

      return true;
    });
  }, [pendencias, busca, filtro, liveAtual]);

  const resumo = useMemo(() => {
    return pendenciasFiltradas.reduce(
      (acc, cliente) => {
        acc.clientes += 1;
        acc.pecas += cliente.pecas;
        acc.valor += cliente.total;
        return acc;
      },
      { clientes: 0, pecas: 0, valor: 0 }
    );
  }, [pendenciasFiltradas]);

  function toggleExpandirCliente(nome) {
    setClientesExpandidas((prev) => ({
      ...prev,
      [nome]: !prev[nome],
    }));
  }

  const inputBusca = {
    ...input,
    width: "100%",
    maxWidth: "100%",
    minHeight: 40,
    borderRadius: 14,
    boxShadow: "none",
    paddingLeft: 42,
  };

  const cardPendente = {
    ...cardCliente,
    padding: isMobile ? 11 : 13,
    display: "grid",
    gap: 8,
    borderRadius: 18,
    boxShadow: "0 3px 12px rgba(15,23,42,0.05)",
    border: "1px solid #eef2f7",
  };

  const linhaCard = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "minmax(240px, 1.3fr) minmax(150px, 0.8fr) minmax(240px, 1fr) auto",
    gap: 10,
    alignItems: "center",
    cursor: "pointer",
  };

  const badge = (background, color = "#fff") => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    width: "fit-content",
    padding: "5px 9px",
    borderRadius: 999,
    background,
    color,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={boxGrande}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={tituloSecao}>Pendências de Pagamento</h2>
            <p style={{ margin: "-6px 0 0", color: "#64748b", fontSize: 14 }}>
              Controle das clientes com valores em aberto.
            </p>
          </div>

          <span style={badge("#fef3c7", "#92400e")}>
            <AlertTriangle size={14} />
            Acompanhar
          </span>
        </div>

        <div
          className="linha-resumo"
          style={{
            ...linhaResumo,
            marginTop: 12,
            gap: 8,
          }}
        >
          <ResumoCard
            icon={<Users size={20} />}
            label="Clientes pendentes"
            value={resumo.clientes}
            accent="#8f2745"
            cardResumo={cardResumo}
            valorResumo={valorResumo}
          />

          <ResumoCard
            icon={<Package size={20} />}
            label="Peças pendentes"
            value={resumo.pecas}
            accent="#2563eb"
            cardResumo={cardResumo}
            valorResumo={valorResumo}
          />

          <ResumoCard
            icon={<Wallet size={20} />}
            label="Valor em aberto"
            value={formatarBRL(resumo.valor)}
            accent="#b45309"
            cardResumo={cardResumo}
            valorResumo={valorResumo}
          />
        </div>

        <div
          style={{
            marginTop: 12,
            padding: isMobile ? 9 : 10,
            border: "1px solid #eef2f7",
            borderRadius: 16,
            background: "#fcfdff",
            boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(280px, 1fr) auto auto auto",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                pointerEvents: "none",
              }}
            />

            <input
              style={inputBusca}
              placeholder="Buscar cliente pendente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <BotaoIcone
            icon={<Users size={17} />}
            label="Todas"
            active={filtro === "todas"}
            color="#111827"
            full={isMobile}
            onClick={() => setFiltro("todas")}
          />

          <BotaoIcone
            icon={<Radio size={17} />}
            label="Live atual"
            active={filtro === "liveAtual"}
            color="#2563eb"
            full={isMobile}
            onClick={() => setFiltro("liveAtual")}
          />

          <BotaoIcone
            icon={<Clock size={17} />}
            label="+7 dias"
            active={filtro === "maisAntigas"}
            color="#b45309"
            full={isMobile}
            onClick={() => setFiltro("maisAntigas")}
          />
        </div>
      </div>

      <div style={boxGrande}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <h3 style={{ margin: 0, fontSize: isMobile ? 17 : 19 }}>
            Clientes pendentes
          </h3>

          <span style={{ color: "#64748b", fontSize: 13 }}>
            {pendenciasFiltradas.length} resultado(s)
          </span>
        </div>

        {pendenciasFiltradas.length === 0 ? (
          <div
            style={{
              border: "1px dashed #cbd5e1",
              borderRadius: 16,
              padding: 16,
              background: "#f8fafc",
              color: "#64748b",
              textAlign: "center",
            }}
          >
            Nenhuma pendência encontrada para o filtro atual.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {pendenciasFiltradas.map((clienteResumo) => {
              const expandido = !!clientesExpandidas[clienteResumo.nome];

              const livesTexto = clienteResumo.livesLista
                .map((live) => live.nome)
                .filter(Boolean)
                .slice(0, 3)
                .join(", ");

              return (
                <div key={clienteResumo.nome} style={cardPendente}>
                  <div
                    style={linhaCard}
                    onClick={() => toggleExpandirCliente(clienteResumo.nome)}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandirCliente(clienteResumo.nome);
                          }}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 13,
                            border: "1px solid #e2e8f0",
                            background: expandido ? "#8f2745" : "#fff",
                            color: expandido ? "#fff" : "#334155",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
                          }}
                        >
                          {expandido ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        <div style={{ minWidth: 0 }}>
                          <strong
                            style={{
                              display: "block",
                              fontSize: isMobile ? 16 : 18,
                              color: "#111827",
                              wordBreak: "break-word",
                              lineHeight: 1.15,
                            }}
                          >
                            {clienteResumo.nome}
                          </strong>

                          <span style={{ color: "#64748b", fontSize: 12 }}>
                            {clienteResumo.pecas} peça(s) em aberto
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 3 }}>
                      <strong style={{ color: "#b45309", fontSize: isMobile ? 18 : 21 }}>
                        {formatarBRL(clienteResumo.total)}
                      </strong>

                      <span style={badge("#fef3c7", "#92400e")}>
                        <CreditCard size={13} />
                        Pendente
                      </span>
                    </div>

                    <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.4 }}>
                      <div>
                        <strong>Lives:</strong> {livesTexto || "-"}
                        {clienteResumo.livesLista.length > 3 ? "..." : ""}
                      </div>

                      <div>
                        <strong>Última venda:</strong>{" "}
                        {formatarDataHoraBR(clienteResumo.liveData) || "-"}
                      </div>
                    </div>

                    {!isMobile ? (
                      <BotaoIcone
                        icon={expandido ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        label={expandido ? "Minimizar" : "Expandir"}
                        active={expandido}
                        color="#8f2745"
                        onClick={(e) => {
                          if (e?.stopPropagation) e.stopPropagation();
                          toggleExpandirCliente(clienteResumo.nome);
                        }}
                      />
                    ) : null}
                  </div>

                  {expandido && (
                    <div style={{ display: "grid", gap: 8, marginTop: 2 }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        {clienteResumo.itens.map((item, index) => (
                          <div
                            key={item.vendaId || `${item.codigo}-${index}`}
                            style={{
                              ...itemCliente,
                              padding: isMobile ? 10 : 12,
                              borderRadius: 14,
                              display: "grid",
                              gap: 5,
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div>
                              <strong>{index + 1}. Peça:</strong> {item.nomePeca}
                            </div>

                            <div>
                              <strong>Código:</strong> {item.codigo}
                            </div>

                            <div>
                              <strong>Valor:</strong> {formatarBRL(item.valor)}
                            </div>

                            <div>
                              <strong>Live:</strong> {item.liveNome || "-"}
                            </div>

                            <div>
                              <strong>Data:</strong>{" "}
                              {formatarDataHoraBR(item.dataVenda) || "-"}
                            </div>
                          </div>
                        ))}
                      </div>

                      <BotaoIcone
                        icon={<CheckCircle2 size={18} />}
                        label="Confirmar pagamento"
                        active
                        color="#15803d"
                        full
                        onClick={() => marcarClientePendenteComoPago(clienteResumo)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
