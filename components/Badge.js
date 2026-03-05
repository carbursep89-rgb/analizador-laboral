"use client";

const config = {
  ok:         { label: "✓",            bg: "#dcfce7", color: "#166534", border: "#86efac" },
  alerta:     { label: "⚠ Verificar",  bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
  ausente:    { label: "✗ Ausente",    bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  sin_firma:  { label: "⚠ Sin firma",  bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
  no_verificado: { label: "? Sin doc", bg: "#1e1b4b", color: "#a5b4fc", border: "#4f46e5" },
  firmado:    { label: "✓ Firmado",    bg: "#dcfce7", color: "#166534", border: "#86efac" },
  notificado: { label: "✓ Notificado", bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  pendiente:  { label: "✗ Pendiente",  bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
};

export default function Badge({ tipo }) {
  const c = config[tipo] || config["N/A"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace",
    }}>
      {c.label}
    </span>
  );
}
