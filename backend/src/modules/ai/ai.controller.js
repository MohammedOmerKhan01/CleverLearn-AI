const aiService = require('./ai.service');

async function summarize(req, res, next) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const result = await aiService.summarize(text);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function ask(req, res, next) {
  try {
    const { question, context, lessonTitle } = req.body;

    // If context provided → extractive QA; otherwise → generative chat
    if (context) {
      const result = await aiService.answerQuestion(question, context);
      res.json(result);
    } else {
      const result = await aiService.chat(question, lessonTitle);
      res.json(result);
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { summarize, ask };
