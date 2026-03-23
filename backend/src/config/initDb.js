const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

/**
 * Splits SQL text into individual statements, handling:
 *  - SET statements (no trailing semicolon required)
 *  - Multi-line CREATE TABLE blocks
 *  - Comments
 */
function splitStatements(sql) {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
}

async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const statements = splitStatements(schema);

  for (const stmt of statements) {
    await pool.execute(stmt);
  }

  console.log('✅ Database schema initialized');
}

module.exports = { initDb };
