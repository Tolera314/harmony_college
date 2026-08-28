import { GraduationCap } from 'lucide-react';
import React from 'react';

export default function WelcomeLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0F0F10] text-white">
      <div className="relative flex flex-col items-center gap-6 p-8">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl border border-[#D4AF37]/30 bg-white/5 flex items-center justify-center shadow-2xl backdrop-blur-xl animate-pulse">
            <GraduationCap className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="font-serif text-xl font-medium tracking-wide text-white">Harmony College</h2>
          <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Loading Student Portal...</p>
        </div>
      </div>
    </div>
  );
}
