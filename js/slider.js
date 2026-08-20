/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
/* Tienda - Slider del banner: nativo, accesible, sin dependencias.
   Autoplay con pausa al pasar el ratón o enfocar; navegación por
   teclado, puntos, gestos táctiles y soporte de movimiento reducido.
   Las diapositivas se cargan desde la API (recurso slider): se espera
   a que aparezcan antes de inicializar el carrusel. */
(function () {
    'use strict';

    var INTERVALO = 5000;
    var UMBRAL_DESLIZAR = 40;

    var slider = document.getElementById('slider');
    if (!slider) return;

    var viewport = document.getElementById('slider-viewport');
    var track = document.getElementById('slider-track');
    var contDots = document.getElementById('slider-dots');
    var live = document.getElementById('slider-live');
    var btnAnterior = slider.querySelector('[data-slider-anterior]');
    var btnSiguiente = slider.querySelector('[data-slider-siguiente]');

    var iniciado = false;

    function iniciar() {
        if (iniciado) return;

        var slides = Array.prototype.slice.call(track.querySelectorAll('.slider-slide'));
        if (slides.length === 0) return;

        iniciado = true;

        var total = slides.length;
        var actual = 0;
        var temporizador = null;
        var movimientoReducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function construirPuntos() {
            if (!contDots) return;
            var html = '';
            slides.forEach(function (_, i) {
                html += '<button type="button" class="slider-dot" data-slide="' + i + '" aria-label="Ir a la diapositiva ' + (i + 1) + ' de ' + total + '"></button>';
            });
            contDots.innerHTML = html;
        }

        function irA(indice) {
            actual = (indice + total) % total;
            track.style.transform = 'translateX(-' + (actual * 100) + '%)';

            slides.forEach(function (s, i) {
                if (i === actual) {
                    s.removeAttribute('aria-hidden');
                } else {
                    s.setAttribute('aria-hidden', 'true');
                }
            });

            var dots = contDots ? contDots.querySelectorAll('.slider-dot') : [];
            dots.forEach(function (d, i) {
                if (i === actual) {
                    d.setAttribute('aria-current', 'true');
                    d.setAttribute('tabindex', '0');
                } else {
                    d.removeAttribute('aria-current');
                    d.setAttribute('tabindex', '-1');
                }
            });

            if (live) {
                live.textContent = 'Diapositiva ' + (actual + 1) + ' de ' + total;
            }
        }

        function siguiente() { irA(actual + 1); }
        function anterior() { irA(actual - 1); }

        function reiniciarAutoplay() {
            if (temporizador) { clearInterval(temporizador); temporizador = null; }
            if (movimientoReducido) return;
            temporizador = setInterval(siguiente, INTERVALO);
        }

        function pausar() {
            if (temporizador) { clearInterval(temporizador); temporizador = null; }
        }

        function conectarEventos() {
            if (btnAnterior) btnAnterior.addEventListener('click', function () { anterior(); reiniciarAutoplay(); });
            if (btnSiguiente) btnSiguiente.addEventListener('click', function () { siguiente(); reiniciarAutoplay(); });

            if (contDots) {
                contDots.addEventListener('click', function (e) {
                    var dot = e.target.closest ? e.target.closest('.slider-dot') : null;
                    if (!dot) return;
                    irA(parseInt(dot.getAttribute('data-slide'), 10) || 0);
                    reiniciarAutoplay();
                });
            }

            /* Teclado: flechas funcionan cuando el foco está dentro del slider. */
            slider.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowLeft') { anterior(); reiniciarAutoplay(); e.preventDefault(); }
                else if (e.key === 'ArrowRight') { siguiente(); reiniciarAutoplay(); e.preventDefault(); }
            });

            /* Pausa al pasar el ratón o enfocar; se reanuda al salir. */
            slider.addEventListener('mouseenter', pausar);
            slider.addEventListener('mouseleave', reiniciarAutoplay);
            slider.addEventListener('focusin', pausar);
            slider.addEventListener('focusout', reiniciarAutoplay);

            /* Gestos táctiles / puntero. */
            if (window.PointerEvent && viewport) {
                var inicioX = null;
                viewport.addEventListener('pointerdown', function (e) {
                    inicioX = e.clientX;
                });
                viewport.addEventListener('pointerup', function (e) {
                    if (inicioX === null) return;
                    var delta = e.clientX - inicioX;
                    if (Math.abs(delta) >= UMBRAL_DESLIZAR) {
                        if (delta < 0) { siguiente(); } else { anterior(); }
                        reiniciarAutoplay();
                    }
                    inicioX = null;
                });
                viewport.addEventListener('pointercancel', function () { inicioX = null; });
            }
        }

        construirPuntos();
        irA(0);
        conectarEventos();
        reiniciarAutoplay();
    }

    iniciar();
    if (!iniciado && track && window.MutationObserver) {
        var observador = new MutationObserver(function () { iniciar(); });
        observador.observe(track, { childList: true });
    }
})();