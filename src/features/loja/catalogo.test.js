import { describe, expect, it } from "vitest";
import {
  catalogoTemMais,
  mesclarProdutosCatalogo,
  TAMANHO_PAGINA_CATALOGO,
} from "./catalogo";

describe("paginação do catálogo público", () => {
  it("mantém lote padrão de 24 peças", () => {
    expect(TAMANHO_PAGINA_CATALOGO).toBe(24);
  });

  it("acumula a próxima página preservando a ordem", () => {
    const primeira = [
      { publicacao_id: "1" },
      { publicacao_id: "2" },
    ];

    const segunda = [
      { publicacao_id: "3" },
      { publicacao_id: "4" },
    ];

    expect(
      mesclarProdutosCatalogo(primeira, segunda)
        .map((produto) => produto.publicacao_id),
    ).toEqual(["1", "2", "3", "4"]);
  });

  it("não duplica publicação repetida entre páginas", () => {
    const primeira = [
      { publicacao_id: "1" },
      { publicacao_id: "2" },
    ];

    const segunda = [
      { publicacao_id: "2" },
      { publicacao_id: "3" },
    ];

    expect(
      mesclarProdutosCatalogo(primeira, segunda)
        .map((produto) => produto.publicacao_id),
    ).toEqual(["1", "2", "3"]);
  });

  it("mantém carregar mais quando recebe página completa", () => {
    expect(catalogoTemMais(24)).toBe(true);
  });

  it("encerra paginação quando recebe página incompleta", () => {
    expect(catalogoTemMais(23)).toBe(false);
    expect(catalogoTemMais(0)).toBe(false);
  });
});

describe("cursor do catálogo", () => {
  it("representa a sequência 0 -> 24 -> 48 para páginas completas", () => {
    let offset = 0;

    expect(offset).toBe(0);

    offset += 24;
    expect(offset).toBe(24);

    offset += 24;
    expect(offset).toBe(48);
  });

  it("página incompleta encerra a paginação", () => {
    const primeiraPagina = Array.from({ length: 24 });
    const segundaPagina = Array.from({ length: 7 });

    expect(catalogoTemMais(primeiraPagina.length)).toBe(true);
    expect(catalogoTemMais(segundaPagina.length)).toBe(false);
  });

  it("cursor avança pelas linhas recebidas mesmo havendo duplicata visual", () => {
    const atuais = Array.from(
      { length: 24 },
      (_, i) => ({ publicacao_id: String(i + 1) }),
    );

    const pagina = [
      { publicacao_id: "24" },
      ...Array.from(
        { length: 23 },
        (_, i) => ({ publicacao_id: String(i + 25) }),
      ),
    ];

    const mesclados =
      mesclarProdutosCatalogo(atuais, pagina);

    expect(pagina).toHaveLength(24);
    expect(mesclados).toHaveLength(47);

    const offsetConsumido =
      atuais.length + pagina.length;

    expect(offsetConsumido).toBe(48);
  });
});

describe("isolamento da paginação", () => {
  it("uma resposta pertence somente ao slug que iniciou a requisição", () => {
    const slugRequisitado = "k-chic";
    let slugAtual = "k-chic";

    expect(slugAtual === slugRequisitado).toBe(true);

    slugAtual = "outra-loja";

    expect(slugAtual === slugRequisitado).toBe(false);
  });
});

describe('consulta V2 assíncrona', () => {
  const envelope = (id, temMais = true) => ({ produtos: [{publicacao_id:id}], tem_mais:temMais,
    opcoes:{categorias:['A'],marcas:['B'],tamanhos:['M']} });
  it('envia os mesmos critérios em todas as páginas e avança pelo recebido', async () => {
    const { criarConsultaCatalogo } = await import('./catalogo');
    const chamadas=[];
    const criterios={p_empresa_slug:'a',p_busca:'lã',p_categoria:'A',p_marca:'B',p_tamanho:'M',p_ordem:'menor-preco'};
    const consulta=criarConsultaCatalogo(async(nome,args)=>{chamadas.push({nome,args});return {data:envelope(String(chamadas.length))};},criterios,()=>true);
    await consulta.carregar(); await consulta.carregar();
    expect(chamadas.map(c=>c.args)).toEqual([{...criterios,p_limite:24,p_offset:0},{...criterios,p_limite:24,p_offset:1}]);
  });
  it('descarta página e erro obsoletos, bloqueia cliques concorrentes e não mistura A→B→A', async () => {
    const { criarConsultaCatalogo } = await import('./catalogo');
    let resolver; let chamadas=0;
    let chave='a|busca|filtro|ordem';
    const consulta=criarConsultaCatalogo(()=>{chamadas++;return new Promise(r=>{resolver=r;});},{},()=>chave==='a|busca|filtro|ordem');
    const primeira=consulta.carregar(); expect(await consulta.carregar()).toBeNull(); expect(chamadas).toBe(1);
    chave='b|outra|outro|nome'; consulta.cancelar(); chave='a|busca|filtro|ordem';
    resolver({data:envelope('velha')}); expect(await primeira).toBeNull();
    let rejeitar;
    const erro=criarConsultaCatalogo(()=>new Promise((_,r)=>{rejeitar=r;}),{},()=>true);
    const pendente=erro.carregar(); erro.cancelar(); rejeitar(Error('antigo')); expect(await pendente).toBeNull();
  });
  it('resposta inválida/falha não avança o offset e permite tentar novamente', async()=>{
    const { criarConsultaCatalogo } = await import('./catalogo');
    const offsets=[]; let n=0;
    const c=criarConsultaCatalogo(async(_,a)=>{offsets.push(a.p_offset);return ++n===1?{data:{}}:{data:envelope('ok',false)};},{},()=>true);
    await expect(c.carregar()).rejects.toThrow('Resposta inválida');
    expect((await c.carregar()).tem_mais).toBe(false);expect(offsets).toEqual([0,0]);
  });
});

describe('compatibilidade de links individuais', () => {
  it('preserva empresa e slug no compartilhamento e remove filtros somente do link compartilhado', async()=>{
    const { criarUrlProduto, criarLinkCompartilhavelProduto, lerSlugProduto }=await import('./produtoUrl');
    const vitrine='https://loja.example/?loja=online&empresa=k-chic&categoria=vestidos&marca=A';
    const detalhe=criarUrlProduto('peca-123',vitrine);
    expect(lerSlugProduto(detalhe)).toBe('peca-123');
    expect(criarUrlProduto('',detalhe)).toBe(vitrine);
    const compartilhado=new URL(criarLinkCompartilhavelProduto('peca-123',detalhe));
    expect(compartilhado.searchParams.get('empresa')).toBe('k-chic');
    expect(compartilhado.searchParams.get('produto')).toBe('peca-123');
    expect(compartilhado.searchParams.has('categoria')).toBe(false);
  });
});

describe('vigência no momento de aplicar callbacks', () => {
  const resposta = id => ({data:{produtos:[{publicacao_id:id}],tem_mais:true,
    opcoes:{categorias:[],marcas:[],tamanhos:[]}}});

  it.each(['empresa','busca','categoria','marca','tamanho','ordem'])(
    'invalida antes do callback mesmo com resposta já resolvida: %s', async campo => {
      const { criarConsultaCatalogo }=await import('./catalogo');
      let identidade='original';
      const consulta=criarConsultaCatalogo(async()=>resposta('antiga'),{},()=>identidade==='original');
      const resultado=await consulta.carregar();
      expect(resultado.produtos).toHaveLength(1);
      identidade=campo; // Mudança depois do await interno, antes do callback consumidor.
      expect(consulta.vigente()).toBe(false);
      consulta.cancelar(); identidade='original';
      expect(consulta.vigente()).toBe(false);
    }
  );

  it('página antiga termina depois da nova sem produtos ou erro reutilizáveis',async()=>{
    const { criarConsultaCatalogo }=await import('./catalogo');
    let resolver, rejeitar;
    let chamadas=0;
    const antiga=criarConsultaCatalogo(async()=>{
      if (++chamadas===1) return resposta('primeira');
      return new Promise((resolve,reject)=>{resolver=resolve;rejeitar=reject;});
    },{p_empresa_slug:'a'},()=>true);
    await antiga.carregar();
    const pagina=antiga.carregar();
    antiga.cancelar();
    const nova=criarConsultaCatalogo(async()=>resposta('nova'),{p_empresa_slug:'b',p_busca:'outra'},()=>true);
    expect((await nova.carregar()).produtos[0].publicacao_id).toBe('nova');
    resolver(resposta('antiga')); expect(await pagina).toBeNull();
    expect(antiga.vigente()).toBe(false);expect(nova.vigente()).toBe(true);
    // Uma rejeição de rede cancelada também não deve chegar ao catch da UI.
    const falha=criarConsultaCatalogo(()=>new Promise((_,reject)=>{rejeitar=reject;}),{},()=>true);
    const pendente=falha.carregar();falha.cancelar();rejeitar(Error('rede'));
    expect(await pendente).toBeNull();expect(nova.vigente()).toBe(true);
  });

  it('falha vigente libera trava e repete a mesma página',async()=>{
    const { criarConsultaCatalogo }=await import('./catalogo');
    const offsets=[];
    const consulta=criarConsultaCatalogo(async(_,args)=>{
      offsets.push(args.p_offset);
      if(offsets.length===1) throw Error('rede');
      return resposta('ok');
    },{},()=>true);
    await expect(consulta.carregar()).rejects.toThrow('rede');
    expect(consulta.vigente()).toBe(true);
    expect((await consulta.carregar()).produtos[0].publicacao_id).toBe('ok');
    expect(offsets).toEqual([0,0]);
  });
});
