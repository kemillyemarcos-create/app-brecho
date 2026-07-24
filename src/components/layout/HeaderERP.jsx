import {
  Menu,
  X,
} from "lucide-react";

export default function HeaderERP({
  isMobile = false,
  abaAtiva,
  getTituloAba,
  menuMobileAberto,
  setMenuMobileAberto,
  cores,
}) {
  if (!isMobile) {
    return null;
  }

  const container = {
    position: "sticky",
    top: 8,
    zIndex: 1000,

    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 12,

    marginBottom: 8,
    padding: "10px 12px",

    borderRadius: 16,
    border: `1px solid ${cores.borda}`,
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(10px)",
    boxShadow: cores.sombraLeve,
  };

  const title = {
    display: "block",
    margin: 0,

    color: cores.rosaPrincipal,
    fontSize: 17,
    fontWeight: 800,
    lineHeight: 1.1,

    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const subtitle = {
    display: "block",
    marginTop: 3,
    color: cores.textoSuave,
    fontSize: 11.5,
    lineHeight: 1.2,
  };

  const button = {
    width: 44,
    height: 44,
    padding: 0,
    flexShrink: 0,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    border: "none",
    borderRadius: 12,
    background: cores.rosaPrincipal,
    color: "#fff",

    cursor: "pointer",
  };

  return (
    <header
      className="topo-mobile"
      style={container}
    >
      <div
        style={{
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <strong style={title}>
          {getTituloAba(abaAtiva)}
        </strong>

        <span style={subtitle}>
          Painel operacional do brechó
        </span>
      </div>

      <button
        type="button"
        onClick={() =>
          setMenuMobileAberto(
            (current) => !current
          )
        }
        style={button}
        aria-label={
          menuMobileAberto
            ? "Fechar menu"
            : "Abrir menu"
        }
        aria-expanded={menuMobileAberto}
      >
        {menuMobileAberto ? (
          <X size={21} />
        ) : (
          <Menu size={21} />
        )}
      </button>
    </header>
  );
}
