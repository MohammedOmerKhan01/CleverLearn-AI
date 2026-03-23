import { create } from 'zustand';
import api from '@/lib/api';

export interface VideoItem {
  id: string;
  title: string;
  youtube_id: string;
  duration_seconds: number;
  order_index: number;
  is_completed?: boolean;
  watched_seconds?: number;
}

export interface SectionItem {
  id: string;
  title: string;
  order_index: number;
  videos: VideoItem[];
}

export interface SubjectTree {
  id: string;
  title: string;
  sections: SectionItem[];
}

interface SidebarState {
  tree: SubjectTree | null;
  completionMap: Record<string, boolean>; // videoId -> completed
  isLoading: boolean;
  loadTree: (subjectId: string) => Promise<void>;
  loadProgress: (subjectId: string) => Promise<void>;
  markCompleted: (videoId: string) => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  tree: null,
  completionMap: {},
  isLoading: false,

  loadTree: async (subjectId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/api/subjects/${subjectId}/tree`);
      set({ tree: data.subject });
    } finally {
      set({ isLoading: false });
    }
  },

  loadProgress: async (subjectId) => {
    try {
      const { data } = await api.get(`/api/progress/subjects/${subjectId}`);
      const map: Record<string, boolean> = {};
      for (const v of data.progress.videos) {
        map[v.video_id] = Boolean(v.is_completed);
      }
      set({ completionMap: map });
      // Also refresh tree so lock status fields update
      const treeData = await api.get(`/api/subjects/${subjectId}/tree`);
      set({ tree: treeData.data.subject });
    } catch {
      // non-fatal
    }
  },

  markCompleted: (videoId) => {
    set((state) => ({ completionMap: { ...state.completionMap, [videoId]: true } }));
  },
}));
