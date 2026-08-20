/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - helpers y layout compartido (JS vanilla) */
(function () {
    'use strict';

    /* Raíz de la aplicación: se deduce de la URL de este mismo script,
       así funciona desde la raíz o desde paginas/ sin hardcodear. */
    var BASE = (function () {
        var src = (document.currentScript && document.currentScript.src) || '';
        if (!/\/js\/app\.js$/.test(src)) {
            var todos = document.getElementsByTagName('script');
            for (var i = 0; i < todos.length; i++) {
                if (/\/js\/app\.js$/.test(todos[i].src)) { src = todos[i].src; break; }
            }
        }
        return src.substring(0, src.lastIndexOf('/js/') + 1);
    })();
    var PAGINAS = BASE + 'paginas/';
    var API = BASE + 'backend/api.php';

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function precio(n) {
        var num = Number(n);
        if (isNaN(num)) num = 0;
        return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function basename(p) {
        return String(p || '').split(/[\\/]/).pop();
    }

    window.Tienda = {
        base: BASE,
        paginas: PAGINAS,
        csrf: '',
        logueado: false,
        usuario: null,
        rol: 0,
        esAdmin: false,
        menu: [],
        carritoUnidades: 0,

        esc: esc,
        precio: precio,
        basename: basename,

        imgProducto: function (img) {
            return img ? BASE + 'imagenes/productos/' + encodeURIComponent(basename(img)) : BASE + 'imagenes/productos/placeholder.svg';
        },
        imgAvatar: function (a) {
            return a ? BASE + 'imagenes/img_perfil/' + encodeURIComponent(basename(a)) : BASE + 'imagenes/img_perfil/user.png';
        },
        urlProducto: function (p) {
            var cat = p.categoria || '';
            return PAGINAS + 'producto.html?codproducto=' + p.codproducto + '&categoria=' + encodeURIComponent(cat);
        },
        urlCategoria: function (slug, extra) {
            var u = new URLSearchParams({ categoria: slug });
            if (extra) {
                Object.keys(extra).forEach(function (k) {
                    if (extra[k]) u.set(k, extra[k]);
                });
            }
            return PAGINAS + 'categoria.html?' + u.toString();
        },

        init: function () {
            return fetch(API + '?recurso=layout', { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (d) {
                    Tienda.csrf = d.csrf || '';
                    Tienda.logueado = !!d.logueado;
                    Tienda.usuario = d.usuario || null;
                    Tienda.avatar = d.avatar || null;
                    Tienda.rol = d.rol || 0;
                    Tienda.esAdmin = !!d.es_admin;
                    Tienda.menu = d.menu || [];
                    Tienda.carritoUnidades = d.carrito_unidades || 0;
                    Tienda.renderHeader();
                    Tienda.renderFooterAnio();
                    document.dispatchEvent(new CustomEvent('tienda:layout'));
                    return d;
                })
                .catch(function () {
                    Tienda.renderFooterAnio();
                    document.dispatchEvent(new CustomEvent('tienda:layout'));
                });
        },

        apiPost: function (params) {
            params.csrf_token = Tienda.csrf;
            var body = Object.keys(params).map(function (k) {
                return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
            }).join('&');
            return fetch(API, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                body: body
            }).then(function (r) { return r.json(); });
        },

        apiGet: function (params) {
            var qs = new URLSearchParams(params).toString();
            return fetch(API + '?' + qs, { credentials: 'same-origin' }).then(function (r) { return r.json(); });
        },

        apiUpload: function (formData) {
            formData.append('csrf_token', Tienda.csrf);
            return fetch(API, {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            }).then(function (r) { return r.json(); });
        },

        setCarrito: function (n) {
            Tienda.carritoUnidades = n || 0;
            var badge = document.getElementById('cart-cantidad');
            if (badge) badge.textContent = Tienda.carritoUnidades;
        },

        renderHeader: function () {
            var cont = document.getElementById('app-header');
            if (!cont) return;

            var pagina = location.pathname.split('/').pop() || 'index.html';
            var categoriaActiva = '';
            if (pagina === 'categoria.html') {
                categoriaActiva = new URLSearchParams(location.search).get('categoria') || '';
            }

            function navItem(href, label, activo) {
                return '<li><a href="' + href + '"' + (activo ? ' class="activo"' : '') + '>' + esc(label) + '</a></li>';
            }

            var navHtml = navItem(BASE + 'index.html', 'Inicio', pagina === 'index.html');
            Tienda.menu.forEach(function (c) {
                navHtml += navItem(PAGINAS + 'categoria.html?categoria=' + encodeURIComponent(c.slug), c.nombre,
                    pagina === 'categoria.html' && categoriaActiva === c.slug);
            });
            if (Tienda.esAdmin) {
                navHtml += navItem(PAGINAS + 'admin.html', 'Gestión', pagina === 'admin.html');
            }
            if (Tienda.esAdmin) {
                navHtml += navItem(PAGINAS + 'admin_pedidos.html', 'Pedidos', pagina === 'admin_pedidos.html');
            }
            if (Tienda.logueado) {
                navHtml += navItem(PAGINAS + 'mis_pedidos.html', 'Mis Pedidos', pagina === 'mis_pedidos.html');
            }
            navHtml += navItem(PAGINAS + 'nosotros.html', 'Sobre Nosotros', pagina === 'nosotros.html');

            var acciones = '';
            if (Tienda.logueado) {
                acciones += '<div class="usuario">';
                if (Tienda.avatar) {
                    acciones += '<img src="' + esc(Tienda.imgAvatar(Tienda.avatar)) + '" class="avatar" alt="">';
                }
                acciones += '<span class="usuario-nombre">' + esc(Tienda.usuario || '') + '</span></div>';
                acciones += '<button type="button" class="btn btn-secundario" id="btn-salir">Salir</button>';
            } else {
                acciones += '<a href="' + PAGINAS + 'login.html" class="btn btn-secundario">Ingresar</a>';
                acciones += '<a href="' + PAGINAS + 'register.html" class="btn btn-primario">Registrarse</a>';
            }

            cont.innerHTML =
                '<a class="saltar" href="#contenido">Saltar al contenido</a>' +
                '<header class="site-header">' +
                '  <input type="checkbox" id="menu-toggle" class="menu-toggle-input" aria-hidden="true" tabindex="-1">' +
                '  <div class="header-bar">' +
                '    <a href="' + BASE + 'index.html" class="marca">Tienda<strong>.</strong></a>' +
                '    <label for="menu-toggle" class="menu-boton" aria-label="Abrir o cerrar el menú"><span class="menu-hamburguesa"></span></label>' +
                '    <div class="acciones-usuario">' +
                '      <a href="' + PAGINAS + 'carrito.html" class="cart-link" aria-label="Ver carrito">Carrito (<span id="cart-cantidad">' + Tienda.carritoUnidades + '</span>)</a>' +
                acciones +
                '    </div>' +
                '  </div>' +
                '  <nav class="nav-principal" aria-label="Menú principal"><ul>' + navHtml + '</ul></nav>' +
                '  <div id="app-subnav"></div>' +
                '</header>';

            var btnSalir = document.getElementById('btn-salir');
            if (btnSalir) {
                btnSalir.addEventListener('click', function () {
                    Tienda.apiPost({ recurso: 'logout' }).then(function () {
                        location.href = BASE + 'index.html';
                    });
                });
            }
        },

        renderFooterAnio: function () {
            var el = document.getElementById('anio');
            if (el) el.textContent = new Date().getFullYear();
        },

        /* Marcado reutilizable */
        tarjetaProducto: function (p) {
            var stock = Number(p.existencia) || 0;
            var url = Tienda.urlProducto(p);
            var stockHtml = '<p class="tarjeta-stock' + (stock > 0 ? '' : ' tarjeta-agotado') + '">' +
                (stock > 0 ? esc(stock) + ' disponibles' : 'Agotado') + '</p>';
            return '<div class="tarjeta">' +
                '<a href="' + esc(url) + '"><img src="' + esc(Tienda.imgProducto(p.imagen)) + '" class="tarjeta-imagen" alt="' + esc(p.nombreproducto) + '" loading="lazy" width="250" height="250"></a>' +
                '<div class="tarjeta-cuerpo">' +
                '<h3 class="tarjeta-nombre">' + esc(p.nombreproducto) + '</h3>' +
                '<p class="tarjeta-precio">' + Tienda.precio(p.precio) + '</p>' +
                stockHtml +
                '<a class="tarjeta-boton" href="' + esc(url) + '">Ver detalle</a>' +
                '</div></div>';
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        Tienda.init();
    });
})();
