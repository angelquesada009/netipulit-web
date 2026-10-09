// ============================================================
// SERVIDOR de Netipulit (Node.js + Express)
// Hace dos cosas:
//   1. Sirve la web (todo lo que hay en la carpeta public/).
//   2. Ofrece una API: la web le pide el catálogo y le envía reservas.
// Arráncalo con:  npm run dev   y abre  http://localhost:3000
// ============================================================
import express from "express";
import * as catalogo from "./src/catalogo.js";
import { validar, calcularPrecio, guardar, horasDisponibles } from "./src/reservas.js";

const app = express();
const PUERTO = process.env.PORT || 3000; // en internet, el hosting decide el puerto

// Entiende los datos JSON que envía el formulario (como máximo 20 KB)
app.use(express.json({ limit: "20kb" }));

// Archivos de la web. Las fotos y fuentes se guardan en caché 7 días en el navegador.
app.use(express.static("public", {
  setHeaders(res, ruta) {
    if (/\.(webp|woff2)$/.test(ruta)) res.setHeader("Cache-Control", "public, max-age=604800");
  }
}));

// --- API ---

// El catálogo completo, para pintar precios y opciones en la web
app.get("/api/catalogo", (req, res) => {
  res.json({
    servicios: catalogo.SERVICIOS,
    extras: catalogo.EXTRAS,
    suplementoGrande: catalogo.SUPLEMENTO_GRANDE,
    municipios: catalogo.MUNICIPIOS,
    recintos: catalogo.RECINTOS,
    diasAntelacionMax: catalogo.DIAS_ANTELACION_MAX
  });
});

// Horas libres de un día concreto: /api/horas?fecha=2026-10-14&servicio=completo
app.get("/api/horas", (req, res) => {
  const { fecha, servicio } = req.query;
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: "Fecha no válida" });
  }
  res.json({ horas: horasDisponibles(fecha, servicio) });
});

// Recibir una solicitud de cita
app.post("/api/reservas", async (req, res) => {
  const datos = req.body || {};

  // Trampa anti-spam: un campo oculto que las personas no ven, pero los robots rellenan
  if (datos.web) return res.status(201).json({ ok: true });

  const errores = validar(datos);
  if (Object.keys(errores).length > 0) {
    return res.status(400).json({ ok: false, errores });
  }

  try {
    const reserva = await guardar(datos);
    console.log(`Nueva solicitud ${reserva.id}: ${reserva.servicio} el ${reserva.fecha} a las ${reserva.hora}`);
    res.status(201).json({ ok: true, id: reserva.id, precio: calcularPrecio(datos) });
  } catch (err) {
    console.error("No se pudo guardar la reserva:", err);
    res.status(500).json({ ok: false, error: "No hemos podido guardar tu solicitud. Llámanos o inténtalo en unos minutos." });
  }
});

// Cualquier otra dirección de la API que no exista
app.use("/api", (req, res) => res.status(404).json({ error: "No existe" }));

app.listen(PUERTO, () => {
  console.log(`Netipulit funcionando en http://localhost:${PUERTO}`);
});
