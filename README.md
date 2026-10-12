# Registro de oxígeno

PWA sin servidor para anotar SpO2, pulso, actividad, flujo y fuente de oxígeno, ver una gráfica y exportar/compartir un CSV. Los datos se guardan solo en el móvil (`localStorage`); no hay backend, analítica ni recursos externos.

## Probar en local
```
python3 -m http.server 8765
```
Abrir http://localhost:8765

## Publicar (GitHub Pages)
1. Subir esta carpeta a un repo (nombre poco obvio) y activar Pages sobre la rama principal.
2. Abrir el enlace `https://<usuario>.github.io/<repo>/` en el móvil.
3. Android (Chrome): menú ⋮ → *Instalar app*. iPhone (Safari): Compartir → *Añadir a pantalla de inicio*.

## Cambiar listas de actividades / fuentes
Arrays `ACTIVIDADES` y `FUENTES` al inicio de `app.js`. Si cambias cualquier archivo, sube el número de `CACHE` en `sw.js` para que los móviles recojan la versión nueva.

## Privacidad
No pongas datos personales en el código ni en el repo: el repo es público en el plan gratuito. Los datos de salud no salen del móvil salvo que se pulse *Compartir CSV*.
