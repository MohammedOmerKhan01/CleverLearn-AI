const { Router } = require('express');
const controller = require('./ai.controller');
const { authenticate } = require('../../middleware/auth');
const rateLimit = require('express-rate-limit');

// AI calls are expensive — tighter rate limit
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'Too many AI requests, slow down a bit' },
});

const router = Router();

router.post('/summarize', authenticate, aiLimiter, controller.summarize);
router.post('/ask', authenticate, aiLimiter, controller.ask);

module.exports = router;
