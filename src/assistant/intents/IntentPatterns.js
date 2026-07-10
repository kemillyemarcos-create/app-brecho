import IntentTypes from "./IntentTypes";

const IntentPatterns = [
  {
    id: "knowledge_modules",
    type: IntentTypes.KNOWLEDGE,
    target: "modules",
    patterns: [
      "quais modulos",
      "modulos existem",
      "modulos do sistema",
      "o que o sistema tem",
      "quais telas",
      "quais areas",
    ],
  },

  {
    id: "knowledge_system",
    type: IntentTypes.KNOWLEDGE,
    target: "system",
    patterns: [
      "o que e o sistema",
      "sobre o sistema",
      "como funciona o sistema",
      "o que voce sabe",
      "explique o sistema",
    ],
  },

  {
    id: "knowledge_vocabulary",
    type: IntentTypes.KNOWLEDGE,
    target: "vocabulary",
    patterns: [
      "o que e",
      "o que significa",
      "significa",
      "sacolinha",
      "live",
      "garimpo",
      "expedicao",
      "pendencia",
    ],
  },

  {
    id: "knowledge_rules",
    type: IntentTypes.KNOWLEDGE,
    target: "rules",
    patterns: [
      "como funciona",
      "o que acontece",
      "regra",
      "cancelar venda",
      "expedicao",
      "pendencia",
      "sacolinha",
    ],
  },

  {
    id: "skill_sales_today",
    type: IntentTypes.SKILL,
    target: "consultar_vendas_hoje",
    patterns: [
      "quanto vendemos hoje",
      "vendas hoje",
      "faturamento hoje",
      "quanto faturou hoje",
      "quanto entrou hoje",
      "quanto vendeu hoje",
    ],
  },
];

export default IntentPatterns;