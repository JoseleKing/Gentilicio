/* Gentilicio · herramientas/generar-mapa.mjs
   Genera data/mapa.json: los contornos de España y de América ya proyectados, a partir de
   Natural Earth 1:50m (dominio público), vía el paquete world-atlas.

   No hace falta para jugar ni para publicar: solo si quieres cambiar el encuadre.
   Uso, desde la carpeta del proyecto:
     npm i --no-save world-atlas@2 topojson-client@3 topojson-simplify@3 d3-geo@3
     node herramientas/generar-mapa.mjs

   La proyección es equirrectangular, corregida por el coseno de una latitud de referencia:
     x = k · c · (lon − lon0)      y = k · (lat0 − lat)
   app.js repite esa fórmula para clavar la chincheta, así que si se cambia aquí hay que
   cambiarla también allí (función proyectar). */

import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(process.cwd() + '/');
const tc = await import(require.resolve('topojson-client'));
const ts = await import(require.resolve('topojson-simplify'));
const d3 = await import(require.resolve('d3-geo'));

let mundo = JSON.parse(fs.readFileSync(require.resolve('world-atlas/countries-50m.json')));
mundo = ts.presimplify(mundo);
mundo = ts.simplify(mundo, ts.quantile(mundo, 0.3));
const paises = tc.feature(mundo, mundo.objects.countries).features;
const buscar = (nombre) => {
  const f = paises.find((p) => p.properties.name === nombre);
  if (!f) throw new Error(`No está en Natural Earth: ${nombre}`);
  return f;
};

// Nombre en Natural Earth → nombre en el juego (el campo «pais» de gentilicios.json).
const NOMBRES = {
  Spain: 'España', Portugal: 'Portugal', France: 'Francia', Andorra: 'Andorra', Morocco: 'Marruecos', Algeria: 'Argelia',
  Mexico: 'México', Guatemala: 'Guatemala', 'El Salvador': 'El Salvador', Honduras: 'Honduras', Nicaragua: 'Nicaragua',
  'Costa Rica': 'Costa Rica', Panama: 'Panamá', Cuba: 'Cuba', 'Dominican Rep.': 'República Dominicana',
  'Puerto Rico': 'Puerto Rico', Colombia: 'Colombia', Venezuela: 'Venezuela', Ecuador: 'Ecuador', Peru: 'Perú',
  Bolivia: 'Bolivia', Chile: 'Chile', Argentina: 'Argentina', Uruguay: 'Uruguay', Paraguay: 'Paraguay',
};

function lienzo({ lon0, lon1, lat0, lat1, latRef, k }) {
  const c = Math.cos((latRef * Math.PI) / 180);
  const ancho = Math.round(k * c * (lon1 - lon0));
  const alto = Math.round(k * (lat0 - lat1));
  const s = (k * 180) / Math.PI;
  const proy = d3
    .geoProjection((l, f) => [l * c, f])
    .scale(s)
    .translate([-k * c * lon0, k * lat0])
    .clipExtent([[-2, -2], [ancho + 2, alto + 2]]);
  const ruta = d3.geoPath(proy).digits(1);
  const paths = {};
  const otros = [];
  for (const f of paises) {
    const d = ruta(f);
    if (!d) continue;
    const nombre = NOMBRES[f.properties.name];
    if (nombre) paths[nombre] = d;
    else otros.push(d);
  }
  return { lon0, lat0, latRef, k, ancho, alto, paises: paths, otros: otros.join('') };
}

const datos = {
  // España peninsular y Baleares (Canarias queda fuera del encuadre).
  espana: lienzo({ lon0: -10, lon1: 4.6, lat0: 44.2, lat1: 35.4, latRef: 40, k: 30 }),
  // De México y el Caribe hasta la Patagonia. El juego muestra un recorte alrededor del lugar.
  america: lienzo({ lon0: -118, lon1: -33, lat0: 33, lat1: -56, latRef: 10, k: 10 }),
};

const salida = JSON.stringify(datos);
fs.writeFileSync(new URL('../data/mapa.json', import.meta.url), salida + '\n');
console.log(`data/mapa.json: ${(salida.length / 1024).toFixed(1)} KB`);
for (const [nombre, l] of Object.entries(datos)) console.log(nombre, l.ancho, '×', l.alto);
