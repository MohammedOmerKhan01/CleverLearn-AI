'use client';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    refreshSession();
  }, [refreshSession]);

  return <>{children}</>;
}
