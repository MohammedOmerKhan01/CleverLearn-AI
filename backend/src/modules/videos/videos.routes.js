const { Router } = require('express');
const controller = require('./videos.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.get('/:videoId', authenticate, controller.getById);

module.exports = router;
