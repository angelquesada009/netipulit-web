// ============================================================
// COCHE 3D de la portada (three.js)
// Carga el modelo, lo ilumina como en un estudio y deja girarlo con el dedo o el ratón.
// Los puntos amarillos (los crea script.js) siguen a su pieza del coche mientras gira.
// Si el navegador no soporta WebGL, se queda la foto plana de siempre.
// ============================================================
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const plano = document.querySelector(".plane");
const puntos = document.getElementById("hotspots");
const foto = plano?.querySelector(".car");
const pista = document.getElementById("studio-hint");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Color de la carrocería. Cámbialo aquí si quieres otro coche (blanco perla por defecto).
const COLOR_CARROCERIA = "#e9edf0";

// Dónde está cada punto sobre el modelo (en metros, el coche mira hacia -Z) y hacia dónde "mira" ese punto:
// el punto solo se muestra si esa cara del coche está de cara a la cámara.
const ANCLAS = {
  faros:      { pos: [0.62, 0.62, -2.18],  normal: [0.55, 0.1, -0.83] },
  llantas:    { pos: [0.97, 0.36, -1.15],  normal: [1, 0, 0] },
  interior:   { pos: [0.0, 1.0, -0.2],     normal: [0.25, 1, -0.1] },
  pintura:    { pos: [1.13, 0.68, 0.05],   normal: [1, 0.05, 0] },
  proteccion: { pos: [0.98, 0.88, 1.5],    normal: [0.8, 0.35, 0.5] }
};

function hayWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

function usarFoto() {
  if (foto) foto.hidden = false;
  if (plano) plano.classList.remove("is-3d");
  if (pista) pista.hidden = true;
}

if (!plano || !puntos || !hayWebGL()) {
  usarFoto();
} else {
  iniciar().catch((e) => { console.warn("Coche 3D no disponible:", e); usarFoto(); });
}

async function iniciar() {
  plano.classList.add("is-3d", "is-loading");
  puntos.dataset.tres = "";

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const lienzo = renderer.domElement;
  lienzo.className = "car3d";
  lienzo.setAttribute("aria-hidden", "true"); // el coche se "lee" con los botones de los puntos
  lienzo.style.touchAction = "pan-y";        // en móvil: el dedo en vertical sigue haciendo scroll
  plano.prepend(lienzo);

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; // reflejos de estudio

  const camara = new THREE.PerspectiveCamera(30, 16 / 7, 0.1, 60);
  camara.position.set(4.35, 1.5, -4.0);

  const controles = new OrbitControls(camara, lienzo);
  controles.target.set(0, 0.5, 0);
  controles.enableZoom = false;   // la rueda del ratón sigue haciendo scroll en la página
  controles.enablePan = false;
  controles.enableDamping = true;
  controles.dampingFactor = 0.07;
  controles.rotateSpeed = 0.7;
  controles.minPolarAngle = Math.PI * 0.30;
  controles.maxPolarAngle = Math.PI * 0.50; // no deja bajar de la línea del suelo
  lienzo.style.touchAction = "pan-y";
  controles.update();

  // Luz principal suave desde arriba, para dar volumen al capó y al techo
  const sol = new THREE.DirectionalLight(0xffffff, 1.1);
  sol.position.set(-3, 6, 4);
  escena.add(sol);

  // Sombra de contacto: una mancha oscura difuminada bajo el coche
  const sombra = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
    grad.addColorStop(0, "rgba(8,18,26,.85)"); grad.addColorStop(.55, "rgba(8,18,26,.4)"); grad.addColorStop(1, "rgba(8,18,26,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 5.6),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.005;
    return m;
  })();
  escena.add(sombra);

  // Modelo
  const draco = new DRACOLoader().setDecoderPath("vendor/three/addons/libs/draco/gltf/");
  const cargador = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await cargador.loadAsync("models/ferrari.glb");
  const coche = gltf.scene;
  const carroceria = coche.getObjectByName("body");
  if (carroceria) {
    carroceria.material.color.set(COLOR_CARROCERIA);
    carroceria.material.metalness = 0.4;
    carroceria.material.roughness = 0.32;
    if ("clearcoat" in carroceria.material) { carroceria.material.clearcoat = 1; carroceria.material.clearcoatRoughness = 0.04; }
  }
  const cristal = coche.getObjectByName("glass");
  if (cristal) { cristal.material.transparent = true; cristal.material.opacity = 0.42; }
  escena.add(coche);
  draco.dispose();

  // ---- Tamaño y encuadre ----
  function ajustar() {
    const w = plano.clientWidth, h = plano.clientHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // En pantallas estrechas el coche se aleja un poco para que quepa entero
    camara.fov = w / h < 1.5 ? 42 : 30;
    camara.updateProjectionMatrix();
    pedir();
  }
  new ResizeObserver(ajustar).observe(plano);

  // ---- Movimiento: balanceo suave hasta que la persona toca el coche ----
  let tocado = false, visible = true, t0 = performance.now();
  const base = new THREE.Spherical().setFromVector3(camara.position.clone().sub(controles.target));
  const fin = () => { tocado = true; if (pista) pista.classList.add("is-done"); };
  controles.addEventListener("start", fin);
  let pedido = false;
  function pedir() { if (!pedido) { pedido = true; requestAnimationFrame(frame); } }

  const v = new THREE.Vector3(), n = new THREE.Vector3(), haciaCamara = new THREE.Vector3();
  const botones = () => [...puntos.querySelectorAll(".hotspot")];

  function colocarPuntos() {
    const w = plano.clientWidth, h = plano.clientHeight;
    for (const b of botones()) {
      const a = ANCLAS[b.dataset.id]; if (!a) continue;
      v.set(...a.pos).project(camara);
      b.style.setProperty("--x", ((v.x * 0.5 + 0.5) * w).toFixed(1) + "px");
      b.style.setProperty("--y", ((-v.y * 0.5 + 0.5) * h).toFixed(1) + "px");
      // Visible solo si esa parte del coche mira hacia la cámara
      n.set(...a.normal).normalize();
      haciaCamara.copy(camara.position).sub(v.set(...a.pos)).normalize();
      const k = THREE.MathUtils.smoothstep(n.dot(haciaCamara), 0.0, 0.3);
      b.style.setProperty("--v", k.toFixed(2));
      b.style.pointerEvents = k > 0.5 ? "auto" : "none";
      b.tabIndex = k > 0.5 ? 0 : -1;
    }
  }

  let ultimo = 0;
  function frame(ahora) {
    pedido = false;
    if (!visible || document.hidden) return;
    if (!tocado && !sinMovimiento) {
      const s = (ahora - t0) / 1000;
      const sph = base.clone();
      sph.theta += Math.sin(s * 0.45) * 0.42;      // balanceo lateral
      sph.phi += Math.sin(s * 0.3 + 1) * 0.02;
      camara.position.setFromSpherical(sph).add(controles.target);
      camara.lookAt(controles.target);
    }
    const sigue = controles.update();
    colocarPuntos();
    renderer.render(escena, camara);
    // Sigue pintando mientras se mueva solo, o mientras la inercia del arrastre no termine
    if ((!tocado && !sinMovimiento) || sigue || controles.autoRotate) { ultimo = ahora; pedir(); }
    else if (ahora - ultimo < 400) pedir();
  }
  controles.addEventListener("change", pedir);

  // Ahorro: no pinta si el coche no se ve o la pestaña está en segundo plano
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) pedir(); }).observe(plano);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pedir(); });

  ajustar();
  plano.classList.remove("is-loading");
  puntos.dataset.tres = "listo";
  pedir();
}
