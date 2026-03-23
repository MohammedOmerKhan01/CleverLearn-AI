'use client';
import { useState, useRef, useEffect } from 'react';
import { useAiStore } from '@/stores/aiStore';

interface Props {
  lessonTitle: string;
  lessonContext?: string; // transcript / description to ground QA
}

type Tab = 'chat' | 'summary';

export function AiPanel({ lessonTitle, lessonContext }: Props) {
  const [tab, setTab] = useState<Tab>('chat');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages, asking, askError,
    summary, summarizing, summarizeError,
    askQuestion, summarizeLesson, clearChat, clearSummary,
  } = useAiStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, asking]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || asking) return;
    setInput('');
    askQuestion(q, lessonContext, lessonTitle);
  }

  function handleSummarize() {
    const text = lessonContext || `Lesson title: ${lessonTitle}. This is an educational video lesson.`;
    summarizeLesson(text);
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-semibold text-sm">AI Assistant</span>
        </div>
        <div className="flex bg-gray-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setTab('chat')}
            className={`px-3 py-1 rounded-md transition-colors ${tab === 'chat' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Chat
          </button>
          <button
            onClick={() => setTab('summary')}
            className={`px-3 py-1 rounded-md transition-colors ${tab === 'summary' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Summary
          </button>
        </div>
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm mt-8 space-y-2">
                <p className="text-2xl">💬</p>
                <p>Ask anything about this lesson.</p>
                <div className="flex flex-col gap-2 mt-4">
                  {['Explain this concept simply', 'Give me an example', 'What should I know next?'].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      className="text-xs bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 text-gray-300 transition-colors text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length > 0 && (
            <div className="px-4 pb-1">
              <button onClick={clearChat} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                Clear chat
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="p-3 border-t border-gray-800 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this lesson..."
              disabled={asking}
              className="flex-1 bg-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 placeholder-gray-600"
            />
            <button
              type="submit"
              disabled={asking || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl px-3 py-2 transition-colors"
              aria-label="Send"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </>
      )}

      {/* Summary Tab */}
      {tab === 'summary' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
          <div className="text-sm text-gray-400">
            Generate an AI summary of <span className="text-white font-medium">"{lessonTitle}"</span>.
          </div>

          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            {summarizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Summarizing...
              </>
            ) : (
              <>✨ Summarize Lesson</>
            )}
          </button>

          {summarizeError && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 text-sm text-red-300">
              {summarizeError}
            </div>
          )}

          {summary && (
            <div className="bg-gray-800 rounded-xl p-4 text-sm text-gray-200 leading-relaxed space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Summary</span>
                <button onClick={clearSummary} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                  Clear
                </button>
              </div>
              <p>{summary}</p>
            </div>
          )}

          {!summary && !summarizing && !summarizeError && (
            <div className="text-center text-gray-600 text-sm mt-4">
              <p className="text-3xl mb-2">📝</p>
              <p>Click the button above to get an AI-generated summary of this lesson.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
