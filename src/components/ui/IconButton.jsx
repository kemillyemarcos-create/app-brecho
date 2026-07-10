export default function IconButton({
  icon,
  label,
  title,
  onClick,
  disabled = false,
  variant = "default",
  size = "md",
}) {
  const variants = {
    default: "#f8fafc",
    primary: "#8f2745",
    success: "#15803d",
    warning: "#b45309",
    danger: "#dc2626",
    dark: "#111827",
  };

  const isFilled = variant !== "default";

  const sizes = {
    sm: 34,
    md: 40,
    lg: 46,
  };

  return (
    <button
      type="button"
      title={title || label}
      aria-label={title || label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: sizes[size],
        height: sizes[size],
        borderRadius: 14,
        border: isFilled ? "none" : "1px solid #e2e8f0",
        background: variants[variant] || variants.default,
        color: isFilled ? "#fff" : "#334155",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        boxShadow: isFilled ? "0 8px 18px rgba(15,23,42,0.12)" : "none",
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  );
}