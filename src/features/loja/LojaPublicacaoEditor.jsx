const opcoes = {
  categoria: ['blusas', 'camisas', 'calcas', 'shorts', 'saias', 'vestidos', 'jaquetas', 'casacos', 'moletons', 'tricots', 'conjuntos', 'macacoes', 'calcados', 'bolsas', 'acessorios', 'moda_infantil', 'outros'],
  condicao: ['novo_com_etiqueta', 'novo_sem_etiqueta', 'excelente', 'muito_bom', 'bom', 'sinais_de_uso'],
};
const rotulos = { marca: 'Marca', categoria: 'Categoria', tamanho: 'Tamanho', condicao: 'Condição', descricao: 'Descrição comercial' };
export default function LojaPublicacaoEditor({ pecas, pecaId, peca, publicacao, fotos, campos, onCampo, onSelecionar, onSalvar, onFoto, onPublicar, onFechar, urlFoto, ocupado, carregando, erro, mensagem }) {
  return <section className="kc-lg-editor" id="kc-lg-editor" aria-labelledby="kc-lg-editor-titulo">
    <div className="kc-lg-titulo-linha"><div><h2 id="kc-lg-editor-titulo">{publicacao ? 'Gerenciar publicação' : 'Publicar nova peça'}</h2><p>Selecione, revise e prepare sua peça para a loja.</p></div><button type="button" className="kc-lg-link" onClick={onFechar} disabled={ocupado}>Fechar editor</button></div>
    <label className="kc-lg-selecao">Selecione uma peça do estoque<select value={pecaId} onChange={e => onSelecionar(e.target.value)} disabled={ocupado}><option value="">Selecione uma peça</option>{pecas.filter(p => !p.vendido).map(p => <option key={p.id} value={p.id}>{p.id} — {p.nome}</option>)}</select></label>
    {carregando && <p role="status">Carregando publicação…</p>}
    {peca && !carregando && <>
      <div className="kc-lg-etapa"><h3>Dados da peça <small>Vindos do ERP</small></h3><dl className="kc-lg-dados"><div><dt>Nome</dt><dd>{peca.nome}</dd></div><div><dt>Preço</dt><dd>{peca.venda}</dd></div><div className="kc-lg-largura"><dt>Observações públicas</dt><dd>{peca.obs || 'Preencha as observações no cadastro da peça.'}</dd></div></dl></div>
      <form onSubmit={onSalvar} className="kc-lg-etapa"><h3>Informações do anúncio <small>Geridas na Loja</small></h3>
        {publicacao?.publicada && <p className="kc-lg-nota">Este anúncio está publicado. Despublique para editar os dados e adicionar fotos.</p>}
        <div className="kc-lg-campos">{Object.keys(rotulos).map(k => <label key={k} className={k === 'descricao' ? 'kc-lg-largura' : ''}>{rotulos[k]}
          {opcoes[k] ? <select value={campos[k]} required disabled={ocupado || publicacao?.publicada} onChange={e => onCampo(k, e.target.value)}><option value="">Selecione</option>{opcoes[k].map(o => <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>)}</select>
          : k === 'descricao' ? <textarea rows={4} value={campos[k]} required maxLength={4000} disabled={ocupado || publicacao?.publicada} onChange={e => onCampo(k, e.target.value)} />
          : <input value={campos[k]} required maxLength={120} disabled={ocupado || publicacao?.publicada} onChange={e => onCampo(k, e.target.value)} />}
        </label>)}</div>
        <button className="kc-lg-secundario" disabled={ocupado || publicacao?.publicada}>Salvar rascunho</button>
      </form>
      <div className="kc-lg-etapa"><h3>Fotos <small>Galeria exclusiva da Loja</small></h3>
        {!publicacao ? <p className="kc-lg-nota">Salve o rascunho para adicionar as fotos da publicação.</p> : <>
          <p className="kc-lg-nota">{fotos.length}/10 fotos · JPEG, PNG ou WebP de até 10 MB por arquivo.</p>
          <div className="kc-lg-fotos">{fotos.map(f => <figure key={f.id}><img width="90" height="110" alt={f.principal ? 'Foto principal' : 'Foto da peça'} src={urlFoto(f.storage_path)} /><figcaption>{f.principal ? 'Principal' : 'Galeria'}</figcaption></figure>)}</div>
          {!publicacao.publicada && <label className="kc-lg-upload">Adicionar foto<input type="file" accept="image/jpeg,image/png,image/webp" disabled={ocupado || fotos.length >= 10} onChange={onFoto} /></label>}
          <div className="kc-lg-publicar"><span className="kc-lg-badge">{publicacao.publicada ? 'Publicado' : 'Rascunho'}</span><button type="button" className={publicacao.publicada ? 'kc-lg-secundario' : 'kc-lg-primario'} disabled={ocupado} onClick={onPublicar}>{publicacao.publicada ? 'Despublicar para editar' : 'Publicar na loja'}</button></div>
        </>}
      </div>
    </>}
    {erro && <p className="kc-lg-alerta" role="alert">{erro}</p>}{mensagem && <p className="kc-lg-nota" role="status">{mensagem}</p>}
  </section>;
}
