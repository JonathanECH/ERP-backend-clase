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

-- 3. Registros de Huella Digital Iniciales
INSERT INTO contactos (id, nombre, rfc, tipo) 
VALUES (1, 'Jonathan Eduardo Campos Hernández', 'JECH30417006', 'Cliente')
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO movimientos (id, concepto, tipo, monto, fecha, contacto_id) 
VALUES (1, 'Ajuste inicial Cédula: 30417006', 'Ingreso', 1500.00, '2026-09-30', 1)
ON DUPLICATE KEY UPDATE id=VALUES(id);
