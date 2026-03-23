const { Router } = require('express');
const controller = require('./subjects.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.get('/', authenticate, controller.getAll);
router.get('/:subjectId', authenticate, controller.getById);
router.get('/:subjectId/tree', authenticate, controller.getTree);

module.exports = router;
