'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ChevronDown, ChevronUp, BookOpen, Play, Clock,
  Users, Award, Check, Lock, FileDown, Package, Globe
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { StarRating, PriceTag, WishlistButton, BuyButton } from './MarketplaceShared';
import { BookCard, VideoCard } from './ProductCards';
import { useMarketplace } from '@/src/context/MarketplaceContext';
import { BOOKS, VIDEOS, COURSES, RESOURCES, BUNDLES } from '@/src/data/marketplace';

// ── Book Detail ───────────────────────────────────────────────────────────────
export function BookDetail({ id }: { id: string }) {
  const { navigate, isOwned } = useMarketplace();
  const book = BOOKS.find(b => b.id === id);
  const [preview, setPreview] = useState(false);
  if (!book) return null;
  const owned = isOwned(id);
  const related = BOOKS.filter(b => b.id !== id && b.category === book.category).slice(0, 4);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-5xl">
      <button onClick={() => navigate('books')} className="flex items-center gap-2 text-sm font-sans mb-6 transition-colors" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-4 h-4" />Back to Books
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Cover */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl overflow-hidden shadow-2xl aspect-[3/4] sticky top-20">
            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
          </div>
        </div>
        {/* Info */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <Badge variant="glass">{book.category}</Badge>
              {book.isBestseller && <Badge variant="gold">Bestseller</Badge>}
              {book.isNew && <Badge variant="info">New</Badge>}
              {owned && <Badge variant="success">Owned</Badge>}
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{book.title}</h1>
            <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>by <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{book.author}</span> · {book.publisher}</p>
          </div>
          <StarRating rating={book.rating} count={book.reviewCount} size="md" />
          <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{book.longDescription}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[{ l: 'Pages', v: book.pages }, { l: 'Language', v: book.language }, { l: 'Published', v: book.publishedDate }, { l: 'ISBN', v: book.isbn }].map(i => (
              <div key={i.l} className="p-3 rounded-xl text-center" style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-faint)' }}>{i.l}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{i.v}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <PriceTag price={book.price} originalPrice={book.originalPrice} isFree={book.isFree} size="lg" />
            <div className="flex gap-2">
              <WishlistButton id={id} />
              {!owned && <Button variant="secondary" size="md" onClick={() => setPreview(true)} icon={<BookOpen className="w-4 h-4" />}>Preview</Button>}
              <BuyButton item={book} size="md" />
            </div>
          </div>
          {/* Table of contents */}
          <div>
            <h3 className="font-serif text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Table of Contents</h3>
            <div className="space-y-1.5">
              {book.tableOfContents.map((ch, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ backgroundColor: 'var(--hover-overlay)' }}>
                  <span className="font-mono text-[10px] w-5 text-center shrink-0" style={{ color: 'var(--text-faint)' }}>{i + 1}</span>
                  <span className="text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>{ch}</span>
                  {i >= 2 && !owned && <Lock className="w-3 h-3 ml-auto shrink-0" style={{ color: 'var(--text-faint)' }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <ReviewsSection reviews={book.reviews} rating={book.rating} count={book.reviewCount} />
      {related.length > 0 && (
        <div className="mt-10">
          <h3 className="font-serif text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Related Books</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map(b => <BookCard key={b.id} book={b} />)}
          </div>
        </div>
      )}

      {/* Book Preview Modal */}
      <BookPreviewModal isOpen={preview} onClose={() => setPreview(false)} book={book} />
    </div>
  );
}

// ── Book Preview Reader ───────────────────────────────────────────────────────
function BookPreviewModal({ isOpen, onClose, book }: { isOpen: boolean; onClose: () => void; book: typeof BOOKS[0] }) {
  const [page, setPage] = useState(1);
  const totalPreviewPages = 5;
  const MOCK_CONTENT = [
    `Welcome to "${book.title}". This comprehensive guide is designed to take you from the very basics through to professional mastery. In this opening chapter, we establish the foundational concepts that will underpin everything that follows throughout the book.`,
    `Chapter 1 begins with a thorough examination of the core principles. Understanding these fundamentals is essential before we can progress to the more advanced techniques covered in later chapters. Take your time with this material — it will pay dividends throughout your career.`,
    `The techniques described in the following pages have been developed and refined through years of professional practice by the author. Each concept is illustrated with practical examples drawn from real-world professional work in Ethiopia and internationally.`,
    `By the end of this preview section, you should have a clear sense of the approach and depth that this book offers. We believe you will find it to be an indispensable resource in your professional library.`,
    `This is the end of the free preview. Purchase the complete book to access all ${book.pages} pages, including detailed exercises, case studies, and professional workflows.`,
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            style={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--border-default)', maxHeight: '85vh' }}>
            {/* Reader header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="font-serif text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{book.title}</p>
                <p className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>Preview — Page {page} of {totalPreviewPages}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="amber" className="text-[10px]">Preview Only</Badge>
                <button onClick={onClose} className="p-2 rounded-xl ds-nav-item" aria-label="Close">✕</button>
              </div>
            </div>
            {/* Page content */}
            <div className="flex-1 overflow-y-auto p-8 font-serif leading-relaxed" style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
              <AnimatePresence mode="wait">
                <motion.p key={page} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  {MOCK_CONTENT[page - 1]}
                </motion.p>
              </AnimatePresence>
            </div>
            {/* Progress bar */}
            <div className="px-6 pb-2">
              <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hover-overlay)' }}>
                <motion.div className="h-full rounded-full" style={{ background: 'var(--brand-gold)' }} animate={{ width: `${(page / totalPreviewPages) * 100}%` }} />
              </div>
            </div>
            {/* Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} icon={<ArrowLeft className="w-3.5 h-3.5" />}>Previous</Button>
              <span className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>Page {page} / {totalPreviewPages}</span>
              {page < totalPreviewPages
                ? <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)}>Next →</Button>
                : <BuyButton item={book} size="sm" />}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Course Detail ─────────────────────────────────────────────────────────────
export function CourseDetail({ id }: { id: string }) {
  const { navigate, isOwned } = useMarketplace();
  const course = COURSES.find(c => c.id === id);
  const [openSection, setOpenSection] = useState<number | null>(0);
  if (!course) return null;
  const owned = isOwned(id);

  return (
    <div className="max-w-5xl">
      {/* Banner */}
      <div className="relative h-52 sm:h-64 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0f10, #1a1a1d)' }}>
        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 flex items-end p-6 sm:p-10">
          <div>
            <div className="flex gap-2 mb-2 flex-wrap">
              <Badge variant="glass">{course.category}</Badge>
              {course.isBestseller && <Badge variant="gold">Bestseller</Badge>}
              {course.hasCertificate && <Badge variant="emerald">Certificate</Badge>}
              {owned && <Badge variant="success">Enrolled</Badge>}
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">{course.title}</h1>
            <p className="text-sm font-sans" style={{ color: 'rgba(255,255,255,0.65)' }}>{course.description}</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <button onClick={() => navigate('courses')} className="flex items-center gap-2 text-xs font-sans mb-5" style={{ color: 'var(--text-muted)' }}>
              <ArrowLeft className="w-3.5 h-3.5" />Back to Courses
            </button>
            <StarRating rating={course.rating} count={course.reviewCount} size="md" />
            <p className="text-sm font-sans mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{course.longDescription}</p>
          </div>

          {/* What you'll learn */}
          <div>
            <h3 className="font-serif text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>What You'll Learn</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {course.objectives.map(o => (
                <div key={o} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--status-success)' }} />
                  <span className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{o}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Curriculum */}
          <div>
            <h3 className="font-serif text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Course Curriculum</h3>
            <div className="space-y-2">
              {course.curriculum.map((sec, si) => (
                <div key={si} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-card)' }}>
                  <button onClick={() => setOpenSection(openSection === si ? null : si)}
                    className="w-full flex items-center justify-between px-5 py-4"
                    style={{ backgroundColor: 'var(--hover-overlay)' }}>
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
                      <span className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{sec.section}</span>
                      <span className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>{sec.lessons.length} lessons</span>
                    </div>
                    {openSection === si ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-faint)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />}
                  </button>
                  {openSection === si && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="overflow-hidden">
                      {sec.lessons.map(l => (
                        <div key={l.id} className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}>
                          <div className="flex items-center gap-3">
                            {l.preview || owned ? <Play className="w-3.5 h-3.5" style={{ color: 'var(--brand-gold)' }} /> : <Lock className="w-3.5 h-3.5" style={{ color: 'var(--text-faint)' }} />}
                            <span className="text-xs font-sans" style={{ color: l.preview || owned ? 'var(--text-primary)' : 'var(--text-faint)' }}>{l.title}</span>
                            {l.preview && !owned && <Badge variant="glass" className="text-[9px]">Preview</Badge>}
                          </div>
                          <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{l.duration}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div>
            <h3 className="font-serif text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>FAQs</h3>
            <div className="space-y-2">
              {course.faqs.map((faq, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs font-semibold font-sans mb-1" style={{ color: 'var(--text-primary)' }}>{faq.q}</p>
                  <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <ReviewsSection reviews={course.reviews} rating={course.rating} count={course.reviewCount} />
        </div>

        {/* Sticky purchase card */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl p-5 space-y-4 sticky top-20 shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-gold-border)' }}>
            <div className="aspect-video rounded-xl overflow-hidden">
              <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
            </div>
            <PriceTag price={course.price} originalPrice={course.originalPrice} size="lg" />
            <div className="flex gap-2">
              <BuyButton item={course} size="md" className="flex-1" />
              <WishlistButton id={id} />
            </div>
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              {[
                { icon: Clock, l: `${course.duration} total` },
                { icon: BookOpen, l: `${course.lessonsCount} lessons` },
                { icon: Users, l: `${course.studentsCount.toLocaleString()} students` },
                { icon: Globe, l: course.difficulty },
                ...(course.hasCertificate ? [{ icon: Award, l: 'Certificate of Completion' }] : []),
              ].map(({ icon: Icon, l }) => (
                <div key={l} className="flex items-center gap-2.5 text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>
                  <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-gold)' }} />
                  {l}
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase mb-2" style={{ color: 'var(--text-faint)' }}>Requirements</p>
              {course.requirements.map(r => (
                <p key={r} className="text-[11px] font-sans flex items-start gap-1.5 mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span className="mt-0.5">•</span>{r}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reviews section ───────────────────────────────────────────────────────────
function ReviewsSection({ reviews, rating, count }: { reviews: typeof BOOKS[0]['reviews']; rating: number; count: number }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Reviews</h3>
        <StarRating rating={rating} count={count} size="sm" />
      </div>
      <div className="space-y-4">
        {reviews.map(r => (
          <div key={r.id} className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="flex items-center gap-3 mb-3">
              <img src={r.avatar} alt={r.reviewer} className="w-8 h-8 rounded-full object-cover" />
              <div>
                <p className="text-xs font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{r.reviewer}</p>
                <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{r.date}</p>
              </div>
              <div className="ml-auto"><StarRating rating={r.rating} size="xs" /></div>
            </div>
            <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.comment}</p>
            <p className="text-[10px] font-mono mt-2" style={{ color: 'var(--text-faint)' }}>{r.helpful} people found this helpful</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Video Detail ──────────────────────────────────────────────────────────────
export function VideoDetail({ id }: { id: string }) {
  const { navigate, isOwned, addToCart } = useMarketplace();
  const video = VIDEOS.find(v => v.id === id);
  const [activeEp, setActiveEp] = useState(0);
  if (!video) return null;
  const owned = isOwned(id);
  const related = VIDEOS.filter(v => v.id !== id && v.category === video.category).slice(0, 3);

  return (
    <div className="max-w-5xl">
      {/* Banner */}
      <div className="relative h-52 sm:h-72 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0f10, #1a1a1d)' }}>
        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(233,195,73,0.9)' }}>
            <Play className="w-7 h-7 text-black ml-1" />
          </div>
        </div>
        <div className="absolute inset-0 flex items-end p-6 sm:p-10">
          <div>
            <div className="flex gap-2 mb-2 flex-wrap">
              <Badge variant="glass">{video.category}</Badge>
              {video.isBestseller && <Badge variant="gold">Bestseller</Badge>}
              {owned && <Badge variant="success">Owned</Badge>}
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">{video.title}</h1>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-7">
          <button onClick={() => navigate('videos')} className="flex items-center gap-2 text-xs font-sans" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-3.5 h-3.5" />Back to Videos
          </button>
          <div className="flex items-center gap-4 flex-wrap">
            <StarRating rating={video.rating} count={video.reviewCount} size="md" />
            <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
              <Clock className="w-3.5 h-3.5" />{video.duration}
              <span className="ml-2"><Users className="w-3.5 h-3.5 inline" /> {video.views.toLocaleString()} views</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <img src={video.instructorAvatar} alt={video.instructor} className="w-10 h-10 rounded-full object-cover" style={{ border: '2px solid var(--accent-gold-border)' }} />
            <div>
              <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{video.instructor}</p>
              <p className="text-xs font-sans" style={{ color: 'var(--text-muted)' }}>{video.instructorBio}</p>
            </div>
          </div>

          <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{video.longDescription}</p>

          {/* Learning objectives */}
          <div>
            <h3 className="font-serif text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>What You'll Learn</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {video.objectives.map(o => (
                <div key={o} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--status-success)' }} />
                  <span className="text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>{o}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Episodes */}
          {video.episodes && video.episodes.length > 0 && (
            <div>
              <h3 className="font-serif text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Episodes</h3>
              <div className="space-y-2">
                {video.episodes.map((ep, idx) => (
                  <motion.div key={ep.id}
                    onClick={() => owned && setActiveEp(idx)}
                    className={`flex items-center gap-4 p-3.5 rounded-xl transition-all ${owned ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{
                      backgroundColor: activeEp === idx && owned ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)',
                      border: `1px solid ${activeEp === idx && owned ? 'var(--accent-gold-border)' : 'var(--border-subtle)'}`,
                    }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: owned ? 'var(--brand-gold)' : 'var(--border-default)' }}>
                      {owned ? <Play className="w-3 h-3 text-black ml-0.5" /> : <Lock className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{ep.title}</p>
                    </div>
                    <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-faint)' }}>{ep.duration}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <ReviewsSection reviews={video.reviews} rating={video.rating} count={video.reviewCount} />
        </div>

        {/* Purchase card */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl p-5 space-y-4 sticky top-20 shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-gold-border)' }}>
            <div className="aspect-video rounded-xl overflow-hidden relative">
              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
              {!owned && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <Lock className="w-6 h-6 text-white/60" />
                </div>
              )}
            </div>
            <PriceTag price={video.price} originalPrice={video.originalPrice} size="lg" />
            <div className="flex gap-2">
              <BuyButton item={video} size="md" className="flex-1" />
              <WishlistButton id={id} />
            </div>
            <div className="space-y-2 pt-2 border-t text-xs font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-gold)' }} />{video.duration} total runtime</div>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><Play className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-gold)' }} />{video.episodes?.length ?? 1} episodes</div>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><Users className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-gold)' }} />{video.views.toLocaleString()} students enrolled</div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 pb-12">
          <h3 className="font-serif text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Related Videos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map(v => <VideoCard key={v.id} video={v} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Resource Detail ───────────────────────────────────────────────────────────
export function ResourceDetail({ id }: { id: string }) {
  const { navigate, isOwned } = useMarketplace();
  const resource = RESOURCES.find(r => r.id === id);
  if (!resource) return null;
  const owned = isOwned(id);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-3xl">
      <button onClick={() => navigate('resources')} className="flex items-center gap-2 text-xs font-sans mb-6" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-3.5 h-3.5" />Back to Resources
      </button>

      <div className="rounded-2xl overflow-hidden mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div className="relative h-40 overflow-hidden">
          <img src={resource.thumbnail} alt={resource.title} className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
              style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
              <FileDown className="w-8 h-8" style={{ color: 'var(--brand-gold)' }} />
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="glass">{resource.fileType}</Badge>
            <Badge variant="glass">{resource.fileSize}</Badge>
            <Badge variant="glass">{resource.category}</Badge>
            {resource.isNew && <Badge variant="info">New</Badge>}
            {resource.isFree && <Badge variant="success">Free</Badge>}
            {owned && <Badge variant="success">Downloaded</Badge>}
          </div>
          <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{resource.title}</h1>
          <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>by {resource.author}</p>
          <StarRating rating={resource.rating} count={resource.reviewCount} size="md" />
          <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{resource.description}</p>
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--hover-overlay)' }}>
            <PriceTag price={resource.price} originalPrice={resource.originalPrice} isFree={resource.isFree} size="lg" />
            <div className="flex gap-2">
              <WishlistButton id={id} />
              <BuyButton item={resource} size="md" />
            </div>
          </div>
          <p className="text-[11px] font-sans text-center" style={{ color: 'var(--text-faint)' }}>
            {resource.downloadCount.toLocaleString()} downloads · {resource.fileType} format · {resource.fileSize}
          </p>
        </div>
      </div>
      <ReviewsSection reviews={resource.reviews} rating={resource.rating} count={resource.reviewCount} />
    </div>
  );
}

// ── Bundle Detail ─────────────────────────────────────────────────────────────
export function BundleDetail({ id }: { id: string }) {
  const { navigate, addToCart, isOwned } = useMarketplace();
  const bundle = BUNDLES.find(b => b.id === id);
  if (!bundle) return null;

  const handleBuyBundle = () => {
    addToCart({ id: bundle.id, title: bundle.title, type: 'bundle', price: bundle.bundlePrice, thumbnail: bundle.thumbnail });
    navigate('checkout');
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-3xl">
      <button onClick={() => navigate('bundles')} className="flex items-center gap-2 text-xs font-sans mb-6" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-3.5 h-3.5" />Back to Bundles
      </button>

      <div className="rounded-3xl overflow-hidden mb-8 shadow-2xl" style={{ border: '1px solid var(--accent-gold-border)' }}>
        <div className="relative h-48 overflow-hidden">
          <img src={bundle.thumbnail} alt={bundle.title} className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 p-6 text-center">
            <Package className="w-10 h-10" style={{ color: 'var(--brand-gold)' }} />
            {bundle.isPopular && <Badge variant="gold">🔥 Most Popular Bundle</Badge>}
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">{bundle.title}</h1>
          </div>
        </div>
        <div className="p-6 space-y-5" style={{ backgroundColor: 'var(--bg-card)' }}>
          <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{bundle.description}</p>

          {/* Included items */}
          <div>
            <h3 className="font-serif text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              What&apos;s Included ({bundle.items.length} items)
            </h3>
            <div className="space-y-2">
              {bundle.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-gold-subtle)' }}>
                    {item.type === 'book' ? <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--brand-gold)' }} /> :
                     item.type === 'video' ? <Play className="w-3.5 h-3.5" style={{ color: 'var(--brand-gold)' }} /> :
                     item.type === 'course' ? <Award className="w-3.5 h-3.5" style={{ color: 'var(--brand-gold)' }} /> :
                     <FileDown className="w-3.5 h-3.5" style={{ color: 'var(--brand-gold)' }} />}
                  </div>
                  <p className="text-xs font-sans flex-1" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                  <Badge variant="glass" className="text-[9px] shrink-0">{item.type}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, rgba(233,195,73,0.12) 0%, rgba(233,195,73,0.03) 100%)', border: '1px solid var(--accent-gold-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-faint)' }}>Individual Price</p>
                <p className="font-mono text-base line-through" style={{ color: 'var(--text-faint)' }}>ETB {bundle.originalPrice.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-mono uppercase" style={{ color: 'var(--status-success)' }}>You Save</p>
                <p className="font-mono text-base font-black" style={{ color: 'var(--status-success)' }}>ETB {bundle.savings.toLocaleString()} ({bundle.savingsPct}%)</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-faint)' }}>Bundle Price</p>
                <p className="font-mono text-xl font-black" style={{ color: 'var(--brand-gold)' }}>ETB {bundle.bundlePrice.toLocaleString()}</p>
              </div>
            </div>
            <Button variant="gold" size="lg" className="w-full" onClick={handleBuyBundle} icon={<Package className="w-4 h-4" />}>
              Get This Bundle — Save {bundle.savingsPct}%
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
