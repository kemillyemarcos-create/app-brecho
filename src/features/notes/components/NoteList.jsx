import NoteItem from "./NoteItem.jsx";

export default function NoteList({
  items = [],
  editable = false,
  disabled = false,
  onToggleItem,
  onChangeItem,
  onRemoveItem,
}) {
  const safeItems = Array.isArray(items)
    ? items
    : [];

  if (safeItems.length === 0) {
    return (
      <p style={styles.empty}>
        {editable
          ? "Nenhum item adicionado."
          : "Nenhum item nesta nota."}
      </p>
    );
  }

  return (
    <div style={styles.list}>
      {safeItems.map((item, index) => (
        <NoteItem
          key={
            item?.id ??
            `item-${index}`
          }
          item={item}
          editable={editable}
          disabled={disabled}
          onToggle={onToggleItem}
          onChange={(updatedItem) =>
            onChangeItem?.(
              index,
              updatedItem
            )
          }
          onRemove={() =>
            onRemoveItem?.(index)
          }
        />
      ))}
    </div>
  );
}

const styles = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  empty: {
    margin: 0,
    padding: "10px 0",
    fontSize: 13,
    opacity: 0.6,
  },
};