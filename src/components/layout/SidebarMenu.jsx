import {
  Home,
  FileText,
  CalendarDays,
  BarChart3,
  Share2,
  Heart,
  Users,
  Mail,
  FileBarChart2,
  Settings,
} from "lucide-react";

import logoKchic from "../../assets/logo-kchic.png";

const ITENS_MENU = [
  {
    id: "visao-geral",
    label: "Visão Geral",
    icon: Home,
  },
  {
    id: "publicacoes",
    label: "Publicações",
    icon: FileText,
  },
  {
    id: "calendario",
    label: "Calendário",
    icon: CalendarDays,
  },
  {
    id: "desempenho",
    label: "Desempenho",
    icon: BarChart3,
  },
  {
    id: "redes-sociais",
    label: "Redes Sociais",
    icon: Share2,
  },
  {
    id: "engajamento",
    label: "Engajamento",
    icon: Heart,
  },
  {
    id: "seguidores",
    label: "Seguidores",
    icon: Users,
  },
  {
    id: "mensagens",
    label: "Mensagens",
    icon: Mail,
    badge: 12,
  },
  {
    id: "relatorios",
    label: "Relatórios",
    icon: FileBarChart2,
  },
  {
    id: "configuracoes",
    label: "Configurações",
    icon: Settings,
  },
];

export default function SidebarMenu({
  abaAtiva,
  setAbaAtiva,
  isMobile,
  menuMobileAberto,
  setMenuMobileAberto,
}) {
  const sidebarStyle = {
    width: isMobile ? 286 : 248,
    minWidth: isMobile ? 286 : 248,
    height: "100%",
    overflowY: "auto",
    boxSizing: "border-box",

    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",

    padding: isMobile
      ? "18px 16px 22px"
      : "18px 14px 20px",

    background: "#ffffff",
    borderRight: "1px solid #f1dfe4",

    boxShadow: isMobile
      ? "8px 0 30px rgba(15, 23, 42, 0.12)"
      : "none",
  };

  const blocoMarca = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: isMobile ? 10 : 8,
    padding: isMobile
      ? "2px 4px 14px"
      : "2px 4px 12px",
  };

  const logoWrap = {
    width: isMobile ? 112 : 96,
    height: isMobile ? 112 : 96,
    flexShrink: 0,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    overflow: "hidden",
    borderRadius: isMobile ? 20 : 18,
    border: "1px solid #f4dde3",
    background: "#fff8fa",
  };

  const pillPainel = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",

    padding: isMobile
      ? "8px 13px"
      : "7px 12px",

    borderRadius: 999,
    background: "#f8e9ed",
    color: "#c85a73",

    fontWeight: 700,
    fontSize: isMobile ? 15 : 13,
    lineHeight: 1,
  };

  const textoPainel = {
    margin: 0,
    maxWidth: "100%",

    color: "#7d6670",
    fontSize: isMobile ? 14 : 12.5,
    lineHeight: 1.4,
  };

  const linha = {
    width: "100%",
    height: 1,
    margin: "2px 0 10px",

    border: "none",
    background: "#f1dfe4",
  };

  const navStyle = {
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? 4 : 2,
  };

  const botaoMenu = (ativo) => ({
    position: "relative",

    width: "100%",
    minHeight: isMobile ? 48 : 42,

    display: "grid",
    gridTemplateColumns: "20px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: isMobile ? 12 : 10,

    padding: isMobile
      ? "11px 13px"
      : "9px 12px",

    border: "none",
    borderRadius: isMobile ? 15 : 12,

    background: ativo
      ? "#fae8ec"
      : "transparent",

    boxShadow: ativo
      ? "inset 3px 0 0 #e15b78"
      : "none",

    color: ativo
      ? "#c85a73"
      : "#806d75",

    fontWeight: ativo ? 700 : 600,
    fontSize: isMobile ? 16 : 14,
    lineHeight: 1.2,

    textAlign: "left",
    cursor: "pointer",

    transition:
      "background-color 160ms ease, color 160ms ease, transform 160ms ease",
  });

  const labelStyle = {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const badgeStyle = {
    minWidth: 22,
    height: 22,
    padding: "0 7px",

    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",

    borderRadius: 999,
    background: "#ef6a83",
    color: "#ffffff",

    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1,
  };

  const badgePlaceholder = {
    width: 0,
    height: 0,
  };

  return (
    <aside
      style={sidebarStyle}
      aria-label="Menu lateral"
    >
      <div style={blocoMarca}>
        <div style={logoWrap}>
          <img
            src={logoKchic}
            alt="Logo K.Chic"
            style={{
              width: "76%",
              height: "76%",
              objectFit: "contain",
            }}
          />
        </div>

        <div style={pillPainel}>
          Painel de gestão
        </div>

        <p style={textoPainel}>
          Acompanhe publicações, desempenho,
          calendário e crescimento das redes.
        </p>
      </div>

      <hr style={linha} />

      <nav style={navStyle}>
        {ITENS_MENU.map((item) => {
          const Icone = item.icon;
          const ativo = abaAtiva === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-current={
                ativo ? "page" : undefined
              }
              style={botaoMenu(ativo)}
              onClick={() => {
                setAbaAtiva(item.id);

                if (isMobile) {
                  setMenuMobileAberto(false);
                }
              }}
            >
              <Icone
                size={isMobile ? 20 : 18}
                strokeWidth={ativo ? 2.2 : 2}
                aria-hidden="true"
              />

              <span style={labelStyle}>
                {item.label}
              </span>

              {item.badge ? (
                <span style={badgeStyle}>
                  {item.badge}
                </span>
              ) : (
                <span
                  style={badgePlaceholder}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
