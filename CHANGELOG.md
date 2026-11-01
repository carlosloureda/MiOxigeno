# Cambios

## 1.2.0
- Ahora cada medición lleva **modo** (Durmiendo, Tumbada, Sentada, De pie) y **sitio** (Cama, Sillón, WC, Transporte), en vez de una sola actividad. Se pueden combinar: "Tumbada en el sillón", "De pie en el WC"…
- Las mediciones antiguas se convierten solas al abrir la app (Durmiendo → Durmiendo + Cama, Tumbada → Tumbada + Sillón, Sentada → Sentada + Sillón, WC → Sentada + WC, Transporte → Sentada + Transporte). Antes de convertir se guarda una copia interna (`oxi.v1.bak`).
- Gráfica: nuevos periodos de 6 h y 12 h, y filtros por modo y sitio.
- En la gráfica, el relleno del punto es el modo y el borde es el sitio, cada sitio con su forma (círculo, cuadrado, triángulo, rombo), para no depender solo del color.
- Colores nuevos con más contraste y pensados para daltonismo, con paleta distinta en tema claro y oscuro. Las marcas de color son más grandes.
- La nota es ahora un campo que crece mientras se escribe (hasta 4 líneas, luego hace scroll), admite hasta 500 caracteres (antes 120) y respeta los saltos de línea en la lista de Datos.
- El CSV cambia: la columna `actividad` pasa a ser `modo` y `sitio`.

## 1.1.0
- Gráficas nuevas: SpO2, pulso y flujo de oxígeno apiladas con el mismo eje de tiempo, y un resumen arriba (media y rango de cada una). Se mantienen los filtros de periodo, actividad y fuente.
- Los puntos llevan el color de su actividad, con leyenda. El eje se ajusta a los datos que hay y siempre incluye el último punto.
- Al tocar o arrastrar el dedo por una gráfica, una línea se mueve en todas y se ve la medición de ese momento (con la fuente de oxígeno). Si hay varias a la misma hora, gana la más reciente y se avisa ("+1 más a esa hora").
- El resumen dice "3 de 4" cuando el periodo o los filtros dejan fuera alguna medición.
- En 30 días y "Todo", cada día es una barra de mínimo a máximo con la media, para que no se amontone.
- Nueva actividad "Tumbada" (junto a Durmiendo, Sentada, WC y Transporte).
- Cada actividad lleva un punto de su color, el mismo en los botones de Anotar, en la lista de Datos y en la leyenda de la gráfica.
- Actualización automática: aviso "Hay una versión nueva · Actualizar" y carga siempre lo último cuando hay internet (incluye el arreglo para que no traiga archivos viejos de la caché del navegador).
- Número de versión visible arriba, junto al título de la pestaña Datos (se define en un solo sitio: `version.js`).

## 1.0.0
- Primera versión: registro rápido, gráfica con filtros, exportar y compartir CSV, instalable y offline.
