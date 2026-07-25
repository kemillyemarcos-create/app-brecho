// SkillRegistry.js
// Registro central de habilidades do Assistant.
//
// Responsabilidades:
// - registrar Skills;
// - validar o contrato mínimo;
// - buscar Skills por ID;
// - localizar Skills por aliases e patterns;
// - detectar IDs duplicados;
// - diagnosticar aliases conflitantes;
// - preservar compatibilidade com as funções antigas.

import { normalizarTexto as normalizarTextoBase } from "./utils/TextUtils";

/**
 * Normaliza textos usados na identificação de Skills.
 *
 * Mantida como export público para preservar compatibilidade
 * com versões anteriores do SkillRegistry.
 */
export function normalizarTexto(valor) {
  return normalizarTextoBase(valor);
}

function normalizarLista(valores) {
  if (!Array.isArray(valores)) {
    return [];
  }

  return valores
    .map(normalizarTexto)
    .filter(Boolean);
}

function obterTermosSkill(skill) {
  return [
    ...normalizarLista(skill?.aliases),
    ...normalizarLista(skill?.patterns),
  ];
}

function calcularPontuacaoTermo(texto, termo) {
  if (!texto || !termo) {
    return 0;
  }

  if (texto === termo) {
    return 1000 + termo.length;
  }

  const expressao = new RegExp(
    `(^|\\s)${escaparExpressaoRegular(termo)}(?=\\s|$)`
  );

  if (expressao.test(texto)) {
    const quantidadePalavras = termo
      .split(" ")
      .filter(Boolean)
      .length;

    return (
      quantidadePalavras * 100 +
      termo.length
    );
  }

  if (texto.includes(termo)) {
    const quantidadePalavras = termo
      .split(" ")
      .filter(Boolean)
      .length;

    return (
      quantidadePalavras * 10 +
      termo.length
    );
  }

  return 0;
}

function escaparExpressaoRegular(valor) {
  return String(valor).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

export function validarSkill(skill) {
  const erros = [];

  if (!skill || typeof skill !== "object") {
    return {
      valida: false,
      erros: [
        "A Skill deve ser um objeto.",
      ],
    };
  }

  if (!normalizarTexto(skill.id)) {
    erros.push(
      'A propriedade "id" é obrigatória.'
    );
  }

  if (!String(skill.nome || "").trim()) {
    erros.push(
      'A propriedade "nome" é obrigatória.'
    );
  }

  if (
    skill.aliases !== undefined &&
    !Array.isArray(skill.aliases)
  ) {
    erros.push(
      'A propriedade "aliases" deve ser um array.'
    );
  }

  if (
    skill.patterns !== undefined &&
    !Array.isArray(skill.patterns)
  ) {
    erros.push(
      'A propriedade "patterns" deve ser um array.'
    );
  }

  if (typeof skill.execute !== "function") {
    erros.push(
      'A propriedade "execute" deve ser uma função.'
    );
  }

  return {
    valida: erros.length === 0,
    erros,
  };
}

export class SkillRegistry {
  constructor(
    skillsIniciais = [],
    opcoes = {}
  ) {
    this.skills = [];
    this.skillsPorId = new Map();

    this.opcoes = {
      rejeitarAliasesConflitantes:
        opcoes
          ?.rejeitarAliasesConflitantes ===
        true,
    };

    this.registrarMuitas(
      skillsIniciais
    );
  }

  registrar(skill) {
    const validacao =
      validarSkill(skill);

    if (!validacao.valida) {
      throw new Error(
        [
          `Skill inválida "${
            skill?.id ||
            skill?.nome ||
            "desconhecida"
          }".`,
          ...validacao.erros,
        ].join(" ")
      );
    }

    const idNormalizado =
      normalizarTexto(skill.id);

    if (
      this.skillsPorId.has(
        idNormalizado
      )
    ) {
      throw new Error(
        `Já existe uma Skill registrada com o ID "${skill.id}".`
      );
    }

    if (
      this.opcoes
        .rejeitarAliasesConflitantes
    ) {
      const conflitos =
        this.encontrarConflitosDaSkill(
          skill
        );

      if (conflitos.length > 0) {
        const descricao =
          conflitos
            .map(
              (conflito) =>
                `"${conflito.termo}" com "${conflito.skillId}"`
            )
            .join(", ");

        throw new Error(
          `A Skill "${skill.id}" possui aliases conflitantes: ${descricao}.`
        );
      }
    }

    this.skills.push(skill);

    this.skillsPorId.set(
      idNormalizado,
      skill
    );

    return skill;
  }

  registrarMuitas(skills = []) {
    if (!Array.isArray(skills)) {
      throw new Error(
        "A lista de Skills deve ser um array."
      );
    }

    return skills.map((skill) =>
      this.registrar(skill)
    );
  }

  remover(id) {
    const idNormalizado =
      normalizarTexto(id);

    if (!idNormalizado) {
      return false;
    }

    const skill =
      this.skillsPorId.get(
        idNormalizado
      );

    if (!skill) {
      return false;
    }

    this.skills =
      this.skills.filter(
        (item) => item !== skill
      );

    this.skillsPorId.delete(
      idNormalizado
    );

    return true;
  }

  limpar() {
    this.skills = [];
    this.skillsPorId.clear();
  }

  buscarPorId(id) {
    const idNormalizado =
      normalizarTexto(id);

    if (!idNormalizado) {
      return null;
    }

    return (
      this.skillsPorId.get(
        idNormalizado
      ) || null
    );
  }

  encontrarPorAlias(mensagem) {
    const texto =
      normalizarTexto(mensagem);

    if (!texto) {
      return null;
    }

    let melhorResultado = null;

    for (const skill of this.skills) {
      const termos =
        obterTermosSkill(skill);

      for (const termo of termos) {
        const pontuacao =
          calcularPontuacaoTermo(
            texto,
            termo
          );

        if (pontuacao <= 0) {
          continue;
        }

        const deveSubstituir =
          !melhorResultado ||
          pontuacao >
            melhorResultado.pontuacao ||
          (
            pontuacao ===
              melhorResultado.pontuacao &&
            termo.length >
              melhorResultado.termo.length
          );

        if (deveSubstituir) {
          melhorResultado = {
            skill,
            termo,
            pontuacao,
          };
        }
      }
    }

    return (
      melhorResultado?.skill ||
      null
    );
  }

  encontrarDetalhado(mensagem) {
    const texto =
      normalizarTexto(mensagem);

    if (!texto) {
      return null;
    }

    let melhorResultado = null;

    for (const skill of this.skills) {
      const termos =
        obterTermosSkill(skill);

      for (const termo of termos) {
        const pontuacao =
          calcularPontuacaoTermo(
            texto,
            termo
          );

        if (pontuacao <= 0) {
          continue;
        }

        const deveSubstituir =
          !melhorResultado ||
          pontuacao >
            melhorResultado.pontuacao ||
          (
            pontuacao ===
              melhorResultado.pontuacao &&
            termo.length >
              melhorResultado.termo.length
          );

        if (deveSubstituir) {
          melhorResultado = {
            skill,
            termoEncontrado: termo,
            pontuacao,
          };
        }
      }
    }

    return melhorResultado;
  }

  listar() {
    return [...this.skills];
  }

  listarResumo() {
    return this.skills.map(
      (skill) => ({
        id: skill.id,
        nome: skill.nome,
        categoria:
          skill.categoria || null,
        tipo:
          skill.tipo || null,
        aliases: Array.isArray(
          skill.aliases
        )
          ? [...skill.aliases]
          : [],
        patterns: Array.isArray(
          skill.patterns
        )
          ? [...skill.patterns]
          : [],
      })
    );
  }

  encontrarConflitosDaSkill(skill) {
    const termosNovaSkill =
      new Set(
        obterTermosSkill(skill)
      );

    const conflitos = [];

    for (
      const skillRegistrada
      of this.skills
    ) {
      const termosRegistrados =
        obterTermosSkill(
          skillRegistrada
        );

      for (
        const termo
        of termosRegistrados
      ) {
        if (
          termosNovaSkill.has(termo)
        ) {
          conflitos.push({
            termo,
            skillId:
              skillRegistrada.id,
          });
        }
      }
    }

    return conflitos;
  }

  listarConflitos() {
    const termos = new Map();

    for (const skill of this.skills) {
      const termosSkill =
        new Set(
          obterTermosSkill(skill)
        );

      for (
        const termo
        of termosSkill
      ) {
        if (!termos.has(termo)) {
          termos.set(termo, []);
        }

        termos
          .get(termo)
          .push(skill.id);
      }
    }

    return Array
      .from(termos.entries())
      .filter(
        ([, skillIds]) =>
          skillIds.length > 1
      )
      .map(
        ([termo, skillIds]) => ({
          termo,
          skillIds,
        })
      );
  }

  diagnosticar() {
    const conflitos =
      this.listarConflitos();

    return {
      quantidadeSkills:
        this.skills.length,

      ids:
        this.skills.map(
          (skill) => skill.id
        ),

      conflitos,

      possuiConflitos:
        conflitos.length > 0,
    };
  }

  possui(id) {
    return Boolean(
      this.buscarPorId(id)
    );
  }

  get quantidade() {
    return this.skills.length;
  }
}

/**
 * Função legada.
 *
 * Continua disponível para qualquer código que ainda utilize
 * encontrarSkill(mensagem, skills).
 */
export function encontrarSkill(
  mensagem,
  skills = []
) {
  const registry =
    new SkillRegistry(skills);

  return registry.encontrarPorAlias(
    mensagem
  );
}

export function criarSkillRegistry(
  skills = [],
  opcoes = {}
) {
  return new SkillRegistry(
    skills,
    opcoes
  );
}

export default SkillRegistry;