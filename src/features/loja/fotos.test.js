import { describe, expect, it, vi } from 'vitest';
import { enviarFotoGaleria } from './fotos';

function preparar({ count = 0, countError = null, uploadError = null, rpcError = null, registro = null, consultaError = null } = {}) {
  let consultas = 0;
  const upload = vi.fn().mockResolvedValue({ error: uploadError });
  const remove = vi.fn();
  const rpc = vi.fn().mockResolvedValue({ error: rpcError });
  const from = vi.fn(() => {
    const resultado = consultas++ === 0 ? { count, error: countError } : { data: registro, error: consultaError };
    const query = {
      select: vi.fn(() => query), eq: vi.fn(() => query),
      maybeSingle: vi.fn().mockResolvedValue(resultado),
      then: (resolve, reject) => Promise.resolve(resultado).then(resolve, reject),
    };
    return query;
  });
  const supabase = { from, rpc, storage: { from: vi.fn(() => ({ upload, remove })) } };
  const executar = () => enviarFotoGaleria({ supabase, empresaId: 'empresa', publicacaoId: 'publicacao', arquivo: { type: 'image/jpeg', size: 123 } });
  return { executar, upload, remove, rpc, from };
}

describe('envio e reconciliação de fotos', () => {
  it('não envia o 11º arquivo mesmo com a interface desatualizada', async () => {
    const c = preparar({ count: 10 });
    await expect(c.executar()).rejects.toThrow('máximo 10');
    expect(c.upload).not.toHaveBeenCalled();
  });
  it.each([{ countError: new Error('offline') }, { count: null }])('não envia sem contagem confiável: %j', async (opcoes) => {
    const c = preparar(opcoes);
    await expect(c.executar()).rejects.toThrow('Nenhum arquivo foi enviado');
    expect(c.upload).not.toHaveBeenCalled();
  });
  it('envia sem sobrescrever e registra o mesmo path', async () => {
    const c = preparar();
    await c.executar();
    expect(c.upload.mock.calls[0][2]).toEqual({ contentType: 'image/jpeg', upsert: false });
    expect(c.rpc.mock.calls[0][1].p_storage_path).toBe(c.upload.mock.calls[0][0]);
    expect(c.remove).not.toHaveBeenCalled();
  });
  it('reconhece registro confirmado após resposta perdida sem apagar o arquivo', async () => {
    const c = preparar({ rpcError: new Error('resposta perdida'), registro: { id: 'foto' } });
    await expect(c.executar()).resolves.toBeUndefined();
    expect(c.remove).not.toHaveBeenCalled();
  });
  it.each([{ registro: null }, { consultaError: new Error('offline') }])('preserva arquivo quando reconciliação é inconclusiva: %j', async (opcoes) => {
    const c = preparar({ rpcError: new Error('timeout'), ...opcoes });
    await expect(c.executar()).rejects.toThrow('Não foi possível confirmar o envio da foto. Atualize a galeria antes de tentar novamente.');
    expect(c.remove).not.toHaveBeenCalled();
  });
  it('não tenta registrar nem apagar após resposta ambígua do upload', async () => {
    const c = preparar({ uploadError: new Error('timeout') });
    await expect(c.executar()).rejects.toThrow('Atualize a galeria');
    expect(c.rpc).not.toHaveBeenCalled();
    expect(c.remove).not.toHaveBeenCalled();
  });
});
