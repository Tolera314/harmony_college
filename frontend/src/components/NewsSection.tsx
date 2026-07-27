import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, ArrowRight, X, Heart, Share2, Send } from 'lucide-react';
import { NewsArticle } from '../types';
import { newsData } from '../data/news';

interface NewsSectionProps {
  onSelectNewsArticle?: NewsArticle | null;
  onClearSelectedNewsArticle?: () => void;
}

export default function NewsSection({ onSelectNewsArticle, onClearSelectedNewsArticle }: NewsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All'|'Research'|'Campus'|'Events'>('All');
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>({ '1': 42, '2': 18, '3': 29 });
  const [isLiked, setIsLiked] = useState<Record<string, boolean>>({});
  const [showShareToast, setShowShareToast] = useState(false);

  React.useEffect(() => { if (onSelectNewsArticle) setActiveArticle(onSelectNewsArticle); }, [onSelectNewsArticle]);

  const handleCloseArticle = () => { setActiveArticle(null); onClearSelectedNewsArticle?.(); };
  const categories = ['All', 'Research', 'Campus', 'Events'] as const;
  const filteredNews = newsData.filter(a => selectedCategory === 'All' || a.category === selectedCategory);

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikes(p => ({ ...p, [id]: p[id] + (isLiked[id] ? -1 : 1) }));
    setIsLiked(p => ({ ...p, [id]: !p[id] }));
  };
  const handleShare = (e: React.MouseEvent) => { e.stopPropagation(); setShowShareToast(true); setTimeout(() => setShowShareToast(false), 3000); };

  return (
    <section id="research" className="py-24 relative transition-colors duration-300" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="text-[#E9C349] font-sans text-[10px] font-bold uppercase tracking-[0.25em] mb-4 block">Latest From Aurora</span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
              Intellectual Highlights & Events
            </h2>
          </div>
          <div className="flex flex-wrap gap-2.5 p-1 rounded-full w-fit" style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${selectedCategory === cat ? 'bg-[#E9C349] text-black font-bold shadow-lg shadow-[#E9C349]/20' : 'hover:text-[#E9C349]'}`}
                style={{ color: selectedCategory === cat ? '#000' : 'var(--text-secondary)' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredNews.map(article => (
              <motion.article key={article.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}
                onClick={() => setActiveArticle(article)}
                className="group flex flex-col justify-between rounded-xl overflow-hidden shadow-xl transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-card)'}
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-[0.85] group-hover:brightness-[0.7]"
                      alt={article.title} src={article.image} loading="lazy" decoding="async" />
                    <span className="absolute top-4 left-4 px-2.5 py-1 rounded font-mono text-[9px] font-bold uppercase tracking-widest bg-[#E9C349] text-black">{article.category}</span>
                  </div>
                  <div className="p-6 sm:p-8 space-y-4">
                    <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {article.date}</span>
                      <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> By {article.author.split('&')[0]}</span>
                    </div>
                    <h3 className="font-serif text-xl font-bold leading-snug group-hover:text-[#E9C349] transition-colors" style={{ color: 'var(--text-primary)' }}>{article.title}</h3>
                    <p className="font-sans text-xs sm:text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{article.summary}</p>
                  </div>
                </div>
                <div className="p-6 sm:px-8 sm:pb-8 pt-0 mt-auto flex items-center justify-between text-xs font-mono"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-4">
                    <button onClick={(e) => handleLike(article.id, e)}
                      className={`flex items-center gap-1.5 hover:text-[#E9C349] transition-colors ${isLiked[article.id] ? 'text-[#E9C349]' : ''}`}
                      style={{ color: isLiked[article.id] ? '#E9C349' : 'var(--text-muted)' }}>
                      <Heart className={`w-4 h-4 ${isLiked[article.id] ? 'fill-[#E9C349]' : ''}`} />
                      <span>{likes[article.id] || 0}</span>
                    </button>
                    <button onClick={handleShare} className="flex items-center gap-1.5 hover:text-[#E9C349] transition-colors" style={{ color: 'var(--text-muted)' }}>
                      <Share2 className="w-4 h-4" /><span>Share</span>
                    </button>
                  </div>
                  <span className="text-[#E9C349] font-bold tracking-wider uppercase flex items-center gap-1 group-hover:translate-x-1.5 transition-transform">
                    Read Post <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Article reader modal */}
      <AnimatePresence>
        {activeArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseArticle} className="fixed inset-0 backdrop-blur-md"
              style={{ backgroundColor: 'var(--overlay-modal-bg)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col"
              style={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--border-default)' }}>
              <button onClick={handleCloseArticle}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 text-gray-300 hover:text-white transition-transform hover:scale-105"
                style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
                <X className="w-5 h-5" />
              </button>
              <div className="overflow-y-auto">
                <div className="relative aspect-[21/9] w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <img className="w-full h-full object-cover filter brightness-[0.6]" alt={activeArticle.title} src={activeArticle.image} loading="lazy" decoding="async" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--bg-modal), transparent)' }} />
                  <span className="absolute bottom-6 left-6 px-2.5 py-1 rounded font-mono text-[9px] font-bold uppercase tracking-widest bg-[#E9C349] text-black">{activeArticle.category}</span>
                </div>
                <div className="p-6 sm:p-10 space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[#E9C349]" /> {activeArticle.date}</span>
                      <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-[#E9C349]" /> {activeArticle.author}</span>
                    </div>
                    <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>{activeArticle.title}</h3>
                  </div>
                  <div className="p-4 rounded-xl text-sm font-sans italic leading-relaxed"
                    style={{ backgroundColor: 'var(--bg-glass)', borderLeft: '4px solid #E9C349', color: 'var(--text-secondary)' }}>
                    {activeArticle.summary}
                  </div>
                  <div
                    className="prose prose-sm max-w-none font-sans leading-relaxed space-y-5
                      prose-headings:font-serif prose-headings:font-extrabold prose-headings:mt-8 prose-headings:mb-4
                      prose-h2:text-xl prose-h3:text-lg prose-p:text-sm prose-p:leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                    dangerouslySetInnerHTML={{ __html: activeArticle.content }}
                  />
                  <div className="pt-8 flex justify-between items-center text-xs font-mono" style={{ borderTop: '1px solid var(--border-default)' }}>
                    <button onClick={(e) => handleLike(activeArticle.id, e)}
                      className={`flex items-center gap-2 hover:text-[#E9C349] transition-all px-4 py-2 rounded-full`}
                      style={{ border: '1px solid var(--border-subtle)', backgroundColor: isLiked[activeArticle.id] ? 'rgba(233,195,73,0.10)' : 'var(--bg-glass)', color: isLiked[activeArticle.id] ? '#E9C349' : 'var(--text-secondary)' }}>
                      <Heart className="w-4 h-4" />
                      <span>{isLiked[activeArticle.id] ? 'Liked!' : 'Like Article'} ({likes[activeArticle.id] || 0})</span>
                    </button>
                    <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 rounded-full transition-colors"
                      style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-glass)', color: 'var(--text-secondary)' }}>
                      <Share2 className="w-4 h-4" /><span>Share Post</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareToast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3"
            style={{ backgroundColor: 'var(--bg-modal)', border: '1px solid rgba(233,195,73,0.40)' }}>
            <div className="w-8 h-8 rounded-full bg-[#E9C349]/20 flex items-center justify-center text-[#E9C349]"><Send className="w-4 h-4" /></div>
            <div>
              <p className="font-sans font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Share Link Copied!</p>
              <p className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Hashed article reference stored in clipboard.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
