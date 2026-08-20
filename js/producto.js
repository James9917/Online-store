/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Ficha de producto + relacionados + añadir al carrito */
(function () {
    'use strict';

    function renderSubnav(categoria) {
        Tienda.apiGet({ recurso: 'subnav', categoria: categoria }).then(function (d) {
            var cont = document.getElementById('app-subnav');
            if (!d.ok || !cont) return;
            var html = '<nav class="subnav" aria-label="Subcategorías de ' + Tienda.esc(d.categoria) + '"><ul class="subnav-lista">';
            d.items.forEach(function (item) {
                if (item.sub && item.sub.length) {
                    html += '<li class="subnav-item subnav-padre"><span class="subnav-padre-etiqueta">' + Tienda.esc(item.label) + '</span><ul class="subnav-hijos">';
                    item.sub.forEach(function (sub) {
                        var extra = {};
                        if (sub.marca) extra.marca = sub.marca;
                        if (sub.tipo) extra.tipo = sub.tipo;
                        html += '<li><a href="' + Tienda.esc(Tienda.urlCategoria(d.categoria, extra)) + '">' + Tienda.esc(sub.label) + '</a></li>';
                    });
                    html += '</ul></li>';
                } else {
                    var e2 = {};
                    if (item.marca) e2.marca = item.marca;
                    if (item.tipo) e2.tipo = item.tipo;
                    html += '<li class="subnav-item"><a href="' + Tienda.esc(Tienda.urlCategoria(d.categoria, e2)) + '">' + Tienda.esc(item.label) + '</a></li>';
                }
            });
            html += '</ul></nav>';
            cont.innerHTML = html;
        });
    }

    function renderFicha(d) {
        var cont = document.getElementById('ficha');
        var aviso = document.getElementById('aviso-ficha');
        var relacionados = document.getElementById('relacionados');

        if (!d.producto) {
            document.title = 'Tienda - Producto no encontrado';
            cont.innerHTML = '<p class="catalogo-error">El producto solicitado no existe.</p>';
            return;
        }

        var p = d.producto;
        var stock = Number(p.existencia) || 0;
        document.title = 'Tienda - ' + p.nombreproducto;
        document.querySelector('meta[name="description"]').setAttribute('content', 'Ficha del producto ' + p.nombreproducto + ' en Tienda.');

        var miga = document.getElementById('miga');
        miga.innerHTML = '<a href="' + Tienda.base + 'index.html">Inicio</a><span>/</span>' +
            '<a href="' + Tienda.esc(Tienda.urlCategoria(d.categoria)) + '">' + Tienda.esc(d.categoria_nombre || '') + '</a>' +
            '<span>/</span><span>' + Tienda.esc(p.nombreproducto) + '</span>';

        var html = '<div class="ficha">' +
            '<div class="ficha-imagen"><img src="' + Tienda.esc(Tienda.imgProducto(p.imagen)) + '" alt="' + Tienda.esc(p.nombreproducto) + '"></div>' +
            '<div class="ficha-datos">' +
            '<h1 class="ficha-nombre">' + Tienda.esc(p.nombreproducto) + '</h1>';
        if (p.marca) html += '<p class="ficha-marca">Marca: ' + Tienda.esc(p.marca) + '</p>';
        if (p.tipo) html += '<p class="ficha-tipo">Tipo: ' + Tienda.esc(p.tipo) + '</p>';
        html += '<p class="ficha-precio">' + Tienda.precio(p.precio) + '</p>';
        html += '<p class="ficha-stock' + (stock > 0 ? '' : ' tarjeta-agotado') + '">' +
            (stock > 0 ? 'Disponibles: ' + stock : 'Agotado') + '</p>';
        if (p.descripcion) html += '<p class="ficha-descripcion">' + Tienda.esc(p.descripcion).replace(/\n/g, '<br>') + '</p>';

        if (stock > 0) {
            html += '<form method="post" class="ficha-comprar" id="form-agregar">' +
                '<label for="ficha-cantidad" class="sr-only">Cantidad</label>' +
                '<input type="number" name="cantidad" id="ficha-cantidad" value="1" min="1" max="' + stock + '" class="ficha-cantidad-input" required>' +
                '<button type="submit" class="ficha-boton">Añadir al carrito</button></form>';
        } else {
            html += '<p class="ficha-agotado-boton">Producto agotado</p>';
        }
        html += '</div></div>';
        cont.innerHTML = html;

        if (aviso) aviso.innerHTML = '';

        var form = document.getElementById('form-agregar');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var cantidad = document.getElementById('ficha-cantidad').value || '1';
                Tienda.apiPost({
                    recurso: 'carrito',
                    accion: 'agregar',
                    codproducto: p.codproducto,
                    cantidad: cantidad
                }).then(function (r) {
                    if (r.ok) {
                        Tienda.setCarrito(r.unidades);
                        if (aviso) {
                            aviso.innerHTML = '<p class="catalogo-info">' + Tienda.esc(r.aviso || 'Producto añadido al carrito.') +
                                ' <a href="' + Tienda.paginas + 'carrito.html">Ver carrito</a>.</p>';
                        }
                    } else {
                        if (aviso) aviso.innerHTML = '<p class="catalogo-error">' + Tienda.esc(r.error || 'Error.') + '</p>';
                    }
                });
            });
        }

        if (relacionados) {
            if (d.relacionados && d.relacionados.length) {
                relacionados.innerHTML = '<h2 class="relacionados-titulo">Productos relacionados</h2>' +
                    '<div class="grid">' + d.relacionados.map(function (r) { return Tienda.tarjetaProducto(r); }).join('') + '</div>';
            } else {
                relacionados.innerHTML = '';
            }
        }
    }

    function cargar() {
        var p = new URLSearchParams(location.search);
        var codproducto = p.get('codproducto') || '0';
        var categoria = p.get('categoria') || 'gaming';

        Tienda.apiGet({ recurso: 'producto', codproducto: codproducto, categoria: categoria }).then(function (d) {
            if (!d.ok) {
                document.getElementById('ficha').innerHTML = '<p class="catalogo-error">' + Tienda.esc(d.error || 'Error.') + '</p>';
                return;
            }
            renderSubnav(d.categoria);
            renderFicha(d);
        });
    }

    document.addEventListener('tienda:layout', cargar);
})();
