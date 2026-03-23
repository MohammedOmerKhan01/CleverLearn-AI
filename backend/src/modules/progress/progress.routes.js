const { Router } = require('express');
const controller = require('./progress.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.get('/videos/:videoId', authenticate, controller.getVideoProgress);
router.post('/videos/:videoId', authenticate, controller.updateVideoProgress);
router.get('/subjects/:subjectId', authenticate, controller.getSubjectProgress);

module.exports = router;
