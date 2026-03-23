'use client';
/// <reference types="youtube" />
import { useEffect, useRef, useCallback, useState } from 'react';
import api from '@/lib/api';
import { useVideoStore } from '@/stores/videoStore';
import { useSidebarStore } from '@/stores/sidebarStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoPlayerProps {
  /** LMS video record ID — used for progress API calls */
  videoId: string;
  /** YouTube video ID (e.g. "dQw4w9WgXcQ") */
  youtubeId: string;
  /** Resume position in seconds */
  startTime?: number;
  /** Called every 5 s with current playback position */
  onProgress?: (currentTime: number) => void;
  /** Called once when the video reaches the end */
  onComplete?: () => void;
}

type PlayerStatus = 'loading' | 'ready' | 'error';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

// ─── Debounce helper ──────────────────────────────────────────────────────────

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoPlayer({
  videoId,
  youtubeId,
  startTime = 0,
  onProgress,
  onComplete,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  const currentTimeRef = useRef(startTime);
  const durationRef = useRef(0);

  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [displayTime, setDisplayTime] = useState(startTime);
  const [duration, setDuration] = useState(0);

  const { setCurrentTime, setCompleted } = useVideoStore();
  const { markCompleted } = useSidebarStore();

  // ── Debounced API save (300 ms) ──────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveProgress = useCallback(
    debounce(async (seconds: number, isCompleted: boolean) => {
      try {
        await api.post(`/api/progress/videos/${videoId}`, {
          watchedSeconds: Math.floor(seconds),
          isCompleted,
        });
      } catch {
        // non-fatal — will retry on next tick
      }
    }, 300),
    [videoId]
  );

  // ── Flush progress immediately (pause / unmount) ─────────────────────────
  const flushProgress = useCallback(
    async (isCompleted = false) => {
      const t = currentTimeRef.current;
      try {
        await api.post(`/api/progress/videos/${videoId}`, {
          watchedSeconds: Math.floor(t),
          isCompleted,
        });
      } catch {
        // non-fatal
      }
    },
    [videoId]
  );

  // ── Handle video end ─────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    markCompleted(videoId);
    await flushProgress(true);
    onComplete?.();
  }, [videoId, onComplete, flushProgress, setCompleted, markCompleted]);

  // ── Start 5-second progress tick ─────────────────────────────────────────
  const startTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;
      const t = player.getCurrentTime();
      const dur = player.getDuration?.() ?? 0;
      currentTimeRef.current = t;
      durationRef.current = dur;
      setDisplayTime(t);
      if (dur > 0) setDuration(dur);
      setCurrentTime(t);
      onProgress?.(t);
      saveProgress(t, false);
    }, 5000);
  }, [onProgress, saveProgress, setCurrentTime]);

  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  // ── Init / destroy player ────────────────────────────────────────────────
  useEffect(() => {
    completedRef.current = false;
    currentTimeRef.current = startTime;
    setStatus('loading');
    setDisplayTime(startTime);
    setDuration(0);

    function buildPlayer() {
      if (!containerRef.current) return;

      // Destroy previous instance if re-mounting on same DOM node
      try { playerRef.current?.destroy(); } catch { /* ignore */ }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: youtubeId,
        playerVars: {
          start: Math.floor(startTime),
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 1,
        },
        events: {
          onReady: (e: YT.PlayerEvent) => {
            setStatus('ready');
            const dur = e.target.getDuration?.() ?? 0;
            if (dur > 0) setDuration(dur);
          },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) {
              startTick();
            } else if (e.data === S.PAUSED) {
              stopTick();
              flushProgress(false);
            } else if (e.data === S.ENDED) {
              stopTick();
              handleComplete();
            }
          },
          onError: () => {
            stopTick();
            setStatus('error');
          },
        },
      });
    }

    if (window.YT?.Player) {
      buildPlayer();
    } else {
      // Queue callback — multiple components share one script tag
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        buildPlayer();
      };
      if (!document.getElementById('yt-iframe-api')) {
        const s = document.createElement('script');
        s.id = 'yt-iframe-api';
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
    }

    return () => {
      stopTick();
      // Save on unmount (fire-and-forget)
      flushProgress(false);
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, youtubeId]);

  // ── Progress bar values ──────────────────────────────────────────────────
  const pct = duration > 0 ? Math.min((displayTime / duration) * 100, 100) : 0;
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full rounded-xl overflow-hidden bg-black shadow-2xl">
      {/* Player area */}
      <div className="relative w-full aspect-video bg-black">
        {/* YouTube iframe mounts here */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* Loading overlay */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Loading video…</span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
            <div className="text-center px-6">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-white font-medium mb-1">Video unavailable</p>
              <p className="text-sm text-gray-400">
                This video could not be loaded. It may have been removed or made private.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar + time */}
      <div className="bg-gray-900 px-4 py-2.5">
        {/* Bar */}
        <div className="h-1 bg-gray-700 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Time labels */}
        <div className="flex justify-between text-xs text-gray-500 select-none">
          <span>{fmt(displayTime)}</span>
          {duration > 0 && <span>{fmt(duration)}</span>}
        </div>
      </div>
    </div>
  );
}
