# Netipulit · web de detailing en Terrassa

Web con formulario de reservas. El servidor está hecho con Node.js y Express.

## Arrancar en tu ordenador

```
npm install      # solo la primera vez: descarga Express
npm run dev      # arranca el servidor y lo reinicia al guardar cambios
```

Abre http://localhost:3000 en el navegador. Para pararlo: `Ctrl + C` en el terminal.

## Estructura

| Carpeta / archivo | Qué es |
|---|---|
| `server.js` | El servidor: sirve la web y recibe las reservas |
| `src/catalogo.js` | Servicios, precios, horarios y festivos. **Los precios se cambian aquí** |
| `src/reservas.js` | Valida las solicitudes, calcula el precio y las guarda |
| `public/` | La web que ve el visitante (HTML, CSS, JS, fotos y fuentes) |
| `data/reservas.json` | Las solicitudes recibidas. Se crea solo y no se sube a GitHub |

## API

- `GET /api/catalogo`: servicios, extras, municipios y tipos de espacio
- `GET /api/horas?fecha=AAAA-MM-DD&servicio=id`: horas libres de un día
- `POST /api/reservas`: crea una solicitud de cita
