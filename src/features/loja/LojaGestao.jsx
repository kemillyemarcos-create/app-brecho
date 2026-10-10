import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { enviarFotoGaleria } from './fotos';
import LojaPedidosLista from './LojaPedidosLista';
import LojaPublicacaoEditor from './LojaPublicacaoEditor';
import { linkLoja, resumoPedidos } from './gestaoLoja';
import './styles/loja-gestao.css';

const vazio = { marca: '', categoria: '', tamanho: '', condicao: '', descricao: '' };
export default function LojaGestao({ empresaId, empresaSlug, pecas = [] }) {
  const [editorAberto, setEditorAberto] = useState(false);
  const [publicadas, setPublicadas] = useState(null);
  const [erroResumo, setErroResumo] = useState('');
  const [erroPedidos, setErroPedidos] = useState('');
  const [carregandoPedidos, setCarregandoPedidos] = useState(Boolean(empresaId));
  const [carregandoEditor, setCarregandoEditor] = useState(false);
  const [falhaEditor, setFalhaEditor] = useState(false);
  const [versaoPedidos, setVersaoPedidos] = useState(0);
  const trava = useRef(false);
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
    setPedidos([]); setPublicadas(null); setErroPedidos(''); setErroResumo('');
    setCarregandoPedidos(Boolean(empresaId));
    if (empresaId) {
      supabase.rpc('loja_painel_pedidos', { p_empresa_id: empresaId })
        .then(({ data, error }) => {
          if (!ativo) return;
          if (error) throw error;
          setPedidos(Array.isArray(data) ? data : []);
        })
        .catch(() => { if (ativo) setErroPedidos('Não foi possível carregar os pedidos. Tente atualizar novamente.'); })
        .finally(() => { if (ativo) setCarregandoPedidos(false); });
      Promise.resolve(supabase.from('loja_publicacoes').select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId).eq('publicada', true))
        .then(({ count, error }) => {
          if (!ativo) return;
          if (error || !Number.isInteger(count)) throw error || new Error('Contagem indisponível');
          setPublicadas(count);
        })
        .catch(() => { if (ativo) setErroResumo('Contagem de publicações indisponível.'); });
    }
    return () => { ativo = false; };
  }, [empresaId, versaoPedidos, versao]);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setPublicacao(null); setFotos([]); setCampos(vazio); setFalhaEditor(false);
      if (!empresaId || !pecaId) { setCarregandoEditor(false); return; }
      setCarregandoEditor(true);
      try {
        const { data, error } = await supabase.from('loja_publicacoes').select('*').eq('empresa_id', empresaId).eq('peca_id', pecaId).maybeSingle();
        if (!ativo) return;
        if (error) throw error;
        if (!data) return;
        setPublicacao(data);
        setCampos(Object.fromEntries(Object.keys(vazio).map(k => [k, data[k] || ''])));
        const result = await supabase.from('loja_publicacao_fotos').select('id,storage_path,principal').eq('empresa_id', empresaId).eq('publicacao_id', data.id).order('ordem');
        if (!ativo) return;
        if (result.error) throw result.error;
        setFotos(result.data || []);
      } catch {
        if (ativo) { setFalhaEditor(true); setErro('Não foi possível carregar a publicação e suas fotos. Selecione a peça novamente.'); }
      } finally { if (ativo) setCarregandoEditor(false); }
    }
    carregar();
    return () => { ativo = false; };
  }, [empresaId, pecaId, versao]);

  async function executar(acao) {
    if (trava.current || carregandoEditor || falhaEditor) return;
    trava.current = true;
    setOcupado(true); setErro(''); setMensagem('');
    try { await acao(); setMensagem('Alteração salva.'); setVersao(v => v + 1); }
    catch (error) { setErro(error.message || 'Não foi possível salvar.'); }
    finally { trava.current = false; setOcupado(false); }
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
  const resumo = resumoPedidos(pedidos);
  const urlLoja = linkLoja(empresaSlug);
  const metricasProntas = empresaId && !carregandoPedidos && !erroPedidos;
  return <section className="kc-lg" aria-label="Gestão da Loja Online">
    <header className="kc-lg-header"><div><h1>Loja Online</h1><p>Gerencie anúncios e acompanhe pedidos da sua loja.</p></div>
      <div className="kc-lg-acoes"><button type="button" className="kc-lg-primario" disabled={!empresaId || ocupado} aria-expanded={editorAberto} aria-controls="kc-lg-editor" onClick={() => setEditorAberto(true)}>+ Publicar peça</button>
        {urlLoja ? <a className="kc-lg-link" href={urlLoja} target="_blank" rel="noopener noreferrer">Abrir minha loja ↗</a> : <span className="kc-lg-nota">Link da loja indisponível: endereço público não configurado.</span>}
      </div>
    </header>
    {!empresaId && <p role="status">Selecione uma empresa para gerenciar a loja.</p>}
    <dl className="kc-lg-resumo" aria-label="Resumo da loja">
      {[['Publicadas', publicadas ?? '—'], ['Aguardando pagamento', metricasProntas ? resumo.aguardando : '—'], ['Pagos recentes', metricasProntas ? resumo.pagos : '—'], ['Expirados recentes', metricasProntas ? resumo.expirados : '—']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <p className="kc-lg-nota">Publicadas: anúncios marcados como publicados. Indicadores de pedidos: recorte dos 100 mais recentes.</p>
    {erroResumo && <p className="kc-lg-nota" role="status">{erroResumo}</p>}
    {editorAberto && <LojaPublicacaoEditor pecas={pecas} pecaId={pecaId} peca={falhaEditor ? null : peca} publicacao={publicacao} fotos={fotos} campos={campos}
      onCampo={(k, valor) => setCampos(v => ({ ...v, [k]: valor }))}
      onSelecionar={id => { setPecaId(id); setPublicacao(null); setFotos([]); setCampos(vazio); setErro(''); setMensagem(''); setCarregandoEditor(Boolean(id)); }}
      onSalvar={salvar} onFoto={enviarFoto}
      onPublicar={() => executar(() => rpc(publicacao.publicada ? 'loja_despublicar_produto' : 'loja_publicar_produto', { p_publicacao_id: publicacao.id }))}
      onFechar={() => setEditorAberto(false)} urlFoto={path => supabase.storage.from('loja-produtos').getPublicUrl(path).data.publicUrl}
      ocupado={ocupado} carregando={carregandoEditor} erro={erro} mensagem={mensagem} />}
    <LojaPedidosLista pedidos={pedidos} carregando={carregandoPedidos} erro={erroPedidos} onAtualizar={() => setVersaoPedidos(v => v + 1)} />
  </section>;
}
