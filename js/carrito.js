/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Carrito: listado, actualizar, eliminar, vaciar */
(function () {
    'use strict';

    var cont;

    function cargar() {
        if (!cont) cont = document.getElementById('carrito');
        Tienda.apiGet({ recurso: 'carrito' }).then(function (d) {
            if (!d.ok) {
                cont.innerHTML = '<p class="catalogo-error">' + Tienda.esc(d.error || 'Error al cargar el carrito.') + '</p>';
                return;
            }
            Tienda.setCarrito(d.unidades);
            render(d);
        });
    }

    function render(d) {
        var aviso = document.getElementById('aviso');
        if (aviso) aviso.innerHTML = '';

        if (!d.items.length) {
            cont.innerHTML = '<p class="aviso">Tu carrito está vacío. <a href="' + Tienda.base + 'index.html">Ver productos</a>.</p>';
            return;
        }

        var html = '<form id="form-actualizar">' +
            '<div class="tabla-envoltura"><table class="tabla">' +
            '<thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead><tbody>';

        d.items.forEach(function (it) {
            var p = it.producto;
            html += '<tr>' +
                '<td><div class="carrito-producto">' +
                '<img src="' + Tienda.esc(Tienda.imgProducto(p.imagen)) + '" alt="' + Tienda.esc(p.nombreproducto) + '">' +
                '<div><a class="carrito-nombre" href="' + Tienda.esc(Tienda.urlProducto(p)) + '">' + Tienda.esc(p.nombreproducto) + '</a>' +
                '<span class="carrito-marca">' + Tienda.esc(p.marca || '') + '</span></div></div></td>' +
                '<td>' + Tienda.precio(p.precio) + '</td>' +
                '<td><input type="number" class="carrito-cantidad" data-cod="' + p.codproducto + '" value="' + it.cantidad + '" min="1" max="' + (Number(p.existencia) || 99) + '"></td>' +
                '<td>' + Tienda.precio(it.subtotal) + '</td>' +
                '<td><button type="button" class="carrito-eliminar" data-eliminar="' + p.codproducto + '">Eliminar</button></td>' +
                '</tr>';
        });

        html += '</tbody></table></div>' +
            '<div class="carrito-pie">' +
            '<p class="carrito-total">Total: <strong>' + Tienda.precio(d.total) + '</strong></p>' +
            '<div class="carrito-acciones">' +
            '<button type="submit" class="btn btn-secundario">Actualizar cantidades</button>' +
            '<a href="' + Tienda.base + 'index.html" class="btn btn-secundario">Seguir comprando</a>' +
            '<a href="' + Tienda.paginas + 'checkout.html" class="btn btn-primario">Continuar compra</a>' +
            '</div></div></form>' +
            '<div class="carrito-vaciar"><button type="button" class="carrito-vaciar-boton" id="btn-vaciar">Vaciar carrito</button></div>';

        cont.innerHTML = html;
        contarEventos();
    }

    function contarEventos() {
        var form = document.getElementById('form-actualizar');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var cantidades = {};
                cont.querySelectorAll('.carrito-cantidad').forEach(function (inp) {
                    cantidades['cantidad[' + inp.getAttribute('data-cod') + ']'] = inp.value;
                });
                Tienda.apiPost(Object.assign({ recurso: 'carrito', accion: 'actualizar' }, cantidades)).then(function (r) {
                    if (r.ok) { Tienda.setCarrito(r.unidades); cargar(); }
                });
            });
        }
        cont.querySelectorAll('[data-eliminar]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                Tienda.apiPost({
                    recurso: 'carrito',
                    accion: 'eliminar',
                    codproducto: btn.getAttribute('data-eliminar')
                }).then(function (r) {
                    if (r.ok) { Tienda.setCarrito(r.unidades); cargar(); }
                });
            });
        });
        var vaciar = document.getElementById('btn-vaciar');
        if (vaciar) {
            vaciar.addEventListener('click', function () {
                Tienda.apiPost({ recurso: 'carrito', accion: 'vaciar' }).then(function (r) {
                    if (r.ok) { Tienda.setCarrito(r.unidades); cargar(); }
                });
            });
        }
    }

    document.addEventListener('tienda:layout', cargar);
})();
