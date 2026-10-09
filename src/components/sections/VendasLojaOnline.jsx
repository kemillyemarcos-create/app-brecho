import { useEffect, useMemo, useState } from 'react';
import ConciliacaoLoja from './ConciliacaoLoja';
import { supabase } from '../../lib/supabase';
import { consultarPedidosLoja, filtrarPedidosLoja, itensPedidoLoja, resumirPedidosLoja } from './vendasLoja';

const painel = { background: 'var(--kc-panel)', color: 'var(--kc-text)', border: '1px solid var(--kc-border)', borderRadius: 16 };
const suave = { color: 'var(--kc-text-muted)', fontSize: 13 };
const botao = ativo => ({ padding: '10px 14px', minHeight: 40, borderRadius: 12, border: `1px solid var(${ativo ? '--kc-primary' : '--kc-border'})`, background: ativo ? 'var(--kc-soft)' : 'var(--kc-panel)', color: 'var(--kc-primary)', fontWeight: 800, cursor: 'pointer' });
const statusPedido = { pago: 'Pago', pendente_pagamento: 'Pendente de pagamento', expirado: 'Expirado', cancelado: 'Cancelado' };
const statusPagamento = { paid: 'Pago', pending: 'Pendente', expired: 'Expirado', failed: 'Falhou', refunded: 'Reembolsado', cancelled: 'Cancelado', canceled: 'Cancelado' };

export default function VendasLojaOnline(props) {
    const [modo, setModo] = useState('vendas');
    return <div style={{display:'grid',gap:16}}>
        <div role="group" aria-label="Modo da Loja Online" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[['vendas','Vendas confirmadas'],['conciliacao','Conciliação']].map(([valor,rotulo]) =>
                <button key={valor} type="button" aria-pressed={modo === valor} style={botao(modo === valor)} onClick={() => setModo(valor)}>{rotulo}</button>)}
        </div>
        {modo === 'vendas' ? <VendasConfirmadas {...props} /> : <ConciliacaoLoja key={props.empresaId} {...props} />}
    </div>;
}

function VendasConfirmadas({ empresaId, boxGrande, tituloSecao, input, isMobile, formatarBRL, formatarDataHoraBR }) {
    const [pedidos, setPedidos] = useState([]);
    const [carregando, setCarregando] = useState(Boolean(empresaId));
    const [erro, setErro] = useState('');
    const [versao, setVersao] = useState(0);
    const [busca, setBusca] = useState('');

    useEffect(() => {
        let ativo = true;
        setPedidos([]);
        setErro('');
        setCarregando(Boolean(empresaId));
        if (empresaId) {
            consultarPedidosLoja(empresaId, (nome, parametros) => supabase.rpc(nome, parametros))
                .then(lista => { if (ativo) setPedidos(lista); })
                .catch(() => { if (ativo) setErro('Não foi possível carregar os pedidos da Loja Online. Tente atualizar novamente.'); })
                .finally(() => { if (ativo) setCarregando(false); });
        }
        return () => { ativo = false; };
    }, [empresaId, versao]);

    const resumo = useMemo(() => resumirPedidosLoja(pedidos), [pedidos]);
    const filtrados = useMemo(() => filtrarPedidosLoja(pedidos, busca), [pedidos, busca]);
    const disponivel = Boolean(empresaId) && !carregando && !erro;

    return <section aria-label="Vendas da Loja Online" style={{ ...boxGrande, ...painel, padding: isMobile ? 14 : 20, display: 'grid', gap: 18 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, flexWrap: 'wrap' }}>
            <div>
                <h2 style={{ ...tituloSecao, margin: 0 }}>Gestão de vendas — Loja Online</h2>
                <p style={{ ...suave, marginBottom: 0 }}>Acompanhe as vendas confirmadas automaticamente pela Loja Online.</p>
            </div>
            <button type="button" style={botao(false)} disabled={!empresaId || carregando} onClick={() => setVersao(v => v + 1)}>Atualizar</button>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
            {[
                ['Pedidos pagos', resumo.pagos], ['Peças vendidas', resumo.pecas], ['Faturamento', formatarBRL(resumo.faturamento)],
            ].map(([rotulo, valor]) => <div key={rotulo} style={{ ...painel, padding: 15 }}>
                <div style={{ ...suave, fontWeight: 800 }}>{rotulo}</div>
                <strong style={{ display: 'block', marginTop: 6, fontSize: 26, color: 'var(--kc-primary)' }}>{disponivel ? valor : '—'}</strong>
            </div>)}
        </div>
        <p style={{ ...suave, margin: 0 }}>Somente vendas efetivadas (pedido Pago), dentre os 100 pedidos mais recentes retornados pela loja. A busca não altera o resumo.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input aria-label="Buscar pedidos da Loja Online" placeholder="Cliente, peça ou ID do pedido" value={busca} onChange={e => setBusca(e.target.value)}
                style={{ ...input, flex: '1 1 240px', minWidth: 0, maxWidth: '100%' }} />
        </div>
        {!empresaId && <p role="status">Selecione uma empresa para consultar os pedidos.</p>}
        {carregando && <p role="status">Carregando pedidos da Loja Online…</p>}
        {erro && <p role="alert" style={{ color: '#b91c1c' }}>{erro}</p>}
        {disponivel && filtrados.length === 0 && <p role="status">{busca.trim() ? 'Nenhuma venda corresponde à busca.' : 'Nenhuma venda efetivada da Loja Online encontrada.'}</p>}
        {disponivel && filtrados.map(pedido => {
            const itens = itensPedidoLoja(pedido);
            return <details key={pedido.pedido_id} style={{ ...painel, padding: 16 }}>
                <summary style={{ cursor: 'pointer', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', marginRight: 10, background: 'var(--kc-soft)', color: 'var(--kc-primary)', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>Loja Online</span>
                    <strong>{pedido.cliente_nome || 'Cliente não informado'}</strong>
                    <span style={{ display: 'block', marginTop: 6 }}>{formatarDataHoraBR(pedido.criado_em)} · {itens.length} {itens.length === 1 ? 'peça' : 'peças'} · <strong>{formatarBRL(Number(pedido.total) || 0)}</strong></span>
                    <span style={{ display: 'block', ...suave }}>Pedido: {statusPedido[pedido.status] || pedido.status || 'Não informado'} · Pagamento: {statusPagamento[pedido.pagamento_status] || pedido.pagamento_status || 'Não iniciado'}</span>
                    <small style={{ display: 'block', ...suave }}>ID: {pedido.pedido_id}</small>
                    <span style={{ ...suave, textDecoration: 'underline' }}>Ver peças do pedido</span>
                </summary>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: 0 }}>
                    {itens.map((item, indice) => <li key={`${item.peca_id}:${indice}`} style={{ borderTop: '1px solid var(--kc-border)', paddingBlock: 12, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
                        <span><strong>{item.peca_id}</strong> — {item.nome}</span><span>{formatarBRL(Number(item.preco) || 0)}</span>
                    </li>)}
                    {!itens.length && <li>Nenhuma peça informada neste pedido.</li>}
                </ul>
            </details>;
        })}
    </section>;
}
