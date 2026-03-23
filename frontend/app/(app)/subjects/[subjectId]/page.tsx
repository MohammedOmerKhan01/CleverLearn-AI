'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

interface Subject {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
}

interface Progress {
  total: number;
  completed: number;
  percentage: number;
}

export default function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isInitialized || !user) return;
    Promise.all([
      api.get(`/api/subjects/${subjectId}`),
      api.get(`/api/progress/subjects/${subjectId}`),
    ])
      .then(([subjectRes, progressRes]) => {
        setSubject(subjectRes.data.subject);
        setProgress(progressRes.data.progress);
      })
      .catch(() => router.push('/subjects'))
      .finally(() => setLoading(false));
  }, [subjectId, router, isInitialized, user]);

  async function startLearning() {
    try {
      const { data } = await api.get(`/api/subjects/${subjectId}/first-video`);
      router.push(`/learn/${subjectId}?videoId=${data.video.id}`);
    } catch {
      router.push('/subjects');
    }
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : subject ? (
          <>
            <Link href="/subjects" className="text-sm text-gray-500 hover:text-gray-300 mb-6 inline-block">← Back to subjects</Link>
            {subject.thumbnail_url && (
              <img src={subject.thumbnail_url} alt={subject.title} className="w-full h-56 object-cover rounded-xl mb-6" />
            )}
            <h1 className="text-3xl font-bold mb-3">{subject.title}</h1>
            {subject.description && <p className="text-gray-400 mb-6">{subject.description}</p>}

            {progress && (
              <div className="bg-gray-900 rounded-xl p-4 mb-6">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{progress.completed}/{progress.total} videos</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{progress.percentage}% complete</p>
              </div>
            )}

            <button
              onClick={startLearning}
              className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              {progress && progress.completed > 0 ? 'Continue Learning' : 'Start Learning'}
            </button>
          </>
        ) : null}
      </main>
    </ProtectedRoute>
  );
}
