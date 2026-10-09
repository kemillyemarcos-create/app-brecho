import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { consultarPedidosLoja, filtrarPedidosLoja, resumirPedidosLoja } from './vendasLoja';
import VendasSection from './VendasSection';
import VendasLojaOnline from './VendasLojaOnline';
vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));

const pedidos = [
    { pedido_id: 'novo', cliente_nome: 'Ana', status: 'expirado', pagamento_status: 'paid', total: 900, itens: [{ peca_id: 'KC01', nome: 'Vestido' }] },
    { pedido_id: 'meio', cliente_nome: 'Cláudia', status: 'pago', pagamento_status: 'paid', total: '100.50', itens: [{ peca_id: 'KC02', nome: 'Jaqueta' }, { peca_id: 'KC03', nome: 'Calça' }] },
    { pedido_id: 'anterior', cliente_nome: 'Bia', status: 'pendente_pagamento', total: 500, itens: [{ peca_id: 'KC04', nome: 'Blusa' }] },
    { pedido_id: 'antigo', cliente_nome: 'Ana', status: 'pago', total: 20, itens: [{ peca_id: 'KC05', nome: 'Saia' }] },
];

describe('Vendas Loja Online somente leitura', () => {
    it('contabiliza apenas status pago, mesmo se pagamento de expirado estiver paid', () => {
        expect(resumirPedidosLoja(pedidos)).toEqual({ pagos: 2, pecas: 3, faturamento: 120.5 });
    });
    it('mantém ordem recebida da RPC e não modifica os dados', () => {
        const original = structuredClone(pedidos);
        expect(filtrarPedidosLoja(pedidos, '').map(p => p.pedido_id)).toEqual(['meio','antigo']);
        expect(pedidos).toEqual(original);
    });
    it('pagos filtra exclusivamente pelo status do pedido', () => {
        expect(filtrarPedidosLoja(pedidos,'').map(p => p.pedido_id)).toEqual(['meio','antigo']);
    });
    it.each(['pendente_pagamento', 'expirado', 'cancelado', 'reembolsado'])('não mostra %s mesmo com pagamento paid', status => {
        const registro = {...pedidos[0], status, pagamento_status:'paid'};
        expect(filtrarPedidosLoja([registro], '')).toEqual([]);
        expect(filtrarPedidosLoja([registro], 'Ana')).toEqual([]);
        expect(resumirPedidosLoja([registro])).toEqual({pagos:0,pecas:0,faturamento:0});
    });
    it.each([['claudia','meio'],['kc03','meio'],['JAQUETA','meio'],['antigo','antigo']])('busca %s em cliente, código, nome ou ID', (busca,id) => {
        expect(filtrarPedidosLoja(pedidos,busca).map(p => p.pedido_id)).toEqual([id]);
    });
    it('busca somente vendas efetivadas, sem mudar o resumo comercial', () => {
        expect(filtrarPedidosLoja(pedidos,'Ana').map(p => p.pedido_id)).toEqual(['antigo']);
        expect(resumirPedidosLoja(pedidos).faturamento).toBe(120.5);
    });
    it('lista vazia e itens nulos são tratados', () => {
        expect(resumirPedidosLoja([])).toEqual({ pagos:0, pecas:0, faturamento:0 });
        expect(resumirPedidosLoja([{status:'pago',total:'25.00',itens:null}])).toEqual({pagos:1,pecas:0,faturamento:25});
        expect(filtrarPedidosLoja([{status:'pago',itens:null}], 'inexistente')).toEqual([]);
    });
    it('não consulta sem empresa', async () => {
        const rpc=vi.fn();
        expect(await consultarPedidosLoja('',rpc)).toEqual([]);
        expect(rpc).not.toHaveBeenCalled();
    });
    it('consulta somente a RPC existente com a empresa atual', async () => {
        const rpc=vi.fn().mockResolvedValue({data:pedidos,error:null});
        expect(await consultarPedidosLoja('empresa-A',rpc)).toBe(pedidos);
        expect(rpc).toHaveBeenCalledExactlyOnceWith('loja_painel_pedidos',{p_empresa_id:'empresa-A'});
    });
    it('propaga erro da RPC para a apresentação amigável', async () => {
        const error=new Error('negado');
        await expect(consultarPedidosLoja('empresa-B',vi.fn().mockResolvedValue({error}))).rejects.toBe(error);
    });
    it('RPC sem resultados devolve lista vazia', async () => {
        expect(await consultarPedidosLoja('empresa-A',vi.fn().mockResolvedValue({data:null}))).toEqual([]);
    });
});

const formatos={formatarBRL:v=>`R$ ${v}`,formatarDataHoraBR:v=>String(v || '')};
it('Live é o modo inicial e mantém registrar venda e resumo por clientes', () => {
    const html=renderToStaticMarkup(createElement(VendasSection, { ...formatos, clientesFiltrados:[], sugestoesPecasVenda:[], vendaId:'',cliente:'',filaEspera:'',valorDesconto:'' }));
    expect(html).toMatch(/aria-pressed="true"[^>]*>Live<\/button>/);
    expect(html).toContain('Registre vendas e acompanhe a operação em tempo real.');
    expect(html).toContain('Registrar venda');
    expect(html).toContain('Resumo por Clientes');
    expect(html).not.toContain('Carregando pedidos da Loja Online');
});
it('Loja indica carregamento antes de dados e não oferece mutações', () => {
    const html=renderToStaticMarkup(createElement(VendasLojaOnline,{...formatos,empresaId:'empresa-A'}));
    expect(html).toContain('Carregando pedidos da Loja Online');
    expect(html).toContain('Atualizar');
    expect(html).not.toContain('Filtrar pedidos');
    expect(html).not.toMatch(/>Todos<|>Pagos<|>Pendentes</);
    for (const texto of ['Cancelar pedido','Marcar como pago','Excluir pedido','Editar pedido']) expect(html).not.toContain(texto);
});
it('sem empresa não apresenta loading nem solicita acesso', () => {
    const html=renderToStaticMarkup(createElement(VendasLojaOnline,{...formatos,empresaId:''}));
    expect(html).toContain('Selecione uma empresa');
    expect(html).not.toContain('Carregando pedidos da Loja Online');
});
