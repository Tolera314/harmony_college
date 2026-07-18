import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { testimonialsData } from '../data/testimonials';

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonialsData.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonialsData.length - 1 ? 0 : prev + 1));
  };

  const current = testimonialsData[currentIndex];

  return (
    <section className="py-24 bg-[#0F0F10] relative overflow-hidden">
      {/* Decorative Blur BG */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E9C349]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full px-6 sm:px-12 max-w-5xl mx-auto text-center relative z-10 space-y-12">
        <div className="space-y-3">
          <span className="text-[#E9C349] font-sans text-[10px] font-bold uppercase tracking-[0.25em] block">
            Success Stories
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-white">
            What Our Alumni Say
          </h2>
        </div>

        <div className="relative min-h-[350px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-8 max-w-3xl"
            >
              {/* Quote Mark Icon */}
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#E9C349]">
                  <Quote className="w-5 h-5 transform rotate-180" />
                </div>
              </div>

              {/* Rating stars */}
              <div className="flex justify-center gap-1">
                {[...Array(current.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#E9C349] text-[#E9C349]" />
                ))}
              </div>

              {/* Big Quote */}
              <p className="font-serif text-lg sm:text-xl md:text-2xl text-white italic leading-relaxed max-w-2xl mx-auto">
                "{current.quote}"
              </p>

              {/* Author Info */}
              <div className="flex items-center justify-center gap-4 pt-4">
                <img
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border border-white/20 shadow-md"
                  alt={current.name}
                  src={current.image}
                />
                <div className="text-left">
                  <p className="font-sans text-sm font-bold text-white">{current.name}</p>
                  <p className="font-sans text-xs text-gray-400 mt-0.5">{current.role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Slider Controls */}
        <div className="flex items-center justify-center gap-6 pt-4">
          <button
            onClick={handlePrev}
            aria-label="Previous testimonial"
            className="p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white hover:scale-105 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex gap-2">
            {testimonialsData.map((t, idx) => (
              <button
                key={t.id}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to testimonial ${idx + 1}`}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx ? 'w-6 bg-[#E9C349]' : 'bg-white/20 hover:bg-white/45'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            aria-label="Next testimonial"
            className="p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white hover:scale-105 transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </section>
  );
}
