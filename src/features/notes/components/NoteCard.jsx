import {
  useEffect,
  useState,
} from "react";

import NoteList from "./NoteList.jsx";

import {
  formatNoteDate,
  getNoteProgress,
  normalizeNote,
} from "../utils/notesUtils.js";

function useIsMobile(maxWidth = 767) {
  const getMatches = () => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(
      `(max-width: ${maxWidth}px)`
    ).matches;
  };

  const [isMobile, setIsMobile] =
    useState(getMatches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(max-width: ${maxWidth}px)`
    );

    const handleChange = (event) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);

    mediaQuery.addEventListener(
      "change",
      handleChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleChange
      );
    };
  }, [maxWidth]);

  return isMobile;
}

export default function NoteCard({
  note,
  busy = false,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleArchive,
  onToggleItem,
  formatarDataHoraBR,
}) {
  const isMobile = useIsMobile();

  const normalizedNote = normalizeNote(note);

  const progress = getNoteProgress(
    normalizedNote.nota_itens
  );

  const dateValue =
    normalizedNote.atualizado_em ??
    normalizedNote.criado_em;

  const formattedDate =
  typeof formatarDataHoraBR === "function"
    ? formatarDataHoraBR(dateValue)
    : formatNoteDate(dateValue);

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
        ...(isMobile
          ? styles.cardMobile
          : {}),
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

          <h3
            style={{
              ...styles.title,
              ...(isMobile
                ? styles.titleMobile
                : {}),
            }}
          >
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
            ...(isMobile
              ? styles.iconButtonMobile
              : {}),
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
        <p
          style={{
            ...styles.content,
            ...(isMobile
              ? styles.contentMobile
              : {}),
          }}
        >
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

      <footer
        style={{
          ...styles.footer,
          ...(isMobile
            ? styles.footerMobile
            : {}),
        }}
      >
        {formattedDate ? (
          <span
            style={{
              ...styles.date,
              ...(isMobile
                ? styles.dateMobile
                : {}),
            }}
          >
            {dateLabel} {formattedDate}
          </span>
        ) : (
          <span
            style={{
              ...styles.date,
              ...(isMobile
                ? styles.dateMobile
                : {}),
            }}
          >
            Data não disponível
          </span>
        )}

        <div
          style={{
            ...styles.actions,
            ...(isMobile
              ? styles.actionsMobile
              : {}),
          }}
        >
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
              ...(isMobile
                ? styles.actionButtonMobile
                : {}),
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
              ...(isMobile
                ? styles.actionButtonMobile
                : {}),
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
              ...(isMobile
                ? styles.actionButtonMobile
                : {}),
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
    border: "1px solid var(--kc-border, #e2dcd6)",
    borderRadius: 14,
    padding: 16,
    background: "var(--kc-panel, #ffffff)",
    boxShadow:
      "0 2px 10px rgba(38, 28, 20, 0.05)",
  },

  cardMobile: {
    gap: 12,
    padding: 14,
  },

  pinnedCard: {
    border: "1px solid var(--kc-primary, #aa866c)",
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
    background: "var(--kc-soft, #efe4dc)",
  },

  category: {
    padding: "3px 7px",
    borderRadius: 999,
    fontSize: 11,
    background: "var(--kc-background, #f4f2ef)",
  },

  title: {
    margin: 0,
    color: "var(--kc-text, #243746)",
    fontSize: 18,
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  },

  titleMobile: {
    fontSize: 17,
  },

  iconButton: {
    flexShrink: 0,
    width: 34,
    height: 34,
    border: "1px solid var(--kc-border, #ded7d1)",
    borderRadius: 9,
    background: "var(--kc-panel, #fff)",
    cursor: "pointer",
    fontSize: 19,
  },

  iconButtonMobile: {
    width: 38,
    height: 38,
  },

  content: {
    margin: 0,
    color: "var(--kc-text, #243746)",
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },

  contentMobile: {
    fontSize: 14,
    lineHeight: 1.4,
  },

  progressArea: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  progressHeader: {
    display: "flex",
    color: "var(--kc-text-muted, #64748b)",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 11,
    opacity: 0.7,
  },

  progressTrack: {
    height: 5,
    borderRadius: 999,
    background: "var(--kc-border, #eee9e5)",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: 999,
    background: "var(--kc-primary, #8a654d)",
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

  footerMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 9,
  },

  date: {
    fontSize: 11,
    color: "var(--kc-text-muted, #64748b)",
    opacity: 0.6,
  },

  dateMobile: {
    width: "100%",
    fontSize: 11,
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
  },

  actionsMobile: {
    width: "100%",
    flexWrap: "nowrap",
    gap: 6,
  },

  actionButton: {
    color: "var(--kc-text, #243746)",
    border: "1px solid var(--kc-border, #d8d0c8)",
    borderRadius: 8,
    background: "var(--kc-panel, #fff)",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 12,
  },

  deleteButton: {
    color: "#991b1b",
    border: "1px solid #d5a8a8",
    borderRadius: 8,
    background: "#fff1f2",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 12,
  },

  actionButtonMobile: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    padding: "8px 6px",
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  disabledButton: {
    cursor: "not-allowed",
    opacity: 0.55,
  },
};