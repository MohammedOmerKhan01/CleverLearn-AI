const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../../config/db');
const { initDb } = require('../../config/initDb');

// ── Admin secret middleware ───────────────────────────────────────────────────
function adminGuard(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  const provided = req.headers['x-admin-secret'] || '';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // Endpoint disabled if ADMIN_SECRET not set
  if (!secret) {
    console.warn(`[admin] ⛔ Endpoint disabled — ADMIN_SECRET not set (ip=${ip})`);
    return res.status(503).json({ error: 'Admin endpoint disabled' });
  }

  // Timing-safe comparison to prevent timing attacks
  const secretBuf   = Buffer.from(secret);
  const providedBuf = Buffer.from(provided.padEnd(secret.length));
  const valid =
    providedBuf.length === secretBuf.length &&
    crypto.timingSafeEqual(secretBuf, providedBuf);

  if (!valid) {
    console.warn(`[admin] ❌ Unauthorized attempt — ip=${ip} method=${req.method} path=${req.path}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log(`[admin] ✅ Authorized — ip=${ip} method=${req.method} path=${req.path}`);
  next();
}

router.use(adminGuard);

// POST /api/admin/seed
router.post('/seed', async (req, res) => {
  try {
    await initDb();

    // Check if already seeded
    const [existing] = await pool.execute('SELECT COUNT(*) as count FROM users');
    if (existing[0].count > 0) {
      return res.json({ message: 'Already seeded', users: existing[0].count });
    }

    // Users
    const users = [
      { name: 'Admin User',   email: 'admin@lms.dev',   password: 'admin123',   role: 'admin'   },
      { name: 'Jane Student', email: 'student@lms.dev', password: 'student123', role: 'student' },
    ];
    const userIds = [];
    for (const u of users) {
      const id = uuidv4();
      const hash = await bcrypt.hash(u.password, 10);
      await pool.execute(
        'INSERT IGNORE INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [id, u.name, u.email, hash, u.role]
      );
      userIds.push(id);
    }

    // Subjects
    const subjects = [
      {
        title: 'JavaScript Fundamentals',
        description: 'Master the core concepts of JavaScript.',
        sections: [
          { title: 'Getting Started', videos: [
            { title: 'Introduction to JavaScript', youtube_id: 'W6NZfCO5SIk', duration_seconds: 3600 },
            { title: 'Variables and Data Types',   youtube_id: 'edlFjlzxkSI', duration_seconds: 1800 },
          ]},
          { title: 'Core Concepts', videos: [
            { title: 'Functions Explained', youtube_id: 'N8ap4k_1QEQ', duration_seconds: 2400 },
            { title: 'Arrays and Objects',  youtube_id: 'oigfaZ5ApsM', duration_seconds: 2700 },
          ]},
          { title: 'Async JavaScript', videos: [
            { title: 'Callbacks and Promises', youtube_id: 'PoRJizFvM7s', duration_seconds: 3000 },
            { title: 'Async / Await',          youtube_id: 'V_Kr9OSfDeU', duration_seconds: 2100 },
          ]},
          { title: 'Modern JS (ES6+)', videos: [
            { title: 'Destructuring & Spread', youtube_id: 'NIq3qLaHCIs', duration_seconds: 1500 },
            { title: 'Modules and Imports',    youtube_id: 'cRHQNNkYi1A', duration_seconds: 1200 },
          ]},
        ],
      },
      {
        title: 'React for Beginners',
        description: 'Build modern UIs with React.',
        sections: [
          { title: 'React Basics', videos: [
            { title: 'What is React?',   youtube_id: 'Tn6-PIqc4UM', duration_seconds: 2400 },
            { title: 'JSX and Components', youtube_id: 'RGKi6LSPDLU', duration_seconds: 1800 },
          ]},
          { title: 'State and Props', videos: [
            { title: 'useState Hook',      youtube_id: 'O6P86uwfdR0', duration_seconds: 2100 },
            { title: 'Props and Data Flow',youtube_id: 'PHaECbrKgs0', duration_seconds: 1500 },
          ]},
          { title: 'Side Effects', videos: [
            { title: 'useEffect Explained',         youtube_id: 'UVhIMwHDS9k', duration_seconds: 2700 },
            { title: 'Fetching Data with useEffect',youtube_id: 'bYFYF2GnMy8', duration_seconds: 2400 },
          ]},
          { title: 'Advanced Patterns', videos: [
            { title: 'Context API',  youtube_id: 'HYKDUF8X3qI', duration_seconds: 1800 },
            { title: 'Custom Hooks', youtube_id: 'J-g9ZJha8FE', duration_seconds: 2100 },
          ]},
        ],
      },
    ];

    const subjectIds = [];
    for (const subj of subjects) {
      const subjectId = uuidv4();
      subjectIds.push(subjectId);
      await pool.execute(
        'INSERT IGNORE INTO subjects (id, title, description, is_published) VALUES (?, ?, ?, ?)',
        [subjectId, subj.title, subj.description, true]
      );
      for (let si = 0; si < subj.sections.length; si++) {
        const sec = subj.sections[si];
        const sectionId = uuidv4();
        await pool.execute(
          'INSERT IGNORE INTO sections (id, subject_id, title, order_index) VALUES (?, ?, ?, ?)',
          [sectionId, subjectId, sec.title, si + 1]
        );
        for (let vi = 0; vi < sec.videos.length; vi++) {
          const vid = sec.videos[vi];
          await pool.execute(
            'INSERT IGNORE INTO videos (id, section_id, title, youtube_id, duration_seconds, order_index) VALUES (?, ?, ?, ?, ?, ?)',
            [uuidv4(), sectionId, vid.title, vid.youtube_id, vid.duration_seconds, vi + 1]
          );
        }
      }
    }

    // Enrollments
    for (const userId of userIds) {
      for (const subjectId of subjectIds) {
        await pool.execute(
          'INSERT IGNORE INTO enrollments (id, user_id, subject_id) VALUES (?, ?, ?)',
          [uuidv4(), userId, subjectId]
        );
      }
    }

    res.json({
      success: true,
      message: 'Database seeded successfully',
      credentials: {
        admin:   'admin@lms.dev / admin123',
        student: 'student@lms.dev / student123',
      },
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
