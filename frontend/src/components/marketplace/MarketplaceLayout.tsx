'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home, BookOpen, Play, GraduationCap, FileDown, Package,
  Heart, Library, ShoppingBag, Search, ShoppingCart,
  X, Menu, ChevronRight
} from 'lucide-react';
import ThemeToggle from '@/src/components/ThemeToggle';
import { Badge } from '@/src/components/ui/Badge';
import { useMarketplace, type MarketplaceView } from '@/src/context/MarketplaceContext';

const NAV_ITEMS: { id: MarketplaceView; label: string; icon: React.ReactNode }[] = [
  { id: 'home',      label: 'Discover',   icon: <Home className="w-4 h-4" /> },
  { id: 'books',     label: 'Books',      icon: <BookOpen className="w-4 h-4" /> },
  { id: 'videos',    label: 'Videos',     icon: <Play className="w-4 h-4" /> },
  { id: 'courses',   label: 'Courses',    icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'resources', label: 'Resources',  icon: <FileDown className="w-4 h-4" /> },
  { id: 'bundles',   label: 'Bundles',    icon: <Package className="w-4 h-4" /> },
];

const USER_ITEMS: { id: MarketplaceView; label: string; icon: React.ReactNode }[] = [
  { id: 'wishlist',  label: 'Wishlist',   icon: <Heart className="w-4 h-4" /> },
  { id: 'library',   label: 'My Library', icon: <Library className="w-4 h-4" /> },
  { id: 'purchases', label: 'Purchases',  icon: <ShoppingBag className="w-4 h-4" /> },
];

const MOBILE_NAV = [
  { id: 'home' as MarketplaceView,    label: 'Discover',  icon: <Home className="w-5 h-5" /> },
  { id: 'courses' as MarketplaceView, label: 'Courses',   icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'library' as MarketplaceView, label: 'Library',   icon: <Library className="w-5 h-5" /> },
  { id: 'wishlist' as MarketplaceView,label: 'Wishlist',  icon: <Heart className="w-5 h-5" /> },
];

interface Props { children: React.ReactNode }

export function MarketplaceLayout({ children }: Props) {
  const { state, navigate, setSearch } = useMarketplace();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const cartCount = state.cart.length;
  const wishlistCount = state.wishlist.size;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) {
      setSearch(searchQ);
      setSearchOpen(false);
    }
  };

  const handleQuickSearch = (term: string) => {
    setSearchQ(term);
    setSearch(term);
    setSearchOpen(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full blur-[140px]" style={{ background: 'radial-gradient(ellipse, rgba(233,195,73,0.06) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 rounded-full blur-[100px]" style={{ background: 'radial-gradient(ellipse, rgba(233,195,73,0.04) 0%, transparent 70%)' }} />
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-20 xl:w-64 flex-col py-6 px-3 xl:px-4 z-40 ds-sidebar backdrop-blur-xl border-r" style={{ borderColor: 'var(--border-default)' }}>
        {/* Brand */}
        <button onClick={() => navigate('home')} className="flex items-center gap-3 mb-7 px-2 group">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 group-hover:scale-105 transition-transform" style={{ borderColor: 'rgba(233,195,73,0.5)' }}>
            <img src="/logo2.jpg" alt="Harmony" className="w-full h-full object-cover" />
          </div>
          <div className="hidden xl:block">
            <span className="font-serif text-lg font-bold block leading-none" style={{ color: 'var(--text-primary)' }}>Harmony</span>
            <span className="text-[9px] font-mono uppercase tracking-widest font-bold block mt-0.5" style={{ color: 'var(--brand-gold)' }}>Learning Marketplace</span>
          </div>
        </button>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5" role="navigation">
          <p className="hidden xl:block text-[9px] font-mono uppercase tracking-widest px-3 py-2 ds-nav-group-label">Explore</p>
          {NAV_ITEMS.map(item => {
            const active = state.view === item.id;
            return (
              <motion.button key={item.id} onClick={() => navigate(item.id)}
                whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
                aria-current={active ? 'page' : undefined}
                className={`relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium font-sans text-left transition-all ${active ? 'ds-nav-item-active font-semibold' : 'ds-nav-item'}`}>
                {active && <motion.div layoutId="activeMarketPill" className="absolute inset-0 ds-nav-item-active-pill rounded-xl border-l-[3px]" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                <span className="relative z-10 shrink-0" style={{ color: active ? 'var(--brand-gold)' : undefined }}>{item.icon}</span>
                <span className="relative z-10 hidden xl:inline truncate">{item.label}</span>
              </motion.button>
            );
          })}

          <div className="pt-4">
            <p className="hidden xl:block text-[9px] font-mono uppercase tracking-widest px-3 py-2 ds-nav-group-label">My Learning</p>
            {USER_ITEMS.map(item => {
              const active = state.view === item.id;
              return (
                <motion.button key={item.id} onClick={() => navigate(item.id)}
                  whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
                  className={`relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium font-sans text-left transition-all ${active ? 'ds-nav-item-active font-semibold' : 'ds-nav-item'}`}>
                  {active && <motion.div layoutId="activeMarketPill2" className="absolute inset-0 ds-nav-item-active-pill rounded-xl border-l-[3px]" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                  <span className="relative z-10 shrink-0" style={{ color: active ? 'var(--brand-gold)' : undefined }}>{item.icon}</span>
                  <span className="relative z-10 hidden xl:inline truncate">{item.label}</span>
                  {item.id === 'wishlist' && wishlistCount > 0 && (
                    <span className="relative z-10 hidden xl:inline ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-gold-subtle)', color: 'var(--brand-gold)' }}>{wishlistCount}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </nav>

        {/* Cart */}
        <div className="border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <motion.button onClick={() => navigate('checkout')}
            whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
            className="relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium font-sans text-left ds-nav-item transition-all">
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline">Cart</span>
            {cartCount > 0 && <span className="hidden xl:flex ml-auto w-5 h-5 items-center justify-center rounded-full text-[10px] font-mono font-bold" style={{ backgroundColor: 'var(--brand-gold)', color: 'var(--bg-base)' }}>{cartCount}</span>}
          </motion.button>
        </div>
      </aside>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 ds-header backdrop-blur-xl border-b h-14 flex items-center justify-between px-4 sm:px-6 md:pl-24 xl:pl-72" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-xl ds-nav-item" aria-label="Open menu">
            <Menu className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={() => navigate('home')} className="font-serif text-base sm:text-lg font-bold hover:opacity-75 transition-opacity" style={{ color: 'var(--text-primary)' }}>
              Harmony <span style={{ color: 'var(--brand-gold)' }}>Marketplace</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 hidden sm:block" style={{ color: 'var(--text-faint)' }} />
            <span className="hidden sm:block text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
              {[...NAV_ITEMS, ...USER_ITEMS].find(n => n.id === state.view)?.label ?? 'Browse'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <button onClick={() => setSearchOpen(true)} className="p-2 rounded-xl ds-nav-item" aria-label="Search">
            <Search className="w-4 h-4" />
          </button>
          {/* Cart */}
          <button onClick={() => navigate('checkout')} className="relative p-2 rounded-xl ds-nav-item" aria-label="Cart">
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-mono font-black" style={{ backgroundColor: 'var(--brand-gold)', color: 'var(--bg-base)' }}>{cartCount}</span>}
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Search overlay ── */}
      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setSearchOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="fixed top-4 left-4 right-4 z-50 max-w-2xl mx-auto rounded-2xl p-4 shadow-2xl"
              style={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--border-default)' }}>
              <form onSubmit={handleSearch} className="flex items-center gap-3">
                <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search books, videos, courses, resources…"
                  className="flex-1 bg-transparent text-sm focus:outline-none font-sans"
                  style={{ color: 'var(--text-primary)' }} />
                <button type="button" onClick={() => setSearchOpen(false)} className="p-1" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Photography', 'Music Production', 'Graphic Design', 'Free Resources'].map(t => (
                  <button key={t} onClick={() => handleQuickSearch(t)}
                    className="text-[11px] font-mono px-3 py-1.5 rounded-full transition-colors"
                    style={{ backgroundColor: 'var(--hover-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {t}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 md:hidden" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)} />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col shadow-2xl md:hidden"
              style={{ backgroundColor: 'var(--bg-modal)', borderRight: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border-2" style={{ borderColor: 'rgba(233,195,73,0.4)' }}>
                    <img src="/logo2.jpg" alt="Harmony" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-serif text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Marketplace</p>
                    <p className="text-[9px] font-mono" style={{ color: 'var(--brand-gold)' }}>Harmony College</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl ds-nav-item"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {[...NAV_ITEMS, ...USER_ITEMS].map(item => (
                  <button key={item.id} onClick={() => { navigate(item.id); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ backgroundColor: state.view === item.id ? 'var(--accent-gold-subtle)' : 'transparent', color: state.view === item.id ? 'var(--brand-gold)' : 'var(--text-secondary)' }}>
                    {item.icon}<span>{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <main className="relative z-10 md:pl-20 xl:pl-64 pb-24 md:pb-8 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div key={state.view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 p-3 md:hidden pointer-events-none" aria-label="Mobile navigation">
        <div className="pointer-events-auto max-w-sm mx-auto ds-mobile-nav backdrop-blur-xl border rounded-2xl shadow-2xl flex items-center justify-around px-2 py-1.5">
          {MOBILE_NAV.map(item => {
            const active = state.view === item.id;
            return (
              <motion.button key={item.id} onClick={() => navigate(item.id)} whileTap={{ scale: 0.88 }}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center w-full py-1.5 font-sans text-[10px] font-medium transition-colors ${active ? 'ds-mobile-nav-item-active' : 'ds-mobile-nav-item'}`}>
                {active && <motion.div layoutId="activeMobileMarketPill" className="absolute inset-0 ds-mobile-nav-pill rounded-xl border-b-2" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                <span className="relative z-10">{item.icon}</span>
                <span className="relative z-10 mt-0.5 tracking-tight leading-none">{item.label}</span>
              </motion.button>
            );
          })}
          <motion.button onClick={() => navigate('checkout')} whileTap={{ scale: 0.88 }}
            className="relative flex flex-col items-center justify-center w-full py-1.5 font-sans text-[10px] font-medium ds-mobile-nav-item">
            <span className="relative z-10"><ShoppingCart className="w-5 h-5" /></span>
            {cartCount > 0 && <span className="absolute top-0.5 right-2 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ds-mobile-nav-dot border">{cartCount}</span>}
            <span className="relative z-10 mt-0.5">Cart</span>
          </motion.button>
        </div>
      </nav>
    </div>
  );
}
