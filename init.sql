-- Script de Inicialización Automática para Docker / MySQL
-- Base de Datos Huella Digital: erp_contable_jech

CREATE DATABASE IF NOT EXISTS erp_contable_jech;
USE erp_contable_jech;

-- 1. Tabla de Contactos
CREATE TABLE IF NOT EXISTS contactos (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  rfc VARCHAR(100) UNIQUE NOT NULL,
  tipo ENUM('Cliente', 'Proveedor') NOT NULL,
  email VARCHAR(100),
  telefono VARCHAR(20),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Movimientos
CREATE TABLE IF NOT EXISTS movimientos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  concepto VARCHAR(200) NOT NULL,
  tipo ENUM('Ingreso', 'Egreso') NOT NULL,
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  fecha DATE NOT NULL,
  contacto_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimientos_contacto
    FOREIGN KEY (contacto_id) 
    REFERENCES contactos(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- 3. Tabla Catálogo de Cuentas
CREATE TABLE IF NOT EXISTS catalogo_cuentas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('Activo','Pasivo','Patrimonio','Ingreso','Gasto') NOT NULL,
    naturaleza ENUM('Deudora','Acreedora') NOT NULL
);

-- 4. Tabla Asientos Contables
CREATE TABLE IF NOT EXISTS asientos_contables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    descripcion VARCHAR(255),
    total_debe DECIMAL(12,2) DEFAULT 0.00,
    total_haber DECIMAL(12,2) DEFAULT 0.00,
    estado ENUM('Cuadrado','Descuadrado') DEFAULT 'Descuadrado',
    movimiento_id INT NULL,
    FOREIGN KEY (movimiento_id) REFERENCES movimientos(id) 
        ON DELETE SET NULL
);

-- 5. Tabla Detalle de Asientos
CREATE TABLE IF NOT EXISTS detalle_asientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asiento_id INT NOT NULL,
    cuenta_id INT NOT NULL,
    debe DECIMAL(12,2) DEFAULT 0.00,
    haber DECIMAL(12,2) DEFAULT 0.00,
    FOREIGN KEY (asiento_id) REFERENCES asientos_contables(id) 
        ON DELETE CASCADE,
    FOREIGN KEY (cuenta_id) REFERENCES catalogo_cuentas(id)
);

-- 6. Registros Iniciales
INSERT INTO contactos (id, nombre, rfc, tipo) 
VALUES (1, 'Jonathan Eduardo Campos Hernández', 'JECH30417006', 'Cliente')
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO movimientos (id, concepto, tipo, monto, fecha, contacto_id) 
VALUES (1, 'Ajuste inicial Cédula: 30417006', 'Ingreso', 1500.00, '2026-09-30', 1)
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO catalogo_cuentas (codigo, nombre, tipo, naturaleza) VALUES
('1.1.01', 'Caja General', 'Activo', 'Deudora'),
('1.1.02', 'Banco Mercantil', 'Activo', 'Deudora'),
('1.2.01', 'Clientes', 'Activo', 'Deudora'),
('2.1.01', 'Proveedores', 'Pasivo', 'Acreedora'),
('3.1.01', 'Capital Social', 'Patrimonio', 'Acreedora'),
('4.1.01', 'Ventas de Servicios', 'Ingreso', 'Acreedora'),
('5.1.01', 'Gastos de Servicios', 'Gasto', 'Deudora'),
('5.1.02', 'Gastos de Alquiler', 'Gasto', 'Deudora')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

