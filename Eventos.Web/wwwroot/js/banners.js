/* Carrusel de banners: avance automático, pausa al pasar el cursor, flechas, puntos con progreso, teclado y deslizar. */
(function () {
    'use strict';

    var raiz = document.querySelector('.banners');
    if (!raiz) { return; }

    var slides = Array.prototype.slice.call(raiz.querySelectorAll('.banner'));
    var puntos = Array.prototype.slice.call(raiz.querySelectorAll('.banners__punto'));
    if (slides.length < 2) { return; }

    var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var indice = 0;
    var DURACION = 7000;
    var temporizador = null;
    var pausado = false;

    function mostrar(i, auto) {
        indice = (i + slides.length) % slides.length;
        slides.forEach(function (s, n) {
            s.classList.toggle('banner--activo', n === indice);
            s.setAttribute('aria-hidden', n === indice ? 'false' : 'true');
            s.tabIndex = -1;
            Array.prototype.forEach.call(s.querySelectorAll('a,button'), function (el) { el.tabIndex = n === indice ? 0 : -1; });
        });
        puntos.forEach(function (p, n) {
            p.classList.toggle('banners__punto--activo', n === indice);
            p.setAttribute('aria-current', n === indice ? 'true' : 'false');
            // Reinicia la animación de progreso del punto activo.
            p.style.animation = 'none'; void p.offsetWidth; p.style.animation = '';
        });
        if (!auto) { programar(); }
    }

    function programar() {
        clearTimeout(temporizador);
        if (reducido || pausado) { return; }
        temporizador = setTimeout(function () { mostrar(indice + 1, false); }, DURACION);
    }

    function pausar(v) {
        pausado = v;
        raiz.classList.toggle('banners--pausa', v);
        if (v) { clearTimeout(temporizador); } else { mostrar(indice, false); }
    }

    raiz.querySelector('[data-prev]').addEventListener('click', function () { mostrar(indice - 1, false); });
    raiz.querySelector('[data-next]').addEventListener('click', function () { mostrar(indice + 1, false); });
    puntos.forEach(function (p, n) { p.addEventListener('click', function () { mostrar(n, false); }); });

    raiz.addEventListener('mouseenter', function () { pausar(true); });
    raiz.addEventListener('mouseleave', function () { pausar(false); });
    raiz.addEventListener('focusin', function () { pausar(true); });
    raiz.addEventListener('focusout', function () { pausar(false); });
    raiz.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { mostrar(indice - 1, false); }
        if (e.key === 'ArrowRight') { mostrar(indice + 1, false); }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { clearTimeout(temporizador); } else { programar(); } });

    var x0 = null;
    raiz.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') { x0 = e.clientX; } });
    raiz.addEventListener('pointerup', function (e) {
        if (x0 === null) { return; }
        var dx = e.clientX - x0;
        x0 = null;
        if (Math.abs(dx) > 50) { mostrar(indice + (dx < 0 ? 1 : -1), false); }
    });

    mostrar(0, false);
})();
