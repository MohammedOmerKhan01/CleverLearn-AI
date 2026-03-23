const videosService = require('./videos.service');

/**
 * GET /api/videos/:videoId
 * Returns video data enriched with lock status for the authenticated user.
 * Responds 200 even if locked — the client uses the `locked` flag.
 * Direct progress access is still blocked at the progress layer.
 */
async function getById(req, res, next) {
  try {
    const video = await videosService.getVideoWithLockStatus(req.user.userId, req.params.videoId);
    res.json({ video });
  } catch (err) {
    next(err);
  }
}

async function getFirstVideo(req, res, next) {
  try {
    const video = await videosService.getFirstVideoForSubject(req.params.subjectId);
    res.json({ video });
  } catch (err) {
    next(err);
  }
}

module.exports = { getById, getFirstVideo };
