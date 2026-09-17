import express from 'express';
import cors from 'cors';
const app = express();
const PORT = 3000;

// Middlewares
app.use(cors()); // Permite conexiones desde Vue (puerto 5173)
app.use(express.json()); // Parsea JSON automáticamente

// BASE DE DATOS SIMULADA EN MEMORIA
let contactos = [
  { id: 1, nombre: 'Empresa ABC S.A.', rfc: 'ABC123456XYZ', tipo: 'Cliente' },
  { id: 2, nombre: 'Proveedor Global', rfc: 'PGL987654XYZ', tipo: 'Proveedor' }
];

let movimientos = [
  { id: 1, concepto: 'Venta de servicios', tipo: 'Ingreso', monto: 1500.00, fecha: '2026-09-15' },
  { id: 2, concepto: 'Compra de insumos', tipo: 'Egreso', monto: 450.50, fecha: '2026-09-16' }
];

// ENDPOINTS PARA CONTACTOS

// 1. Obtener todos los contactos
app.get('/api/contactos', (req, res) => {
  res.status(200).json({
    exito: true,
    datos: contactos
  });
});

// 2. Obtener un contacto por ID
app.get('/api/contactos/:id', (req, res) => {
  const contacto = contactos.find(c => c.id === parseInt(req.params.id));
  if (!contacto) {
    return res.status(404).json({
      exito: false,
      mensaje: 'Contacto no encontrado'
    });
  }
  res.status(200).json({
    exito: true,
    datos: contacto
  });
});

// 3. Crear un nuevo contacto
app.post('/api/contactos', (req, res) => {
  const { nombre, rfc, tipo } = req.body;
  
  // Validación
  if (!nombre || !rfc || !tipo) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Todos los campos son obligatorios (nombre, rfc, tipo)'
    });
  }
  
  const nuevoContacto = {
    id: Date.now(), // Genera ID único basado en timestamp
    nombre,
    rfc,
    tipo
  };
  
  contactos.push(nuevoContacto);
  
  res.status(201).json({
    exito: true,
    mensaje: 'Contacto creado exitosamente',
    datos: nuevoContacto
  });
});

// 4. Actualizar un contacto (PUT)
app.put('/api/contactos/:id', (req, res) => {
  const indice = contactos.findIndex(c => c.id === parseInt(req.params.id));
  if (indice === -1) {
    return res.status(404).json({
      exito: false,
      mensaje: 'Contacto no encontrado'
    });
  }
  
  const { nombre, rfc, tipo } = req.body;
  
  // Actualizar solo los campos proporcionados
  if (nombre) contactos[indice].nombre = nombre;
  if (rfc) contactos[indice].rfc = rfc;
  if (tipo) contactos[indice].tipo = tipo;
  
  res.status(200).json({
    exito: true,
    mensaje: 'Contacto actualizado',
    datos: contactos[indice]
  });
});

// 5. Eliminar un contacto (DELETE)
app.delete('/api/contactos/:id', (req, res) => {
  const indice = contactos.findIndex(c => c.id === parseInt(req.params.id));
  if (indice === -1) {
    return res.status(404).json({
      exito: false,
      mensaje: 'Contacto no encontrado'
    });
  }
  
  contactos.splice(indice, 1);
  
  res.status(200).json({
    exito: true,
    mensaje: 'Contacto eliminado'
  });
});

// ENDPOINTS PARA MOVIMIENTOS CONTABLES

// 1. Obtener todos los movimientos
app.get('/api/movimientos', (req, res) => {
  res.status(200).json({
    exito: true,
    datos: movimientos
  });
});

// 2. Crear un nuevo movimiento
app.post('/api/movimientos', (req, res) => {
  const { concepto, tipo, monto, fecha } = req.body;
  
  // Validación estricta
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
  
  const nuevoMovimiento = {
    id: Date.now(),
    concepto,
    tipo,
    monto: montoNumerico,
    fecha: fecha || new Date().toISOString().split('T')[0]
  };
  
  movimientos.push(nuevoMovimiento);
  
  res.status(201).json({
    exito: true,
    mensaje: 'Movimiento registrado',
    datos: nuevoMovimiento
  });
});

// 3. Obtener resumen contable
app.get('/api/resumen', (req, res) => {
  const totalIngresos = movimientos
    .filter(m => m.tipo === 'Ingreso')
    .reduce((sum, m) => sum + m.monto, 0);
    
  const totalEgresos = movimientos
    .filter(m => m.tipo === 'Egreso')
    .reduce((sum, m) => sum + m.monto, 0);
    
  const saldo = totalIngresos - totalEgresos;
  
  res.status(200).json({
    exito: true,
    datos: {
      totalIngresos,
      totalEgresos,
      saldo,
      totalMovimientos: movimientos.length
    }
  });
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log('=================================');
  console.log('   SERVIDOR ERP CONTABLE ACTIVO  ');
  console.log('=================================');
  console.log(`Puerto: http://localhost:${PORT}`);
  console.log('Endpoints disponibles:');
  console.log('  • GET    /api/contactos');
  console.log('  • POST   /api/contactos');
  console.log('  • GET    /api/movimientos');
  console.log('  • POST   /api/movimientos');
  console.log('  • GET    /api/resumen');
  console.log('=================================');
});