/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Checkout: datos de contacto, método de pago y confirmación de compra */
(function () {
    'use strict';

    var metodoActual = 'efectivo';

    function mostrarMsg(tipo, texto) {
        var el = document.getElementById('co-msg');
        el.className = tipo;
        el.innerHTML = '<p>' + texto + '</p>';
    }

    function cargarMetodos() {
        Tienda.apiGet({ recurso: 'metodos_pago' }).then(function (d) {
            if (!d.ok) return;
            var cont = document.getElementById('metodos-pago');
            var html = '';
            d.metodos.forEach(function (m) {
                html += '<label class="checkout-pago">' +
                    '<input type="radio" name="metodo_pago" value="' + Tienda.esc(m.id) + '"' + (m.id === 'efectivo' ? ' checked' : '') + '>' +
                    '<span>' + Tienda.esc(m.nombre) + '</span></label>';
            });
            cont.innerHTML = html;
            cont.querySelectorAll('input[name="metodo_pago"]').forEach(function (radio) {
                radio.addEventListener('change', function () {
                    metodoActual = radio.value;
                    alternarMetodo();
                });
            });
            alternarMetodo();
        });
    }

    function alternarMetodo() {
        document.getElementById('pago-tarjeta').hidden = metodoActual !== 'tarjeta';
        document.getElementById('pago-transferencia').hidden = metodoActual !== 'transferencia';
        document.getElementById('pago-efectivo').hidden = metodoActual !== 'efectivo';
    }

    function cargarResumen() {
        Tienda.apiGet({ recurso: 'carrito' }).then(function (d) {
            if (!d.ok) {
                document.getElementById('resumen-items').innerHTML = '<p class="catalogo-error">' + Tienda.esc(d.error || 'Error al cargar el carrito.') + '</p>';
                return;
            }
            if (!d.items.length) {
                document.getElementById('resumen-items').innerHTML = '<p class="aviso">Tu carrito está vacío. <a href="' + Tienda.base + 'index.html">Ver productos</a>.</p>';
                document.querySelector('.checkout-boton').disabled = true;
                return;
            }
            var html = '';
            d.items.forEach(function (it) {
                var p = it.producto;
                html += '<div class="resumen-item">' +
                    '<img src="' + Tienda.esc(Tienda.imgProducto(p.imagen)) + '" alt="' + Tienda.esc(p.nombreproducto) + '">' +
                    '<div class="resumen-info"><span class="resumen-nombre">' + Tienda.esc(p.nombreproducto) + '</span>' +
                    '<span class="resumen-detalle">' + it.cantidad + ' × ' + Tienda.precio(p.precio) + '</span></div>' +
                    '<span class="resumen-subtotal">' + Tienda.precio(it.subtotal) + '</span></div>';
            });
            document.getElementById('resumen-items').innerHTML = html;
            document.getElementById('r-subtotal').textContent = Tienda.precio(d.total);
            document.getElementById('r-envio').textContent = Tienda.precio(0);
            document.getElementById('r-total').textContent = Tienda.precio(d.total);
        });
    }

    function preparar() {
        if (!Tienda.logueado) {
            location.replace(Tienda.paginas + 'login.html');
            return;
        }
        Tienda.apiGet({ recurso: 'perfil' }).then(function (d) {
            if (d.ok) {
                if (d.nombre) document.getElementById('co-nombre').value = d.nombre;
                if (d.correo) document.getElementById('co-correo').value = d.correo;
            }
        });
        cargarMetodos();
        cargarResumen();
    }

    document.addEventListener('tienda:layout', preparar);

    document.addEventListener('DOMContentLoaded', function () {
        var form = document.getElementById('form-checkout');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var datos = {
                recurso: 'comprar',
                nombre: document.getElementById('co-nombre').value.trim(),
                correo: document.getElementById('co-correo').value.trim(),
                telefono: document.getElementById('co-telefono').value.trim(),
                direccion: document.getElementById('co-direccion').value.trim(),
                metodo_pago: metodoActual,
                referencia: ''
            };
            if (metodoActual === 'tarjeta') {
                datos.tarjeta_titular = document.getElementById('co-titular').value.trim();
                datos.tarjeta_numero = document.getElementById('co-tarjeta').value.replace(/\D/g, '');
                datos.tarjeta_vencimiento = document.getElementById('co-vencimiento').value.trim();
                datos.tarjeta_cvv = document.getElementById('co-cvv').value.trim();
            } else if (metodoActual === 'transferencia') {
                datos.referencia = document.getElementById('co-referencia').value.trim();
            }

            var btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            mostrarMsg('', '');

            Tienda.apiPost(datos).then(function (r) {
                btn.disabled = false;
                if (r.ok) {
                    location.href = Tienda.paginas + 'factura.html?idventa=' + encodeURIComponent(r.idventa);
                } else {
                    mostrarMsg('msg_error', Tienda.esc(r.error || 'No se pudo procesar la compra.'));
                }
            }).catch(function () {
                btn.disabled = false;
                mostrarMsg('msg_error', Tienda.esc('Error de red. Intente de nuevo.'));
            });
        });
    });
})();
