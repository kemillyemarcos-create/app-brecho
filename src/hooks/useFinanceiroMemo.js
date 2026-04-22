import { useMemo } from "react";
import { getDataIsoLocal } from "../utils/dateUtils";

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
    function parseDataFlex(valor) {
        if (!valor) return null;

        const texto = String(valor).trim();
        if (!texto) return null;

        if (texto.includes("T")) {
            const dataIso = new Date(texto);
            return Number.isNaN(dataIso.getTime()) ? null : dataIso;
        }

        const match = texto.match(
            /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
        );

        if (match) {
            const [, dia, mes, ano, hora = "00", minuto = "00", segundo = "00"] = match;

            const dataBr = new Date(
                Number(ano),
                Number(mes) - 1,
                Number(dia),
                Number(hora),
                Number(minuto),
                Number(segundo)
            );

            return Number.isNaN(dataBr.getTime()) ? null : dataBr;
        }

        const dataDireta = new Date(texto);
        return Number.isNaN(dataDireta.getTime()) ? null : dataDireta;
    }

    function getDataVendaIso(venda) {
        return (
            getDataIsoLocal(venda?.data_hora) ||
            getDataIsoLocal(venda?.criado_em) ||
            getDataIsoLocal(venda?.data_venda) ||
            null
        );
    }

    function formatarDataBR(valor) {
        const iso = getDataIsoLocal(valor);
        if (!iso) return "";

        const [ano, mes, dia] = iso.split("-");
        return `${dia}/${mes}/${ano}`;
    }

    function getValorVendaPeca(peca) {
        return Number(peca?.valor_venda_final ?? limparMoeda(peca?.venda));
    }

    function getCustoPeca(peca) {
        return limparMoeda(peca?.custo || 0);
    }

    const pecasVendidas = useMemo(
        () => (pecas || []).filter((p) => !!p?.vendido),
        [pecas]
    );

    const pecasVendidasFiltradas = useMemo(
        () =>
            pecasVendidas.filter((p) => {
                if (!p?.data_venda) return false;

                const dataVendaIso =
                    getDataIsoLocal(p.data_venda) ||
                    converterDataPtBrParaIso(p.data_venda);

                if (!dataVendaIso) return false;

                if (dataInicialFiltro && dataVendaIso < dataInicialFiltro) return false;
                if (dataFinalFiltro && dataVendaIso > dataFinalFiltro) return false;

                return true;
            }),
        [pecasVendidas, dataInicialFiltro, dataFinalFiltro, converterDataPtBrParaIso]
    );

    const livesFiltradas = useMemo(
        () =>
            (listaLives || []).filter((live) => {
                const iso = getDataIsoLocal(live?.data_live);
                if (!iso) return true;

                if (dataInicialFiltro && iso < dataInicialFiltro) return false;
                if (dataFinalFiltro && iso > dataFinalFiltro) return false;

                return true;
            }),
        [listaLives, dataInicialFiltro, dataFinalFiltro]
    );

    const resumoClientes = useMemo(() => {
        const mapa = {};

        pecasVendidas.forEach((p) => {
            const nomeCliente = String(p?.cliente || "").trim();
            if (!nomeCliente) return;

            if (!mapa[nomeCliente]) {
                mapa[nomeCliente] = {
                    nome: nomeCliente,
                    pecas: 0,
                    total: 0,
                    itens: [],
                };
            }

            const valorVenda = getValorVendaPeca(p);

            mapa[nomeCliente].pecas += 1;
            mapa[nomeCliente].total += valorVenda;
            mapa[nomeCliente].itens.push({
                codigo: p.id,
                nomePeca: p.nome || "-",
                valor: valorVenda,
                dataVenda: p.data_venda || "",
            });
        });

        return Object.values(mapa)
            .map((c) => ({
                ...c,
                pago: !!pagamentosClientes[c.nome],
            }))
            .sort((a, b) => b.total - a.total);
    }, [pecasVendidas, pagamentosClientes]);

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

    const vendasFiltradasPeriodo = useMemo(
        () =>
            (todasVendasLive || []).filter((v) => {
                const dataVendaIso = getDataVendaIso(v);
                if (!dataVendaIso) return false;

                if (dataInicialFiltro && dataVendaIso < dataInicialFiltro) return false;
                if (dataFinalFiltro && dataVendaIso > dataFinalFiltro) return false;

                return true;
            }),
        [todasVendasLive, dataInicialFiltro, dataFinalFiltro]
    );

    const resumoFaturamentoPorLive = useMemo(
        () =>
            livesFiltradas
                .map((live) => {
                    const vendasDaLive = vendasFiltradasPeriodo.filter(
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
                    const dataObj = parseDataFlex(live.data_live);
                    const dataTimestamp = dataObj?.getTime() || 0;

                    return {
                        id: live.id,
                        nome: live.nome,
                        data: formatarDataBR(live.data_live) || "-",
                        dataTimestamp,
                        status: live.status || "-",
                        quantidade,
                        faturamento: faturamentoDaLive,
                        lucro: lucroDaLive,
                        ticketMedio,
                    };
                })
                .filter((live) => live.quantidade > 0 || (!dataInicialFiltro && !dataFinalFiltro))
                .sort((a, b) => b.dataTimestamp - a.dataTimestamp),
        [
            livesFiltradas,
            vendasFiltradasPeriodo,
            mapaPecasPorId,
            limparMoeda,
            dataInicialFiltro,
            dataFinalFiltro,
        ]
    );

    const totalPecas = (pecas || []).length;
    const totalVendidas = pecasVendidas.length;
    const totalDisponiveis = totalPecas - totalVendidas;

    const faturamento = pecasVendidas.reduce(
        (acc, p) => acc + getValorVendaPeca(p),
        0
    );

    const lucroEstimado = pecasVendidas.reduce(
        (acc, p) => acc + (getValorVendaPeca(p) - getCustoPeca(p)),
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
        (acc, p) => acc + getValorVendaPeca(p),
        0
    );

    const lucroFiltrado = pecasVendidasFiltradas.reduce(
        (acc, p) => acc + (getValorVendaPeca(p) - getCustoPeca(p)),
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
        vendasFiltradasPeriodo,
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