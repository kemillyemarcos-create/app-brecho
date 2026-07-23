import NoteList from "./NoteList.jsx";

import {
  formatNoteDate,
  getNoteProgress,
  normalizeNote,
} from "../utils/notesUtils.js";

export default function NoteCard({
  note,
  busy = false,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleArchive,
  onToggleItem,
}) {
  const normalizedNote = normalizeNote(note);

  const progress = getNoteProgress(
    normalizedNote.nota_itens
  );

  const dateValue =
    normalizedNote.atualizado_em ??
    normalizedNote.criado_em;

  const formattedDate =
    formatNoteDate(dateValue);

  const dateLabel = normalizedNote.atualizado_em
    ? "Atualizada em"
    : "Criada em";

  const handleToggleItem = (
    item,
    completed
  ) => {
    if (
      busy ||
      !normalizedNote.id ||
      !item?.id
    ) {
      return;
    }

    onToggleItem?.(
      normalizedNote.id,
      item.id,
      completed
    );
  };

  return (
    <article
      style={{
        ...styles.card,
        ...(normalizedNote.fixada
          ? styles.pinnedCard
          : {}),
        ...(normalizedNote.arquivada
          ? styles.archivedCard
          : {}),
      }}
    >
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.badges}>
            {normalizedNote.fixada ? (
              <span style={styles.badge}>
                Fixada
              </span>
            ) : null}

            {normalizedNote.arquivada ? (
              <span style={styles.badge}>
                Arquivada
              </span>
            ) : null}

            {normalizedNote.categoria ? (
              <span style={styles.category}>
                {normalizedNote.categoria}
              </span>
            ) : null}
          </div>

          <h3 style={styles.title}>
            {normalizedNote.titulo ||
              "Nota sem título"}
          </h3>
        </div>

        <button
          type="button"
          onClick={() =>
            onTogglePin?.(normalizedNote)
          }
          disabled={
            busy || !normalizedNote.id
          }
          style={{
            ...styles.iconButton,
            ...(busy
              ? styles.disabledButton
              : {}),
          }}
          title={
            normalizedNote.fixada
              ? "Desafixar nota"
              : "Fixar nota"
          }
          aria-label={
            normalizedNote.fixada
              ? `Desafixar nota ${normalizedNote.titulo}`
              : `Fixar nota ${normalizedNote.titulo}`
          }
        >
          {normalizedNote.fixada
            ? "★"
            : "☆"}
        </button>
      </header>

      {normalizedNote.conteudo ? (
        <p style={styles.content}>
          {normalizedNote.conteudo}
        </p>
      ) : null}

      <NoteList
        items={normalizedNote.nota_itens}
        disabled={busy}
        onToggleItem={handleToggleItem}
      />

      {progress.total > 0 ? (
        <div style={styles.progressArea}>
          <div style={styles.progressHeader}>
            <span>
              {progress.completed} de{" "}
              {progress.total} concluídos
            </span>

            <span>
              {progress.percentage}%
            </span>
          </div>

          <div
            style={styles.progressTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              progress.percentage
            }
            aria-label="Progresso da nota"
          >
            <div
              style={{
                ...styles.progressBar,
                width: `${progress.percentage}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      <footer style={styles.footer}>
        {formattedDate ? (
          <span style={styles.date}>
            {dateLabel} {formattedDate}
          </span>
        ) : (
          <span style={styles.date}>
            Data não disponível
          </span>
        )}

        <div style={styles.actions}>
          <button
            type="button"
            onClick={() =>
              onEdit?.(normalizedNote)
            }
            disabled={
              busy || !normalizedNote.id
            }
            style={{
              ...styles.actionButton,
              ...(busy
                ? styles.disabledButton
                : {}),
            }}
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() =>
              onToggleArchive?.(
                normalizedNote
              )
            }
            disabled={
              busy || !normalizedNote.id
            }
            style={{
              ...styles.actionButton,
              ...(busy
                ? styles.disabledButton
                : {}),
            }}
          >
            {normalizedNote.arquivada
              ? "Restaurar"
              : "Arquivar"}
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete?.(
                normalizedNote.id
              )
            }
            disabled={
              busy || !normalizedNote.id
            }
            style={{
              ...styles.deleteButton,
              ...(busy
                ? styles.disabledButton
                : {}),
            }}
          >
            Excluir
          </button>
        </div>
      </footer>
    </article>
  );
}

const styles = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 13,
    border: "1px solid #e2dcd6",
    borderRadius: 14,
    padding: 16,
    background: "#ffffff",
    boxShadow:
      "0 2px 10px rgba(38, 28, 20, 0.05)",
  },

  pinnedCard: {
    border: "1px solid #aa866c",
    boxShadow:
      "0 3px 12px rgba(90, 60, 40, 0.10)",
  },

  archivedCard: {
    opacity: 0.82,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  headerContent: {
    minWidth: 0,
    flex: 1,
  },

  badges: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 7,
  },

  badge: {
    padding: "3px 7px",
    borderRadius: 999,
    fontSize: 11,
    background: "#efe4dc",
  },

  category: {
    padding: "3px 7px",
    borderRadius: 999,
    fontSize: 11,
    background: "#f4f2ef",
  },

  title: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  },

  iconButton: {
    flexShrink: 0,
    width: 34,
    height: 34,
    border: "1px solid #ded7d1",
    borderRadius: 9,
    background: "#fff",
    cursor: "pointer",
    fontSize: 19,
  },

  content: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },

  progressArea: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 11,
    opacity: 0.7,
  },

  progressTrack: {
    height: 5,
    borderRadius: 999,
    background: "#eee9e5",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: 999,
    background: "#8a654d",
    transition: "width 180ms ease",
  },

  footer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },

  date: {
    fontSize: 11,
    opacity: 0.6,
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
  },

  actionButton: {
    border: "1px solid #d8d0c8",
    borderRadius: 8,
    background: "#fff",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 12,
  },

  deleteButton: {
    border: "1px solid #d5a8a8",
    borderRadius: 8,
    background: "#fff",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 12,
  },

  disabledButton: {
    cursor: "not-allowed",
    opacity: 0.55,
  },
};