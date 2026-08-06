'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Zap, BookOpen, Play, Package, Star } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { SectionHeader } from './MarketplaceShared';
import { BookCard } from './ProductCards';
import { VideoCard } from './ProductCards';
import { CourseCard } from './ProductCards';
import { BundleCard } from './ProductCards';
import { useMarketplace } from '@/src/context/MarketplaceContext';
import {
  BOOKS, VIDEOS, COURSES, BUNDLES, CATEGORIES,
  BESTSELLER_IDS, NEW_RELEASE_IDS, FEATURED_IDS,
} from '@/src/data/marketplace';
import type { Category } from '@/src/data/marketplace';

const CATEGORY_ICONS: Partial<Record<Category, string>> = {
  'Photography': '📸', 'Music Production': '🎵', 'Graphic Design': '🎨',
  'Digital Marketing': '📊', 'Filmmaking': '🎬', 'IT & Technology': '💻',
  'Languages': '🌍', 'Pharmacy & Health': '💊', 'Journalism': '📰',
  'Vocal Arts': '🎤', 'Business': '💼', 'Videography': '🎥',
};

export function HomeView() {
  const { navigate } = useMarketplace();
  const featured   = COURSES.filter(c => FEATURED_IDS.includes(c.id));
  const bestsellers = BOOKS.filter(b => BESTSELLER_IDS.includes(b.id)).slice(0, 4);
  const newVideos  = VIDEOS.filter(v => NEW_RELEASE_IDS.includes(v.id) || v.isNew).slice(0, 3);
  const topCourses = COURSES.slice(0, 3);
  const topBundles = BUNDLES.slice(0, 3);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-14 max-w-6xl">

      {/* ── Hero Banner ── */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden min-h-[280px] sm:min-h-[340px] flex items-end"
          style={{ background: 'linear-gradient(135deg, #0f0f10 0%, #1a1a1d 100%)' }}
        >
          {/* bg image */}
          <div className="absolute inset-0">
            <img src="/exhibition.png" alt="" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(15,15,16,0.95) 0%, rgba(15,15,16,0.5) 100%)' }} />
          </div>
          {/* Gold glow */}
          <div className="absolute top-0 right-0 w-2/3 h-full rounded-full blur-[120px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(233,195,73,0.12) 0%, transparent 70%)' }} />

          <div className="relative z-10 p-8 sm:p-12 w-full">
            <div className="max-w-xl">
              <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4" style={{ color: 'var(--brand-gold)', border: '1px solid var(--accent-gold-border)', backgroundColor: 'var(--accent-gold-subtle)' }}>
                Harmony Learning Marketplace
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-3">
                Unlock Your Creative Potential
              </h1>
              <p className="text-sm sm:text-base font-sans mb-7 max-w-md" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Premium books, video courses, and resources curated by Harmony College faculty — for students ready to go further.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="gold" size="lg" onClick={() => navigate('courses')} icon={<ArrowRight className="w-4 h-4" />}>
                  Browse Courses
                </Button>
                <Button variant="secondary" size="lg" onClick={() => navigate('bundles')} icon={<Package className="w-4 h-4" />}>
                  View Bundles
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-6">
                {[{ v: '500+', l: 'Resources' }, { v: '4.8★', l: 'Avg Rating' }, { v: '2,400+', l: 'Students' }].map(s => (
                  <div key={s.l}>
                    <p className="font-mono text-base font-black" style={{ color: 'var(--brand-gold)' }}>{s.v}</p>
                    <p className="text-[10px] font-sans uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Categories ── */}
      <section>
        <SectionHeader title="Browse by Category" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat, idx) => (
            <motion.button key={cat}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate('search')}
              className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl transition-all"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <span className="text-2xl">{CATEGORY_ICONS[cat] ?? '📚'}</span>
              <span className="text-[10px] font-sans font-semibold text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>{cat}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── Featured Courses ── */}
      <section>
        <SectionHeader label="Diploma Prep" title="Featured Courses" action={{ text: 'All Courses', onClick: () => navigate('courses') }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {topCourses.map(c => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      {/* ── Special offer banner ── */}
      <section>
        <motion.div whileHover={{ scale: 1.005 }}
          onClick={() => navigate('bundles')}
          className="relative rounded-2xl overflow-hidden cursor-pointer p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
          style={{ background: 'linear-gradient(135deg, rgba(233,195,73,0.15) 0%, rgba(233,195,73,0.04) 100%)', border: '1px solid var(--accent-gold-border)' }}>
          <div className="flex-1">
            <Badge variant="gold" className="mb-3">Limited Offer</Badge>
            <h3 className="font-serif text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Save up to 37% with Learning Bundles
            </h3>
            <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>
              Combine books, videos and courses for your program — one price, everything you need.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="text-5xl">🎁</div>
            <Button variant="gold" size="md" icon={<ArrowRight className="w-4 h-4" />}>View Bundles</Button>
          </div>
        </motion.div>
      </section>

      {/* ── Bestselling Books ── */}
      <section>
        <SectionHeader label="Top Rated" title="Bestselling Books" action={{ text: 'All Books', onClick: () => navigate('books') }} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {bestsellers.map(b => <BookCard key={b.id} book={b} />)}
        </div>
      </section>

      {/* ── Trending Videos ── */}
      <section>
        <SectionHeader label="Hot Right Now" title="Trending Videos" action={{ text: 'All Videos', onClick: () => navigate('videos') }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {newVideos.map(v => <VideoCard key={v.id} video={v} />)}
        </div>
      </section>

      {/* ── Bundles ── */}
      <section>
        <SectionHeader label="Best Value" title="Learning Bundles" action={{ text: 'All Bundles', onClick: () => navigate('bundles') }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {topBundles.map(b => <BundleCard key={b.id} bundle={b} />)}
        </div>
      </section>
    </div>
  );
}
