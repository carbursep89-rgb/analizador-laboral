"use client";

export default function KPI({ label, value, sub, color = "#60a5fa", bg = "#0f2744", icon }) {
  return (
    <div style={{
      background: bg, borderRadius: 12, padding: "18px 20px",
      border: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 4,
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    }}>
      <div style={{ fontSize: 22, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
