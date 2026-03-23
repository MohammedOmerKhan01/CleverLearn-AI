'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <Link href="/subjects" className="text-lg font-bold text-indigo-400">LMS</Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-gray-400">{user.name}</span>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">
              Logout
            </button>
          </>
        ) : (
          <Link href="/login" className="text-sm text-indigo-400 hover:underline">Sign in</Link>
        )}
      </div>
    </nav>
  );
}
