/**
 * sequencing.service.js
 *
 * Single source of truth for the global ordered video sequence within a subject.
 * All locking logic lives here — no other module computes prev/next independently.
 *
 * Cache strategy: in-process Map keyed by subjectId.
 * TTL = 5 minutes. Invalidated on any write that changes structure (not needed
 * for progress — progress is per-user and fetched live).
 */

const { pool } = require('../../config/db');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** @type {Map<string, { sequence: SequenceEntry[], ts: number }>} */
const cache = new Map();

/**
 * @typedef {Object} SequenceEntry
 * @property {string}      id
 * @property {string}      title
 * @property {string}      youtube_id
 * @property {number}      duration_seconds
 * @property {number}      video_order       — order_index within section
 * @property {string}      section_id
 * @property {string}      section_title
 * @property {number}      section_order     — order_index of section within subject
 * @property {string}      subject_id
 * @property {number}      global_position   — 0-based position in flat sequence
 * @property {string|null} previous_video_id
 * @property {string|null} next_video_id
 */

/**
 * Returns the fully-ordered flat sequence for a subject.
 * Sections sorted by order_index, videos within each section sorted by order_index.
 * Result is cached per subject.
 *
 * @param {string} subjectId
 * @returns {Promise<SequenceEntry[]>}
 */
async function getSubjectSequence(subjectId) {
  const cached = cache.get(subjectId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.sequence;
  }

  const [rows] = await pool.execute(
    `SELECT
       v.id,
       v.title,
       v.youtube_id,
       v.duration_seconds,
       v.order_index   AS video_order,
       v.section_id,
       s.title         AS section_title,
       s.order_index   AS section_order,
       s.subject_id
     FROM videos v
     JOIN sections s ON v.section_id = s.id
     WHERE s.subject_id = ?
     ORDER BY s.order_index ASC, v.order_index ASC`,
    [subjectId]
  );

  /** @type {SequenceEntry[]} */
  const sequence = rows.map((row, idx) => ({
    id:               row.id,
    title:            row.title,
    youtube_id:       row.youtube_id,
    duration_seconds: row.duration_seconds,
    video_order:      row.video_order,
    section_id:       row.section_id,
    section_title:    row.section_title,
    section_order:    row.section_order,
    subject_id:       row.subject_id,
    global_position:  idx,
    previous_video_id: idx > 0 ? rows[idx - 1].id : null,
    next_video_id:     idx < rows.length - 1 ? rows[idx + 1].id : null,
  }));

  cache.set(subjectId, { sequence, ts: Date.now() });
  return sequence;
}

/**
 * Invalidate the cache for a subject (call after structural changes).
 * @param {string} subjectId
 */
function invalidateCache(subjectId) {
  cache.delete(subjectId);
}

/**
 * Find a single entry in the sequence by videoId.
 * Looks up the subject first via a DB query, then uses the cached sequence.
 *
 * @param {string} videoId
 * @returns {Promise<SequenceEntry>}
 */
async function getSequenceEntry(videoId) {
  // Resolve subject_id for this video
  const [rows] = await pool.execute(
    `SELECT s.subject_id FROM videos v JOIN sections s ON v.section_id = s.id WHERE v.id = ?`,
    [videoId]
  );
  if (!rows[0]) {
    const err = new Error('Video not found'); err.status = 404; throw err;
  }
  const { subject_id } = rows[0];
  const sequence = await getSubjectSequence(subject_id);
  const entry = sequence.find((e) => e.id === videoId);
  if (!entry) {
    const err = new Error('Video not found in sequence'); err.status = 404; throw err;
  }
  return entry;
}

/**
 * Determine whether a video is unlocked for a specific user.
 *
 * Rules:
 *   - global_position === 0  → always unlocked (first video)
 *   - otherwise              → unlocked iff previous video is_completed = true
 *
 * @param {string} userId
 * @param {string} videoId
 * @returns {Promise<{ unlocked: boolean, reason: string, entry: SequenceEntry }>}
 */
async function getLockStatus(userId, videoId) {
  const entry = await getSequenceEntry(videoId);

  if (entry.global_position === 0) {
    return {
      unlocked: true,
      reason: 'First video in the course — always unlocked',
      entry,
    };
  }

  const [rows] = await pool.execute(
    'SELECT is_completed FROM video_progress WHERE user_id = ? AND video_id = ?',
    [userId, entry.previous_video_id]
  );

  const prevCompleted = rows[0]?.is_completed === 1;

  return {
    unlocked: prevCompleted,
    reason: prevCompleted
      ? 'Previous lesson completed'
      : 'Complete the previous lesson to unlock this video',
    entry,
  };
}

/**
 * Assert a video is unlocked — throws 403 if not.
 * Use this as a guard at the top of any handler that accesses video content.
 *
 * @param {string} userId
 * @param {string} videoId
 * @returns {Promise<SequenceEntry>} the sequence entry (for reuse by caller)
 */
async function assertUnlocked(userId, videoId) {
  const { unlocked, reason, entry } = await getLockStatus(userId, videoId);
  if (!unlocked) {
    const err = new Error(reason); err.status = 403; throw err;
  }
  return entry;
}

module.exports = {
  getSubjectSequence,
  getSequenceEntry,
  getLockStatus,
  assertUnlocked,
  invalidateCache,
};
