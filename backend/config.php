<?php
/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
declare(strict_types=1);

/* La conexión a la base de datos se centraliza en conection.php (función db()). */
require_once __DIR__ . '/conection.php';

const MAX_INTENTOS_LOGIN = 5;
const TIEMPO_BLOQUEO_LOGIN = 600;
const CLAVE_MIN_LONGITUD = 8;
const CATEGORIAS_PERMITIDAS = ['gaming', 'pc', 'cel', 'comp', 'mob', 'alman'];

/* Facturación: impuesto (% sobre subtotal) y costo de envío fijo.
   Ajusta aquí según la legislación que aplique a la tienda. */
const IMPUESTO_PORCIENTO = 0;
const ENVIO_COSTO = 0;

if (session_status() === PHP_SESSION_NONE) {
    $cookieParams = session_get_cookie_params();
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => $cookieParams['path'],
        'domain' => $cookieParams['domain'],
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header("Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; base-uri 'self'");

/* Producción: nunca exponer errores por pantalla (la API debe responder solo JSON). */
ini_set('display_errors', '0');
ini_set('log_errors', '1');

function esta_logueado(): bool
{
    return !empty($_SESSION['active']);
}

function rol_actual(): int
{
    return (int)($_SESSION['rol'] ?? 0);
}

function es_admin(): bool
{
    return esta_logueado() && rol_actual() === 1;
}

function categoria_valida(string $categoria): bool
{
    return in_array($categoria, CATEGORIAS_PERMITIDAS, true);
}

function categorias_menu(): array
{
    return [
        ['slug' => 'gaming', 'nombre' => 'Equipo Gaming'],
        ['slug' => 'pc', 'nombre' => 'Computadoras'],
        ['slug' => 'cel', 'nombre' => 'Celulares'],
        ['slug' => 'comp', 'nombre' => 'Componentes'],
        ['slug' => 'mob', 'nombre' => 'Mobiliario'],
        ['slug' => 'alman', 'nombre' => 'Almacenamiento'],
    ];
}

function categorias_nav(): array
{
    return [
        'gaming' => [
            ['label' => 'Laptops', 'tipo' => 'Laptops'],
            ['label' => 'Consolas', 'tipo' => 'Consolas'],
            ['label' => 'Celulares', 'tipo' => 'Celulares'],
            ['label' => 'Equipo de mesa', 'tipo' => 'Equipo de mesa'],
            ['label' => 'Juegos', 'tipo' => 'Juegos'],
        ],
        'pc' => [
            ['label' => 'Laptops', 'sub' => [
                ['label' => 'DELL', 'marca' => 'Dell'],
                ['label' => 'HP', 'marca' => 'HP'],
                ['label' => 'ASUS', 'marca' => 'Asus'],
                ['label' => 'Lenovo', 'marca' => 'Lenovo'],
                ['label' => 'Acer', 'marca' => 'Acer'],
                ['label' => 'Apple', 'marca' => 'Apple'],
            ]],
            ['label' => 'Equipo de escritorio', 'sub' => [
                ['label' => 'Apple', 'marca' => 'Apple'],
                ['label' => 'HP', 'marca' => 'HP'],
                ['label' => 'DELL', 'marca' => 'Dell'],
            ]],
            ['label' => 'Software', 'tipo' => 'Software'],
        ],
        'cel' => [
            ['label' => 'SAMSUNG', 'marca' => 'Samsung'],
            ['label' => 'HUAWEI', 'marca' => 'Huawei'],
            ['label' => 'IPHONE', 'marca' => 'Apple'],
            ['label' => 'LG', 'marca' => 'LG'],
            ['label' => 'XIOMI', 'marca' => 'Xiaomi'],
            ['label' => 'MOTOROLA', 'marca' => 'Motorola'],
        ],
        'comp' => [
            ['label' => 'ACCESORIOS', 'tipo' => 'Accesorios'],
            ['label' => 'IMPRESORAS', 'tipo' => 'Impresoras'],
            ['label' => 'PROYECTORES', 'tipo' => 'Proyectores'],
            ['label' => 'PANTALLAS', 'tipo' => 'Pantallas'],
            ['label' => 'ROUTER', 'tipo' => 'Router'],
        ],
        'mob' => [
            ['label' => 'ESCRITORIO', 'tipo' => 'Escritorio'],
            ['label' => 'SILLAS DE OFICINA', 'tipo' => 'Sillas de oficina'],
            ['label' => 'SOPORTES', 'tipo' => 'Soportes'],
        ],
        'alman' => [
            ['label' => 'DISCOS DUROS', 'tipo' => 'Discos duros'],
            ['label' => 'USB', 'tipo' => 'USB'],
            ['label' => 'DISCOS EXTERNOS', 'tipo' => 'Discos externos'],
            ['label' => 'TARJETAS DE MEMORIA', 'tipo' => 'Tarjetas de memoria'],
        ],
    ];
}

function nombre_categoria(string $categoria): string
{
    foreach (categorias_menu() as $cat) {
        if ($cat['slug'] === $categoria) {
            return $cat['nombre'];
        }
    }
    return ucfirst($categoria);
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function es_csrf_valido(?string $token): bool
{
    return !empty($_SESSION['csrf_token'])
        && is_string($token)
        && hash_equals($_SESSION['csrf_token'], $token);
}

function login_bloqueado(): bool
{
    $intentos = $_SESSION['intentos_login'] ?? ['n' => 0, 't' => 0];
    return $intentos['n'] >= MAX_INTENTOS_LOGIN && (time() - $intentos['t']) < TIEMPO_BLOQUEO_LOGIN;
}

function registrar_intento_fallido(): void
{
    $intentos = $_SESSION['intentos_login'] ?? ['n' => 0, 't' => 0];
    $intentos['n']++;
    $intentos['t'] = time();
    $_SESSION['intentos_login'] = $intentos;
}

function limpiar_intentos_login(): void
{
    unset($_SESSION['intentos_login']);
}

function carrito(): array
{
    return is_array($_SESSION['carrito'] ?? null) ? $_SESSION['carrito'] : [];
}

function carrito_total_unidades(): int
{
    return (int)array_sum(carrito());
}

function metodos_pago(): array
{
    return [
        ['id' => 'efectivo', 'nombre' => 'Efectivo', 'requiere_tarjeta' => false],
        ['id' => 'tarjeta', 'nombre' => 'Tarjeta de crédito/débito', 'requiere_tarjeta' => true],
        ['id' => 'transferencia', 'nombre' => 'Transferencia bancaria', 'requiere_tarjeta' => false],
    ];
}

function metodo_pago_valido(string $id): bool
{
    foreach (metodos_pago() as $m) {
        if ($m['id'] === $id) {
            return true;
        }
    }
    return false;
}

function nombre_metodo_pago(string $id): string
{
    foreach (metodos_pago() as $m) {
        if ($m['id'] === $id) {
            return $m['nombre'];
        }
    }
    return $id;
}

function estados_pedido(): array
{
    return ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];
}

function estado_pedido_valido(string $estado): bool
{
    return in_array($estado, estados_pedido(), true);
}
