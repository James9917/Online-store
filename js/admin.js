/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Gestión de usuarios y productos (solo admin) */
(function () {
    'use strict';

    var ROLES = [
        { id: 1, nombre: 'administrador' },
        { id: 2, nombre: 'cliente' },
        { id: 3, nombre: 'vendedor' }
    ];

    var productosCache = [];
    var categoriasCache = [];
    var productosCargados = false;
    var sliderCargados = false;

    function rolNombre(id) {
        for (var i = 0; i < ROLES.length; i++) {
            if (ROLES[i].id === Number(id)) return ROLES[i].nombre;
        }
        return '';
    }

    function renderTabla(d) {
        var cont = document.getElementById('admin-contenido');

        if (!d.usuarios || !d.usuarios.length) {
            cont.innerHTML = '<p class="aviso">No hay usuarios registrados.</p>';
            return;
        }

        var html = '<div class="tabla-envoltura"><table class="tabla">' +
            '<thead><tr><th>Foto</th><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Rol</th><th>Acciones</th></tr></thead><tbody>';
        d.usuarios.forEach(function (u) {
            html += '<tr>' +
                '<td><img src="' + Tienda.esc(Tienda.imgAvatar(u.avatar)) + '" alt="Avatar de ' + Tienda.esc(u.nombre) + '"></td>' +
                '<td>' + Tienda.esc(u.nombre) + '</td>' +
                '<td>' + Tienda.esc(u.usuario) + '</td>' +
                '<td>' + Tienda.esc(u.correo) + '</td>' +
                '<td>' + Tienda.esc(u.rol_nombre) + '</td>' +
                '<td><button type="button" class="tabla-accion" data-id="' + u.idusuario + '">Modificar</button></td>' +
                '</tr>';
        });
        html += '</tbody></table></div>';
        cont.innerHTML = html;

        cont.querySelectorAll('.tabla-accion').forEach(function (btn) {
            btn.addEventListener('click', function () {
                abrirModal(Number(btn.getAttribute('data-id')));
            });
        });
    }

    function abrirModal(idusuario) {
        var usuario = null;
        var html = document.getElementById('admin-contenido');
        var rows = html.querySelectorAll('tr');
        rows.forEach(function (row) {
            var btn = row.querySelector('.tabla-accion');
            if (btn && Number(btn.getAttribute('data-id')) === idusuario) {
                var celdas = row.querySelectorAll('td');
                usuario = {
                    id: idusuario,
                    nombre: celdas[1].textContent,
                    usuario: celdas[2].textContent,
                    correo: celdas[3].textContent,
                    rol: rolIdPorNombre(celdas[4].textContent)
                };
            }
        });
        if (!usuario) return;

        document.getElementById('u-id').value = usuario.id;
        document.getElementById('u-nombre').value = usuario.nombre;
        document.getElementById('u-usuario').value = usuario.usuario;
        document.getElementById('u-correo').value = usuario.correo;
        document.getElementById('u-rol').value = usuario.rol;
        document.getElementById('u-clave').value = '';
        document.getElementById('u-clave2').value = '';
        mostrarMsg('', '');
        var modal = document.getElementById('modal-usuario');
        modal.classList.add('visible');
        modal.setAttribute('aria-hidden', 'false');
        document.getElementById('u-nombre').focus();
    }

    function rolIdPorNombre(texto) {
        for (var i = 0; i < ROLES.length; i++) {
            if (ROLES[i].nombre === texto) return String(ROLES[i].id);
        }
        return '2';
    }

    function cerrarModal() {
        var modal = document.getElementById('modal-usuario');
        modal.classList.remove('visible');
        modal.setAttribute('aria-hidden', 'true');
    }

    function mostrarMsg(tipo, texto) {
        var el = document.getElementById('u-msg');
        el.className = tipo;
        el.innerHTML = texto;
    }

    function cargar() {
        if (!Tienda.esAdmin) {
            location.replace(Tienda.base + 'index.html');
            return;
        }
        var q = new URLSearchParams(location.search).get('q') || '';
        document.getElementById('b-q').value = q;
        Tienda.apiGet({ recurso: 'usuarios', q: q }).then(function (d) {
            if (!d.ok) {
                document.getElementById('admin-contenido').innerHTML = '<p class="catalogo-error">' + Tienda.esc(d.error || 'Error al cargar.') + '</p>';
                return;
            }
            renderTabla(d);
        });
    }

    /* ============ Productos ============ */

    function cargarProductos(q) {
        var cont = document.getElementById('admin-contenido-productos');
        cont.innerHTML = '<p class="aviso">Cargando...</p>';
        Tienda.apiGet({ recurso: 'productos_admin', q: q }).then(function (d) {
            if (!d.ok) {
                cont.innerHTML = '<p class="catalogo-error">' + Tienda.esc(d.error || 'Error al cargar.') + '</p>';
                return;
            }
            productosCache = d.productos;
            categoriasCache = d.categorias;
            renderTablaProductos();
        });
    }

    function renderTablaProductos() {
        var cont = document.getElementById('admin-contenido-productos');

        if (!productosCache.length) {
            cont.innerHTML = '<p class="aviso">No hay productos registrados.</p>';
            return;
        }

        var html = '<div class="tabla-envoltura"><table class="tabla">' +
            '<thead><tr><th>Imagen</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Existencia</th><th>Acciones</th></tr></thead><tbody>';
        productosCache.forEach(function (p) {
            var info = [p.marca, p.tipo].filter(Boolean).join(' · ');
            html += '<tr>' +
                '<td><img src="' + Tienda.esc(Tienda.imgProducto(p.imagen)) + '" alt=""></td>' +
                '<td><strong>' + Tienda.esc(p.nombreproducto) + '</strong>' + (info ? '<br><small>' + Tienda.esc(info) + '</small>' : '') + '</td>' +
                '<td>' + Tienda.esc(p.categoria_nombre || p.categoria) + '</td>' +
                '<td>' + Tienda.esc(Tienda.precio(p.precio)) + '</td>' +
                '<td>' + (Number(p.existencia) > 0 ? Tienda.esc(p.existencia) : '<span class="txt-agotado">' + Tienda.esc(p.existencia) + '</span>') + '</td>' +
                '<td><div class="admin-acciones">' +
                '<button type="button" class="tabla-accion" data-pid="' + p.codproducto + '" data-accion="editar">Modificar</button>' +
                '<button type="button" class="tabla-accion tabla-accion-peligro" data-pid="' + p.codproducto + '" data-accion="eliminar">Eliminar</button>' +
                '</div></td>' +
                '</tr>';
        });
        html += '</tbody></table></div>';
        cont.innerHTML = html;

        cont.querySelectorAll('.tabla-accion').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var pid = Number(btn.getAttribute('data-pid'));
                if (btn.getAttribute('data-accion') === 'eliminar') {
                    eliminarProducto(pid);
                } else {
                    abrirModalProducto(pid);
                }
            });
        });
    }

    function llenarCategorias(seleccionada) {
        var sel = document.getElementById('p-categoria');
        sel.innerHTML = '';
        categoriasCache.forEach(function (c) {
            var op = document.createElement('option');
            op.value = c.idcategoria;
            op.textContent = c.nombre;
            sel.appendChild(op);
        });
        if (seleccionada) sel.value = String(seleccionada);
    }

    function abrirModalProducto(pid) {
        var titulo = document.getElementById('modal-producto-titulo');
        var p = null;
        if (pid) {
            for (var i = 0; i < productosCache.length; i++) {
                if (Number(productosCache[i].codproducto) === pid) { p = productosCache[i]; break; }
            }
        }
        llenarCategorias(p ? p.categoria_id : null);
        document.getElementById('p-id').value = p ? p.codproducto : '';
        document.getElementById('p-nombre').value = p ? p.nombreproducto : '';
        document.getElementById('p-descripcion').value = p ? (p.descripcion || '') : '';
        document.getElementById('p-precio').value = p ? p.precio : '';
        document.getElementById('p-existencia').value = p ? p.existencia : '';
        document.getElementById('p-marca').value = p ? (p.marca || '') : '';
        document.getElementById('p-tipo').value = p ? (p.tipo || '') : '';
        document.getElementById('p-imagen').value = p ? (p.imagen || '') : '';
        titulo.textContent = p ? 'Modificar producto' : 'Agregar producto';
        mostrarMsgP('', '');
        var modal = document.getElementById('modal-producto');
        modal.classList.add('visible');
        modal.setAttribute('aria-hidden', 'false');
        document.getElementById('p-nombre').focus();
    }

    function cerrarModalProducto() {
        var modal = document.getElementById('modal-producto');
        modal.classList.remove('visible');
        modal.setAttribute('aria-hidden', 'true');
    }

    function mostrarMsgP(tipo, texto) {
        var el = document.getElementById('p-msg');
        el.className = tipo;
        el.innerHTML = texto;
    }

    function eliminarProducto(pid) {
        if (!window.confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
        Tienda.apiPost({ recurso: 'producto_eliminar', codproducto: pid }).then(function (r) {
            if (r.ok) {
                var q = document.getElementById('b-p').value.trim();
                cargarProductos(q);
            } else {
                window.alert(r.error || 'No se pudo eliminar el producto.');
            }
        });
    }

    function cambiarSeccion(seccion) {
        var esProd = seccion === 'productos';
        var esSlider = seccion === 'slider';
        document.getElementById('seccion-usuarios').hidden = esProd || esSlider;
        document.getElementById('seccion-productos').hidden = !esProd;
        document.getElementById('seccion-slider').hidden = !esSlider;
        document.getElementById('pest-usuarios').classList.toggle('activa', !esProd && !esSlider);
        document.getElementById('pest-productos').classList.toggle('activa', esProd);
        document.getElementById('pest-slider').classList.toggle('activa', esSlider);
        document.getElementById('pest-usuarios').setAttribute('aria-selected', String(!esProd && !esSlider));
        document.getElementById('pest-productos').setAttribute('aria-selected', String(esProd));
        document.getElementById('pest-slider').setAttribute('aria-selected', String(esSlider));
        if (esProd && !productosCargados) {
            productosCargados = true;
            cargarProductos('');
        }
        if (esSlider && !sliderCargados) {
            sliderCargados = true;
            cargarSlider();
        }
    }

    /* ============ Slider ============ */

    function cargarSlider() {
        var cont = document.getElementById('admin-contenido-slider');
        cont.innerHTML = '<p class="aviso">Cargando...</p>';
        Tienda.apiGet({ recurso: 'slider' }).then(function (d) {
            if (!d.ok) {
                cont.innerHTML = '<p class="catalogo-error">' + Tienda.esc(d.error || 'Error al cargar.') + '</p>';
                return;
            }
            if (!d.imagenes.length) {
                cont.innerHTML = '<p class="aviso">No hay imágenes en el slider. Sube una con el botón de arriba.</p>';
                return;
            }
            var html = '';
            d.imagenes.forEach(function (archivo) {
                var url = Tienda.base + 'imagenes/slider/' + encodeURIComponent(archivo);
                html += '<figure class="slider-admin-item">' +
                    '<img src="' + Tienda.esc(url) + '" alt="' + Tienda.esc(archivo) + '" loading="lazy">' +
                    '<figcaption>' + Tienda.esc(archivo) + '</figcaption>' +
                    '<button type="button" class="tabla-accion tabla-accion-peligro" data-archivo="' + Tienda.esc(archivo) + '">Eliminar</button>' +
                    '</figure>';
            });
            cont.innerHTML = html;

            cont.querySelectorAll('[data-archivo]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    eliminarSlider(btn.getAttribute('data-archivo'));
                });
            });
        });
    }

    function mostrarMsgSlider(tipo, texto) {
        var el = document.getElementById('slider-msg');
        el.className = tipo;
        el.innerHTML = texto;
    }

    function eliminarSlider(archivo) {
        if (!window.confirm('¿Eliminar esta imagen del slider?')) return;
        Tienda.apiPost({ recurso: 'slider_eliminar', archivo: archivo }).then(function (r) {
            if (r.ok) {
                mostrarMsgSlider('msg_save', '<p>' + Tienda.esc(r.msg || 'Imagen eliminada.') + '</p>');
                cargarSlider();
            } else {
                mostrarMsgSlider('msg_error', '<p>' + Tienda.esc(r.error || 'No se pudo eliminar la imagen.') + '</p>');
            }
        });
    }

    document.addEventListener('tienda:layout', cargar);

    document.addEventListener('DOMContentLoaded', function () {
        var form = document.getElementById('form-buscar');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var q = document.getElementById('b-q').value.trim();
                location.href = q ? Tienda.paginas + 'admin.html?q=' + encodeURIComponent(q) : Tienda.paginas + 'admin.html';
            });
        }

        var formUsuario = document.getElementById('form-usuario');
        if (formUsuario) {
            formUsuario.addEventListener('submit', function (e) {
                e.preventDefault();
                var datos = {
                    recurso: 'usuario_actualizar',
                    idusuario: document.getElementById('u-id').value,
                    nombre: document.getElementById('u-nombre').value.trim(),
                    usuario: document.getElementById('u-usuario').value.trim(),
                    correo: document.getElementById('u-correo').value.trim(),
                    rol: document.getElementById('u-rol').value,
                    clave: document.getElementById('u-clave').value,
                    clave2: document.getElementById('u-clave2').value
                };
                var btn = formUsuario.querySelector('button[type="submit"]');
                btn.disabled = true;
                Tienda.apiPost(datos).then(function (r) {
                    btn.disabled = false;
                    if (r.ok) {
                        mostrarMsg('msg_save', '<p>' + Tienda.esc(r.msg || 'Usuario modificado correctamente.') + '</p>');
                        setTimeout(function () {
                            cerrarModal();
                            cargar();
                        }, 700);
                    } else {
                        mostrarMsg('msg_error', '<p>' + Tienda.esc(r.error || 'Error al modificar el usuario.') + '</p>');
                    }
                });
            });
        }

        /* --- Productos --- */
        var formBuscarP = document.getElementById('form-buscar-p');
        if (formBuscarP) {
            formBuscarP.addEventListener('submit', function (e) {
                e.preventDefault();
                cargarProductos(document.getElementById('b-p').value.trim());
            });
        }

        var limpiarP = document.getElementById('limpiar-p');
        if (limpiarP) {
            limpiarP.addEventListener('click', function () {
                document.getElementById('b-p').value = '';
                cargarProductos('');
            });
        }

        var btnNuevo = document.getElementById('btn-nuevo-producto');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', function () {
                abrirModalProducto(0);
            });
        }

        var formProducto = document.getElementById('form-producto');
        if (formProducto) {
            formProducto.addEventListener('submit', function (e) {
                e.preventDefault();
                var datos = {
                    recurso: 'producto_guardar',
                    codproducto: document.getElementById('p-id').value,
                    nombre: document.getElementById('p-nombre').value.trim(),
                    descripcion: document.getElementById('p-descripcion').value.trim(),
                    precio: document.getElementById('p-precio').value,
                    existencia: document.getElementById('p-existencia').value,
                    categoria_id: document.getElementById('p-categoria').value,
                    marca: document.getElementById('p-marca').value.trim(),
                    tipo: document.getElementById('p-tipo').value.trim(),
                    imagen: document.getElementById('p-imagen').value.trim()
                };
                var btn = formProducto.querySelector('button[type="submit"]');
                btn.disabled = true;
                Tienda.apiPost(datos).then(function (r) {
                    btn.disabled = false;
                    if (r.ok) {
                        mostrarMsgP('msg_save', '<p>' + Tienda.esc(r.msg || 'Producto guardado correctamente.') + '</p>');
                        setTimeout(function () {
                            cerrarModalProducto();
                            cargarProductos(document.getElementById('b-p').value.trim());
                        }, 700);
                    } else {
                        mostrarMsgP('msg_error', '<p>' + Tienda.esc(r.error || 'Error al guardar el producto.') + '</p>');
                    }
                });
            });
        }

        var cancelarP = document.getElementById('p-cancelar');
        if (cancelarP) {
            cancelarP.addEventListener('click', cerrarModalProducto);
        }

        var cerrarP = document.getElementById('p-cerrar');
        if (cerrarP) {
            cerrarP.addEventListener('click', cerrarModalProducto);
        }

        var modalP = document.getElementById('modal-producto');
        if (modalP) {
            modalP.addEventListener('click', function (e) {
                if (e.target === modalP) cerrarModalProducto();
            });
        }

        /* --- Slider --- */
        var formSlider = document.getElementById('form-slider-subir');
        if (formSlider) {
            formSlider.addEventListener('submit', function (e) {
                e.preventDefault();
                var input = document.getElementById('sl-imagen');
                if (!input.files || !input.files.length) return;
                var fd = new FormData();
                fd.append('recurso', 'slider_subir');
                fd.append('imagen', input.files[0]);
                var btn = formSlider.querySelector('button[type="submit"]');
                btn.disabled = true;
                Tienda.apiUpload(fd).then(function (r) {
                    btn.disabled = false;
                    if (r.ok) {
                        mostrarMsgSlider('msg_save', '<p>' + Tienda.esc(r.msg || 'Imagen agregada.') + '</p>');
                        input.value = '';
                        cargarSlider();
                    } else {
                        mostrarMsgSlider('msg_error', '<p>' + Tienda.esc(r.error || 'No se pudo subir la imagen.') + '</p>');
                    }
                });
            });
        }

        /* --- Pestañas --- */
        [document.getElementById('pest-usuarios'), document.getElementById('pest-productos'), document.getElementById('pest-slider')].forEach(function (btn) {
            if (btn) {
                btn.addEventListener('click', function () {
                    cambiarSeccion(btn.getAttribute('data-seccion'));
                });
            }
        });

        var cancelar = document.getElementById('u-cancelar');
        if (cancelar) {
            cancelar.addEventListener('click', cerrarModal);
        }

        var cerrar = document.getElementById('u-cerrar');
        if (cerrar) {
            cerrar.addEventListener('click', cerrarModal);
        }

        var modal = document.getElementById('modal-usuario');
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) cerrarModal();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                cerrarModal();
                cerrarModalProducto();
            }
        });
    });
})();