import { supabase } from "../../../lib/supabase";

import {
  normalizeNote,
  sanitizeNoteItemPayload,
  sanitizeNotePayload,
  sortNotes,
} from "../utils/notesUtils";

const NOTES_TABLE = "notas";
const NOTE_ITEMS_TABLE = "nota_itens";

function throwServiceError(error, fallbackMessage) {
  if (!error) {
    return;
  }

  const serviceError = new Error(
    error.message || fallbackMessage
  );

  serviceError.cause = error;
  serviceError.code = error.code;
  serviceError.details = error.details;
  serviceError.hint = error.hint;

  throw serviceError;
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) =>
      sanitizeNoteItemPayload(item, index)
    )
    .filter((item) => item.texto);
}

async function fetchNoteById(noteId) {
  if (!noteId) {
    throw new Error("O ID da nota é obrigatório.");
  }

  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .select(
      `
        *,
        nota_itens (
          *
        )
      `
    )
    .eq("id", noteId)
    .order("ordem", {
      foreignTable: NOTE_ITEMS_TABLE,
      ascending: true,
    })
    .single();

  throwServiceError(
    error,
    "Não foi possível carregar a nota."
  );

  return normalizeNote(data);
}

export async function listarNotas({
  incluirArquivadas = true,
  categoria = null,
} = {}) {
  let query = supabase
    .from(NOTES_TABLE)
    .select(
      `
        *,
        nota_itens (
          *
        )
      `
    )
    .order("fixada", {
      ascending: false,
    })
    .order("atualizado_em", {
      ascending: false,
    })
    .order("ordem", {
      foreignTable: NOTE_ITEMS_TABLE,
      ascending: true,
    });

  if (!incluirArquivadas) {
    query = query.eq("arquivada", false);
  }

  if (categoria) {
    query = query.eq("categoria", categoria);
  }

  const { data, error } = await query;

  throwServiceError(
    error,
    "Não foi possível listar as notas."
  );

  const normalizedNotes = (data ?? []).map((note) =>
    normalizeNote(note)
  );

  return sortNotes(normalizedNotes);
}

export async function criarNota(noteInput = {}) {
  const notePayload = sanitizeNotePayload(noteInput);
  const validItems = sanitizeItems(noteInput.nota_itens);

  const {
    data: createdNote,
    error: createError,
  } = await supabase
    .from(NOTES_TABLE)
    .insert(notePayload)
    .select("*")
    .single();

  throwServiceError(
    createError,
    "Não foi possível criar a nota."
  );

  if (validItems.length > 0) {
    const itemsPayload = validItems.map((item, index) => ({
      ...item,
      nota_id: createdNote.id,
      ordem: index,
    }));

    const { error: itemsError } = await supabase
      .from(NOTE_ITEMS_TABLE)
      .insert(itemsPayload);

    if (itemsError) {
      const { error: rollbackError } = await supabase
        .from(NOTES_TABLE)
        .delete()
        .eq("id", createdNote.id);

      if (rollbackError) {
        console.error(
          "Erro ao remover nota após falha nos itens:",
          rollbackError
        );
      }

      throwServiceError(
        itemsError,
        "A nota foi criada, mas os itens não puderam ser salvos."
      );
    }
  }

  return fetchNoteById(createdNote.id);
}

export async function editarNota(noteId, noteInput = {}) {
  if (!noteId) {
    throw new Error("O ID da nota é obrigatório.");
  }

  const notePayload = sanitizeNotePayload(noteInput);

  const { error } = await supabase
    .from(NOTES_TABLE)
    .update(notePayload)
    .eq("id", noteId);

  throwServiceError(
    error,
    "Não foi possível editar a nota."
  );

  if (Array.isArray(noteInput.nota_itens)) {
    await sincronizarItensNota(
      noteId,
      noteInput.nota_itens
    );
  }

  return fetchNoteById(noteId);
}

export async function excluirNota(noteId) {
  if (!noteId) {
    throw new Error("O ID da nota é obrigatório.");
  }

  const { error: itemsError } = await supabase
    .from(NOTE_ITEMS_TABLE)
    .delete()
    .eq("nota_id", noteId);

  throwServiceError(
    itemsError,
    "Não foi possível excluir os itens da nota."
  );

  const { error } = await supabase
    .from(NOTES_TABLE)
    .delete()
    .eq("id", noteId);

  throwServiceError(
    error,
    "Não foi possível excluir a nota."
  );

  return noteId;
}

export async function fixarNota(noteId, fixada) {
  return editarCampoNota(noteId, {
    fixada: Boolean(fixada),
  });
}

export async function arquivarNota(
  noteId,
  arquivada
) {
  return editarCampoNota(noteId, {
    arquivada: Boolean(arquivada),
  });
}

export async function editarCampoNota(
  noteId,
  fields = {}
) {
  if (!noteId) {
    throw new Error("O ID da nota é obrigatório.");
  }

  const allowedFields = [
    "titulo",
    "conteudo",
    "tipo",
    "categoria",
    "fixada",
    "arquivada",
  ];

  const payload = Object.fromEntries(
    Object.entries(fields).filter(([key]) =>
      allowedFields.includes(key)
    )
  );

  if (Object.keys(payload).length === 0) {
    return fetchNoteById(noteId);
  }

  const { error } = await supabase
    .from(NOTES_TABLE)
    .update(payload)
    .eq("id", noteId);

  throwServiceError(
    error,
    "Não foi possível atualizar a nota."
  );

  return fetchNoteById(noteId);
}

export async function criarItemNota(
  noteId,
  itemInput = {}
) {
  if (!noteId) {
    throw new Error("O ID da nota é obrigatório.");
  }

  const itemPayload =
    sanitizeNoteItemPayload(itemInput);

  if (!itemPayload.texto) {
    throw new Error(
      "O texto do item é obrigatório."
    );
  }

  const { data, error } = await supabase
    .from(NOTE_ITEMS_TABLE)
    .insert({
      ...itemPayload,
      nota_id: noteId,
    })
    .select("*")
    .single();

  throwServiceError(
    error,
    "Não foi possível criar o item."
  );

  return data;
}

export async function editarItemNota(
  itemId,
  itemInput = {}
) {
  if (!itemId) {
    throw new Error("O ID do item é obrigatório.");
  }

  const itemPayload =
    sanitizeNoteItemPayload(itemInput);

  if (!itemPayload.texto) {
    throw new Error(
      "O texto do item é obrigatório."
    );
  }

  const { data, error } = await supabase
    .from(NOTE_ITEMS_TABLE)
    .update(itemPayload)
    .eq("id", itemId)
    .select("*")
    .single();

  throwServiceError(
    error,
    "Não foi possível editar o item."
  );

  return data;
}

export async function concluirItemNota(
  itemId,
  concluido
) {
  if (!itemId) {
    throw new Error("O ID do item é obrigatório.");
  }

  const { data, error } = await supabase
    .from(NOTE_ITEMS_TABLE)
    .update({
      concluido: Boolean(concluido),
    })
    .eq("id", itemId)
    .select("*")
    .single();

  throwServiceError(
    error,
    "Não foi possível concluir o item."
  );

  return data;
}

export async function excluirItemNota(itemId) {
  if (!itemId) {
    throw new Error("O ID do item é obrigatório.");
  }

  const { error } = await supabase
    .from(NOTE_ITEMS_TABLE)
    .delete()
    .eq("id", itemId);

  throwServiceError(
    error,
    "Não foi possível excluir o item."
  );

  return itemId;
}

export async function sincronizarItensNota(
  noteId,
  items = []
) {
  if (!noteId) {
    throw new Error("O ID da nota é obrigatório.");
  }

  const sanitizedItems = sanitizeItems(items);

  const { error: deleteError } = await supabase
    .from(NOTE_ITEMS_TABLE)
    .delete()
    .eq("nota_id", noteId);

  throwServiceError(
    deleteError,
    "Não foi possível atualizar os itens da nota."
  );

  if (sanitizedItems.length === 0) {
    return [];
  }

  const payload = sanitizedItems.map(
    (item, index) => ({
      ...item,
      nota_id: noteId,
      ordem: index,
    })
  );

  const { data, error } = await supabase
    .from(NOTE_ITEMS_TABLE)
    .insert(payload)
    .select("*");

  throwServiceError(
    error,
    "Não foi possível salvar os itens da nota."
  );

  return (data ?? []).sort(
    (firstItem, secondItem) =>
      Number(firstItem.ordem ?? 0) -
      Number(secondItem.ordem ?? 0)
  );
}