export default function NoteItem({
  item = {},
  disabled = false,
  editable = false,
  onToggle,
  onChange,
  onRemove,
}) {
  const safeItem = {
    id: item?.id ?? null,
    nota_id: item?.nota_id ?? null,
    texto: item?.texto ?? "",
    concluido: Boolean(item?.concluido),
    observacao: item?.observacao ?? "",
    cliente_id: item?.cliente_id ?? null,
    valor_ajuste:
      item?.valor_ajuste === undefined
        ? null
        : item.valor_ajuste,
    ordem: item?.ordem ?? 0,
  };

  const handleFieldChange = (field, value) => {
    onChange?.({
      ...item,
      [field]: value,
    });
  };

  const formattedValue = formatCurrency(
    safeItem.valor_ajuste
  );

  if (editable) {
    return (
      <div style={styles.editorRow}>
        <input
          type="checkbox"
          checked={safeItem.concluido}
          disabled={disabled}
          onChange={(event) =>
            handleFieldChange(
              "concluido",
              event.target.checked
            )
          }
          aria-label={
            safeItem.texto
              ? `Marcar ${safeItem.texto} como concluído`
              : "Marcar item como concluído"
          }
          style={styles.checkbox}
        />

        <div style={styles.editorFields}>
          <input
            type="text"
            value={safeItem.texto}
            disabled={disabled}
            onChange={(event) =>
              handleFieldChange(
                "texto",
                event.target.value
              )
            }
            placeholder="Descrição do item"
            aria-label="Descrição do item"
            maxLength={300}
            style={{
              ...styles.input,
              ...(safeItem.concluido
                ? styles.completedText
                : {}),
            }}
          />

          <input
            type="text"
            value={safeItem.observacao}
            disabled={disabled}
            onChange={(event) =>
              handleFieldChange(
                "observacao",
                event.target.value
              )
            }
            placeholder="Observação opcional"
            aria-label="Observação do item"
            maxLength={500}
            style={styles.secondaryInput}
          />

          <div style={styles.inlineFields}>
            <input
              type="text"
              value={safeItem.cliente_id ?? ""}
              disabled={disabled}
              onChange={(event) => {
                const value =
                  event.target.value.trim();

                handleFieldChange(
                  "cliente_id",
                  value || null
                );
              }}
              placeholder="ID cliente (opcional)"
              aria-label="ID do cliente relacionado"
              style={styles.smallInput}
            />

            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={
                safeItem.valor_ajuste ?? ""
              }
              disabled={disabled}
              onChange={(event) => {
                const value =
                  event.target.value;

                handleFieldChange(
                  "valor_ajuste",
                  value === "" ? null : value
                );
              }}
              placeholder="Ajuste R$"
              aria-label="Valor do ajuste"
              style={styles.smallInput}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove?.()}
          disabled={disabled}
          style={{
            ...styles.removeButton,
            ...(disabled
              ? styles.disabledButton
              : {}),
          }}
          title="Remover item"
          aria-label={
            safeItem.texto
              ? `Remover item ${safeItem.texto}`
              : "Remover item"
          }
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div style={styles.viewRow}>
      <input
        type="checkbox"
        checked={safeItem.concluido}
        disabled={disabled}
        onChange={(event) =>
          onToggle?.(
            item,
            event.target.checked
          )
        }
        aria-label={
          safeItem.texto
            ? `Marcar ${safeItem.texto} como concluído`
            : "Marcar item como concluído"
        }
        style={styles.checkbox}
      />

      <div style={styles.viewContent}>
        <span
          style={{
            ...styles.viewText,
            ...(safeItem.concluido
              ? styles.completedText
              : {}),
          }}
        >
          {safeItem.texto ||
            "Item sem descrição"}
        </span>

        {safeItem.observacao ? (
          <span style={styles.observation}>
            {safeItem.observacao}
          </span>
        ) : null}

        {formattedValue ? (
          <span style={styles.value}>
            Ajuste: {formattedValue}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function formatCurrency(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  return numericValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const styles = {
  editorRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 0",
    borderBottom:
      "1px solid var(--kc-border, #ece7e2)",
  },

  editorFields: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },

  inlineFields: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
    gap: 8,
  },

  checkbox: {
    flexShrink: 0,
    marginTop: 4,
    cursor: "pointer",
    accentColor:
      "var(--kc-primary, #DF5E78)",
  },

  input: {
    width: "100%",
    minWidth: 0,
    border:
      "1px solid var(--kc-border, #d8d0c8)",
    borderRadius: 8,
    padding: "9px 10px",
    fontSize: 14,
    boxSizing: "border-box",
    background:
      "var(--kc-panel, #ffffff)",
    color:
      "var(--kc-text, #243746)",
  },

  secondaryInput: {
    width: "100%",
    minWidth: 0,
    border:
      "1px solid var(--kc-border, #e2dcd6)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    boxSizing: "border-box",
    background:
      "var(--kc-panel, #ffffff)",
    color:
      "var(--kc-text, #243746)",
  },

  smallInput: {
    width: "100%",
    minWidth: 0,
    border:
      "1px solid var(--kc-border, #e2dcd6)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    boxSizing: "border-box",
    background:
      "var(--kc-panel, #ffffff)",
    color:
      "var(--kc-text, #243746)",
  },

  removeButton: {
    flexShrink: 0,
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #fecaca",
    borderRadius: 7,
    background: "#fff1f2",
    color: "#b91c1c",
    fontSize: 25,
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
  },

  viewRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    padding: "6px 0",
    color:
      "var(--kc-text, #243746)",
  },

  viewContent: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  viewText: {
    fontSize: 14,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
    color:
      "var(--kc-text, #243746)",
  },

  completedText: {
    textDecoration: "line-through",
    opacity: 0.55,
  },

  observation: {
    fontSize: 12,
    lineHeight: 1.35,
    opacity: 0.7,
    overflowWrap: "anywhere",
    color:
      "var(--kc-text-muted, #64748b)",
  },

  value: {
    fontSize: 12,
    fontWeight: 600,
    color:
      "var(--kc-text-muted, #64748b)",
  },

  disabledButton: {
    cursor: "not-allowed",
    opacity: 0.55,
  },
};
