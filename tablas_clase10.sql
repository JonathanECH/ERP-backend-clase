-- ==========================================
-- TABLAS DE LA SEMANA 9 (YA EXISTENTES)
-- ==========================================
-- (Se asume que 'contactos' y 'movimientos' ya están creadas)

-- ==========================================
-- TABLAS DE LA SEMANA 11 (MOTOR CONTABLE)
-- ==========================================

-- 1. Catálogo de Cuentas ( es un diccionario)
CREATE TABLE catalogo_cuentas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL, 
    nombre VARCHAR(100) NOT NULL,       
    tipo ENUM('Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto') NOT NULL,
    naturaleza ENUM('Deudora', 'Acreedora') NOT NULL
);

-- 2. Asientos Contables 
CREATE TABLE asientos_contables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    descripcion VARCHAR(255),
    total_debe DECIMAL(12,2) DEFAULT 0.00,
    total_haber DECIMAL(12,2) DEFAULT 0.00,
    estado ENUM('Cuadrado', 'Descuadrado') DEFAULT 'Descuadrado',
    
    -- Un asiento puede originarse de un movimiento de caja/banco.
    -- Es NULL si el asiento es manual (ej. un ajuste contable).
    movimiento_id INT NULL, 
    FOREIGN KEY (movimiento_id) REFERENCES movimientos(id) ON DELETE SET NULL
);

-- 3. Detalle de Asientos (Se relaciona con el Catálogo)
CREATE TABLE detalle_asientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asiento_id INT NOT NULL,
    cuenta_id INT NOT NULL, -- 🔗 RELACIÓN CON EL CATÁLOGO
    debe DECIMAL(12,2) DEFAULT 0.00,
    haber DECIMAL(12,2) DEFAULT 0.00,
    FOREIGN KEY (asiento_id) REFERENCES asientos_contables(id) ON DELETE CASCADE,
    FOREIGN KEY (cuenta_id) REFERENCES catalogo_cuentas(id)
);

-- Insertar datos de prueba en el Catálogo (Mínimo 4 cuentas para probar)
INSERT INTO catalogo_cuentas (codigo, nombre, tipo, naturaleza) VALUES
('1.1.01', 'Caja General', 'Activo', 'Deudora'),
('1.1.02', 'Banco Mercantil', 'Activo', 'Deudora'),
('1.2.01', 'Clientes', 'Activo', 'Deudora'),
('2.1.01', 'Proveedores', 'Pasivo', 'Acreedora'),
('3.1.01', 'Capital Social', 'Patrimonio', 'Acreedora'),
('4.1.01', 'Ventas de Servicios', 'Ingreso', 'Acreedora'),
('5.1.01', 'Gastos de Servicios', 'Gasto', 'Deudora'),
('5.1.02', 'Gastos de Alquiler', 'Gasto', 'Deudora');