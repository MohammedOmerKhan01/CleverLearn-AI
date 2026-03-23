'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { VideoPlayer } from '@/components/VideoPlayer';
import { CourseSidebar } from '@/components/CourseSidebar';
import { AiPanel } from '@/components/AiPanel';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useVideoStore } from '@/stores/videoStore';
import { useAiStore } from '@/stores/aiStore';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

interface VideoData {
  id: string;
  title: string;
  youtube_id: string;
  duration_seconds: number;
  section_id: string;
}

interface ProgressData {
  watched_seconds: number;
  is_completed: boolean;
}

export default function LearnPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get('videoId');

  const [video, setVideo] = useState<VideoData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nextVideoId, setNextVideoId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const { loadTree, loadProgress } = useSidebarStore();
  const { setCurrentVideo } = useVideoStore();
  const { clearChat, clearSummary } = useAiStore();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isInitialized || !user) return;
    loadTree(subjectId);
    loadProgress(subjectId);
  }, [subjectId, loadTree, loadProgress, isInitialized, user]);

  // Reset AI state when video changes
  useEffect(() => {
    clearChat();
    clearSummary();
  }, [videoId, clearChat, clearSummary]);

  useEffect(() => {
    if (!isInitialized || !user) return;
    if (!videoId) {
      api.get(`/api/subjects/${subjectId}/first-video`)
        .then(({ data }) => router.replace(`/learn/${subjectId}?videoId=${data.video.id}`))
        .catch(() => router.push('/subjects'));
      return;
    }

    setLoading(true);
    setLocked(false);
    setNextVideoId(null);

    Promise.all([
      api.get(`/api/videos/${videoId}`),
      api.get(`/api/progress/videos/${videoId}`),
    ])
      .then(([videoRes, progressRes]) => {
        setVideo(videoRes.data.video);
        setProgress(progressRes.data.progress);
        setCurrentVideo(videoId);
      })
      .catch((err) => {
        if (err?.response?.status === 403) setLocked(true);
        else router.push('/subjects');
      })
      .finally(() => setLoading(false));
  }, [videoId, subjectId, router, setCurrentVideo, isInitialized, user]);

  const handleComplete = useCallback(async () => {
    if (!videoId) return;
    await loadProgress(subjectId);
    const tree = useSidebarStore.getState().tree;
    if (!tree) return;
    const allVideos = tree.sections.flatMap((s) => s.videos);
    const idx = allVideos.findIndex((v) => v.id === videoId);
    const next = allVideos[idx + 1];
    if (next) setNextVideoId(next.id);
  }, [videoId, subjectId, loadProgress]);

  function goToNext() {
    if (nextVideoId) {
      router.push(`/learn/${subjectId}?videoId=${nextVideoId}`);
      setNextVideoId(null);
    }
  }

  // Lesson context for AI — use title as minimal context (can be extended with transcripts)
  const lessonContext = video
    ? `Lesson: ${video.title}. This is a video lesson in an online course.`
    : undefined;

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <CourseSidebar subjectId={subjectId} currentVideoId={videoId || ''} />

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6 min-w-0">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : locked ? (
              <div className="max-w-xl mx-auto mt-20 text-center bg-gray-900 rounded-2xl p-10">
                <div className="text-5xl mb-4">🔒</div>
                <h2 className="text-xl font-semibold mb-2">Lesson Locked</h2>
                <p className="text-gray-400">Complete the previous lesson to unlock this video.</p>
              </div>
            ) : video ? (
              <div className="max-w-4xl mx-auto">
                {/* Title + AI toggle */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h1 className="text-xl font-semibold">{video.title}</h1>
                  <button
                    onClick={() => setAiOpen((v) => !v)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border
                      ${aiOpen
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-indigo-500 hover:text-white'
                      }`}
                  >
                    🤖 Ask AI
                  </button>
                </div>

                <VideoPlayer
                  key={video.id}
                  videoId={video.id}
                  youtubeId={video.youtube_id}
                  startTime={progress?.watched_seconds || 0}
                  onProgress={(t) => useVideoStore.getState().setCurrentTime(t)}
                  onComplete={handleComplete}
                />

                {nextVideoId && (
                  <div className="mt-6 bg-indigo-900/30 border border-indigo-700 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-sm text-indigo-300">Lesson complete! Ready for the next one?</p>
                    <button
                      onClick={goToNext}
                      className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Next Lesson →
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </main>

          {/* AI Panel — slides in from right */}
          {aiOpen && video && (
            <div className="w-80 shrink-0 flex flex-col overflow-hidden border-l border-gray-800">
              <AiPanel lessonTitle={video.title} lessonContext={lessonContext} />
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
