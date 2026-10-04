import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { enviarFotoGaleria } from './fotos';

const opcoes = {
  categoria: ['blusas', 'camisas', 'calcas', 'shorts', 'saias', 'vestidos', 'jaquetas', 'casacos', 'moletons', 'tricots', 'conjuntos', 'macacoes', 'calcados', 'bolsas', 'acessorios', 'moda_infantil', 'outros'],
  condicao: ['novo_com_etiqueta', 'novo_sem_etiqueta', 'excelente', 'muito_bom', 'bom', 'sinais_de_uso'],
};
const vazio = { marca: '', categoria: '', tamanho: '', condicao: '', descricao: '' };
export default function LojaGestao({ empresaId, pecas = [] }) {
  const [pecaId, setPecaId] = useState('');
  const [publicacao, setPublicacao] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [campos, setCampos] = useState(vazio);
  const [pedidos, setPedidos] = useState([]);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [versao, setVersao] = useState(0);
  const peca = pecas.find(p => p.id === pecaId);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      if (!empresaId) return;
      const { data, error } = await supabase.rpc('loja_painel_pedidos', { p_empresa_id: empresaId });
      if (!ativo) return;
      if (error) setErro('Não foi possível consultar os pedidos da Loja. Verifique a migration do painel.');
      setPedidos(data || []);
    }
    carregar();
    return () => { ativo = false; };
  }, [empresaId, versao]);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setPublicacao(null); setFotos([]); setCampos(vazio); setMensagem('');
      if (!empresaId || !pecaId) return;
      const { data, error } = await supabase.from('loja_publicacoes').select('*').eq('empresa_id', empresaId).eq('peca_id', pecaId).maybeSingle();
      if (!ativo) return;
      if (error) { setErro('Não foi possível carregar a publicação.'); return; }
      if (!data) return;
      setPublicacao(data);
      setCampos(Object.fromEntries(Object.keys(vazio).map(k => [k, data[k] || ''])));
      const result = await supabase.from('loja_publicacao_fotos').select('id,storage_path,principal').eq('empresa_id', empresaId).eq('publicacao_id', data.id).order('ordem');
      if (ativo) {
        setFotos(result.data || []);
        if (result.error) setErro('Não foi possível carregar as fotos.');
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [empresaId, pecaId, versao]);

  async function executar(acao) {
    if (ocupado) return;
    setOcupado(true); setErro(''); setMensagem('');
    try { await acao(); setMensagem('Alteração salva.'); setVersao(v => v + 1); }
    catch (error) { setErro(error.message || 'Não foi possível salvar.'); }
    finally { setOcupado(false); }
  }
  async function rpc(nome, parametros) {
    const { data, error } = await supabase.rpc(nome, { p_empresa_id: empresaId, ...parametros });
    if (error) throw error;
    return data;
  }
  function salvar(event) {
    event.preventDefault();
    executar(() => rpc('loja_salvar_rascunho', {
      p_peca_id: pecaId, ...Object.fromEntries(Object.entries(campos).map(([k, v]) => [`p_${k}`, v])),
    }));
  }
  function enviarFoto(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo || !publicacao) return;
    executar(async () => {
      const extensoes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
      if (!extensoes[arquivo.type] || arquivo.size > 10485760) throw new Error('Use JPEG, PNG ou WebP de até 10 MB.');
      await enviarFotoGaleria({ supabase, empresaId, publicacaoId: publicacao.id, arquivo });
    });
  }
  return <section>
    <h2>Loja Online</h2>
    <p>Selecione uma peça do estoque. Nome, preço e observações são os mesmos do ERP. Fotos e descrição comercial são administradas aqui.</p>
    <label>Peça <select value={pecaId} onChange={e => setPecaId(e.target.value)} disabled={ocupado}>
      <option value="">Selecione</option>
      {pecas.filter(p => !p.vendido).map(p => <option key={p.id} value={p.id}>{p.id} — {p.nome}</option>)}
    </select></label>
    {peca && <>
      <p>{peca.nome} · Preço: {peca.venda} · Observações públicas: {peca.obs || 'Preencha as observações no cadastro da peça.'}</p>
      <form onSubmit={salvar} style={{ display: 'grid', gap: 12, maxWidth: 600 }}>
        {Object.keys(vazio).map(k => <label key={k}>{({ marca: 'Marca', categoria: 'Categoria', tamanho: 'Tamanho', condicao: 'Condição', descricao: 'Descrição' })[k]}
          {opcoes[k] ? <select value={campos[k]} required disabled={ocupado || publicacao?.publicada} onChange={e => setCampos(v => ({ ...v, [k]: e.target.value }))}><option value="">Selecione</option>{opcoes[k].map(o => <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>)}</select> : <input value={campos[k]} required maxLength={k === 'descricao' ? 4000 : 120} disabled={ocupado || publicacao?.publicada} onChange={e => setCampos(v => ({ ...v, [k]: e.target.value }))} style={{ display: 'block', width: '100%' }} />}
        </label>)}
        <button disabled={ocupado || publicacao?.publicada}>Salvar rascunho</button>
      </form>
      {publicacao && <>
        <p>Status: {publicacao.publicada ? 'Publicado' : 'Rascunho'} · {fotos.length}/10 fotos</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{fotos.map(f => <img key={f.id} width="90" height="110" style={{ objectFit: 'cover' }} alt={f.principal ? 'Foto principal' : 'Foto da peça'} src={supabase.storage.from('loja-produtos').getPublicUrl(f.storage_path).data.publicUrl} />)}</div>
        {!publicacao.publicada && <label>Adicionar foto<input type="file" accept="image/jpeg,image/png,image/webp" disabled={ocupado || fotos.length >= 10} onChange={enviarFoto} /></label>}
        <button disabled={ocupado} onClick={() => executar(() => rpc(publicacao.publicada ? 'loja_despublicar_produto' : 'loja_publicar_produto', { p_publicacao_id: publicacao.id }))}>{publicacao.publicada ? 'Despublicar para editar' : 'Publicar na Loja'}</button>
      </>}
    </>}
    {erro && <p role="alert">{erro}</p>}{mensagem && <p role="status">{mensagem}</p>}
    <h3>Pedidos recentes</h3><button onClick={() => setVersao(v => v + 1)} disabled={ocupado}>Atualizar pedidos</button>
    {pedidos.map(p => <article key={p.pedido_id} style={{ borderBottom: '1px solid #ddd', padding: 12 }}>
      <strong>{p.cliente_nome}</strong><p>{p.pedido_id} · {p.status} · Pagamento: {p.pagamento_status || 'não iniciado'} · R$ {Number(p.total).toFixed(2)}</p>
      {p.pagamento_status === 'paid' && p.status !== 'pago' && <p role="alert">Pagamento recebido sem confirmação automática do pedido. Verifique a reserva e contate a cliente antes de entregar.</p>}
      <ul>{p.itens.map(i => <li key={i.peca_id}>{i.peca_id} — {i.nome}</li>)}</ul>
    </article>)}
    {!pedidos.length && <p>Nenhum pedido carregado.</p>}
  </section>;
}
