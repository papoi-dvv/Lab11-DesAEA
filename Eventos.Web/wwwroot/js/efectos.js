/* Micro-interacciones de botones: ondas al pulsar y estado de carga al enviar formularios. */
(function () {
    'use strict';

    document.addEventListener('pointerdown', function (e) {
        var btn = e.target.closest('.btn');
        if (!btn || btn.classList.contains('btn--cargando')) { return; }
        var caja = btn.getBoundingClientRect();
        var d = Math.max(caja.width, caja.height) * 2;
        var onda = document.createElement('span');
        onda.className = 'onda';
        onda.style.width = onda.style.height = d + 'px';
        onda.style.left = (e.clientX - caja.left - d / 2) + 'px';
        onda.style.top = (e.clientY - caja.top - d / 2) + 'px';
        btn.appendChild(onda);
        onda.addEventListener('animationend', function () { onda.remove(); });
    });

    document.addEventListener('submit', function (e) {
        var form = e.target;
        // Espera a que la validación del cliente (jQuery Validate) decida si se envía.
        setTimeout(function () {
            if (e.defaultPrevented) { return; }
            var btn = form.querySelector('button[type=submit].btn');
            if (btn) {
                btn.classList.add('btn--cargando');
                btn.setAttribute('aria-busy', 'true');
            }
        }, 0);
    });

    // Al volver con el botón "atrás" el botón no debe quedar bloqueado.
    window.addEventListener('pageshow', function () {
        document.querySelectorAll('.btn--cargando').forEach(function (b) {
            b.classList.remove('btn--cargando');
            b.removeAttribute('aria-busy');
        });
    });
})();
