<?php
/*
 * Copyright (C) 2026 James Shewbridge
 * Licensed under the GNU General Public License v3.0.
 * See LICENSE file in the project root for full license text.
 */
require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function json_out(array $data): void
{
    $out = json_encode($data, JSON_UNESCAPED_UNICODE);
    if ($out === false) {
        http_response_code(500);
        echo '{"ok":false,"error":"No se pudo generar la respuesta."}';
        exit;
    }
    echo $out;
    exit;
}

function json_error(string $msg, int $codigo = 400): void
{
    http_response_code($codigo);
    json_out(['ok' => false, 'error' => $msg]);
}

/* Cualquier excepción no controlada responde JSON 500 (nunca HTML). */
set_exception_handler(function (Throwable $e): void {
    error_log('[tienda/api] ' . $e->getMessage());
    json_error('Error interno del servidor.', 500);
});

$metodo = $_SERVER['REQUEST_METHOD'];
$recurso = ($metodo === 'GET') ? ($_GET['recurso'] ?? '') : ($_POST['recurso'] ?? '');

if ($metodo === 'GET') {
    switch ($recurso) {
        case 'layout':
            json_out([
                'ok' => true,
                'logueado' => esta_logueado(),
                'usuario' => esta_logueado() ? ($_SESSION['usuario'] ?? null) : null,
                'avatar' => esta_logueado() ? ($_SESSION['avatar'] ?? null) : null,
                'rol' => rol_actual(),
                'es_admin' => es_admin(),
                'csrf' => csrf_token(),
                'menu' => categorias_menu(),
                'carrito_unidades' => carrito_total_unidades(),
            ]);

        case 'csrf':
            json_out(['ok' => true, 'csrf' => csrf_token()]);

        case 'destacados':
            try {
                $stmt = db()->query(
                    'SELECT p.*, c.categoria FROM producto p
                     JOIN categoria c ON c.idcategoria = p.categoria_id
                     WHERE p.existencia > 0
                     ORDER BY p.codproducto DESC LIMIT 8'
                );
                json_out(['ok' => true, 'productos' => $stmt->fetchAll()]);
            } catch (PDOException $e) {
                json_error('No se pudieron cargar los productos.', 500);
            }

        case 'categorias':
            $categoria = $_GET['categoria'] ?? 'gaming';
            if (!categoria_valida($categoria)) {
                $categoria = 'gaming';
            }

            $marca = isset($_GET['marca']) ? (string)$_GET['marca'] : '';
            $tipo = isset($_GET['tipo']) ? (string)$_GET['tipo'] : '';
            $q = trim((string)($_GET['q'] ?? ''));
            $q = mb_substr($q, 0, 100);

            $ordenes = [
                'novedades' => 'codproducto DESC',
                'precio_asc' => 'precio ASC',
                'precio_desc' => 'precio DESC',
                'nombre' => 'nombreproducto ASC',
            ];
            $orden = $_GET['orden'] ?? 'novedades';
            if (!isset($ordenes[$orden])) {
                $orden = 'novedades';
            }

            $porPagina = 8;
            $pagina = max(1, (int)($_GET['pagina'] ?? 1));

            try {
                $pdo = db();

                /* Opciones de filtro reales: marcas y tipos presentes en la BD. */
                $marcas = [];
                $tipos = [];
                $stmt = $pdo->prepare(
                    'SELECT DISTINCT p.marca FROM producto p
                     JOIN categoria c ON c.idcategoria = p.categoria_id
                     WHERE c.categoria = ? AND p.marca IS NOT NULL AND p.marca <> \'\' ORDER BY p.marca'
                );
                $stmt->execute([$categoria]);
                $marcas = array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));

                $stmt = $pdo->prepare(
                    'SELECT DISTINCT p.tipo FROM producto p
                     JOIN categoria c ON c.idcategoria = p.categoria_id
                     WHERE c.categoria = ? AND p.tipo IS NOT NULL AND p.tipo <> \'\' ORDER BY p.tipo'
                );
                $stmt->execute([$categoria]);
                $tipos = array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));

                if ($marca !== '' && !in_array($marca, $marcas, true)) {
                    $marca = '';
                }
                if ($tipo !== '' && !in_array($tipo, $tipos, true)) {
                    $tipo = '';
                }

                $sql = 'FROM producto p JOIN categoria c ON c.idcategoria = p.categoria_id WHERE c.categoria = ?';
                $params = [$categoria];
                if ($marca !== '') {
                    $sql .= ' AND p.marca = ?';
                    $params[] = $marca;
                }
                if ($tipo !== '') {
                    $sql .= ' AND p.tipo = ?';
                    $params[] = $tipo;
                }
                if ($q !== '') {
                    $sql .= ' AND (p.nombreproducto LIKE ? OR p.descripcion LIKE ?)';
                    $like = '%' . addcslashes($q, '%_') . '%';
                    $params[] = $like;
                    $params[] = $like;
                }

                $stmt = $pdo->prepare('SELECT COUNT(*) AS n ' . $sql);
                $stmt->execute($params);
                $total = (int)$stmt->fetch()['n'];

                $totalPaginas = max(1, (int)ceil($total / $porPagina));
                if ($pagina > $totalPaginas) {
                    $pagina = $totalPaginas;
                }
                $offset = ($pagina - 1) * $porPagina;

                $stmt = $pdo->prepare('SELECT p.* ' . $sql . ' ORDER BY ' . $ordenes[$orden] . ' LIMIT ' . (int)$porPagina . ' OFFSET ' . (int)$offset);
                $stmt->execute($params);
                $productos = $stmt->fetchAll();

                json_out([
                    'ok' => true,
                    'categoria' => $categoria,
                    'categoria_nombre' => nombre_categoria($categoria),
                    'productos' => $productos,
                    'total' => $total,
                    'total_paginas' => $totalPaginas,
                    'pagina' => $pagina,
                    'marcas' => $marcas,
                    'tipos' => $tipos,
                    'marca' => $marca,
                    'tipo' => $tipo,
                    'q' => $q,
                    'orden' => $orden,
                ]);
            } catch (PDOException $e) {
                json_error('No se pudieron cargar los productos.', 500);
            }

        case 'subnav':
            $categoria = $_GET['categoria'] ?? 'gaming';
            if (!categoria_valida($categoria)) {
                $categoria = 'gaming';
            }
            json_out([
                'ok' => true,
                'categoria' => $categoria,
                'categoria_nombre' => nombre_categoria($categoria),
                'items' => categorias_nav()[$categoria] ?? [],
            ]);

        case 'producto':
            $codproducto = isset($_GET['codproducto']) ? (int)$_GET['codproducto'] : 0;
            $categoria = $_GET['categoria'] ?? 'gaming';
            if (!categoria_valida($categoria)) {
                $categoria = 'gaming';
            }

            $producto = null;
            $relacionados = [];

            if ($codproducto > 0) {
                try {
                    $pdo = db();
                    $stmt = $pdo->prepare('SELECT p.*, c.categoria FROM producto p JOIN categoria c ON c.idcategoria = p.categoria_id WHERE p.codproducto = ? LIMIT 1');
                    $stmt->execute([$codproducto]);
                    $producto = $stmt->fetch() ?: null;

                    if ($producto) {
                        $categoria = $producto['categoria'];
                        $stmt = $pdo->prepare('SELECT p.* FROM producto p WHERE p.categoria_id = ? AND p.codproducto <> ? AND p.existencia > 0 ORDER BY p.codproducto DESC LIMIT 4');
                        $stmt->execute([$producto['categoria_id'], $codproducto]);
                        $relacionados = $stmt->fetchAll();
                    }
                } catch (PDOException $e) {
                    json_error('No se pudo consultar el producto.', 500);
                }
            }

            json_out([
                'ok' => true,
                'producto' => $producto,
                'categoria' => $categoria,
                'categoria_nombre' => nombre_categoria($categoria),
                'relacionados' => $relacionados,
            ]);

        case 'usuarios':
            if (!es_admin()) {
                json_error('No autorizado.', 403);
            }
            $q = trim((string)($_GET['q'] ?? ''));
            $q = mb_substr($q, 0, 100);
            try {
                $sql = 'SELECT u.idusuario, u.nombre, u.usuario, u.correo, u.rol, r.rol AS rol_nombre, u.avatar
                        FROM usuario u
                        INNER JOIN rol r ON u.rol = r.idrol';
                $params = [];
                if ($q !== '') {
                    $sql .= ' WHERE (u.nombre LIKE ? OR u.usuario LIKE ? OR u.correo LIKE ? OR r.rol LIKE ?)';
                    $like = '%' . addcslashes($q, '%_') . '%';
                    $params = [$like, $like, $like, $like];
                }
                $sql .= ' ORDER BY u.idusuario';
                $stmt = db()->prepare($sql);
                $stmt->execute($params);
                json_out(['ok' => true, 'usuarios' => $stmt->fetchAll(), 'q' => $q]);
            } catch (PDOException $e) {
                json_error('No se pudieron cargar los usuarios.', 500);
            }

        case 'productos_admin':
            if (!es_admin()) {
                json_error('No autorizado.', 403);
            }
            $q = trim((string)($_GET['q'] ?? ''));
            $q = mb_substr($q, 0, 100);
            try {
                $sql = 'SELECT p.codproducto, p.nombreproducto, p.descripcion, p.precio, p.existencia, p.imagen, p.categoria_id, p.marca, p.tipo,
                               c.categoria, c.nombre AS categoria_nombre
                        FROM producto p
                        INNER JOIN categoria c ON c.idcategoria = p.categoria_id';
                $params = [];
                if ($q !== '') {
                    $sql .= ' WHERE (p.nombreproducto LIKE ? OR p.marca LIKE ? OR p.tipo LIKE ? OR c.nombre LIKE ?)';
                    $like = '%' . addcslashes($q, '%_') . '%';
                    $params = [$like, $like, $like, $like];
                }
                $sql .= ' ORDER BY p.codproducto DESC';
                $stmt = db()->prepare($sql);
                $stmt->execute($params);
                $categorias = db()->query('SELECT idcategoria, categoria, nombre FROM categoria ORDER BY nombre')->fetchAll();
                json_out(['ok' => true, 'productos' => $stmt->fetchAll(), 'categorias' => $categorias, 'q' => $q]);
            } catch (PDOException $e) {
                json_error('No se pudieron cargar los productos.', 500);
            }

        case 'perfil':
            if (!esta_logueado()) {
                json_error('No autorizado.', 403);
            }
            json_out([
                'ok' => true,
                'nombre' => $_SESSION['nombre'] ?? '',
                'correo' => $_SESSION['correo'] ?? '',
                'usuario' => $_SESSION['usuario'] ?? '',
            ]);

        case 'metodos_pago':
            json_out(['ok' => true, 'metodos' => metodos_pago()]);

        case 'slider':
            $dir = __DIR__ . '/../imagenes/slider';
            $imagenes = [];
            if (is_dir($dir)) {
                $permitidas = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
                foreach (scandir($dir) as $f) {
                    if ($f === '.' || $f === '..') {
                        continue;
                    }
                    $ruta = $dir . DIRECTORY_SEPARATOR . $f;
                    if (!is_file($ruta)) {
                        continue;
                    }
                    $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
                    if (in_array($ext, $permitidas, true)) {
                        $imagenes[] = $f;
                    }
                }
            }
            sort($imagenes, SORT_STRING);
            json_out(['ok' => true, 'imagenes' => $imagenes]);

        case 'mis_pedidos':
            if (!esta_logueado()) {
                json_error('No autorizado.', 403);
            }
            try {
                $stmt = db()->prepare(
                    'SELECT v.idventa, v.fecha, v.metodo_pago, v.total, v.estado,
                            (SELECT COUNT(*) FROM venta_detalle d WHERE d.idventa = v.idventa) AS lineas
                     FROM venta v
                     WHERE v.idusuario = ?
                     ORDER BY v.idventa DESC'
                );
                $stmt->execute([(int)$_SESSION['id_usuario']]);
                json_out(['ok' => true, 'pedidos' => $stmt->fetchAll()]);
            } catch (PDOException $e) {
                json_error('No se pudieron cargar los pedidos.', 500);
            }

        case 'pedido':
            $idventa = (int)($_GET['idventa'] ?? 0);
            if ($idventa <= 0) {
                json_error('Pedido no válido.', 400);
            }
            if (!esta_logueado()) {
                json_error('No autorizado.', 403);
            }
            try {
                $pdo = db();
                $stmt = $pdo->prepare('SELECT v.*, u.usuario AS usuario_login FROM venta v JOIN usuario u ON u.idusuario = v.idusuario WHERE v.idventa = ? LIMIT 1');
                $stmt->execute([$idventa]);
                $venta = $stmt->fetch();
                if (!$venta) {
                    json_error('El pedido no existe.', 404);
                }
                if ((int)$venta['idusuario'] !== (int)$_SESSION['id_usuario'] && !es_admin()) {
                    json_error('No autorizado.', 403);
                }
                $stmt = $pdo->prepare(
                    'SELECT d.iddetalle, d.codproducto, d.nombreproducto, d.precio, d.cantidad, d.subtotal, p.imagen
                     FROM venta_detalle d
                     LEFT JOIN producto p ON p.codproducto = d.codproducto
                     WHERE d.idventa = ?'
                );
                $stmt->execute([$idventa]);
                $venta['detalle'] = $stmt->fetchAll();
                $venta['metodo_nombre'] = nombre_metodo_pago($venta['metodo_pago']);
                json_out(['ok' => true, 'venta' => $venta]);
            } catch (PDOException $e) {
                json_error('No se pudo consultar el pedido.', 500);
            }

        case 'pedidos':
            if (!es_admin()) {
                json_error('No autorizado.', 403);
            }
            $estado = trim((string)($_GET['estado'] ?? ''));
            $q = trim((string)($_GET['q'] ?? ''));
            $q = mb_substr($q, 0, 100);
            try {
                $sql = 'SELECT v.idventa, v.fecha, v.nombre, v.correo, v.metodo_pago, v.total, v.estado, u.usuario AS usuario_login
                        FROM venta v
                        INNER JOIN usuario u ON u.idusuario = v.idusuario';
                $params = [];
                if ($estado !== '' && estado_pedido_valido($estado)) {
                    $sql .= ' WHERE v.estado = ?';
                    $params[] = $estado;
                }
                if ($q !== '') {
                    $sql .= ($params ? ' AND' : ' WHERE') . ' (v.nombre LIKE ? OR v.correo LIKE ? OR u.usuario LIKE ? OR v.idventa LIKE ?)';
                    $like = '%' . addcslashes($q, '%_') . '%';
                    array_push($params, $like, $like, $like, $like);
                }
                $sql .= ' ORDER BY v.idventa DESC';
                $stmt = db()->prepare($sql);
                $stmt->execute($params);
                $pedidos = $stmt->fetchAll();
                foreach ($pedidos as &$ped) {
                    $ped['metodo_nombre'] = nombre_metodo_pago($ped['metodo_pago']);
                }
                unset($ped);
                json_out(['ok' => true, 'pedidos' => $pedidos, 'estados' => estados_pedido()]);
            } catch (PDOException $e) {
                json_error('No se pudieron cargar los pedidos.', 500);
            }

        case 'carrito':
            $carrito = carrito();
            $items = [];
            $total = 0.0;
            if (!empty($carrito)) {
                $ids = array_keys($carrito);
                $lugares = implode(',', array_fill(0, count($ids), '?'));
                try {
                    $stmt = db()->prepare("SELECT p.*, c.categoria FROM producto p JOIN categoria c ON c.idcategoria = p.categoria_id WHERE p.codproducto IN ($lugares)");
                    $stmt->execute($ids);
                    foreach ($stmt->fetchAll() as $producto) {
                        $cod = (int)$producto['codproducto'];
                        $cantidad = (int)$carrito[$cod];
                        $subtotal = (float)$producto['precio'] * $cantidad;
                        $total += $subtotal;
                        $items[] = [
                            'producto' => $producto,
                            'cantidad' => $cantidad,
                            'subtotal' => $subtotal,
                        ];
                    }
                } catch (PDOException $e) {
                    json_error('No se pudo leer el carrito.', 500);
                }
            }
            json_out([
                'ok' => true,
                'items' => $items,
                'total' => $total,
                'unidades' => carrito_total_unidades(),
            ]);

        default:
            json_error('Recurso no válido.', 404);
    }
}

if ($metodo === 'POST') {
    switch ($recurso) {
        case 'login':
            if (login_bloqueado()) {
                json_out([
                    'ok' => false,
                    'error' => 'Demasiados intentos fallidos. Espere ' . (TIEMPO_BLOQUEO_LOGIN / 60) . ' minutos.',
                    'bloqueado' => true,
                ]);
            }
            if (!es_csrf_valido($_POST['csrf_token'] ?? null)) {
                json_error('Token de seguridad inválido. Recargue la página.');
            }

            $usuario = trim($_POST['usuario'] ?? '');
            $clave = $_POST['clave'] ?? '';

            if ($usuario === '' || $clave === '') {
                json_error('Ingrese su usuario y contraseña.');
            }

            try {
                $stmt = db()->prepare('SELECT idusuario, nombre, correo, usuario, clave, rol, avatar FROM usuario WHERE usuario = ?');
                $stmt->execute([$usuario]);
                $fila = $stmt->fetch();

                if ($fila && password_verify($clave, $fila['clave'])) {
                    limpiar_intentos_login();
                    session_regenerate_id(true);
                    $_SESSION['active'] = true;
                    $_SESSION['id_usuario'] = (int)$fila['idusuario'];
                    $_SESSION['nombre'] = $fila['nombre'];
                    $_SESSION['correo'] = $fila['correo'];
                    $_SESSION['usuario'] = $fila['usuario'];
                    $_SESSION['rol'] = (int)$fila['rol'];
                    $_SESSION['avatar'] = $fila['avatar'];
                    json_out(['ok' => true]);
                }

                registrar_intento_fallido();
                if (login_bloqueado()) {
                    json_out([
                        'ok' => false,
                        'error' => 'Demasiados intentos fallidos. Espere ' . (TIEMPO_BLOQUEO_LOGIN / 60) . ' minutos.',
                        'bloqueado' => true,
                    ]);
                }
                json_error('USUARIO O CONTRASEÑA INCORRECTA.');
            } catch (PDOException $e) {
                json_error('No se pudo iniciar sesión en este momento.', 500);
            }

        case 'register':
            if (!empty($_POST['campo_extra'])) {
                json_out([
                    'ok' => true,
                    'msg' => 'El usuario creado correctamente.',
                ]);
            }
            if (!es_csrf_valido($_POST['csrf_token'] ?? null)) {
                json_error('Token de seguridad inválido. Recargue la página.');
            }

            $nombre = trim($_POST['nombre'] ?? '');
            $email = trim($_POST['correo'] ?? '');
            $usuario = trim($_POST['usuario'] ?? '');
            $clave = $_POST['clave'] ?? '';
            $clave2 = $_POST['clave2'] ?? '';
            /* El registro público siempre crea cuentas de cliente (rol 2):
               impedir que un visitante se autoasigne rol de vendedor o admin. */
            $rol = 2;

            if ($nombre === '' || $email === '' || $usuario === '' || $clave === '') {
                json_error('Todos los campos son obligatorios.');
            }
            if (!preg_match("/^[A-Za-zÁÉÍÓÚáéíóúÑñ '.-]{2,100}$/", $nombre)) {
                json_error('El nombre solo puede contener letras, espacios y algunos signos (2 a 100 caracteres).');
            }
            if (!preg_match('/^[A-Za-z0-9_.-]{3,50}$/', $usuario)) {
                json_error('El usuario solo puede contener letras, números, punto, guion o guion bajo (3 a 50 caracteres).');
            }
            if (strlen($email) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                json_error('El correo electrónico no es válido.');
            }
            if (strlen($clave) < CLAVE_MIN_LONGITUD) {
                json_error('La contraseña debe tener al menos ' . CLAVE_MIN_LONGITUD . ' caracteres.');
            }
            if (strlen($clave) > 72) {
                json_error('La contraseña no puede superar los 72 caracteres.');
            }
            if ($clave !== $clave2) {
                json_error('Las contraseñas no coinciden.');
            }

            try {
                $stmt = db()->prepare('SELECT idusuario FROM usuario WHERE usuario = ? OR correo = ?');
                $stmt->execute([$usuario, $email]);
                if ($stmt->fetch()) {
                    json_error('El correo o el usuario ya existen.');
                }
                $hash = password_hash($clave, PASSWORD_DEFAULT);
                $stmt2 = db()->prepare('INSERT INTO usuario(nombre, usuario, correo, clave, rol) VALUES (?, ?, ?, ?, 2)');
                $stmt2->execute([$nombre, $usuario, $email, $hash]);
                json_out([
                    'ok' => true,
                    'msg' => 'El usuario creado correctamente.',
                ]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    json_error('El correo o el usuario ya existen.');
                }
                json_error('No se pudo crear el usuario en este momento.', 500);
            }

        case 'usuario_actualizar':
            if (!es_csrf_valido($_POST['csrf_token'] ?? null)) {
                json_error('Token de seguridad inválido. Recargue la página.');
            }
            if (!es_admin()) {
                json_error('No autorizado.', 403);
            }

            $idusuario = (int)($_POST['idusuario'] ?? 0);
            if ($idusuario <= 0) {
                json_error('Usuario no válido.');
            }

            $nombre = trim($_POST['nombre'] ?? '');
            $usuario = trim($_POST['usuario'] ?? '');
            $email = trim($_POST['correo'] ?? '');
            $rol = (int)($_POST['rol'] ?? 0);
            $clave = $_POST['clave'] ?? '';
            $clave2 = $_POST['clave2'] ?? '';

            if ($nombre === '' || $usuario === '' || $email === '') {
                json_error('Todos los campos son obligatorios.');
            }
            if (!preg_match("/^[A-Za-zÁÉÍÓÚáéíóúÑñ '.-]{2,100}$/", $nombre)) {
                json_error('El nombre solo puede contener letras, espacios y algunos signos (2 a 100 caracteres).');
            }
            if (!preg_match('/^[A-Za-z0-9_.-]{3,50}$/', $usuario)) {
                json_error('El usuario solo puede contener letras, números, punto, guion o guion bajo (3 a 50 caracteres).');
            }
            if (strlen($email) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                json_error('El correo electrónico no es válido.');
            }
            if (!in_array($rol, [1, 2, 3], true)) {
                json_error('El rol seleccionado no es válido.');
            }
            if ($clave !== '') {
                if (strlen($clave) < CLAVE_MIN_LONGITUD) {
                    json_error('La contraseña debe tener al menos ' . CLAVE_MIN_LONGITUD . ' caracteres.');
                }
                if (strlen($clave) > 72) {
                    json_error('La contraseña no puede superar los 72 caracteres.');
                }
                if ($clave !== $clave2) {
                    json_error('Las contraseñas no coinciden.');
                }
            }

            try {
                $pdo = db();
                $stmt = $pdo->prepare('SELECT idusuario, rol FROM usuario WHERE idusuario = ?');
                $stmt->execute([$idusuario]);
                $existente = $stmt->fetch();
                if (!$existente) {
                    json_error('El usuario no existe.', 404);
                }

                if ((int)$existente['rol'] === 1 && $rol !== 1) {
                    $stmt = $pdo->query('SELECT COUNT(*) AS n FROM usuario WHERE rol = 1');
                    if ((int)$stmt->fetch()['n'] <= 1) {
                        json_error('No puedes quitar el rol de administrador al último admin.');
                    }
                }
                if ((int)$_SESSION['id_usuario'] === $idusuario && $rol !== 1) {
                    json_error('No puedes cambiar tu propio rol.');
                }

                $stmt = $pdo->prepare('SELECT idusuario FROM usuario WHERE (usuario = ? OR correo = ?) AND idusuario <> ?');
                $stmt->execute([$usuario, $email, $idusuario]);
                if ($stmt->fetch()) {
                    json_error('El correo o el usuario ya existen.');
                }

                if ($clave !== '') {
                    $stmt = $pdo->prepare('UPDATE usuario SET nombre = ?, usuario = ?, correo = ?, rol = ?, clave = ? WHERE idusuario = ?');
                    $stmt->execute([$nombre, $usuario, $email, $rol, password_hash($clave, PASSWORD_DEFAULT), $idusuario]);
                } else {
                    $stmt = $pdo->prepare('UPDATE usuario SET nombre = ?, usuario = ?, correo = ?, rol = ? WHERE idusuario = ?');
                    $stmt->execute([$nombre, $usuario, $email, $rol, $idusuario]);
                }

                $stmt = $pdo->prepare('SELECT u.idusuario, u.nombre, u.usuario, u.correo, u.rol, r.rol AS rol_nombre, u.avatar
                                      FROM usuario u INNER JOIN rol r ON u.rol = r.idrol WHERE u.idusuario = ?');
                $stmt->execute([$idusuario]);
                json_out([
                    'ok' => true,
                    'msg' => 'Usuario modificado correctamente.',
                    'usuario' => $stmt->fetch(),
                ]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    json_error('El correo o el usuario ya existen.');
                }
                json_error('No se pudo modificar el usuario.', 500);
            }

        case 'producto_guardar':
            if (!es_csrf_valido($_POST['csrf_token'] ?? null)) {
                json_error('Token de seguridad inválido. Recargue la página.');
            }
            if (!es_admin()) {
                json_error('No autorizado.', 403);
            }

            $codproducto = (int)($_POST['codproducto'] ?? 0);
            $nombre = trim($_POST['nombre'] ?? '');
            $descripcion = trim($_POST['descripcion'] ?? '');
            $precio = (float)($_POST['precio'] ?? 0);
            $existencia = (int)($_POST['existencia'] ?? 0);
            $imagen = trim($_POST['imagen'] ?? '');
            $categoria_id = (int)($_POST['categoria_id'] ?? 0);
            $marca = trim($_POST['marca'] ?? '');
            $tipo = trim($_POST['tipo'] ?? '');

            if ($nombre === '') {
                json_error('El nombre del producto es obligatorio.');
            }
            if (mb_strlen($nombre) > 100) {
                json_error('El nombre no puede superar los 100 caracteres.');
            }
            if (mb_strlen($descripcion) > 2000) {
                json_error('La descripción es demasiado larga.');
            }
            if (!is_finite($precio) || $precio < 0 || $precio > 9999999.99) {
                json_error('El precio no es válido.');
            }
            if ($existencia < 0 || $existencia > 999999) {
                json_error('La existencia no es válida.');
            }
            if (mb_strlen($imagen) > 255 || ($imagen !== '' && !preg_match('/^[A-Za-z0-9_.\/\\-]+$/', $imagen))) {
                json_error('El nombre de imagen no es válido.');
            }
            if (mb_strlen($marca) > 50) {
                json_error('La marca es demasiado larga.');
            }
            if (mb_strlen($tipo) > 50) {
                json_error('El tipo es demasiado largo.');
            }

            try {
                $pdo = db();
                $stmt = $pdo->prepare('SELECT idcategoria FROM categoria WHERE idcategoria = ?');
                $stmt->execute([$categoria_id]);
                if (!$stmt->fetch()) {
                    json_error('La categoría seleccionada no es válida.');
                }

                $imagen_db = $imagen !== '' ? $imagen : null;
                $marca_db = $marca !== '' ? $marca : null;
                $tipo_db = $tipo !== '' ? $tipo : null;

                if ($codproducto > 0) {
                    $stmt = $pdo->prepare('SELECT codproducto FROM producto WHERE codproducto = ?');
                    $stmt->execute([$codproducto]);
                    if (!$stmt->fetch()) {
                        json_error('El producto no existe.', 404);
                    }
                    $stmt = $pdo->prepare('UPDATE producto SET nombreproducto = ?, descripcion = ?, precio = ?, existencia = ?, imagen = ?, categoria_id = ?, marca = ?, tipo = ? WHERE codproducto = ?');
                    $stmt->execute([$nombre, $descripcion, $precio, $existencia, $imagen_db, $categoria_id, $marca_db, $tipo_db, $codproducto]);
                    json_out(['ok' => true, 'msg' => 'Producto modificado correctamente.', 'codproducto' => $codproducto]);
                }

                $stmt = $pdo->prepare('INSERT INTO producto(nombreproducto, descripcion, precio, existencia, imagen, categoria_id, marca, tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                $stmt->execute([$nombre, $descripcion, $precio, $existencia, $imagen_db, $categoria_id, $marca_db, $tipo_db]);
                json_out(['ok' => true, 'msg' => 'Producto agregado correctamente.', 'codproducto' => (int)$pdo->lastInsertId()]);
            } catch (PDOException $e) {
                json_error('No se pudo guardar el producto.', 500);
            }

        case 'producto_eliminar':
            if (!es_csrf_valido($_POST['csrf_token'] ?? null)) {
                json_error('Token de seguridad inválido. Recargue la página.');
            }
            if (!es_admin()) {
                json_error('No autorizado.', 403);
            }
            $codproducto = (int)($_POST['codproducto'] ?? 0);
            if ($codproducto <= 0) {
                json_error('Producto no válido.');
            }
            try {
                $pdo = db();
                $stmt = $pdo->prepare('SELECT codproducto FROM producto WHERE codproducto = ?');
                $stmt->execute([$codproducto]);
                if (!$stmt->fetch()) {
                    json_error('El producto no existe.', 404);
                }
                $stmt = $pdo->prepare('SELECT COUNT(*) AS n FROM venta_detalle WHERE codproducto = ?');
                $stmt->execute([$codproducto]);
                if ((int)$stmt->fetch()['n'] > 0) {
                    json_error('No se puede eliminar: el producto ya figura en ventas registradas.');
                }
                $stmt = $pdo->prepare('DELETE FROM producto WHERE codproducto = ?');
                $stmt->execute([$codproducto]);
                json_out(['ok' => true, 'msg' => 'Producto eliminado correctamente.']);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    json_error('No se puede eliminar: el producto está asociado a ventas registradas.');
                }
                json_error('No se pudo eliminar el producto.', 500);
            }

        case 'slider_subir':
            if (!es_csrf_valido($_POST['csrf_token'] ?? null)) {
                json_error('Token de seguridad inválido. Recargue la página.');
            }
            if (!es_admin()) {
                json_error('No autorizado.', 403);
            }
            if (empty($_FILES['imagen']) || (int)$_FILES['imagen']['error'] !== UPLOAD_ERR_OK) {
                json_error('No se recibió ninguna imagen.');
            }
            if ((int)$_FILES['imagen']['size'] > 2 * 1024 * 1024) {
                json_error('La imagen supera el tamaño máximo de 2 MB.');
            }
            if (!is_uploaded_file($_FILES['imagen']['tmp_name'])) {
                json_error('Archivo no válido.');
            }

            $permitidas = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
            $ext = strtolower(pathinfo($_FILES['imagen']['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, $permitidas, true)) {
                json_error('Formato de imagen no permitido (JPG, PNG, WEBP o GIF).');
            }

            /* Confirmar que es una imagen real, no un archivo disfrazado. */
            $info = @getimagesize($_FILES['imagen']['tmp_name']);
            if ($info === false) {
                json_error('El archivo no es una imagen válida.');
            }

            $dir = __DIR__ . '/../imagenes/slider';
            $nombre = 'slide_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            if (!move_uploaded_file($_FILES['imagen']['tmp_name'], $dir . DIRECTORY_SEPARATOR . $nombre)) {
                json_error('No se pudo guardar la imagen.');
            }
            json_out(['ok' => true, 'msg' => 'Imagen agregada al slider.', 'archivo' => $nombre]);

        case 'slider_eliminar':
            if (!es_csrf_valido($_POST['csrf_token'] ?? null)) {
                json_error('Token de seguridad inválido. Recargue la página.');
            }
            if (!es_admin()) {
                json_error('No autorizado.', 403);
            }
            $archivo = basename(trim($_POST['archivo'] ?? ''));
            if ($archivo === '' || !preg_match('/^[A-Za-z0-9_.\-]+\.(jpg|jpeg|png|webp|gif)$/i', $archivo)) {
                json_error('Archivo no válido.');
            }
            $ruta = __DIR__ . '/../imagenes/slider' . DIRECTORY_SEPARATOR . $archivo;
            if (!is_file($ruta)) {
                json_error('La imagen no existe.', 404);
            }
            if (!unlink($ruta)) {
                json_error('No se pudo eliminar la imagen.');
            }
            json_out(['ok' => true, 'msg' => 'Imagen eliminada del slider.']);

        case 'comprar':
            if (!es_csrf_valido($_POST['csrf_token'] ?? null)) {
                json_error('Token de seguridad inválido. Recargue la página.');
            }
            if (!esta_logueado()) {
                json_error('Debe iniciar sesión para comprar.', 403);
            }

            $nombre = trim($_POST['nombre'] ?? '');
            $correo = trim($_POST['correo'] ?? '');
            $telefono = trim($_POST['telefono'] ?? '');
            $direccion = trim($_POST['direccion'] ?? '');
            $metodo = trim($_POST['metodo_pago'] ?? '');
            $referencia = trim($_POST['referencia'] ?? '');

            if ($nombre === '' || $correo === '') {
                json_error('Complete los datos de contacto.');
            }
            if (strlen($nombre) > 120 || !preg_match("/^[A-Za-zÁÉÍÓÚáéíóúÑñ '.-]{2,120}$/", $nombre)) {
                json_error('El nombre no es válido.');
            }
            if (strlen($correo) > 100 || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                json_error('El correo electrónico no es válido.');
            }
            if (strlen($telefono) > 30) {
                json_error('El teléfono es demasiado largo.');
            }
            if (strlen($direccion) > 255) {
                json_error('La dirección es demasiado larga.');
            }
            if (!metodo_pago_valido($metodo)) {
                json_error('Seleccione un método de pago válido.');
            }
            if (strlen($referencia) > 80) {
                json_error('La referencia es demasiado larga.');
            }

            $pagoRef = '';
            if ($metodo === 'tarjeta') {
                $tarjeta_numero = preg_replace('/\D/', '', (string)($_POST['tarjeta_numero'] ?? ''));
                $tarjeta_venc = trim($_POST['tarjeta_vencimiento'] ?? '');
                $tarjeta_titular = trim($_POST['tarjeta_titular'] ?? '');
                $tarjeta_cvv = trim($_POST['tarjeta_cvv'] ?? '');
                if ($tarjeta_numero === '' || strlen($tarjeta_numero) < 15 || strlen($tarjeta_numero) > 19) {
                    json_error('El número de tarjeta no es válido.');
                }
                if (!preg_match('/^(0[1-9]|1[0-2])\/\d{2}$/', $tarjeta_venc)) {
                    json_error('La fecha de vencimiento debe tener el formato MM/AA.');
                }
                if (strlen($tarjeta_cvv) < 3 || strlen($tarjeta_cvv) > 4 || !ctype_digit($tarjeta_cvv)) {
                    json_error('El CVV no es válido.');
                }
                if ($tarjeta_titular === '') {
                    json_error('Ingrese el titular de la tarjeta.');
                }
                $pagoRef = 'Tarjeta **** ' . substr($tarjeta_numero, -4);
            } elseif ($metodo === 'transferencia') {
                if ($referencia === '') {
                    json_error('Ingrese el número de referencia de la transferencia.');
                }
                $pagoRef = $referencia;
            } elseif ($metodo === 'efectivo') {
                $pagoRef = 'Pago en tienda';
            }

            $carrito = carrito();
            if (empty($carrito)) {
                json_error('El carrito está vacío.');
            }

            try {
                $pdo = db();
                $pdo->beginTransaction();

                $ids = array_keys($carrito);
                $lugares = implode(',', array_fill(0, count($ids), '?'));
                $stmt = $pdo->prepare("SELECT codproducto, nombreproducto, precio, existencia FROM producto WHERE codproducto IN ($lugares) FOR UPDATE");
                $stmt->execute($ids);
                $productos = [];
                foreach ($stmt->fetchAll() as $fila) {
                    $productos[(int)$fila['codproducto']] = $fila;
                }

                $subtotal = 0.0;
                $detalles = [];
                foreach ($carrito as $cod => $cant) {
                    $cod = (int)$cod;
                    $cant = (int)$cant;
                    if (!isset($productos[$cod])) {
                        $pdo->rollBack();
                        json_error('Uno de los productos ya no está disponible.');
                    }
                    $p = $productos[$cod];
                    if ((int)$p['existencia'] < $cant) {
                        $pdo->rollBack();
                        json_error('No hay suficiente stock de "' . $p['nombreproducto'] . '".');
                    }
                    $precio = (float)$p['precio'];
                    $detalles[] = [
                        'cod' => $cod,
                        'nombre' => $p['nombreproducto'],
                        'precio' => $precio,
                        'cant' => $cant,
                        'subtotal' => round($precio * $cant, 2),
                    ];
                    $subtotal += $detalles[count($detalles) - 1]['subtotal'];
                }

                $impuesto = round($subtotal * IMPUESTO_PORCIENTO / 100, 2);
                $envio = ENVIO_COSTO;
                $total = round($subtotal + $impuesto + $envio, 2);

                $stmt = $pdo->prepare('INSERT INTO venta(idusuario, nombre, correo, telefono, direccion, metodo_pago, referencia_pago, subtotal, impuesto, envio, total, estado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
                $stmt->execute([(int)$_SESSION['id_usuario'], $nombre, $correo, $telefono, $direccion, $metodo, $pagoRef, $subtotal, $impuesto, $envio, $total, 'pendiente']);
                $idventa = (int)$pdo->lastInsertId();

                $stmt = $pdo->prepare('INSERT INTO venta_detalle(idventa, codproducto, nombreproducto, precio, cantidad, subtotal) VALUES (?,?,?,?,?,?)');
                $upd = $pdo->prepare('UPDATE producto SET existencia = existencia - ? WHERE codproducto = ?');
                foreach ($detalles as $d) {
                    $stmt->execute([$idventa, $d['cod'], $d['nombre'], $d['precio'], $d['cant'], $d['subtotal']]);
                    $upd->execute([$d['cant'], $d['cod']]);
                }

                $pdo->commit();
                unset($_SESSION['carrito']);
                json_out([
                    'ok' => true,
                    'idventa' => $idventa,
                    'total' => $total,
                    'msg' => 'Compra realizada correctamente.',
                ]);
            } catch (PDOException $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('No se pudo procesar la compra.', 500);
            }

        case 'pedido_estado':
            if (!es_csrf_valido($_POST['csrf_token'] ?? null)) {
                json_error('Token de seguridad inválido. Recargue la página.');
            }
            if (!es_admin()) {
                json_error('No autorizado.', 403);
            }
            $idventa = (int)($_POST['idventa'] ?? 0);
            $estado = trim($_POST['estado'] ?? '');
            if ($idventa <= 0) {
                json_error('Pedido no válido.');
            }
            if (!estado_pedido_valido($estado)) {
                json_error('Estado no válido.');
            }
            try {
                $stmt = db()->prepare('UPDATE venta SET estado = ? WHERE idventa = ?');
                $stmt->execute([$estado, $idventa]);
                if ($stmt->rowCount() === 0) {
                    json_error('El pedido no existe.', 404);
                }
                json_out(['ok' => true, 'msg' => 'Estado actualizado a ' . $estado . '.']);
            } catch (PDOException $e) {
                json_error('No se pudo actualizar el estado.', 500);
            }

        case 'logout':
            if (!es_csrf_valido($_POST['csrf_token'] ?? null)) {
                json_error('Token de seguridad inválido.');
            }
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
            $_SESSION = [];
            session_destroy();
            json_out(['ok' => true]);

        case 'carrito':
            if (!es_csrf_valido($_POST['csrf_token'] ?? null)) {
                json_error('Token de seguridad inválido. Recargue la página.');
            }

            $accion = $_POST['accion'] ?? '';
            $aviso = '';
            try {
                $pdo = db();
                switch ($accion) {
                    case 'agregar':
                        $cod = (int)($_POST['codproducto'] ?? 0);
                        $cantidad = max(1, (int)($_POST['cantidad'] ?? 1));
                        if ($cod > 0) {
                            $stmt = $pdo->prepare('SELECT codproducto, existencia FROM producto WHERE codproducto = ? LIMIT 1');
                            $stmt->execute([$cod]);
                            $prod = $stmt->fetch();
                            if ($prod && (int)$prod['existencia'] > 0) {
                                $actual = (int)$prod['existencia'];
                                $carrito = carrito();
                                $nueva = (int)($carrito[$cod] ?? 0) + $cantidad;
                                $nueva = min($nueva, $actual, 99);
                                $carrito[$cod] = $nueva;
                                $_SESSION['carrito'] = $carrito;
                                $aviso = 'Producto añadido al carrito.';
                            } elseif (!$prod) {
                                $aviso = 'El producto no existe.';
                            } else {
                                $aviso = 'El producto está agotado.';
                            }
                        }
                        break;

                    case 'actualizar':
                        $carrito = carrito();
                        $cantidades = is_array($_POST['cantidad'] ?? null) ? $_POST['cantidad'] : [];
                        if ($cantidades) {
                            /* Límite real por producto: no se puede superar el stock. */
                            $codigos = array_keys($cantidades);
                            $stockPor = [];
                            $lugares = implode(',', array_fill(0, count($codigos), '?'));
                            $stmt = $pdo->prepare("SELECT codproducto, existencia FROM producto WHERE codproducto IN ($lugares)");
                            $stmt->execute(array_map('intval', $codigos));
                            foreach ($stmt->fetchAll() as $fila) {
                                $stockPor[(int)$fila['codproducto']] = (int)$fila['existencia'];
                            }

                            foreach ($cantidades as $cod => $q) {
                                $cod = (int)$cod;
                                $q = (int)$q;
                                if ($q <= 0 || !isset($carrito[$cod])) {
                                    unset($carrito[$cod]);
                                    continue;
                                }
                                $max = min($stockPor[$cod] ?? 0, 99);
                                if ($max <= 0) {
                                    unset($carrito[$cod]);
                                    continue;
                                }
                                $carrito[$cod] = min($q, $max);
                            }
                        }
                        $_SESSION['carrito'] = $carrito;
                        break;

                    case 'eliminar':
                        $cod = (int)($_POST['codproducto'] ?? 0);
                        $carrito = carrito();
                        unset($carrito[$cod]);
                        $_SESSION['carrito'] = $carrito;
                        break;

                    case 'vaciar':
                        unset($_SESSION['carrito']);
                        break;
                }
            } catch (PDOException $e) {
                json_error('No se pudo actualizar el carrito.', 500);
            }

            json_out([
                'ok' => true,
                'aviso' => $aviso,
                'unidades' => carrito_total_unidades(),
            ]);

        default:
            json_error('Recurso no válido.', 404);
    }
}

json_error('Método no permitido.', 405);
