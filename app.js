/* Gentilicio · app.js
   Tres gentilicios al día, los mismos para todos. Sin servidor: el reto sale de la fecha
   (hora de Madrid) y la partida se guarda en localStorage. */
'use strict';

/** Día nº 1 del juego (fecha de Madrid). Cambiarlo cambia la numeración y el reto de cada día. */
const INICIO = { anio: 2026, mes: 10, dia: 2 };
const CLAVE = 'gentilicio:v1';
const PREGUNTAS = 3;
const NIVELES = ['Despegue', 'La trampa', 'Jefe final'];
const MS_DIA = 86400000;

const ESTADISTICAS_INICIALES = { dias: 0, preguntas: 0, aciertos: 0, racha: 0, mejorRacha: 0, ultimoDia: 0 };

const LLAMA =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .8c.4 3 4.6 4.6 4.6 9A4.6 4.6 0 0 1 3.4 9.9c0-2 1.2-3.3 1.9-4.6.6 1 .9 1.9.9 3C7.5 6.7 8.4 4 8 .8z"/></svg>';
// Chincheta del logo (la punta está en 246,286 en el lienzo de 400 del icono).
const CHINCHETA = 'M246 286 C 232 252, 180 222, 180 168 A 66 66 0 1 1 312 168 C 312 222, 260 252, 246 286 Z';

const app = document.getElementById('app');
const aviso = document.getElementById('aviso');
const reglas = document.getElementById('reglas');

let ENTRADAS = [];
let MAPA = null;
/** Entradas de cada nivel, en el orden del JSON: el día n usa la n-ésima de cada nivel. */
let porNivel = [[], [], []];

const parametros = new URLSearchParams(location.search);
/** Modo prueba: ?dia=3 muestra el reto del día 3 del contenido sin tocar la partida guardada. */
const diaPrueba = /^\d+$/.test(parametros.get('dia') || '') ? Math.max(1, Number(parametros.get('dia'))) : 0;
/** En modo prueba las respuestas solo viven en memoria (se pierden al recargar). */
let respuestasPrueba = [];

let guardado = cargar();
let diaMostrado = 0;
/** Pregunta en pantalla (0, 1, 2) o PREGUNTAS para el resumen. */
let vista = 0;

/* ---------- Almacenamiento ---------- */

function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) return JSON.parse(crudo);
  } catch (e) {
    // Sin almacenamiento (modo privado, etc.): se juega igual, sin memoria.
  }
  return { estadisticas: { ...ESTADISTICAS_INICIALES }, partida: null, reglasVistas: false };
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(guardado));
  } catch (e) {
    // Ídem.
  }
}

// Solo en local (Mac o móvil en la misma red): ?reiniciar borra la partida y la racha.
if (/^(localhost|127\.|10\.|192\.168\.)/.test(location.hostname) && parametros.has('reiniciar')) {
  try { localStorage.removeItem(CLAVE); } catch (e) { /* nada que borrar */ }
  guardado = cargar();
  history.replaceState(null, '', location.pathname);
}

/* ---------- Fechas (hora de Madrid) ---------- */

const RELOJ_MADRID = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Madrid',
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
});

function ahoraEnMadrid(momento = new Date()) {
  const p = {};
  for (const { type, value } of RELOJ_MADRID.formatToParts(momento)) p[type] = Number(value);
  return p;
}

/** Número del reto de hoy (nº 1 el día de INICIO). */
function numeroDeHoy() {
  const m = ahoraEnMadrid();
  const hoy = Date.UTC(m.year, m.month - 1, m.day);
  const inicio = Date.UTC(INICIO.anio, INICIO.mes - 1, INICIO.dia);
  return Math.max(1, Math.round((hoy - inicio) / MS_DIA) + 1);
}

/** Tiempo hasta la medianoche de Madrid, también los días de cambio de hora (23 o 25 horas). */
function cuentaAtras() {
  const ahora = Date.now();
  const m = ahoraEnMadrid(new Date(ahora));
  let s = 86400 - (m.hour * 3600 + m.minute * 60 + m.second);
  // Se mira qué hora marcará Madrid al cabo de s segundos y se corrige la diferencia.
  const luego = ahoraEnMadrid(new Date(ahora + s * 1000));
  const pasado = luego.hour * 3600 + luego.minute * 60 + luego.second;
  s = Math.max(0, luego.day === m.day ? s + 86400 - pasado : s - pasado);
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(Math.floor(s / 3600))}:${dos(Math.floor(s / 60) % 60)}:${dos(s % 60)}`;
}

/* ---------- Reto del día ---------- */

/** Días de contenido distintos; pasado el último, el ciclo vuelve a empezar. */
function diasDeContenido() {
  return Math.min(...porNivel.map((l) => l.length));
}

function retoDelDia(numero) {
  const i = (numero - 1) % diasDeContenido();
  return porNivel.map((lista) => lista[i]);
}

/** Generador pseudoaleatorio determinista (mulberry32): todos ven las opciones en el mismo orden. */
function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function respuestaCorrecta(e) {
  return e.formato === 'reves' ? e.gentilicio : e.etiqueta || e.lugar;
}

function opcionesDe(numero, indice, e) {
  const rnd = aleatorio(numero * 7919 + indice * 104729);
  const opciones = [respuestaCorrecta(e), ...e.falsas];
  for (let i = opciones.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
  }
  return opciones;
}

function respuestasDe(numero) {
  if (diaPrueba) return respuestasPrueba;
  return guardado.partida && guardado.partida.dia === numero ? guardado.partida.respuestas : [];
}

function aciertosDe(reto, respuestas) {
  return respuestas.map((r, i) => r === respuestaCorrecta(reto[i]));
}

/* ---------- Estadísticas ---------- */

/** La racha cuenta los días seguidos en que se juegan las tres preguntas, se acierte o no. */
function registrarDia(e, dia, aciertos) {
  if (e.ultimoDia === dia) return e;
  const racha = e.ultimoDia === dia - 1 ? e.racha + 1 : 1;
  return {
    dias: e.dias + 1,
    preguntas: e.preguntas + aciertos.length,
    aciertos: e.aciertos + aciertos.filter(Boolean).length,
    racha,
    mejorRacha: Math.max(e.mejorRacha, racha),
    ultimoDia: dia,
  };
}

/** Si se salta un día, la racha se pierde. */
function rachaVigente(e, hoy) {
  return e.ultimoDia >= hoy - 1 ? e.racha : 0;
}

/* ---------- Almanaque ---------- */

/** Con las tres preguntas de hoy jugadas, la mano ☜ marca Gentilicio como «Hecho» en Almanaque,
    y su hoja muestra los aciertos del día y la racha. */
function avisarAlmanaque(numero, reto, respuestas) {
  if (!window.almanaqueHecho) return;
  const aciertos = aciertosDe(reto, respuestas);
  window.almanaqueHecho({
    aciertos: aciertos.filter(Boolean).length,
    total: aciertos.length,
    racha: rachaVigente(guardado.estadisticas, numero),
  });
}

/* ---------- Interfaz ---------- */

function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function numeroActual() {
  return diaPrueba || numeroDeHoy();
}

function render() {
  const numero = numeroActual();
  if (numero !== diaMostrado) {
    diaMostrado = numero;
    vista = Math.min(respuestasDe(numero).length, PREGUNTAS);
  }
  const reto = retoDelDia(numero);
  const respuestas = respuestasDe(numero);
  const terminado = respuestas.length === PREGUNTAS;
  if (terminado && !diaPrueba) avisarAlmanaque(numero, reto, respuestas);

  document.getElementById('numero').textContent = `nº ${numero}`;
  document.getElementById('racha').innerHTML = diaPrueba
    ? 'prueba'
    : `${LLAMA}<span class="visualmente-oculto">Racha: </span>${rachaVigente(guardado.estadisticas, numero)}`;

  app.innerHTML = `
    ${diaPrueba ? avisoPrueba(numero) : ''}
    ${progreso(reto, respuestas)}
    ${vista < PREGUNTAS ? pregunta(numero, vista, reto[vista], respuestas[vista]) : resumen(numero, reto, respuestas)}
  `;

  app.querySelectorAll('.opcion').forEach((b) =>
    b.addEventListener('click', () => responder(numero, vista, b.dataset.valor)),
  );
  const seguir = app.querySelector('#seguir');
  if (seguir) {
    seguir.addEventListener('click', () => {
      vista++;
      render();
      scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  const compartirBoton = app.querySelector('#compartir');
  if (compartirBoton) compartirBoton.addEventListener('click', () => compartir(numero, aciertosDe(reto, respuestas)));
}

function avisoPrueba(numero) {
  const total = diasDeContenido();
  const enlace = (n, texto, etiqueta) =>
    `<a href="?dia=${n}" aria-label="${etiqueta}" ${n < 1 ? 'aria-disabled="true" tabindex="-1"' : ''}>${texto}</a>`;
  return `
    <p class="prueba">
      ${enlace(numero - 1, '‹', 'Día anterior')}
      <span>Modo prueba · día ${numero} (contenido ${((numero - 1) % total) + 1} de ${total})</span>
      ${enlace(numero + 1, '›', 'Día siguiente')}
    </p>`;
}

function progreso(reto, respuestas) {
  const aciertos = aciertosDe(reto, respuestas);
  const pasos = NIVELES.map((nombre, i) => {
    const estado = i < aciertos.length ? (aciertos[i] ? 'bien' : 'mal') : '';
    const texto = i < aciertos.length ? (aciertos[i] ? ', acertada' : ', fallada') : '';
    return `<li class="${estado} ${i === vista ? 'actual' : ''}" ${i === vista ? 'aria-current="step"' : ''}>${nombre}<span class="visualmente-oculto">${texto}</span></li>`;
  }).join('');
  return `<ol class="progreso" aria-label="Preguntas del día">${pasos}</ol>`;
}

function pregunta(numero, indice, e, respuesta) {
  const correcta = respuestaCorrecta(e);
  const jugada = respuesta !== undefined;
  const reves = e.formato === 'reves';
  const opciones = opcionesDe(numero, indice, e)
    .map((op) => {
      let estado = '';
      let senal = '';
      if (jugada) {
        if (op === correcta) {
          estado = 'correcta';
          senal = '✓ Correcta';
        } else if (op === respuesta) {
          estado = 'fallada';
          senal = '✗ Tu respuesta';
        } else {
          estado = 'apagada';
        }
      }
      return `<button class="opcion ${estado}" type="button" data-valor="${esc(op)}" ${jugada ? 'disabled' : ''}>
          <span>${esc(op)}</span>${senal ? `<span class="senal">${senal}</span>` : ''}
        </button>`;
    })
    .join('');

  return `
    <section class="reto ${reves ? 'reves' : ''}">
      ${reves ? '<p class="nivel">Del revés</p>' : ''}
      <p class="pregunta">${reves ? '¿Cómo se llama a los de…' : '¿De qué lugar es este gentilicio?'}</p>
      <p class="enunciado">${esc(reves ? e.etiqueta || e.lugar : e.gentilicio)}</p>
      <div class="opciones">${opciones}</div>
    </section>
    ${jugada ? revelacion(e, respuesta === correcta, indice === PREGUNTAS - 1) : ''}
  `;
}

function revelacion(e, acierto, ultima) {
  const correcta = respuestaCorrecta(e);
  return `
    <section class="revelacion">
      <p class="veredicto ${acierto ? 'bien' : 'mal'}">
        ${acierto ? '<span aria-hidden="true">✓</span> ¡Correcto!' : `<span aria-hidden="true">✗</span> No: es ${e.formato === 'reves' ? '' : 'de '}${esc(correcta)}.`}
      </p>
      ${detalle(e, true)}
    </section>
    <button id="seguir" class="boton" type="button">${ultima ? 'Ver resultado' : 'Siguiente'}</button>
  `;
}

/** Ficha del gentilicio: lugar, mapa (opcional), explicación, variantes y curiosidad. */
function detalle(e, conMapa) {
  const donde = [e.region !== e.lugar ? e.region : '', e.pais].filter(Boolean).join(', ');
  // Las variantes que la explicación ya menciona no se repiten debajo.
  const otras = (e.otras_formas || []).filter((f) => !e.explicacion.includes(f)).map((f) => `<em>${esc(f)}</em>`);
  return `
    <p class="ficha"><span class="lema">${esc(e.gentilicio)}</span> <span class="lugar">· de ${esc(e.lugar)} (${esc(donde)})</span></p>
    ${conMapa ? mapa(e) : ''}
    <p class="explicacion">${esc(e.explicacion)}</p>
    ${otras.length ? `<p class="otras">Otras formas: ${otras.join(', ')}.</p>` : ''}
    ${e.curiosidad ? `<p class="curiosidad"><strong>Curiosidad.</strong> ${esc(e.curiosidad)}</p>` : ''}
  `;
}

/* ---------- Mapa ---------- */

/** Misma fórmula que herramientas/generar-mapa.mjs. */
function proyectar(lienzo, lat, lon) {
  const c = Math.cos((lienzo.latRef * Math.PI) / 180);
  return [lienzo.k * c * (lon - lienzo.lon0), lienzo.k * (lienzo.lat0 - lat)];
}

function mapa(e) {
  if (!MAPA) return '';
  const lienzo = e.pais === 'España' ? MAPA.espana : MAPA.america;
  const [lat, lon] = e.coordenadas;
  const [x, y] = proyectar(lienzo, lat, lon);

  // España se ve entera; de América, un recorte con el lugar en el centro.
  let vx = 0;
  let vy = 0;
  let ancho = lienzo.ancho;
  let alto = lienzo.alto;
  if (lienzo === MAPA.america) {
    ancho = 300;
    alto = 236;
    vx = Math.min(Math.max(x - ancho / 2, 0), lienzo.ancho - ancho);
    vy = Math.min(Math.max(y - alto / 2, 0), lienzo.alto - alto);
  }

  const paises = Object.entries(lienzo.paises)
    .map(([nombre, d]) => {
      const clase = nombre === e.pais ? 'tierra destacada' : lienzo === MAPA.espana ? 'tierra otra' : 'tierra';
      return `<path class="${clase}" d="${d}"/>`;
    })
    .join('');

  const alturaChincheta = 30;
  const s = alturaChincheta / 184;
  const aLaIzquierda = x - vx > ancho * 0.62;
  const texto = `<text x="${(x + (aLaIzquierda ? -14 : 14)).toFixed(1)}" y="${(y - alturaChincheta * 0.62).toFixed(1)}" text-anchor="${aLaIzquierda ? 'end' : 'start'}" dominant-baseline="middle">${esc(e.lugar)}</text>`;

  return `
    <svg class="mapa" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${ancho} ${alto}" role="img" aria-label="Mapa: ${esc(e.lugar)}, ${esc(e.pais)}">
      <path class="tierra otra" d="${lienzo.otros}"/>
      ${paises}
      <ellipse class="sombra" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="2.2"/>
      <path class="chincheta" d="${CHINCHETA}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)}) translate(-246 -286)"/>
      <circle cx="${x.toFixed(1)}" cy="${(y - (286 - 168) * s).toFixed(1)}" r="3.6" class="ojo"/>
      ${texto}
    </svg>`;
}

/* ---------- Resumen ---------- */

function resumen(numero, reto, respuestas) {
  const aciertos = aciertosDe(reto, respuestas);
  const total = aciertos.filter(Boolean).length;
  const e = guardado.estadisticas;
  const porcentaje = e.preguntas ? Math.round((e.aciertos / e.preguntas) * 100) : 0;
  const lista = reto
    .map(
      (g, i) => `
        <li>
          <details>
            <summary>
              <span class="marca ${aciertos[i] ? 'bien' : 'mal'}" aria-label="${aciertos[i] ? 'Acierto' : 'Fallo'}">${aciertos[i] ? '✓' : '✗'}</span>
              <span class="lema">${esc(g.gentilicio)}</span>
              <span class="destino">${esc(g.etiqueta || g.lugar)}</span>
            </summary>
            <div class="detalle">${detalle(g, false)}</div>
          </details>
        </li>`,
    )
    .join('');

  return `
    <section class="resumen">
      <h2>${total} de ${PREGUNTAS}</h2>
      <ol class="lista-resumen">${lista}</ol>
      <p class="nota">Toca un gentilicio para repasar su historia.</p>
    </section>

    ${
      diaPrueba
        ? ''
        : `<section class="estadisticas" aria-label="Estadísticas">
            <div><strong>${e.dias}</strong><span>días</span></div>
            <div><strong>${porcentaje}%</strong><span>aciertos</span></div>
            <div><strong>${rachaVigente(e, numero)}</strong><span>racha</span></div>
            <div><strong>${e.mejorRacha}</strong><span>mejor racha</span></div>
          </section>`
    }

    <button id="compartir" class="boton" type="button">Compartir</button>
    <a class="boton boton-almanaque" data-almanaque-volver hidden href="https://joseleking.github.io/Almanaque/">☜ Regresar al Almanaque</a>
    <p class="siguiente">Nuevos gentilicios en <time id="cuenta">${cuentaAtras()}</time></p>
    <p class="creditos">Mapas de <a href="https://www.naturalearthdata.com" target="_blank" rel="noopener">Natural Earth</a> (dominio público).</p>
  `;
}

/* ---------- Acciones ---------- */

function responder(numero, indice, valor) {
  const respuestas = respuestasDe(numero);
  if (respuestas.length !== indice) return;
  const nuevas = [...respuestas, valor];
  if (diaPrueba) {
    respuestasPrueba = nuevas;
  } else {
    let estadisticas = guardado.estadisticas;
    if (nuevas.length === PREGUNTAS) {
      estadisticas = registrarDia(estadisticas, numero, aciertosDe(retoDelDia(numero), nuevas));
    }
    guardado = { ...guardado, estadisticas, partida: { dia: numero, respuestas: nuevas } };
    guardar();
  }
  render();
  const revelada = app.querySelector('.revelacion');
  if (revelada) revelada.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Una marca por gentilicio: ▰ acertado, ▱ fallado. «Gentilicio nº 7 ▰▱▰ 2/3 aciertos» y el enlace.
function textoCompartir(numero, aciertos) {
  const marcas = aciertos.map((a) => (a ? '▰' : '▱')).join('');
  return `Gentilicio nº ${numero} ${marcas} ${aciertos.filter(Boolean).length}/${aciertos.length} aciertos\njoseleking.github.io/Gentilicio`;
}

async function compartir(numero, aciertos) {
  const texto = textoCompartir(numero, aciertos);
  try {
    if (navigator.share) {
      await navigator.share({ text: texto });
      return;
    }
    await navigator.clipboard.writeText(texto);
    mostrarAviso('Resultado copiado');
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    mostrarAviso('No se pudo compartir');
  }
}

function mostrarAviso(texto) {
  aviso.textContent = texto;
  aviso.classList.add('visible');
  setTimeout(() => aviso.classList.remove('visible'), 2000);
}

/* ---------- Reglas ---------- */

reglas.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => reglas.close()));
reglas.addEventListener('click', (ev) => {
  if (ev.target === reglas) reglas.close();
});
document.getElementById('ayuda').addEventListener('click', () => reglas.showModal());

function reglasPrimeraVez() {
  if (guardado.reglasVistas) return;
  reglas.showModal();
  guardado = { ...guardado, reglasVistas: true };
  guardar();
}

/* ---------- Arranque ---------- */

/** La portada con el logo se ve al menos un instante y luego se desvanece. */
function retirarPortada() {
  const portada = document.getElementById('portada');
  if (!portada) return;
  setTimeout(() => {
    portada.classList.add('oculta');
    setTimeout(() => portada.remove(), 400);
  }, Math.max(0, 1200 - performance.now()));
}

async function iniciar() {
  try {
    const [entradas, mapa] = await Promise.all([
      fetch('data/gentilicios.json').then((r) => r.json()),
      fetch('data/mapa.json').then((r) => r.json()).catch(() => null),
    ]);
    ENTRADAS = entradas;
    MAPA = mapa;
    porNivel = [1, 2, 3].map((n) => ENTRADAS.filter((e) => e.nivel === n));
    if (!diasDeContenido()) throw new Error('Faltan gentilicios de algún nivel');
  } catch (err) {
    app.innerHTML = '<p class="error">No se han podido cargar los gentilicios. Prueba a recargar la página.</p>';
    retirarPortada();
    return;
  }

  render();
  retirarPortada();
  setTimeout(reglasPrimeraVez, 1000);

  // Cada segundo: la cuenta atrás y, a medianoche de Madrid, el reto nuevo.
  setInterval(() => {
    if (!diaPrueba && numeroDeHoy() !== diaMostrado) return render();
    const cuenta = document.getElementById('cuenta');
    if (cuenta) cuenta.textContent = cuentaAtras();
  }, 1000);
}

iniciar();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js');
}
