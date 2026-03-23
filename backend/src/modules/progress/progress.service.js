const { v4: uuidv4 } = require('uuid');
const { pool } = require('../../config/db');
const sequencing = require('../sequencing/sequencing.service');

/**
 * Get progress for a single video.
 * Enforces sequential lock — throws 403 if video is locked.
 */
async function getVideoProgress(userId, videoId) {
  await sequencing.assertUnlocked(userId, videoId);

  const [rows] = await pool.execute(
    'SELECT watched_seconds, is_completed, completed_at FROM video_progress WHERE user_id = ? AND video_id = ?',
    [userId, videoId]
  );
  return rows[0] || { watched_seconds: 0, is_completed: false, completed_at: null };
}

/**
 * Save / update progress for a video.
 * Enforces sequential lock — throws 403 if video is locked.
 * Idempotent: watched_seconds only moves forward, is_completed never reverts.
 */
async function updateVideoProgress(userId, videoId, { watchedSeconds, isCompleted }) {
  await sequencing.assertUnlocked(userId, videoId);

  const [existing] = await pool.execute(
    'SELECT id, is_completed FROM video_progress WHERE user_id = ? AND video_id = ?',
    [userId, videoId]
  );

  if (existing[0]) {
    const alreadyCompleted = existing[0].is_completed === 1;
    const completedAt = isCompleted && !alreadyCompleted ? new Date() : undefined;

    await pool.execute(
      `UPDATE video_progress
       SET watched_seconds = GREATEST(watched_seconds, ?),
           is_completed    = GREATEST(is_completed, ?),
           completed_at    = COALESCE(completed_at, ?)
       WHERE user_id = ? AND video_id = ?`,
      [watchedSeconds, isCompleted ? 1 : 0, completedAt || null, userId, videoId]
    );
  } else {
    await pool.execute(
      `INSERT INTO video_progress (id, user_id, video_id, watched_seconds, is_completed, completed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userId, videoId, watchedSeconds, isCompleted ? 1 : 0, isCompleted ? new Date() : null]
    );
  }

  const [updated] = await pool.execute(
    'SELECT watched_seconds, is_completed, completed_at FROM video_progress WHERE user_id = ? AND video_id = ?',
    [userId, videoId]
  );
  return updated[0];
}

/**
 * Get full subject progress with per-video lock status for the user.
 * Returns the flat ordered sequence enriched with progress + lock data.
 */
async function getSubjectProgress(userId, subjectId) {
  const sequence = await sequencing.getSubjectSequence(subjectId);
  if (!sequence.length) {
    return { total: 0, completed: 0, percentage: 0, videos: [] };
  }

  // Fetch all progress rows for this user + subject in one query
  const videoIds = sequence.map((e) => e.id);
  const placeholders = videoIds.map(() => '?').join(',');
  const [progressRows] = await pool.execute(
    `SELECT video_id, watched_seconds, is_completed, completed_at
     FROM video_progress
     WHERE user_id = ? AND video_id IN (${placeholders})`,
    [userId, ...videoIds]
  );

  const progressMap = Object.fromEntries(progressRows.map((r) => [r.video_id, r]));

  // Build per-video lock status without extra DB calls:
  // position 0 is always unlocked; position N is unlocked iff position N-1 is completed.
  const videos = sequence.map((entry, idx) => {
    const prog = progressMap[entry.id];
    const isCompleted = prog?.is_completed === 1;

    let locked = false;
    let unlock_reason = 'First video in the course — always unlocked';

    if (idx > 0) {
      const prevId = entry.previous_video_id;
      const prevCompleted = progressMap[prevId]?.is_completed === 1;
      locked = !prevCompleted;
      unlock_reason = prevCompleted
        ? 'Previous lesson completed'
        : 'Complete the previous lesson to unlock this video';
    }

    return {
      video_id:          entry.id,
      title:             entry.title,
      section_id:        entry.section_id,
      section_title:     entry.section_title,
      global_position:   entry.global_position,
      previous_video_id: entry.previous_video_id,
      next_video_id:     entry.next_video_id,
      locked,
      unlock_reason,
      watched_seconds:   prog?.watched_seconds ?? 0,
      is_completed:      isCompleted,
      completed_at:      prog?.completed_at ?? null,
    };
  });

  const total = videos.length;
  const completed = videos.filter((v) => v.is_completed).length;

  return {
    total,
    completed,
    percentage: Math.round((completed / total) * 100),
    videos,
  };
}

module.exports = { getVideoProgress, updateVideoProgress, getSubjectProgress };
