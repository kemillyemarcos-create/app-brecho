import {
  Archive,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  StickyNote,
  X,
} from "lucide-react";

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

  const isMobile =
    typeof window !== "undefined"
      ? window.innerWidth <= 767
      : false;

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

  const corPrincipal = "#8f2745";
  const corPrincipalClara = "#f7dce6";
  const corBorda = "#ead1da";
  const corTexto = "#243746";
  const corSuave = "#64748b";
  const corFundoSuave = "#fff7fa";

  const cardBase = {
    border: "1px solid #eef2f7",
    borderRadius: 18,
    background: "#fff",
    boxShadow:
      "0 2px 10px rgba(15,23,42,0.04)",
  };

  const miniIcone = {
    width: 34,
    height: 34,
    borderRadius: 12,
    border: `1px solid ${corBorda}`,
    background: corPrincipalClara,
    color: corPrincipal,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const inputPadrao = {
    width: "100%",
    minWidth: 0,
    minHeight: isMobile ? 40 : 42,
    border: "1px solid #dfe6ee",
    borderRadius: 13,
    padding: isMobile
      ? "9px 12px"
      : "10px 13px",
    fontSize: isMobile ? 13 : 14,
    background: "#fff",
    color: corTexto,
    boxSizing: "border-box",
    outline: "none",
    boxShadow: "none",
  };

  const botaoBase = {
    minHeight: isMobile ? 40 : 42,
    borderRadius: 14,
    padding: isMobile
      ? "9px 12px"
      : "10px 14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: isMobile ? 12.5 : 13.5,
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  const botaoPrincipal = {
    ...botaoBase,
    border: `1px solid ${corPrincipal}`,
    background: corPrincipal,
    color: "#fff",
    boxShadow:
      "0 8px 18px rgba(143,39,69,0.18)",
  };

  const botaoSecundario = {
    ...botaoBase,
    border: "1px solid #dfe6ee",
    background: "#fff",
    color: corTexto,
    boxShadow:
      "0 2px 8px rgba(15,23,42,0.04)",
  };

  const botaoDesabilitado = {
    cursor: "not-allowed",
    opacity: 0.55,
  };

  return (
    <section
      aria-labelledby="notes-section-title"
      style={{
        display: "grid",
        gap: isMobile ? 14 : 16,
        width: "100%",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            id="notes-section-title"
            style={{
              margin: "0 0 4px",
              color: corTexto,
              fontSize: isMobile
                ? 22
                : 26,
              lineHeight: 1.2,
            }}
          >
            Notas
          </h2>

          <div
            style={{
              color: corSuave,
              fontSize: isMobile
                ? 13
                : 14,
              lineHeight: 1.4,
            }}
          >
            Centralize listas, clientes,
            entregas, descontos e
            observações do brechó.
          </div>
        </div>

        <button
          type="button"
          onClick={openNewNote}
          disabled={saving}
          style={{
            ...botaoPrincipal,
            width: isMobile
              ? "100%"
              : "auto",
            ...(saving
              ? botaoDesabilitado
              : {}),
          }}
        >
          <Plus size={16} />
          Nova nota
        </button>
      </div>

      <div
        style={{
          ...cardBase,
          padding: isMobile
            ? 13
            : 16,
          display: "grid",
          gap: 12,
          background: "#fcfdff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={miniIcone}>
              <ListFilter size={17} />
            </span>

            <div>
              <strong
                style={{
                  display: "block",
                  color: corTexto,
                  fontSize: isMobile
                    ? 15
                    : 16,
                }}
              >
                Filtros
              </strong>

              <span
                style={{
                  display: "block",
                  color: corSuave,
                  fontSize: 12.5,
                  marginTop: 2,
                }}
              >
                Encontre rapidamente a nota
                desejada.
              </span>
            </div>
          </div>

          <div
            style={{
              minHeight: 36,
              padding: "7px 11px",
              borderRadius: 999,
              border: `1px solid ${corBorda}`,
              background: corFundoSuave,
              color: corPrincipal,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: isMobile
                ? 12
                : 12.5,
              fontWeight: 900,
            }}
          >
            <StickyNote size={15} />
            {visibleNotes.length} nota(s)
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              isMobile
                ? "1fr"
                : "minmax(0, 1.6fr) minmax(150px, 0.6fr) minmax(150px, 0.6fr)",
            gap: 10,
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 3,
              color: corTexto,
              fontSize: 12.5,
              fontWeight: 800,
            }}
          >
            Buscar
            <div
              style={{
                position: "relative",
              }}
            >
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              />

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
                style={{
                  ...inputPadrao,
                  paddingLeft: 38,
                }}
              />
            </div>
          </label>

          <label
            style={{
              display: "grid",
              gap: 3,
              color: corTexto,
              fontSize: 12.5,
              fontWeight: 800,
            }}
          >
            Categoria
            <select
              id="notes-category"
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
              style={inputPadrao}
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
          </label>

          <label
            style={{
              display: "grid",
              gap: 3,
              color: corTexto,
              fontSize: 12.5,
              fontWeight: 800,
            }}
          >
            Status
            <select
              id="notes-status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              style={inputPadrao}
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
          </label>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              disabled={loading}
              style={{
                ...botaoSecundario,
                ...(loading
                  ? botaoDesabilitado
                  : {}),
              }}
            >
              <X size={15} />
              Limpar filtros
            </button>
          ) : null}

          <button
            type="button"
            onClick={loadNotes}
            disabled={loading}
            style={{
              ...botaoSecundario,
              ...(loading
                ? botaoDesabilitado
                : {}),
            }}
          >
            <RefreshCw size={15} />
            {loading
              ? "Atualizando..."
              : "Atualizar"}
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            ...cardBase,
            padding: isMobile
              ? 12
              : 13,
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "flex-start",
            gap: 10,
            flexWrap: "wrap",
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#991b1b",
          }}
        >
          <span
            style={{
              minWidth: 0,
              overflowWrap: "anywhere",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </span>

          <button
            type="button"
            onClick={clearError}
            aria-label="Fechar mensagem de erro"
            style={{
              border: 0,
              background: "transparent",
              color: "#991b1b",
              cursor: "pointer",
              fontWeight: 900,
              padding: 0,
            }}
          >
            Fechar
          </button>
        </div>
      ) : null}

      {loading ? (
        <div
          aria-live="polite"
          style={{
            ...cardBase,
            minHeight: 150,
            padding: isMobile
              ? 22
              : 28,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent:
              "center",
            gap: 7,
            textAlign: "center",
            color: corSuave,
          }}
        >
          <RefreshCw size={20} />

          <strong
            style={{ color: corTexto }}
          >
            Carregando notas...
          </strong>

          <span
            style={{
              fontSize: 13,
            }}
          >
            Aguarde enquanto os dados são
            atualizados.
          </span>
        </div>
      ) : visibleNotes.length === 0 ? (
        <div
          style={{
            ...cardBase,
            minHeight: 170,
            padding: isMobile
              ? 22
              : 30,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent:
              "center",
            gap: 8,
            textAlign: "center",
            color: corSuave,
            borderStyle: "dashed",
          }}
        >
          <span style={miniIcone}>
            {statusFilter ===
              NOTES_FILTERS.ARCHIVED ? (
              <Archive size={17} />
            ) : (
              <StickyNote size={17} />
            )}
          </span>

          <strong
            style={{
              color: corTexto,
              marginTop: 2,
            }}
          >
            {notes.length === 0
              ? "Nenhuma nota cadastrada."
              : "Nenhuma nota encontrada."}
          </strong>

          <span
            style={{
              fontSize: 13,
            }}
          >
            {notes.length === 0
              ? "Crie sua primeira nota para começar."
              : "Ajuste ou limpe os filtros de busca."}
          </span>

          {notes.length === 0 ? (
            <button
              type="button"
              onClick={openNewNote}
              style={{
                ...botaoPrincipal,
                marginTop: 4,
              }}
            >
              <Plus size={15} />
              Criar primeira nota
            </button>
          ) : hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                ...botaoSecundario,
                marginTop: 4,
              }}
            >
              <X size={15} />
              Limpar filtros
            </button>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
            gap: isMobile ? 12 : 14,
            alignItems: "start",
          }}
        >
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
