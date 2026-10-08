import express from 'express';
import cors from 'cors';
import pool from './config/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite conexiones desde Vue (puerto 5173 / 5174)
app.use(express.json()); // Parsea JSON automáticamente

// ==========================================
// ENDPOINTS PARA MOTOR CONTABLE (SEMANA 10)
// ==========================================

// 1. Obtener Catálogo de Cuentas Contables
app.get(['/api/catalogo-cuentas', '/api/cuentas'], async (req, res) => {
  try {
    const [cuentas] = await pool.query('SELECT * FROM catalogo_cuentas ORDER BY codigo ASC');
    res.status(200).json({
      exito: true,
      datos: cuentas
    });
  } catch (error) {
    console.error('Error GET /api/catalogo-cuentas:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor al obtener el catálogo de cuentas'
    });
  }
});

// 2. Obtener Asientos Contables con sus detalles (Libro Diario)
app.get('/api/asientos', async (req, res) => {
  try {
    const [filas] = await pool.query(`
      SELECT 
        a.id AS asiento_id,
        a.fecha,
        a.descripcion,
        a.total_debe,
        a.total_haber,
        a.estado,
        a.movimiento_id,
        d.id AS detalle_id,
        d.cuenta_id,
        c.codigo AS cuenta_codigo,
        c.nombre AS cuenta_nombre,
        d.debe,
        d.haber
      FROM asientos_contables a
      LEFT JOIN detalle_asientos d ON a.id = d.asiento_id
      LEFT JOIN catalogo_cuentas c ON d.cuenta_id = c.id
      ORDER BY a.id DESC, d.id ASC
    `);

    // Agrupar filas por asiento
    const asientosMap = new Map();
    for (const fila of filas) {
      if (!asientosMap.has(fila.asiento_id)) {
        asientosMap.set(fila.asiento_id, {
          id: fila.asiento_id,
          fecha: fila.fecha,
          descripcion: fila.descripcion,
          total_debe: Number(fila.total_debe),
          total_haber: Number(fila.total_haber),
          estado: fila.estado,
          movimiento_id: fila.movimiento_id,
          lineas: []
        });
      }
      if (fila.detalle_id) {
        asientosMap.get(fila.asiento_id).lineas.push({
          id: fila.detalle_id,
          cuenta_id: fila.cuenta_id,
          cuenta_codigo: fila.cuenta_codigo,
          cuenta_nombre: fila.cuenta_nombre,
          cuenta: fila.cuenta_codigo ? `${fila.cuenta_codigo} - ${fila.cuenta_nombre}` : '',
          debe: Number(fila.debe),
          haber: Number(fila.haber)
        });
      }
    }

    res.status(200).json({
      exito: true,
      datos: Array.from(asientosMap.values())
    });
  } catch (error) {
    console.error('Error GET /api/asientos:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor al consultar los asientos contables'
    });
  }
});

// 3. Registrar Nuevo Asiento Contable (Transacción ACID + Partida Doble)
app.post('/api/asientos', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 1. INICIAR TRANSACCIÓN (Atomicidad)

    const { fecha, descripcion, concepto, lineas, partidas, movimiento_id } = req.body;
    const descFinal = descripcion || concepto || '';
    const items = lineas || partidas || [];

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('El asiento contable debe incluir al menos una línea o partida.');
    }

    // Calcular totales
    let totalDebe = 0;
    let totalHaber = 0;
    items.forEach(l => {
      totalDebe += parseFloat(l.debe || 0);
      totalHaber += parseFloat(l.haber || 0);
    });

    totalDebe = Math.round(totalDebe * 100) / 100;
    totalHaber = Math.round(totalHaber * 100) / 100;

    // VALIDACIÓN DE PARTIDA DOBLE (Suma Debe == Suma Haber)
    if (Math.abs(totalDebe - totalHaber) > 0.01) {
      throw new Error(`El asiento NO cuadra. Total Debe: $${totalDebe.toFixed(2)}, Total Haber: $${totalHaber.toFixed(2)}`);
    }

    // Guardar cabecera del asiento
    const fechaFinal = fecha || new Date().toISOString().split('T')[0];
    const [resAsiento] = await connection.query(
      `INSERT INTO asientos_contables 
       (fecha, descripcion, total_debe, total_haber, estado, movimiento_id) 
       VALUES (?, ?, ?, ?, 'Cuadrado', ?)`,
      [fechaFinal, descFinal, totalDebe, totalHaber, movimiento_id || null]
    );
    const asientoId = resAsiento.insertId;

    // Guardar detalles de las líneas
    for (const linea of items) {
      const cuentaId = linea.cuenta_id || linea.cuentaId;
      const debe = parseFloat(linea.debe || 0);
      const haber = parseFloat(linea.haber || 0);

      await connection.query(
        `INSERT INTO detalle_asientos 
         (asiento_id, cuenta_id, debe, haber) 
         VALUES (?, ?, ?, ?)`,
        [asientoId, cuentaId, debe, haber]
      );
    }

    await connection.commit(); // 2. CONFIRMAR TRANSACCIÓN (Durabilidad)
    res.status(201).json({
      exito: true,
      mensaje: 'Asiento contable registrado exitosamente',
      id: asientoId
    });

  } catch (error) {
    await connection.rollback(); // 3. REVERTIR EN CASO DE ERROR (Rollback)
    res.status(400).json({
      exito: false,
      mensaje: error.message
    });
  } finally {
    connection.release(); // 4. LIBERAR CONEXIÓN AL POOL
  }
});

// ==========================================
// ENDPOINTS PARA CONTACTOS (MYSQL)
// ==========================================

// 1. Obtener todos los contactos
app.get('/api/contactos', async (req, res) => {
  try {
    const [filas] = await pool.query('SELECT * FROM contactos ORDER BY id DESC');
    res.status(200).json({
      exito: true,
      datos: filas
    });
  } catch (error) {
    console.error('Error GET /api/contactos:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor al obtener contactos'
    });
  }
});

// 2. Obtener un contacto por ID
app.get('/api/contactos/:id', async (req, res) => {
  try {
    const [filas] = await pool.query('SELECT * FROM contactos WHERE id = ?', [req.params.id]);
    if (filas.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Contacto no encontrado'
      });
    }
    res.status(200).json({
      exito: true,
      datos: filas[0]
    });
  } catch (error) {
    console.error('Error GET /api/contactos/:id:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor al buscar contacto'
    });
  }
});

// 3. Crear un nuevo contacto
app.post('/api/contactos', async (req, res) => {
  const { nombre, rfc, tipo, email, telefono } = req.body;

  if (!nombre || !rfc || !tipo) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Todos los campos obligatorios deben estar presentes (nombre, rfc, tipo)'
    });
  }

  try {
    const [resultado] = await pool.query(
      'INSERT INTO contactos (nombre, rfc, tipo, email, telefono) VALUES (?, ?, ?, ?, ?)',
      [nombre, rfc, tipo, email || null, telefono || null]
    );

    res.status(201).json({
      exito: true,
      mensaje: 'Contacto creado exitosamente',
      datos: {
        id: resultado.insertId,
        nombre,
        rfc,
        tipo,
        email,
        telefono
      }
    });
  } catch (error) {
    console.error('Error POST /api/contactos:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        exito: false,
        mensaje: 'El RFC ingresado ya se encuentra registrado'
      });
    }
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor al guardar contacto'
    });
  }
});

// 4. Actualizar un contacto (PUT)
app.put('/api/contactos/:id', async (req, res) => {
  const { nombre, rfc, tipo, email, telefono } = req.body;
  try {
    const [existente] = await pool.query('SELECT * FROM contactos WHERE id = ?', [req.params.id]);
    if (existente.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Contacto no encontrado'
      });
    }

    await pool.query(
      'UPDATE contactos SET nombre = COALESCE(?, nombre), rfc = COALESCE(?, rfc), tipo = COALESCE(?, tipo), email = COALESCE(?, email), telefono = COALESCE(?, telefono) WHERE id = ?',
      [nombre, rfc, tipo, email, telefono, req.params.id]
    );

    const [actualizado] = await pool.query('SELECT * FROM contactos WHERE id = ?', [req.params.id]);

    res.status(200).json({
      exito: true,
      mensaje: 'Contacto actualizado',
      datos: actualizado[0]
    });
  } catch (error) {
    console.error('Error PUT /api/contactos/:id:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor al actualizar contacto'
    });
  }
});

// 5. Eliminar un contacto (DELETE)
app.delete('/api/contactos/:id', async (req, res) => {
  try {
    const [resultado] = await pool.query('DELETE FROM contactos WHERE id = ?', [req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Contacto no encontrado'
      });
    }

    res.status(200).json({
      exito: true,
      mensaje: 'Contacto eliminado'
    });
  } catch (error) {
    console.error('Error DELETE /api/contactos/:id:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor al eliminar contacto'
    });
  }
});

// ==========================================
// ENDPOINTS PARA MOVIMIENTOS CONTABLES (MYSQL)
// ==========================================

// 1. Obtener todos los movimientos
app.get('/api/movimientos', async (req, res) => {
  try {
    const { tipo } = req.query; // Capturamos el parámetro de la URL (?tipo=...)
    
    let query = 'SELECT * FROM movimientos';
    let params = [];

    // Si viene el parámetro 'tipo', agregamos la condición WHERE
    if (tipo) {
      query += ' WHERE tipo = ?';
      params.push(tipo);
    }
    
    query += ' ORDER BY id DESC';

    const [filas] = await pool.query(query, params);
    
    res.status(200).json({
      exito: true,
      datos: filas
    });
  } catch (error) {
    console.error('Error GET /api/movimientos:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor al consultar movimientos'
    });
  }
});


// 2. Crear un nuevo movimiento
app.post('/api/movimientos', async (req, res) => {
  const { concepto, tipo, monto, fecha, contacto_id } = req.body;

  if (!concepto || !tipo || !monto) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Campos obligatorios: concepto, tipo, monto'
    });
  }

  if (!['Ingreso', 'Egreso'].includes(tipo)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El tipo debe ser "Ingreso" o "Egreso"'
    });
  }

  const montoNumerico = parseFloat(monto);
  if (isNaN(montoNumerico) || montoNumerico <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El monto debe ser un número positivo'
    });
  }

  try {
    const fechaFinal = fecha || new Date().toISOString().split('T')[0];
    const [resultado] = await pool.query(
      'INSERT INTO movimientos (concepto, tipo, monto, fecha, contacto_id) VALUES (?, ?, ?, ?, ?)',
      [concepto, tipo, montoNumerico, fechaFinal, contacto_id || null]
    );

    res.status(201).json({
      exito: true,
      mensaje: 'Movimiento registrado',
      datos: {
        id: resultado.insertId,
        concepto,
        tipo,
        monto: montoNumerico,
        fecha: fechaFinal,
        contacto_id: contacto_id || null
      }
    });
  } catch (error) {
    console.error('Error POST /api/movimientos:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor al registrar movimiento'
    });
  }
});

// 3. Obtener resumen contable mediante agregación SQL
app.get('/api/resumen', async (req, res) => {
  try {
    const [filasIngresos] = await pool.query(
      "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos WHERE tipo = 'Ingreso'"
    );
    const [filasEgresos] = await pool.query(
      "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos WHERE tipo = 'Egreso'"
    );
    const [filasTotal] = await pool.query(
      "SELECT COUNT(*) AS totalMovimientos FROM movimientos"
    );

    const totalIngresos = Number(filasIngresos[0].total);
    const totalEgresos = Number(filasEgresos[0].total);
    const saldo = totalIngresos - totalEgresos;
    const totalMovimientos = filasTotal[0].totalMovimientos;

    res.status(200).json({
      exito: true,
      datos: {
        totalIngresos,
        totalEgresos,
        saldo,
        totalMovimientos
      }
    });
  } catch (error) {
    console.error('Error GET /api/resumen:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor al calcular resumen contable'
    });
  }
});

// INICIAR SERVIDOR
app.listen(PORT, async () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  SERVIDOR ERP CON MySQL ACTIVO        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(` Puerto: http://localhost:${PORT}`);
  console.log(` Base de datos: erp_contable_jech`);

  // Inicialización automática de tablas para Motor Contable
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogo_cuentas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(10) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        tipo ENUM('Activo','Pasivo','Patrimonio','Ingreso','Gasto') NOT NULL,
        naturaleza ENUM('Deudora','Acreedora') NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS asientos_contables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha DATE NOT NULL,
        descripcion VARCHAR(255),
        total_debe DECIMAL(12,2) DEFAULT 0.00,
        total_haber DECIMAL(12,2) DEFAULT 0.00,
        estado ENUM('Cuadrado','Descuadrado') DEFAULT 'Descuadrado',
        movimiento_id INT NULL,
        FOREIGN KEY (movimiento_id) REFERENCES movimientos(id) ON DELETE SET NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS detalle_asientos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asiento_id INT NOT NULL,
        cuenta_id INT NOT NULL,
        debe DECIMAL(12,2) DEFAULT 0.00,
        haber DECIMAL(12,2) DEFAULT 0.00,
        FOREIGN KEY (asiento_id) REFERENCES asientos_contables(id) ON DELETE CASCADE,
        FOREIGN KEY (cuenta_id) REFERENCES catalogo_cuentas(id)
      )
    `);

    const [filasCuentas] = await pool.query('SELECT COUNT(*) AS total FROM catalogo_cuentas');
    if (filasCuentas[0].total === 0) {
      await pool.query(`
        INSERT INTO catalogo_cuentas (codigo, nombre, tipo, naturaleza) VALUES
        ('1.1.01', 'Caja General', 'Activo', 'Deudora'),
        ('1.1.02', 'Banco Mercantil', 'Activo', 'Deudora'),
        ('1.2.01', 'Clientes', 'Activo', 'Deudora'),
        ('2.1.01', 'Proveedores', 'Pasivo', 'Acreedora'),
        ('3.1.01', 'Capital Social', 'Patrimonio', 'Acreedora'),
        ('4.1.01', 'Ventas de Servicios', 'Ingreso', 'Acreedora'),
        ('5.1.01', 'Gastos de Servicios', 'Gasto', 'Deudora'),
        ('5.1.02', 'Gastos de Alquiler', 'Gasto', 'Deudora')
      `);
      console.log('✓ Catálogo de cuentas inicializado con 8 cuentas contables.');
    }
  } catch (err) {
    console.warn('Nota de inicialización de BD:', err.message);
  }
});