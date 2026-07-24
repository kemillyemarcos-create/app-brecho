import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NOTE_CATEGORIES,
  NOTE_TYPES,
  NOTES_MESSAGES,
} from "../constants/notesConstants.js";

import {
  createTemporaryItem,
  normalizeNote,
} from "../utils/notesUtils.js";

import NoteList from "./NoteList.jsx";

export default function NoteEditor({
  open,
  note,
  saving = false,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(() =>
    normalizeNote(note)
  );

  const [validationError, setValidationError] =
    useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(normalizeNote(note));
    setValidationError("");
  }, [open, note]);

  const handleClose = useCallback(() => {
    if (saving) {
      return;
    }

    setValidationError("");
    onClose?.();
  }, [onClose, saving]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        handleClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, saving, handleClose]);

  const categories = useMemo(() => {
    const currentCategory =
      draft.categoria?.trim();

    if (
      currentCategory &&
      !NOTE_CATEGORIES.includes(currentCategory)
    ) {
      return [
        ...NOTE_CATEGORIES,
        currentCategory,
      ];
    }

    return NOTE_CATEGORIES;
  }, [draft.categoria]);

  const updateField = useCallback(
    (field, value) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        [field]: value,
      }));

      if (
        field === "titulo" &&
        String(value).trim()
      ) {
        setValidationError("");
      }
    },
    []
  );

  const addItem = useCallback(() => {
    setDraft((currentDraft) => {
      const currentItems = Array.isArray(
        currentDraft.nota_itens
      )
        ? currentDraft.nota_itens
        : [];

      return {
        ...currentDraft,
        tipo: NOTE_TYPES.CHECKLIST,
        nota_itens: [
          ...currentItems,
          createTemporaryItem(
            currentItems.length
          ),
        ],
      };
    });
  }, []);

  const changeItem = useCallback(
    (index, updatedItem) => {
      setDraft((currentDraft) => {
        const currentItems = Array.isArray(
          currentDraft.nota_itens
        )
          ? currentDraft.nota_itens
          : [];

        return {
          ...currentDraft,
          nota_itens: currentItems.map(
            (item, itemIndex) =>
              itemIndex === index
                ? {
                    ...item,
                    ...updatedItem,
                    ordem: itemIndex,
                  }
                : item
          ),
        };
      });
    },
    []
  );

  const removeItem = useCallback((index) => {
    setDraft((currentDraft) => {
      const currentItems = Array.isArray(
        currentDraft.nota_itens
      )
        ? currentDraft.nota_itens
        : [];

      return {
        ...currentDraft,
        nota_itens: currentItems
          .filter(
            (_, itemIndex) =>
              itemIndex !== index
          )
          .map((item, itemIndex) => ({
            ...item,
            ordem: itemIndex,
          })),
      };
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedTitle =
      draft.titulo.trim();

    if (!normalizedTitle) {
      setValidationError(
        NOTES_MESSAGES.REQUIRED_TITLE
      );

      return;
    }

    const currentItems = Array.isArray(
      draft.nota_itens
    )
      ? draft.nota_itens
      : [];

    const notePayload = {
      ...draft,
      titulo: normalizedTitle,

      nota_itens: currentItems
        .filter((item) =>
          item.texto?.trim()
        )
        .map((item, index) => ({
          ...item,
          texto: item.texto.trim(),
          ordem: index,
        })),
    };

    setValidationError("");

    try {
      await onSave?.(notePayload);
    } catch (saveError) {
      console.error(
        "Erro ao salvar nota no editor:",
        saveError
      );

      setValidationError(
        saveError?.message ||
          NOTES_MESSAGES.UPDATE_ERROR
      );
    }
  };

  if (!open) {
    return null;
  }

  const items = Array.isArray(
    draft.nota_itens
  )
    ? draft.nota_itens
    : [];

  return (
    <div
      className="note-editor-overlay"
      style={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !saving
        ) {
          handleClose();
        }
      }}
    >
      <style>{`
        @media (max-width: 767px) {
          .note-editor-overlay {
            align-items: flex-end !important;
            padding: 0 !important;
          }

          .note-editor-modal {
            width: 100% !important;
            max-height: 94dvh !important;
            border-radius: 22px 22px 0 0 !important;
          }

          .note-editor-form {
            gap: 15px !important;
            padding: 18px 18px max(18px, env(safe-area-inset-bottom)) !important;
          }

          .note-editor-header {
            gap: 14px !important;
          }

          .note-editor-title {
            font-size: 22px !important;
            line-height: 1.25 !important;
          }

          .note-editor-close {
            width: 40px !important;
            height: 40px !important;
            border-radius: 11px !important;
          }

          .note-editor-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .note-editor-input {
            min-height: 46px !important;
            font-size: 16px !important;
          }

          .note-editor-textarea {
            min-height: 120px !important;
            font-size: 16px !important;
          }

          .note-editor-flags {
            flex-direction: column !important;
            gap: 10px !important;
          }

          .note-editor-checkbox-label {
            width: 100% !important;
            min-height: 42px !important;
            white-space: nowrap !important;
          }

          .note-editor-checkbox-label input {
            flex-shrink: 0 !important;
            width: 22px !important;
            height: 22px !important;
            margin: 0 !important;
          }

          .note-editor-items-header {
            flex-direction: column !important;
          }

          .note-editor-add-item {
            width: 100% !important;
            min-height: 44px !important;
          }

          .note-editor-footer {
            position: sticky !important;
            bottom: 0 !important;
            z-index: 2 !important;
            flex-direction: column-reverse !important;
            flex-wrap: nowrap !important;
            margin: 0 -18px -18px !important;
            padding: 14px 18px max(18px, env(safe-area-inset-bottom)) !important;
            background: #fff !important;
          }

          .note-editor-footer button {
            width: 100% !important;
            min-height: 46px !important;
            font-size: 15px !important;
          }
        }
      `}</style>

      <div
        className="note-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-editor-title"
        aria-describedby="note-editor-description"
        style={styles.modal}
      >
        <form
          className="note-editor-form"
          onSubmit={handleSubmit}
          style={styles.form}
        >
          <header
            className="note-editor-header"
            style={styles.header}
          >
            <div style={styles.headerText}>
              <span style={styles.eyebrow}>
                {draft.id
                  ? "Editar nota"
                  : "Nova nota"}
              </span>

              <h2
                id="note-editor-title"
                className="note-editor-title"
                style={styles.title}
              >
                {draft.id
                  ? draft.titulo ||
                    "Editar nota"
                  : "Criar nota"}
              </h2>

              <span
                id="note-editor-description"
                style={styles.srOnly}
              >
                Formulário para criar ou editar
                uma nota interna.
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="note-editor-close"
              style={{
                ...styles.closeButton,
                ...(saving
                  ? styles.disabledButton
                  : {}),
              }}
              title="Fechar"
              aria-label="Fechar editor de nota"
            >
              ×
            </button>
          </header>

          <div
            className="note-editor-grid"
            style={styles.grid}
          >
            <label style={styles.field}>
              <span style={styles.label}>
                Título
              </span>

              <input
                autoFocus
                type="text"
                value={draft.titulo}
                disabled={saving}
                onChange={(event) =>
                  updateField(
                    "titulo",
                    event.target.value
                  )
                }
                className="note-editor-input"
                style={styles.input}
                placeholder="Ex.: Entregas da semana"
                maxLength={150}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>
                Categoria
              </span>

              <select
                value={draft.categoria}
                disabled={saving}
                onChange={(event) =>
                  updateField(
                    "categoria",
                    event.target.value
                  )
                }
                className="note-editor-input"
                style={styles.input}
              >
                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <label style={styles.field}>
            <span style={styles.label}>
              Conteúdo
            </span>

            <textarea
              value={draft.conteudo}
              disabled={saving}
              onChange={(event) =>
                updateField(
                  "conteudo",
                  event.target.value
                )
              }
              className="note-editor-textarea"
              style={styles.textarea}
              placeholder="Adicione informações gerais sobre esta nota..."
            />
          </label>

          <div
            className="note-editor-flags"
            style={styles.flags}
          >
            <label
              className="note-editor-checkbox-label"
              style={styles.checkboxLabel}
            >
              <input
                type="checkbox"
                checked={draft.fixada}
                disabled={saving}
                onChange={(event) =>
                  updateField(
                    "fixada",
                    event.target.checked
                  )
                }
              />

              Fixar nota
            </label>

            <label
              className="note-editor-checkbox-label"
              style={styles.checkboxLabel}
            >
              <input
                type="checkbox"
                checked={draft.arquivada}
                disabled={saving}
                onChange={(event) =>
                  updateField(
                    "arquivada",
                    event.target.checked
                  )
                }
              />

              Arquivar nota
            </label>
          </div>

          <section style={styles.itemsSection}>
            <div
              className="note-editor-items-header"
              style={styles.itemsHeader}
            >
              <div>
                <span style={styles.label}>
                  Lista de itens
                </span>

                <p style={styles.help}>
                  Use para clientes, entregas,
                  descontos e tarefas.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                disabled={saving}
                className="note-editor-add-item"
                style={{
                  ...styles.secondaryButton,
                  ...(saving
                    ? styles.disabledButton
                    : {}),
                }}
              >
                + Adicionar item
              </button>
            </div>

            <NoteList
              items={items}
              editable
              disabled={saving}
              onChangeItem={changeItem}
              onRemoveItem={removeItem}
            />
          </section>

          {validationError ? (
            <div
              style={styles.error}
              role="alert"
            >
              {validationError}
            </div>
          ) : null}

          <footer
            className="note-editor-footer"
            style={styles.footer}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              style={{
                ...styles.cancelButton,
                ...(saving
                  ? styles.disabledButton
                  : {}),
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.saveButton,
                ...(saving
                  ? styles.disabledButton
                  : {}),
              }}
            >
              {saving
                ? "Salvando..."
                : "Salvar nota"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background:
      "rgba(26, 20, 16, 0.48)",
  },

  modal: {
    width: "min(760px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: 16,
    background: "#fff",
    boxShadow:
      "0 24px 70px rgba(0, 0, 0, 0.28)",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    padding: 22,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },

  headerText: {
    minWidth: 0,
  },

  eyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    opacity: 0.65,
  },

  title: {
    margin: "4px 0 0",
    fontSize: 23,
    overflowWrap: "anywhere",
  },

  closeButton: {
    flexShrink: 0,
    width: 36,
    height: 36,
    border: "1px solid #ded7d1",
    borderRadius: 9,
    background: "#fff",
    cursor: "pointer",
    fontSize: 24,
    lineHeight: 1,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: 12,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },

  label: {
    fontSize: 13,
    fontWeight: 700,
  },

  input: {
    width: "100%",
    minWidth: 0,
    border: "1px solid #d8d0c8",
    borderRadius: 9,
    padding: "10px 11px",
    fontSize: 14,
    boxSizing: "border-box",
    background: "#fff",
  },

  textarea: {
    width: "100%",
    minHeight: 100,
    resize: "vertical",
    border: "1px solid #d8d0c8",
    borderRadius: 9,
    padding: "10px 11px",
    fontSize: 14,
    lineHeight: 1.45,
    boxSizing: "border-box",
  },

  flags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 14,
    cursor: "pointer",
  },

  itemsSection: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    borderTop: "1px solid #ece7e2",
    paddingTop: 17,
  },

  itemsHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  help: {
    margin: "3px 0 0",
    fontSize: 12,
    opacity: 0.65,
  },

  secondaryButton: {
    border: "1px solid #b8a496",
    borderRadius: 9,
    background: "#fff",
    padding: "9px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  error: {
    border: "1px solid #e1b3b3",
    borderRadius: 9,
    padding: "10px 12px",
    background: "#fff7f7",
    fontSize: 13,
  },

  footer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    borderTop: "1px solid #ece7e2",
    paddingTop: 17,
  },

  cancelButton: {
    border: "1px solid #d8d0c8",
    borderRadius: 9,
    background: "#fff",
    padding: "10px 15px",
    cursor: "pointer",
  },

  saveButton: {
    border: "1px solid #694a37",
    borderRadius: 9,
    background: "#694a37",
    color: "#fff",
    padding: "10px 17px",
    cursor: "pointer",
    fontWeight: 700,
  },

  disabledButton: {
    cursor: "not-allowed",
    opacity: 0.65,
  },

  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
  },
};