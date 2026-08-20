/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Login */
(function () {
    'use strict';

    document.addEventListener('tienda:layout', function () {
        if (Tienda.logueado) {
            location.href = Tienda.base + 'index.html';
            return;
        }
        var form = document.getElementById('form-login');
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var msg = document.getElementById('msg');
            var usuario = document.getElementById('login-usuario').value.trim();
            var clave = document.getElementById('login-clave').value;

            if (!usuario || !clave) {
                msg.innerHTML = '<p class="msg_error">Ingrese su usuario y contraseña.</p>';
                return;
            }

            var btn = form.querySelector('input[type="submit"]');
            btn.disabled = true;

            Tienda.apiPost({ recurso: 'login', usuario: usuario, clave: clave }).then(function (r) {
                if (r.ok) {
                    location.href = Tienda.base + 'index.html';
                } else {
                    btn.disabled = false;
                    msg.innerHTML = '<p class="msg_error">' + Tienda.esc(r.error || 'Error al iniciar sesión.') + '</p>';
                }
            });
        });
    });
})();
