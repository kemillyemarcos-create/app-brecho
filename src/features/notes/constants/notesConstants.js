export const NOTE_TYPES = Object.freeze({
  TEXT: "texto",
  CHECKLIST: "lista",
});

export const NOTE_CATEGORIES = Object.freeze([
  "Geral",
  "Clientes",
  "Descontos",
  "Retiradas",
  "Envios",
  "Pendências",
]);

export const DEFAULT_NOTE_CATEGORY = NOTE_CATEGORIES[0];

export const NOTES_FILTERS = Object.freeze({
  ALL: "todas",
  ACTIVE: "ativas",
  PINNED: "fixadas",
  ARCHIVED: "arquivadas",
});

export const NOTES_FILTER_LABELS = Object.freeze({
  [NOTES_FILTERS.ALL]: "Todas",
  [NOTES_FILTERS.ACTIVE]: "Ativas",
  [NOTES_FILTERS.PINNED]: "Fixadas",
  [NOTES_FILTERS.ARCHIVED]: "Arquivadas",
});

export const EMPTY_NOTE = Object.freeze({
  id: null,
  titulo: "",
  conteudo: "",
  tipo: NOTE_TYPES.CHECKLIST,
  categoria: DEFAULT_NOTE_CATEGORY,
  fixada: false,
  arquivada: false,
  nota_itens: [],
});

export const NOTES_MESSAGES = Object.freeze({
  LOAD_ERROR: "Não foi possível carregar as notas.",
  CREATE_ERROR: "Não foi possível criar a nota.",
  UPDATE_ERROR: "Não foi possível atualizar a nota.",
  DELETE_ERROR: "Não foi possível excluir a nota.",
  ITEM_ERROR: "Não foi possível atualizar o item da nota.",
  REQUIRED_TITLE: "Informe um título para a nota.",
  REQUIRED_ITEM: "Informe o texto do item.",
  DELETE_CONFIRMATION:
    "Deseja realmente excluir esta nota?",
});