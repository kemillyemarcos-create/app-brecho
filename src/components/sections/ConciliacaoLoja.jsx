import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const painel = { border: '1px solid var(--kc-border)', background: 'var(--kc-panel)', color: 'var(--kc-text)', borderRadius: 16, padding: 18 };
const botao = { padding: '10px 14px', borderRadius: 12, border: '1px solid var(--kc-border)', background: 'var(--kc-panel)', color: 'var(--kc-primary)', cursor: 'pointer', fontWeight: 700 };
export const CONFIRMACAO_REEMBOLSO = 'Este pagamento será reembolsado pelo Mercado Pago.\nO pedido continuará expirado e nenhuma venda será criada.';

export default function ConciliacaoLoja({ empresaId, formatarBRL, formatarDataHoraBR }) {
    const [casos, setCasos] = useState([]);
    const [carregando, setCarregando] = useState(Boolean(empresaId));
    const [erro, setErro] = useState('');
    const [mensagem, setMensagem] = useState('');
    const [ocupado, setOcupado] = useState('');
    const [versao, setVersao] = useState(0);
    const trava = useRef(false);
    const montado = useRef(true);
    useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
    useEffect(() => {
        let ativo = true;
        setCasos([]); setErro(''); setCarregando(Boolean(empresaId));
        if (empresaId) {
            supabase.rpc('loja_painel_conciliacao', { p_empresa_id: empresaId })
                .then(({data,error}) => {
                    if (!ativo) return;
                    if (error) throw error;
                    setCasos(Array.isArray(data) ? data : []);
                })
                .catch(() => { if (ativo) setErro('Não foi possível carregar a conciliação. Tente atualizar novamente.'); })
                .finally(() => { if (ativo) setCarregando(false); });
        }
        return () => { ativo = false; };
    }, [empresaId, versao]);

    async function reembolsar(caso) {
        if (trava.current) return;
        const novo = caso.reembolso_estado === 'nao_iniciado';
        if (novo && !window.confirm(CONFIRMACAO_REEMBOLSO)) return;
        trava.current = true; setOcupado(caso.pagamento_id); setErro(''); setMensagem('');
        try {
            const { data, error } = await supabase.functions.invoke('mercado-pago-reembolsar', {
                body: { pagamentoId: caso.pagamento_id },
            });
            if (!montado.current) return;
            if (error || data?.erro) {
                setMensagem('Não foi possível confirmar o resultado. Atualize a conciliação para verificar esta mesma operação.');
            } else if (data?.estado === 'confirmado') {
                setMensagem('Reembolso confirmado. O pedido permanece expirado; nenhuma venda foi criada.');
            } else {
                setMensagem('Verificação necessária. Consulte novamente a mesma operação; não será criado outro reembolso.');
            }
        } catch {
            if (montado.current) setMensagem('Resposta não recebida. Verificação necessária: atualize antes de continuar.');
        } finally {
            trava.current = false;
            if (montado.current) { setOcupado(''); setVersao(v => v + 1); }
        }
    }
    return <section aria-label="Conciliação de pagamentos tardios" style={{...painel, display:'grid',gap:16}}>
        <header style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <div><h2 style={{margin:0}}>Conciliação</h2><p>Pagamentos recebidos após o prazo, sem venda efetivada.</p></div>
            <button type="button" style={botao} disabled={!empresaId || carregando || Boolean(ocupado)} onClick={() => setVersao(v => v + 1)}>Atualizar conciliação</button>
        </header>
        <p>Até 100 casos recentes. Reembolsos em processamento continuam aqui até a confirmação oficial.</p>
        {!empresaId && <p>Selecione uma empresa.</p>}
        {carregando && <p role="status">Carregando conciliação…</p>}
        {erro && <p role="alert">{erro}</p>}
        {mensagem && <p role="status">{mensagem}</p>}
        {!carregando && !erro && empresaId && casos.length === 0 && <p>Nenhum pagamento tardio elegível.</p>}
        {casos.map(caso => <article key={caso.pagamento_id} style={painel}>
            <span style={{color:'#b45309',fontWeight:700}}>Pagamento tardio</span>
            <h3>{caso.cliente_nome}</h3>
            <p>{formatarBRL(Number(caso.valor))} · Pago em {formatarDataHoraBR(caso.paid_at)}</p>
            <p>Pedido: {caso.pedido_status} · Pagamento: {caso.pagamento_status}</p>
            <small style={{overflowWrap:'anywhere'}}>Pedido {caso.pedido_id}</small>
            <ul>{(Array.isArray(caso.itens) ? caso.itens : []).map((item,i) => <li key={`${item.peca_id}:${i}`}>{item.peca_id} — {item.nome} · {formatarBRL(Number(item.preco))}</li>)}</ul>
            {caso.reembolso_estado !== 'nao_iniciado' && <p>Verificação necessária — {caso.reembolso_estado === 'processando' ? 'operação em andamento' : 'aguardando resultado oficial'}.</p>}
            <button type="button" style={botao} disabled={Boolean(ocupado)} onClick={() => reembolsar(caso)}>
                {ocupado === caso.pagamento_id ? 'Reembolsando...' : caso.reembolso_estado === 'nao_iniciado' ? 'Reembolsar pagamento' : 'Consultar reembolso'}
            </button>
        </article>)}
    </section>;
}
