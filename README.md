# 🏗️ Analizador Laboral — Obras & Subcontratos

Aplicación web para análisis automático de documentación laboral de obras de construcción bajo la Ley 20.123 (Chile). Usa inteligencia artificial (Claude de Anthropic) para procesar PDFs y generar un resumen ejecutivo con el estado de cumplimiento de cada trabajador.

---

## ✨ Funcionalidades

- 📂 **Carga de PDFs** — arrastra certificados Previred, liquidaciones, finiquitos y cartas de término
- 🤖 **Análisis con IA** — Claude procesa todos los documentos y cruza la información automáticamente
- 📊 **Dashboard visual** — KPIs, barras de progreso y alertas por colores
- 👷 **Tabla de trabajadores** — estado de cotizaciones y finiquito por cada persona
- 📋 **Tabla de desvinculados** — estado de finiquitos de trabajadores que salieron
- 🔔 **Alertas clasificadas** — crítico / atención / informativo
- 📥 **Exportar Excel** — reporte con 3 hojas descargable
- 🕒 **Historial de sesión** — últimos 10 análisis

---

## 🚀 Despliegue en Vercel (recomendado)

### Paso 1 — Obtener API Key de Anthropic

1. Ve a [console.anthropic.com](https://console.anthropic.com)
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys** → **Create Key**
4. Copia la key (empieza con `sk-ant-...`)

### Paso 2 — Subir código a GitHub

```bash
# En la carpeta del proyecto
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/analizador-laboral.git
git push -u origin main
```

### Paso 3 — Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión con GitHub
2. Haz clic en **Add New Project**
3. Selecciona el repositorio `analizador-laboral`
4. En **Environment Variables** agrega:
   - Nombre: `ANTHROPIC_API_KEY`
   - Valor: `sk-ant-tu-api-key-aqui`
5. Haz clic en **Deploy**
6. ¡Listo! Vercel te dará una URL tipo `https://analizador-laboral-xxx.vercel.app`

---

## 💻 Desarrollo local

### Requisitos
- Node.js 18 o superior
- npm o yarn

### Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.local.example .env.local
# Edita .env.local y agrega tu API key de Anthropic

# 3. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 📁 Estructura del proyecto

```
analizador-laboral/
├── app/
│   ├── api/
│   │   └── analizar/
│   │       └── route.js        ← API que llama a Claude
│   ├── globals.css             ← Estilos globales
│   ├── layout.js               ← Layout raíz
│   └── page.js                 ← App principal (todas las vistas)
├── components/
│   ├── Badge.js                ← Indicador de estado ✓ ⚠ ✗
│   ├── KPI.js                  ← Tarjeta de métrica
│   └── Sidebar.js              ← Navegación lateral
├── lib/
│   └── exportar.js             ← Generación de Excel
├── .env.local.example          ← Plantilla de variables de entorno
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

---

## 📄 Documentos soportados

| Tipo | Descripción |
|------|-------------|
| Certificado Laboral (N-1) | Período anterior — para comparar nómina |
| Certificado Laboral (N) | Período actual — nómina vigente |
| Comprobantes Previred | AFP, Salud, Mutual, Caja, Seguro Social |
| Liquidaciones de sueldo | Todas las del período |
| Finiquitos firmados | Trabajadores desvinculados |
| Cartas de término | Dirección del Trabajo |

---

## ⚙️ Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `ANTHROPIC_API_KEY` | API Key de Anthropic (claude-sonnet) | ✅ Sí |

---

## 🔒 Seguridad

- La API Key **nunca** se expone al cliente (solo se usa en el servidor Next.js)
- Los PDFs se procesan en memoria y no se almacenan en servidor
- El historial de análisis solo persiste en la sesión del navegador

---

## 🛠️ Personalización

Para adaptar el prompt de análisis, edita el archivo `app/api/analizar/route.js` — la variable `PROMPT_SISTEMA` contiene las instrucciones completas que se envían a Claude.

---

## 📦 Dependencias principales

- [Next.js 14](https://nextjs.org) — Framework React
- [xlsx](https://github.com/SheetJS/sheetjs) — Exportación a Excel
- [Anthropic API](https://docs.anthropic.com) — Análisis con IA

---

*Desarrollado para RLX Ingeniería y Construcción S.A.*
