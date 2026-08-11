'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SectionHeader } from './MarketplaceShared';
import { BookCard, VideoCard, CourseCard, ResourceCard, BundleCard } from './ProductCards';
import { BOOKS, VIDEOS, COURSES, RESOURCES, BUNDLES } from '@/src/data/marketplace';
import type { Category } from '@/src/data/marketplace';

type SortKey = 'popular' | 'newest' | 'price-low' | 'price-high' | 'rating';

interface FilterState {
  category: Category | '';
  priceMin: number;
  priceMax: number;
  freeOnly: boolean;
  sort: SortKey;
}

const DEFAULT_FILTER: FilterState = { category: '', priceMin: 0, priceMax: 99999, freeOnly: false, sort: 'popular' };

export function BooksView() {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  let items = [...BOOKS];
  if (filter.freeOnly) items = items.filter(b => b.isFree || b.price === 0);
  if (filter.category) items = items.filter(b => b.category === filter.category);
  if (filter.sort === 'rating') items.sort((a, b) => b.rating - a.rating);
  if (filter.sort === 'price-low') items.sort((a, b) => a.price - b.price);
  if (filter.sort === 'price-high') items.sort((a, b) => b.price - a.price);
  if (filter.sort === 'newest') items = items.filter(b => b.isNew).concat(items.filter(b => !b.isNew));

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <SectionHeader title="Books" label="Harmony Library" />
          <p className="text-xs font-sans -mt-3" style={{ color: 'var(--text-faint)' }}>{items.length} books available</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter.sort} onChange={e => setFilter(f => ({ ...f, sort: e.target.value as SortKey }))}
            className="text-xs font-sans px-3 py-2 rounded-xl border focus:outline-none appearance-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="rating">Top Rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
          <button onClick={() => setFilter(f => ({ ...f, freeOnly: !f.freeOnly }))}
            className="text-xs font-semibold font-mono px-3 py-2 rounded-xl border transition-all"
            style={{ backgroundColor: filter.freeOnly ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)', borderColor: filter.freeOnly ? 'var(--accent-gold-border)' : 'var(--border-default)', color: filter.freeOnly ? 'var(--brand-gold)' : 'var(--text-muted)' }}>
            Free Only
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((b, idx) => (
          <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
            <BookCard book={b} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function VideosView() {
  const [sort, setSort] = useState<SortKey>('popular');
  let items = [...VIDEOS];
  if (sort === 'rating') items.sort((a, b) => b.rating - a.rating);
  if (sort === 'price-low') items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <SectionHeader title="Videos" label="Premium Masterclasses" />
        <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
          className="text-xs font-sans px-3 py-2 rounded-xl border focus:outline-none appearance-none"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
          <option value="popular">Most Popular</option>
          <option value="rating">Top Rated</option>
          <option value="price-low">Price: Low to High</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((v, idx) => (
          <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
            <VideoCard video={v} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function CoursesView() {
  const [difficulty, setDifficulty] = useState<string>('');
  let items = [...COURSES];
  if (difficulty) items = items.filter(c => c.difficulty === difficulty);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <SectionHeader title="Courses" label="Diploma Preparation" />
        <div className="flex gap-2">
          {['', 'Beginner', 'Intermediate', 'Advanced'].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              className="text-xs font-semibold font-mono px-3 py-1.5 rounded-xl border transition-all"
              style={{ backgroundColor: difficulty === d ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)', borderColor: difficulty === d ? 'var(--accent-gold-border)' : 'var(--border-default)', color: difficulty === d ? 'var(--brand-gold)' : 'var(--text-muted)' }}>
              {d || 'All'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((c, idx) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
            <CourseCard course={c} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function ResourcesView() {
  const [freeOnly, setFreeOnly] = useState(false);
  let items = RESOURCES.filter(r => !freeOnly || r.isFree || r.price === 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <SectionHeader title="Resources" label="Downloadable Assets" />
        <button onClick={() => setFreeOnly(f => !f)}
          className="text-xs font-semibold font-mono px-3 py-2 rounded-xl border transition-all"
          style={{ backgroundColor: freeOnly ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)', borderColor: freeOnly ? 'var(--accent-gold-border)' : 'var(--border-default)', color: freeOnly ? 'var(--brand-gold)' : 'var(--text-muted)' }}>
          Free Only
        </button>
      </div>
      <div className="space-y-3">
        {items.map((r, idx) => (
          <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
            <ResourceCard resource={r} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function BundlesView() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-6xl">
      <SectionHeader label="Best Value Deals" title="Learning Bundles" />
      <p className="text-sm font-sans mb-8 -mt-4" style={{ color: 'var(--text-muted)' }}>
        Combine everything you need for your program — books, videos, and resources at a fraction of the individual price.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {BUNDLES.map((b, idx) => (
          <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}>
            <BundleCard bundle={b} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function SearchView({ query }: { query: string }) {
  const q = query.toLowerCase();
  const allItems = [
    ...BOOKS.filter(b => b.title.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)),
    ...VIDEOS.filter(v => v.title.toLowerCase().includes(q) || v.category.toLowerCase().includes(q) || v.instructor.toLowerCase().includes(q)),
    ...COURSES.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)),
    ...RESOURCES.filter(r => r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)),
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-6xl">
      <SectionHeader title={`Results for "${query}"`} label={`${allItems.length} items found`} />
      {allItems.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="font-serif text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No results found</h3>
          <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>Try different keywords or browse categories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {BOOKS.filter(b => b.title.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)).map(b => <BookCard key={b.id} book={b} />)}
          {VIDEOS.filter(v => v.title.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)).map(v => <VideoCard key={v.id} video={v} />)}
          {COURSES.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)).map(c => <CourseCard key={c.id} course={c} />)}
        </div>
      )}
    </div>
  );
}
