import {
  Radio,
  ShoppingBag,
  Users,
  DollarSign,
  PlayCircle,
  StopCircle,
  History,
  Eye,
  ChevronDown,
  ChevronRight,
  Clock,
  Hash,
  User,
  ListChecks,
} from "lucide-react";

export default function LivesSection({
  boxGrande,
  tituloSecao,
  input,
  botao,
  linhaResumo,
  cardResumo,
  valorResumo,
  cardCliente,
  isMobile,
  liveAtual,
  liveEmVisualizacao,
  nomeNovaLive,
  setNomeNovaLive,
  iniciarLive,
  encerrarLive,
  abaInternaLive,
  setAbaInternaLive,
  clientesLiveExpandido,
  setClientesLiveExpandido,
  resumoClientesLive,
  listaLives,
  vendasLive,
  pecasVendidasLiveCronologicas,
  abrirLiveHistorica,
  setAbaAtiva,
  formatarDataHoraBR,
  formatarDataBR,
  formatarBRL,
}) {
  const totalVendido = pecasVendidasLiveCronologicas.reduce(
    (acc, venda) => acc + Number(venda.valor || 0),
    0
  );

  // =====================================================
  // TEMA GLOBAL
  // =====================================================

  const corPrincipal = "var(--kc-primary)";
  const corSecundaria = "var(--kc-secondary)";
  const corPrincipalClara = "var(--kc-soft)";
  const corBorda = "var(--kc-border)";
  const corTexto = "var(--kc-text)";
  const corSuave = "var(--kc-text-muted)";
  const corPainel = "var(--kc-panel)";
  const corFundo = "var(--kc-background)";

  // Cores semânticas
  const corSucesso = "#15803d";
  const corPerigo = "#b91c1c";
  const corPerigoClara = "#fff1f2";
  const corPerigoBorda = "#fecaca";

  const botaoIcone = ({ ativo = false, perigo = false } = {}) => ({
    border: `1px solid ${
      ativo
        ? corPrincipal
        : perigo
          ? corPerigoBorda
          : corBorda
    }`,
    background: ativo
      ? corPrincipal
      : perigo
        ? corPerigoClara
        : corPainel,
    color: ativo
      ? "#fff"
      : perigo
        ? corPerigo
        : corTexto,
    borderRadius: 14,
    padding: isMobile ? "10px 12px" : "11px 14px",
    minHeight: isMobile ? 42 : 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 800,
    fontSize: isMobile ? 13 : 14,
    cursor: "pointer",
    boxShadow: ativo
      ? "0 8px 18px rgba(0,0,0,0.12)"
      : "0 2px 8px rgba(15,23,42,0.04)",
    width: isMobile ? "100%" : "auto",
    whiteSpace: "nowrap",
  });

  const miniIcone = {
    width: 34,
    height: 34,
    borderRadius: 12,
    border: `1px solid ${corBorda}`,
    background: corPainel,
    color: corPrincipal,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const cardResumoLives = {
    ...cardResumo,
    display: "grid",
    gap: 6,
    alignContent: "start",
    minHeight: isMobile ? 84 : 96,
    background: corPainel,
    border: `1px solid ${corBorda}`,
    color: corTexto,
  };

  const cardLinha = {
    ...cardCliente,
    border: `1px solid ${corBorda}`,
    boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
    borderRadius: 18,
    background: corPainel,
    color: corTexto,
  };

  const boxInterno = {
    border: `1px solid ${corBorda}`,
    borderRadius: 20,
    padding: isMobile ? 13 : 16,
    background: corPainel,
    boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
  };

  return (
    <div
      style={{
        ...boxGrande,
        display: "grid",
        gap: 18,
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
          <h2
            style={{
              ...tituloSecao,
              marginBottom: 4,
              color: corTexto,
            }}
          >
            Controle de Lives
          </h2>

          <div
            style={{
              color: corSuave,
              fontSize: isMobile ? 13 : 14,
            }}
          >
            Organize a live ativa, clientes e peças vendidas em tempo real.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <button
            type="button"
            style={botaoIcone({
              ativo: abaInternaLive === "ativa",
            })}
            onClick={() => setAbaInternaLive("ativa")}
          >
            <Radio size={17} />
            Live ativa
          </button>

          <button
            type="button"
            style={botaoIcone({
              ativo: abaInternaLive === "vendidas",
            })}
            onClick={() => setAbaInternaLive("vendidas")}
          >
            <ShoppingBag size={17} />
            Peças vendidas
          </button>
        </div>
      </div>

      {abaInternaLive === "ativa" && (
        <div style={{ display: "grid", gap: 18 }}>
          {!liveAtual ? (
            <div
              style={{
                border: `1px solid ${corBorda}`,
                borderRadius: 20,
                padding: isMobile ? 14 : 18,
                background: corFundo,
                display: "grid",
                gap: 12,
                maxWidth: 520,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    ...miniIcone,
                    background: corPrincipalClara,
                  }}
                >
                  <PlayCircle size={18} />
                </span>

                <strong style={{ color: corTexto }}>
                  Iniciar nova live
                </strong>
              </div>

              <input
                style={{
                  ...input,
                  background: corPainel,
                  border: `1px solid ${corBorda}`,
                  color: corTexto,
                }}
                placeholder="Nome da live (ex: Live 20/03 Noite)"
                value={nomeNovaLive}
                onChange={(e) =>
                  setNomeNovaLive(e.target.value)
                }
              />

              <button
                style={{
                  ...botao,
                  width: "100%",
                  background: corPrincipal,
                }}
                onClick={iniciarLive}
              >
                Iniciar Live
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  border: `1px solid ${corBorda}`,
                  background: `linear-gradient(135deg, ${corPainel} 0%, ${corFundo} 100%)`,
                  borderRadius: 22,
                  padding: isMobile ? 14 : 18,
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "1fr auto",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      ...miniIcone,
                      background: corPrincipal,
                      color: "#fff",
                    }}
                  >
                    <Radio size={18} />
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: isMobile ? 13 : 14,
                        color: corSuave,
                      }}
                    >
                      Live ativa
                    </div>

                    <strong
                      style={{
                        display: "block",
                        color: corTexto,
                        fontSize: isMobile ? 17 : 20,
                        wordBreak: "break-word",
                      }}
                    >
                      {liveAtual.nome}
                    </strong>

                    <div
                      style={{
                        color: corSuave,
                        fontSize: isMobile ? 12.5 : 13.5,
                        marginTop: 3,
                      }}
                    >
                      Iniciada em:{" "}
                      {liveAtual.hora_inicio
                        ? formatarDataHoraBR(
                            liveAtual.hora_inicio
                          )
                        : "-"}
                    </div>
                  </div>
                </div>

                <button
                  style={botaoIcone({
                    perigo: true,
                  })}
                  onClick={encerrarLive}
                >
                  <StopCircle size={18} />
                  Encerrar
                </button>
              </div>

              <div
                className="linha-resumo"
                style={linhaResumo}
              >
                <div style={cardResumoLives}>
                  <span style={miniIcone}>
                    <ShoppingBag size={17} />
                  </span>

                  <strong style={{ color: corTexto }}>
                    Peças na live
                  </strong>

                  <div
                    style={{
                      ...valorResumo,
                      color: corPrincipal,
                    }}
                  >
                    {vendasLive.length}
                  </div>
                </div>

                <div style={cardResumoLives}>
                  <span style={miniIcone}>
                    <DollarSign size={17} />
                  </span>

                  <strong style={{ color: corTexto }}>
                    Faturamento
                  </strong>

                  <div
                    style={{
                      ...valorResumo,
                      color: corPrincipal,
                    }}
                  >
                    {formatarBRL(
                      vendasLive.reduce(
                        (acc, v) =>
                          acc +
                          Number(
                            v.valor_venda || 0
                          ),
                        0
                      )
                    )}
                  </div>
                </div>

                <div style={cardResumoLives}>
                  <span style={miniIcone}>
                    <Users size={17} />
                  </span>

                  <strong style={{ color: corTexto }}>
                    Clientes
                  </strong>

                  <div
                    style={{
                      ...valorResumo,
                      color: corPrincipal,
                    }}
                  >
                    {resumoClientesLive.length}
                  </div>
                </div>
              </div>

              <div style={boxInterno}>
                <button
                  type="button"
                  onClick={() =>
                    setClientesLiveExpandido(
                      (prev) => !prev
                    )
                  }
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: corTexto,
                    padding: 0,
                    margin: 0,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        ...miniIcone,
                        background:
                          clientesLiveExpandido
                            ? corPrincipalClara
                            : corPainel,
                      }}
                    >
                      <Users size={17} />
                    </span>

                    <div style={{ minWidth: 0 }}>
                      <strong
                        style={{
                          color: corTexto,
                          fontSize: isMobile
                            ? 15
                            : 17,
                        }}
                      >
                        Clientes da live
                      </strong>

                      <div
                        style={{
                          color: corSuave,
                          fontSize: isMobile
                            ? 12
                            : 13,
                          marginTop: 2,
                        }}
                      >
                        {resumoClientesLive.length}{" "}
                        cliente(s). Clique para{" "}
                        {clientesLiveExpandido
                          ? "minimizar"
                          : "expandir"}
                        .
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      ...miniIcone,
                      background:
                        clientesLiveExpandido
                          ? corPrincipalClara
                          : corPainel,
                    }}
                  >
                    {clientesLiveExpandido ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </span>
                </button>

                {clientesLiveExpandido ? (
                  resumoClientesLive.length ===
                  0 ? (
                    <p
                      style={{
                        marginTop: 12,
                        color: corSuave,
                      }}
                    >
                      Nenhuma venda nessa live
                      ainda.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        marginTop: 14,
                      }}
                    >
                      {resumoClientesLive.map(
                        (cliente) => (
                          <div
                            key={cliente.nome}
                            style={{
                              ...cardLinha,
                              padding: isMobile
                                ? 12
                                : 14,
                              display: "grid",
                              gridTemplateColumns:
                                isMobile
                                  ? "1fr"
                                  : "1fr auto auto",
                              gap: 10,
                              alignItems:
                                "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 9,
                                alignItems:
                                  "center",
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={
                                  miniIcone
                                }
                              >
                                <User
                                  size={16}
                                />
                              </span>

                              <strong
                                style={{
                                  color:
                                    corTexto,
                                  wordBreak:
                                    "break-word",
                                }}
                              >
                                {
                                  cliente.nome
                                }
                              </strong>
                            </div>

                            <div
                              style={{
                                color:
                                  corSuave,
                                fontSize: 13,
                              }}
                            >
                              {cliente.pecas}{" "}
                              peça(s)
                            </div>

                            <strong
                              style={{
                                color:
                                  corSucesso,
                              }}
                            >
                              {formatarBRL(
                                cliente.total
                              )}
                            </strong>
                          </div>
                        )
                      )}
                    </div>
                  )
                ) : null}
              </div>
            </div>
          )}

          <div style={boxInterno}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span style={miniIcone}>
                  <History size={17} />
                </span>

                <strong
                  style={{
                    color: corTexto,
                    fontSize: isMobile ? 15 : 17,
                  }}
                >
                  Histórico de Lives
                </strong>
              </div>

              <span
                style={{
                  color: corSuave,
                  fontSize: 13,
                }}
              >
                {listaLives.length} live(s)
              </span>
            </div>

            {listaLives.length === 0 ? (
              <p style={{ color: corSuave }}>
                Nenhuma live cadastrada ainda.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                }}
              >
                {[...listaLives]
                  .sort((a, b) => {
                    const dataA =
                      new Date(
                        a?.data_live ||
                          a?.criado_em ||
                          0
                      ).getTime() || 0;

                    const dataB =
                      new Date(
                        b?.data_live ||
                          b?.criado_em ||
                          0
                      ).getTime() || 0;

                    return dataB - dataA;
                  })
                  .map((live) => (
                    <div
                      key={live.id}
                      style={{
                        ...cardLinha,
                        padding: isMobile
                          ? 12
                          : 14,
                        display: "grid",
                        gridTemplateColumns:
                          isMobile
                            ? "1fr"
                            : "1.4fr 0.8fr 0.8fr auto",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 9,
                          alignItems:
                            "center",
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={
                            miniIcone
                          }
                        >
                          <Radio
                            size={16}
                          />
                        </span>

                        <strong
                          style={{
                            color:
                              corTexto,
                            wordBreak:
                              "break-word",
                          }}
                        >
                          {live.nome}
                        </strong>
                      </div>

                      <div
                        style={{
                          color: corSuave,
                          fontSize: 13,
                        }}
                      >
                        {live.data_live
                          ? formatarDataBR(
                              live.data_live
                            )
                          : "-"}
                      </div>

                      <div
                        style={{
                          color:
                            live.status ===
                            "aberta"
                              ? corSucesso
                              : corSuave,
                          fontWeight: 800,
                          fontSize: 13,
                        }}
                      >
                        {live.status || "-"}
                      </div>

                      <button
                        type="button"
                        style={botaoIcone({
                          ativo: false,
                        })}
                        onClick={async () => {
                          await abrirLiveHistorica(
                            live
                          );

                          setAbaAtiva(
                            "vendas"
                          );
                        }}
                      >
                        <Eye size={17} />
                        Abrir
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {abaInternaLive === "vendidas" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div
            className="linha-resumo"
            style={linhaResumo}
          >
            <div style={cardResumoLives}>
              <span style={miniIcone}>
                <ShoppingBag size={17} />
              </span>

              <strong style={{ color: corTexto }}>
                Peças vendidas
              </strong>

              <div
                style={{
                  ...valorResumo,
                  color: corPrincipal,
                }}
              >
                {
                  pecasVendidasLiveCronologicas.length
                }
              </div>
            </div>

            <div style={cardResumoLives}>
              <span style={miniIcone}>
                <DollarSign size={17} />
              </span>

              <strong style={{ color: corTexto }}>
                Total vendido
              </strong>

              <div
                style={{
                  ...valorResumo,
                  color: corPrincipal,
                }}
              >
                {formatarBRL(totalVendido)}
              </div>
            </div>

            <div style={cardResumoLives}>
              <span style={miniIcone}>
                <Radio size={17} />
              </span>

              <strong style={{ color: corTexto }}>
                Live
              </strong>

              <div
                style={{
                  ...valorResumo,
                  color: corPrincipal,
                  fontSize: isMobile
                    ? 16
                    : 18,
                }}
              >
                {liveEmVisualizacao?.nome ||
                  liveAtual?.nome ||
                  "-"}
              </div>
            </div>
          </div>

          {pecasVendidasLiveCronologicas.length ===
          0 ? (
            <div
              style={{
                border: `1px dashed ${corBorda}`,
                borderRadius: 18,
                padding: 18,
                background: corFundo,
                color: corSuave,
              }}
            >
              Nenhuma peça vendida nesta live
              ainda.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {pecasVendidasLiveCronologicas.map(
                (venda, index) => (
                  <div
                    key={
                      venda.id ||
                      `${venda.codigo}-${index}`
                    }
                    style={{
                      ...cardLinha,
                      padding: isMobile
                        ? 12
                        : 14,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          isMobile
                            ? "1fr"
                            : "70px minmax(220px, 1.4fr) minmax(120px, 0.7fr) minmax(170px, 1fr) minmax(170px, 1fr)",
                        gap: 10,
                        alignItems:
                          "center",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "inline-flex",
                          alignItems:
                            "center",
                          gap: 7,
                          fontWeight: 900,
                          color:
                            corPrincipal,
                        }}
                      >
                        <Hash size={15} />
                        {venda.numeroCronologico ||
                          index + 1}
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={{
                            fontSize:
                              isMobile
                                ? 14
                                : 16,
                            color:
                              corTexto,
                            wordBreak:
                              "break-word",
                          }}
                        >
                          {venda.nomePeca}
                        </strong>

                        <div
                          style={{
                            fontSize: 12,
                            color:
                              corSuave,
                            marginTop: 3,
                            wordBreak:
                              "break-word",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 5,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <ListChecks
                            size={13}
                          />
                          Código:
                          <strong>
                            {
                              venda.codigo
                            }
                          </strong>
                        </div>
                      </div>

                      <div>
                        <strong
                          style={{
                            color:
                              corSucesso,
                          }}
                        >
                          {formatarBRL(
                            venda.valor
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color:
                            corSuave,
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 5,
                          }}
                        >
                          <Clock
                            size={14}
                          />

                          <strong>
                            Horário
                          </strong>
                        </div>

                        <div>
                          {formatarDataHoraBR(
                            venda.horario
                          ) || "-"}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color:
                            corSuave,
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              color:
                                corTexto,
                            }}
                          >
                            Vendido para:
                          </strong>{" "}
                          {venda.cliente}
                        </div>

                        <div>
                          <strong
                            style={{
                              color:
                                corTexto,
                            }}
                          >
                            Fila:
                          </strong>{" "}
                          {venda.fila ||
                            "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}