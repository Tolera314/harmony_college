import React from 'react';
import { motion } from 'motion/react';
import { Send, ArrowRight } from 'lucide-react';

interface CTAProps {
  onOpenApply: () => void;
  onOpenContact: () => void;
}

export default function CTA({ onOpenApply, onOpenContact }: CTAProps) {
  return (
    <section className="relative py-28 bg-[#0E0E0E] overflow-hidden border-t border-white/5">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#E9C349]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full px-6 sm:px-12 max-w-5xl mx-auto text-center relative z-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <span className="text-[#E9C349] font-sans text-[10px] font-bold uppercase tracking-[0.25em] block">
            Admissions Open for 2025/2026
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1]">
            Your Creative Future <span className="text-[#E9C349] italic font-medium">Starts</span> Here
          </h2>
          <p className="font-sans text-sm sm:text-base text-gray-400 max-w-lg mx-auto leading-relaxed">
            Harmony College is now enrolling. Take the first step toward a professional career in photography, music, design, film, journalism, IT, or languages.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-4 pt-4"
        >
          <button
            onClick={onOpenApply}
            className="bg-[#E9C349] text-black px-8 py-4 rounded-full text-xs font-mono font-bold uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3 shadow-lg shadow-[#E9C349]/20 cursor-pointer"
          >
            Apply Now <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={onOpenContact}
            className="border border-white/20 text-white hover:bg-white/10 px-8 py-4 rounded-full text-xs font-mono font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
          >
            Contact Admissions <Send className="w-4 h-4 text-[#E9C349]" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
