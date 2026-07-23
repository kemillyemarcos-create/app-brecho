import {
  DEFAULT_NOTE_CATEGORY,
  EMPTY_NOTE,
  NOTE_TYPES,
  NOTES_FILTERS,
} from "../constants/notesConstants";

export function createEmptyNote() {
  return normalizeNote({
    ...EMPTY_NOTE,
    nota_itens: [],
  });
}

export function normalizeNote(note = {}) {
  return {
    id: note?.id ?? null,
    titulo: String(note?.titulo ?? ""),
    conteudo: String(note?.conteudo ?? ""),
    tipo:
      note?.tipo ??
      NOTE_TYPES.CHECKLIST,
    categoria:
      note?.categoria ??
      DEFAULT_NOTE_CATEGORY,
    fixada: Boolean(note?.fixada),
    arquivada: Boolean(note?.arquivada),
    criado_em:
      note?.criado_em ?? null,
    atualizado_em:
      note?.atualizado_em ?? null,
    nota_itens: sortNoteItems(
      note?.nota_itens
    ),
  };
}

export function normalizeNoteItem(
  item = {},
  index = 0
) {
  const numericValue = Number(
    item?.valor_ajuste
  );

  return {
    id: item?.id ?? null,
    nota_id: item?.nota_id ?? null,
    texto: String(item?.texto ?? ""),
    concluido: Boolean(
      item?.concluido
    ),
    observacao: String(
      item?.observacao ?? ""
    ),
    cliente_id:
      item?.cliente_id ?? null,

    valor_ajuste:
      item?.valor_ajuste === "" ||
      item?.valor_ajuste === undefined ||
      item?.valor_ajuste === null ||
      !Number.isFinite(numericValue)
        ? null
        : numericValue,

    ordem: Number.isFinite(
      Number(item?.ordem)
    )
      ? Number(item.ordem)
      : index,

    criado_em:
      item?.criado_em ?? null,

    atualizado_em:
      item?.atualizado_em ?? null,

    isTemporary: Boolean(
      item?.isTemporary
    ),
  };
}

export function sortNoteItems(
  items = []
) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) =>
      normalizeNoteItem(item, index)
    )
    .sort(
      (firstItem, secondItem) =>
        firstItem.ordem -
        secondItem.ordem
    );
}

function getNoteTimestamp(note = {}) {
  const value =
    note?.atualizado_em ??
    note?.criado_em ??
    null;

  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

export function sortNotes(notes = []) {
  if (!Array.isArray(notes)) {
    return [];
  }

  return notes
    .map((note) =>
      normalizeNote(note)
    )
    .sort(
      (firstNote, secondNote) => {
        if (
          firstNote.fixada !==
          secondNote.fixada
        ) {
          return (
            Number(secondNote.fixada) -
            Number(firstNote.fixada)
          );
        }

        return (
          getNoteTimestamp(secondNote) -
          getNoteTimestamp(firstNote)
        );
      }
    );
}

export function filterNotes(
  notes = [],
  {
    search = "",
    category = "",
    status = NOTES_FILTERS.ACTIVE,
  } = {}
) {
  const normalizedSearch =
    String(search)
      .trim()
      .toLocaleLowerCase("pt-BR");

  return sortNotes(notes).filter(
    (note) => {
      const matchesStatus =
        status === NOTES_FILTERS.ALL ||
        (status ===
          NOTES_FILTERS.PINNED &&
          note.fixada &&
          !note.arquivada) ||
        (status ===
          NOTES_FILTERS.ARCHIVED &&
          note.arquivada) ||
        (status ===
          NOTES_FILTERS.ACTIVE &&
          !note.arquivada);

      const matchesCategory =
        !category ||
        category === "Todas" ||
        note.categoria === category;

      const itemText =
        note.nota_itens
          .map(
            (item) =>
              `${item.texto} ${item.observacao}`
          )
          .join(" ");

      const searchableText = [
        note.titulo,
        note.conteudo,
        note.categoria,
        itemText,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch
        );

      return (
        matchesStatus &&
        matchesCategory &&
        matchesSearch
      );
    }
  );
}

export function formatNoteDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "America/Sao_Paulo",
    }
  ).format(date);
}

export function getNoteProgress(
  items = []
) {
  const normalizedItems =
    sortNoteItems(items);

  const total =
    normalizedItems.length;

  const completed =
    normalizedItems.filter(
      (item) => item.concluido
    ).length;

  return {
    total,
    completed,
    percentage:
      total === 0
        ? 0
        : Math.round(
            (completed / total) *
              100
          ),
  };
}

export function sanitizeNotePayload(
  note = {}
) {
  const title = String(
    note?.titulo ?? ""
  ).trim();

  const content = String(
    note?.conteudo ?? ""
  ).trim();

  const category = String(
    note?.categoria ?? ""
  ).trim();

  return {
    titulo: title,
    conteudo: content,
    tipo:
      note?.tipo ??
      NOTE_TYPES.CHECKLIST,
    categoria:
      category ||
      DEFAULT_NOTE_CATEGORY,
    fixada: Boolean(note?.fixada),
    arquivada: Boolean(
      note?.arquivada
    ),
  };
}

export function sanitizeNoteItemPayload(
  item = {},
  index = 0
) {
  const numericValue = Number(
    item?.valor_ajuste
  );

  return {
    texto: String(
      item?.texto ?? ""
    ).trim(),

    concluido: Boolean(
      item?.concluido
    ),

    observacao: String(
      item?.observacao ?? ""
    ).trim(),

    cliente_id:
      item?.cliente_id || null,

    valor_ajuste:
      item?.valor_ajuste === "" ||
      item?.valor_ajuste === undefined ||
      item?.valor_ajuste === null ||
      !Number.isFinite(numericValue)
        ? null
        : numericValue,

    ordem: Number.isFinite(
      Number(item?.ordem)
    )
      ? Number(item.ordem)
      : index,
  };
}

export function createTemporaryItem(
  order = 0
) {
  const normalizedOrder =
    Number.isFinite(Number(order))
      ? Number(order)
      : 0;

  return {
    id: createTemporaryId(),
    nota_id: null,
    texto: "",
    concluido: false,
    observacao: "",
    cliente_id: null,
    valor_ajuste: null,
    ordem: normalizedOrder,
    isTemporary: true,
  };
}

function createTemporaryId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return `temp-${crypto.randomUUID()}`;
  }

  return `temp-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}