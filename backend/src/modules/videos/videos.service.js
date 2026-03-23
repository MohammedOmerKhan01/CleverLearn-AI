const { pool } = require('../../config/db');
const sequencing = require('../sequencing/sequencing.service');

async function getVideoById(videoId) {
  const [rows] = await pool.execute(
    `SELECT v.id, v.title, v.youtube_id, v.duration_seconds, v.order_index,
            v.section_id, s.subject_id, s.order_index AS section_order
     FROM videos v
     JOIN sections s ON v.section_id = s.id
     WHERE v.id = ?`,
    [videoId]
  );
  if (!rows[0]) {
    const err = new Error('Video not found'); err.status = 404; throw err;
  }
  return rows[0];
}

async function getFirstVideoForSubject(subjectId) {
  const sequence = await sequencing.getSubjectSequence(subjectId);
  if (!sequence.length) {
    const err = new Error('No videos found for this subject'); err.status = 404; throw err;
  }
  return sequence[0];
}

/**
 * Get a video with its lock status for a specific user.
 * Returns the video data enriched with: locked, unlock_reason, previous_video_id, next_video_id.
 */
async function getVideoWithLockStatus(userId, videoId) {
  const { unlocked, reason, entry } = await sequencing.getLockStatus(userId, videoId);
  return {
    id:               entry.id,
    title:            entry.title,
    youtube_id:       entry.youtube_id,
    duration_seconds: entry.duration_seconds,
    section_id:       entry.section_id,
    subject_id:       entry.subject_id,
    global_position:  entry.global_position,
    previous_video_id: entry.previous_video_id,
    next_video_id:     entry.next_video_id,
    locked:           !unlocked,
    unlock_reason:    reason,
  };
}

// Keep these for backward compat — delegate to sequencing
async function getNextVideo(videoId) {
  const entry = await sequencing.getSequenceEntry(videoId);
  if (!entry.next_video_id) return null;
  return { id: entry.next_video_id };
}

async function getPreviousVideo(videoId) {
  const entry = await sequencing.getSequenceEntry(videoId);
  if (!entry.previous_video_id) return null;
  return { id: entry.previous_video_id };
}

module.exports = {
  getVideoById,
  getFirstVideoForSubject,
  getVideoWithLockStatus,
  getNextVideo,
  getPreviousVideo,
};
