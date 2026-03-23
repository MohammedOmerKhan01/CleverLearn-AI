const subjectsService = require('./subjects.service');

async function getAll(req, res, next) {
  try {
    const subjects = await subjectsService.getAllSubjects();
    res.json({ subjects });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const subject = await subjectsService.getSubjectById(req.params.subjectId);
    res.json({ subject });
  } catch (err) {
    next(err);
  }
}

async function getTree(req, res, next) {
  try {
    // Pass userId so tree includes per-video lock status
    const tree = await subjectsService.getSubjectTree(req.params.subjectId, req.user.userId);
    res.json({ subject: tree });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, getTree };
