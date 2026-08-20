/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Página de inicio: destacados y slider */
(function () {
    'use strict';

    function renderSlider() {
        var track = document.getElementById('slider-track');
        if (!track) return;

        Tienda.apiGet({ recurso: 'slider' }).then(function (d) {
            if (!d.ok || !d.imagenes || !d.imagenes.length) return;
            var html = '';
            d.imagenes.forEach(function (archivo, i) {
                var url = Tienda.base + 'imagenes/slider/' + encodeURIComponent(archivo);
                html += '<li class="slider-slide" role="group" aria-roledescription="diapositiva" aria-label="' + (i + 1) + ' de ' + d.imagenes.length + '">' +
                    '<img src="' + Tienda.esc(url) + '" alt="Promoción de Tienda" loading="lazy">' +
                    '</li>';
            });
            track.innerHTML = html;
        });
    }

    function renderDestacados() {
        var cont = document.getElementById('destacados');
        if (!cont) return;

        Tienda.apiGet({ recurso: 'destacados' }).then(function (d) {
            if (!d.ok) {
                cont.innerHTML = '<p class="catalogo-error">' + Tienda.esc(d.error || 'Error al cargar productos.') + '</p>';
                return;
            }
            if (!d.productos || !d.productos.length) {
                cont.innerHTML = '<p class="aviso">No hay productos disponibles por el momento.</p>';
                return;
            }
            cont.innerHTML = d.productos.map(function (p) { return Tienda.tarjetaProducto(p); }).join('');
        });
    }

    document.addEventListener('tienda:layout', function () {
        renderSlider();
        renderDestacados();
    });
})();
