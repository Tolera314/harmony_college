import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { ArrowRight, Trophy, BookOpen, GraduationCap } from 'lucide-react';

interface HeroProps {
  onOpenApply: () => void;
}

export default function Hero({ onOpenApply }: HeroProps) {
  const handleScrollToPrograms = () => {
    const el = document.getElementById('programs');
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <header id="about" className="relative min-h-screen w-full flex items-center overflow-hidden pt-20">
      {/* Background Cinematic Image with Overlays */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F10] via-[#0F0F10]/50 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F10] via-transparent to-[#0F0F10]/40 z-10" />
        <Image
          fill
          priority
          className="object-cover brightness-[0.45] contrast-[1.05]"
          alt="Harmony College Campus"
          src="/hero.png"
          sizes="100vw"
        />
      </div>

      <div className="relative z-20 w-full px-6 sm:px-12 max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center py-16">
        {/* Hero Headline and Call to Action */}
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] animate-pulse" />
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[#E9C349]">
              Est. 2015 • Sheger, Burayu, Ethiopia
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-white font-extrabold leading-[1.1] tracking-tight">
            Nurturing Creative <br />
            <span className="text-[#E9C349] italic font-medium serif relative inline-block">
              Talent
              <span className="absolute bottom-2 left-0 w-full h-[3px] bg-[#E9C349]/20 rounded-full" />
            </span>{' '}
            Through Practice
          </h1>

          <p className="font-sans text-sm sm:text-base md:text-lg text-gray-300 max-w-xl leading-relaxed">
            Fostering a community of artists, creators, and professionals. Join Harmony College and transform your passion into a rewarding career in the creative and digital industries.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <button
              onClick={onOpenApply}
              className="bg-[#E9C349] text-black px-8 py-4 rounded-full text-xs font-mono font-bold uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3 shadow-lg shadow-[#E9C349]/20 cursor-pointer"
            >
              Apply Now <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleScrollToPrograms}
              className="border border-white/20 text-white hover:bg-white/10 px-8 py-4 rounded-full text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer"
            >
              Explore Programs
            </button>
          </div>
        </div>

        {/* Stats Glass Box Card (Right side) */}
        <div className="lg:col-span-5 flex justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative w-full max-w-sm rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 space-y-6 overflow-hidden shadow-2xl group"
          >
            <div className="absolute -right-16 -top-16 w-36 h-36 bg-[#E9C349]/10 rounded-full blur-3xl group-hover:bg-[#E9C349]/20 transition-all duration-700" />
            
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/5 text-[#E9C349]">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-serif font-extrabold text-[#E9C349]">500+</h4>
                <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Enrolled Students</p>
              </div>
            </div>

            <div className="h-[1px] bg-white/10" />

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/5 text-[#E9C349]">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-serif font-extrabold text-[#E9C349]">10+</h4>
                <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Programs Offered</p>
              </div>
            </div>

            <div className="h-[1px] bg-white/10" />

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/5 text-[#E9C349]">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-serif font-extrabold text-[#E9C349]">90%</h4>
                <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Graduate Employment Rate</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
