"use client";

const navItems = [
  { id: "upload",        label: "Cargar Docs",    icon: "📂" },
  { id: "dashboard",     label: "Dashboard",      icon: "📊" },
  { id: "trabajadores",  label: "Trabajadores",   icon: "👷" },
  { id: "desvinculados", label: "Desvinculados",  icon: "📋" },
  { id: "alertas",       label: "Alertas",        icon: "🔔" },
  { id: "historial",     label: "Historial",      icon: "🕒" },
];

export default function Sidebar({ activa, onChange, resultado }) {
  return (
    <aside style={{
      width: 220, background: "#0a1628", borderRight: "1px solid #1e293b",
      padding: "24px 12px", display: "flex", flexDirection: "column",
      gap: 4, position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: "0 8px 24px", borderBottom: "1px solid #1e293b", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#3b82f6", letterSpacing: "0.15em" }}>RLX</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.25, marginTop: 2 }}>
          Analizador<br />Laboral
        </div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>Obras & Subcontratos</div>
      </div>

      {/* Nav */}
      {navItems.map((item) => (
        <button
          key={item.id}
          className="nav-btn"
          onClick={() => onChange(item.id)}
          style={{
            background: activa === item.id ? "#1e40af" : "transparent",
            color: activa === item.id ? "#fff" : "#94a3b8",
          }}
        >
          <span>{item.icon}</span>
          {item.label}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Análisis activo */}
      {resultado && (
        <div style={{
          padding: 12, background: "#0f2744", borderRadius: 8,
          border: "1px solid #1e3a5f",
        }}>
          <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Análisis activo
          </div>
          <div style={{ fontSize: 12, color: "#e2e8f0", marginTop: 4, fontWeight: 600, lineHeight: 1.3 }}>
            {resultado.empresa?.obra || "—"}
          </div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{resultado.empresa?.periodo}</div>
        </div>
      )}
    </aside>
  );
}
