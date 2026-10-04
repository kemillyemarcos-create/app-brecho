// Uma resposta perdida não prova que a operação falhou no servidor.
// Nunca excluir o objeto como compensação de uma resposta ambígua.
export async function enviarFotoGaleria({ supabase, empresaId, publicacaoId, arquivo }) {
  const galeria = () => supabase.from('loja_publicacao_fotos')
    .select('id', { count: 'exact' })
    .eq('empresa_id', empresaId).eq('publicacao_id', publicacaoId);
  const { count, error: erroContagem } = await galeria();
  if (erroContagem || !Number.isInteger(count) || count < 0) {
    throw new Error('Não foi possível conferir o limite de fotos. Nenhum arquivo foi enviado.');
  }
  if (count >= 10) throw new Error('A publicação permite no máximo 10 fotos.');

  const extensoes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const path = `${empresaId}/${publicacaoId}/${crypto.randomUUID()}.${extensoes[arquivo.type]}`;
  try {
    const { error } = await supabase.storage.from('loja-produtos')
      .upload(path, arquivo, { contentType: arquivo.type, upsert: false });
    if (error) throw error;
    const { error: erroRegistro } = await supabase.rpc('loja_adicionar_foto', {
      p_empresa_id: empresaId, p_publicacao_id: publicacaoId, p_storage_path: path,
      p_mime_type: arquivo.type, p_tamanho_bytes: arquivo.size, p_principal: count === 0,
    });
    if (erroRegistro) throw erroRegistro;
  } catch {
    // Uma consulta sem resultado também não autoriza excluir: o commit pode estar em andamento.
    try {
      const { data, error } = await galeria().eq('storage_path', path).maybeSingle();
      if (!error && data?.id) return;
    } catch {
      // Preservar o objeto também quando a consulta de reconciliação falhar.
    }
    console.error("Envio de foto ficou em estado inconclusivo.", {
      empresaId,
      publicacaoId,
      storagePath: path,
    });
    throw new Error("Não foi possível confirmar o envio da foto. Atualize a galeria antes de tentar novamente.");
  }
}
