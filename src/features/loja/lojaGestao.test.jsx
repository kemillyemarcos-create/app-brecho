import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LojaGestao from './LojaGestao';
import LojaPedidosLista, { LojaPedidoDetalhe, LojaPedidoLinha } from './LojaPedidosLista';
import LojaPublicacaoEditor from './LojaPublicacaoEditor';
import { filtrarPedidos, linkLoja, resumoPedidos, rotuloPedido, rotuloPagamento } from './gestaoLoja';
vi.mock('../../lib/supabase', () => ({ supabase: { rpc:vi.fn(), from:vi.fn() } }));
const pedido = { pedido_id:'11111111-1111-4111-8111-111111111111', cliente_nome:'Marcos Lima', status:'expirado', pagamento_status:'paid', total:29, criado_em:'2026-10-09T15:00:00Z', itens:[{peca_id:'KC123',nome:'Calça ponto design',preco:29}] };
const render = element => renderToStaticMarkup(element);
const props = { pecas:[{id:'KC123',nome:'Calça',venda:'29,00',obs:'Observação ERP'},{id:'VENDIDA',nome:'Vendida',vendido:true}], pecaId:'KC123', peca:{id:'KC123',nome:'Calça',venda:'29,00',obs:'Observação ERP'}, campos:{marca:'Marca',categoria:'calcas',tamanho:'M',condicao:'bom',descricao:'Descrição'}, fotos:[], urlFoto:path => `/galeria/${path}` };
describe('gestão da Loja V1', () => {
  it('cabeçalho oferece publicação e link por slug, sem seletor solto inicial', () => {
    const html=render(<LojaGestao empresaId="empresa" empresaSlug="minha-loja" />);
    expect(html).toContain('Gerencie anúncios e acompanhe pedidos da sua loja.');
    expect(html).toContain('+ Publicar peça');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('empresa=minha-loja');
    expect(html).not.toContain('<select');
  });
  it('sem slug não inventa link por empresaId ou nome', () => {
    const html=render(<LojaGestao empresaId="nao-usar-como-slug" />);
    expect(html).not.toContain('Abrir minha loja');
    expect(html).toContain('endereço público não configurado');
    expect(linkLoja('')).toBeNull(); expect(linkLoja(null)).toBeNull();
    expect(new URL(linkLoja('loja & teste'),'https://local.test').searchParams.get('empresa')).toBe('loja & teste');
  });
  it('linha fechada mostra cliente, peça e badge, sem UUID ou status crus', () => {
    const html=render(<LojaPedidoLinha pedido={pedido} />);
    expect(html).toContain('Marcos Lima'); expect(html).toContain('Calça ponto design');
    expect(html).toContain('Expirado'); expect(html).toContain('Ver pedido');
    expect(html).not.toContain(pedido.pedido_id); expect(html).not.toContain('paid');
    expect(html).not.toContain('>Pago<');
  });
  it('detalhe mostra UUID, pagamento e alerta de pagamento tardio sem ações financeiras', () => {
    const html=render(<LojaPedidoDetalhe pedido={pedido} />);
    expect(html).toContain(pedido.pedido_id); expect(html).toContain('>Pago<');
    expect(html).toContain('>Expirado<'); expect(html).toContain('Pagamento recebido após o encerramento do pedido. A venda não foi confirmada automaticamente.');
    expect(html).not.toContain('<button'); expect(html).not.toContain('Forma de entrega');
  });
  it('mapeia todos os estados do pedido, sem fallback técnico', () => {
    expect(['pendente_pagamento','pago','expirado','cancelado','reembolsado'].map(rotuloPedido)).toEqual(['Aguardando pagamento','Pago','Expirado','Cancelado','Reembolsado']);
    expect(rotuloPedido('novo_estado')).toBe('Status indisponível');
  });
  it('mapeia todos os estados de pagamento e ausência', () => {
    expect(['pending','authorized','paid','failed','canceled','refunded','partially_refunded',null].map(rotuloPagamento)).toEqual(['Aguardando pagamento','Autorizado','Pago','Falhou','Cancelado','Reembolsado','Parcialmente reembolsado','Não iniciado']);
    expect(rotuloPagamento('novo_estado')).toBe('Status indisponível');
  });
  it('filtros usam pedido e Todos mantém cancelados/reembolsados na ordem recebida', () => {
    const lista=[pedido,...['pago','pendente_pagamento','cancelado','reembolsado'].map(status=>({...pedido,status}))];
    expect(filtrarPedidos(lista,'todos')).toEqual(lista);
    expect(filtrarPedidos(lista,'pago')).toEqual([lista[1]]);
    expect(filtrarPedidos(lista,'pendente_pagamento')).toEqual([lista[2]]);
    expect(filtrarPedidos(lista,'expirado')).toEqual([pedido]);
    expect(resumoPedidos(lista)).toEqual({aguardando:1,pagos:1,expirados:1});
  });
  it('expõe recorte dos 100 recentes e estados de loading, erro e vazio', () => {
    const html=render(<LojaPedidosLista pedidos={[]} />);
    expect(html).toContain('100 pedidos mais recentes'); expect(html).toContain('ainda não tem pedidos');
    expect(render(<LojaPedidosLista pedidos={[]} carregando />)).toContain('Carregando pedidos');
    expect(render(<LojaPedidosLista pedidos={[]} erro="Não foi possível carregar." />)).toContain('role="alert"');
  });
  it('editor separa ERP, anúncio e galeria sem peça vendida no seletor', () => {
    const html=render(<LojaPublicacaoEditor {...props} />);
    expect(html).toContain('Publicar nova peça'); expect(html).toContain('Vindos do ERP');
    expect(html).toContain('Observação ERP'); expect(html).toContain('Informações do anúncio');
    expect(html).toContain('Galeria exclusiva da Loja'); expect(html).not.toContain('VENDIDA');
    expect(html).not.toContain('type="file"'); expect(html).toContain('Salve o rascunho');
    expect(html).toContain('maxLength="4000"');
  });
  it('rascunho mantém upload, limites e publicação', () => {
    const html=render(<LojaPublicacaoEditor {...props} publicacao={{publicada:false}} />);
    expect(html).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(html).toContain('0/10 fotos'); expect(html).toContain('Publicar na loja');
    expect(html).toContain('Salvar rascunho');
  });
  it('anúncio publicado mantém campos bloqueados e exige despublicação', () => {
    const html=render(<LojaPublicacaoEditor {...props} publicacao={{publicada:true}} fotos={[{id:1,storage_path:'loja/foto.jpg',principal:true}]} />);
    expect(html).toContain('Despublicar para editar'); expect(html).not.toContain('type="file"');
    expect(html).toMatch(/<textarea[^>]*disabled=""/);
    expect(html).toContain('/galeria/loja/foto.jpg'); expect(html).toContain('Foto principal');
  });
  it('10 fotos bloqueiam novo arquivo e operação ocupada bloqueia publicação', () => {
    const fotos=Array.from({length:10},(_,id)=>({id,storage_path:`foto${id}`}));
    const html=render(<LojaPublicacaoEditor {...props} publicacao={{publicada:false}} fotos={fotos} ocupado />);
    expect(html).toMatch(/type="file"[^>]*disabled=""/);
    expect(html).toMatch(/disabled="">Publicar na loja/);
  });
});
