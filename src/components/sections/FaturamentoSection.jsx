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

function IconeCard({ children, background = "var(--kc-background)", color = "var(--kc-primary)" }) {
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
        border: "1px solid var(--kc-border)",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function BotaoIcone({ icon, children, onClick, ativo = false, background = "var(--kc-panel)", color = "var(--kc-text)", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 40,
        padding: "9px 13px",
        borderRadius: 14,
        border: ativo ? "1px solid var(--kc-primary)" : "1px solid var(--kc-border)",
        background: ativo ? "var(--kc-soft)" : background,
        color: ativo ? "var(--kc-primary)" : color,
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
    <div style={{
      border:"1px solid var(--kc-border)",
      borderRadius:18,
      background:"var(--kc-panel)",
      padding:12,
      display:"grid",
      gap:6,
      boxShadow:"0 2px 10px rgba(15,23,42,.04)"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
        <strong style={{fontSize:26,fontWeight:900,color:destaque?"var(--kc-primary)":"var(--kc-text)",lineHeight:1}}>{value}</strong>
        {icon}
      </div>
      <span style={{fontSize:12.5,fontWeight:800,color:"var(--kc-text-muted)"}}>{label}</span>
      {helper ? <span style={{fontSize:11.5,color:"var(--kc-text-muted)"}}>{helper}</span>:null}
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
  const corPrincipal = "var(--kc-primary)";
  const corSuaveTema = "var(--kc-soft)";
  const corFundo = "var(--kc-background)";
  const corPainel = "var(--kc-panel)";
  const corTexto = "var(--kc-text)";
  const corTextoSuave = "var(--kc-text-muted)";
  const corBorda = "var(--kc-border)";

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
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          ...boxGrande,
          background: corPainel,
          border: `1px solid ${corBorda}`,
          color: corTexto,
        }}
      >
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
            <h2 style={{ ...tituloSecao, color: corTexto }}>Faturamento</h2>
            <p style={{ margin: "-6px 0 0", color: corTextoSuave, fontSize: 14 }}>
              Visão financeira por período e por live.
            </p>
          </div>

          <BotaoIcone
            icon={<Download size={17} />}
            onClick={exportarRelatorioCSV}
            background={corPrincipal}
            color="#fff"
          >
            Exportar relatório
          </BotaoIcone>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          <CardResumoFaturamento
            destaque
            icon={
              <IconeCard background={corSuaveTema} color={corPrincipal}>
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
            marginTop: 12,
            padding: isMobile ? 10 : 12,
            borderRadius: 16,
            background: corFundo,
            border: `1px solid ${corBorda}`,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: corTexto, fontWeight: 800 }}>
            <CalendarDays size={18} />
            Filtros de período
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(150px, 190px) minmax(150px, 190px) 1fr",
              gap: 8,
              alignItems: "end",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ color: corTextoSuave, fontSize: 12, fontWeight: 700 }}>Data inicial</label>
              <input
                type="date"
                style={{ ...input, width: "100%", background: corPainel, color: corTexto, border: `1px solid ${corBorda}` }}
                value={dataInicialFiltro}
                onChange={(e) => setDataInicialFiltro(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ color: corTextoSuave, fontSize: 12, fontWeight: 700 }}>Data final</label>
              <input
                type="date"
                style={{ ...input, width: "100%", background: corPainel, color: corTexto, border: `1px solid ${corBorda}` }}
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

              <BotaoIcone icon={<Eraser size={16} />} onClick={limparFiltro} background={corPainel} color={corTextoSuave}>
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
        <div
        style={{
          ...boxGrande,
          background: corPainel,
          border: `1px solid ${corBorda}`,
          color: corTexto,
        }}
      >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <h3 style={{ margin: 0, color: corTexto }}>Resumo por Live</h3>
            <span style={{ color: corTextoSuave, fontSize: 13 }}>{resumoFaturamentoPorLive.length} live(s)</span>
          </div>

          {resumoFaturamentoPorLive.length === 0 ? (
            <div
              style={{
                border: `1px dashed ${corBorda}`,
                borderRadius: 16,
                padding: 16,
                background: corFundo,
                color: corTextoSuave,
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
                      border: `1px solid ${corBorda}`,
                      borderRadius: 18,
                      background: corPainel,
                      padding: isMobile ? 11 : 13,
                      display: "grid",
                      gap: 8,
                      boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                        gap: 8,
                        alignItems: "start",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <IconeCard background={corSuaveTema} color={corPrincipal}>
                            <BarChart3 size={18} />
                          </IconeCard>

                          <div style={{ minWidth: 0 }}>
                            <strong
                              style={{
                                display: "block",
                                color: corTexto,
                                fontSize: isMobile ? 16 : 18,
                                lineHeight: 1.2,
                                wordBreak: "break-word",
                              }}
                            >
                              {live.nome || "Live sem nome"}
                            </strong>
                            <span style={{ color: corTextoSuave, fontSize: 12 }}>
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
                        gap: 8,
                      }}
                    >
                      <div style={{ background: corFundo, borderRadius: 14, padding: 10 }}>
                        <div style={{ color: corTextoSuave, fontSize: 12 }}>Vendas</div>
                        <strong>{live.quantidade}</strong>
                      </div>

                      <div style={{ background: corFundo, borderRadius: 14, padding: 10 }}>
                        <div style={{ color: corTextoSuave, fontSize: 12 }}>Faturamento</div>
                        <strong>{formatarBRL(live.faturamento)}</strong>
                      </div>

                      <div style={{ background: corFundo, borderRadius: 14, padding: 10 }}>
                        <div style={{ color: corTextoSuave, fontSize: 12 }}>Lucro</div>
                        <strong>{formatarBRL(live.lucro)}</strong>
                      </div>

                      <div style={{ background: corFundo, borderRadius: 14, padding: 10 }}>
                        <div style={{ color: corTextoSuave, fontSize: 12 }}>Ticket / Margem</div>
                        <strong>{formatarBRL(live.ticketMedio)}</strong>
                        <div style={{ color: corTextoSuave, fontSize: 11 }}>{margemLive.toFixed(1).replace(".", ",")}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
        style={{
          ...boxGrande,
          background: corPainel,
          border: `1px solid ${corBorda}`,
          color: corTexto,
        }}
      >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <IconeCard background="#fff8e6" color="#b45309">
              <Trophy size={18} />
            </IconeCard>
            <h3 style={{ margin: 0, color: corTexto }}>Top Lives</h3>
          </div>

          {topLives.length === 0 ? (
            <div style={{ color: corTextoSuave, fontSize: 14 }}>Sem vendas para ranquear.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {topLives.map((live, index) => (
                <div
                  key={live.id}
                  style={{
                    border: `1px solid ${corBorda}`,
                    borderRadius: 16,
                    padding: 12,
                    display: "grid",
                    gap: 6,
                    background: index === 0 ? "#fff8e6" : corPainel,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong style={{ color: corTexto }}>{index + 1}º {live.nome}</strong>
                    <strong style={{ color: index === 0 ? "#b45309" : corTexto }}>{formatarBRL(live.faturamento)}</strong>
                  </div>
                  <div style={{ color: corTextoSuave, fontSize: 12 }}>
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
