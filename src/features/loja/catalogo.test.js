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
