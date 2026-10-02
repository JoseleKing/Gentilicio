/* Volver a Almanaque
   Muestra una franja con una mano ☜ en lo alto del juego para regresar a Almanaque.
   Solo aparece si se llegó desde Almanaque (que añade ?desde=almanaque&juego=<id> al enlace)
   y se mantiene mientras siga abierta esa pestaña.
   Cuando el jugador termine la partida de hoy, el juego debe llamar a
     window.almanaqueHecho && window.almanaqueHecho();
   (también al abrir el juego con la partida de hoy ya terminada). Así la mano ☜ lleva
   a Almanaque el aviso y la hoja del juego se marca como «Hecho».
   Copia de referencia: se guarda en el repo de Almanaque, en para-los-juegos/.
   Cada juego incluye su propia copia con:
   <script src="volver-almanaque.js" defer></script> */
(function () {
  'use strict';

  var ALMANAQUE = 'https://joseleking.github.io/Almanaque/';
  var CLAVE = 'almanaque:volver';
  var CLAVE_JUEGO = 'almanaque:juego';
  var CLAVE_HECHO = 'almanaque:hecho';
  var desdeAlmanaque = false;
  var juego = null;

  function leer(clave) {
    try { return window.sessionStorage.getItem(clave); } catch (e) { return null; }
  }

  function guardar(clave, valor) {
    try { window.sessionStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ }
  }

  try {
    var url = new URL(window.location.href);
    if (url.searchParams.get('desde') === 'almanaque') {
      desdeAlmanaque = true;
      juego = url.searchParams.get('juego');
      // Limpia la dirección para que no se comparta con los parámetros.
      url.searchParams.delete('desde');
      url.searchParams.delete('juego');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  } catch (e) { /* navegador antiguo: se ignora */ }

  if (desdeAlmanaque) {
    guardar(CLAVE, '1');
    if (juego) guardar(CLAVE_JUEGO, juego);
  } else {
    desdeAlmanaque = leer(CLAVE) === '1';
    juego = leer(CLAVE_JUEGO);
  }

  function hoy() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  // El juego avisa de que la partida de hoy está terminada.
  window.almanaqueHecho = function () {
    guardar(CLAVE_HECHO, hoy());
    actualizarEnlace();
  };

  if (!desdeAlmanaque) return;

  // La mano lleva ?hecho=<id> solo si el juego ha avisado hoy en esta pestaña.
  function destino() {
    if (!juego || leer(CLAVE_HECHO) !== hoy()) return ALMANAQUE;
    return ALMANAQUE + '?hecho=' + encodeURIComponent(juego);
  }

  function actualizarEnlace() {
    var enlace = document.getElementById('almanaque-volver');
    if (enlace) enlace.href = destino();
  }

  function mostrar() {
    if (document.getElementById('almanaque-volver')) return;

    var estilo = document.createElement('style');
    estilo.textContent =
      '#almanaque-volver{display:flex;align-items:center;gap:.45em;box-sizing:border-box;width:100%;' +
      'margin:0;padding:.4rem max(1rem,env(safe-area-inset-right)) .4rem max(1rem,env(safe-area-inset-left));' +
      'padding-top:max(.4rem,env(safe-area-inset-top));' +
      'font:inherit;font-size:.9rem;line-height:1.2;letter-spacing:.06em;font-variant:small-caps;' +
      'color:inherit;text-decoration:none;opacity:.78;position:relative;z-index:1;' +
      'border-bottom:1px solid currentColor;border-bottom-color:color-mix(in srgb,currentColor 18%,transparent);' +
      '-webkit-tap-highlight-color:transparent}' +
      '#almanaque-volver:hover,#almanaque-volver:focus-visible{opacity:1}' +
      '#almanaque-volver:focus-visible{outline:2px solid currentColor;outline-offset:-4px}' +
      '#almanaque-volver .almanaque-volver__mano{font-size:1.7em;line-height:.8;font-variant:normal;' +
      'transition:transform .18s ease}' +
      '#almanaque-volver:hover .almanaque-volver__mano{transform:translateX(-3px)}' +
      '@media (prefers-reduced-motion:reduce){#almanaque-volver .almanaque-volver__mano{transition:none}}';
    document.head.appendChild(estilo);

    var enlace = document.createElement('a');
    enlace.id = 'almanaque-volver';
    enlace.href = destino();
    enlace.setAttribute('aria-label', 'Volver a Almanaque');
    // Se recalcula al tocar por si la pestaña ha pasado la medianoche.
    enlace.addEventListener('click', function () { enlace.href = destino(); });

    var mano = document.createElement('span');
    mano.className = 'almanaque-volver__mano';
    mano.setAttribute('aria-hidden', 'true');
    mano.textContent = '☜';

    enlace.appendChild(mano);
    enlace.appendChild(document.createTextNode('Almanaque'));
    document.body.insertBefore(enlace, document.body.firstChild);
  }

  if (document.body) mostrar();
  else document.addEventListener('DOMContentLoaded', mostrar);
})();
