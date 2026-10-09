// ============================================================
// CATÁLOGO: servicios, extras, horarios y festivos.
// Es la ÚNICA fuente de verdad: el servidor la usa para calcular
// precios y validar, y la web la pide a /api/catalogo para pintar
// la tabla y el formulario. Para cambiar un precio, cámbialo aquí.
// ============================================================

// Precios finales con IVA incluido, para turismo.
// soloTaller: true = no se ofrece a domicilio. diaCompleto: solo se entrega a primera hora.
export const SERVICIOS = [
  { id: "exterior", nombre: "Lavado exterior detallado", desc: "Prelavado con espuma, lavado a mano con dos cubos, llantas y pasos de rueda, secado sin marcas y sellante rápido.", duracion: "1 h", precio: 39, soloTaller: false, diaCompleto: false },
  { id: "interior", nombre: "Limpieza interior a fondo", desc: "Aspirado completo, plásticos, salpicadero, cristales, juntas y alfombrillas. Limpieza superficial de tapicería o cuero.", duracion: "2–3 h", precio: 89, soloTaller: false, diaCompleto: false },
  { id: "completo", nombre: "Detailing completo", desc: "Interior a fondo y exterior detallado, más descontaminación de pintura (hierro y alquitrán) y sellante con protección de unos 3 meses.", duracion: "4–5 h", precio: 169, soloTaller: false, diaCompleto: false },
  { id: "tapiceria", nombre: "Tapicería en profundidad", desc: "Limpieza de asientos y moqueta con inyección-extracción. Quita manchas y olores, no solo la superficie.", duracion: "2 h", precio: 79, soloTaller: false, diaCompleto: false },
  { id: "pulido", nombre: "Pulido en 1 paso", desc: "Recupera brillo y quita buena parte de los micro-arañazos y hologramas. Incluye lavado y descontaminado previos.", duracion: "1 día", precio: 289, soloTaller: true, diaCompleto: true },
  { id: "correccion", nombre: "Corrección de pintura en 2 pasos", desc: "Corte y acabado para eliminar la mayoría de defectos visibles, con medición del grosor de barniz.", duracion: "2 días", precio: 459, soloTaller: true, diaCompleto: true },
  { id: "ceramico", nombre: "Tratamiento cerámico 3 años", desc: "Pulido en 1 paso más recubrimiento cerámico. Repele agua y suciedad y protege el barniz. Incluye revisión gratuita al año.", duracion: "2 días", precio: 649, soloTaller: true, diaCompleto: true }
];

export const EXTRAS = [
  { id: "faros", nombre: "Pulido de faros (pareja)", precio: 49 },
  { id: "ozono", nombre: "Tratamiento de ozono", precio: 29 },
  { id: "motor", nombre: "Limpieza de vano motor", precio: 39 },
  { id: "pelo", nombre: "Retirada de pelo de mascota", precio: 25 }
];

export const SUPLEMENTO_GRANDE = 0.20; // SUV, monovolumen, furgoneta: +20 %

export const MUNICIPIOS = [
  { id: "terrassa", nombre: "Terrassa", desplazamiento: 15 },
  { id: "sabadell", nombre: "Sabadell", desplazamiento: 25 },
  { id: "rubi", nombre: "Rubí", desplazamiento: 25 },
  { id: "sant-cugat", nombre: "Sant Cugat del Vallès", desplazamiento: 25 },
  { id: "matadepera", nombre: "Matadepera", desplazamiento: 25 },
  { id: "viladecavalls", nombre: "Viladecavalls", desplazamiento: 25 },
  { id: "ullastrell", nombre: "Ullastrell", desplazamiento: 25 },
  { id: "castellbisbal", nombre: "Castellbisbal", desplazamiento: 25 }
];

export const RECINTOS = [
  { id: "garaje-particular", nombre: "Garaje particular" },
  { id: "parcela", nombre: "Parcela o patio vallado" },
  { id: "garaje-comunitario", nombre: "Garaje comunitario (con permiso de la comunidad)" }
];

// Horas de llegada por día de la semana (0 = domingo, 6 = sábado)
export const HORAS_SEMANA = ["9:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00"];
export const HORAS_SABADO = ["9:00", "10:00", "11:00"];

// Festivos (cerrado). Revisar cada año: nacionales, de Cataluña y locales de Terrassa.
export const FESTIVOS = [
  "2026-10-12", "2026-11-01", "2026-12-06", "2026-12-08", "2026-12-25", "2026-12-26",
  "2027-01-01", "2027-01-06"
];

export const DIAS_ANTELACION_MAX = 60;
