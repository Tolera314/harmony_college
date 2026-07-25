'use client';

import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Partners from './components/Partners';
import Schools from './components/Schools';
import Advantage from './components/Advantage';
import CampusLife from './components/CampusLife';
import Stats from './components/Stats';
import Testimonials from './components/Testimonials';
import Roadmap from './components/Roadmap';
import NewsSection from './components/NewsSection';
import CTA from './components/CTA';
import Footer from './components/Footer';
import { SearchModal, ApplyModal, ContactModal } from './components/Modals';
import { NewsArticle } from './types';

export default function App() {
  // Modal visibility states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Shared state connecting Apply Form to Admissions Roadmap
  const [hasApplied, setHasApplied] = useState(false);
  const [appliedData, setAppliedData] = useState<any | null>(null);

  // Interactive selection hooks driven from Search Modal outputs
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedNewsArticle, setSelectedNewsArticle] = useState<NewsArticle | null>(null);

  // Triggered when user successfully submits the Application Form
  const handleApplicationSuccess = (formData: any) => {
    setHasApplied(true);
    setAppliedData(formData);
    
    // Automatically trigger visual scroll to Admissions Timeline to see progress!
    setTimeout(() => {
      const el = document.getElementById('admissions');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500);
  };

  const handleSelectSchoolFromSearch = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    // Smooth scroll down to programs section where the drawer opens
    setTimeout(() => {
      const el = document.getElementById('programs');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleSelectNewsFromSearch = (article: NewsArticle) => {
    setSelectedNewsArticle(article);
    // Smooth scroll down to research news section where reader modal opens
    setTimeout(() => {
      const el = document.getElementById('research');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div id="main-landing" className="min-h-screen selection:bg-[#E9C349] selection:text-black" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Sticky header bar */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenApply={() => setIsApplyOpen(true)}
      />

      {/* Main sections */}
      <main className="space-y-0">
        <Hero />
        <Partners />
        
        {/* Academic ecosystems with click triggers */}
        <Schools
          onSelectSchoolId={selectedSchoolId}
          onClearSelectedSchoolId={() => setSelectedSchoolId('')}
        />
        
        <Advantage />
        <CampusLife />
        <Stats />
        <Testimonials />
        
        {/* Admissions tracker synced with global apply trigger */}
        <Roadmap hasApplied={hasApplied} appliedData={appliedData} />
        
        {/* News with click triggers */}
        <NewsSection
          onSelectNewsArticle={selectedNewsArticle}
          onClearSelectedNewsArticle={() => setSelectedNewsArticle(null)}
        />
        
        {/* CTAs */}
        <CTA
          onOpenContact={() => setIsContactOpen(true)}
        />
      </main>

      {/* Footer bar */}
      <Footer />

      {/* Interstitial Dialog Overlays */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectSchool={handleSelectSchoolFromSearch}
        onSelectNews={handleSelectNewsFromSearch}
      />

      <ApplyModal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        onApplicationSuccess={handleApplicationSuccess}
      />

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
}

