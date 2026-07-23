import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NOTES_FILTERS,
  NOTES_MESSAGES,
} from "../constants/notesConstants.js";

import {
  arquivarNota,
  concluirItemNota,
  criarNota,
  editarNota,
  excluirNota,
  fixarNota,
  listarNotas,
} from "../services/notesService.js";

import {
  createEmptyNote,
  filterNotes,
  normalizeNote,
  normalizeNoteItem,
  sortNotes,
} from "../utils/notesUtils.js";

export default function useNotes() {
  const [notes, setNotes] = useState([]);

  const [
    selectedNote,
    setSelectedNote,
  ] = useState(null);

  const [
    isEditorOpen,
    setIsEditorOpen,
  ] = useState(false);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("Todas");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState(
    NOTES_FILTERS.ACTIVE
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    actionLoadingId,
    setActionLoadingId,
  ] = useState(null);

  const [error, setError] =
    useState("");

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const loadNotes = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await listarNotas();

        const normalizedNotes =
          Array.isArray(data)
            ? data.map((note) =>
              normalizeNote(note)
            )
            : [];

        setNotes(
          sortNotes(normalizedNotes)
        );
      } catch (loadError) {
        console.error(
          "Erro ao carregar notas:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError,
            NOTES_MESSAGES.LOAD_ERROR
          )
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const visibleNotes = useMemo(
    () =>
      filterNotes(notes, {
        search,
        category,
        status: statusFilter,
      }),
    [
      notes,
      search,
      category,
      statusFilter,
    ]
  );

  const categories = useMemo(() => {
    const values = notes
      .map((note) =>
        String(
          note?.categoria ?? ""
        ).trim()
      )
      .filter(Boolean);

    const uniqueCategories = [
      ...new Set(values),
    ].sort((first, second) =>
      first.localeCompare(
        second,
        "pt-BR"
      )
    );

    return [
      "Todas",
      ...uniqueCategories,
    ];
  }, [notes]);

  const openNewNote = useCallback(
    () => {
      setSelectedNote(
        createEmptyNote()
      );

      setIsEditorOpen(true);
      setError("");
    },
    []
  );

  const openEditNote = useCallback(
    (note) => {
      if (!note) {
        return;
      }

      setSelectedNote(
        normalizeNote(note)
      );

      setIsEditorOpen(true);
      setError("");
    },
    []
  );

  const closeEditor = useCallback(
    () => {
      if (saving) {
        return;
      }

      setIsEditorOpen(false);
      setSelectedNote(null);
      setError("");
    },
    [saving]
  );

  const saveNote = useCallback(
    async (noteInput = {}) => {
      if (saving) {
        return null;
      }

      setSaving(true);
      setError("");

      try {
        const normalizedInput =
          normalizeNote(noteInput);

        const savedNote =
          normalizedInput.id
            ? await editarNota(
              normalizedInput.id,
              normalizedInput
            )
            : await criarNota(
              normalizedInput
            );

        const normalizedSavedNote =
          normalizeNote(savedNote);

        setNotes((currentNotes) => {
          const exists =
            currentNotes.some(
              (note) =>
                note.id ===
                normalizedSavedNote.id
            );

          const nextNotes = exists
            ? currentNotes.map(
              (note) =>
                note.id ===
                  normalizedSavedNote.id
                  ? normalizedSavedNote
                  : note
            )
            : [
              normalizedSavedNote,
              ...currentNotes,
            ];

          return sortNotes(nextNotes);
        });

        setSelectedNote(null);
        setIsEditorOpen(false);

        return normalizedSavedNote;
      } catch (saveError) {
        console.error(
          "Erro ao salvar nota:",
          saveError
        );

        setError(
          getErrorMessage(
            saveError,
            noteInput?.id
              ? NOTES_MESSAGES.UPDATE_ERROR
              : NOTES_MESSAGES.CREATE_ERROR
          )
        );

        throw saveError;
      } finally {
        setSaving(false);
      }
    },
    [saving]
  );

  const removeNote = useCallback(
    async (noteId) => {
      if (!noteId) {
        return false;
      }

      const confirmed =
        window.confirm(
          NOTES_MESSAGES.DELETE_CONFIRMATION
        );

      if (!confirmed) {
        return false;
      }

      setActionLoadingId(noteId);
      setError("");

      try {
        await excluirNota(noteId);

        setNotes((currentNotes) =>
          currentNotes.filter(
            (note) =>
              note.id !== noteId
          )
        );

        setSelectedNote(
          (currentSelectedNote) => {
            if (
              currentSelectedNote?.id !==
              noteId
            ) {
              return currentSelectedNote;
            }

            setIsEditorOpen(false);
            return null;
          }
        );

        return true;
      } catch (deleteError) {
        console.error(
          "Erro ao excluir nota:",
          deleteError
        );

        setError(
          getErrorMessage(
            deleteError,
            NOTES_MESSAGES.DELETE_ERROR
          )
        );

        return false;
      } finally {
        setActionLoadingId(
          (currentId) =>
            currentId === noteId
              ? null
              : currentId
        );
      }
    },
    []
  );

  const togglePin = useCallback(
    async (note) => {
      const normalizedNote =
        normalizeNote(note);

      if (!normalizedNote.id) {
        return null;
      }

      const loadingId =
        normalizedNote.id;

      setActionLoadingId(loadingId);
      setError("");

      try {
        const updatedNote =
          await fixarNota(
            normalizedNote.id,
            !normalizedNote.fixada
          );

        const normalizedUpdatedNote =
          normalizeNote(updatedNote);

        updateNoteState(
          setNotes,
          normalizedUpdatedNote
        );

        syncSelectedNote(
          setSelectedNote,
          normalizedUpdatedNote
        );

        return normalizedUpdatedNote;
      } catch (pinError) {
        console.error(
          "Erro ao fixar nota:",
          pinError
        );

        setError(
          getErrorMessage(
            pinError,
            NOTES_MESSAGES.UPDATE_ERROR
          )
        );

        return null;
      } finally {
        setActionLoadingId(
          (currentId) =>
            currentId === loadingId
              ? null
              : currentId
        );
      }
    },
    []
  );

  const toggleArchive = useCallback(
    async (note) => {
      const normalizedNote =
        normalizeNote(note);

      if (!normalizedNote.id) {
        return null;
      }

      const loadingId =
        normalizedNote.id;

      setActionLoadingId(loadingId);
      setError("");

      try {
        const updatedNote =
          await arquivarNota(
            normalizedNote.id,
            !normalizedNote.arquivada
          );

        const normalizedUpdatedNote =
          normalizeNote(updatedNote);

        updateNoteState(
          setNotes,
          normalizedUpdatedNote
        );

        syncSelectedNote(
          setSelectedNote,
          normalizedUpdatedNote
        );

        return normalizedUpdatedNote;
      } catch (archiveError) {
        console.error(
          "Erro ao arquivar nota:",
          archiveError
        );

        setError(
          getErrorMessage(
            archiveError,
            NOTES_MESSAGES.UPDATE_ERROR
          )
        );

        return null;
      } finally {
        setActionLoadingId(
          (currentId) =>
            currentId === loadingId
              ? null
              : currentId
        );
      }
    },
    []
  );

  const toggleItem = useCallback(
    async (
      noteId,
      itemId,
      completed
    ) => {
      if (
        !noteId ||
        !itemId ||
        String(itemId).startsWith(
          "temp-"
        )
      ) {
        return null;
      }

      setActionLoadingId(itemId);
      setError("");

      try {
        const updatedItem =
          await concluirItemNota(
            itemId,
            Boolean(completed)
          );

        const normalizedUpdatedItem =
          normalizeNoteItem(
            updatedItem
          );

        setNotes((currentNotes) =>
          sortNotes(
            currentNotes.map(
              (note) => {
                if (
                  note.id !== noteId
                ) {
                  return note;
                }

                const currentItems =
                  Array.isArray(
                    note.nota_itens
                  )
                    ? note.nota_itens
                    : [];

                return normalizeNote({
                  ...note,
                  nota_itens:
                    currentItems.map(
                      (item) =>
                        item.id === itemId
                          ? normalizedUpdatedItem
                          : item
                    ),
                });
              }
            )
          )
        );

        setSelectedNote(
          (currentSelectedNote) => {
            if (
              currentSelectedNote?.id !==
              noteId
            ) {
              return currentSelectedNote;
            }

            const currentItems =
              Array.isArray(
                currentSelectedNote.nota_itens
              )
                ? currentSelectedNote.nota_itens
                : [];

            return normalizeNote({
              ...currentSelectedNote,
              nota_itens:
                currentItems.map(
                  (item) =>
                    item.id === itemId
                      ? normalizedUpdatedItem
                      : item
                ),
            });
          }
        );

        return normalizedUpdatedItem;
      } catch (itemError) {
        console.error(
          "Erro ao concluir item:",
          itemError
        );

        setError(
          getErrorMessage(
            itemError,
            NOTES_MESSAGES.ITEM_ERROR
          )
        );

        return null;
      } finally {
        setActionLoadingId(
          (currentId) =>
            currentId === itemId
              ? null
              : currentId
        );
      }
    },
    []
  );

  return {
    notes,
    visibleNotes,
    categories,
    selectedNote,

    search,
    category,
    statusFilter,

    loading,
    saving,
    actionLoadingId,
    error,
    isEditorOpen,

    setSearch,
    setCategory,
    setStatusFilter,

    clearError,
    loadNotes,
    openNewNote,
    openEditNote,
    closeEditor,
    saveNote,
    removeNote,
    togglePin,
    toggleArchive,
    toggleItem,
  };
}

function updateNoteState(
  setNotes,
  updatedNote
) {
  setNotes((currentNotes) =>
    sortNotes(
      currentNotes.map((note) =>
        note.id === updatedNote.id
          ? updatedNote
          : note
      )
    )
  );
}

function syncSelectedNote(
  setSelectedNote,
  updatedNote
) {
  setSelectedNote(
    (currentSelectedNote) => {
      if (
        currentSelectedNote?.id !==
        updatedNote.id
      ) {
        return currentSelectedNote;
      }

      return updatedNote;
    }
  );
}

function getErrorMessage(
  error,
  fallbackMessage
) {
  if (
    typeof error?.message ===
    "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallbackMessage;
}