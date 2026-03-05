import { NextResponse } from "next/server";

export const maxDuration = 60;

const PROMPT_SISTEMA = `Eres un experto en gestión de recursos humanos y cumplimiento laboral en Chile, especializado en contratos de obra y subcontratación bajo la Ley 20.123.

Analiza el documento adjunto y extrae en texto plano todos los datos que encuentres:
- Nombres completos y RUTs de trabajadores
- Estado de cotizaciones (AFP, salud, mutual, caja compensación, seguro social)
- Períodos, montos, instituciones
- Finiquitos, causales de término, fechas
- Cualquier dato laboral relevante

Sé exhaustivo. Responde solo con el texto extraído, sin JSON.`;

const PROMPT_FINAL = `Eres un experto en cumplimiento laboral en Chile (Ley 20.123).

Con base en los datos extraídos de múltiples documentos laborales, genera un JSON con este formato EXACTO (sin texto adicional):

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

Reglas:
- Cruza por RUT para identificar trabajadores
- AFP N/A = estado alerta
- Finiquito sin notaria = alerta atencion
- Comprobante Previred = cotizacion ok
- Carta DT = equivalente a finiquito
- Responde SOLO con el JSON`;

export async function POST(request) {
  try {
    const { archivo, nombre, fase, contexto } = await request.json();

    // FASE 1: extraer datos de un archivo individual
    if (fase === "extraer") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          system: PROMPT_SISTEMA,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: archivo } },
              { type: "text", text: `Extrae todos los datos laborales de este documento: ${nombre}` }
            ]
          }]
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: 500 });
      }
      const data = await res.json();
      const texto = data.content?.map(b => b.text || "").join("") || "";
      return NextResponse.json({ texto });
    }

    // FASE 2: generar JSON final con todo el contexto acumulado
    if (fase === "consolidar") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          system: PROMPT_FINAL,
          messages: [{
            role: "user",
            content: `Datos extraídos de todos los documentos:\n\n${contexto}\n\nGenera el JSON de análisis completo.`
          }]
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: 500 });
      }
      const data = await res.json();
      const texto = data.content?.map(b => b.text || "").join("") || "";
      const clean = texto.replace(/```json|```/g, "").trim();
      const resultado = JSON.parse(clean);
      return NextResponse.json({ resultado });
    }

    return NextResponse.json({ error: "Fase no reconocida" }, { status: 400 });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
