/*
 * Selector de fecha y hora propio.
 * Reemplaza visualmente <input data-datetime> (datetime-local). El input original queda oculto dentro del
 * formulario con el valor "yyyy-MM-ddTHH:mm", así que el model binding y la validación no cambian.
 *
 * Teclado en el calendario: flechas = días, Re Pág / Av Pág = mes, Enter o espacio = elegir, Esc = cerrar.
 */
(function () {
    'use strict';

    var DIAS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];
    var fmtMes = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' });
    var fmtCorto = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    var fmtLargo = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function clave(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function mismoDia(a, b) { return !!a && !!b && clave(a) === clave(b); }
    function sumarDias(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes()); }
    function sumarMeses(d, n) {
        var r = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes());
        var ultimo = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
        r.setDate(Math.min(d.getDate(), ultimo));
        return r;
    }
    function mayuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

    function leer(valor) {
        var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(valor || '');
        return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
    }
    function escribir(d) {
        return clave(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    var ICONO_CAL = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="14" height="12.5" rx="2.5"/><path d="M3 8.5h14M7 2.5v3M13 2.5v3"/></svg>';
    var FLECHA = function (dir) {
        return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="' + (dir < 0 ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    };

    function crear(input) {
        var seleccion = leer(input.value);
        var base = seleccion || new Date();
        var mes = new Date(base.getFullYear(), base.getMonth(), 1);
        var foco = seleccion ? new Date(seleccion) : new Date();

        var raiz = document.createElement('div');
        raiz.className = 'dd dd--fecha';

        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'dd__boton';
        boton.setAttribute('aria-haspopup', 'dialog');
        boton.setAttribute('aria-expanded', 'false');
        boton.innerHTML = '<span class="dd__icono">' + ICONO_CAL + '</span><span class="dd__texto"></span>';
        var texto = boton.querySelector('.dd__texto');

        var panel = document.createElement('div');
        panel.className = 'dd__panel cal';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Elegir fecha y hora');
        panel.innerHTML =
            '<div class="cal__cabecera">' +
            '<button type="button" class="cal__nav" data-nav="-1" aria-label="Mes anterior">' + FLECHA(-1) + '</button>' +
            '<strong class="cal__titulo" aria-live="polite"></strong>' +
            '<button type="button" class="cal__nav" data-nav="1" aria-label="Mes siguiente">' + FLECHA(1) + '</button>' +
            '</div>' +
            '<div class="cal__semana">' + DIAS.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
            '<div class="cal__grilla" role="grid"></div>' +
            '<div class="cal__hora">' +
            '<div class="cal__hora-titulo"><span>Hora</span><b class="cal__hora-valor"></b></div>' +
            '<div class="cal__columnas">' +
            '<div class="cal__col" data-col="h" role="listbox" aria-label="Hora"></div>' +
            '<span class="cal__dos">:</span>' +
            '<div class="cal__col" data-col="m" role="listbox" aria-label="Minutos"></div>' +
            '</div></div>' +
            '<div class="cal__pie"><button type="button" class="cal__texto-btn" data-accion="hoy">Hoy</button>' +
            '<button type="button" class="btn btn--primario btn--chico" data-accion="listo">Listo</button></div>';

        raiz.appendChild(boton);
        raiz.appendChild(panel);
        input.parentNode.insertBefore(raiz, input.nextSibling);
        input.classList.add('dd__nativo');
        input.tabIndex = -1;
        input.setAttribute('aria-hidden', 'true');

        var titulo = panel.querySelector('.cal__titulo');
        var grilla = panel.querySelector('.cal__grilla');
        var colH = panel.querySelector('[data-col=h]');
        var colM = panel.querySelector('[data-col=m]');
        var horaValor = panel.querySelector('.cal__hora-valor');

        for (var h = 0; h < 24; h++) { colH.appendChild(opcionHora('h', h)); }
        for (var m = 0; m < 60; m += 5) { colM.appendChild(opcionHora('m', m)); }

        function opcionHora(tipo, n) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'cal__opcion';
            b.dataset.tipo = tipo;
            b.dataset.valor = n;
            b.textContent = pad(n);
            b.setAttribute('role', 'option');
            return b;
        }

        function abierto() { return raiz.classList.contains('dd--abierto'); }

        function pintarTexto() {
            if (seleccion) {
                texto.textContent = fmtCorto.format(seleccion).replace(/\./g, '') + ' · ' + pad(seleccion.getHours()) + ':' + pad(seleccion.getMinutes());
                texto.classList.remove('dd__texto--placeholder');
            } else {
                texto.textContent = 'Elige fecha y hora';
                texto.classList.add('dd__texto--placeholder');
            }
        }

        function pintarHora(desplazar) {
            var hh = seleccion ? seleccion.getHours() : -1;
            var mm = seleccion ? seleccion.getMinutes() : -1;
            panel.querySelectorAll('.cal__opcion').forEach(function (b) {
                var v = +b.dataset.valor;
                var on = b.dataset.tipo === 'h' ? v === hh : v === Math.round(mm / 5) * 5 % 60;
                b.classList.toggle('cal__opcion--elegida', on);
                b.setAttribute('aria-selected', on ? 'true' : 'false');
                if (on && desplazar) { b.parentNode.scrollTop = b.offsetTop - b.parentNode.clientHeight / 2 + b.offsetHeight / 2; }
            });
            horaValor.textContent = seleccion ? pad(hh) + ':' + pad(mm) : '--:--';
        }

        function pintarMes(enfocar) {
            titulo.textContent = mayuscula(fmtMes.format(mes));
            var primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
            var desfase = (primero.getDay() + 6) % 7;
            var inicio = new Date(mes.getFullYear(), mes.getMonth(), 1 - desfase);
            var hoy = new Date();
            var html = '';
            for (var i = 0; i < 42; i++) {
                var d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
                var clases = 'cal__dia';
                if (d.getMonth() !== mes.getMonth()) { clases += ' cal__dia--fuera'; }
                if (mismoDia(d, hoy)) { clases += ' cal__dia--hoy'; }
                if (mismoDia(d, seleccion)) { clases += ' cal__dia--elegido'; }
                html += '<button type="button" role="gridcell" class="' + clases + '" data-dia="' + clave(d) + '" tabindex="' + (mismoDia(d, foco) ? 0 : -1) +
                    '" aria-label="' + fmtLargo.format(d) + '"' + (mismoDia(d, seleccion) ? ' aria-selected="true"' : '') + '>' + d.getDate() + '</button>';
            }
            grilla.innerHTML = html;
            grilla.classList.remove('cal__grilla--anim');
            void grilla.offsetWidth;
            grilla.classList.add('cal__grilla--anim');
            if (enfocar) {
                var f = grilla.querySelector('[data-dia="' + clave(foco) + '"]');
                if (f) { f.focus(); }
            }
        }

        function confirmar() {
            input.value = escribir(seleccion);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            pintarTexto();
            pintarHora(false);
        }

        function elegirDia(d) {
            var previo = seleccion || new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0);
            seleccion = new Date(d.getFullYear(), d.getMonth(), d.getDate(), previo.getHours(), previo.getMinutes());
            foco = new Date(seleccion);
            mes = new Date(seleccion.getFullYear(), seleccion.getMonth(), 1);
            confirmar();
            pintarMes(true);
        }

        function irAMes(delta) {
            mes = sumarMeses(mes, delta);
            foco = new Date(mes.getFullYear(), mes.getMonth(), Math.min(foco.getDate(), new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()));
            pintarMes(false);
        }

        function abrir() {
            if (abierto()) { return; }
            document.dispatchEvent(new CustomEvent('dd:abrir', { detail: raiz }));
            seleccion = leer(input.value);
            foco = seleccion ? new Date(seleccion) : new Date();
            mes = new Date(foco.getFullYear(), foco.getMonth(), 1);
            raiz.classList.add('dd--abierto');
            boton.setAttribute('aria-expanded', 'true');
            raiz.classList.toggle('dd--arriba', window.innerHeight - boton.getBoundingClientRect().bottom < 460);
            pintarMes(false);
            pintarHora(true);
            setTimeout(function () {
                var f = grilla.querySelector('[tabindex="0"]');
                if (f) { f.focus({ preventScroll: true }); }
                panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }, 30);
        }

        function cerrar(devolverFoco) {
            if (!abierto()) { return; }
            raiz.classList.remove('dd--abierto');
            boton.setAttribute('aria-expanded', 'false');
            if (devolverFoco) { boton.focus(); }
        }

        boton.addEventListener('click', function () { abierto() ? cerrar(false) : abrir(); });
        boton.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' && !abierto()) { e.preventDefault(); abrir(); }
        });

        panel.addEventListener('click', function (e) {
            var dia = e.target.closest('.cal__dia');
            if (dia) { var p = dia.dataset.dia.split('-'); elegirDia(new Date(+p[0], +p[1] - 1, +p[2])); return; }

            var nav = e.target.closest('[data-nav]');
            if (nav) { irAMes(+nav.dataset.nav); return; }

            var op = e.target.closest('.cal__opcion');
            if (op) {
                if (!seleccion) { var b = new Date(); seleccion = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 18, 0); foco = new Date(seleccion); pintarMes(false); }
                var v = +op.dataset.valor;
                if (op.dataset.tipo === 'h') { seleccion.setHours(v); } else { seleccion.setMinutes(v); }
                confirmar();
                return;
            }

            var acc = e.target.closest('[data-accion]');
            if (acc && acc.dataset.accion === 'hoy') {
                var n = new Date();
                elegirDia(seleccion ? new Date(n.getFullYear(), n.getMonth(), n.getDate(), seleccion.getHours(), seleccion.getMinutes()) : n);
            } else if (acc && acc.dataset.accion === 'listo') {
                if (!seleccion) { elegirDia(foco); }
                cerrar(true);
            }
        });

        panel.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { e.preventDefault(); cerrar(true); return; }
            var dia = e.target.closest('.cal__dia');
            if (!dia) { return; }
            var paso = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
            if (paso) {
                e.preventDefault();
                foco = sumarDias(foco, paso);
                if (foco.getMonth() !== mes.getMonth() || foco.getFullYear() !== mes.getFullYear()) { mes = new Date(foco.getFullYear(), foco.getMonth(), 1); }
                pintarMes(true);
            } else if (e.key === 'PageUp' || e.key === 'PageDown') {
                e.preventDefault();
                foco = sumarMeses(foco, e.key === 'PageUp' ? -1 : 1);
                mes = new Date(foco.getFullYear(), foco.getMonth(), 1);
                pintarMes(true);
            } else if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                foco = sumarDias(foco, e.key === 'Home' ? -((foco.getDay() + 6) % 7) : 6 - ((foco.getDay() + 6) % 7));
                pintarMes(true);
            }
        });

        document.addEventListener('click', function (e) { if (!raiz.contains(e.target)) { cerrar(false); } });
        document.addEventListener('dd:abrir', function (e) { if (e.detail !== raiz) { cerrar(false); } });

        if (input.id) {
            var etiqueta = document.querySelector('label[for="' + input.id + '"]');
            if (etiqueta) { etiqueta.addEventListener('click', function (e) { e.preventDefault(); boton.focus(); }); }
        }

        pintarTexto();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('input[data-datetime]').forEach(crear);
    });
})();
