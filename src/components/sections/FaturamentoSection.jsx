import {
  BarChart3,
  CalendarDays,
  Download,
  Eraser,
  PackageCheck,
  ReceiptText,
  Trophy,
  Wallet,
} from "lucide-react";

function formatarDataParaInput(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function getHojeIso() {
  return formatarDataParaInput(new Date());
}

function getDataDiasAtrasIso(dias) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return formatarDataParaInput(data);
}

function IconeCard({ children, background = "#f8fafc", color = "#8f2745" }) {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 14,
        background,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #e2e8f0",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function BotaoIcone({ icon, children, onClick, ativo = false, background = "#fff", color = "#334155", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 40,
        padding: "9px 13px",
        borderRadius: 14,
        border: ativo ? "1px solid #8f2745" : "1px solid #e2e8f0",
        background: ativo ? "#fff5f8" : background,
        color: ativo ? "#8f2745" : color,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontWeight: 700,
        fontSize: 13,
        boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function CardResumoFaturamento({ icon, label, value, helper, destaque = false }) {
  return (
    <div
      style={{
        border: destaque ? "1px solid #f2dfe5" : "1px solid #e8edf2",
        borderRadius: 20,
        background: destaque ? "linear-gradient(135deg, #fff7fa 0%, #ffffff 70%)" : "#fff",
        padding: 16,
        display: "grid",
        gap: 10,
        boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icon}
        <strong style={{ color: "#475569", fontSize: 13 }}>{label}</strong>
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: destaque ? "#8f2745" : "#111827",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      {helper ? <div style={{ color: "#64748b", fontSize: 12 }}>{helper}</div> : null}
    </div>
  );
}

export default function FaturamentoSection({
  boxGrande,
  tituloSecao,
  input,
  isMobile,
  dataInicialFiltro,
  setDataInicialFiltro,
  dataFinalFiltro,
  setDataFinalFiltro,
  exportarRelatorioCSV,
  resumoFaturamentoPorLive,
  faturamentoFiltrado,
  lucroFiltrado,
  quantidadeVendidaFiltrada,
  ticketMedioFiltrado,
  formatarBRL,
}) {
  const margemLucro = faturamentoFiltrado > 0 ? (lucroFiltrado / faturamentoFiltrado) * 100 : 0;

  const topLives = [...(resumoFaturamentoPorLive || [])]
    .filter((live) => Number(live?.faturamento || 0) > 0)
    .sort((a, b) => Number(b.faturamento || 0) - Number(a.faturamento || 0))
    .slice(0, 3);

  function aplicarFiltroHoje() {
    const hoje = getHojeIso();
    setDataInicialFiltro(hoje);
    setDataFinalFiltro(hoje);
  }

  function aplicarFiltroDias(dias) {
    setDataInicialFiltro(getDataDiasAtrasIso(dias));
    setDataFinalFiltro(getHojeIso());
  }

  function limparFiltro() {
    setDataInicialFiltro("");
    setDataFinalFiltro("");
  }

  const periodoSelecionado = dataInicialFiltro || dataFinalFiltro;

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div style={boxGrande}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={tituloSecao}>Faturamento</h2>
            <p style={{ margin: "-6px 0 0", color: "#64748b", fontSize: 14 }}>
              Visão financeira por período e por live.
            </p>
          </div>

          <BotaoIcone
            icon={<Download size={17} />}
            onClick={exportarRelatorioCSV}
            background="#111827"
            color="#fff"
          >
            Exportar relatório
          </BotaoIcone>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <CardResumoFaturamento
            destaque
            icon={
              <IconeCard background="#fff0f5" color="#8f2745">
                <Wallet size={19} />
              </IconeCard>
            }
            label="Faturamento"
            value={formatarBRL(faturamentoFiltrado)}
            helper={periodoSelecionado ? "Período filtrado" : "Todas as vendas"}
          />

          <CardResumoFaturamento
            icon={
              <IconeCard>
                <BarChart3 size={19} />
              </IconeCard>
            }
            label="Lucro estimado"
            value={formatarBRL(lucroFiltrado)}
            helper={`Margem ${margemLucro.toFixed(1).replace(".", ",")}%`}
          />

          <CardResumoFaturamento
            icon={
              <IconeCard>
                <PackageCheck size={19} />
              </IconeCard>
            }
            label="Peças vendidas"
            value={quantidadeVendidaFiltrada}
            helper="Quantidade no período"
          />

          <CardResumoFaturamento
            icon={
              <IconeCard>
                <ReceiptText size={19} />
              </IconeCard>
            }
            label="Ticket médio"
            value={formatarBRL(ticketMedioFiltrado)}
            helper="Média por peça vendida"
          />
        </div>

        <div
          style={{
            marginTop: 18,
            padding: isMobile ? 12 : 14,
            borderRadius: 18,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#334155", fontWeight: 800 }}>
            <CalendarDays size={18} />
            Filtros de período
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(150px, 190px) minmax(150px, 190px) 1fr",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Data inicial</label>
              <input
                type="date"
                style={{ ...input, width: "100%" }}
                value={dataInicialFiltro}
                onChange={(e) => setDataInicialFiltro(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Data final</label>
              <input
                type="date"
                style={{ ...input, width: "100%" }}
                value={dataFinalFiltro}
                onChange={(e) => setDataFinalFiltro(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: isMobile ? "stretch" : "flex-start",
              }}
            >
              <BotaoIcone icon={<CalendarDays size={16} />} onClick={aplicarFiltroHoje} ativo={dataInicialFiltro === getHojeIso() && dataFinalFiltro === getHojeIso()}>
                Hoje
              </BotaoIcone>

              <BotaoIcone icon={<CalendarDays size={16} />} onClick={() => aplicarFiltroDias(7)}>
                7 dias
              </BotaoIcone>

              <BotaoIcone icon={<CalendarDays size={16} />} onClick={() => aplicarFiltroDias(30)}>
                30 dias
              </BotaoIcone>

              <BotaoIcone icon={<Eraser size={16} />} onClick={limparFiltro} background="#fff" color="#64748b">
                Limpar
              </BotaoIcone>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.3fr) minmax(280px, 0.7fr)",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div style={boxGrande}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <h3 style={{ margin: 0, color: "#111827" }}>Resumo por Live</h3>
            <span style={{ color: "#64748b", fontSize: 13 }}>{resumoFaturamentoPorLive.length} live(s)</span>
          </div>

          {resumoFaturamentoPorLive.length === 0 ? (
            <div
              style={{
                border: "1px dashed #cbd5e1",
                borderRadius: 18,
                padding: 22,
                background: "#f8fafc",
                color: "#64748b",
              }}
            >
              Nenhuma live encontrada no período.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {resumoFaturamentoPorLive.map((live) => {
                const margemLive = Number(live.faturamento || 0) > 0
                  ? (Number(live.lucro || 0) / Number(live.faturamento || 0)) * 100
                  : 0;

                return (
                  <div
                    key={live.id}
                    style={{
                      border: "1px solid #e8edf2",
                      borderRadius: 20,
                      background: "#fff",
                      padding: isMobile ? 14 : 16,
                      display: "grid",
                      gap: 12,
                      boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                        gap: 12,
                        alignItems: "start",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <IconeCard background="#fff0f5" color="#8f2745">
                            <BarChart3 size={18} />
                          </IconeCard>

                          <div style={{ minWidth: 0 }}>
                            <strong
                              style={{
                                display: "block",
                                color: "#111827",
                                fontSize: isMobile ? 16 : 18,
                                lineHeight: 1.2,
                                wordBreak: "break-word",
                              }}
                            >
                              {live.nome || "Live sem nome"}
                            </strong>
                            <span style={{ color: "#64748b", fontSize: 12 }}>
                              {live.data || "-"} • ID: {live.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: 12,
                          background: live.status === "aberta" ? "#2563eb" : live.status === "encerrada" ? "#64748b" : "#15803d",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 800,
                          textTransform: "capitalize",
                          justifySelf: isMobile ? "start" : "end",
                        }}
                      >
                        {live.status || "-"}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
                        gap: 10,
                      }}
                    >
                      <div style={{ background: "#f8fafc", borderRadius: 14, padding: 10 }}>
                        <div style={{ color: "#64748b", fontSize: 12 }}>Vendas</div>
                        <strong>{live.quantidade}</strong>
                      </div>

                      <div style={{ background: "#f8fafc", borderRadius: 14, padding: 10 }}>
                        <div style={{ color: "#64748b", fontSize: 12 }}>Faturamento</div>
                        <strong>{formatarBRL(live.faturamento)}</strong>
                      </div>

                      <div style={{ background: "#f8fafc", borderRadius: 14, padding: 10 }}>
                        <div style={{ color: "#64748b", fontSize: 12 }}>Lucro</div>
                        <strong>{formatarBRL(live.lucro)}</strong>
                      </div>

                      <div style={{ background: "#f8fafc", borderRadius: 14, padding: 10 }}>
                        <div style={{ color: "#64748b", fontSize: 12 }}>Ticket / Margem</div>
                        <strong>{formatarBRL(live.ticketMedio)}</strong>
                        <div style={{ color: "#64748b", fontSize: 11 }}>{margemLive.toFixed(1).replace(".", ",")}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={boxGrande}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <IconeCard background="#fff8e6" color="#b45309">
              <Trophy size={18} />
            </IconeCard>
            <h3 style={{ margin: 0, color: "#111827" }}>Top Lives</h3>
          </div>

          {topLives.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 14 }}>Sem vendas para ranquear.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {topLives.map((live, index) => (
                <div
                  key={live.id}
                  style={{
                    border: "1px solid #e8edf2",
                    borderRadius: 16,
                    padding: 12,
                    display: "grid",
                    gap: 6,
                    background: index === 0 ? "#fff8e6" : "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong style={{ color: "#111827" }}>{index + 1}º {live.nome}</strong>
                    <strong style={{ color: index === 0 ? "#b45309" : "#334155" }}>{formatarBRL(live.faturamento)}</strong>
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {live.quantidade} venda(s) • Lucro {formatarBRL(live.lucro)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
