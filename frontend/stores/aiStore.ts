import { create } from 'zustand';
import api from '@/lib/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AiState {
  // Summarize
  summary: string | null;
  summarizing: boolean;
  summarizeError: string | null;

  // Chat / Ask
  messages: ChatMessage[];
  asking: boolean;
  askError: string | null;

  summarizeLesson: (text: string) => Promise<void>;
  askQuestion: (question: string, context?: string, lessonTitle?: string) => Promise<void>;
  clearSummary: () => void;
  clearChat: () => void;
}

export const useAiStore = create<AiState>((set, get) => ({
  summary: null,
  summarizing: false,
  summarizeError: null,
  messages: [],
  asking: false,
  askError: null,

  summarizeLesson: async (text) => {
    set({ summarizing: true, summarizeError: null, summary: null });
    try {
      const { data } = await api.post('/api/ai/summarize', { text });
      set({ summary: data.summary });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      set({ summarizeError: msg || 'Failed to summarize. Try again.' });
    } finally {
      set({ summarizing: false });
    }
  },

  askQuestion: async (question, context, lessonTitle) => {
    set({ asking: true, askError: null });
    // Optimistically add user message
    set((s) => ({ messages: [...s.messages, { role: 'user', content: question }] }));
    try {
      const { data } = await api.post('/api/ai/ask', { question, context, lessonTitle });
      const reply = data.answer ?? data.reply ?? 'No response.';
      set((s) => ({ messages: [...s.messages, { role: 'assistant', content: reply }] }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      const errMsg = msg || 'Failed to get a response. Try again.';
      set((s) => ({
        messages: [...s.messages, { role: 'assistant', content: `⚠️ ${errMsg}` }],
        askError: errMsg,
      }));
    } finally {
      set({ asking: false });
    }
  },

  clearSummary: () => set({ summary: null, summarizeError: null }),
  clearChat: () => set({ messages: [], askError: null }),
}));
