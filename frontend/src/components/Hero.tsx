import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Trophy, BookOpen, GraduationCap } from 'lucide-react';
import { useTheme } from '../lib/useTheme';

export default function Hero() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

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
        <div className="absolute inset-0 hero-overlay-dark z-10" />
        <div
          className="absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(to top, var(--bg-base) 0%, transparent 40%, var(--overlay-hero-from) 100%, transparent 60%)',
          }}
        />
        <Image
          fill
          priority
          className={`object-cover transition-all duration-500 ${
            isLight
              ? 'brightness-[0.75] contrast-[1.0] saturate-[0.9]'
              : 'brightness-[0.45] contrast-[1.05]'
          }`}
          alt="Harmony College Campus"
          src={isLight ? '/library.png' : '/hero.png'}
          sizes="100vw"
        />
      </div>

      <div className="relative z-20 w-full px-6 sm:px-12 max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center py-16">
        {/* Hero Headline and Call to Action */}
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md" style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-default)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#E9C349] animate-pulse" />
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[#E9C349]">
              Est. 2015 • Sheger, Burayu, Ethiopia
            </span>
          </div>

          <h1 className={`font-serif text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight ${isLight ? 'text-[#111111]' : 'text-white'}`}>
            Nurturing Creative <br />
            <span className="text-[#E9C349] italic font-medium serif relative inline-block">
              Talent
              <span className="absolute bottom-2 left-0 w-full h-[3px] bg-[#E9C349]/20 rounded-full" />
            </span>{' '}
            Through Practice
          </h1>

          <p className="font-sans text-sm sm:text-base md:text-lg max-w-xl leading-relaxed text-white/75">
            Fostering a community of artists, creators, and professionals. Join Harmony College and transform your passion into a rewarding career in the creative and digital industries.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/apply"
              className="bg-[#E9C349] text-black px-8 py-4 rounded-full text-xs font-mono font-bold uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#E9C349]/20 cursor-pointer inline-flex"
            >
              Apply Now <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={handleScrollToPrograms}
              className="border border-white/30 text-white px-8 py-4 rounded-full text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer hover:bg-white/10"
            >
              Explore Programs
            </button>
          </div>
        </div>

        {/* Logo Showcase Card (Right side) */}
        <div className="lg:col-span-5 flex justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative w-full max-w-sm rounded-3xl border backdrop-blur-xl overflow-hidden shadow-2xl group"
            style={{ backgroundColor: 'var(--bg-glass)', borderColor: 'var(--border-default)' }}
          >
            {/* Glow */}
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#E9C349]/15 rounded-full blur-3xl group-hover:bg-[#E9C349]/25 transition-all duration-700 pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-36 h-36 bg-[#E9C349]/8 rounded-full blur-2xl pointer-events-none" />

            {/* Full logo image */}
            <div className="relative w-full aspect-square overflow-hidden">
              <img
                src="/logo1.jpg"
                alt="Harmony College — Number 1 Choice for Knowledge"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              {/* Subtle bottom fade into card */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            {/* Tagline strip */}
            <div className="relative px-6 py-5 space-y-2">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9C349]/15 border border-[#E9C349]/30">
                <Trophy className="w-3.5 h-3.5 text-[#E9C349]" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#E9C349]">
                  Harmony College
                </span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-extrabold text-white leading-tight">
                Number 1 Choice<br />
                <span className="text-[#E9C349] italic">for Knowledge</span>
              </h3>

              <p className="font-sans text-xs text-white/55 leading-relaxed">
                Sheger, Burayu, Ethiopia — Est. 2015
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
