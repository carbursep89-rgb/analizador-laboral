// lib/exportar.js
// Genera un archivo Excel (.xlsx) con 3 hojas a partir del resultado del análisis

export async function exportarExcel(resultado) {
  const XLSX = (await import("xlsx")).default;

  const wb = XLSX.utils.book_new();

  // ── HOJA 1: Trabajadores ──────────────────────────────────────────────────
  const headsTrab = [
    "N°", "RUT", "Nombre", "Cargo", "Estado",
    "Liquidación", "AFP", "Inst. AFP", "Salud", "Inst. Salud",
    "Mutual", "C.Comp", "Seg.Social", "Finiquito", "Observaciones",
  ];

  const rowsTrab = resultado.trabajadores?.map((t) => [
    t.numero, t.rut, t.nombre, t.cargo, t.estado,
    t.liquidacion === "ok" ? "✓" : t.liquidacion === "ausente" ? "✗" : "⚠ Sin firma",
    t.afp?.estado === "ok" ? "✓" : t.afp?.estado === "alerta" ? "⚠ Verificar" : "✗",
    t.afp?.institucion || "",
    t.salud?.estado === "ok" ? "✓" : "✗",
    t.salud?.institucion || "",
    t.mutual === "ok" ? "✓" : "✗",
    t.caja_comp === "ok" ? "✓" : "✗",
    t.seg_social === "ok" ? "✓" : "✗",
    t.finiquito === "N/A" ? "N/A" : t.finiquito === "firmado" ? "✓ Firmado" : t.finiquito === "notificado" ? "✓ Notificado" : "✗ Pendiente",
    t.observaciones || "",
  ]) || [];

  const wsTrab = XLSX.utils.aoa_to_sheet([
    [`TRABAJADORES ENERO 2026 — ${resultado.empresa?.obra || ""}`],
    [`${resultado.empresa?.razon_social || ""} | ${resultado.empresa?.periodo || ""}`],
    [],
    headsTrab,
    ...rowsTrab,
  ]);

  wsTrab["!cols"] = [5, 14, 32, 20, 16, 12, 10, 14, 10, 14, 10, 10, 10, 16, 30].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsTrab, "Trabajadores");

  // ── HOJA 2: Desvinculados ─────────────────────────────────────────────────
  const headsDesv = ["N°", "RUT", "Nombre", "Última Nómina", "Estado Finiquito", "Tipo Documento", "Causal"];
  const rowsDesv = resultado.desvinculados?.map((d) => [
    d.numero, d.rut, d.nombre, d.ultima_nomina,
    d.estado_finiquito === "firmado" ? "✓ Firmado" : d.estado_finiquito === "notificado" ? "✓ Notificado" : "✗ Pendiente",
    d.tipo_documento || "",
    d.causal || "",
  ]) || [];

  const wsDesv = XLSX.utils.aoa_to_sheet([
    [`TRABAJADORES DESVINCULADOS — ${resultado.empresa?.obra || ""}`],
    [],
    headsDesv,
    ...rowsDesv,
  ]);
  wsDesv["!cols"] = [5, 14, 32, 14, 16, 26, 40].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsDesv, "Desvinculados");

  // ── HOJA 3: Resumen ejecutivo ─────────────────────────────────────────────
  const r = resultado.resumen || {};
  const wsRes = XLSX.utils.aoa_to_sheet([
    ["RESUMEN EJECUTIVO — ANÁLISIS LABORAL"],
    [`Obra: ${resultado.empresa?.obra || ""}`],
    [`Empresa: ${resultado.empresa?.razon_social || ""} | Período: ${resultado.empresa?.periodo || ""}`],
    [`Empresa principal: ${resultado.empresa?.empresa_principal || ""}`],
    [],
    ["NÓMINA", "", "", ""],
    ["Indicador", "Total", "Conformes", "Estado"],
    ["Total trabajadores", r.total_trabajadores, r.total_trabajadores, "✓ OK"],
    ["Liquidaciones de sueldo", r.total_trabajadores, r.liquidaciones_ok, r.liquidaciones_ok === r.total_trabajadores ? "✓ OK" : "⚠ Revisar"],
    ["Cotizaciones AFP", r.total_trabajadores, r.afp_ok, r.afp_alerta > 0 ? `⚠ ${r.afp_alerta} sin AFP declarada` : "✓ OK"],
    ["Cotizaciones Salud", r.total_trabajadores, r.salud_ok, r.salud_ok === r.total_trabajadores ? "✓ OK" : "⚠ Revisar"],
    ["Mutual de Seguridad", r.total_trabajadores, r.mutual_ok, r.mutual_ok === r.total_trabajadores ? "✓ OK" : "⚠ Revisar"],
    ["Caja de Compensación", r.total_trabajadores, r.caja_comp_ok, r.caja_comp_ok === r.total_trabajadores ? "✓ OK" : "⚠ Revisar"],
    ["Seguro Social", r.total_trabajadores, r.seg_social_ok, r.seg_social_ok === r.total_trabajadores ? "✓ OK" : "⚠ Revisar"],
    [],
    ["FINIQUITOS / TÉRMINOS", "", "", ""],
    ["Indicador", "Total", "Con documento", "Estado"],
    ["Finiquitos firmados (notaría)", r.finiquitos_firmados + r.finiquitos_notificados + r.finiquitos_pendientes, r.finiquitos_firmados, ""],
    ["Notificaciones Dirección del Trabajo", "", r.finiquitos_notificados, ""],
    ["Pendientes", "", r.finiquitos_pendientes, r.finiquitos_pendientes > 0 ? "🔴 CRÍTICO" : "✓ OK"],
    [],
    ["ALERTAS", "", "", ""],
    ...( resultado.alertas?.map((a) => [a.nivel.toUpperCase(), a.mensaje, "", ""]) || []),
  ]);
  wsRes["!cols"] = [40, 12, 14, 32].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsRes, "Resumen Ejecutivo");

  // Descargar
  XLSX.writeFile(wb, `Analisis_Laboral_${resultado.empresa?.periodo || "periodo"}.xlsx`);
}
