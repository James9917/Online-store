-- Copyright (C) 2026 James Shewbridge - Licensed under GPL v3.0
-- Base de datos de la tienda
-- Importable (reconstruye el estado inicial):
--   Get-Content database.sql | mysql -u root   (o phpMyAdmin)

CREATE DATABASE IF NOT EXISTS tienda CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE tienda;

DROP TABLE IF EXISTS venta_detalle;
DROP TABLE IF EXISTS venta;
DROP TABLE IF EXISTS producto;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS categoria;
DROP TABLE IF EXISTS rol;

CREATE TABLE rol (
  idrol INT NOT NULL AUTO_INCREMENT,
  rol VARCHAR(50) NOT NULL,
  PRIMARY KEY (idrol)
) ENGINE=InnoDB;

INSERT INTO rol (idrol, rol) VALUES
(1, 'administrador'),
(2, 'cliente'),
(3, 'vendedor');

CREATE TABLE categoria (
  idcategoria INT NOT NULL AUTO_INCREMENT,
  categoria VARCHAR(50) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  PRIMARY KEY (idcategoria),
  UNIQUE KEY uq_categoria (categoria)
) ENGINE=InnoDB;

INSERT INTO categoria (idcategoria, categoria, nombre) VALUES
(1, 'gaming', 'Equipo Gaming'),
(2, 'pc', 'Computadoras'),
(3, 'cel', 'Celulares'),
(4, 'comp', 'Componentes'),
(5, 'mob', 'Mobiliario'),
(6, 'alman', 'Almacenamiento');

CREATE TABLE usuario (
  idusuario INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL,
  correo VARCHAR(100) NOT NULL,
  clave VARCHAR(255) NOT NULL COMMENT 'hash bcrypt generado con password_hash()',
  rol INT NOT NULL DEFAULT 2,
  avatar VARCHAR(255) NULL COMMENT 'ruta de archivo dentro de imagenes/img_perfil/',
  PRIMARY KEY (idusuario),
  UNIQUE KEY uq_usuario (usuario),
  UNIQUE KEY uq_correo (correo),
  CONSTRAINT fk_usuario_rol FOREIGN KEY (rol) REFERENCES rol(idrol)
) ENGINE=InnoDB;

-- Usuarios de ejemplo. Las contraseñas están hasheadas:
--   admin    -> admin123
--   cliente  -> cliente123
INSERT INTO usuario (nombre, usuario, correo, clave, rol) VALUES
('Administrador', 'admin', 'admin@tienda.local', '$2y$10$T6Ia.T8jhfcmaNr/r9QtN.LzeT5MbQ8UwwSZY9BRc/OcH03GO61wC', 1),
('Cliente Demo', 'cliente', 'cliente@tienda.local', '$2y$10$dno/DxYG7iAiQAmf4c6yX.Ru47/sI/Ue5oPUmg9Ktz2KuNi5gGiH6', 2);

CREATE TABLE producto (
  codproducto INT NOT NULL AUTO_INCREMENT,
  nombreproducto VARCHAR(100) NOT NULL,
  descripcion TEXT NULL,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  existencia INT NOT NULL DEFAULT 0,
  imagen VARCHAR(255) NULL COMMENT 'ruta de archivo dentro de imagenes/productos/',
  categoria_id INT NULL,
  marca VARCHAR(50) NULL,
  tipo VARCHAR(50) NULL,
  PRIMARY KEY (codproducto),
  KEY idx_producto_marca (marca),
  KEY idx_producto_tipo (tipo),
  CONSTRAINT fk_producto_categoria FOREIGN KEY (categoria_id) REFERENCES categoria(idcategoria)
) ENGINE=InnoDB;

INSERT INTO producto (nombreproducto, descripcion, precio, existencia, imagen, categoria_id, marca, tipo) VALUES
-- Equipo Gaming
('Laptop Gamer X15', 'Laptop gaming RTX 4060, 16GB RAM, SSD 1TB', 1249.99, 10, NULL, 1, 'Asus', 'Laptops'),
('Laptop Gamer Nitro 5', 'Laptop gaming RTX 3050, 8GB RAM, SSD 512GB', 1099.99, 7, NULL, 1, 'Acer', 'Laptops'),
('Consola PlayStation 5', 'Consola de nueva generación con mando DualSense', 499.99, 5, NULL, 1, 'Sony', 'Consolas'),
('Consola Xbox Series X', 'Consola de nueva generación con mando inalámbrico', 499.99, 4, NULL, 1, 'Microsoft', 'Consolas'),
('Celular Gamer ROG Phone', 'Smartphone gaming con pantalla 165Hz', 899.99, 8, NULL, 1, 'Asus', 'Celulares'),
('PC Gamer Tower RTX 3070', 'Equipo de mesa gaming con RTX 3070 y 32GB RAM', 1599.99, 3, NULL, 1, 'Dell', 'Equipo de mesa'),
('Videojuego Elden Ring', 'RPG de mundo abierto para consolas y PC', 59.99, 20, NULL, 1, 'Bandai', 'Juegos'),
('Videojuego FIFA 24', 'Simulador de fútbol para consolas y PC', 49.99, 25, NULL, 1, 'EA', 'Juegos'),
-- Computadoras
('Laptop DELL Inspiron 15', 'Laptop Intel Core i5, 8GB RAM, SSD 256GB', 749.99, 12, NULL, 2, 'Dell', 'Laptops'),
('Laptop HP Pavilion 14', 'Laptop AMD Ryzen 5, 8GB RAM, SSD 512GB', 679.99, 9, NULL, 2, 'HP', 'Laptops'),
('Laptop ASUS VivoBook', 'Laptop Intel Core i5, 16GB RAM, SSD 512GB', 649.99, 6, NULL, 2, 'Asus', 'Laptops'),
('Laptop Lenovo IdeaPad 3', 'Laptop AMD Ryzen 5, 8GB RAM, SSD 256GB', 599.99, 11, NULL, 2, 'Lenovo', 'Laptops'),
('Laptop Acer Aspire 5', 'Laptop Intel Core i5, 8GB RAM, SSD 256GB', 579.99, 8, NULL, 2, 'Acer', 'Laptops'),
('MacBook Air M2', 'Laptop ultraligera con chip Apple M2', 1199.99, 5, NULL, 2, 'Apple', 'Laptops'),
('iMac 24 M1', 'Computadora de escritorio todo en uno', 1399.99, 2, NULL, 2, 'Apple', 'Equipo de escritorio'),
('Desktop HP ProDesk', 'Equipo de escritorio Intel Core i7, 16GB RAM', 899.99, 4, NULL, 2, 'HP', 'Equipo de escritorio'),
('Desktop DELL OptiPlex', 'Equipo de escritorio Intel Core i5, 8GB RAM', 849.99, 3, NULL, 2, 'Dell', 'Equipo de escritorio'),
('Microsoft Office 2021', 'Suite de ofimática licencia de por vida', 149.99, 30, NULL, 2, 'Microsoft', 'Software'),
('Windows 11 Pro', 'Sistema operativo licencia original', 199.99, 40, NULL, 2, 'Microsoft', 'Software'),
-- Celulares
('Samsung Galaxy S24', 'Smartphone gama alta con pantalla AMOLED', 999.99, 6, NULL, 3, 'Samsung', NULL),
('Samsung Galaxy A54', 'Smartphone gama media con cámara de 50MP', 449.99, 10, NULL, 3, 'Samsung', NULL),
('Huawei P60', 'Smartphone con cámara Leica avanzada', 699.99, 7, NULL, 3, 'Huawei', NULL),
('iPhone 15', 'Smartphone Apple con chip A16', 1099.99, 5, NULL, 3, 'Apple', NULL),
('LG G8 ThinQ', 'Smartphone LG con pantalla OLED', 499.99, 4, NULL, 3, 'LG', NULL),
('Xiaomi 13', 'Smartphone Xiaomi con Leica de 50MP', 649.99, 9, NULL, 3, 'Xiaomi', NULL),
('Motorola Edge 40', 'Smartphone Motorola con pantalla curva', 549.99, 8, NULL, 3, 'Motorola', NULL),
-- Componentes
('Teclado mecánico RGB', 'Teclado mecánico retroiluminado con switches red', 89.99, 15, NULL, 4, NULL, 'Accesorios'),
('Mouse inalámbrico', 'Mouse ergonómico inalámbrico 2.4GHz', 39.99, 22, NULL, 4, NULL, 'Accesorios'),
('Audífonos Gamer', 'Audífonos con sonido envolvente y micrófono', 79.99, 18, NULL, 4, NULL, 'Accesorios'),
('Impresora HP LaserJet', 'Impresora láser monocromática inalámbrica', 189.99, 6, NULL, 4, NULL, 'Impresoras'),
('Proyector Epson', 'Proyector Full HD 1080p con 3000 lúmenes', 499.99, 4, NULL, 4, NULL, 'Proyectores'),
('Monitor Samsung 27', 'Monitor Full HD 27 pulgadas IPS 75Hz', 299.99, 9, NULL, 4, NULL, 'Pantallas'),
('Router TP-Link', 'Router WiFi 6 de doble banda', 59.99, 14, NULL, 4, NULL, 'Router'),
-- Mobiliario
('Escritorio de madera', 'Escritorio de madera con cajones, 120cm', 249.99, 5, NULL, 5, NULL, 'Escritorio'),
('Silla ergonómica de oficina', 'Silla con soporte lumbar y reposabrazos ajustables', 199.99, 8, NULL, 5, NULL, 'Sillas de oficina'),
('Soporte para monitor', 'Soporte de escritorio ajustable en altura', 49.99, 12, NULL, 5, NULL, 'Soportes'),
-- Almacenamiento
('Disco duro 1TB', 'Disco duro interno SATA de 3.5 pulgadas', 79.99, 20, NULL, 6, NULL, 'Discos duros'),
('USB 64GB', 'Memoria USB 3.0 de 64GB', 19.99, 35, NULL, 6, NULL, 'USB'),
('Disco externo 2TB', 'Disco duro externo portátil USB 3.0', 109.99, 16, NULL, 6, NULL, 'Discos externos'),
('Tarjeta microSD 128GB', 'Tarjeta de memoria microSDXC clase 10', 29.99, 28, NULL, 6, NULL, 'Tarjetas de memoria');

-- Facturas/ventas y su detalle. Cada venta guarda una copia (instantánea) de
-- los datos del cliente y del precio de cada producto en el momento de la compra.
CREATE TABLE venta (
  idventa INT NOT NULL AUTO_INCREMENT,
  idusuario INT NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(100) NOT NULL,
  telefono VARCHAR(30) NOT NULL DEFAULT '',
  direccion VARCHAR(255) NOT NULL DEFAULT '',
  metodo_pago VARCHAR(20) NOT NULL COMMENT 'efectivo | tarjeta | transferencia',
  referencia_pago VARCHAR(80) NOT NULL DEFAULT '',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  impuesto DECIMAL(10,2) NOT NULL DEFAULT 0,
  envio DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' COMMENT 'pendiente | pagado | enviado | entregado | cancelado',
  PRIMARY KEY (idventa),
  KEY idx_venta_estado (estado),
  CONSTRAINT fk_venta_usuario FOREIGN KEY (idusuario) REFERENCES usuario(idusuario)
) ENGINE=InnoDB;

CREATE TABLE venta_detalle (
  iddetalle INT NOT NULL AUTO_INCREMENT,
  idventa INT NOT NULL,
  codproducto INT NOT NULL,
  nombreproducto VARCHAR(150) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  cantidad INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (iddetalle),
  CONSTRAINT fk_detalle_venta FOREIGN KEY (idventa) REFERENCES venta(idventa) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (codproducto) REFERENCES producto(codproducto)
) ENGINE=InnoDB;
