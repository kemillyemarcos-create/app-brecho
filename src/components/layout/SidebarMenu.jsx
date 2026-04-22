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
  { id: "visao-geral", label: "Visão Geral", icon: Home },
  { id: "publicacoes", label: "Publicações", icon: FileText },
  { id: "calendario", label: "Calendário", icon: CalendarDays },
  { id: "desempenho", label: "Desempenho", icon: BarChart3 },
  { id: "redes-sociais", label: "Redes Sociais", icon: Share2 },
  { id: "engajamento", label: "Engajamento", icon: Heart },
  { id: "seguidores", label: "Seguidores", icon: Users },
  { id: "mensagens", label: "Mensagens", icon: Mail, badge: 12 },
  { id: "relatorios", label: "Relatórios", icon: FileBarChart2 },
  { id: "configuracoes", label: "Configurações", icon: Settings },
];

export default function SidebarMenu({
  abaAtiva,
  setAbaAtiva,
  isMobile,
  menuMobileAberto,
  setMenuMobileAberto,
}) {
  const sidebarStyle = {
    width: isMobile ? 290 : 280,
    minWidth: isMobile ? 290 : 280,
    background: "#fff",
    borderRight: "1px solid #f1dfe4",
    padding: isMobile ? "20px 16px" : "24px 18px",
    display: "grid",
    alignContent: "start",
    gap: 18,
    height: "100%",
    overflowY: "auto",
    boxShadow: isMobile ? "8px 0 30px rgba(15,23,42,0.12)" : "none",
  };

  const blocoMarca = {
    display: "grid",
    gap: 14,
    justifyItems: "start",
  };

  const logoWrap = {
    width: 150,
    height: 150,
    borderRadius: 24,
    background: "#fff8fa",
    border: "1px solid #f4dde3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const pillPainel = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 16px",
    borderRadius: 999,
    background: "#f8e9ed",
    color: "#c85a73",
    fontWeight: 700,
    fontSize: 16,
  };

  const textoPainel = {
    margin: 0,
    color: "#7d6670",
    fontSize: 16,
    lineHeight: 1.5,
    maxWidth: 220,
  };

  const linha = {
    height: 1,
    background: "#f1dfe4",
    border: "none",
    width: "100%",
    margin: "2px 0 0",
  };

  const navStyle = {
    display: "grid",
    gap: 6,
  };

  const botaoMenu = (ativo) => ({
    width: "100%",
    display: "grid",
    gridTemplateColumns: "20px 1fr auto",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    borderRadius: 18,
    border: "none",
    background: ativo ? "#fae3e8" : "transparent",
    color: ativo ? "#c85a73" : "#6c6c73",
    fontWeight: ativo ? 700 : 500,
    fontSize: 16,
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.18s ease",
  });

  const badgeStyle = {
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    background: "#ef6a83",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 7px",
  };

  return (
    <aside style={sidebarStyle}>
      <div style={blocoMarca}>
        <div style={logoWrap}>
          <img
            src={logoKchic}
            alt="Logo K.Chic"
            style={{
              width: "78%",
              height: "78%",
              objectFit: "contain",
            }}
          />
        </div>

        <div style={pillPainel}>Painel de gestão</div>

        <p style={textoPainel}>
          Aqui você acompanha publicações, desempenho, calendário e o crescimento
          das suas redes.
        </p>

        <hr style={linha} />
      </div>

      <nav style={navStyle}>
        {ITENS_MENU.map((item) => {
          const Icone = item.icon;
          const ativo = abaAtiva === item.id;

          return (
            <button
              key={item.id}
              type="button"
              style={botaoMenu(ativo)}
              onClick={() => {
                setAbaAtiva(item.id);
                if (isMobile) setMenuMobileAberto(false);
              }}
            >
              <Icone size={20} strokeWidth={2} />
              <span>{item.label}</span>
              {item.badge ? <span style={badgeStyle}>{item.badge}</span> : <span />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}