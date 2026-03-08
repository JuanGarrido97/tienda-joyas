const mysql = require('mysql2/promise');

// Pool de conexiones: en vez de abrir/cerrar la conexión en cada petición,
// mantiene un grupo de conexiones reutilizables (más eficiente)
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = pool;
