import { useMemo } from "react";

export default function useFinanceiroMemo({
    pecas,
    pagamentosClientes,
    vendasLive,
    clientes,
    buscaCliente,
    filtroPagamentoCliente,
    buscaClienteCadastro,
    dataInicialFiltro,
    dataFinalFiltro,
    listaLives,
    todasVendasLive,
    mapaPecasPorId,
    limparMoeda,
    formatarCPF,
    formatarTelefone,
    converterDataPtBrParaIso,
}) {
    const resumoClientes = useMemo(() => {
        const mapa = {};

        (pecas || [])
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
    }, [pecas, pagamentosClientes, limparMoeda]);

    const resumoClientesLive = useMemo(
        () =>
            Object.values(
                (vendasLive || []).reduce((acc, venda) => {
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
                            mapaPecasPorId[String(venda.peca_id)]?.nome ||
                            venda.peca_id ||
                            "-",
                        valor: Number(venda.valor_venda || 0),
                        dataVenda: venda.data_hora || "-",
                        filaEspera: venda.fila_espera_nome || "",
                    });

                    return acc;
                }, {})
            ),
        [vendasLive, mapaPecasPorId]
    );

    const clientesFiltrados = useMemo(
        () =>
            resumoClientesLive.filter((c) => {
                const bateBusca = c.nome.toLowerCase().includes(buscaCliente.toLowerCase());

                if (!bateBusca) return false;
                if (filtroPagamentoCliente === "todos") return true;
                if (filtroPagamentoCliente === "pagos") return c.pago === true;
                if (filtroPagamentoCliente === "pendentes") return c.pago === false;

                return true;
            }),
        [resumoClientesLive, buscaCliente, filtroPagamentoCliente]
    );

    const clientesFiltradosCadastro = useMemo(() => {
        const termo = buscaClienteCadastro.trim().toLowerCase();

        if (!termo) return clientes;

        return (clientes || []).filter((c) => {
            const nome = String(c?.nome || "").toLowerCase();
            const cpf = formatarCPF(c?.cpf || "").toLowerCase();
            const telefone = formatarTelefone(c?.telefone || "").toLowerCase();
            const endereco = String(c?.endereco || "").toLowerCase();

            return (
                nome.includes(termo) ||
                cpf.includes(termo) ||
                telefone.includes(termo) ||
                endereco.includes(termo)
            );
        });
    }, [clientes, buscaClienteCadastro, formatarCPF, formatarTelefone]);

    const pecasVendidasFiltradas = useMemo(
        () =>
            (pecas || []).filter((p) => {
                if (!p.vendido || !p.data_venda) return false;

                const dataVendaIso = converterDataPtBrParaIso(p.data_venda);
                if (!dataVendaIso) return false;

                if (dataInicialFiltro && dataVendaIso < dataInicialFiltro) return false;
                if (dataFinalFiltro && dataVendaIso > dataFinalFiltro) return false;

                return true;
            }),
        [pecas, dataInicialFiltro, dataFinalFiltro, converterDataPtBrParaIso]
    );

    const livesFiltradas = useMemo(
        () =>
            (listaLives || []).filter((live) => {
                if (!live?.data_live) return true;

                const partes = String(live.data_live).split("/");
                if (partes.length !== 3) return true;

                const [dia, mes, ano] = partes;
                const dataLive = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;

                if (dataInicialFiltro && dataLive < dataInicialFiltro) return false;
                if (dataFinalFiltro && dataLive > dataFinalFiltro) return false;

                return true;
            }),
        [listaLives, dataInicialFiltro, dataFinalFiltro]
    );

    const resumoFaturamentoPorLive = useMemo(
        () =>
            livesFiltradas.map((live) => {
                const vendasDaLive = (todasVendasLive || []).filter(
                    (v) => String(v.live_id) === String(live.id)
                );

                const faturamentoDaLive = vendasDaLive.reduce(
                    (acc, v) => acc + Number(v.valor_venda || 0),
                    0
                );

                const lucroDaLive = vendasDaLive.reduce((acc, v) => {
                    const pecaOriginal = mapaPecasPorId[String(v.peca_id)];
                    const custo = limparMoeda(pecaOriginal?.custo || 0);
                    return acc + (Number(v.valor_venda || 0) - custo);
                }, 0);

                const quantidade = vendasDaLive.length;
                const ticketMedio = quantidade > 0 ? faturamentoDaLive / quantidade : 0;

                return {
                    id: live.id,
                    nome: live.nome,
                    data: live.data_live || "-",
                    status: live.status || "-",
                    quantidade,
                    faturamento: faturamentoDaLive,
                    lucro: lucroDaLive,
                    ticketMedio,
                };
            }),
        [livesFiltradas, todasVendasLive, mapaPecasPorId, limparMoeda]
    );

    const totalPecas = (pecas || []).length;
    const totalVendidas = (pecas || []).filter((p) => p.vendido).length;
    const totalDisponiveis = (pecas || []).filter((p) => !p.vendido).length;

    const faturamento = (pecas || [])
        .filter((p) => p.vendido)
        .reduce((acc, p) => acc + Number(p.valor_venda_final ?? limparMoeda(p.venda)), 0);

    const lucroEstimado = (pecas || [])
        .filter((p) => p.vendido)
        .reduce(
            (acc, p) =>
                acc + (Number(p.valor_venda_final ?? limparMoeda(p.venda)) - limparMoeda(p.custo)),
            0
        );

    const totalPecasLive = (vendasLive || []).length;

    const faturamentoLive = (vendasLive || []).reduce(
        (acc, venda) => acc + Number(venda.valor_venda || 0),
        0
    );

    const lucroEstimadoLive = (vendasLive || []).reduce((acc, venda) => {
        const pecaOriginal = mapaPecasPorId[String(venda.peca_id)];
        const custo = limparMoeda(pecaOriginal?.custo || 0);
        return acc + (Number(venda.valor_venda || 0) - custo);
    }, 0);

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
        quantidadeVendidaFiltrada > 0 ? faturamentoFiltrado / quantidadeVendidaFiltrada : 0;

    return {
        resumoClientes,
        resumoClientesLive,
        clientesFiltrados,
        clientesFiltradosCadastro,
        pecasVendidasFiltradas,
        livesFiltradas,
        resumoFaturamentoPorLive,
        totalPecas,
        totalVendidas,
        totalDisponiveis,
        faturamento,
        lucroEstimado,
        totalPecasLive,
        faturamentoLive,
        lucroEstimadoLive,
        faturamentoFiltrado,
        lucroFiltrado,
        quantidadeVendidaFiltrada,
        ticketMedioFiltrado,
    };
}