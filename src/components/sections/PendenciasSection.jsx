import { useMemo, useState } from "react";

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

  const botaoFiltro = (ativo, cor = "#111827") => ({
    ...botaoPequeno,
    background: ativo ? cor : "#6b7280",
    width: isMobile ? "100%" : "auto",
    minHeight: 36,
    borderRadius: 12,
    boxShadow: "none",
  });

  const cardPendente = {
    ...cardCliente,
    padding: isMobile ? 14 : 16,
    display: "grid",
    gap: 12,
  };

  const linhaCard = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "minmax(220px, 1.3fr) minmax(150px, 0.8fr) minmax(220px, 1fr)",
    gap: 12,
    alignItems: "center",
    cursor: "pointer",
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={boxGrande}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={tituloSecao}>Pendências de Pagamento</h2>
            <p style={{ margin: "-6px 0 0", color: "#64748b", fontSize: 14 }}>
              Clientes com peças vendidas e pagamento pendente.
            </p>
          </div>
        </div>

        <div className="linha-resumo" style={{ ...linhaResumo, marginTop: 18 }}>
          <div style={cardResumo}>
            <strong>Clientes pendentes</strong>
            <div style={valorResumo}>{resumo.clientes}</div>
          </div>

          <div style={cardResumo}>
            <strong>Peças pendentes</strong>
            <div style={valorResumo}>{resumo.pecas}</div>
          </div>

          <div style={cardResumo}>
            <strong>Valor em aberto</strong>
            <div style={valorResumo}>{formatarBRL(resumo.valor)}</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 18,
          }}
        >
          <input
            style={{ ...input, maxWidth: isMobile ? "100%" : 340 }}
            placeholder="Buscar cliente pendente"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <button
            type="button"
            style={botaoFiltro(filtro === "todas")}
            onClick={() => setFiltro("todas")}
          >
            Todas
          </button>

          <button
            type="button"
            style={botaoFiltro(filtro === "liveAtual", "#2563eb")}
            onClick={() => setFiltro("liveAtual")}
          >
            Live atual
          </button>

          <button
            type="button"
            style={botaoFiltro(filtro === "maisAntigas", "#b45309")}
            onClick={() => setFiltro("maisAntigas")}
          >
            +7 dias
          </button>
        </div>
      </div>

      <div style={boxGrande}>
        <h3 style={{ marginTop: 0, marginBottom: 14 }}>Clientes pendentes</h3>

        {pendenciasFiltradas.length === 0 ? (
          <div
            style={{
              border: "1px dashed #cbd5e1",
              borderRadius: 18,
              padding: 22,
              background: "#f8fafc",
              color: "#64748b",
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandirCliente(clienteResumo.nome);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 18,
                            padding: "4px 6px",
                            lineHeight: 1,
                            width: "auto",
                            minWidth: "auto",
                          }}
                        >
                          {expandido ? "▼" : "▶"}
                        </button>

                        <strong
                          style={{
                            fontSize: isMobile ? 16 : 18,
                            color: "#111827",
                            wordBreak: "break-word",
                          }}
                        >
                          {clienteResumo.nome}
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 4 }}>
                      <strong style={{ color: "#b45309", fontSize: isMobile ? 18 : 20 }}>
                        {formatarBRL(clienteResumo.total)}
                      </strong>

                      <span style={{ color: "#64748b", fontSize: 13 }}>
                        {clienteResumo.pecas} peça(s) pendente(s)
                      </span>
                    </div>

                    <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.35 }}>
                      <div>
                        <strong>Lives:</strong> {livesTexto || "-"}
                        {clienteResumo.livesLista.length > 3 ? "..." : ""}
                      </div>

                      <div>
                        <strong>Última venda:</strong>{" "}
                        {formatarDataHoraBR(clienteResumo.liveData) || "-"}
                      </div>
                    </div>
                  </div>

                  {expandido && (
                    <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        {clienteResumo.itens.map((item, index) => (
                          <div
                            key={item.vendaId || `${item.codigo}-${index}`}
                            style={{
                              ...itemCliente,
                              padding: isMobile ? 10 : 12,
                              borderRadius: 12,
                              display: "grid",
                              gap: 4,
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

                      <button
                        type="button"
                        style={{
                          ...botaoPequeno,
                          background: "#15803d",
                          width: "100%",
                          minHeight: 40,
                          borderRadius: 12,
                        }}
                        onClick={() => marcarClientePendenteComoPago(clienteResumo)}
                      >
                        Confirmar pagamento
                      </button>
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