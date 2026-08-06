'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Library, Heart, ShoppingBag, BookOpen, Play, FileDown, Search, Filter, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { StarRating, MarketplaceEmptyState } from './MarketplaceShared';
import { useMarketplace } from '@/src/context/MarketplaceContext';
import { BOOKS, VIDEOS, COURSES, RESOURCES, BUNDLES, ALL_ITEMS } from '@/src/data/marketplace';

// ── My Library ────────────────────────────────────────────────────────────────
export function LibraryView() {
  const { state, navigate } = useMarketplace();
  const [tab, setTab] = useState<'all' | 'books' | 'videos' | 'courses' | 'resources'>('all');

  const ownedItems = ALL_ITEMS.filter(item => state.library.has(item.id) && item.type !== 'bundle');

  const filtered = tab === 'all' ? ownedItems : ownedItems.filter(i => {
    if (tab === 'books')     return i.type === 'book';
    if (tab === 'videos')    return i.type === 'video';
    if (tab === 'courses')   return i.type === 'course';
    if (tab === 'resources') return i.type === 'resource';
    return true;
  });

  if (ownedItems.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-4xl">
        <h1 className="font-serif text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>My Library</h1>
        <MarketplaceEmptyState icon={Library} title="Your library is empty"
          description="Purchase books, courses, videos, or resources to see them here."
          action={{ label: 'Browse Marketplace', onClick: () => navigate('home') }} />
      </div>
    );
  }

  const TABS = [
    { id: 'all' as const,       label: 'All',       count: ownedItems.length },
    { id: 'courses' as const,   label: 'Courses',   count: ownedItems.filter(i => i.type === 'course').length },
    { id: 'books' as const,     label: 'Books',     count: ownedItems.filter(i => i.type === 'book').length },
    { id: 'videos' as const,    label: 'Videos',    count: ownedItems.filter(i => i.type === 'video').length },
    { id: 'resources' as const, label: 'Resources', count: ownedItems.filter(i => i.type === 'resource').length },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Library</h1>
        <Badge variant="glass">{ownedItems.length} items</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map(t => t.count >= 0 && (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 text-xs font-semibold font-mono px-3.5 py-2 rounded-xl border transition-all"
            style={{ backgroundColor: tab === t.id ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)', borderColor: tab === t.id ? 'var(--accent-gold-border)' : 'var(--border-default)', color: tab === t.id ? 'var(--brand-gold)' : 'var(--text-muted)' }}>
            {t.label}
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item, idx) => {
          const isBook = item.type === 'book';
          const isVideo = item.type === 'video';
          const isCourse = item.type === 'course';
          const actionLabel = isBook ? 'Read Now' : isVideo ? 'Watch Now' : isCourse ? 'Continue' : 'Download';
          const actionIcon = isBook ? <BookOpen className="w-3.5 h-3.5" /> : isVideo ? <Play className="w-3.5 h-3.5" /> : <FileDown className="w-3.5 h-3.5" />;
          const thumbnail = (item as any).cover ?? (item as any).thumbnail ?? '/library.png';
          const title = item.title;
          const author = (item as any).author ?? (item as any).instructor ?? '';

          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
              className="flex flex-col rounded-2xl overflow-hidden group"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--status-success-border)' }}>
              <div className="relative h-36 overflow-hidden">
                <img src={thumbnail} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,15,16,0.7) 0%, transparent 50%)' }} />
                <div className="absolute top-2.5 left-2.5">
                  <Badge variant="success" className="text-[9px]"><CheckCircle2 className="w-3 h-3 mr-1" />Owned</Badge>
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1 gap-2">
                <p className="text-[10px] font-mono uppercase" style={{ color: 'var(--brand-gold)' }}>{item.type}</p>
                <h3 className="font-sans text-sm font-semibold line-clamp-2 leading-snug flex-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                {author && <p className="text-[11px] font-sans" style={{ color: 'var(--text-muted)' }}>{author}</p>}
                <Button variant="secondary" size="sm" icon={actionIcon}>{actionLabel}</Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Wishlist ──────────────────────────────────────────────────────────────────
export function WishlistView() {
  const { state, toggleWishlist, addToCart, navigate } = useMarketplace();
  const wishlistItems = ALL_ITEMS.filter(i => state.wishlist.has(i.id));

  if (wishlistItems.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-4xl">
        <h1 className="font-serif text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>Wishlist</h1>
        <MarketplaceEmptyState icon={Heart} title="Your wishlist is empty"
          description="Save resources you want to purchase later by clicking the heart icon."
          action={{ label: 'Browse Marketplace', onClick: () => navigate('home') }} />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Wishlist</h1>
        <Badge variant="glass">{wishlistItems.length} saved</Badge>
      </div>
      <div className="space-y-3">
        {wishlistItems.map((item, idx) => {
          const price = (item as any).price ?? (item as any).bundlePrice ?? 0;
          const originalPrice = (item as any).originalPrice;
          const thumbnail = (item as any).cover ?? (item as any).thumbnail ?? '/library.png';
          const author = (item as any).author ?? (item as any).instructor ?? '';
          const inCart = state.cart.some(c => c.id === item.id);
          const owned = state.library.has(item.id);

          return (
            <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 cursor-pointer" onClick={() => navigate(item.type as any, item.id)}>
                <img src={thumbnail} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(item.type as any, item.id)}>
                <p className="text-[10px] font-mono uppercase mb-0.5" style={{ color: 'var(--brand-gold)' }}>{item.type}</p>
                <p className="text-sm font-semibold font-sans line-clamp-1" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                {author && <p className="text-[11px] font-sans" style={{ color: 'var(--text-muted)' }}>{author}</p>}
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-mono text-sm font-black" style={{ color: 'var(--brand-gold)' }}>{price === 0 ? 'FREE' : `ETB ${price.toLocaleString()}`}</span>
                  {originalPrice && <span className="font-mono text-xs line-through" style={{ color: 'var(--text-faint)' }}>ETB {originalPrice.toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!owned && !inCart && (
                  <Button variant="gold" size="xs" onClick={() => addToCart({ id: item.id, title: item.title, type: item.type, price, thumbnail })}>
                    Add to Cart
                  </Button>
                )}
                {owned && <Badge variant="success" className="text-[9px]">Owned</Badge>}
                {inCart && <Badge variant="amber" className="text-[9px]">In Cart</Badge>}
                <button onClick={() => toggleWishlist(item.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--status-danger)' }}>
                  <Heart className="w-4 h-4 fill-current" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Purchase History ──────────────────────────────────────────────────────────
export function PurchasesView() {
  const { state, navigate } = useMarketplace();

  if (!state.orders.length) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-4xl">
        <h1 className="font-serif text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>Purchase History</h1>
        <MarketplaceEmptyState icon={ShoppingBag} title="No purchases yet"
          description="Your completed orders will appear here."
          action={{ label: 'Browse Marketplace', onClick: () => navigate('home') }} />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Purchase History</h1>
        <Badge variant="glass">{state.orders.length} orders</Badge>
      </div>
      <div className="space-y-4">
        {state.orders.map((order, idx) => (
          <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
            className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--hover-overlay)' }}>
              <div>
                <p className="font-mono text-sm font-bold" style={{ color: 'var(--brand-gold)' }}>{order.id}</p>
                <p className="text-[11px] font-sans" style={{ color: 'var(--text-faint)' }}>{order.date} · via {order.method}</p>
              </div>
              <div className="text-right">
                <Badge variant="success" className="text-[9px] mb-1">Completed</Badge>
                <p className="font-mono text-sm font-black" style={{ color: 'var(--text-primary)' }}>ETB {order.total.toLocaleString()}</p>
              </div>
            </div>
            <div className="px-5 py-3 space-y-2">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <p className="text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>{item.title}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{item.price === 0 ? 'FREE' : `ETB ${item.price.toLocaleString()}`}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
