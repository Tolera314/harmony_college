'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Play, Clock, Users, BookOpen, FileDown, Package, Award, ChevronRight } from 'lucide-react';
import { Badge } from '@/src/components/ui/Badge';
import { StarRating, PriceTag, WishlistButton, BuyButton, TypeIcon } from './MarketplaceShared';
import { useMarketplace } from '@/src/context/MarketplaceContext';
import type { Book, Video, Course, Resource, Bundle } from '@/src/data/marketplace';

// ── Book Card ─────────────────────────────────────────────────────────────────
export function BookCard({ book }: { book: Book }) {
  const { navigate, isOwned } = useMarketplace();
  const owned = isOwned(book.id);
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={() => navigate('books', book.id)}
      className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      {/* Cover */}
      <div className="relative h-52 overflow-hidden shrink-0">
        <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,15,16,0.85) 0%, transparent 60%)' }} />
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {book.isBestseller && <Badge variant="gold" className="text-[9px]">Bestseller</Badge>}
          {book.isNew && <Badge variant="info" className="text-[9px]">New</Badge>}
          {owned && <Badge variant="success" className="text-[9px]">Owned</Badge>}
        </div>
        <WishlistButton id={book.id} className="absolute top-3 right-3" />
        <div className="absolute bottom-3 left-3">
          <PriceTag price={book.price} originalPrice={book.originalPrice} isFree={book.isFree} size="sm" />
        </div>
      </div>
      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--brand-gold)' }}>{book.category}</p>
          <h3 className="font-serif text-sm font-bold line-clamp-2 leading-snug" style={{ color: 'var(--text-primary)' }}>{book.title}</h3>
          <p className="text-[11px] font-sans mt-1" style={{ color: 'var(--text-muted)' }}>{book.author}</p>
        </div>
        <StarRating rating={book.rating} count={book.reviewCount} size="xs" />
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{book.pages} pages · {book.language}</span>
          <BuyButton item={book} size="xs" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Video Card ────────────────────────────────────────────────────────────────
export function VideoCard({ video }: { video: Video }) {
  const { navigate, isOwned } = useMarketplace();
  const owned = isOwned(video.id);
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={() => navigate('videos', video.id)}
      className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden shrink-0">
        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(233,195,73,0.9)' }}>
            <Play className="w-5 h-5 text-black ml-0.5" />
          </div>
        </div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,15,16,0.7) 0%, transparent 50%)' }} />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {video.isBestseller && <Badge variant="gold" className="text-[9px]">Bestseller</Badge>}
          {video.isNew && <Badge variant="info" className="text-[9px]">New</Badge>}
          {owned && <Badge variant="success" className="text-[9px]">Owned</Badge>}
        </div>
        <WishlistButton id={video.id} className="absolute top-3 right-3" />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-white/70" />
          <span className="text-[10px] font-mono text-white/70">{video.duration}</span>
        </div>
      </div>
      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--brand-gold)' }}>{video.category}</p>
        <h3 className="font-serif text-sm font-bold line-clamp-2 leading-snug" style={{ color: 'var(--text-primary)' }}>{video.title}</h3>
        <p className="text-[11px] font-sans" style={{ color: 'var(--text-muted)' }}>{video.instructor}</p>
        <StarRating rating={video.rating} count={video.reviewCount} size="xs" />
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <PriceTag price={video.price} originalPrice={video.originalPrice} size="sm" />
          <BuyButton item={video} size="xs" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Course Card ───────────────────────────────────────────────────────────────
export function CourseCard({ course }: { course: Course }) {
  const { navigate, isOwned } = useMarketplace();
  const owned = isOwned(course.id);
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={() => navigate('courses', course.id)}
      className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      <div className="relative h-40 overflow-hidden shrink-0">
        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,15,16,0.8) 0%, transparent 55%)' }} />
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {course.isBestseller && <Badge variant="gold" className="text-[9px]">Bestseller</Badge>}
          {course.hasCertificate && <Badge variant="emerald" className="text-[9px]">Certificate</Badge>}
          {owned && <Badge variant="success" className="text-[9px]">Enrolled</Badge>}
        </div>
        <WishlistButton id={course.id} className="absolute top-3 right-3" />
        <div className="absolute bottom-3 left-3 flex items-center gap-3 text-white/70">
          <span className="text-[10px] font-mono flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration}</span>
          <span className="text-[10px] font-mono flex items-center gap-1"><BookOpen className="w-3 h-3" />{course.lessonsCount} lessons</span>
        </div>
      </div>
      <div className="flex flex-col flex-1 p-4 gap-2">
        <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--brand-gold)' }}>{course.category}</p>
        <h3 className="font-serif text-sm font-bold line-clamp-2 leading-snug" style={{ color: 'var(--text-primary)' }}>{course.title}</h3>
        <div className="flex items-center gap-2">
          <img src={course.instructorAvatar} alt={course.instructor} className="w-5 h-5 rounded-full object-cover" />
          <p className="text-[11px] font-sans" style={{ color: 'var(--text-muted)' }}>{course.instructor}</p>
        </div>
        <div className="flex items-center gap-3">
          <StarRating rating={course.rating} count={course.reviewCount} size="xs" />
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}><Users className="w-3 h-3 inline mr-0.5" />{course.studentsCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <PriceTag price={course.price} originalPrice={course.originalPrice} size="sm" />
          <BuyButton item={course} size="xs" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Resource Card ─────────────────────────────────────────────────────────────
export function ResourceCard({ resource }: { resource: Resource }) {
  const { navigate, isOwned } = useMarketplace();
  const owned = isOwned(resource.id);
  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={() => navigate('resources', resource.id)}
      className="group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
        <img src={resource.thumbnail} alt={resource.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: 'var(--hover-overlay)', color: 'var(--brand-gold)' }}>{resource.fileType}</span>
          {resource.isNew && <Badge variant="info" className="text-[9px]">New</Badge>}
          {resource.isFree && <Badge variant="success" className="text-[9px]">Free</Badge>}
          {owned && <Badge variant="success" className="text-[9px]">Owned</Badge>}
        </div>
        <h3 className="font-sans text-sm font-semibold line-clamp-1" style={{ color: 'var(--text-primary)' }}>{resource.title}</h3>
        <p className="text-[11px] font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>{resource.author} · {resource.fileSize}</p>
        <StarRating rating={resource.rating} count={resource.reviewCount} size="xs" />
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <PriceTag price={resource.price} originalPrice={resource.originalPrice} isFree={resource.isFree} size="sm" />
        <BuyButton item={resource} size="xs" />
      </div>
    </motion.div>
  );
}

// ── Bundle Card ───────────────────────────────────────────────────────────────
export function BundleCard({ bundle }: { bundle: Bundle }) {
  const { navigate } = useMarketplace();
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={() => navigate('bundles', bundle.id)}
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-gold-border)' }}
    >
      <div className="relative h-44 overflow-hidden">
        <img src={bundle.thumbnail} alt={bundle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,15,16,0.9) 0%, transparent 60%)' }} />
        <div className="absolute top-3 left-3">
          {bundle.isPopular && <Badge variant="gold" className="text-[9px]">🔥 Popular</Badge>}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-base font-black" style={{ color: 'var(--brand-gold)' }}>ETB {bundle.bundlePrice.toLocaleString()}</span>
            <span className="font-mono text-xs line-through text-white/50">ETB {bundle.originalPrice.toLocaleString()}</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)' }}>Save {bundle.savingsPct}%</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-serif text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{bundle.title}</h3>
        <p className="text-xs font-sans line-clamp-2 mb-3" style={{ color: 'var(--text-muted)' }}>{bundle.description}</p>
        <div className="flex items-center gap-2 text-[10px] font-mono mb-3" style={{ color: 'var(--text-faint)' }}>
          <Package className="w-3 h-3" />
          <span>{bundle.items.length} resources included</span>
          <span>·</span>
          <Users className="w-3 h-3" />
          <span>{bundle.studentsCount.toLocaleString()} students</span>
        </div>
        <div className="flex items-center justify-between">
          <StarRating rating={bundle.rating} size="xs" />
          <button className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--brand-gold)' }}>
            View Bundle <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
