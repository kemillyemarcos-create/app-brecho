import {
  describe,
  expect,
  it,
} from "vitest";

import SkillRegistry from "../SkillRegistry";
import skills from "../skills";

describe("Integridade das Skills", () => {
  it("carrega todas as Skills no Registry", () => {
    const registry =
      new SkillRegistry(skills);

    const diagnostico =
      registry.diagnosticar();

    expect(
      diagnostico.quantidadeSkills
    ).toBe(skills.length);
  });

  it("não possui IDs duplicados", () => {
    const ids = skills.map(
      (skill) => skill.id
    );

    const idsUnicos =
      new Set(ids);

    expect(idsUnicos.size).toBe(
      ids.length
    );
  });

  it("não possui aliases conflitantes", () => {
    const registry =
      new SkillRegistry(skills);

    const diagnostico =
      registry.diagnosticar();

    expect(
      diagnostico.possuiConflitos
    ).toBe(false);

    expect(
      diagnostico.conflitos
    ).toEqual([]);
  });

  it("todas as Skills possuem estrutura válida", () => {
    for (const skill of skills) {
      expect(skill).toBeTruthy();

      expect(
        typeof skill.id
      ).toBe("string");

      expect(
        skill.id.trim()
      ).not.toBe("");

      expect(
        typeof skill.execute
      ).toBe("function");

      expect(
        Array.isArray(
          skill.aliases
        )
      ).toBe(true);
    }
  });

  it("todos os aliases são textos válidos", () => {
    for (const skill of skills) {
      for (
        const alias of
        skill.aliases
      ) {
        expect(
          typeof alias
        ).toBe("string");

        expect(
          alias.trim()
        ).not.toBe("");
      }
    }
  });

  it("todos os IDs podem ser encontrados no Registry", () => {
    const registry =
      new SkillRegistry(skills);

    for (const skill of skills) {
      const encontrada =
        registry.buscarPorId(
          skill.id
        );

      expect(encontrada).toBe(
        skill
      );
    }
  });

  it("todos os aliases encontram a Skill correta", () => {
    const registry =
      new SkillRegistry(skills);

    for (const skill of skills) {
      for (
        const alias of
        skill.aliases
      ) {
        const encontrada =
          registry.encontrarPorAlias(
            alias
          );

        expect(encontrada).toBe(
          skill
        );
      }
    }
  });
});