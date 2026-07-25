'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the correct dashboard location
    router.replace('/dashboard/admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-white/60 uppercase tracking-widest font-mono">Redirecting to Admin Portal...</p>
      </div>
    </div>
  );
}
