import {
  Sparkles,
  X,
} from "lucide-react";

export default function SidebarERP({
  isMobile = false,
  menuMobileAberto = false,
  abaAtiva,
  menuVisivel = [],
  trocarAba,
  sairDoApp,
  carregando = false,
  usuarioSistema,
  session,
  logoKchic,
  cores,
}) {
  const corPrimaria =
    cores?.rosaPrincipal ||
    "var(--kc-primary, #DF5E78)";

  const corSuave =
    cores?.rosaClaro ||
    "var(--kc-soft, #FAE3E8)";

  const corHover =
    cores?.rosaHover ||
    "var(--kc-soft, #FAE3E8)";

  const corBorda =
    cores?.borda ||
    "var(--kc-border, #F2E3E8)";

  const corPainel =
    cores?.fundoPainel ||
    "var(--kc-panel, #FFFFFF)";

  const corTexto =
    cores?.texto ||
    "var(--kc-text, #2F2F35)";

  const corTextoSuave =
    cores?.textoSuave ||
    "var(--kc-text-muted, #8D727B)";

  const sombra =
    cores?.sombraLeve ||
    "var(--kc-shadow, 0 8px 24px rgba(15,23,42,0.06))";

  const sidebarStyle = {
    width: isMobile
      ? "100%"
      : 246,

    minWidth: isMobile
      ? 0
      : 246,

    maxHeight: isMobile
      ? "none"
      : "calc(100vh - 32px)",

    position: isMobile
      ? "relative"
      : "sticky",

    top: isMobile
      ? "auto"
      : 16,

    alignSelf: "start",
    overflowY: "auto",
    overflowX: "hidden",
    boxSizing: "border-box",

    display: isMobile
      ? menuMobileAberto
        ? "flex"
        : "none"
      : "flex",

    flexDirection: "column",

    gap:
      "calc(12px * var(--kc-density, 1))",

    padding: isMobile
      ? "calc(16px * var(--kc-density, 1)) calc(14px * var(--kc-density, 1)) calc(18px * var(--kc-density, 1))"
      : "calc(16px * var(--kc-density, 1)) calc(13px * var(--kc-density, 1)) calc(18px * var(--kc-density, 1))",

    borderRadius:
      "var(--kc-radius-xl, 20px)",

    border:
      `1px solid ${corBorda}`,

    background:
      "var(--kc-sidebar-background, var(--kc-panel, #FFFFFF))",

    color:
      "var(--kc-sidebar-text, var(--kc-text-muted, #8D727B))",

    boxShadow:
      sombra,

    transition:
      "width 180ms ease, min-width 180ms ease, padding 180ms ease, border-radius 180ms ease, background-color 180ms ease",
  };

  const brandBlock = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",

    gap:
      "calc(12px * var(--kc-density, 1))",
  };

  const logoWrap = {
    width: isMobile
      ? 150
      : 135,

    height: isMobile
      ? 95
      : 85,

    minHeight: isMobile
      ? 95
      : 62,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    overflow: "hidden",

    background: "transparent",
    border: "none",

    transition:
      "width 180ms ease, height 180ms ease",
  };

  const logoStyle = {
    width: "175%",
    height: "175%",

    objectFit: "cover",
    objectPosition: "center",

    mixBlendMode: "multiply",
    filter: "contrast(1.03)",
  };

  const assistantButton = {
    width: "100%",

    minHeight:
      "var(--kc-control-height, 42px)",

    display: "grid",

    gridTemplateColumns:
      "19px minmax(0, 1fr) auto",

    alignItems: "center",

    gap:
      "calc(9px * var(--kc-density, 1))",

    padding:
      "calc(9px * var(--kc-density, 1)) calc(10px * var(--kc-density, 1))",

    borderRadius:
      "var(--kc-radius-md, 12px)",

    border:
      "1px solid var(--kc-sidebar-border, var(--kc-border, #F2E3E8))",

    background:
      abaAtiva === "assistente"
        ? "var(--kc-sidebar-active-bg, var(--kc-soft, #FAE3E8))"
        : "transparent",

    color:
      abaAtiva === "assistente"
        ? "var(--kc-sidebar-active-text, var(--kc-primary, #DF5E78))"
        : "var(--kc-sidebar-text, var(--kc-text-muted, #8D727B))",

    textAlign: "left",
    cursor: "pointer",

    fontSize:
      "calc(13px * var(--kc-font-scale, 1))",

    fontWeight: 800,

    boxShadow:
      abaAtiva === "assistente"
        ? "0 8px 18px rgba(15,23,42,0.10)"
        : "0 4px 12px rgba(15,23,42,0.04)",

    transition:
      "background-color 160ms ease, color 160ms ease, transform 160ms ease, border-color 160ms ease",
  };

  const assistantBadge = {
    justifySelf: "end",

    padding:
      "calc(4px * var(--kc-density, 1)) calc(6px * var(--kc-density, 1))",

    borderRadius: 999,

    border:
      abaAtiva === "assistente"
        ? "1px solid rgba(255,255,255,0.25)"
        : `1px solid ${corBorda}`,

    background:
      abaAtiva === "assistente"
        ? "rgba(255,255,255,0.18)"
        : corSuave,

    color:
      abaAtiva === "assistente"
        ? "#ffffff"
        : corPrimaria,

    fontSize:
      "calc(9px * var(--kc-font-scale, 1))",

    fontWeight: 900,
    letterSpacing: "0.05em",
    lineHeight: 1,
  };

  const divider = {
    width: "100%",
    height: 1,

    margin:
      "calc(2px * var(--kc-density, 1)) 0 0",

    border: "none",

    background:
      "var(--kc-sidebar-border, var(--kc-border, #F2E3E8))",
  };

  const menuList = {
    display: "flex",
    flexDirection: "column",

    gap:
      "calc(2px * var(--kc-density, 1))",
  };

  const menuButton = (active) => ({
    width: "100%",

    minHeight: isMobile
      ? 46
      : "var(--kc-control-height, 42px)",

    display: "grid",

    gridTemplateColumns:
      "19px minmax(0, 1fr)",

    alignItems: "center",

    gap:
      "calc(10px * var(--kc-density, 1))",

    padding: isMobile
      ? "calc(10px * var(--kc-density, 1)) calc(11px * var(--kc-density, 1))"
      : "calc(8px * var(--kc-density, 1)) calc(10px * var(--kc-density, 1))",

    borderRadius:
      "var(--kc-radius-md, 12px)",

    border:
      "1px solid transparent",

    background:
      active
        ? "var(--kc-sidebar-active-bg, var(--kc-soft, #FAE3E8))"
        : "transparent",

    boxShadow:
      active
        ? "inset 3px 0 0 var(--kc-sidebar-active-text, var(--kc-primary, #DF5E78))"
        : "none",

    color:
      active
        ? "var(--kc-sidebar-active-text, var(--kc-primary, #DF5E78))"
        : "var(--kc-sidebar-text, var(--kc-text-muted, #8D727B))",

    textAlign: "left",
    cursor: "pointer",

    fontSize: isMobile
      ? "calc(15px * var(--kc-font-scale, 1))"
      : "calc(13.5px * var(--kc-font-scale, 1))",

    fontWeight:
      active ? 800 : 650,

    transition:
      "background-color 160ms ease, color 160ms ease, transform 160ms ease, border-radius 180ms ease",
  });

  const menuLabel = {
    minWidth: 0,

    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const footer = {
    display: "grid",

    gap:
      "calc(8px * var(--kc-density, 1))",

    marginTop: "auto",

    paddingTop:
      "calc(6px * var(--kc-density, 1))",
  };

  const logoutButton = {
    ...menuButton(false),

    color: "#b91c1c",

    border:
      "1px solid rgba(185,28,28,0.14)",
  };

  const userText = {
    padding:
      "0 calc(4px * var(--kc-density, 1))",

    color:
      "var(--kc-sidebar-text, var(--kc-text-muted, #8D727B))",

    fontSize:
      "calc(11px * var(--kc-font-scale, 1))",

    lineHeight: 1.35,

    overflowWrap: "anywhere",
  };

  return (
    <aside
      className="sidebar-app"
      style={sidebarStyle}
      aria-label="Menu principal do ERP"
    >
      <div style={brandBlock}>
        <div style={logoWrap}>
          <img
            src={logoKchic}
            alt="K.Chic"
            style={logoStyle}
          />
        </div>

        <button
          type="button"
          style={assistantButton}
          onClick={() =>
            trocarAba("assistente")
          }
          aria-current={
            abaAtiva === "assistente"
              ? "page"
              : undefined
          }
        >
          <Sparkles
            size={18}
            strokeWidth={2.2}
            aria-hidden="true"
          />

          <span
            className="sidebar-menu-label"
            style={menuLabel}
          >
            Assistente Virtual
          </span>

          <span
            className="sidebar-assistant-badge"
            style={assistantBadge}
          >
            NOVO
          </span>
        </button>

        <hr style={divider} />
      </div>

      <nav
        className="menu-lista"
        style={menuList}
        aria-label="Áreas do sistema"
      >
        {menuVisivel.map((item) => {
          const Icon = item.icon;
          const active =
            abaAtiva === item.id;

          return (
            <button
              key={item.id}
              type="button"
              style={menuButton(active)}
              aria-current={
                active ? "page" : undefined
              }
              onClick={() =>
                trocarAba(item.id)
              }
              onMouseEnter={(event) => {
                if (!active) {
                  event.currentTarget.style.background =
                    "var(--kc-sidebar-active-bg, var(--kc-soft, #FAE3E8))";
                }
              }}
              onMouseLeave={(event) => {
                if (!active) {
                  event.currentTarget.style.background =
                    "transparent";
                }
              }}
            >
              <Icon
                size={isMobile ? 20 : 18}
                strokeWidth={
                  active ? 2.2 : 2
                }
                aria-hidden="true"
              />

              <span
                className="sidebar-menu-label"
                style={menuLabel}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div style={footer}>
        <button
          type="button"
          onClick={sairDoApp}
          style={logoutButton}
        >
          <X
            size={18}
            strokeWidth={2}
            aria-hidden="true"
          />

          <span className="sidebar-menu-label">
            Sair
          </span>
        </button>

        <div
          className="sidebar-user-text"
          style={userText}
        >
          {carregando
            ? "Carregando dados..."
            : `${
                usuarioSistema?.apelido ||
                usuarioSistema?.nome ||
                session?.user?.email ||
                "admin"
              } • ${
                usuarioSistema?.perfil ||
                "ADMIN"
              }`}
        </div>
      </div>
    </aside>
  );
}
