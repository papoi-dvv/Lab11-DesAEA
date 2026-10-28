/*
 * Inscripción rápida: panel lateral con lista de asistentes (con esqueleto de carga).
 * Cualquier elemento con [data-inscribir] lo abre; data-evento, data-titulo y data-meta lo describen.
 * También expone Aforo.actualizar() para refrescar el anillo de cupos sin recargar la página.
 */
(function () {
    'use strict';

    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    /* ---------- Anillo de aforo ---------- */
    window.Aforo = {
        actualizar: function (eventoId, inscritos, cupos) {
            $$('[data-aforo-evento="' + eventoId + '"]').forEach(function (el) {
                var aforo = inscritos + cupos;
                var pct = aforo === 0 ? 0 : Math.min(Math.floor(inscritos * 100 / aforo), 100);
                el.querySelector('.anillo__valor').style.strokeDashoffset = 100 - pct;
                el.querySelector('.anillo__pct').textContent = pct + '%';
                el.querySelector('[data-cupos]').textContent = cupos;
                el.querySelector('[data-inscritos]').textContent = inscritos;
                el.classList.toggle('aforo--alto', pct >= 80 && pct < 100);
                el.classList.toggle('aforo--lleno', pct >= 100);
                var ultimos = cupos > 0 && (cupos <= 5 || pct >= 90);
                el.classList.toggle('aforo--ultimos', ultimos);
                var aviso = el.querySelector('.aforo__aviso');
                if (aviso) { aviso.textContent = cupos === 0 ? 'Agotado' : (ultimos ? '¡Quedan ' + cupos + '!' : ''); }
                el.classList.add('aforo--pulso');
                setTimeout(function () { el.classList.remove('aforo--pulso'); }, 700);
            });
        }
    };

    /* ---------- Panel lateral ---------- */
    var drawer = $('#drawer');
    if (!drawer) { return; }

    var lista = $('#drawerLista');
    var buscar = $('#drawerBuscar');
    var aviso = $('#drawerAviso');
    var ok = $('#drawerOk');
    var eventoId = null;
    var elegido = null;
    var foco = null;
    var asistentes = [];

    function token() { var t = $('#af input[name=__RequestVerificationToken]'); return t ? t.value : ''; }
    function iniciales(n) { return n.split(' ').filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase(); }
    function normal(t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

    function esqueleto() {
        lista.innerHTML = '';
        for (var i = 0; i < 6; i++) {
            var f = document.createElement('div');
            f.className = 'esqueleto-fila';
            f.innerHTML = '<span class="esqueleto esqueleto--circulo"></span><span class="esqueleto-col"><span class="esqueleto esqueleto--linea"></span><span class="esqueleto esqueleto--linea esqueleto--corta"></span></span>';
            lista.appendChild(f);
        }
    }

    function pintar() {
        var q = normal(buscar.value.trim());
        lista.innerHTML = '';
        var visibles = asistentes.filter(function (a) { return !q || normal(a.nombres + ' ' + a.dni).indexOf(q) !== -1; });
        if (!visibles.length) {
            lista.innerHTML = '<div class="drawer__vacio">No hay asistentes que coincidan.</div>';
            return;
        }
        visibles.forEach(function (a, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'fila-asist' + (a.yaInscrito ? ' fila-asist--inscrito' : '') + (a.id === elegido ? ' fila-asist--elegida' : '');
            b.style.setProperty('--i', i);
            b.setAttribute('role', 'option');
            b.setAttribute('aria-selected', a.id === elegido ? 'true' : 'false');
            b.disabled = a.yaInscrito;
            b.innerHTML = '<span class="dd__avatar"></span><span class="fila-asist__cuerpo"><b></b><small></small></span><span class="fila-asist__estado"></span>';
            b.querySelector('.dd__avatar').textContent = iniciales(a.nombres);
            b.querySelector('b').textContent = a.nombres;
            b.querySelector('small').textContent = 'DNI ' + a.dni;
            b.querySelector('.fila-asist__estado').textContent = a.yaInscrito ? 'Inscrito' : '';
            b.addEventListener('click', function () { elegido = a.id; ok.disabled = false; aviso.textContent = ''; pintar(); });
            lista.appendChild(b);
        });
    }

    function abrir(btn) {
        foco = document.activeElement;
        eventoId = btn.dataset.evento;
        elegido = null;
        ok.disabled = true;
        aviso.textContent = '';
        buscar.value = '';
        $('#drawerTitulo').textContent = btn.dataset.titulo || 'Evento';
        $('#drawerMeta').textContent = btn.dataset.meta || '';
        drawer.hidden = false;
        drawer.setAttribute('aria-hidden', 'false');
        void drawer.offsetWidth;
        drawer.classList.add('drawer--abierto');
        document.body.classList.add('sin-scroll');
        esqueleto();

        fetch('/Inscripciones/Asistentes?eventoId=' + encodeURIComponent(eventoId), { headers: { Accept: 'application/json' } })
            .then(function (r) { if (!r.ok) { throw new Error(); } return r.json(); })
            .then(function (datos) {
                asistentes = datos.map(function (d) { return { id: d.id, nombres: d.nombres, dni: d.dni, yaInscrito: d.yaInscrito }; });
                pintar();
                buscar.focus();
            })
            .catch(function () { lista.innerHTML = '<div class="drawer__vacio">No se pudo cargar la lista. Intenta de nuevo.</div>'; });
    }

    function cerrar() {
        drawer.classList.remove('drawer--abierto');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('sin-scroll');
        setTimeout(function () { drawer.hidden = true; }, 320);
        if (foco) { foco.focus(); }
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-inscribir]');
        if (btn) { e.preventDefault(); abrir(btn); }
    });
    drawer.addEventListener('click', function (e) { if (e.target.closest('[data-cerrar]')) { cerrar(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) { cerrar(); } });
    buscar.addEventListener('input', pintar);

    ok.addEventListener('click', function () {
        if (!elegido) { return; }
        ok.classList.add('btn--cargando');
        var datos = new URLSearchParams({ eventoId: eventoId, asistenteId: elegido });
        fetch('/Inscripciones/Rapida', {
            method: 'POST',
            headers: { 'RequestVerificationToken': token(), 'Content-Type': 'application/x-www-form-urlencoded' },
            body: datos
        })
            .then(function (r) { return r.json(); })
            .then(function (r) {
                ok.classList.remove('btn--cargando');
                if (!r.ok) { aviso.textContent = r.mensaje; aviso.className = 'drawer__aviso drawer__aviso--error'; return; }
                aviso.className = 'drawer__aviso';
                asistentes.forEach(function (a) { if (a.id === elegido) { a.yaInscrito = true; } });
                elegido = null;
                ok.disabled = true;
                pintar();
                window.Aforo.actualizar(eventoId, r.inscritos, r.cupos);
                window.Toast.mostrar(r.mensaje, 'exito');
                setTimeout(cerrar, 500);
            })
            .catch(function () {
                ok.classList.remove('btn--cargando');
                aviso.textContent = 'No se pudo inscribir. Intenta de nuevo.';
                aviso.className = 'drawer__aviso drawer__aviso--error';
            });
    });
})();
