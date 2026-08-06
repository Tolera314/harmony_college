'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Star, Heart, ShoppingCart, Play, BookOpen, FileDown, Package, Lock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { useMarketplace } from '@/src/context/MarketplaceContext';
import type { Book, Video, Course, Resource, Bundle, MarketplaceItem } from '@/src/data/marketplace';

// ── Star rating display ───────────────────────────────────────────────────────
export function StarRating({ rating, count, size = 'sm' }: { rating: number; count?: number; size?: 'xs' | 'sm' | 'md' }) {
  const px = size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(i => (
          <Star key={i} className={`${px} ${i <= Math.round(rating) ? 'fill-[var(--brand-gold)] text-[var(--brand-gold)]' : 'text-[var(--border-strong)]'}`} />
        ))}
      </div>
      <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--brand-gold)' }}>{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-[10px] font-sans" style={{ color: 'var(--text-faint)' }}>({count.toLocaleString()})</span>}
    </div>
  );
}

// ── Price display ─────────────────────────────────────────────────────────────
export function PriceTag({ price, originalPrice, isFree, size = 'md' }: { price: number; originalPrice?: number; isFree?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const main = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl';
  if (isFree || price === 0) return <span className="font-mono font-black text-[var(--status-success)] text-sm">FREE</span>;
  return (
    <div className="flex items-baseline gap-2">
      <span className={`font-mono font-black ${main}`} style={{ color: 'var(--brand-gold)' }}>ETB {price.toLocaleString()}</span>
      {originalPrice && originalPrice > price && (
        <span className="font-mono text-xs line-through" style={{ color: 'var(--text-faint)' }}>ETB {originalPrice.toLocaleString()}</span>
      )}
    </div>
  );
}

// ── Type icon ─────────────────────────────────────────────────────────────────
export function TypeIcon({ type, className = 'w-4 h-4' }: { type: MarketplaceItem['type']; className?: string }) {
  const icons = { book: BookOpen, video: Play, course: BookOpen, resource: FileDown, bundle: Package };
  const Icon = icons[type];
  return <Icon className={className} />;
}

// ── Wishlist button ───────────────────────────────────────────────────────────
export function WishlistButton({ id, className = '' }: { id: string; className?: string }) {
  const { isWishlisted, toggleWishlist } = useMarketplace();
  const active = isWishlisted(id);
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={(e) => { e.stopPropagation(); toggleWishlist(id); }}
      className={`p-2 rounded-xl transition-colors ${className}`}
      style={{ backgroundColor: 'var(--hover-overlay)', color: active ? '#e9c349' : 'var(--text-muted)' }}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart className={`w-4 h-4 ${active ? 'fill-current' : ''}`} />
    </motion.button>
  );
}

// ── Add-to-cart / Buy button ──────────────────────────────────────────────────
export function BuyButton({ item, size = 'sm', className = '' }: {
  item: Pick<MarketplaceItem, 'id' | 'type'> & { title: string; price?: number; thumbnail?: string; isFree?: boolean };
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { isOwned, isInCart, addToCart, navigate } = useMarketplace();
  const owned = isOwned(item.id);
  const inCart = isInCart(item.id);
  const price = (item as any).price ?? 0;
  const free = (item as any).isFree || price === 0;

  if (owned) {
    const label = item.type === 'book' ? 'Read Now' : item.type === 'video' ? 'Watch Now' : item.type === 'resource' ? 'Download' : 'Open';
    return (
      <Button variant="secondary" size={size} className={className}
        icon={<CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)]" />}
        onClick={(e) => { (e as any).stopPropagation?.(); navigate('library'); }}>
        {label}
      </Button>
    );
  }
  if (inCart) {
    return (
      <Button variant="outline" size={size} className={className}
        icon={<ShoppingCart className="w-3.5 h-3.5" />}
        onClick={(e) => { (e as any).stopPropagation?.(); navigate('checkout'); }}>
        In Cart
      </Button>
    );
  }
  return (
    <Button variant="gold" size={size} className={className}
      icon={free ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
      onClick={(e) => {
        (e as any).stopPropagation?.();
        if (free) {
          addToCart({ id: item.id, title: item.title, type: item.type, price: 0, thumbnail: (item as any).thumbnail ?? '' });
          navigate('checkout');
        } else {
          addToCart({ id: item.id, title: item.title, type: item.type, price, thumbnail: (item as any).thumbnail ?? '' });
        }
      }}>
      {free ? 'Get Free' : 'Add to Cart'}
    </Button>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ label, title, action }: { label?: string; title: string; action?: { text: string; onClick: () => void } }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        {label && <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--brand-gold)' }}>{label}</p>}
        <h2 className="font-serif text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {action && (
        <button onClick={action.onClick} className="text-xs font-semibold font-sans transition-colors shrink-0" style={{ color: 'var(--brand-gold)' }}>
          {action.text} →
        </button>
      )}
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
export function SkeletonCard({ aspect = 'book' }: { aspect?: 'book' | 'video' | 'course' }) {
  const h = aspect === 'book' ? 'h-52' : 'h-40';
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
      <div className={`${h} w-full`} style={{ backgroundColor: 'var(--hover-overlay)' }} />
      <div className="p-4 space-y-2.5">
        <div className="h-3 rounded-full w-3/4" style={{ backgroundColor: 'var(--hover-overlay)' }} />
        <div className="h-2.5 rounded-full w-1/2" style={{ backgroundColor: 'var(--hover-overlay)' }} />
        <div className="h-2 rounded-full w-1/3" style={{ backgroundColor: 'var(--hover-overlay)' }} />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function MarketplaceEmptyState({ icon: Icon, title, description, action }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string; description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)' }}>
        <Icon className="w-7 h-7" style={{ color: 'var(--text-faint)' }} />
      </div>
      <h3 className="font-serif text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-sm font-sans max-w-xs leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>{description}</p>
      {action && <Button variant="gold" size="md" onClick={action.onClick}>{action.label}</Button>}
    </motion.div>
  );
}
