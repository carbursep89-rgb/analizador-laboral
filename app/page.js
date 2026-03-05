"use client";

import { useState, useCallback, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Badge from "@/components/Badge";
import KPI from "@/components/KPI";
import { exportarExcel } from "@/lib/exportar";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const PROMPT_SISTEMA = `Eres un experto en gestión de recursos humanos y cumplimiento laboral en Chile, especializado en contratos de obra y subcontratación bajo la Ley 20.123.
Analiza el documento adjunto y extrae en texto plano todos los datos que encuentres:
- Nombres completos y RUTs de trabajadores
- Estado de cotizaciones (AFP, salud, mutual, caja compensación, seguro social)
- Períodos, montos, instituciones
- Finiquitos, causales de término, fechas
- Cualquier dato laboral relevante
Sé exhaustivo. Responde solo con el texto extraído, sin JSON.`;

const PROMPT_FINAL = `Eres un experto en cumplimiento laboral en Chile (Ley 20.123).
Con base en los datos extraídos, genera un JSON con este formato EXACTO (sin texto adicional):
{
  "empresa": { "razon_social": "", "rut": "", "obra": "", "periodo": "", "empresa_principal": "" },
  "resumen": {
    "total_trabajadores": 0, "liquidaciones_ok": 0, "afp_ok": 0, "afp_alerta": 0,
    "salud_ok": 0, "mutual_ok": 0, "caja_comp_ok": 0, "seg_social_ok": 0,
    "finiquitos_firmados": 0, "finiquitos_notificados": 0, "finiquitos_pendientes": 0, "fecha_pago_previred": ""
  },
  "trabajadores": [{
    "numero": 1, "rut": "", "nombre": "", "cargo": "", "estado": "Activo|Término período",
    "liquidacion": "ok|ausente|sin_firma",
    "afp": { "institucion": "", "estado": "ok|alerta|ausente" },
    "salud": { "institucion": "", "estado": "ok|ausente" },
    "mutual": "ok|ausente", "caja_comp": "ok|ausente", "seg_social": "ok|ausente",
    "finiquito": "N/A|firmado|notificado|pendiente", "causal_termino": "", "observaciones": ""
  }],
  "desvinculados": [{
    "numero": 1, "rut": "", "nombre": "", "ultima_nomina": "",
    "estado_finiquito": "firmado|notificado|pendiente", "tipo_documento": "", "causal": ""
  }],
  "alertas": [{ "nivel": "critico|atencion|informativo", "mensaje": "" }]
}
Reglas: cruza por RUT, AFP N/A = alerta, sin notaria = alerta atencion, Previred = ok, carta DT = finiquito. Solo JSON.`;

function Pill({ children, color = "#3b82f6" }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: color + "22", color, border: `1px solid ${color}44`, letterSpacing: "0.05em" }}>
      {children}
    </span>
  );
}

function BarraProgreso({ label, ok, total, alerta }) {
  const pct = total ? Math.round((ok / total) * 100) : 0;
  const color = pct === 100 ? "#22c55e" : pct >= 80 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "#cbd5e1" }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color }}>{ok}/{total} ({pct}%) {alerta ? `· ⚠ ${alerta}` : ""}</span>
      </div>
      <div style={{ height: 6, background: "#0f172a", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function VistaUpload({ archivos, setArchivos, cargando, error, onAnalizar, progreso, apiKey, setApiKey }) {
  const inputRef = useRef();
  const [drag, setDrag] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleFiles = useCallback((files) => {
    const validos = Array.from(files).filter((f) => f.type === "application/pdf");
    setArchivos((prev) => {
      const nombres = new Set(prev.map((f) => f.name));
      return [...prev, ...validos.filter((f) => !nombres.has(f.name))];
    });
  }, [setArchivos]);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9" }}>Cargar Documentos</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Sube los PDFs del período. Se procesarán uno a uno automáticamente.</p>
      </div>

      {/* API Key input */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 16, border: "1px solid #334155", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          🔑 Anthropic API Key
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#e2e8f0", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none" }}
          />
          <button onClick={() => setShowKey(!showKey)} className="btn"
            style={{ background: "#334155", color: "#94a3b8", padding: "8px 12px" }}>
            {showKey ? "🙈" : "👁️"}
          </button>
        </div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>
          La key se usa solo en tu navegador y nunca se envía a nuestros servidores. Obtén una en console.anthropic.com
        </div>
      </div>

      <div
        className={`upload-zone${drag ? " over" : ""}`}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
        <div style={{ fontSize: 48, marginBottom: 14 }}>📄</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Arrastra los PDFs aquí o haz clic para seleccionar</div>
        <div style={{ fontSize: 13, color: "#475569" }}>Certificados Previred · Liquidaciones · Finiquitos · Cartas de término</div>
      </div>

      {archivos.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 10 }}>
            {archivos.length} archivo{archivos.length > 1 ? "s" : ""} seleccionado{archivos.length > 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {archivos.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: progreso.actual > i ? "#052e16" : cargando && progreso.actual === i ? "#0f2744" : "#1e293b",
                borderRadius: 8, padding: "10px 14px",
                border: `1px solid ${progreso.actual > i ? "#166534" : cargando && progreso.actual === i ? "#1e40af" : "#334155"}`,
                transition: "all 0.3s"
              }}>
                <span style={{ fontSize: 16 }}>{progreso.actual > i ? "✅" : cargando && progreso.actual === i ? "⟳" : "📄"}</span>
                <span style={{ fontSize: 12, color: "#e2e8f0", flex: 1, fontFamily: "'DM Mono', monospace" }}>{f.name}</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>{(f.size / 1024).toFixed(0)} KB</span>
                {!cargando && (
                  <button onClick={(e) => { e.stopPropagation(); setArchivos((p) => p.filter((_, j) => j !== i)); }}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
                )}
              </div>
            ))}
          </div>

          {cargando && progreso.total > 0 && (
            <div style={{ marginTop: 16, background: "#0f2744", borderRadius: 10, padding: 16, border: "1px solid #1e3a5f" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#93c5fd", fontWeight: 700 }}>{progreso.mensaje}</span>
                <span style={{ fontSize: 12, color: "#475569", fontFamily: "'DM Mono', monospace" }}>{progreso.actual}/{progreso.total}</span>
              </div>
              <div style={{ height: 6, background: "#0f172a", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round((progreso.actual / progreso.total) * 100)}%`, background: "#3b82f6", borderRadius: 3, transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}

          {!cargando && (
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <button className="btn" onClick={onAnalizar} disabled={!apiKey}
                style={{ background: apiKey ? "#2563eb" : "#1e293b", color: apiKey ? "#fff" : "#475569", border: apiKey ? "none" : "1px solid #334155" }}>
                🔍 Analizar con IA
              </button>
              <button className="btn" onClick={() => setArchivos([])}
                style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155" }}>Limpiar</button>
            </div>
          )}
          {!apiKey && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 8 }}>⚠ Ingresa tu API Key para poder analizar</div>}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 20, background: "#450a0a", border: "1px solid #991b1b", borderRadius: 8, padding: 14, color: "#fca5a5", fontSize: 13 }}>⚠ {error}</div>
      )}
    </div>
  );
}

function VistaDashboard({ resultado, onExportar, onIrUpload }) {
  if (!resultado) return (
    <div className="fade-in" style={{ textAlign: "center", paddingTop: 100 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📊</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0", marginBottom: 8 }}>Sin análisis activo</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>Carga los documentos del período para comenzar</div>
      <button className="btn" onClick={onIrUpload} style={{ background: "#2563eb", color: "#fff" }}>📂 Ir a Cargar Documentos</button>
    </div>
  );
  const r = resultado.resumen || {};
  const criticas = resultado.alertas?.filter((a) => a.nivel === "critico") || [];
  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>{resultado.empresa?.obra || "Análisis Laboral"}</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <Pill color="#3b82f6">{resultado.empresa?.razon_social}</Pill>
            <Pill color="#8b5cf6">{resultado.empresa?.periodo}</Pill>
            <Pill color="#10b981">{resultado.empresa?.empresa_principal}</Pill>
            {r.fecha_pago_previred && <Pill color="#f59e0b">Previred: {r.fecha_pago_previred}</Pill>}
          </div>
        </div>
        <button className="btn" onClick={onExportar} style={{ background: "#166534", color: "#dcfce7" }}>📥 Exportar Excel</button>
      </div>
      {criticas.length > 0 && (
        <div style={{ background: "#450a0a", border: "1px solid #991b1b", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <span>🔴</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fca5a5", marginBottom: 6 }}>{criticas.length} alerta{criticas.length > 1 ? "s" : ""} crítica{criticas.length > 1 ? "s" : ""}</div>
              {criticas.map((a, i) => <div key={i} style={{ fontSize: 12, color: "#fecaca", marginBottom: 2 }}>{a.mensaje}</div>)}
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KPI icon="👷" label="Trabajadores"   value={r.total_trabajadores || 0} bg="#0f2744" color="#60a5fa" />
        <KPI icon="📄" label="Liquidaciones"  value={`${r.liquidaciones_ok || 0}/${r.total_trabajadores || 0}`} bg="#052e16" color="#4ade80" />
        <KPI icon="🏦" label="AFP Pagadas"    value={`${r.afp_ok || 0}/${r.total_trabajadores || 0}`} bg="#052e16" color="#4ade80" sub={r.afp_alerta ? `⚠ ${r.afp_alerta} sin AFP` : ""} />
        <KPI icon="🏥" label="Salud"          value={`${r.salud_ok || 0}/${r.total_trabajadores || 0}`} bg="#052e16" color="#4ade80" />
        <KPI icon="🦺" label="Mutual"         value={`${r.mutual_ok || 0}/${r.total_trabajadores || 0}`} bg="#052e16" color="#4ade80" />
        <KPI icon="💼" label="C.Compensación" value={`${r.caja_comp_ok || 0}/${r.total_trabajadores || 0}`} bg="#052e16" color="#4ade80" />
        <KPI icon="✅" label="Finiq. Firmados" value={r.finiquitos_firmados || 0} bg="#0f2744" color="#60a5fa" />
        <KPI icon="⚠️" label="Pendientes"     value={r.finiquitos_pendientes || 0} bg={r.finiquitos_pendientes > 0 ? "#450a0a" : "#052e16"} color={r.finiquitos_pendientes > 0 ? "#f87171" : "#4ade80"} />
      </div>
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 22, border: "1px solid #334155" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 18 }}>Estado Cotizaciones Previsionales</div>
        <BarraProgreso label="AFP"                       ok={r.afp_ok}        total={r.total_trabajadores} alerta={r.afp_alerta} />
        <BarraProgreso label="Salud (Fonasa / Isapre)"   ok={r.salud_ok}      total={r.total_trabajadores} />
        <BarraProgreso label="Mutual de Seguridad CChC"  ok={r.mutual_ok}     total={r.total_trabajadores} />
        <BarraProgreso label="Caja de Compensación"      ok={r.caja_comp_ok}  total={r.total_trabajadores} />
        <BarraProgreso label="Seguro Social Previsional" ok={r.seg_social_ok} total={r.total_trabajadores} />
      </div>
    </div>
  );
}

function VistaTrabajadores({ resultado, onExportar }) {
  if (!resultado) return <div style={{ textAlign: "center", paddingTop: 80, color: "#475569" }}>Sin datos</div>;
  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Trabajadores</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{resultado.trabajadores?.length || 0} trabajadores en el período</p>
        </div>
        <button className="btn" onClick={onExportar} style={{ background: "#166534", color: "#dcfce7" }}>📥 Excel</button>
      </div>
      <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>{["#","RUT","Nombre","Cargo","Estado","Liquid.","AFP","Salud","Mutual","C.Comp","Seg.S","Finiquito","Obs."].map((h) => (
                <th key={h} style={{ background: "#1e293b", color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "10px 12px", borderBottom: "1px solid #334155", whiteSpace: "nowrap" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {resultado.trabajadores?.map((t, i) => (
                <tr key={i} className="table-row">
                  <td style={{ color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{t.numero}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{t.rut}</td>
                  <td style={{ fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap" }}>{t.nombre}</td>
                  <td style={{ color: "#94a3b8", fontSize: 11 }}>{t.cargo}</td>
                  <td><Pill color={t.estado === "Activo" ? "#10b981" : "#f59e0b"}>{t.estado}</Pill></td>
                  <td><Badge tipo={t.liquidacion} /></td>
                  <td><Badge tipo={t.afp?.estado} />{t.afp?.institucion && <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{t.afp.institucion}</div>}</td>
                  <td><Badge tipo={t.salud?.estado} />{t.salud?.institucion && <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{t.salud.institucion}</div>}</td>
                  <td><Badge tipo={t.mutual} /></td>
                  <td><Badge tipo={t.caja_comp} /></td>
                  <td><Badge tipo={t.seg_social} /></td>
                  <td><Badge tipo={t.finiquito} /></td>
                  <td style={{ fontSize: 10, color: "#f59e0b", maxWidth: 180, lineHeight: 1.4 }}>{t.observaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function VistaDesvinculados({ resultado }) {
  if (!resultado) return <div style={{ textAlign: "center", paddingTop: 80, color: "#475569" }}>Sin datos</div>;
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Trabajadores Desvinculados</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{resultado.desvinculados?.length || 0} trabajadores con término de contrato</p>
      </div>
      {!resultado.desvinculados?.length ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}><div style={{ fontSize: 32, marginBottom: 8 }}>✅</div><div style={{ color: "#4ade80", fontWeight: 700 }}>Sin desvinculados</div></div>
      ) : (
        <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", overflow: "hidden" }}>
          <table>
            <thead><tr>{["#","RUT","Nombre","Última Nómina","Estado Finiquito","Tipo Documento","Causal"].map((h) => (
              <th key={h} style={{ background: "#1e293b", color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "10px 12px", borderBottom: "1px solid #334155" }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {resultado.desvinculados.map((d, i) => (
                <tr key={i} className="table-row">
                  <td style={{ color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{d.numero}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#94a3b8" }}>{d.rut}</td>
                  <td style={{ fontWeight: 600, color: "#e2e8f0" }}>{d.nombre}</td>
                  <td style={{ color: "#94a3b8", fontSize: 11 }}>{d.ultima_nomina}</td>
                  <td><Badge tipo={d.estado_finiquito} /></td>
                  <td style={{ fontSize: 11, color: "#cbd5e1" }}>{d.tipo_documento}</td>
                  <td style={{ fontSize: 10, color: "#94a3b8", maxWidth: 200 }}>{d.causal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VistaAlertas({ resultado }) {
  if (!resultado) return <div style={{ textAlign: "center", paddingTop: 80, color: "#475569" }}>Sin datos</div>;
  const criticas = resultado.alertas?.filter((a) => a.nivel === "critico") || [];
  const atencion = resultado.alertas?.filter((a) => a.nivel === "atencion") || [];
  const info     = resultado.alertas?.filter((a) => a.nivel === "informativo") || [];
  const grupos = [
    { items: criticas, label: "Crítico",     color: "#fca5a5", bg: "#450a0a", border: "#7f1d1d", icon: "🔴" },
    { items: atencion, label: "Atención",    color: "#fde68a", bg: "#451a03", border: "#78350f", icon: "🟡" },
    { items: info,     label: "Informativo", color: "#93c5fd", bg: "#0f2744", border: "#1e3a5f", icon: "🔵" },
  ];
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Alertas</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{criticas.length} críticas · {atencion.length} atención · {info.length} informativas</p>
      </div>
      {!resultado.alertas?.length ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}><div style={{ fontSize: 40, marginBottom: 12 }}>✅</div><div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80" }}>Sin alertas</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {grupos.map(({ items, label, color, bg, border, icon }) => items.map((a, i) => (
            <div key={`${label}-${i}`} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 18px", display: "flex", gap: 12 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{a.mensaje}</div>
              </div>
            </div>
          )))}
        </div>
      )}
    </div>
  );
}

function VistaHistorial({ historial, onSeleccionar }) {
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Historial</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{historial.length} análisis en esta sesión</p>
      </div>
      {!historial.length ? <div style={{ textAlign: "center", paddingTop: 60, color: "#475569" }}>Sin historial</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {historial.map((h) => (
            <div key={h.id} onClick={() => onSeleccionar(h.data)}
              style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "16px 20px", cursor: "pointer", display: "flex", gap: 16, alignItems: "center", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#334155")}>
              <div style={{ fontSize: 28 }}>📊</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{h.obra}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{h.empresa} · {h.periodo}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa" }}>{h.trabajadores} trab.</div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{h.fecha}</div>
              </div>
              <span style={{ color: "#3b82f6", fontSize: 16 }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [archivos, setArchivos]   = useState([]);
  const [cargando, setCargando]   = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError]         = useState(null);
  const [vista, setVista]         = useState("upload");
  const [historial, setHistorial] = useState([]);
  const [progreso, setProgreso]   = useState({ actual: 0, total: 0, mensaje: "" });
  const [apiKey, setApiKey]       = useState("");

  const fileToBase64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = () => rej(new Error("Error leyendo archivo"));
      r.readAsDataURL(file);
    });

  const llamarClaude = async (system, messages, maxTokens = 3000) => {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    return data.content?.map((b) => b.text || "").join("") || "";
  };

  const analizar = async () => {
    if (!archivos.length || !apiKey) return;
    setCargando(true); setError(null);
    setProgreso({ actual: 0, total: archivos.length + 1, mensaje: "Iniciando análisis..." });

    try {
      let contextoAcumulado = "";

      for (let i = 0; i < archivos.length; i++) {
        const f = archivos[i];
        setProgreso({ actual: i, total: archivos.length + 1, mensaje: `Leyendo: ${f.name}` });
        const base64 = await fileToBase64(f);
        const texto = await llamarClaude(PROMPT_SISTEMA, [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            { type: "text", text: `Extrae todos los datos laborales de: ${f.name}` }
          ]
        }], 3000);
        contextoAcumulado += `\n\n=== ${f.name} ===\n${texto}`;
await new Promise(r => setTimeout(r, 8000));
      }

      setProgreso({ actual: archivos.length, total: archivos.length + 1, mensaje: "Generando resumen final..." });

      const jsonTexto = await llamarClaude(PROMPT_FINAL, [{
        role: "user",
        content: `Datos extraídos:\n${contextoAcumulado}\n\nGenera el JSON completo.`
      }], 8000);

      const clean = jsonTexto.replace(/```json|```/g, "").trim();
      const resultadoFinal = JSON.parse(clean);

      setResultado(resultadoFinal);
      setHistorial((prev) => [{
        id: Date.now(),
        fecha: new Date().toLocaleDateString("es-CL"),
        obra: resultadoFinal.empresa?.obra || "Sin nombre",
        periodo: resultadoFinal.empresa?.periodo || "",
        empresa: resultadoFinal.empresa?.razon_social || "",
        trabajadores: resultadoFinal.resumen?.total_trabajadores || 0,
        data: resultadoFinal,
      }, ...prev.slice(0, 9)]);

      setProgreso({ actual: archivos.length + 1, total: archivos.length + 1, mensaje: "¡Completado!" });
      setVista("dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const handleExportar = () => resultado && exportarExcel(resultado);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar activa={vista} onChange={setVista} resultado={resultado} />
      <main style={{ marginLeft: 220, flex: 1, padding: "36px 36px 48px", maxWidth: "calc(100vw - 220px)", minHeight: "100vh" }}>
        {vista === "upload"        && <VistaUpload archivos={archivos} setArchivos={setArchivos} cargando={cargando} error={error} onAnalizar={analizar} progreso={progreso} apiKey={apiKey} setApiKey={setApiKey} />}
        {vista === "dashboard"     && <VistaDashboard resultado={resultado} onExportar={handleExportar} onIrUpload={() => setVista("upload")} />}
        {vista === "trabajadores"  && <VistaTrabajadores resultado={resultado} onExportar={handleExportar} />}
        {vista === "desvinculados" && <VistaDesvinculados resultado={resultado} />}
        {vista === "alertas"       && <VistaAlertas resultado={resultado} />}
        {vista === "historial"     && <VistaHistorial historial={historial} onSeleccionar={(d) => { setResultado(d); setVista("dashboard"); }} />}
      </main>
    </div>
  );
}
