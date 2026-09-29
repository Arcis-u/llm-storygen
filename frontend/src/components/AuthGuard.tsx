"use client";
import { useEffect, useSyncExternalStore } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
const subscribe = (callback: () => void) => useAuthStore.persist.onFinishHydration(callback);
export default function AuthGuard({ children }: {children:React.ReactNode}) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore(s => s.token);
  const hydrated = useSyncExternalStore(subscribe, () => useAuthStore.persist.hasHydrated(), () => false);
  const isPublic = ['/', '/login', '/status'].includes(pathname);
  useEffect(() => {
    if (!hydrated) return;
    if (!isPublic && !token) router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
    else if (pathname === '/login' && token) {
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/dashboard');
    }
  }, [hydrated, isPublic, token, pathname, router]);
  if (!hydrated || (!isPublic && !token)) return <div className="cyber-empty" role="status">Đang xác thực kết nối Nexus…</div>;
  return <>{children}</>;
}
