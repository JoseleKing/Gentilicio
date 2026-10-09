# Gentilicio

Juego diario de gentilicios. Cada día hay tres, los mismos para todos: hay que elegir de qué
lugar es cada uno entre tres opciones, con un solo intento. Al responder se ve de dónde viene
el nombre y el lugar en el mapa. Forma parte de la colección de [Almanaque](https://joseleking.github.io/Almanaque/).

Es una web estática (HTML, CSS y JavaScript, sin frameworks ni compilación), lista para
GitHub Pages e instalable como aplicación (PWA).

## Reglas

- Tres preguntas al día, de menos a más difícil: **despegue**, **la trampa** y **jefe final**.
  A veces una va **del revés**: se da el lugar y se elige el gentilicio.
- El reto cambia a medianoche, hora local del jugador. El día nº 1 es el 2 de octubre de 2026
  (`INICIO` en `app.js`).
- La racha cuenta los días seguidos en que se juegan las tres preguntas, se acierte o no.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `index.html` | Estructura de la página y «Cómo se juega» |
| `styles.css` | Estética de papel y tinta (con modo oscuro en azul noche) |
| `app.js` | Lógica: reto del día, opciones, mapa, racha, compartir, cuenta atrás |
| `data/gentilicios.json` | Los gentilicios |
| `data/mapa.json` | Contornos de España y América ya proyectados (generado, no se edita a mano) |
| `herramientas/generar-mapa.mjs` | Script que genera `data/mapa.json` (solo para cambiar el encuadre) |
| `manifest.json`, `sw.js` | Instalación como aplicación y uso sin conexión |
| `volver-almanaque.js` | Enlace de vuelta a Almanaque (copia de `Almanaque/para-los-juegos/`) |
| `icons/` | Icono en SVG (con la G ya en trazado) y PNG de 32, 180, 192 y 512 px, más el maskable |

## Probar en local

`fetch` no funciona abriendo el archivo directamente, así que hace falta un servidor:

```sh
python3 -m http.server 8000
```

y abrir <http://localhost:8000>. Desde el móvil, en la misma red, usa la IP del Mac
(por ejemplo `http://192.168.1.20:8000`).

- `?dia=3` abre el reto del día 3 en **modo prueba**: las respuestas no se guardan ni cuentan
  para la racha, y las flechas ‹ › pasan de un día a otro.
- `?reiniciar` (solo en local) borra la partida y la racha.

## Añadir gentilicios

Edita solo `data/gentilicios.json`. Cada entrada:

```json
{
  "id": "onubense",
  "gentilicio": "onubense",
  "lugar": "Huelva",
  "pais": "España",
  "region": "Andalucía",
  "coordenadas": [37.261, -6.945],
  "nivel": 1,
  "formato": "normal",
  "falsas": ["Osuna", "Ourense"],
  "explicacion": "Viene de Onuba (también escrito Onoba), el nombre de Huelva en época romana.",
  "curiosidad": "Opcional.",
  "otras_formas": ["huelveño"]
}
```

- `nivel`: 1 (despegue), 2 (la trampa) o 3 (jefe final).
- `formato`: `"normal"` (se da el gentilicio y se elige el lugar) o `"reves"` (se da el lugar y se
  elige el gentilicio). En `"reves"`, `falsas` son gentilicios; en `"normal"`, lugares.
- `etiqueta` (opcional): cómo se escribe el lugar en las opciones cuando hay que desambiguar,
  por ejemplo `"Mérida (México)"`. Las falsas se desambiguan igual dentro del texto.
- `coordenadas`: `[latitud, longitud]`. Si el país es España sale el mapa de España; si no,
  un recorte del de América.
- `otras_formas`: variantes válidas. Las que no menciona la explicación se muestran debajo.
- `revisar: true` marca las entradas con algún dato por confirmar.

**El orden importa.** El día *n* usa el *n*-ésimo gentilicio de cada nivel, así que hay tantos días
distintos como entradas tenga el nivel más corto. Al acabarse, el ciclo vuelve a empezar. Hoy hay 70
entradas por nivel: el último día es el 10 de diciembre de 2026 y el 11 vuelve el día 1. Una vez
publicado, añade las entradas nuevas al final y no reordenes ni borres las anteriores, porque
cambiarías los retos de días ya jugados.

Después de cambiar archivos, sube `VERSION` en `sw.js` para que los móviles con la app
instalada reciban la versión nueva.

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub (`JoseleKing/Gentilicio`).
2. En **Settings → Pages**, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. En un par de minutos estará en <https://joseleking.github.io/Gentilicio/>.

## Créditos

Contornos del mapa: [Natural Earth](https://www.naturalearthdata.com) (dominio público).
Tipografías: IM Fell English (Igino Marini) y EB Garamond, de Google Fonts (OFL).
