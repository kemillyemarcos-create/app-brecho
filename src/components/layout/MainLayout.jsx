export default function MainLayout({
  isMobile = false,
  header,
  sidebar,
  children,
  preview,
  floatingAction,
  cores,
}) {
  const layoutStyle = {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "minmax(0, 1fr)"
      : "246px minmax(0, 1fr)",
    gap: isMobile ? 8 : 14,
    padding: isMobile ? 8 : 16,
    background: cores.fundoApp,
    boxSizing: "border-box",
  };

  const mainStyle = {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  };

  return (
    <>
      {header}

      <div
        className="layout-app"
        style={layoutStyle}
      >
        {sidebar}

        <main
          className="area-principal"
          style={mainStyle}
        >
          {children}
        </main>

        {preview}
      </div>

      {floatingAction}
    </>
  );
}
