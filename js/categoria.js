/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Catálogo por categoría: subnav, filtros, grid, paginación */
(function () {
    'use strict';

    function paramsActuales() {
        return new URLSearchParams(location.search);
    }

    function hrefSubnav(categoria, item) {
        var extra = {};
        if (item.marca) extra.marca = item.marca;
        if (item.tipo) extra.tipo = item.tipo;
        return Tienda.urlCategoria(categoria, extra);
    }

    function renderSubnav(d) {
        var cont = document.getElementById('app-subnav');
        if (!cont) return;

        var html = '<nav class="subnav" aria-label="Subcategorías de ' + Tienda.esc(d.categoria) + '"><ul class="subnav-lista">';
        d.items.forEach(function (item) {
            if (item.sub && item.sub.length) {
                html += '<li class="subnav-item subnav-padre"><span class="subnav-padre-etiqueta">' + Tienda.esc(item.label) + '</span><ul class="subnav-hijos">';
                item.sub.forEach(function (sub) {
                    html += '<li><a href="' + Tienda.esc(hrefSubnav(d.categoria, sub)) + '">' + Tienda.esc(sub.label) + '</a></li>';
                });
                html += '</ul></li>';
            } else {
                html += '<li class="subnav-item"><a href="' + Tienda.esc(hrefSubnav(d.categoria, item)) + '">' + Tienda.esc(item.label) + '</a></li>';
            }
        });
        html += '</ul></nav>';
        cont.innerHTML = html;
    }

    function renderFiltros(d) {
        var selMarca = document.getElementById('f-marca');
        var selTipo = document.getElementById('f-tipo');
        if (selMarca) {
            var hM = '<option value="">Todas las marcas</option>';
            d.marcas.forEach(function (m) {
                hM += '<option value="' + Tienda.esc(m) + '"' + (m === d.marca ? ' selected' : '') + '>' + Tienda.esc(m) + '</option>';
            });
            selMarca.innerHTML = hM;
        }
        if (selTipo) {
            var hT = '<option value="">Todos los tipos</option>';
            d.tipos.forEach(function (t) {
                hT += '<option value="' + Tienda.esc(t) + '"' + (t === d.tipo ? ' selected' : '') + '>' + Tienda.esc(t) + '</option>';
            });
            selTipo.innerHTML = hT;
        }
    }

    function renderGrid(d) {
        var grid = document.getElementById('grid');
        if (!d.productos.length) {
            grid.innerHTML = '<p class="catalogo-error">No hay productos que coincidan con tu búsqueda.</p>';
        } else {
            grid.innerHTML = d.productos.map(function (p) { return Tienda.tarjetaProducto(p); }).join('');
        }
    }

    function renderPaginacion(d) {
        var cont = document.getElementById('paginacion');
        if (!cont) return;
        if (d.total_paginas <= 1) {
            cont.innerHTML = '';
            return;
        }
        function enlace(pagina) {
            var u = paramsActuales();
            u.set('pagina', pagina);
            return Tienda.paginas + 'categoria.html?' + u.toString();
        }
        var html = '';
        if (d.pagina > 1) {
            html += '<a class="pagina" href="' + enlace(d.pagina - 1) + '">&laquo; Anterior</a>';
        }
        for (var i = 1; i <= d.total_paginas; i++) {
            if (i === d.pagina) {
                html += '<span class="pagina pagina-actual">' + i + '</span>';
            } else {
                html += '<a class="pagina" href="' + enlace(i) + '">' + i + '</a>';
            }
        }
        if (d.pagina < d.total_paginas) {
            html += '<a class="pagina" href="' + enlace(d.pagina + 1) + '">Siguiente &raquo;</a>';
        }
        cont.innerHTML = html;
    }

    function renderTitulos(d) {
        var h1 = document.getElementById('titulo-categoria');
        var miga = document.getElementById('miga');
        if (h1) h1.textContent = 'Catálogo ' + d.categoria_nombre;
        document.title = 'Tienda - ' + d.categoria_nombre;
        if (miga) {
            miga.innerHTML = '<a href="' + Tienda.base + 'index.html">Inicio</a><span>/</span><span>' + Tienda.esc(d.categoria_nombre) + '</span>';
        }
        var info = document.getElementById('info');
        if (info) info.textContent = d.total + ' producto(s) encontrado(s)';
    }

    function cargar() {
        var p = paramsActuales();
        document.getElementById('f-categoria').value = p.get('categoria') || 'gaming';
        if (document.getElementById('f-q')) document.getElementById('f-q').value = p.get('q') || '';
        if (document.getElementById('f-orden')) document.getElementById('f-orden').value = p.get('orden') || 'novedades';

        var cat = p.get('categoria') || 'gaming';
        Tienda.apiGet({ recurso: 'subnav', categoria: cat }).then(function (d) {
            if (d.ok) renderSubnav(d);
        });

        Tienda.apiGet({
            recurso: 'categorias',
            categoria: cat,
            marca: p.get('marca') || '',
            tipo: p.get('tipo') || '',
            q: p.get('q') || '',
            orden: p.get('orden') || 'novedades',
            pagina: p.get('pagina') || '1'
        }).then(function (d) {
            if (!d.ok) {
                document.getElementById('grid').innerHTML = '<p class="catalogo-error">' + Tienda.esc(d.error || 'Error al cargar.') + '</p>';
                return;
            }
            renderFiltros(d);
            renderTitulos(d);
            renderGrid(d);
            renderPaginacion(d);
        });
    }

    document.addEventListener('tienda:layout', cargar);

    document.addEventListener('DOMContentLoaded', function () {
        var form = document.getElementById('filtros');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var u = new URLSearchParams();
                u.set('categoria', document.getElementById('f-categoria').value || 'gaming');
                var q = document.getElementById('f-q').value.trim();
                var m = document.getElementById('f-marca').value;
                var t = document.getElementById('f-tipo').value;
                var o = document.getElementById('f-orden').value;
                if (q) u.set('q', q);
                if (m) u.set('marca', m);
                if (t) u.set('tipo', t);
                u.set('orden', o || 'novedades');
                location.href = Tienda.paginas + 'categoria.html?' + u.toString();
            });
            ['f-marca', 'f-tipo', 'f-orden'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.addEventListener('change', function () { form.dispatchEvent(new Event('submit')); });
            });
        }
    });
})();
