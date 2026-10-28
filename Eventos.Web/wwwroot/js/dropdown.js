/*
 * Componente Dropdown propio.
 * Reemplaza visualmente cualquier <select data-dropdown> y mantiene el <select> original
 * (oculto, pero dentro del formulario) como fuente de verdad: model binding y validación siguen igual.
 *
 *   data-dropdown               activa el componente
 *   data-dropdown="persona"     muestra avatar con iniciales
 *   "Título · detalle"          el texto de cada opción se separa en título y subtítulo
 */
(function () {
    'use strict';

    var contador = 0;

    function iniciales(texto) {
        return texto.split(' ').filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
    }

    function normalizar(texto) {
        return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function crear(select) {
        var id = 'dd' + (++contador);
        var modo = select.getAttribute('data-dropdown');
        var opciones = Array.prototype.map.call(select.options, function (o, i) {
            var partes = o.text.split(' · ');
            return { indice: i, valor: o.value, titulo: partes[0], sub: partes.slice(1).join(' · '), vacio: o.value === '' };
        });
        var conBusqueda = opciones.filter(function (o) { return !o.vacio; }).length > 6;
        var activo = -1;

        var raiz = document.createElement('div');
        raiz.className = 'dd';

        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'dd__boton';
        boton.setAttribute('aria-haspopup', 'listbox');
        boton.setAttribute('aria-expanded', 'false');
        boton.setAttribute('aria-controls', id);

        var texto = document.createElement('span');
        texto.className = 'dd__texto';
        var flecha = document.createElement('span');
        flecha.className = 'dd__flecha';
        flecha.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        boton.appendChild(texto);
        boton.appendChild(flecha);

        var panel = document.createElement('div');
        panel.className = 'dd__panel';

        var buscador = null;
        if (conBusqueda) {
            buscador = document.createElement('input');
            buscador.type = 'search';
            buscador.className = 'dd__buscar';
            buscador.placeholder = 'Buscar…';
            buscador.setAttribute('aria-label', 'Buscar');
            panel.appendChild(buscador);
        }

        var lista = document.createElement('ul');
        lista.className = 'dd__lista';
        lista.id = id;
        lista.setAttribute('role', 'listbox');
        panel.appendChild(lista);

        var sinResultados = document.createElement('div');
        sinResultados.className = 'dd__vacio';
        sinResultados.textContent = 'Sin resultados';
        sinResultados.hidden = true;
        panel.appendChild(sinResultados);

        raiz.appendChild(boton);
        raiz.appendChild(panel);
        select.parentNode.insertBefore(raiz, select.nextSibling);
        select.classList.add('dd__nativo');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');

        var items = opciones.map(function (o) {
            var li = document.createElement('li');
            li.className = 'dd__item' + (o.vacio ? ' dd__item--vacio' : '');
            li.setAttribute('role', 'option');
            li.id = id + '-' + o.indice;
            if (modo === 'persona' && !o.vacio) {
                var av = document.createElement('span');
                av.className = 'dd__avatar';
                av.textContent = iniciales(o.titulo);
                li.appendChild(av);
            }
            var cuerpo = document.createElement('span');
            cuerpo.className = 'dd__cuerpo';
            var t = document.createElement('span');
            t.className = 'dd__titulo';
            t.textContent = o.titulo;
            cuerpo.appendChild(t);
            if (o.sub) {
                var s = document.createElement('span');
                s.className = 'dd__sub';
                s.textContent = o.sub;
                cuerpo.appendChild(s);
            }
            li.appendChild(cuerpo);
            var check = document.createElement('span');
            check.className = 'dd__check';
            check.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            li.appendChild(check);
            li.addEventListener('mousedown', function (e) { e.preventDefault(); });
            li.addEventListener('click', function () { elegir(o.indice); });
            li.addEventListener('mousemove', function () { resaltar(o.indice, false); });
            lista.appendChild(li);
            return li;
        });

        function visibles() {
            return items.filter(function (li) { return !li.hidden; });
        }

        function refrescar() {
            var sel = select.options[select.selectedIndex];
            var hayValor = sel && sel.value !== '';
            texto.textContent = sel ? sel.text.split(' · ')[0] : '';
            texto.classList.toggle('dd__texto--placeholder', !hayValor);
            items.forEach(function (li, i) {
                var elegido = i === select.selectedIndex;
                li.classList.toggle('dd__item--elegido', elegido);
                li.setAttribute('aria-selected', elegido ? 'true' : 'false');
            });
        }

        function resaltar(indice, desplazar) {
            activo = indice;
            items.forEach(function (li, i) { li.classList.toggle('dd__item--activo', i === indice); });
            if (indice >= 0) {
                boton.setAttribute('aria-activedescendant', items[indice].id);
                if (desplazar) { items[indice].scrollIntoView({ block: 'nearest' }); }
            }
        }

        function abierto() { return raiz.classList.contains('dd--abierto'); }

        function abrir() {
            if (abierto()) { return; }
            document.dispatchEvent(new CustomEvent('dd:abrir', { detail: raiz }));
            raiz.classList.add('dd--abierto');
            boton.setAttribute('aria-expanded', 'true');
            var abajo = window.innerHeight - boton.getBoundingClientRect().bottom;
            raiz.classList.toggle('dd--arriba', abajo < 320);
            if (buscador) { buscador.value = ''; filtrar(); }
            resaltar(select.selectedIndex >= 0 ? select.selectedIndex : 0, true);
            if (buscador) { buscador.focus(); }
        }

        function cerrar(devolverFoco) {
            if (!abierto()) { return; }
            raiz.classList.remove('dd--abierto');
            boton.setAttribute('aria-expanded', 'false');
            if (devolverFoco) { boton.focus(); }
        }

        function elegir(indice) {
            select.selectedIndex = indice;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            refrescar();
            cerrar(true);
        }

        function filtrar() {
            var q = normalizar(buscador ? buscador.value : '');
            items.forEach(function (li, i) {
                var o = opciones[i];
                li.hidden = q !== '' && (o.vacio || normalizar(o.titulo + ' ' + o.sub).indexOf(q) === -1);
            });
            var v = visibles();
            sinResultados.hidden = v.length > 0;
            if (v.length) { resaltar(items.indexOf(v[0]), true); }
        }

        function mover(paso) {
            var v = visibles();
            if (!v.length) { return; }
            var pos = v.indexOf(items[activo]);
            pos = pos === -1 ? 0 : (pos + paso + v.length) % v.length;
            resaltar(items.indexOf(v[pos]), true);
        }

        var tecleado = '', temporizador;
        function escribir(tecla) {
            clearTimeout(temporizador);
            tecleado += tecla;
            temporizador = setTimeout(function () { tecleado = ''; }, 600);
            var q = normalizar(tecleado);
            var i = opciones.findIndex(function (o) { return !o.vacio && normalizar(o.titulo).indexOf(q) === 0; });
            if (i === -1) { return; }
            if (abierto()) { resaltar(i, true); } else { elegir(i); }
        }

        boton.addEventListener('click', function () { abierto() ? cerrar(false) : abrir(); });

        function teclas(e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); abierto() ? mover(1) : abrir(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); abierto() ? mover(-1) : abrir(); }
            else if (e.key === 'Home' && abierto() && !buscador) { e.preventDefault(); resaltar(items.indexOf(visibles()[0]), true); }
            else if (e.key === 'End' && abierto() && !buscador) { e.preventDefault(); var v = visibles(); resaltar(items.indexOf(v[v.length - 1]), true); }
            else if (e.key === 'Enter' && abierto()) { e.preventDefault(); if (activo >= 0) { elegir(activo); } }
            else if (e.key === ' ' && !abierto() && e.target === boton) { e.preventDefault(); abrir(); }
            else if (e.key === 'Escape' && abierto()) { e.preventDefault(); cerrar(true); }
            else if (e.key === 'Tab') { cerrar(false); }
            else if (e.target === boton && e.key.length === 1 && !e.ctrlKey && !e.metaKey) { escribir(e.key); }
        }
        boton.addEventListener('keydown', teclas);
        if (buscador) {
            buscador.addEventListener('keydown', teclas);
            buscador.addEventListener('input', filtrar);
        }

        document.addEventListener('click', function (e) { if (!raiz.contains(e.target)) { cerrar(false); } });
        document.addEventListener('dd:abrir', function (e) { if (e.detail !== raiz) { cerrar(false); } });
        select.addEventListener('change', refrescar);

        // Si el formulario se recarga con errores, la etiqueta (for) debe enfocar el nuevo botón.
        if (select.id) {
            var etiqueta = document.querySelector('label[for="' + select.id + '"]');
            if (etiqueta) { etiqueta.addEventListener('click', function (e) { e.preventDefault(); boton.focus(); }); }
        }

        refrescar();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('select[data-dropdown]').forEach(crear);
    });
})();
