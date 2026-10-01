import mysql from 'mysql2/promise';

// Configuración del Pool de Conexiones a MySQL con Huella Digital
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'JonnyKey24',
  database: process.env.DB_NAME || 'erp_contable_jech',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
