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
  const sidebarStyle = {
    width: isMobile ? "100%" : 246,
    minWidth: isMobile ? 0 : 246,
    maxHeight: isMobile
      ? "none"
      : "calc(100vh - 32px)",
    position: isMobile ? "relative" : "sticky",
    top: isMobile ? "auto" : 16,
    alignSelf: "start",
    overflowY: "auto",
    boxSizing: "border-box",

    display: isMobile
      ? menuMobileAberto
        ? "flex"
        : "none"
      : "flex",
    flexDirection: "column",
    gap: 12,

    padding: isMobile
      ? "16px 14px 18px"
      : "16px 13px 18px",

    borderRadius: isMobile ? 20 : 24,
    border: `1px solid ${cores.borda}`,
    background: cores.fundoPainel,
    boxShadow: cores.sombraLeve,
  };

  const brandBlock = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  };

  const logoWrap = {
    width: isMobile ? 150 : 135,
    height: isMobile ? 95 : 85,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    overflow: "hidden",
    background: "transparent",
    border: "none",

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
    minHeight: 44,

    display: "grid",
    gridTemplateColumns:
      "19px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 9,

    padding: "9px 10px",
    borderRadius: 13,
    border:
      abaAtiva === "assistente"
        ? `1px solid ${cores.rosaPrincipal}`
        : `1px solid ${cores.borda}`,

    background:
      abaAtiva === "assistente"
        ? cores.rosaPrincipal
        : "linear-gradient(135deg, #fff7f9 0%, #ffffff 100%)",

    color:
      abaAtiva === "assistente"
        ? "#fff"
        : cores.rosaPrincipal,

    textAlign: "left",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,

    boxShadow:
      abaAtiva === "assistente"
        ? "0 8px 18px rgba(143,39,69,0.15)"
        : "0 4px 12px rgba(15,23,42,0.04)",

    transition:
      "background-color 160ms ease, color 160ms ease, transform 160ms ease",
  };

  const assistantBadge = {
    justifySelf: "end",
    padding: "4px 6px",
    borderRadius: 999,
    border:
      abaAtiva === "assistente"
        ? "1px solid rgba(255,255,255,0.25)"
        : `1px solid ${cores.borda}`,

    background:
      abaAtiva === "assistente"
        ? "rgba(255,255,255,0.18)"
        : cores.rosaClaro,

    color:
      abaAtiva === "assistente"
        ? "#fff"
        : cores.rosaPrincipal,

    fontSize: 9,
    fontWeight: 900,
    letterSpacing: "0.05em",
    lineHeight: 1,
  };

  const divider = {
    width: "100%",
    height: 1,
    margin: "2px 0 0",
    border: "none",
    background: cores.borda,
  };

  const menuList = {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  };

  const menuButton = (active) => ({
    width: "100%",
    minHeight: isMobile ? 46 : 40,

    display: "grid",
    gridTemplateColumns:
      "19px minmax(0, 1fr)",
    alignItems: "center",
    gap: 10,

    padding: isMobile
      ? "10px 11px"
      : "8px 10px",

    borderRadius: 11,
    border: "1px solid transparent",

    background: active
      ? cores.rosaClaro
      : "transparent",

    boxShadow: active
      ? `inset 3px 0 0 ${cores.rosaPrincipal}`
      : "none",

    color: active
      ? cores.rosaPrincipal
      : cores.textoSuave,

    textAlign: "left",
    cursor: "pointer",
    fontSize: isMobile ? 15 : 13.5,
    fontWeight: active ? 800 : 650,

    transition:
      "background-color 160ms ease, color 160ms ease, transform 160ms ease",
  });

  const menuLabel = {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const footer = {
    display: "grid",
    gap: 8,
    marginTop: "auto",
    paddingTop: 6,
  };

  const logoutButton = {
    ...menuButton(false),
    color: "#b91c1c",
    border:
      "1px solid rgba(185,28,28,0.14)",
  };

  const userText = {
    padding: "0 4px",
    color: cores.textoSuave,
    fontSize: 11,
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

          <span style={menuLabel}>
            Assistente Virtual
          </span>

          <span style={assistantBadge}>
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
                    cores.rosaHover;
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

              <span style={menuLabel}>
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

          <span>Sair</span>
        </button>

        <div style={userText}>
          {carregando
            ? "Carregando dados..."
            : `${usuarioSistema?.apelido ||
            usuarioSistema?.nome ||
            session?.user?.email ||
            "admin"
            } • ${usuarioSistema?.perfil ||
            "ADMIN"
            }`}
        </div>
      </div>
    </aside>
  );
}