const progressService = require('./progress.service');

async function getVideoProgress(req, res, next) {
  try {
    const progress = await progressService.getVideoProgress(req.user.userId, req.params.videoId);
    res.json({ progress });
  } catch (err) {
    next(err);
  }
}

async function updateVideoProgress(req, res, next) {
  try {
    const { watchedSeconds, isCompleted } = req.body;
    if (typeof watchedSeconds !== 'number') {
      return res.status(400).json({ error: 'watchedSeconds must be a number' });
    }

    const progress = await progressService.updateVideoProgress(
      req.user.userId,
      req.params.videoId,
      { watchedSeconds, isCompleted: Boolean(isCompleted) }
    );
    res.json({ progress });
  } catch (err) {
    next(err);
  }
}

async function getSubjectProgress(req, res, next) {
  try {
    const progress = await progressService.getSubjectProgress(req.user.userId, req.params.subjectId);
    res.json({ progress });
  } catch (err) {
    next(err);
  }
}

module.exports = { getVideoProgress, updateVideoProgress, getSubjectProgress };
