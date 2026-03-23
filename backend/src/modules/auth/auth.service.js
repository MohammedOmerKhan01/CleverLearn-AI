const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../../config/db');

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function register({ name, email, password }) {
  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    const err = new Error('Email already registered'); err.status = 409; throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  await pool.execute(
    'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    [id, name, email, passwordHash]
  );

  const user = { id, name, email, role: 'student' };
  return user;
}

async function login({ email, password }) {
  const [rows] = await pool.execute(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
    [email]
  );
  const user = rows[0];
  if (!user) {
    const err = new Error('Invalid credentials'); err.status = 401; throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials'); err.status = 401; throw err;
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function saveRefreshToken(userId, token) {
  const id = uuidv4();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await pool.execute(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [id, userId, tokenHash, expiresAt]
  );
}

async function rotateRefreshToken(oldToken) {
  const tokenHash = hashToken(oldToken);
  const [rows] = await pool.execute(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = FALSE AND expires_at > NOW()',
    [tokenHash]
  );

  if (rows.length === 0) {
    const err = new Error('Invalid or expired refresh token'); err.status = 401; throw err;
  }

  const record = rows[0];
  // Revoke old token
  await pool.execute('UPDATE refresh_tokens SET revoked = TRUE WHERE id = ?', [record.id]);

  // Fetch user
  const [userRows] = await pool.execute(
    'SELECT id, name, email, role FROM users WHERE id = ?',
    [record.user_id]
  );
  const user = userRows[0];
  if (!user) {
    const err = new Error('User not found'); err.status = 401; throw err;
  }

  return user;
}

async function revokeRefreshToken(token) {
  const tokenHash = hashToken(token);
  await pool.execute(
    'UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?',
    [tokenHash]
  );
}

module.exports = {
  register,
  login,
  saveRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  generateAccessToken,
  generateRefreshToken,
};
