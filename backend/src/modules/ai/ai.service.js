const { InferenceClient } = require('@huggingface/inference');

// Single fast model for all tasks via chat completions
const MODEL = 'meta-llama/Llama-3.1-8B-Instruct';

function getClient() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey || apiKey === 'your_hf_api_key_here') {
    throw Object.assign(new Error('Hugging Face API key not configured'), { status: 503 });
  }
  return new InferenceClient(apiKey);
}

async function chatComplete(systemPrompt, userMessage) {
  const client = getClient();
  const result = await client.chatCompletion({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 350,
    temperature: 0.6,
  });
  const reply = result.choices?.[0]?.message?.content?.trim();
  if (!reply) throw Object.assign(new Error('No response from AI model'), { status: 502 });
  return reply;
}

/**
 * Summarize lesson text.
 */
async function summarize(text) {
  if (!text || text.trim().length < 50) {
    throw Object.assign(new Error('Text too short to summarize (min 50 characters)'), { status: 400 });
  }

  const reply = await chatComplete(
    'You are an expert educational content summarizer. Summarize the given lesson content into 3-5 clear, concise bullet points. Be specific and educational.',
    `Summarize this lesson content:\n\n${text.slice(0, 3000)}`
  );

  return { summary: reply };
}

/**
 * Answer a question — with context uses grounded QA, without uses general knowledge.
 */
async function answerQuestion(question, context) {
  if (!question?.trim()) throw Object.assign(new Error('question is required'), { status: 400 });
  if (!context?.trim()) throw Object.assign(new Error('context is required'), { status: 400 });

  const reply = await chatComplete(
    'You are a helpful learning assistant. Answer the student\'s question using only the provided context. If the answer is not in the context, say so clearly. Be concise.',
    `Context:\n${context.slice(0, 2000)}\n\nQuestion: ${question.trim()}`
  );

  return { answer: reply, score: 1 };
}

/**
 * General chatbot for student help.
 */
async function chat(message, lessonTitle) {
  if (!message?.trim()) throw Object.assign(new Error('message is required'), { status: 400 });

  const system = lessonTitle
    ? `You are a helpful learning assistant for the lesson "${lessonTitle}". Answer student questions clearly and concisely. Keep responses under 3 sentences unless a detailed explanation is needed.`
    : `You are a helpful learning assistant. Answer student questions clearly and concisely. Keep responses under 3 sentences unless a detailed explanation is needed.`;

  const reply = await chatComplete(system, message.trim());
  return { reply };
}

module.exports = { summarize, answerQuestion, chat };
