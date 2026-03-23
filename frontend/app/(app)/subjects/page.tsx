'use client';
import { useEffect, useState } from 'react';
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

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Only fetch once auth is confirmed
    if (!isInitialized || !user) return;

    api.get('/api/subjects')
      .then(({ data }) => setSubjects(data.subjects))
      .catch(() => setError('Failed to load subjects'))
      .finally(() => setLoading(false));
  }, [isInitialized, user]);

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">All Subjects</h1>
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && <p className="text-red-400">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <Link key={subject.id} href={`/subjects/${subject.id}`}
              className="bg-gray-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all group">
              <div className="h-40 bg-gray-800 flex items-center justify-center overflow-hidden">
                {subject.thumbnail_url ? (
                  <img src={subject.thumbnail_url} alt={subject.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">📚</span>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-lg group-hover:text-indigo-400 transition-colors">{subject.title}</h2>
                {subject.description && (
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{subject.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </ProtectedRoute>
  );
}
