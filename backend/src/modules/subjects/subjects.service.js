const { pool } = require('../../config/db');
const sequencing = require('../sequencing/sequencing.service');

async function getAllSubjects() {
  const [rows] = await pool.execute(
    'SELECT id, title, description, thumbnail_url, created_at FROM subjects ORDER BY created_at DESC'
  );
  return rows;
}

async function getSubjectById(subjectId) {
  const [rows] = await pool.execute(
    'SELECT id, title, description, thumbnail_url, created_at FROM subjects WHERE id = ?',
    [subjectId]
  );
  if (!rows[0]) {
    const err = new Error('Subject not found'); err.status = 404; throw err;
  }
  return rows[0];
}

/**
 * Returns the subject tree with sections and videos.
 * When userId is provided, each video includes lock status fields:
 *   locked, unlock_reason, previous_video_id, next_video_id, global_position
 */
async function getSubjectTree(subjectId, userId = null) {
  const subject = await getSubjectById(subjectId);
  const sequence = await sequencing.getSubjectSequence(subjectId);

  if (!sequence.length) {
    return { ...subject, sections: [] };
  }

  // Fetch progress for this user in one query if userId provided
  let progressMap = {};
  if (userId) {
    const videoIds = sequence.map((e) => e.id);
    const placeholders = videoIds.map(() => '?').join(',');
    const [progressRows] = await pool.execute(
      `SELECT video_id, is_completed FROM video_progress WHERE user_id = ? AND video_id IN (${placeholders})`,
      [userId, ...videoIds]
    );
    progressMap = Object.fromEntries(progressRows.map((r) => [r.video_id, r]));
  }

  // Build section map from sequence
  const sectionMap = new Map();
  for (const entry of sequence) {
    if (!sectionMap.has(entry.section_id)) {
      sectionMap.set(entry.section_id, {
        id:          entry.section_id,
        title:       entry.section_title,
        order_index: entry.section_order,
        videos:      [],
      });
    }

    let locked = false;
    let unlock_reason = 'First video in the course — always unlocked';

    if (userId && entry.global_position > 0) {
      const prevCompleted = progressMap[entry.previous_video_id]?.is_completed === 1;
      locked = !prevCompleted;
      unlock_reason = prevCompleted
        ? 'Previous lesson completed'
        : 'Complete the previous lesson to unlock this video';
    }

    sectionMap.get(entry.section_id).videos.push({
      id:                entry.id,
      title:             entry.title,
      youtube_id:        entry.youtube_id,
      duration_seconds:  entry.duration_seconds,
      order_index:       entry.video_order,
      global_position:   entry.global_position,
      previous_video_id: entry.previous_video_id,
      next_video_id:     entry.next_video_id,
      locked,
      unlock_reason,
      is_completed:      progressMap[entry.id]?.is_completed === 1,
    });
  }

  const sections = [...sectionMap.values()].sort((a, b) => a.order_index - b.order_index);
  return { ...subject, sections };
}

module.exports = { getAllSubjects, getSubjectById, getSubjectTree };
