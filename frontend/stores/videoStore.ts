import { create } from 'zustand';

interface VideoState {
  currentVideoId: string | null;
  currentTime: number;
  isCompleted: boolean;
  setCurrentVideo: (id: string) => void;
  setCurrentTime: (t: number) => void;
  setCompleted: (v: boolean) => void;
  reset: () => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  currentVideoId: null,
  currentTime: 0,
  isCompleted: false,
  setCurrentVideo: (id) => set({ currentVideoId: id, currentTime: 0, isCompleted: false }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setCompleted: (v) => set({ isCompleted: v }),
  reset: () => set({ currentVideoId: null, currentTime: 0, isCompleted: false }),
}));
