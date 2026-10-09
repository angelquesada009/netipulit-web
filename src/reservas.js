// ============================================================
// RESERVAS: validar una solicitud, calcular su precio y guardarla.
// Regla de oro: nunca te fíes de lo que llega del navegador.
// Cualquiera puede saltarse el formulario y enviar datos a mano,
// así que el servidor vuelve a comprobarlo TODO y calcula el precio él.
// ============================================================
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  SERVICIOS, EXTRAS, SUPLEMENTO_GRANDE, MUNICIPIOS, RECINTOS,
  HORAS_SEMANA, HORAS_SABADO, FESTIVOS, DIAS_ANTELACION_MAX
} from "./catalogo.js";

const ARCHIVO = new URL("../data/reservas.json", import.meta.url);

// --- Fechas y horas disponibles ---
const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function horasDisponibles(fechaISO, servicioId) {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const dia = new Date(a, m - 1, d).getDay();
  let horas = dia === 0 || FESTIVOS.includes(fechaISO) ? [] : dia === 6 ? HORAS_SABADO : HORAS_SEMANA;
  const servicio = SERVICIOS.find((s) => s.id === servicioId);
  if (servicio?.diaCompleto) horas = horas.slice(0, 1); // trabajos largos: solo a primera hora
  return horas;
}

// --- Precio ---
export function calcularPrecio({ servicio, extras = [], vehiculo, lugar, municipio }) {
  const s = SERVICIOS.find((x) => x.id === servicio);
  if (!s) return null;
  const listaExtras = extras.map((id) => EXTRAS.find((e) => e.id === id)).filter(Boolean);
  let base = s.precio + listaExtras.reduce((t, e) => t + e.precio, 0);
  if (vehiculo === "grande") base = Math.round(base * (1 + SUPLEMENTO_GRANDE));
  const mun = MUNICIPIOS.find((x) => x.id === municipio);
  const desplazamiento = lugar === "domicilio" && mun ? mun.desplazamiento : 0;
  return { base, desplazamiento, total: base + desplazamiento };
}

// --- Validación ---
// Devuelve un objeto { campo: "mensaje de error" }. Si está vacío, todo es correcto.
export function validar(r) {
  const errores = {};
  const texto = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

  const servicio = SERVICIOS.find((s) => s.id === r.servicio);
  if (!servicio) errores.servicio = "Elige el servicio que quieres.";

  if (!["turismo", "grande"].includes(r.vehiculo)) errores.vehiculo = "Elige el tipo de vehículo.";
  if (!Array.isArray(r.extras) || r.extras.some((id) => !EXTRAS.some((e) => e.id === id))) errores.extras = "Hay un extra que no existe.";

  if (!["taller", "domicilio"].includes(r.lugar)) errores.lugar = "Elige dónde hacemos el servicio.";
  if (r.lugar === "domicilio") {
    if (servicio?.soloTaller) errores.lugar = "Este servicio solo se hace en el taller.";
    if (!MUNICIPIOS.some((m) => m.id === r.municipio)) errores.municipio = "Elige el municipio.";
    if (!texto(r.direccion, 200) || r.direccion.trim().length < 5) errores.direccion = "Escribe la dirección donde estará el coche.";
    if (!RECINTOS.some((x) => x.id === r.recinto)) errores.recinto = "Indica qué tipo de espacio es.";
    if (r.recintoOk !== true) errores.recintoOk = "A domicilio solo trabajamos en recintos privados y cerrados.";
  }

  const hoy = new Date();
  const min = aISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1));
  const max = aISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + DIAS_ANTELACION_MAX));
  if (typeof r.fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.fecha) || r.fecha < min || r.fecha > max) {
    errores.fecha = `Elige un día entre mañana y los próximos ${DIAS_ANTELACION_MAX} días.`;
  } else if (!horasDisponibles(r.fecha, r.servicio).includes(r.hora)) {
    errores.hora = "Esa hora no está disponible. Elige otra.";
  }

  if (!texto(r.nombre, 100)) errores.nombre = "Escribe tu nombre.";
  const tel = typeof r.telefono === "string" ? r.telefono.replace(/[\s.-]/g, "") : "";
  if (!/^(\+34)?[6789]\d{8}$/.test(tel)) errores.telefono = "Escribe un teléfono español de 9 cifras.";
  if (typeof r.email !== "string" || r.email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) errores.email = "Escribe un email válido.";
  if (r.comentarios && (typeof r.comentarios !== "string" || r.comentarios.length > 1000)) errores.comentarios = "Los comentarios son demasiado largos (máximo 1000 caracteres).";
  if (r.privacidad !== true) errores.privacidad = "Necesitamos tu permiso para usar tus datos y gestionar la cita.";

  return errores;
}

// --- Guardado ---
// Para empezar, guardamos en un archivo JSON. Más adelante lo cambiaremos
// por una hoja de Google, una base de datos o un email al negocio.
async function leerTodas() {
  try {
    return JSON.parse(await readFile(ARCHIVO, "utf8"));
  } catch {
    return []; // si el archivo aún no existe, empezamos con una lista vacía
  }
}

// Evita que dos solicitudes simultáneas se pisen al escribir el archivo
let cola = Promise.resolve();

export function guardar(r) {
  const reserva = {
    id: randomUUID().slice(0, 8).toUpperCase(),
    creada: new Date().toISOString(),
    estado: "pendiente",
    servicio: r.servicio,
    extras: r.extras,
    vehiculo: r.vehiculo,
    lugar: r.lugar,
    ...(r.lugar === "domicilio" && { municipio: r.municipio, direccion: r.direccion.trim(), recinto: r.recinto }),
    fecha: r.fecha,
    hora: r.hora,
    precioEstimado: calcularPrecio(r).total,
    nombre: r.nombre.trim(),
    telefono: r.telefono.trim(),
    email: r.email.trim(),
    comentarios: (r.comentarios || "").trim(),
    consentimiento: { privacidad: true, fecha: new Date().toISOString() }
  };

  cola = cola.then(async () => {
    await mkdir(new URL("../data/", import.meta.url), { recursive: true });
    const todas = await leerTodas();
    todas.push(reserva);
    await writeFile(ARCHIVO, JSON.stringify(todas, null, 2), "utf8");
  });
  return cola.then(() => reserva);
}
