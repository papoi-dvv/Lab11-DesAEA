/*
 * Interfaz global: navegación segmentada, modo oscuro, barra de progreso, toasts, modal de confirmación
 * y cuenta regresiva de eventos.
 */
(function () {
    'use strict';

    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    function guardar(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }
    function leer(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

    /* ---------- Navegación segmentada: la pastilla viaja desde la sección anterior ---------- */
    var segmento = $('#segmento');
    var pastilla = $('#pastilla');

    function medida() {
        var activo = $('.segmento__op.activo', segmento);
        return activo ? { x: activo.offsetLeft, w: activo.offsetWidth } : null;
    }
    function ponerPastilla(m, animar) {
        pastilla.style.transition = animar ? '' : 'none';
        pastilla.style.width = m.w + 'px';
        pastilla.style.transform = 'translateX(' + m.x + 'px)';
    }
    if (segmento && pastilla) {
        var actual = medida();
        if (actual) {
            var previa = null;
            try { previa = JSON.parse(leer('pastilla')); } catch (e) { }
            ponerPastilla(previa || actual, false);
            void pastilla.offsetWidth;
            requestAnimationFrame(function () {
                ponerPastilla(actual, true);
                pastilla.classList.add('segmento__pastilla--lista');
            });
            guardar('pastilla', JSON.stringify(actual));
        } else {
            pastilla.hidden = true;
        }
        var recalcular = function () { var m = medida(); if (m) { ponerPastilla(m, false); guardar('pastilla', JSON.stringify(m)); } };
        window.addEventListener('resize', recalcular);
        if (document.fonts && document.fonts.ready) { document.fonts.ready.then(recalcular); }
    }

    /* ---------- Modo claro / oscuro ---------- */
    var temaBtn = $('#temaBtn');
    if (temaBtn) {
        temaBtn.addEventListener('click', function () {
            var nuevo = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
            document.documentElement.classList.add('cambiando-tema');
            document.documentElement.dataset.tema = nuevo;
            try { localStorage.setItem('tema', nuevo); } catch (e) { }
            setTimeout(function () { document.documentElement.classList.remove('cambiando-tema'); }, 400);
        });
    }

    /* ---------- Barra de progreso al navegar ---------- */
    var progreso = $('#progreso');
    function iniciarProgreso() { if (progreso) { progreso.classList.remove('progreso--fin'); progreso.classList.add('progreso--activo'); } }
    document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href]');
        if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) { return; }
        if (a.target === '_blank' || a.hasAttribute('download') || a.origin !== location.origin) { return; }
        if (a.pathname === location.pathname && a.search === location.search) { return; }
        iniciarProgreso();
    });
    document.addEventListener('submit', function (e) {
        setTimeout(function () { if (!e.defaultPrevented) { iniciarProgreso(); } }, 0);
    });
    window.addEventListener('pageshow', function () {
        if (progreso) { progreso.classList.remove('progreso--activo'); }
    });

    /* ---------- Toasts ---------- */
    var contenedor = $('#toasts');

    function cerrarToast(t) {
        if (!t || t.classList.contains('toast--sale')) { return; }
        t.classList.add('toast--sale');
        setTimeout(function () { t.remove(); }, 300);
    }
    function conectarToast(t) {
        var tiempo = $('.toast__tiempo', t);
        if (tiempo) {
            tiempo.style.animationDuration = $('.toast__form', t) ? '9s' : '6s';
            tiempo.addEventListener('animationend', function () { cerrarToast(t); });
        }
        var x = $('.toast__cerrar', t);
        if (x) { x.addEventListener('click', function () { cerrarToast(t); }); }
    }
    $$('.toast', contenedor).forEach(conectarToast);

    window.Toast = {
        mostrar: function (texto, tipo) {
            var t = document.createElement('div');
            t.className = 'toast toast--' + (tipo || 'exito');
            t.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
            var icono = document.createElement('span');
            icono.className = 'toast__icono';
            icono.innerHTML = tipo === 'error'
                ? '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 4.5v4M8 11.2v.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
                : '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            var span = document.createElement('span');
            span.className = 'toast__texto';
            span.textContent = texto;
            var cerrar = document.createElement('button');
            cerrar.type = 'button';
            cerrar.className = 'toast__cerrar';
            cerrar.setAttribute('aria-label', 'Cerrar');
            cerrar.textContent = '×';
            var barra = document.createElement('span');
            barra.className = 'toast__tiempo';
            t.appendChild(icono); t.appendChild(span); t.appendChild(cerrar); t.appendChild(barra);
            contenedor.appendChild(t);
            conectarToast(t);
        }
    };

    /* ---------- Modal de confirmación (reemplaza confirm()) ---------- */
    var modal = $('#modal');
    var modalOk = $('#modalOk');
    var pendiente = null;
    var foco = null;

    function abrirModal(form) {
        pendiente = form;
        foco = document.activeElement;
        var peligro = (form.dataset.confirmTipo || 'peligro') === 'peligro';
        $('#modalTitulo').textContent = form.dataset.confirmTitulo || '¿Confirmar acción?';
        $('#modalTexto').textContent = form.dataset.confirmTexto || '';
        modalOk.textContent = form.dataset.confirmBoton || 'Confirmar';
        modalOk.className = 'btn ' + (peligro ? 'btn--peligro' : 'btn--primario');
        $('#modalIcono').className = 'modal__icono' + (peligro ? '' : ' modal__icono--info');
        modal.hidden = false;
        void modal.offsetWidth;
        modal.classList.add('modal--abierto');
        document.body.classList.add('sin-scroll');
        modalOk.focus();
    }
    function cerrarModal() {
        modal.classList.remove('modal--abierto');
        document.body.classList.remove('sin-scroll');
        setTimeout(function () { modal.hidden = true; }, 220);
        pendiente = null;
        if (foco) { foco.focus(); }
    }

    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!form.hasAttribute('data-confirm-titulo') || form.dataset.confirmado === '1') { return; }
        e.preventDefault();
        e.stopImmediatePropagation();
        abrirModal(form);
    }, true);

    if (modal) {
        modal.addEventListener('click', function (e) { if (e.target.closest('[data-cerrar]')) { cerrarModal(); } });
        modalOk.addEventListener('click', function () {
            var form = pendiente;
            cerrarModal();
            if (form) { form.dataset.confirmado = '1'; form.requestSubmit(); }
        });
        document.addEventListener('keydown', function (e) {
            if (modal.hidden) { return; }
            if (e.key === 'Escape') { cerrarModal(); }
            if (e.key === 'Tab') {
                var f = $$('button', modal);
                var i = f.indexOf(document.activeElement);
                e.preventDefault();
                f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
            }
        });
    }

    /* ---------- Cuenta regresiva ("cuánto falta") ---------- */
    function faltan(inicio, ahora) {
        var diff = inicio - ahora;
        var min = diff / 60000;
        if (min < -180) { return 'Finalizado'; }
        if (min < 0) { return 'En curso'; }
        if (min < 60) { return 'Empieza en ' + Math.max(Math.floor(min), 1) + ' min'; }
        var dias = Math.round((new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()) - new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())) / 86400000);
        if (dias === 0) { return 'Hoy · en ' + Math.floor(min / 60) + ' h'; }
        if (dias === 1) { return 'Mañana'; }
        if (dias < 14) { return 'En ' + dias + ' días'; }
        if (dias < 60) { return 'En ' + Math.floor(dias / 7) + ' semanas'; }
        return 'En ' + Math.floor(dias / 30) + ' meses';
    }
    function refrescarCuentas() {
        var ahora = new Date();
        $$('[data-inicio]').forEach(function (el) {
            var inicio = new Date(el.dataset.inicio);
            if (isNaN(inicio)) { return; }
            var t = $('.cuenta__texto', el);
            if (t) { t.textContent = faltan(inicio, ahora); }
            var h = (inicio - ahora) / 3600000;
            el.classList.toggle('cuenta--urgente', h >= 0 && h < 24);
            el.classList.toggle('cuenta--fin', h < -3);
        });
    }
    refrescarCuentas();
    setInterval(refrescarCuentas, 30000);
})();
