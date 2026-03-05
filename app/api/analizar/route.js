// app/api/analizar/route.js
// Esta ruta recibe los PDFs en base64 y los envía a Claude para análisis

import { NextResponse } from "next/server";

const PROMPT_SISTEMA = `Eres un experto en gestión de recursos humanos y cumplimiento laboral en Chile, especializado en contratos de obra y subcontratación bajo la Ley 20.123.

Analiza los documentos laborales adjuntos y entrega un JSON estructurado con el siguiente formato EXACTO (sin texto adicional, solo JSON válido):

{
  "empresa": {
    "razon_social": "",
    "rut": "",
    "obra": "",
    "periodo": "",
    "empresa_principal": ""
  },
  "resumen": {
    "total_trabajadores": 0,
    "liquidaciones_ok": 0,
    "afp_ok": 0,
    "afp_alerta": 0,
    "salud_ok": 0,
    "mutual_ok": 0,
    "caja_comp_ok": 0,
    "seg_social_ok": 0,
    "finiquitos_firmados": 0,
    "finiquitos_notificados": 0,
    "finiquitos_pendientes": 0,
    "fecha_pago_previred": ""
  },
  "trabajadores": [
    {
      "numero": 1,
      "rut": "",
      "nombre": "",
      "cargo": "",
      "estado": "Activo|Término período",
      "liquidacion": "ok|ausente|sin_firma",
      "afp": { "institucion": "", "estado": "ok|alerta|ausente" },
      "salud": { "institucion": "", "estado": "ok|ausente" },
      "mutual": "ok|ausente",
      "caja_comp": "ok|ausente",
      "seg_social": "ok|ausente",
      "finiquito": "N/A|firmado|notificado|pendiente",
      "causal_termino": "",
      "observaciones": ""
    }
  ],
  "desvinculados": [
    {
      "numero": 1,
      "rut": "",
      "nombre": "",
      "ultima_nomina": "",
      "estado_finiquito": "firmado|notificado|pendiente",
      "tipo_documento": "",
      "causal": ""
    }
  ],
  "alertas": [
    { "nivel": "critico|atencion|informativo", "mensaje": "" }
  ]
}

Reglas de análisis:
1. Trabaja SIEMPRE con los datos exactos de los documentos. No inferas ni supongas.
2. Cruza por RUT para identificar trabajadores (los nombres pueden variar en ortografía).
3. Compara nóminas de certificados período N-1 vs período N para detectar desvinculados y nuevos.
4. AFP "N/A" en liquidación → estado "alerta" (puede ser imponente SIP o exento, pero requiere verificación).
5. Finiquito sin ratificación notarial → agregar como observación y alerta nivel "atencion".
6. Cotizaciones respaldadas por comprobante Previred → estado "ok".
7. Carta de término ante Dirección del Trabajo es equivalente válido al finiquito.
8. Trabajadores con fecha de término dentro del período actual → estado "Término período".
9. Si falta algún documento esperado → agregar alerta nivel "atencion".
10. Responde ÚNICAMENTE con el JSON, sin texto antes ni después, sin bloques de código markdown.`;

export async function POST(request) {
  try {
    const { archivos } = await request.json();
    // archivos: [{ nombre, base64 }]

    if (!archivos || archivos.length === 0) {
      return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 });
    }

    // Construir contenido para Claude
    const contentParts = archivos.map((f) => ({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: f.base64,
      },
    }));

    contentParts.push({
      type: "text",
      text: "Analiza todos los documentos adjuntos y entrega el JSON solicitado con el análisis laboral completo.",
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: PROMPT_SISTEMA,
        messages: [{ role: "user", content: contentParts }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: "Error API Claude: " + err }, { status: 500 });
    }

    const data = await response.json();
    const texto = data.content?.map((b) => b.text || "").join("") || "";
    const clean = texto.replace(/```json|```/g, "").trim();
    const resultado = JSON.parse(clean);

    return NextResponse.json({ resultado });
  } catch (error) {
    console.error("Error en /api/analizar:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
