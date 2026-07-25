import {
  describe,
  expect,
  it,
} from "vitest";

import SkillRegistry, {
  criarSkillRegistry,
  encontrarSkill,
  normalizarTexto,
  validarSkill,
} from "../SkillRegistry";

function criarSkill({
  id,
  nome,
  aliases = [],
  patterns = [],
  categoria = "teste",
  tipo = "skill",
} = {}) {
  return {
    id,
    nome,
    aliases,
    patterns,
    categoria,
    tipo,

    async execute() {
      return {
        ok: true,
        resposta: nome,
      };
    },
  };
}

describe("SkillRegistry", () => {
  it("normaliza textos com acentos e letras maiúsculas", () => {
    expect(
      normalizarTexto(
        "  Última LIVE  "
      )
    ).toBe("ultima live");
  });

  it("valida uma Skill correta", () => {
    const skill = criarSkill({
      id: "resumo-vendas",
      nome: "Resumo de vendas",
    });

    const resultado =
      validarSkill(skill);

    expect(resultado.valida).toBe(
      true
    );

    expect(resultado.erros).toEqual(
      []
    );
  });

  it("rejeita uma Skill sem ID", () => {
    const resultado =
      validarSkill(
        criarSkill({
          id: "",
          nome: "Sem ID",
        })
      );

    expect(resultado.valida).toBe(
      false
    );

    expect(
      resultado.erros
    ).toContain(
      'A propriedade "id" é obrigatória.'
    );
  });

  it("rejeita uma Skill sem função execute", () => {
    const resultado =
      validarSkill({
        id: "skill-invalida",
        nome: "Skill inválida",
      });

    expect(resultado.valida).toBe(
      false
    );

    expect(
      resultado.erros
    ).toContain(
      'A propriedade "execute" deve ser uma função.'
    );
  });

  it("registra e lista Skills", () => {
    const skill = criarSkill({
      id: "resumo-vendas",
      nome: "Resumo de vendas",
    });

    const registry =
      new SkillRegistry();

    registry.registrar(skill);

    expect(registry.quantidade).toBe(
      1
    );

    expect(registry.listar()).toEqual(
      [skill]
    );
  });

  it("registra várias Skills no construtor", () => {
    const skillVendas =
      criarSkill({
        id: "resumo-vendas",
        nome: "Resumo de vendas",
      });

    const skillLives =
      criarSkill({
        id: "resumo-lives",
        nome: "Resumo de lives",
      });

    const registry =
      new SkillRegistry([
        skillVendas,
        skillLives,
      ]);

    expect(registry.quantidade).toBe(
      2
    );
  });

  it("busca uma Skill por ID", () => {
    const skill = criarSkill({
      id: "Resumo-Vendas",
      nome: "Resumo de vendas",
    });

    const registry =
      new SkillRegistry([skill]);

    expect(
      registry.buscarPorId(
        "resumo-vendas"
      )
    ).toBe(skill);
  });

  it("normaliza o ID durante a busca", () => {
    const skill = criarSkill({
      id: "relatorio-última-live",
      nome:
        "Relatório da última live",
    });

    const registry =
      new SkillRegistry([skill]);

    expect(
      registry.buscarPorId(
        "RELATORIO-ULTIMA-LIVE"
      )
    ).toBe(skill);
  });

  it("retorna null para ID inexistente", () => {
    const registry =
      new SkillRegistry();

    expect(
      registry.buscarPorId(
        "nao-existe"
      )
    ).toBeNull();
  });

  it("não permite IDs duplicados", () => {
    const primeira =
      criarSkill({
        id: "resumo-vendas",
        nome: "Resumo de vendas",
      });

    const segunda =
      criarSkill({
        id: "RESUMO-VENDAS",
        nome: "Outro resumo",
      });

    const registry =
      new SkillRegistry([
        primeira,
      ]);

    expect(() =>
      registry.registrar(segunda)
    ).toThrow(
      'Já existe uma Skill registrada com o ID "RESUMO-VENDAS".'
    );
  });

  it("encontra uma Skill por alias", () => {
    const skill = criarSkill({
      id: "resumo-vendas",
      nome: "Resumo de vendas",
      aliases: [
        "resumo de vendas",
      ],
    });

    const registry =
      new SkillRegistry([skill]);

    expect(
      registry.encontrarPorAlias(
        "Mostre o resumo de vendas"
      )
    ).toBe(skill);
  });

  it("encontra uma Skill por pattern", () => {
    const skill = criarSkill({
      id: "ultima-live",
      nome: "Última live",
      patterns: [
        "como foi a ultima live",
      ],
    });

    const registry =
      new SkillRegistry([skill]);

    expect(
      registry.encontrarPorAlias(
        "Como foi a última live?"
      )
    ).toBe(skill);
  });

  it("prioriza correspondência exata", () => {
    const skillGenerica =
      criarSkill({
        id: "vendas",
        nome: "Vendas",
        aliases: ["vendas"],
      });

    const skillEspecifica =
      criarSkill({
        id: "resumo-vendas",
        nome: "Resumo de vendas",
        aliases: [
          "resumo de vendas",
        ],
      });

    const registry =
      new SkillRegistry([
        skillGenerica,
        skillEspecifica,
      ]);

    expect(
      registry.encontrarPorAlias(
        "resumo de vendas"
      )
    ).toBe(skillEspecifica);
  });

  it("prioriza o termo mais específico", () => {
    const skillCurta =
      criarSkill({
        id: "live",
        nome: "Live",
        aliases: ["live"],
      });

    const skillLonga =
      criarSkill({
        id: "ultima-live",
        nome: "Última live",
        aliases: ["ultima live"],
      });

    const registry =
      new SkillRegistry([
        skillCurta,
        skillLonga,
      ]);

    expect(
      registry.encontrarPorAlias(
        "resultado da ultima live"
      )
    ).toBe(skillLonga);
  });

  it("retorna detalhes da correspondência", () => {
    const skill = criarSkill({
      id: "resumo-vendas",
      nome: "Resumo de vendas",
      aliases: [
        "resumo de vendas",
      ],
    });

    const registry =
      new SkillRegistry([skill]);

    const resultado =
      registry.encontrarDetalhado(
        "Quero o resumo de vendas"
      );

    expect(resultado.skill).toBe(
      skill
    );

    expect(
      resultado.termoEncontrado
    ).toBe("resumo de vendas");

    expect(
      resultado.pontuacao
    ).toBeGreaterThan(0);
  });

  it("retorna null para texto vazio", () => {
    const registry =
      new SkillRegistry([
        criarSkill({
          id: "vendas",
          nome: "Vendas",
          aliases: ["vendas"],
        }),
      ]);

    expect(
      registry.encontrarPorAlias("")
    ).toBeNull();
  });

  it("detecta aliases conflitantes", () => {
    const registry =
      new SkillRegistry([
        criarSkill({
          id: "vendas-hoje",
          nome: "Vendas hoje",
          aliases: [
            "resumo de hoje",
          ],
        }),

        criarSkill({
          id: "financeiro-hoje",
          nome: "Financeiro hoje",
          aliases: [
            "resumo de hoje",
          ],
        }),
      ]);

    expect(
      registry.listarConflitos()
    ).toEqual([
      {
        termo: "resumo de hoje",
        skillIds: [
          "vendas-hoje",
          "financeiro-hoje",
        ],
      },
    ]);
  });

  it("pode rejeitar aliases conflitantes em modo estrito", () => {
    const registry =
      new SkillRegistry(
        [
          criarSkill({
            id: "vendas-hoje",
            nome: "Vendas hoje",
            aliases: [
              "resumo de hoje",
            ],
          }),
        ],
        {
          rejeitarAliasesConflitantes:
            true,
        }
      );

    expect(() =>
      registry.registrar(
        criarSkill({
          id: "financeiro-hoje",
          nome: "Financeiro hoje",
          aliases: [
            "resumo de hoje",
          ],
        })
      )
    ).toThrow(
      /aliases conflitantes/
    );
  });

  it("gera diagnóstico do Registry", () => {
    const registry =
      criarSkillRegistry([
        criarSkill({
          id: "vendas",
          nome: "Vendas",
          aliases: ["resumo"],
        }),

        criarSkill({
          id: "lives",
          nome: "Lives",
          aliases: ["resumo"],
        }),
      ]);

    const diagnostico =
      registry.diagnosticar();

    expect(
      diagnostico.quantidadeSkills
    ).toBe(2);

    expect(
      diagnostico.possuiConflitos
    ).toBe(true);

    expect(
      diagnostico.ids
    ).toEqual([
      "vendas",
      "lives",
    ]);
  });

  it("remove uma Skill registrada", () => {
    const skill = criarSkill({
      id: "resumo-vendas",
      nome: "Resumo de vendas",
    });

    const registry =
      new SkillRegistry([skill]);

    expect(
      registry.remover(
        "resumo-vendas"
      )
    ).toBe(true);

    expect(registry.quantidade).toBe(
      0
    );

    expect(
      registry.buscarPorId(
        "resumo-vendas"
      )
    ).toBeNull();
  });

  it("mantém compatibilidade com encontrarSkill", () => {
    const skill = criarSkill({
      id: "resumo-vendas",
      nome: "Resumo de vendas",
      aliases: [
        "resumo de vendas",
      ],
    });

    expect(
      encontrarSkill(
        "Exiba o resumo de vendas",
        [skill]
      )
    ).toBe(skill);
  });
});