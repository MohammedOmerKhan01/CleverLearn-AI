const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function getSslConfig() {
  if (process.env.DB_SSL !== 'true') return undefined;
  const caPath = path.join(__dirname, 'ca.crt');
  if (fs.existsSync(caPath)) {
    return { ca: fs.readFileSync(caPath) };
  }
  // Fallback: skip verification (less secure but works without cert file)
  return { rejectUnauthorized: false };
}

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: getSslConfig(),
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Database connected');
    conn.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
