// Única fuente de la versión. La leen la app (index.html) y el service worker (importScripts).
// Subirla en cada release: cambia el nombre de la caché y avisa a los móviles de que hay versión nueva.
var APP_VERSION = '1.2.0';

// Novedades que se enseñan una sola vez al abrir la app ya actualizada. Escribirlas en lenguaje
// de usuaria (no el del CHANGELOG), cortas, y cambiarlas en cada release.
var NOVEDADES = [
  'Ahora se anota el modo (Durmiendo, Tumbada, Sentada, De pie) y el sitio (Cama, Sillón, WC, Transporte) por separado. Se pueden combinar.',
  'Tus mediciones anteriores se han convertido solas. No tienes que hacer nada.',
  'La gráfica tiene periodos de 6 y 12 horas, y filtros por modo y sitio.',
  'Colores nuevos, más fáciles de distinguir. Cada sitio tiene además su propia forma.',
  'La nota ahora crece mientras escribes y admite más texto.'
];
