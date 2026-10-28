/* ============================================================
   Netipulit · lógica de la web (lo que corre en el navegador)
   1. Pide el catálogo al servidor y pinta precios y opciones.
   2. Comparador antes/después.
   3. Formulario: precio estimado, horas libres y envío al servidor.
   ============================================================ */

// Número de WhatsApp del negocio, con prefijo y sin espacios (ej.: "34600123456").
// Mientras esté vacío, el botón "Enviar por WhatsApp" no aparece.
const WHATSAPP = "";

const $ = (id) => document.getElementById(id);
const euros = (n) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 }) + " €";


/* ---------- 1. CATÁLOGO DESDE EL SERVIDOR ---------- */

// fetch() pide datos a una dirección; "await" espera a que llegue la respuesta
let catalogo;
try {
  const respuesta = await fetch("/api/catalogo");
  catalogo = await respuesta.json();
} catch {
  $("filas-servicios").innerHTML = '<p class="row">No hemos podido cargar los precios. Recarga la página.</p>';
  throw new Error("Sin catálogo: ¿has arrancado el servidor con npm run dev?");
}
const { servicios, extras, suplementoGrande, municipios, recintos, diasAntelacionMax } = catalogo;

$("filas-servicios").innerHTML = servicios.map((s) => `
  <div class="row" role="row">
    <span role="cell"><span class="name">${s.nombre}</span><span class="desc">${s.desc}</span></span>
    <span class="meta">
      <span role="cell">${s.duracion}</span>
      <span role="cell" class="where ${s.soloTaller ? "only" : ""}">${s.soloTaller ? "Solo en taller" : "Taller o domicilio"}</span>
    </span>
    <span role="cell" class="price">${euros(s.precio)}</span>
  </div>`).join("");

$("lista-extras").innerHTML = extras.map((e) => `<li><span>${e.nombre}</span><b>${euros(e.precio)}</b></li>`).join("");


/* ---------- 2. COMPARADOR ANTES / DESPUÉS ---------- */

// El comparador se mueve solo cuando el visitante lo arrastra (nada de animaciones automáticas)
const panel = $("panel");
const deslizador = $("pulido");
deslizador.addEventListener("input", () => panel.style.setProperty("--pos", deslizador.value + "%"));


/* ---------- 3. FORMULARIO DE RESERVA ---------- */

const form = $("form-reserva");
const selServicio = $("servicio");
const selVehiculo = $("vehiculo");
const selMunicipio = $("municipio");
const inFecha = $("fecha");
const selHora = $("hora");
const radioDomicilio = form.querySelector('input[value="domicilio"]');
const radioTaller = form.querySelector('input[value="taller"]');
const lugarElegido = () => form.querySelector('input[name="lugar"]:checked').value;

// Rellenar desplegables y casillas con los datos del catálogo
servicios.forEach((s) => selServicio.add(new Option(`${s.nombre} · desde ${euros(s.precio)}`, s.id)));
municipios.forEach((m) => selMunicipio.add(new Option(`${m.nombre} (+${euros(m.desplazamiento)})`, m.id)));
recintos.forEach((r) => $("recinto").add(new Option(r.nombre, r.id)));
$("checks-extras").innerHTML = extras.map((e) => `
  <label class="check"><input type="checkbox" name="extras" value="${e.id}"> ${e.nombre} (+${euros(e.precio)})</label>`).join("");

// Fechas permitidas: de mañana a dentro de N días
const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hoy = new Date();
inFecha.min = aISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1));
inFecha.max = aISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + diasAntelacionMax));

function actualizarLugar() {
  const servicio = servicios.find((s) => s.id === selServicio.value);
  const soloTaller = !!servicio?.soloTaller;
  radioDomicilio.disabled = soloTaller;
  if (soloTaller) radioTaller.checked = true;
  $("aviso-taller").hidden = !soloTaller;
  $("bloque-domicilio").hidden = lugarElegido() !== "domicilio";
}

// Precio orientativo en el navegador. El precio que cuenta lo calcula el servidor.
function calcularPrecio() {
  const servicio = servicios.find((s) => s.id === selServicio.value);
  if (!servicio) return null;
  const elegidos = [...form.querySelectorAll('input[name="extras"]:checked')].map((c) => extras.find((e) => e.id === c.value));
  const grande = selVehiculo.value === "grande";
  let base = servicio.precio + elegidos.reduce((t, e) => t + e.precio, 0);
  if (grande) base = Math.round(base * (1 + suplementoGrande));
  const mun = municipios.find((m) => m.id === selMunicipio.value);
  const desplazamiento = lugarElegido() === "domicilio" && mun ? mun.desplazamiento : 0;
  return { servicio, elegidos, grande, desplazamiento, total: base + desplazamiento };
}

function actualizarPrecio() {
  const p = calcularPrecio();
  if (!p) {
    $("estimacion").textContent = "Elige un servicio";
    $("estimacion-detalle").textContent = "";
    return;
  }
  $("estimacion").textContent = euros(p.total);
  const partes = ["IVA incluido"];
  if (p.grande) partes.push("con suplemento de vehículo grande");
  if (lugarElegido() === "domicilio") {
    partes.push(p.desplazamiento ? `desplazamiento de ${euros(p.desplazamiento)} incluido` : "falta elegir municipio para sumar el desplazamiento");
  }
  $("estimacion-detalle").textContent = partes.join(", ") + ". Precio final confirmado al ver el coche.";
}

// Pide al servidor las horas libres del día elegido
async function actualizarHoras() {
  const valor = inFecha.value;
  selHora.innerHTML = "";
  selHora.disabled = true;
  if (!valor) { selHora.add(new Option("Elige primero el día", "")); return; }

  selHora.add(new Option("Cargando horas…", ""));
  let horas = [];
  try {
    const r = await fetch(`/api/horas?fecha=${valor}&servicio=${encodeURIComponent(selServicio.value)}`);
    ({ horas = [] } = await r.json());
  } catch { /* sin conexión: se mostrará como cerrado */ }

  selHora.innerHTML = "";
  if (!horas.length) { selHora.add(new Option("Cerrado ese día", "")); return; }
  selHora.disabled = false;
  selHora.add(new Option("Elige hora", ""));
  horas.forEach((h) => selHora.add(new Option(h, h)));
}

form.addEventListener("change", (e) => {
  if (e.target === selServicio || e.target.name === "lugar") actualizarLugar();
  if (e.target === inFecha || e.target === selServicio) actualizarHoras();
  actualizarPrecio();
});

// --- Mensajes de error junto a cada campo ---
// Nombre del dato en el servidor → id del campo en la página
const CAMPOS = {
  servicio: "servicio", vehiculo: "vehiculo", lugar: "servicio", municipio: "municipio", direccion: "direccion",
  recinto: "recinto", recintoOk: "recinto-ok", fecha: "fecha", hora: "hora", nombre: "nombre",
  telefono: "telefono", email: "email", privacidad: "privacidad"
};

function limpiarErrores() {
  form.querySelectorAll(".error").forEach((p) => (p.textContent = ""));
  form.querySelectorAll('[aria-invalid="true"]').forEach((c) => c.removeAttribute("aria-invalid"));
}

function mostrarErrores(errores) {
  let primero = null;
  for (const [clave, mensaje] of Object.entries(errores)) {
    const id = CAMPOS[clave];
    const caja = id && $("error-" + id);
    if (!caja) { $("error-general").textContent = mensaje; continue; }
    if (!caja.textContent) caja.textContent = mensaje;
    const campo = $(id);
    campo.setAttribute("aria-invalid", "true");
    campo.setAttribute("aria-describedby", caja.id);
    primero ??= campo;
  }
  if (primero) primero.focus();
  else $("btn-enviar").focus();
}

// Comprobaciones rápidas antes de enviar, para no hacer esperar al usuario.
// El servidor vuelve a comprobarlo todo: nunca se fía del navegador.
function validarEnNavegador(d) {
  const e = {};
  if (!d.servicio) e.servicio = "Elige el servicio que quieres.";
  if (d.lugar === "domicilio") {
    if (!d.municipio) e.municipio = "Elige el municipio.";
    if (d.direccion.trim().length < 5) e.direccion = "Escribe la dirección donde estará el coche.";
    if (!d.recinto) e.recinto = "Indica qué tipo de espacio es.";
    if (!d.recintoOk) e.recintoOk = "A domicilio solo trabajamos en recintos privados y cerrados. Marca la casilla para confirmarlo.";
  }
  if (!d.fecha) e.fecha = "Elige el día.";
  else if (!d.hora) e.hora = selHora.disabled ? "Ese día está cerrado. Elige otro." : "Elige la hora de llegada.";
  if (!d.nombre.trim()) e.nombre = "Escribe tu nombre.";
  if (!/^(\+34)?[6789]\d{8}$/.test(d.telefono.replace(/[\s.-]/g, ""))) e.telefono = "Escribe un teléfono español de 9 cifras.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = "Escribe un email válido, por ejemplo nombre@correo.com.";
  if (!d.privacidad) e.privacidad = "Necesitamos tu permiso para usar tus datos y gestionar la cita.";
  return e;
}

function recogerDatos() {
  return {
    servicio: selServicio.value,
    extras: [...form.querySelectorAll('input[name="extras"]:checked')].map((c) => c.value),
    vehiculo: selVehiculo.value,
    lugar: lugarElegido(),
    municipio: selMunicipio.value,
    direccion: $("direccion").value,
    recinto: $("recinto").value,
    recintoOk: $("recinto-ok").checked,
    fecha: inFecha.value,
    hora: selHora.value,
    nombre: $("nombre").value,
    telefono: $("telefono").value,
    email: $("email").value,
    comentarios: $("comentarios").value,
    privacidad: $("privacidad").checked,
    web: $("web").value // campo trampa anti-spam
  };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  limpiarErrores();
  const datos = recogerDatos();

  const errores = validarEnNavegador(datos);
  if (Object.keys(errores).length) return mostrarErrores(errores);

  // Enviamos los datos al servidor (petición POST) y esperamos su respuesta
  const boton = $("btn-enviar");
  boton.disabled = true;
  boton.textContent = "Enviando…";
  try {
    const r = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });
    const respuesta = await r.json();
    if (!r.ok) {
      mostrarErrores(respuesta.errores || { general: respuesta.error || "No hemos podido enviar tu solicitud. Inténtalo de nuevo." });
      return;
    }
    mostrarConfirmacion(datos, respuesta);
  } catch {
    mostrarErrores({ general: "Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo." });
  } finally {
    boton.disabled = false;
    boton.textContent = "Solicitar cita";
  }
});

function mostrarConfirmacion(d, respuesta) {
  const p = calcularPrecio();
  const [a, m, dia] = d.fecha.split("-").map(Number);
  const fechaTexto = new Date(a, m - 1, dia).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const mun = municipios.find((x) => x.id === d.municipio);

  const filas = [
    ["Servicio", p.servicio.nombre + (p.elegidos.length ? " + " + p.elegidos.map((e) => e.nombre.toLowerCase()).join(", ") : "")],
    ["Vehículo", p.grande ? "SUV, monovolumen o furgoneta" : "Turismo"],
    ["Lugar", d.lugar === "domicilio" ? `A domicilio: ${d.direccion.trim()} (${mun.nombre})` : "Taller de Terrassa"],
    ["Día y hora", `${fechaTexto}, a las ${d.hora}`],
    ["Precio estimado", euros(respuesta.precio.total) + " (IVA incluido)"],
    ["Contacto", `${d.nombre.trim()}, ${d.telefono.trim()}`]
  ];

  // textContent en vez de innerHTML: nada de lo que escriba el usuario se interpreta como código
  const dl = $("resumen");
  dl.innerHTML = "";
  filas.forEach(([k, v]) => {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    dl.append(dt, dd);
  });
  $("num-solicitud").textContent = respuesta.id;

  const wa = $("btn-whatsapp");
  if (WHATSAPP) {
    const texto = `Hola, he enviado la solicitud ${respuesta.id}:\n` + filas.map(([k, v]) => `${k}: ${v}`).join("\n");
    wa.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
    wa.hidden = false;
  }

  form.hidden = true;
  const conf = $("confirmacion");
  conf.hidden = false;
  conf.focus();
}

/* ---------- 4. PUNTOS INTERACTIVOS DEL COCHE ---------- */

// Cada punto apunta a una parte del coche (x, y en % de la foto) y a un servicio del catálogo.
// El precio sale del catálogo del servidor: si cambias un precio en src/catalogo.js, cambia aquí también.
const PUNTOS = [
  { id: "faros", parte: "Faros", x: 9, y: 45, extra: "faros",
    texto: "Los faros amarillentos o mates restan visibilidad y estética. Los pulimos y sellamos para que vuelvan a ser transparentes." },
  { id: "llantas", parte: "Llantas", x: 21.5, y: 72, servicio: "exterior",
    texto: "Llantas, pasos de rueda y neumáticos limpios a mano, sin productos ácidos que dañen el barniz. Incluido en el lavado exterior." },
  { id: "interior", parte: "Interior", x: 53, y: 25, servicio: "interior",
    texto: "Aspirado completo, plásticos, salpicadero, cristales y tapicería. Quitamos el polvo de cada rincón." },
  { id: "pintura", parte: "Pintura", x: 46, y: 56, servicio: "pulido",
    texto: "Pulimos la pintura para quitar hologramas y micro-arañazos y recuperar el brillo. Con corrección en 2 pasos si hace falta más." },
  { id: "proteccion", parte: "Protección", x: 78, y: 36, servicio: "ceramico",
    texto: "Recubrimiento cerámico que repele el agua y la suciedad y protege el barniz durante unos 3 años." }
];

const iconoMas = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
$("hotspots").innerHTML = PUNTOS.map((p, i) => `
  <button class="hotspot" type="button" data-id="${p.id}" aria-pressed="false" aria-controls="detalle"
          style="--x:${p.x}%; --y:${p.y}%; --i:${i}" aria-label="${p.parte}: ver servicio">
    <span class="dot">${iconoMas}</span><span class="hs-label" aria-hidden="true">${p.parte}</span>
  </button>`).join("");

function mostrarPunto(id) {
  const p = PUNTOS.find((x) => x.id === id);
  const servicio = p.servicio && servicios.find((s) => s.id === p.servicio);
  const extra = p.extra && extras.find((e) => e.id === p.extra);
  const nombre = servicio ? servicio.nombre : extra.nombre;
  const precio = servicio ? servicio.precio : extra.precio;
  const nota = servicio ? `${servicio.duracion}${servicio.soloTaller ? ", solo en taller" : ", taller o domicilio"}` : "Extra para cualquier servicio";
  const desde = servicio && ["pulido", "ceramico"].includes(servicio.id) ? "Desde " : "";

  $("detalle").innerHTML = `
    <div class="detail-card">
      <div><h2>${nombre}</h2><p>${p.texto}</p></div>
      <div class="detail-price"><b>${desde}${euros(precio)}</b><span>${nota}</span></div>
      <button class="btn" type="button" id="btn-elegir">${servicio ? "Reservar este servicio" : "Añadir a mi cita"}</button>
    </div>`;
  $("btn-elegir").addEventListener("click", () => elegirEnFormulario(p));

  document.querySelectorAll(".hotspot").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
}

// Lleva la elección al formulario y baja hasta él
function elegirEnFormulario(p) {
  if (p.servicio) selServicio.value = p.servicio;
  if (p.extra) {
    const casilla = form.querySelector(`input[name="extras"][value="${p.extra}"]`);
    if (casilla) casilla.checked = true;
  }
  actualizarLugar();
  actualizarHoras();
  actualizarPrecio();
  $("reserva").scrollIntoView({ behavior: sinMovimiento ? "auto" : "smooth" });
  selServicio.focus({ preventScroll: true });
}

const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

$("hotspots").addEventListener("click", (e) => {
  const boton = e.target.closest(".hotspot");
  if (boton) mostrarPunto(boton.dataset.id);
});

$("btn-editar").addEventListener("click", () => {
  $("confirmacion").hidden = true;
  form.hidden = false;
  form.reset();
  actualizarLugar();
  actualizarHoras();
  actualizarPrecio();
  selServicio.focus();
});

actualizarLugar();
