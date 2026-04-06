export default function ExpedicaoSection({
    boxGrande,
    tituloSecao,
    cardCliente,
    itemCliente,
    botaoPequeno,
    sacolinhasAgrupadas,
    sacolinhasAbertas,
    sacolinhasSeparadas,
    pedidosEnvioEmMontagem,
    pedidosEnvioConcluidos,
    carregandoPedidosEnvio,
    mostrarAbertas,
    setMostrarAbertas,
    mostrarSeparadas,
    setMostrarSeparadas,
    mostrarPedidosEnvio,
    setMostrarPedidosEnvio,
    mostrarEnviadas,
    setMostrarEnviadas,
    sacolinhasExpandidas,
    toggleExpandirSacolinha,
    pedidosEnvioExpandidos,
    toggleExpandirPedidoEnvio,
    mapaLivesPorId,
    mapaPecasPorId,
    todasVendasLive,
    getStatusSacolinha,
    sacolinhaPodeIrParaExpedicao,
    sacolinhaEstaVencida,
    marcarSacolinhaComoSeparada,
    marcarSacolinhaComoEnviada,
    criarPedidoDeEnvio,
    criandoPedidoEnvioCliente,
    formatarBRL,
    cancelarPedidoDeEnvio,
    pedidoEstaConferido,
    itensConferidosPedido,
    marcarPedidoComoEnviado,
    toggleItemConferidoPedido,
}) {
    return (
        <div style={boxGrande}>
            <h2 style={tituloSecao}>Expedição</h2>

            {sacolinhasAgrupadas.length === 0 ? (
                <p>Nenhuma sacolinha encontrada.</p>
            ) : (
                <div style={{ display: "grid", gap: 20 }}>
                    <div>
                        <div
                            onClick={() => setMostrarAbertas((prev) => !prev)}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                                marginBottom: 12,
                            }}
                        >
                            <h3 style={{ margin: 0 }}>
                                Sacolinhas abertas ({sacolinhasAbertas.length})
                            </h3>
                            <span>{mostrarAbertas ? "▼" : "▶"}</span>
                        </div>

                        {mostrarAbertas &&
                            (sacolinhasAbertas.length === 0 ? (
                                <p>Nenhuma sacolinha aberta.</p>
                            ) : (
                                <div style={{ display: "grid", gap: 12 }}>
                                    {sacolinhasAbertas.map((s) => (
                                        <div key={s.id} style={cardCliente}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    gap: 12,
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <button
                                                        onClick={() => toggleExpandirSacolinha(s.id)}
                                                        style={{
                                                            background: "transparent",
                                                            border: "none",
                                                            cursor: "pointer",
                                                            fontSize: 18,
                                                            width: "auto",
                                                            minWidth: "auto",
                                                            padding: "4px 6px",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {sacolinhasExpandidas[s.id] ? "▼" : "▶"}
                                                    </button>

                                                    <strong>{s.cliente_nome}</strong>
                                                </div>

                                                <div style={{ fontSize: 14, color: "#555" }}>
                                                    Live: {mapaLivesPorId[String(s.live_id)]?.nome || s.live_id}
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 10,
                                                        alignItems: "center",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            padding: "4px 10px",
                                                            borderRadius: 10,
                                                            background:
                                                                s.status === "aberta"
                                                                    ? "#b45309"
                                                                    : s.status === "separada"
                                                                        ? "#f59e0b"
                                                                        : "#15803d",
                                                            color: "#fff",
                                                            fontSize: 12,
                                                            fontWeight: "bold",
                                                            textTransform: "capitalize",
                                                        }}
                                                    >
                                                        {s.status}
                                                    </span>

                                                    <span>{s.quantidade} peça(s)</span>

                                                    {sacolinhaEstaVencida(s) && (
                                                        <span
                                                            style={{
                                                                padding: "4px 10px",
                                                                borderRadius: 10,
                                                                background: "#dc2626",
                                                                color: "#fff",
                                                                fontSize: 12,
                                                                fontWeight: "bold",
                                                                textTransform: "capitalize",
                                                            }}
                                                        >
                                                            vencida
                                                        </span>
                                                    )}

                                                    <button
                                                        style={{ ...botaoPequeno, background: "#f59e0b" }}
                                                        onClick={() => marcarSacolinhaComoSeparada(s.id)}
                                                    >
                                                        Marcar como separada
                                                    </button>
                                                </div>
                                            </div>

                                            {sacolinhasExpandidas[s.id] && (
                                                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                                                    {!s.itens || s.itens.length === 0 ? (
                                                        <div style={itemCliente}>
                                                            Nenhum item encontrado nessa sacolinha.
                                                        </div>
                                                    ) : (
                                                        s.itens.map((item, index) => (
                                                            <div
                                                                key={item.id || `${item.peca_id}-${index}`}
                                                                style={itemCliente}
                                                            >
                                                                <div>
                                                                    <strong>Peça:</strong>{" "}
                                                                    {mapaPecasPorId[String(item.peca_id)]?.nome ||
                                                                        item.nome_peca ||
                                                                        item.nome ||
                                                                        "-"}
                                                                </div>
                                                                <div>
                                                                    <strong>Código:</strong> {item.peca_id || "-"}
                                                                </div>
                                                                <div>
                                                                    <strong>Valor:</strong>{" "}
                                                                    {formatarBRL(item.valor_venda || 0)}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                    </div>

                    <div>
                        <div
                            onClick={() => setMostrarSeparadas((prev) => !prev)}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                                marginBottom: 12,
                            }}
                        >
                            <h3 style={{ margin: 0 }}>Separadas ({sacolinhasSeparadas.length})</h3>
                            <span>{mostrarSeparadas ? "▼" : "▶"}</span>
                        </div>

                        {mostrarSeparadas &&
                            (sacolinhasSeparadas.length === 0 ? (
                                <p>Nenhuma sacolinha separada.</p>
                            ) : (
                                <div style={{ display: "grid", gap: 12 }}>
                                    {sacolinhasSeparadas.map((s) => {
                                        const statusSacolinha = getStatusSacolinha(s, todasVendasLive);
                                        const podeIrParaExpedicao = sacolinhaPodeIrParaExpedicao(
                                            s,
                                            todasVendasLive
                                        );

                                        return (
                                            <div key={s.id} style={cardCliente}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        gap: 12,
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <button
                                                            onClick={() => toggleExpandirSacolinha(s.id)}
                                                            style={{
                                                                background: "transparent",
                                                                border: "none",
                                                                cursor: "pointer",
                                                                fontSize: 18,
                                                                width: "auto",
                                                                minWidth: "auto",
                                                                padding: "4px 6px",
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {sacolinhasExpandidas[s.id] ? "▼" : "▶"}
                                                        </button>

                                                        <strong>{s.cliente_nome}</strong>
                                                    </div>

                                                    <div style={{ fontSize: 14, color: "#555" }}>
                                                        Live: {mapaLivesPorId[String(s.live_id)]?.nome || s.live_id}
                                                    </div>

                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            gap: 10,
                                                            alignItems: "center",
                                                            flexWrap: "wrap",
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                padding: "4px 10px",
                                                                borderRadius: 10,
                                                                background:
                                                                    s.status === "aberta"
                                                                        ? "#b45309"
                                                                        : s.status === "separada"
                                                                            ? "#f59e0b"
                                                                            : "#15803d",
                                                                color: "#fff",
                                                                fontSize: 12,
                                                                fontWeight: "bold",
                                                                textTransform: "capitalize",
                                                            }}
                                                        >
                                                            {s.status}
                                                        </span>

                                                        <span>{s.quantidade} peça(s)</span>

                                                        <button
                                                            style={{
                                                                ...botaoPequeno,
                                                                background: "#2563eb",
                                                                opacity: criandoPedidoEnvioCliente === s.cliente_nome ? 0.7 : 1,
                                                                cursor:
                                                                    criandoPedidoEnvioCliente === s.cliente_nome
                                                                        ? "not-allowed"
                                                                        : "pointer",
                                                            }}
                                                            onClick={() => criarPedidoDeEnvio(s.cliente_nome)}
                                                            disabled={criandoPedidoEnvioCliente === s.cliente_nome}
                                                        >
                                                            {criandoPedidoEnvioCliente === s.cliente_nome
                                                                ? "Criando pedido..."
                                                                : "Criar pedido de envio"}
                                                        </button>

                                                        {sacolinhaEstaVencida(s) && (
                                                            <span
                                                                style={{
                                                                    padding: "4px 10px",
                                                                    borderRadius: 10,
                                                                    background: "#dc2626",
                                                                    color: "#fff",
                                                                    fontSize: 12,
                                                                    fontWeight: "bold",
                                                                }}
                                                            >
                                                                vencida
                                                            </span>
                                                        )}

                                                        <button
                                                            style={{
                                                                ...botaoPequeno,
                                                                background: podeIrParaExpedicao ? "#15803d" : "#9ca3af",
                                                                cursor: podeIrParaExpedicao ? "pointer" : "not-allowed",
                                                            }}
                                                            onClick={() => {
                                                                if (!podeIrParaExpedicao) return;
                                                                marcarSacolinhaComoEnviada(s.id, s);
                                                            }}
                                                        >
                                                            {podeIrParaExpedicao
                                                                ? "Marcar como enviada"
                                                                : "Aguardando pagamento"}
                                                        </button>

                                                        <span
                                                            style={{
                                                                padding: "4px 10px",
                                                                borderRadius: 10,
                                                                background:
                                                                    statusSacolinha === "pronta_envio"
                                                                        ? "#15803d"
                                                                        : statusSacolinha === "enviada"
                                                                            ? "#2563eb"
                                                                            : "#dc2626",
                                                                color: "#fff",
                                                                fontSize: 12,
                                                                fontWeight: "bold",
                                                                textTransform: "capitalize",
                                                            }}
                                                        >
                                                            {statusSacolinha === "pronta_envio" && "pago"}
                                                            {statusSacolinha === "aguardando_pagamento" && "pendente"}
                                                            {statusSacolinha === "enviada" && "enviado"}
                                                            {statusSacolinha === "em_andamento" && "em andamento"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {sacolinhasExpandidas[s.id] && (
                                                    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                                                        {!s.itens || s.itens.length === 0 ? (
                                                            <div style={itemCliente}>
                                                                Nenhum item encontrado nessa sacolinha.
                                                            </div>
                                                        ) : (
                                                            s.itens.map((item, index) => (
                                                                <div
                                                                    key={item.id || `${item.peca_id}-${index}`}
                                                                    style={itemCliente}
                                                                >
                                                                    <div>
                                                                        <strong>Peça:</strong>{" "}
                                                                        {mapaPecasPorId[String(item.peca_id)]?.nome ||
                                                                            item.nome_peca ||
                                                                            item.nome ||
                                                                            "-"}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Código:</strong> {item.peca_id || "-"}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Valor:</strong>{" "}
                                                                        {formatarBRL(item.valor_venda || 0)}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                    </div>

                    <div>
                        <div
                            onClick={() => setMostrarPedidosEnvio((prev) => !prev)}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                                marginBottom: 12,
                            }}
                        >
                            <h3 style={{ margin: 0 }}>
                                Pedidos de Envio ({pedidosEnvioEmMontagem.length})
                            </h3>
                            <span>{mostrarPedidosEnvio ? "▼" : "▶"}</span>
                        </div>

                        {mostrarPedidosEnvio &&
                            (carregandoPedidosEnvio ? (
                                <p>Carregando pedidos de envio...</p>
                            ) : pedidosEnvioEmMontagem.length === 0 ? (
                                <p>Nenhum pedido de envio criado ainda.</p>
                            ) : (
                                <div style={{ display: "grid", gap: 12 }}>
                                    {pedidosEnvioEmMontagem.map((p) => (
                                        <div key={p.id} style={cardCliente}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    gap: 12,
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <button
                                                        onClick={() => toggleExpandirPedidoEnvio(p.id)}
                                                        style={{
                                                            background: "transparent",
                                                            border: "none",
                                                            cursor: "pointer",
                                                            fontSize: 18,
                                                            padding: "4px 6px",
                                                        }}
                                                    >
                                                        {pedidosEnvioExpandidos[p.id] ? "▼" : "▶"}
                                                    </button>

                                                    <strong>{p.cliente_nome}</strong>
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 10,
                                                        alignItems: "center",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            padding: "4px 10px",
                                                            borderRadius: 10,
                                                            background: "#2563eb",
                                                            color: "#fff",
                                                            fontSize: 12,
                                                            fontWeight: "bold",
                                                        }}
                                                    >
                                                        {p.status}
                                                    </span>

                                                    <span>{p.sacolinhas?.length || 0} sacolinha(s)</span>
                                                    <span>{p.quantidadeCalculada} peça(s)</span>

                                                    <span
                                                        style={{
                                                            padding: "4px 10px",
                                                            borderRadius: 10,
                                                            background: pedidoEstaConferido(p, itensConferidosPedido)
                                                                ? "#15803d"
                                                                : "#b45309",
                                                            color: "#fff",
                                                            fontSize: 12,
                                                            fontWeight: "bold",
                                                        }}
                                                    >
                                                        Conferido: {(itensConferidosPedido[p.id] || []).length} /{" "}
                                                        {p.quantidadeCalculada}
                                                    </span>

                                                    <button
                                                        style={{ ...botaoPequeno, background: "#6b7280" }}
                                                        onClick={() => cancelarPedidoDeEnvio(p.id, p.cliente_nome)}
                                                    >
                                                        Voltar para separadas
                                                    </button>

                                                    <button
                                                        style={{
                                                            ...botaoPequeno,
                                                            background: pedidoEstaConferido(p, itensConferidosPedido)
                                                                ? "#15803d"
                                                                : "#9ca3af",
                                                            cursor: pedidoEstaConferido(p, itensConferidosPedido)
                                                                ? "pointer"
                                                                : "not-allowed",
                                                        }}
                                                        onClick={() => {
                                                            if (!pedidoEstaConferido(p, itensConferidosPedido)) return;
                                                            marcarPedidoComoEnviado(p);
                                                        }}
                                                    >
                                                        Marcar pedido como enviado
                                                    </button>
                                                </div>
                                            </div>

                                            {pedidosEnvioExpandidos[p.id] && (
                                                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                                                    <div
                                                        style={{
                                                            background: "#f8fafc",
                                                            border: "1px solid #e2e8f0",
                                                            borderRadius: 12,
                                                            padding: 12,
                                                            display: "grid",
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <strong>Sacolinhas incluídas</strong>

                                                        {!p.sacolinhas || p.sacolinhas.length === 0 ? (
                                                            <div>Nenhuma sacolinha vinculada.</div>
                                                        ) : (
                                                            p.sacolinhas.map((sacolinha) => (
                                                                <div key={sacolinha.id} style={itemCliente}>
                                                                    <div>
                                                                        <strong>Live:</strong>{" "}
                                                                        {mapaLivesPorId[String(sacolinha.live_id)]?.nome ||
                                                                            sacolinha.live_id ||
                                                                            "-"}
                                                                    </div>

                                                                    <div>
                                                                        <strong>Sacolinha:</strong> {sacolinha.id}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Peças:</strong> {sacolinha.quantidade || 0}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>

                                                    <div
                                                        style={{
                                                            background: "#f8fafc",
                                                            border: "1px solid #e2e8f0",
                                                            borderRadius: 12,
                                                            padding: 12,
                                                            display: "grid",
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <strong>Itens do pedido</strong>

                                                        {!p.itens || p.itens.length === 0 ? (
                                                            <div>Nenhum item encontrado.</div>
                                                        ) : (
                                                            p.itens.map((item, index) => {
                                                                const itemKey = item.id || `${item.peca_id}-${index}`;
                                                                const checked =
                                                                    itensConferidosPedido[p.id]?.includes(itemKey) || false;
                                                                const peca = mapaPecasPorId[String(item.peca_id)];

                                                                return (
                                                                    <div
                                                                        key={itemKey}
                                                                        style={{
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            gap: 10,
                                                                            padding: 8,
                                                                            border: "1px solid #e5e7eb",
                                                                            borderRadius: 10,
                                                                        }}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={checked}
                                                                            onChange={() =>
                                                                                toggleItemConferidoPedido(p.id, itemKey)
                                                                            }
                                                                        />

                                                                        <div>
                                                                            <div>
                                                                                <strong>
                                                                                    {peca?.nome || item.nome_peca || item.nome || "-"}
                                                                                </strong>
                                                                            </div>

                                                                            <div style={{ fontSize: 12, color: "#555" }}>
                                                                                Código: {item.peca_id || "-"}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                    </div>

                    <div>
                        <div
                            onClick={() => setMostrarEnviadas((prev) => !prev)}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                                marginBottom: 12,
                            }}
                        >
                            <h3 style={{ margin: 0 }}>Enviadas ({pedidosEnvioConcluidos.length})</h3>
                            <span>{mostrarEnviadas ? "▼" : "▶"}</span>
                        </div>

                        {mostrarEnviadas &&
                            (pedidosEnvioConcluidos.length === 0 ? (
                                <p>Nenhum pedido enviado ainda.</p>
                            ) : (
                                <div style={{ display: "grid", gap: 12 }}>
                                    {pedidosEnvioConcluidos.map((p) => (
                                        <div key={p.id} style={{ ...cardCliente, opacity: 0.88 }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    gap: 12,
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <button
                                                        onClick={() => toggleExpandirPedidoEnvio(p.id)}
                                                        style={{
                                                            background: "transparent",
                                                            border: "none",
                                                            cursor: "pointer",
                                                            fontSize: 18,
                                                            padding: "4px 6px",
                                                        }}
                                                    >
                                                        {pedidosEnvioExpandidos[p.id] ? "▼" : "▶"}
                                                    </button>

                                                    <strong>{p.cliente_nome}</strong>
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 10,
                                                        alignItems: "center",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            padding: "4px 10px",
                                                            borderRadius: 10,
                                                            background: "#15803d",
                                                            color: "#fff",
                                                            fontSize: 12,
                                                            fontWeight: "bold",
                                                        }}
                                                    >
                                                        enviado
                                                    </span>

                                                    <span>{p.sacolinhas?.length || 0} sacolinha(s)</span>
                                                    <span>{p.quantidadeCalculada} peça(s)</span>
                                                    <span>Enviado em: {p.enviado_em || "-"}</span>
                                                </div>
                                            </div>

                                            {pedidosEnvioExpandidos[p.id] && (
                                                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                                                    <div
                                                        style={{
                                                            background: "#f8fafc",
                                                            border: "1px solid #e2e8f0",
                                                            borderRadius: 12,
                                                            padding: 12,
                                                            display: "grid",
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <strong>Sacolinhas enviadas</strong>

                                                        {!p.sacolinhas || p.sacolinhas.length === 0 ? (
                                                            <div>Nenhuma sacolinha vinculada.</div>
                                                        ) : (
                                                            p.sacolinhas.map((sacolinha) => (
                                                                <div key={sacolinha.id} style={itemCliente}>
                                                                    <div>
                                                                        <strong>Live:</strong>{" "}
                                                                        {mapaLivesPorId[String(sacolinha.live_id)]?.nome ||
                                                                            sacolinha.live_id ||
                                                                            "-"}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Sacolinha:</strong> {sacolinha.id}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Peças:</strong> {sacolinha.quantidade || 0}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>

                                                    <div
                                                        style={{
                                                            background: "#f8fafc",
                                                            border: "1px solid #e2e8f0",
                                                            borderRadius: 12,
                                                            padding: 12,
                                                            display: "grid",
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <strong>Itens enviados</strong>

                                                        {!p.itens || p.itens.length === 0 ? (
                                                            <div>Nenhum item encontrado.</div>
                                                        ) : (
                                                            p.itens.map((item, index) => (
                                                                <div
                                                                    key={item.id || `${item.peca_id}-${index}`}
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: 10,
                                                                        padding: 8,
                                                                        border: "1px solid #e5e7eb",
                                                                        borderRadius: 10,
                                                                    }}
                                                                >
                                                                    <div>
                                                                        <div>
                                                                            <strong>{item.nome_peca || item.nome || "-"}</strong>
                                                                        </div>
                                                                        <div style={{ fontSize: 12, color: "#555" }}>
                                                                            Código: {item.peca_id || "-"}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}