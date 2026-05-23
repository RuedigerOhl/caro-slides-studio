'use client';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function Header({ email }: { email?: string }) {
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
            powered by Rübibär
          </span>
          <span className="text-lg font-light text-stone-900">Caros Slide Studio</span>
        </Link>
        {email && (
          <div className="flex items-center gap-4 text-sm text-stone-600">
            <span>{email}</span>
            <button
              onClick={logout}
              className="rounded-full border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
