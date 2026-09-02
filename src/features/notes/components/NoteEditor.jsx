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
} from "../constants/notesConstants";

import {
  createTemporaryItem,
  normalizeNote,
} from "../utils/notesUtils";

import NoteList from "./NoteList.jsx";

export default function NoteEditor({
  open,
  note,
  saving = false,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(() => normalizeNote(note));
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(normalizeNote(note));
    setValidationError("");
  }, [open, note]);

  const handleClose = useCallback(() => {
    if (saving) return;
    setValidationError("");
    onClose?.();
  }, [onClose, saving]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving, handleClose]);

  const categories = useMemo(() => {
    const currentCategory = draft.categoria?.trim();
    if (currentCategory && !NOTE_CATEGORIES.includes(currentCategory)) {
      return [...NOTE_CATEGORIES, currentCategory];
    }
    return NOTE_CATEGORIES;
  }, [draft.categoria]);

  const updateField = useCallback((field, value) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
    if (field === "titulo" && String(value).trim()) setValidationError("");
  }, []);

  const addItem = useCallback(() => {
    setDraft((currentDraft) => {
      const currentItems = Array.isArray(currentDraft.nota_itens)
        ? currentDraft.nota_itens
        : [];

      return {
        ...currentDraft,
        tipo: NOTE_TYPES.CHECKLIST,
        nota_itens: [
          ...currentItems,
          createTemporaryItem(currentItems.length),
        ],
      };
    });
  }, []);

  const changeItem = useCallback((index, updatedItem) => {
    setDraft((currentDraft) => {
      const currentItems = Array.isArray(currentDraft.nota_itens)
        ? currentDraft.nota_itens
        : [];

      return {
        ...currentDraft,
        nota_itens: currentItems.map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, ...updatedItem, ordem: itemIndex }
            : item
        ),
      };
    });
  }, []);

  const removeItem = useCallback((index) => {
    setDraft((currentDraft) => {
      const currentItems = Array.isArray(currentDraft.nota_itens)
        ? currentDraft.nota_itens
        : [];

      return {
        ...currentDraft,
        nota_itens: currentItems
          .filter((_, itemIndex) => itemIndex !== index)
          .map((item, itemIndex) => ({ ...item, ordem: itemIndex })),
      };
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedTitle = draft.titulo.trim();
    if (!normalizedTitle) {
      setValidationError(NOTES_MESSAGES.REQUIRED_TITLE);
      return;
    }

    const currentItems = Array.isArray(draft.nota_itens)
      ? draft.nota_itens
      : [];

    const notePayload = {
      ...draft,
      titulo: normalizedTitle,
      nota_itens: currentItems
        .filter((item) => item.texto?.trim())
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
      console.error("Erro ao salvar nota no editor:", saveError);
      setValidationError(
        saveError?.message || NOTES_MESSAGES.UPDATE_ERROR
      );
    }
  };

  if (!open) return null;

  const items = Array.isArray(draft.nota_itens)
    ? draft.nota_itens
    : [];

  const contentLines = String(draft.conteudo || "").split("\n").length;
  const contentChars = String(draft.conteudo || "").length;

  return (
    <div
      className="note-editor-overlay"
      style={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) handleClose();
      }}
    >
      <style>{`
        @media (max-width: 767px) {
          .note-editor-overlay {
            padding: 0 !important;
            align-items: stretch !important;
          }

          .note-editor-modal {
            width: 100% !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
          }

          .note-editor-form {
            padding: 14px !important;
            gap: 12px !important;
          }

          .note-editor-grid {
            grid-template-columns: 1fr !important;
          }

          .note-editor-textarea {
            min-height: 38vh !important;
            height: 38vh !important;
          }

          .note-editor-flags {
            gap: 10px !important;
          }

          .note-editor-items-header {
            align-items: stretch !important;
          }

          .note-editor-items-header button {
            width: 100% !important;
          }

          .note-editor-footer {
            position: sticky !important;
            bottom: 0 !important;
            margin: 0 -14px -14px !important;
            padding: 12px 14px !important;
            background: var(--kc-panel, #ffffff) !important;
            backdrop-filter: blur(10px);
          }

          .note-editor-footer button {
            flex: 1 !important;
            min-height: 44px !important;
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
          <header style={styles.header}>
            <div style={styles.headerText}>
              <span style={styles.eyebrow}>
                {draft.id ? "Editar nota" : "Nova nota"}
              </span>

              <h2 id="note-editor-title" style={styles.title}>
                {draft.id ? draft.titulo || "Editar nota" : "Criar nota"}
              </h2>

              <span id="note-editor-description" style={styles.srOnly}>
                Formulário para criar ou editar uma nota interna.
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              style={{
                ...styles.closeButton,
                ...(saving ? styles.disabledButton : {}),
              }}
              title="Fechar"
              aria-label="Fechar editor de nota"
            >
              ×
            </button>
          </header>

          <div className="note-editor-grid" style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Título</span>
              <input
                autoFocus
                type="text"
                value={draft.titulo}
                disabled={saving}
                onChange={(event) => updateField("titulo", event.target.value)}
                style={styles.input}
                placeholder="Ex.: Entregas da semana"
                maxLength={150}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Categoria</span>
              <select
                value={draft.categoria}
                disabled={saving}
                onChange={(event) => updateField("categoria", event.target.value)}
                style={styles.input}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={styles.field}>
            <div style={styles.contentLabelRow}>
              <span style={styles.label}>Conteúdo da nota</span>
              <span style={styles.counter}>
                {contentLines} linha(s) • {contentChars} caractere(s)
              </span>
            </div>

            <textarea
              className="note-editor-textarea"
              value={draft.conteudo}
              disabled={saving}
              onChange={(event) => updateField("conteudo", event.target.value)}
              style={styles.textarea}
              placeholder="Escreva aqui as informações da nota..."
            />
          </label>

          <div className="note-editor-flags" style={styles.flags}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={draft.fixada}
                disabled={saving}
                onChange={(event) => updateField("fixada", event.target.checked)}
                style={styles.checkbox}
              />
              Fixar nota no topo
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={draft.arquivada}
                disabled={saving}
                onChange={(event) => updateField("arquivada", event.target.checked)}
                style={styles.checkbox}
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
                <span style={styles.label}>Lista de itens</span>
                <p style={styles.help}>
                  Opcional. Use para clientes, entregas, descontos ou tarefas.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                disabled={saving}
                style={{
                  ...styles.secondaryButton,
                  ...(saving ? styles.disabledButton : {}),
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
            <div style={styles.error} role="alert">
              {validationError}
            </div>
          ) : null}

          <footer className="note-editor-footer" style={styles.footer}>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              style={{
                ...styles.cancelButton,
                ...(saving ? styles.disabledButton : {}),
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.saveButton,
                ...(saving ? styles.disabledButton : {}),
              }}
            >
              {saving ? "Salvando..." : "Salvar nota"}
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
    background: "rgba(15, 23, 42, 0.48)",
    backdropFilter: "blur(2px)",
  },

  modal: {
    width: "min(980px, 96vw)",
    maxHeight: "94vh",
    overflowY: "auto",
    borderRadius: 20,
    background: "var(--kc-panel, #fff)",
    border: "1px solid var(--kc-border, #eef2f7)",
    boxShadow: "0 28px 80px rgba(15, 23, 42, 0.28)",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 20,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },

  headerText: { minWidth: 0 },

  eyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--kc-primary, #8f2745)",
    fontWeight: 800,
  },

  title: {
    margin: "3px 0 0",
    fontSize: 24,
    lineHeight: 1.2,
    color: "var(--kc-text, #243746)",
    overflowWrap: "anywhere",
  },

  closeButton: {
    flexShrink: 0,
    width: 38,
    height: 38,
    border: "1px solid var(--kc-border, #e2e8f0)",
    borderRadius: 12,
    background: "var(--kc-panel, #fff)",
    color: "var(--kc-text, #243746)",
    cursor: "pointer",
    fontSize: 24,
    lineHeight: 1,
    boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(220px, 0.8fr)",
    gap: 12,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    minWidth: 0,
  },

  label: {
    fontSize: 12.5,
    fontWeight: 800,
    color: "var(--kc-text, #243746)",
  },

  input: {
    width: "100%",
    minWidth: 0,
    minHeight: 42,
    border: "1px solid var(--kc-border, #dfe6ee)",
    borderRadius: 12,
    padding: "9px 12px",
    fontSize: 14,
    color: "var(--kc-text, #243746)",
    boxSizing: "border-box",
    background: "var(--kc-panel, #fff)",
    outline: "none",
  },

  contentLabelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },

  counter: {
    fontSize: 11.5,
    color: "var(--kc-text-muted, #94a3b8)",
    fontWeight: 600,
  },

  textarea: {
    width: "100%",
    minHeight: 320,
    height: "clamp(320px, 43vh, 460px)",
    resize: "vertical",
    border: "1px solid var(--kc-border, #dfe6ee)",
    borderRadius: 14,
    padding: "14px 15px",
    fontSize: 15,
    lineHeight: 1.55,
    color: "var(--kc-text, #243746)",
    boxSizing: "border-box",
    background: "var(--kc-panel, #fff)",
    outline: "none",
  },

  flags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    padding: "2px 0",
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13.5,
    color: "var(--kc-text-muted, #475569)",
    cursor: "pointer",
  },

  checkbox: {
    width: 17,
    height: 17,
    accentColor: "var(--kc-primary, #8f2745)",
  },

  itemsSection: {
    display: "flex",
    flexDirection: "column",
    gap: 9,
    borderTop: "1px solid var(--kc-border, #eef2f7)",
    paddingTop: 13,
  },

  itemsHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  help: {
    margin: "3px 0 0",
    fontSize: 12,
    lineHeight: 1.4,
    color: "var(--kc-text-muted, #64748b)",
  },

  secondaryButton: {
    minHeight: 40,
    border: "1px solid var(--kc-border, #ead1da)",
    borderRadius: 12,
    background: "var(--kc-panel, #fff)",
    color: "var(--kc-primary, #8f2745)",
    padding: "8px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: 800,
  },

  error: {
    border: "1px solid #fecaca",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff1f2",
    color: "#991b1b",
    fontSize: 13,
    fontWeight: 700,
  },

  footer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    borderTop: "1px solid var(--kc-border, #eef2f7)",
    paddingTop: 14,
  },

  cancelButton: {
    minHeight: 42,
    border: "1px solid var(--kc-border, #dfe6ee)",
    borderRadius: 12,
    background: "var(--kc-panel, #fff)",
    color: "var(--kc-text, #243746)",
    padding: "9px 16px",
    cursor: "pointer",
    fontWeight: 800,
  },

  saveButton: {
    minHeight: 42,
    border: "1px solid #8f2745",
    borderRadius: 12,
    background: "var(--kc-primary, #8f2745)",
    color: "var(--kc-panel, #fff)",
    padding: "9px 18px",
    cursor: "pointer",
    fontWeight: 800,
    boxShadow: "0 8px 18px rgba(15,23,42,0.14)",
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