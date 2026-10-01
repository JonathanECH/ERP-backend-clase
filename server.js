import express from 'express';
import cors from 'cors';
import pool from './config/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite conexiones desde Vue (puerto 5173 / 5174)
app.use(express.json()); // Parsea JSON automáticamente

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
    const [filas] = await pool.query('SELECT * FROM movimientos ORDER BY id DESC');
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
app.listen(PORT, () => {
  console.log('=================================');
  console.log('   SERVIDOR ERP CONTABLE (MYSQL) ');
  console.log('=================================');
  console.log(`Puerto: http://localhost:${PORT}`);
  console.log('Base de Datos: erp_contable_jech');
  console.log('Endpoints disponibles:');
  console.log('  • GET    /api/contactos');
  console.log('  • POST   /api/contactos');
  console.log('  • GET    /api/movimientos');
  console.log('  • POST   /api/movimientos');
  console.log('  • GET    /api/resumen');
  console.log('=================================');
});