function SecaoTitulo({
    titulo,
    quantidade,
    aberto,
    onToggle,
    linhaSecao,
    tituloLinha,
    setaLinha,
    extra,
}) {
    return (
        <div onClick={onToggle} style={linhaSecao}>
            <h3 style={tituloLinha}>
                {titulo} ({quantidade})
                {extra ? ` • ${extra}` : ""}
            </h3>
            <button
                type="button"
                style={setaLinha}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
            >
                {aberto ? "▼" : "▶"}
            </button>
        </div>
    );
}

function BotaoExpandir({ expandido, onClick }) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
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
            {expandido ? "▼" : "▶"}
        </button>
    );
}

function CabecalhoCard({
    isMobile,
    nome,
    liveId,
    mapaLivesPorId,
    faixas,
    onExpandir,
    expandido,
}) {
    return (
        <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BotaoExpandir expandido={expandido} onClick={onExpandir} />

                <strong
                    style={{
                        fontSize: isMobile ? 14 : 15,
                        lineHeight: 1.2,
                        wordBreak: "break-word",
                    }}
                >
                    {nome}
                </strong>
            </div>

            <div style={{ fontSize: isMobile ? 13 : 14, color: "#555" }}>
                Live: {mapaLivesPorId[String(liveId)]?.nome || liveId}
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                {faixas}
            </div>
        </div>
    );
}

function ListaItensSacolinha({ itens, itemLista, mapaPecasPorId, formatarBRL }) {
    if (!itens || itens.length === 0) {
        return <div style={itemLista}>Nenhum item encontrado nessa sacolinha.</div>;
    }

    return itens.map((item, index) => (
        <div key={item.id || `${item.peca_id}-${index}`} style={itemLista}>
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
                <strong>Valor:</strong> {formatarBRL(item.valor_venda || 0)}
            </div>
        </div>
    ));
}

function CardBase({
    isMobile,
    cardLista,
    cabecalho,
    acoes,
    expandido,
    conteudoExpandido,
}) {
    return (
        <div style={cardLista}>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                    gap: 12,
                    alignItems: "center",
                }}
            >
                {cabecalho}
                {acoes ? <div style={{ display: "grid", gap: 10 }}>{acoes}</div> : null}
            </div>

            {expandido ? (
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {conteudoExpandido}
                </div>
            ) : null}
        </div>
    );
}

function BlocoInfo({ titulo, children }) {
    return (
        <div
            style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 12,
                display: "grid",
                gap: 8,
            }}
        >
            <strong>{titulo}</strong>
            {children}
        </div>
    );
}

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
    totalSacolinhasVencidas,
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
    const isMobile = typeof window !== "undefined" ? window.innerWidth <= 767 : false;

    const blocoPrincipal = {
        border: "1px solid #f2dfe5",
        borderRadius: 28,
        padding: isMobile ? 16 : 24,
        background: "#fff",
        boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
    };

    const linhaSecao = {
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 12,
        padding: isMobile ? "10px 0" : "14px 0",
        cursor: "pointer",
    };

    const tituloLinha = {
        margin: 0,
        fontSize: isMobile ? 14 : 18,
        fontWeight: 500,
        color: "#111827",
        lineHeight: 1.2,
    };

    const setaLinha = {
        background: "transparent",
        border: "none",
        fontSize: 26,
        lineHeight: 1,
        cursor: "pointer",
        padding: 0,
        width: "auto",
        minWidth: "auto",
        color: "#111827",
    };

    const cardLista = {
        ...cardCliente,
        padding: isMobile ? 12 : 16,
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
    };

    const itemLista = {
        ...itemCliente,
        padding: isMobile ? 10 : 12,
        borderRadius: 12,
    };

    const badgeBase = {
        padding: "4px 10px",
        borderRadius: 10,
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
    };

    const blocoInterno = {
        marginTop: 10,
        display: "grid",
        gap: 10,
    };

    const botaoExpedicao = {
        ...botaoPequeno,
        width: "100%",
        minHeight: isMobile ? 38 : 40,
        padding: isMobile ? "8px 12px" : "9px 14px",
        borderRadius: isMobile ? 12 : 14,
        fontSize: 13,
        lineHeight: 1.15,
    };

    return (
        <div style={boxGrande}>
            <h2 style={tituloSecao}>Expedição</h2>

            {sacolinhasAgrupadas.length === 0 ? (
                <p>Nenhuma sacolinha encontrada.</p>
            ) : (
                <div style={blocoPrincipal}>
                    <SecaoTitulo
                        titulo="Sacolinhas abertas"
                        quantidade={sacolinhasAbertas.length}
                        aberto={mostrarAbertas}
                        onToggle={() => setMostrarAbertas((prev) => !prev)}
                        linhaSecao={linhaSecao}
                        tituloLinha={tituloLinha}
                        setaLinha={setaLinha}
                    />

                    {mostrarAbertas && (
                        <div style={blocoInterno}>
                            {sacolinhasAbertas.length === 0 ? (
                                <p>Nenhuma sacolinha aberta.</p>
                            ) : (
                                sacolinhasAbertas.map((s) => {
                                    const vencida = sacolinhaEstaVencida(s, todasVendasLive);

                                    return (
                                        <CardBase
                                            key={s.id}
                                            isMobile={isMobile}
                                            cardLista={cardLista}
                                            expandido={!!sacolinhasExpandidas[s.id]}
                                            cabecalho={
                                                <CabecalhoCard
                                                    isMobile={isMobile}
                                                    nome={s.cliente_nome}
                                                    liveId={s.live_id}
                                                    mapaLivesPorId={mapaLivesPorId}
                                                    expandido={!!sacolinhasExpandidas[s.id]}
                                                    onExpandir={() => toggleExpandirSacolinha(s.id)}
                                                    faixas={
                                                        <>
                                                            <span style={{ ...badgeBase, background: "#b45309" }}>
                                                                {s.status}
                                                            </span>

                                                            <span style={{ fontSize: isMobile ? 13 : 14 }}>
                                                                {s.quantidade} peça(s)
                                                            </span>

                                                            {vencida ? (
                                                                <span style={{ ...badgeBase, background: "#dc2626" }}>
                                                                    VENCIDA
                                                                </span>
                                                            ) : null}
                                                        </>
                                                    }
                                                />
                                            }
                                            acoes={
                                                <button
                                                    type="button"
                                                    style={{ ...botaoExpedicao, background: "#f59e0b" }}
                                                    onClick={() => marcarSacolinhaComoSeparada(s.id)}
                                                >
                                                    Marcar como separada
                                                </button>
                                            }
                                            conteudoExpandido={
                                                <ListaItensSacolinha
                                                    itens={s.itens}
                                                    itemLista={itemLista}
                                                    mapaPecasPorId={mapaPecasPorId}
                                                    formatarBRL={formatarBRL}
                                                />
                                            }
                                        />
                                    );
                                })
                            )}
                        </div>
                    )}

                    <SecaoTitulo
                        titulo="Separadas"
                        quantidade={sacolinhasSeparadas.length}
                        extra={`Vencidas (${totalSacolinhasVencidas})`}
                        aberto={mostrarSeparadas}
                        onToggle={() => setMostrarSeparadas((prev) => !prev)}
                        linhaSecao={linhaSecao}
                        tituloLinha={tituloLinha}
                        setaLinha={setaLinha}
                    />

                    {mostrarSeparadas && (
                        <div style={blocoInterno}>
                            {sacolinhasSeparadas.length === 0 ? (
                                <p>Nenhuma sacolinha separada.</p>
                            ) : (
                                sacolinhasSeparadas.map((s) => {
                                    const statusSacolinha = getStatusSacolinha(s, todasVendasLive);
                                    const podeIrParaExpedicao = sacolinhaPodeIrParaExpedicao(
                                        s,
                                        todasVendasLive
                                    );
                                    const vencida = sacolinhaEstaVencida(s, todasVendasLive);

                                    return (
                                        <CardBase
                                            key={s.id}
                                            isMobile={isMobile}
                                            cardLista={cardLista}
                                            expandido={!!sacolinhasExpandidas[s.id]}
                                            cabecalho={
                                                <CabecalhoCard
                                                    isMobile={isMobile}
                                                    nome={s.cliente_nome}
                                                    liveId={s.live_id}
                                                    mapaLivesPorId={mapaLivesPorId}
                                                    expandido={!!sacolinhasExpandidas[s.id]}
                                                    onExpandir={() => toggleExpandirSacolinha(s.id)}
                                                    faixas={
                                                        <>
                                                            <span
                                                                style={{
                                                                    ...badgeBase,
                                                                    background: vencida ? "#dc2626" : "#f59e0b",
                                                                    color: "#fff",
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                {vencida ? "VENCIDA" : "Separada"}
                                                            </span>

                                                            <span style={{ fontSize: isMobile ? 13 : 14 }}>
                                                                {s.quantidade} peça(s)
                                                            </span>

                                                            <span
                                                                style={{
                                                                    ...badgeBase,
                                                                    background:
                                                                        statusSacolinha === "pronta_envio"
                                                                            ? "#15803d"
                                                                            : statusSacolinha === "enviada"
                                                                            ? "#2563eb"
                                                                            : statusSacolinha === "aguardando_pagamento"
                                                                            ? "#dc2626"
                                                                            : "#b45309",
                                                                }}
                                                            >
                                                                {statusSacolinha === "pronta_envio" && "pago"}
                                                                {statusSacolinha === "aguardando_pagamento" && "pendente"}
                                                                {statusSacolinha === "enviada" && "enviado"}
                                                                {statusSacolinha === "em_andamento" && "em andamento"}
                                                            </span>
                                                        </>
                                                    }
                                                />
                                            }
                                            acoes={
                                                <>
                                                    <button
                                                        type="button"
                                                        style={{
                                                            ...botaoExpedicao,
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

                                                    <button
                                                        type="button"
                                                        style={{
                                                            ...botaoExpedicao,
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
                                                </>
                                            }
                                            conteudoExpandido={
                                                <ListaItensSacolinha
                                                    itens={s.itens}
                                                    itemLista={itemLista}
                                                    mapaPecasPorId={mapaPecasPorId}
                                                    formatarBRL={formatarBRL}
                                                />
                                            }
                                        />
                                    );
                                })
                            )}
                        </div>
                    )}

                    <SecaoTitulo
                        titulo="Pedidos de Envio"
                        quantidade={pedidosEnvioEmMontagem.length}
                        aberto={mostrarPedidosEnvio}
                        onToggle={() => setMostrarPedidosEnvio((prev) => !prev)}
                        linhaSecao={linhaSecao}
                        tituloLinha={tituloLinha}
                        setaLinha={setaLinha}
                    />

                    {mostrarPedidosEnvio && (
                        <div style={blocoInterno}>
                            {carregandoPedidosEnvio ? (
                                <p>Carregando pedidos de envio...</p>
                            ) : pedidosEnvioEmMontagem.length === 0 ? (
                                <p>Nenhum pedido de envio criado ainda.</p>
                            ) : (
                                pedidosEnvioEmMontagem.map((p) => (
                                    <CardBase
                                        key={p.id}
                                        isMobile={isMobile}
                                        cardLista={cardLista}
                                        expandido={!!pedidosEnvioExpandidos[p.id]}
                                        cabecalho={
                                            <div style={{ display: "grid", gap: 10 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <BotaoExpandir
                                                        expandido={!!pedidosEnvioExpandidos[p.id]}
                                                        onClick={() => toggleExpandirPedidoEnvio(p.id)}
                                                    />

                                                    <strong
                                                        style={{
                                                            fontSize: isMobile ? 14 : 15,
                                                            lineHeight: 1.2,
                                                            wordBreak: "break-word",
                                                        }}
                                                    >
                                                        {p.cliente_nome}
                                                    </strong>
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 8,
                                                        alignItems: "center",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <span style={{ ...badgeBase, background: "#2563eb" }}>
                                                        {p.status}
                                                    </span>

                                                    <span style={{ fontSize: isMobile ? 13 : 14 }}>
                                                        {p.sacolinhas?.length || 0} sacolinha(s)
                                                    </span>

                                                    <span style={{ fontSize: isMobile ? 13 : 14 }}>
                                                        {p.quantidadeCalculada} peça(s)
                                                    </span>

                                                    <span
                                                        style={{
                                                            ...badgeBase,
                                                            background: pedidoEstaConferido(p, itensConferidosPedido)
                                                                ? "#15803d"
                                                                : "#b45309",
                                                        }}
                                                    >
                                                        Conferido: {(itensConferidosPedido[p.id] || []).length} /{" "}
                                                        {p.quantidadeCalculada}
                                                    </span>
                                                </div>
                                            </div>
                                        }
                                        acoes={
                                            <>
                                                <button
                                                    type="button"
                                                    style={{ ...botaoExpedicao, background: "#6b7280" }}
                                                    onClick={() => cancelarPedidoDeEnvio(p.id, p.cliente_nome)}
                                                >
                                                    Voltar para separadas
                                                </button>

                                                <button
                                                    type="button"
                                                    style={{
                                                        ...botaoExpedicao,
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
                                            </>
                                        }
                                        conteudoExpandido={
                                            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                                                <BlocoInfo titulo="Sacolinhas incluídas">
                                                    {!p.sacolinhas || p.sacolinhas.length === 0 ? (
                                                        <div>Nenhuma sacolinha vinculada.</div>
                                                    ) : (
                                                        p.sacolinhas.map((sacolinha) => (
                                                            <div key={sacolinha.id} style={itemLista}>
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
                                                </BlocoInfo>

                                                <BlocoInfo titulo="Itens do pedido">
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
                                                                        padding: 10,
                                                                        border: "1px solid #e5e7eb",
                                                                        borderRadius: 12,
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
                                                </BlocoInfo>
                                            </div>
                                        }
                                    />
                                ))
                            )}
                        </div>
                    )}

                    <SecaoTitulo
                        titulo="Enviadas"
                        quantidade={pedidosEnvioConcluidos.length}
                        aberto={mostrarEnviadas}
                        onToggle={() => setMostrarEnviadas((prev) => !prev)}
                        linhaSecao={linhaSecao}
                        tituloLinha={tituloLinha}
                        setaLinha={setaLinha}
                    />

                    {mostrarEnviadas && (
                        <div style={blocoInterno}>
                            {pedidosEnvioConcluidos.length === 0 ? (
                                <p>Nenhum pedido enviado ainda.</p>
                            ) : (
                                pedidosEnvioConcluidos.map((p) => (
                                    <div key={p.id} style={{ ...cardLista, opacity: 0.9 }}>
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                                                gap: 12,
                                                alignItems: "center",
                                            }}
                                        >
                                            <div style={{ display: "grid", gap: 10 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <BotaoExpandir
                                                        expandido={!!pedidosEnvioExpandidos[p.id]}
                                                        onClick={() => toggleExpandirPedidoEnvio(p.id)}
                                                    />

                                                    <strong
                                                        style={{
                                                            fontSize: isMobile ? 14 : 15,
                                                            lineHeight: 1.2,
                                                            wordBreak: "break-word",
                                                        }}
                                                    >
                                                        {p.cliente_nome}
                                                    </strong>
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 8,
                                                        alignItems: "center",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <span style={{ ...badgeBase, background: "#15803d" }}>
                                                        enviado
                                                    </span>

                                                    <span style={{ fontSize: isMobile ? 13 : 14 }}>
                                                        {p.sacolinhas?.length || 0} sacolinha(s)
                                                    </span>

                                                    <span style={{ fontSize: isMobile ? 13 : 14 }}>
                                                        {p.quantidadeCalculada} peça(s)
                                                    </span>

                                                    <span style={{ fontSize: isMobile ? 13 : 14 }}>
                                                        Enviado em: {p.enviado_em || "-"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {pedidosEnvioExpandidos[p.id] ? (
                                            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                                                <BlocoInfo titulo="Sacolinhas enviadas">
                                                    {!p.sacolinhas || p.sacolinhas.length === 0 ? (
                                                        <div>Nenhuma sacolinha vinculada.</div>
                                                    ) : (
                                                        p.sacolinhas.map((sacolinha) => (
                                                            <div key={sacolinha.id} style={itemLista}>
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
                                                </BlocoInfo>

                                                <BlocoInfo titulo="Itens enviados">
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
                                                                    padding: 10,
                                                                    border: "1px solid #e5e7eb",
                                                                    borderRadius: 12,
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
                                                </BlocoInfo>
                                            </div>
                                        ) : null}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}