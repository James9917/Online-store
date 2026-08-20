/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Gestión de pedidos (solo admin) */
(function () {
    'use strict';

    function estadoClase(estado) {
        return 'estado-' + String(estado || '').toLowerCase();
    }

    function render(d) {
        var cont = document.getElementById('pedidos-admin');

        if (!d.pedidos || !d.pedidos.length) {
            cont.innerHTML = '<p class="aviso">No hay pedidos que coincidan con el filtro.</p>';
            return;
        }

        var opciones = d.estados.map(function (e) {
            return '<option value="' + e + '">' + e + '</option>';
        }).join('');

        var html = '<div class="tabla-envoltura"><table class="tabla">' +
            '<thead><tr><th>N.º</th><th>Fecha</th><th>Cliente</th><th>Método de pago</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>';

        d.pedidos.forEach(function (p) {
            html += '<tr>' +
                '<td>#' + p.idventa + '</td>' +
                '<td>' + Tienda.esc(String(p.fecha || '').replace('T', ' ')) + '</td>' +
                '<td><strong>' + Tienda.esc(p.nombre) + '</strong><br><span class="carrito-marca">' + Tienda.esc(p.usuario_login) + ' · ' + Tienda.esc(p.correo) + '</span></td>' +
                '<td>' + Tienda.esc(p.metodo_nombre) + '</td>' +
                '<td><strong>' + Tienda.precio(p.total) + '</strong></td>' +
                '<td><select class="pedido-estado-select ' + estadoClase(p.estado) + '" data-pedido="' + p.idventa + '">' +
                opciones.replace('<option value="' + p.estado + '">', '<option value="' + p.estado + '" selected>') + '</select></td>' +
                '<td><a class="tabla-accion" href="' + Tienda.paginas + 'factura.html?idventa=' + p.idventa + '">Ver</a></td>' +
                '</tr>';
        });

        html += '</tbody></table></div>';
        cont.innerHTML = html;

        cont.querySelectorAll('.pedido-estado-select').forEach(function (sel) {
            sel.addEventListener('change', function () {
                Tienda.apiPost({
                    recurso: 'pedido_estado',
                    idventa: sel.getAttribute('data-pedido'),
                    estado: sel.value
                }).then(function (r) {
                    if (!r.ok) {
                        alert(r.error || 'No se pudo actualizar el estado.');
                    }
                    cargar();
                });
            });
        });
    }

    function cargar() {
        if (!Tienda.esAdmin) {
            location.replace(Tienda.base + 'index.html');
            return;
        }
        var q = new URLSearchParams(location.search).get('q') || '';
        var estado = new URLSearchParams(location.search).get('estado') || '';
        document.getElementById('p-q').value = q;
        document.getElementById('p-estado').value = estado;
        Tienda.apiGet({ recurso: 'pedidos', q: q, estado: estado }).then(function (d) {
            if (!d.ok) {
                document.getElementById('pedidos-admin').innerHTML = '<p class="catalogo-error">' + Tienda.esc(d.error || 'Error al cargar los pedidos.') + '</p>';
                return;
            }
            render(d);
        });
    }

    document.addEventListener('tienda:layout', cargar);

    document.addEventListener('DOMContentLoaded', function () {
        var form = document.getElementById('form-filtros');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var q = document.getElementById('p-q').value.trim();
                var estado = document.getElementById('p-estado').value;
                var params = [];
                if (q) params.push('q=' + encodeURIComponent(q));
                if (estado) params.push('estado=' + encodeURIComponent(estado));
                location.href = Tienda.paginas + 'admin_pedidos.html' + (params.length ? '?' + params.join('&') : '');
            });
        }
    });
})();
