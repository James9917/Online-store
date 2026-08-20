/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Mis pedidos: historial de compras del cliente */
(function () {
    'use strict';

    function estadoClase(estado) {
        return 'estado-' + String(estado || '').toLowerCase();
    }

    function render(d) {
        var cont = document.getElementById('pedidos');

        if (!d.pedidos || !d.pedidos.length) {
            cont.innerHTML = '<p class="aviso">Aún no tienes pedidos. <a href="' + Tienda.base + 'index.html">Empieza a comprar</a>.</p>';
            return;
        }

        var html = d.pedidos.map(function (p) {
            return '<div class="pedido-card">' +
                '<div class="pedido-card-id">' +
                '<span class="pedido-numero">#' + p.idventa + '</span>' +
                '<span class="pedido-fecha">' + Tienda.esc(String(p.fecha || '').replace('T', ' ')) + '</span></div>' +
                '<div class="pedido-card-datos">' +
                '<span>' + p.lineas + ' producto(s)</span>' +
                '<span>' + Tienda.esc(p.metodo_pago) + '</span></div>' +
                '<span class="factura-estado ' + estadoClase(p.estado) + '">' + Tienda.esc(p.estado) + '</span>' +
                '<strong class="pedido-total">' + Tienda.precio(p.total) + '</strong>' +
                '<a class="pedido-ver" href="' + Tienda.paginas + 'factura.html?idventa=' + p.idventa + '">Ver factura</a>' +
                '</div>';
        }).join('');

        cont.innerHTML = html;
    }

    function cargar() {
        if (!Tienda.logueado) {
            location.replace(Tienda.paginas + 'login.html');
            return;
        }
        Tienda.apiGet({ recurso: 'mis_pedidos' }).then(function (d) {
            if (!d.ok) {
                document.getElementById('pedidos').innerHTML = '<p class="catalogo-error">' + Tienda.esc(d.error || 'Error al cargar los pedidos.') + '</p>';
                return;
            }
            render(d);
        });
    }

    document.addEventListener('tienda:layout', cargar);
})();
