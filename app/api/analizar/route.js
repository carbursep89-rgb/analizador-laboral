// app/api/analizar/route.js
// Procesa archivos en lotes para evitar el límite de 4.5MB de Vercel

import { NextResponse } from "next/server";

export const maxDuration = 60;

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

Reglas:
1. Trabaja SIEMPRE con los datos exactos de los documentos. No inferas ni supongas.
2. Cruza por RUT para identificar trabajadores.
3. AFP N/A en liquidacion = estado alerta.
4. Finiquito sin ratificacion notarial = alerta atencion.
5. Cotizaciones con comprobante Previred = ok.
6. Carta Direccion del Trabajo = equivalente a finiquito.
7. Trabajadores con termino dentro del periodo = estado Termino periodo.
8. Responde UNICAMENTE con el JSON, sin texto antes ni despues.`;

export async function POST(request) {
  try {
    const { archivos } = await request.json();

    if (!archivos || archivos.length === 0) {
      return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 });
    }

    // Procesar en lotes de 2 archivos para no superar límites
    const LOTE = 2;
    let contextoAcumulado = "";
    let resultadoFinal = null;

    for (let i = 0; i < archivos.length; i += LOTE) {
      const lote = archivos.slice(i, i + LOTE);
      const esUltimo = i + LOTE >= archivos.length;

      const contentParts = lote.map((f) => ({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: f.base64 },
      }));

      const instruccion = esUltimo
        ? `Lote final. Contexto previo: ${contextoAcumulado || "ninguno"}. Analiza todo y entrega el JSON completo.`
        : `Lote ${Math.floor(i / LOTE) + 1}. Extrae datos clave en texto plano (trabajadores, RUTs, cotizaciones, finiquitos). NO generes JSON aún.`;

      contentParts.push({ type: "text", text: instruccion });

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: esUltimo ? 8000 : 3000,
          system: PROMPT_SISTEMA,
          messages: [{ role: "user", content: contentParts }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: "Error API Claude: " + err }, { status: 500 });
      }

      const data = await res.json();
      const texto = data.content?.map((b) => b.text || "").join("") || "";

      if (esUltimo) {
        const clean = texto.replace(/```json|```/g, "").trim();
        resultadoFinal = JSON.parse(clean);
      } else {
        contextoAcumulado += `\n\n--- Lote ${Math.floor(i / LOTE) + 1} ---\n${texto}`;
      }
    }

    return NextResponse.json({ resultado: resultadoFinal });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
