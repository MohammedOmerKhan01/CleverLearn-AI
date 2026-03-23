/**
 * Run pending migrations against the existing DB.
 * Safe to run multiple times.
 * Usage: node src/config/migrate.js
 */
require('dotenv').config();
const { pool, testConnection } = require('./db');

async function migrate() {
  await testConnection();

  const alterations = [
    {
      check: "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subjects' AND COLUMN_NAME='is_published'",
      alter: 'ALTER TABLE subjects ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE AFTER thumbnail_url',
      label: 'subjects.is_published',
    },
    {
      check: "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='is_active'",
      alter: 'ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER role',
      label: 'users.is_active',
    },
    {
      check: "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sections' AND COLUMN_NAME='updated_at'",
      alter: 'ALTER TABLE sections ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
      label: 'sections.updated_at',
    },
    {
      check: "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='videos' AND COLUMN_NAME='updated_at'",
      alter: 'ALTER TABLE videos ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
      label: 'videos.updated_at',
    },
    {
      check: "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='video_progress' AND COLUMN_NAME='created_at'",
      alter: 'ALTER TABLE video_progress ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER completed_at',
      label: 'video_progress.created_at',
    },
  ];

  for (const { check, alter, label } of alterations) {
    const [rows] = await pool.execute(check);
    if (!rows.length) {
      await pool.execute(alter);
      console.log(`✅ Added column: ${label}`);
    } else {
      console.log(`⏭️  Already exists: ${label}`);
    }
  }

  console.log('\n✅ Migrations complete');
  process.exit(0);
}

migrate().catch((err) => { console.error('❌ Migration failed:', err); process.exit(1); });
