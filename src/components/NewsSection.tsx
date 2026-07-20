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
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Research' | 'Campus' | 'Events'>('All');
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>({ '1': 42, '2': 18, '3': 29 });
  const [isLiked, setIsLiked] = useState<Record<string, boolean>>({});

  // Share system mock feedback toast
  const [showShareToast, setShowShareToast] = useState(false);

  // Sync with external news article selection (e.g. from Search modal)
  React.useEffect(() => {
    if (onSelectNewsArticle) {
      setActiveArticle(onSelectNewsArticle);
    }
  }, [onSelectNewsArticle]);

  const handleCloseArticle = () => {
    setActiveArticle(null);
    if (onClearSelectedNewsArticle) onClearSelectedNewsArticle();
  };

  const categories = ['All', 'Research', 'Campus', 'Events'] as const;

  const filteredNews = newsData.filter(
    (article) => selectedCategory === 'All' || article.category === selectedCategory
  );

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiked[id]) {
      setLikes((prev) => ({ ...prev, [id]: prev[id] - 1 }));
      setIsLiked((prev) => ({ ...prev, [id]: false }));
    } else {
      setLikes((prev) => ({ ...prev, [id]: prev[id] + 1 }));
      setIsLiked((prev) => ({ ...prev, [id]: true }));
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  return (
    <section id="research" className="py-24 bg-[#0F0F10] relative">
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto">
        
        {/* Header and Category Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="text-[#E9C349] font-sans text-[10px] font-bold uppercase tracking-[0.25em] mb-4 block">
              Latest From Aurora
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
              Intellectual Highlights & Events
            </h2>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2.5 bg-white/5 p-1 rounded-full border border-white/5 w-fit">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#E9C349] text-black font-bold shadow-lg shadow-[#E9C349]/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredNews.map((article) => (
              <motion.article
                key={article.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                onClick={() => setActiveArticle(article)}
                className="group flex flex-col justify-between bg-[#1A1A1C]/50 rounded-xl overflow-hidden border border-white/5 hover:border-white/10 shadow-xl transition-all cursor-pointer"
              >
                <div>
                  {/* Photo container */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-black">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-[0.7] group-hover:brightness-[0.6]"
                      alt={article.title}
                      src={article.image}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="absolute top-4 left-4 px-2.5 py-1 rounded font-mono text-[9px] font-bold uppercase tracking-widest bg-[#E9C349] text-black">
                      {article.category}
                    </span>
                  </div>

                  {/* Body Info */}
                  <div className="p-6 sm:p-8 space-y-4">
                    <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {article.date}</span>
                      <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> By {article.author.split('&')[0]}</span>
                    </div>

                    <h3 className="font-serif text-xl font-bold text-white leading-snug group-hover:text-[#E9C349] transition-colors">
                      {article.title}
                    </h3>
                    <p className="font-sans text-xs sm:text-sm text-gray-400 leading-relaxed line-clamp-3">
                      {article.summary}
                    </p>
                  </div>
                </div>

                {/* Card footer metrics */}
                <div className="p-6 sm:px-8 sm:pb-8 pt-0 border-t border-white/5 mt-auto flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => handleLike(article.id, e)}
                      className={`flex items-center gap-1.5 hover:text-[#E9C349] transition-colors ${
                        isLiked[article.id] ? 'text-[#E9C349]' : 'text-gray-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked[article.id] ? 'fill-[#E9C349]' : ''}`} />
                      <span>{likes[article.id] || 0}</span>
                    </button>

                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-[#E9C349] transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
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

      {/* FULL RESPONSIVE READER MODAL */}
      <AnimatePresence>
        {activeArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseArticle}
              className="fixed inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Dialog Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-[#1A1A1C] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col"
            >
              {/* Close Button */}
              <button
                onClick={handleCloseArticle}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 border border-white/10 text-gray-300 hover:text-white transition-transform hover:scale-105"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Scrollable Container */}
              <div className="overflow-y-auto">
                {/* Hero Photo banner */}
                <div className="relative aspect-[21/9] w-full bg-black overflow-hidden">
                  <img
                    className="w-full h-full object-cover filter brightness-[0.6]"
                    alt={activeArticle.title}
                    src={activeArticle.image}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1C] to-transparent" />
                  
                  <span className="absolute bottom-6 left-6 px-2.5 py-1 rounded font-mono text-[9px] font-bold uppercase tracking-widest bg-[#E9C349] text-black">
                    {activeArticle.category}
                  </span>
                </div>

                {/* Article Header info */}
                <div className="p-6 sm:p-10 space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-400">
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[#E9C349]" /> {activeArticle.date}</span>
                      <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-[#E9C349]" /> Compiled by {activeArticle.author}</span>
                    </div>

                    <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
                      {activeArticle.title}
                    </h3>
                  </div>

                  {/* Summary Callout */}
                  <div className="p-4 rounded-xl bg-white/5 border-l-4 border-[#E9C349] text-sm text-gray-300 font-sans italic leading-relaxed">
                    {activeArticle.summary}
                  </div>

                  {/* Main Rich Content */}
                  <div
                    className="prose prose-invert prose-sm max-w-none text-gray-300 font-sans leading-relaxed space-y-5
                      prose-headings:font-serif prose-headings:text-white prose-headings:font-extrabold prose-headings:mt-8 prose-headings:mb-4
                      prose-h2:text-xl prose-h3:text-lg prose-p:text-sm prose-p:leading-relaxed prose-blockquote:border-l-2 prose-blockquote:border-white/20
                      prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400"
                    dangerouslySetInnerHTML={{ __html: activeArticle.content }}
                  />

                  {/* Footer social elements inside drawer */}
                  <div className="pt-8 border-t border-white/10 flex justify-between items-center text-xs font-mono">
                    <button
                      onClick={(e) => handleLike(activeArticle.id, e)}
                      className={`flex items-center gap-2 hover:text-[#E9C349] transition-all px-4 py-2 rounded-full border border-white/5 ${
                        isLiked[activeArticle.id] ? 'bg-[#E9C349]/10 text-[#E9C349]' : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                      <span>{isLiked[activeArticle.id] ? 'Liked!' : 'Like Article'} ({likes[activeArticle.id] || 0})</span>
                    </button>

                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/5"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Post</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shared URL Toast Alert */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 p-4 bg-[#1A1A1C] border border-[#E9C349]/40 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-[#E9C349]/20 flex items-center justify-center text-[#E9C349]">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <p className="font-sans font-bold text-white text-xs">Share Link Copied!</p>
              <p className="font-mono text-[9px] text-gray-500 mt-0.5">Hashed article reference stored in clipboard.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
