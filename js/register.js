/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Registro */
(function () {
    'use strict';

    document.addEventListener('tienda:layout', function () {
        if (Tienda.logueado) {
            location.href = Tienda.base + 'index.html';
            return;
        }
        var form = document.getElementById('form-register');
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var msg = document.getElementById('msg');

            var datos = {
                recurso: 'register',
                nombre: document.getElementById('reg-nombre').value.trim(),
                usuario: document.getElementById('reg-usuario').value.trim(),
                correo: document.getElementById('reg-correo').value.trim(),
                clave: document.getElementById('reg-clave').value,
                clave2: document.getElementById('reg-clave2').value,
                campo_extra: document.getElementById('campo-extra') ? document.getElementById('campo-extra').value : ''
            };

            var btn = form.querySelector('input[type="submit"]');
            btn.disabled = true;

            Tienda.apiPost(datos).then(function (r) {
                btn.disabled = false;
                if (r.ok) {
                    msg.innerHTML = '<p class="msg_save">' + Tienda.esc(r.msg || 'El usuario creado correctamente.') + '</p>';
                    form.reset();
                } else {
                    msg.innerHTML = '<p class="msg_error">' + Tienda.esc(r.error || 'Error al crear el usuario.') + '</p>';
                }
            });
        });
    });
})();
