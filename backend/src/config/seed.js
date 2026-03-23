/**
 * Seed script — wipes and repopulates subjects, sections, videos, and enrollments.
 * Run: node src/config/seed.js
 *
 * Creates:
 *   - 1 admin user  (admin@lms.dev / admin123)
 *   - 1 student user (student@lms.dev / student123)
 *   - 2 published subjects
 *   - 4 sections per subject (8 total)
 *   - 2 videos per section (16 total)
 *   - Both users enrolled in both subjects
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool, testConnection } = require('./db');
const { initDb } = require('./initDb');

// ─── Data ─────────────────────────────────────────────────────────────────────

const USERS = [
  { name: 'Admin User',    email: 'admin@lms.dev',   password: 'admin123',   role: 'admin'   },
  { name: 'Jane Student',  email: 'student@lms.dev', password: 'student123', role: 'student' },
];

const SUBJECTS = [
  {
    title: 'JavaScript Fundamentals',
    description: 'Master the core concepts of JavaScript — from variables to async/await.',
    thumbnail_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png',
    sections: [
      {
        title: 'Getting Started',
        videos: [
          { title: 'Introduction to JavaScript',  youtube_id: 'W6NZfCO5SIk', duration_seconds: 3600 },
          { title: 'Variables and Data Types',    youtube_id: 'edlFjlzxkSI', duration_seconds: 1800 },
        ],
      },
      {
        title: 'Core Concepts',
        videos: [
          { title: 'Functions Explained',         youtube_id: 'N8ap4k_1QEQ', duration_seconds: 2400 },
          { title: 'Arrays and Objects',          youtube_id: 'oigfaZ5ApsM', duration_seconds: 2700 },
        ],
      },
      {
        title: 'Asynchronous JavaScript',
        videos: [
          { title: 'Callbacks and Promises',      youtube_id: 'PoRJizFvM7s', duration_seconds: 3000 },
          { title: 'Async / Await Deep Dive',     youtube_id: 'V_Kr9OSfDeU', duration_seconds: 2100 },
        ],
      },
      {
        title: 'Modern JavaScript (ES6+)',
        videos: [
          { title: 'Destructuring & Spread',      youtube_id: 'NIq3qLaHCIs', duration_seconds: 1500 },
          { title: 'Modules and Imports',         youtube_id: 'cRHQNNkYi1A', duration_seconds: 1200 },
        ],
      },
    ],
  },
  {
    title: 'React for Beginners',
    description: 'Build modern UIs with React — components, hooks, and state management.',
    thumbnail_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
    sections: [
      {
        title: 'React Basics',
        videos: [
          { title: 'What is React?',              youtube_id: 'Tn6-PIqc4UM', duration_seconds: 2400 },
          { title: 'JSX and Components',          youtube_id: 'RGKi6LSPDLU', duration_seconds: 1800 },
        ],
      },
      {
        title: 'State and Props',
        videos: [
          { title: 'useState Hook',               youtube_id: 'O6P86uwfdR0', duration_seconds: 2100 },
          { title: 'Props and Data Flow',         youtube_id: 'PHaECbrKgs0', duration_seconds: 1500 },
        ],
      },
      {
        title: 'Side Effects',
        videos: [
          { title: 'useEffect Explained',         youtube_id: 'UVhIMwHDS9k', duration_seconds: 2700 },
          { title: 'Fetching Data with useEffect',youtube_id: 'bYFYF2GnMy8', duration_seconds: 2400 },
        ],
      },
      {
        title: 'Advanced Patterns',
        videos: [
          { title: 'Context API',                 youtube_id: 'HYKDUF8X3qI', duration_seconds: 1800 },
          { title: 'Custom Hooks',                youtube_id: 'J-g9ZJha8FE', duration_seconds: 2100 },
        ],
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function clearTables() {
  // Disable FK checks so we can truncate in any order
  await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of ['enrollments', 'video_progress', 'refresh_tokens', 'videos', 'sections', 'subjects', 'users']) {
    await pool.execute(`TRUNCATE TABLE ${t}`);
  }
  await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
  console.log('🗑️  Tables cleared');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await testConnection();
  await initDb();
  await clearTables();

  // ── Users ──────────────────────────────────────────────────────────────────
  const userIds = [];
  for (const u of USERS) {
    const id = uuidv4();
    const hash = await bcrypt.hash(u.password, 10);
    await pool.execute(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [id, u.name, u.email, hash, u.role]
    );
    userIds.push(id);
    console.log(`👤 Created ${u.role}: ${u.email} / ${u.password}`);
  }

  // ── Subjects, Sections, Videos ─────────────────────────────────────────────
  const subjectIds = [];
  for (const subj of SUBJECTS) {
    const subjectId = uuidv4();
    subjectIds.push(subjectId);

    await pool.execute(
      'INSERT INTO subjects (id, title, description, thumbnail_url, is_published) VALUES (?, ?, ?, ?, ?)',
      [subjectId, subj.title, subj.description, subj.thumbnail_url, true]
    );
    console.log(`📚 Subject: ${subj.title}`);

    for (let si = 0; si < subj.sections.length; si++) {
      const sec = subj.sections[si];
      const sectionId = uuidv4();

      await pool.execute(
        'INSERT INTO sections (id, subject_id, title, order_index) VALUES (?, ?, ?, ?)',
        [sectionId, subjectId, sec.title, si + 1]
      );

      for (let vi = 0; vi < sec.videos.length; vi++) {
        const vid = sec.videos[vi];
        await pool.execute(
          'INSERT INTO videos (id, section_id, title, youtube_id, duration_seconds, order_index) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), sectionId, vid.title, vid.youtube_id, vid.duration_seconds, vi + 1]
        );
      }
      console.log(`  📂 Section: ${sec.title} (${sec.videos.length} videos)`);
    }
  }

  // ── Enrollments ────────────────────────────────────────────────────────────
  for (const userId of userIds) {
    for (const subjectId of subjectIds) {
      await pool.execute(
        'INSERT INTO enrollments (id, user_id, subject_id) VALUES (?, ?, ?)',
        [uuidv4(), userId, subjectId]
      );
    }
  }
  console.log(`🎓 Enrolled all users in all subjects`);

  console.log('\n✅ Seed complete');
  console.log('   Admin:   admin@lms.dev   / admin123');
  console.log('   Student: student@lms.dev / student123');
  process.exit(0);
}

seed().catch((err) => { console.error('❌ Seed failed:', err); process.exit(1); });
