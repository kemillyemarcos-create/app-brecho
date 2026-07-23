import {
  NoteCard,
  NoteEditor,
} from "../../features/notes/components/index.js";  

import {
  NOTES_FILTERS,
} from "../../features/notes/constants/notesConstants.js";

import useNotes from "../../features/notes/hooks/useNotes.js";

export default function NotesSection() {
  const {
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
  } = useNotes();

  const hasActiveFilters =
    Boolean(search.trim()) ||
    category !== "Todas" ||
    statusFilter !== NOTES_FILTERS.ACTIVE;

  const clearFilters = () => {
    setSearch("");
    setCategory("Todas");
    setStatusFilter(
      NOTES_FILTERS.ACTIVE
    );
  };

  return (
    <section
      style={styles.section}
      aria-labelledby="notes-section-title"
    >
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <span style={styles.eyebrow}>
            Organização interna
          </span>

          <h1
            id="notes-section-title"
            style={styles.title}
          >
            Notas
          </h1>

          <p style={styles.subtitle}>
            Centralize listas, clientes, entregas,
            descontos e observações do brechó.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewNote}
          disabled={saving}
          style={{
            ...styles.primaryButton,
            ...(saving
              ? styles.disabledButton
              : {}),
          }}
        >
          + Nova nota
        </button>
      </header>

      <div style={styles.filters}>
        <div style={styles.field}>
          <label
            htmlFor="notes-search"
            style={styles.label}
          >
            Buscar
          </label>

          <input
            id="notes-search"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Título, conteúdo, item ou observação..."
            style={styles.searchInput}
          />
        </div>

        <div style={styles.field}>
          <label
            htmlFor="notes-category"
            style={styles.label}
          >
            Categoria
          </label>

          <select
            id="notes-category"
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value
              )
            }
            style={styles.select}
          >
            {categories.map(
              (categoryOption) => (
                <option
                  key={categoryOption}
                  value={categoryOption}
                >
                  {categoryOption}
                </option>
              )
            )}
          </select>
        </div>

        <div style={styles.field}>
          <label
            htmlFor="notes-status"
            style={styles.label}
          >
            Status
          </label>

          <select
            id="notes-status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            style={styles.select}
          >
            <option
              value={
                NOTES_FILTERS.ACTIVE
              }
            >
              Ativas
            </option>

            <option
              value={
                NOTES_FILTERS.PINNED
              }
            >
              Fixadas
            </option>

            <option
              value={
                NOTES_FILTERS.ARCHIVED
              }
            >
              Arquivadas
            </option>

            <option
              value={
                NOTES_FILTERS.ALL
              }
            >
              Todas
            </option>
          </select>
        </div>

        <div style={styles.filterActions}>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              disabled={loading}
              style={{
                ...styles.clearButton,
                ...(loading
                  ? styles.disabledButton
                  : {}),
              }}
            >
              Limpar
            </button>
          ) : null}

          <button
            type="button"
            onClick={loadNotes}
            disabled={loading}
            style={{
              ...styles.refreshButton,
              ...(loading
                ? styles.disabledButton
                : {}),
            }}
          >
            {loading
              ? "Atualizando..."
              : "Atualizar"}
          </button>
        </div>
      </div>

      {error ? (
        <div
          style={styles.error}
          role="alert"
        >
          <span style={styles.errorText}>
            {error}
          </span>

          <button
            type="button"
            onClick={clearError}
            style={styles.errorButton}
            aria-label="Fechar mensagem de erro"
          >
            Fechar
          </button>
        </div>
      ) : null}

      {loading ? (
        <div
          style={styles.stateBox}
          aria-live="polite"
        >
          <strong>
            Carregando notas...
          </strong>

          <span>
            Aguarde enquanto os dados são
            atualizados.
          </span>
        </div>
      ) : visibleNotes.length === 0 ? (
        <div style={styles.stateBox}>
          <strong>
            {notes.length === 0
              ? "Nenhuma nota cadastrada."
              : "Nenhuma nota encontrada."}
          </strong>

          <span>
            {notes.length === 0
              ? "Crie sua primeira nota para começar."
              : "Ajuste ou limpe os filtros de busca."}
          </span>

          {notes.length === 0 ? (
            <button
              type="button"
              onClick={openNewNote}
              style={styles.emptyActionButton}
            >
              Criar primeira nota
            </button>
          ) : hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              style={styles.emptyActionButton}
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
      ) : (
        <div style={styles.grid}>
          {visibleNotes.map(
            (note, index) => {
              const noteItems =
                Array.isArray(
                  note?.nota_itens
                )
                  ? note.nota_itens
                  : [];

              const isNoteBusy =
                actionLoadingId ===
                  note?.id ||
                noteItems.some(
                  (item) =>
                    item?.id ===
                    actionLoadingId
                );

              return (
                <NoteCard
                  key={
                    note?.id ??
                    `note-${index}`
                  }
                  note={note}
                  busy={isNoteBusy}
                  onEdit={openEditNote}
                  onDelete={removeNote}
                  onTogglePin={togglePin}
                  onToggleArchive={
                    toggleArchive
                  }
                  onToggleItem={
                    toggleItem
                  }
                />
              );
            }
          )}
        </div>
      )}

      <NoteEditor
        open={isEditorOpen}
        note={selectedNote}
        saving={saving}
        onClose={closeEditor}
        onSave={saveNote}
      />
    </section>
  );
}

const styles = {
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    width: "100%",
    minWidth: 0,
  },

  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },

  headerContent: {
    minWidth: 0,
    flex: 1,
  },

  eyebrow: {
    display: "block",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    opacity: 0.65,
  },

  title: {
    margin: "4px 0 5px",
    fontSize: 28,
    lineHeight: 1.2,
  },

  subtitle: {
    margin: 0,
    maxWidth: 650,
    fontSize: 14,
    lineHeight: 1.5,
    opacity: 0.7,
  },

  primaryButton: {
    flexShrink: 0,
    border: "1px solid #694a37",
    borderRadius: 10,
    background: "#694a37",
    color: "#fff",
    padding: "11px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },

  filters: {
    display: "grid",
    gridTemplateColumns:
      "minmax(min(100%, 260px), 1fr) repeat(2, minmax(145px, 0.25fr)) auto",
    alignItems: "end",
    gap: 10,
  },

  field: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  label: {
    fontSize: 11,
    fontWeight: 600,
    opacity: 0.65,
  },

  searchInput: {
    width: "100%",
    minWidth: 0,
    border: "1px solid #d8d0c8",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    boxSizing: "border-box",
  },

  select: {
    width: "100%",
    minWidth: 0,
    border: "1px solid #d8d0c8",
    borderRadius: 10,
    padding: "10px 11px",
    fontSize: 14,
    background: "#fff",
    boxSizing: "border-box",
  },

  filterActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
  },

  refreshButton: {
    minHeight: 40,
    border: "1px solid #d8d0c8",
    borderRadius: 10,
    background: "#fff",
    padding: "10px 13px",
    cursor: "pointer",
  },

  clearButton: {
    minHeight: 40,
    border: "1px solid #d8d0c8",
    borderRadius: 10,
    background: "transparent",
    padding: "10px 13px",
    cursor: "pointer",
  },

  error: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    border: "1px solid #e1b3b3",
    borderRadius: 10,
    padding: "11px 13px",
    background: "#fff7f7",
    fontSize: 13,
  },

  errorText: {
    minWidth: 0,
    overflowWrap: "anywhere",
  },

  errorButton: {
    flexShrink: 0,
    border: 0,
    background: "transparent",
    cursor: "pointer",
    fontWeight: 700,
  },

  stateBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    border: "1px dashed #cec5be",
    borderRadius: 14,
    padding: "45px 20px",
    textAlign: "center",
    opacity: 0.78,
  },

  emptyActionButton: {
    marginTop: 6,
    border: "1px solid #694a37",
    borderRadius: 9,
    background: "#fff",
    padding: "9px 13px",
    cursor: "pointer",
    fontWeight: 600,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(min(100%, 310px), 1fr))",
    gap: 15,
    alignItems: "start",
  },

  disabledButton: {
    cursor: "not-allowed",
    opacity: 0.55,
  },
};