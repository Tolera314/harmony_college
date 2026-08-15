import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenApply: () => void;
}

export default function Navbar({ onOpenSearch, onOpenApply }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('About');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Simple active link detection based on scroll position
      const sections = ['about', 'programs', 'admissions', 'campus', 'research'];
      const scrollPosition = window.scrollY + 120;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.charAt(0).toUpperCase() + section.slice(1));
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id.toLowerCase());
    if (element) {
      const offset = 80; // height of sticky nav
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <nav
      role="banner"
      aria-label="Harmony College main navigation"
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 border-b ${
        isScrolled
          ? 'bg-[--bg-base]/90 backdrop-blur-xl py-3 border-[--border-default] shadow-xl'
          : 'bg-transparent py-5 border-transparent'
      }`}
      style={{
        backgroundColor: isScrolled ? undefined : 'transparent',
        borderBottomColor: isScrolled ? 'var(--border-default)' : 'transparent',
      }}
    >
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto flex justify-between items-center">
        {/* Brand Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Harmony College — scroll to top"
          className="flex items-center gap-3 cursor-pointer group ds-focus-ring rounded-xl"
        >
        <Image
            alt=""
            aria-hidden="true"
            width={40}
            height={40}
            className="object-cover rounded-full transition-transform duration-500 group-hover:scale-105"
            src="/logo1.jpg"
            priority
          />
          <div className="flex flex-col" aria-hidden="true">
            <span className="font-serif text-lg tracking-wider font-extrabold" style={{ color: 'var(--text-primary)' }}>
              HARMONY
            </span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#E9C349] -mt-1 font-semibold">
              COLLEGE
            </span>
          </div>
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <ul
            role="list"
            className="flex items-center gap-8 font-sans text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {['About', 'Programs', 'Admissions', 'Campus', 'Research'].map((section) => (
              <li key={section}>
                <button
                  onClick={() => scrollToSection(section)}
                  aria-current={activeSection === section ? 'true' : undefined}
                  className={`hover:text-[#E9C349] transition-all cursor-pointer relative py-1 ds-focus-ring rounded`}
                  style={{ color: activeSection === section ? 'var(--text-primary)' : undefined }}
                >
                  {section}
                  {activeSection === section && (
                    <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#E9C349] rounded-full" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 border-l pl-5" style={{ borderColor: 'var(--border-default)' }}>
            <button
              onClick={onOpenSearch}
              aria-label="Search site"
              className="p-1 rounded-full transition-all cursor-pointer hover:text-[#E9C349]"
              style={{ color: 'var(--text-muted)' }}
            >
              <Search className="w-4 h-4" />
            </button>
            <ThemeToggle />
            <Link
              href="/marketplace"
              className="border border-[#E9C349]/50 text-[#E9C349] px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest hover:bg-[#E9C349]/10 transition-all cursor-pointer hidden lg:inline-flex items-center gap-1.5"
            >
              Marketplace
            </Link>
            <Link
              href="/apply"
              className="bg-[#E9C349] text-black px-6 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-md shadow-[#E9C349]/20 cursor-pointer inline-flex items-center justify-center"
            >
              Apply Now
            </Link>
            <Link
              href="/signin"
              className="border border-[#E9C349] text-[#E9C349] px-6 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest hover:bg-[#E9C349] hover:text-black transition-all cursor-pointer"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Mobile Menu Actions */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            aria-label="Search site"
            className="p-1.5 rounded-full transition-colors hover:text-[#E9C349]"
            style={{ color: 'var(--text-muted)' }}
          >
            <Search className="w-4 h-4" />
          </button>
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="p-1.5 rounded-lg transition-colors ds-focus-ring"
            style={{ color: 'var(--text-muted)' }}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          role="navigation"
          aria-label="Mobile navigation"
          className="md:hidden fixed inset-x-0 top-[4.375rem] border-b p-6 flex flex-col gap-6 shadow-2xl z-30 transition-colors"
          style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-default)' }}
        >
          <ul role="list" className="flex flex-col gap-4 font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {['About', 'Programs', 'Admissions', 'Campus', 'Research'].map((section) => (
              <li key={section}>
                <button
                  onClick={() => scrollToSection(section)}
                  aria-current={activeSection === section ? 'true' : undefined}
                  className={`w-full text-left py-2 hover:text-[#E9C349] transition-all ds-focus-ring rounded`}
                  style={{ color: activeSection === section ? 'var(--text-primary)' : undefined, fontWeight: activeSection === section ? 700 : undefined }}
                >
                  {section}
                </button>
              </li>
            ))}
          </ul>
          <Link
            href="/marketplace"
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full block border border-[#E9C349]/50 text-[#E9C349] py-3 rounded-full text-xs font-mono font-bold uppercase tracking-widest text-center hover:bg-[#E9C349]/10 transition-all"
          >
             Marketplace
          </Link>
          <Link
            href="/apply"
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full block bg-[#E9C349] text-black py-3 rounded-full text-xs font-mono font-bold uppercase tracking-widest text-center shadow-lg shadow-[#E9C349]/20"
          >
            Apply Now
          </Link>
          <Link
            href="/signin"
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full border border-[#E9C349] text-[#E9C349] py-3 rounded-full text-xs font-mono font-bold uppercase tracking-widest text-center hover:bg-[#E9C349] hover:text-black transition-all"
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}
