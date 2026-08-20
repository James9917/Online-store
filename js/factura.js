/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Factura: muestra un pedido y permite imprimirlo */
(function () {
    'use strict';

    function estadoClase(estado) {
        return 'estado-' + String(estado || '').toLowerCase();
    }

    function render(v) {
        var cont = document.getElementById('factura');
        var detalle = v.detalle || [];
        var itemsHtml = detalle.map(function (d) {
            return '<tr>' +
                '<td><div class="factura-item">' +
                (d.imagen ? '<img src="' + Tienda.esc(Tienda.imgProducto(d.imagen)) + '" alt="">' : '') +
                '<span>' + Tienda.esc(d.nombreproducto) + '</span></div></td>' +
                '<td>' + Tienda.precio(d.precio) + '</td>' +
                '<td>' + d.cantidad + '</td>' +
                '<td>' + Tienda.precio(d.subtotal) + '</td>' +
                '</tr>';
        }).join('');

        cont.innerHTML =
            '<div class="factura-cabecera">' +
            '<div><h1>Factura</h1>' +
            '<p class="factura-numero">N.º <strong>#' + v.idventa + '</strong></p></div>' +
            '<div class="factura-derecha">' +
            '<p>Fecha: <strong>' + Tienda.esc(String(v.fecha || '').replace('T', ' ')) + '</strong></p>' +
            '<p>Estado: <span class="factura-estado ' + estadoClase(v.estado) + '">' + Tienda.esc(v.estado) + '</span></p>' +
            '</div></div>' +

            '<div class="factura-cliente">' +
            '<div><h2>Cliente</h2>' +
            '<p>' + Tienda.esc(v.nombre) + '</p>' +
            '<p>' + Tienda.esc(v.correo) + '</p>' +
            (v.telefono ? '<p>Tel: ' + Tienda.esc(v.telefono) + '</p>' : '') +
            '</div>' +
            (v.direccion ? '<div><h2>Entrega</h2><p>' + Tienda.esc(v.direccion) + '</p></div>' : '') +
            '<div><h2>Pago</h2>' +
            '<p>' + Tienda.esc(v.metodo_nombre) + '</p>' +
            (v.referencia_pago ? '<p>' + Tienda.esc(v.referencia_pago) + '</p>' : '') +
            '</div></div>' +

            '<div class="tabla-envoltura"><table class="tabla">' +
            '<thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th></tr></thead>' +
            '<tbody>' + itemsHtml + '</tbody></table></div>' +

            '<div class="factura-totales">' +
            '<p>Subtotal: <strong>' + Tienda.precio(v.subtotal) + '</strong></p>' +
            '<p>Impuesto: <strong>' + Tienda.precio(v.impuesto) + '</strong></p>' +
            '<p>Envío: <strong>' + Tienda.precio(v.envio) + '</strong></p>' +
            '<p class="factura-gran-total">Total: <strong>' + Tienda.precio(v.total) + '</strong></p>' +
            '</div>';
    }

    function cargar() {
        if (!Tienda.logueado) {
            location.replace(Tienda.paginas + 'login.html');
            return;
        }
        var idventa = new URLSearchParams(location.search).get('idventa');
        if (!idventa) {
            document.getElementById('factura').innerHTML = '<p class="catalogo-error">Factura no válida.</p>';
            return;
        }
        Tienda.apiGet({ recurso: 'pedido', idventa: idventa }).then(function (d) {
            var cont = document.getElementById('factura');
            if (!d.ok) {
                cont.innerHTML = '<p class="catalogo-error">' + Tienda.esc(d.error || 'No se pudo cargar la factura.') + '</p>';
                return;
            }
            render(d.venta);
        });
    }

    document.addEventListener('tienda:layout', cargar);

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('btn-imprimir');
        if (btn) {
            btn.addEventListener('click', function () { window.print(); });
        }
    });
})();
