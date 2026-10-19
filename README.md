# Mi Oxígeno

PWA sin servidor para anotar SpO2, pulso, actividad, flujo y fuente de oxígeno, ver una gráfica y exportar/compartir un CSV. Los datos se guardan solo en el móvil (`localStorage`); no hay backend, analítica ni recursos externos.

**App publicada (GitHub Pages):** https://carlosloureda.github.io/MiOxigeno/

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
Arrays `ACTIVIDADES` y `FUENTES` al inicio de `app.js`.

## Versiones y actualizaciones
La versión se define **solo** en `version.js` (`APP_VERSION`); de ahí sale el nombre de la caché del service worker y el número que se ve en la pestaña Datos. Los móviles cargan siempre lo último cuando hay internet y muestran un aviso "Hay una versión nueva · Actualizar" (no se recarga solo, para no perder lo que se esté escribiendo).

Para sacar una versión:
1. Trabajar en la rama `dev`.
2. Subir `APP_VERSION` en `version.js` y añadir la entrada en `CHANGELOG.md`.
3. Si cambia el formato de los datos: **migrar** (nunca cambiar la clave `oxi.v1` sin migración) y pedir antes un CSV de respaldo.
4. Merge a `main`, etiqueta (`git tag vX.Y.Z`) y push (`git push origin main --tags`). Pages publica solo.

## Privacidad
No pongas datos personales en el código ni en el repo: el repo es público en el plan gratuito. Los datos de salud no salen del móvil salvo que se pulse *Compartir CSV*.
