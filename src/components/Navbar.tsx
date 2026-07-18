import React, { useState, useEffect } from 'react';
import { Menu, Search, X } from 'lucide-react';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenApply: () => void;
}

export default function Navbar({ onOpenSearch, onOpenApply }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('about');

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
            setActiveSection(section);
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
    const element = document.getElementById(id);
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
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 border-b ${
        isScrolled
          ? 'bg-[#0F0F10]/90 backdrop-blur-xl py-3 border-white/10 shadow-xl'
          : 'bg-transparent py-5 border-white/5'
      }`}
    >
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto flex justify-between items-center">
        {/* Brand Logo */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img
            alt="Harmony College Logo"
            className="h-10 w-10 object-contain transition-transform duration-500 group-hover:rotate-[360deg]"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkk-GfOeeS5kDbA0-xztv8nzqkDrjaLS9xrLYqbgsKDnF3Mgv96Vc6Y3DD4IWBFmoV8u_skSaXfx90BGbNSsit1rc6tnddGQr95P7j0XYaVMT-mv9BIr-INftW65Au2LacF37YGXy4n5CkW1e3oDOI8CUTg4wHCFFuY5-a-_LwZdZbdsruqrfDTWakKwehMJk_9SkFYy9ssYdDjfMKD_e4REWNqaiaoYA9Ppx_gYawAHQQjXFAAHh_uYQcMyOXdTB31Xj6fpKXxQ"
          />
          <div className="flex flex-col">
            <span className="font-serif text-lg tracking-wider font-extrabold text-white">
              HARMONY
            </span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#E9C349] -mt-1 font-semibold">
              COLLEGE
            </span>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <ul className="flex items-center gap-8 font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">
            {['about', 'programs', 'admissions', 'campus', 'research'].map((section) => (
              <li key={section}>
                <button
                  onClick={() => scrollToSection(section)}
                  className={`hover:text-[#E9C349] transition-all cursor-pointer relative py-1 ${
                    activeSection === section ? 'text-white' : ''
                  }`}
                >
                  {section}
                  {activeSection === section && (
                    <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#E9C349] rounded-full" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-5 border-l border-white/10 pl-5">
            <button
              onClick={onOpenSearch}
              aria-label="Search site"
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenApply}
              className="bg-[#E9C349] text-black px-6 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-md shadow-[#E9C349]/20 cursor-pointer"
            >
              Apply Now
            </button>
          </div>
        </div>

        {/* Mobile Menu Actions */}
        <div className="md:hidden flex items-center gap-4">
          <button
            onClick={onOpenSearch}
            aria-label="Search site"
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[70px] bg-[#0F0F10] border-b border-white/10 p-6 flex flex-col gap-6 shadow-2xl z-30">
          <ul className="flex flex-col gap-4 font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">
            {['about', 'programs', 'admissions', 'campus', 'research'].map((section) => (
              <li key={section}>
                <button
                  onClick={() => scrollToSection(section)}
                  className={`w-full text-left py-2 hover:text-[#E9C349] transition-all ${
                    activeSection === section ? 'text-white font-bold' : ''
                  }`}
                >
                  {section}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenApply();
            }}
            className="w-full bg-[#E9C349] text-black py-3 rounded-full text-xs font-mono font-bold uppercase tracking-widest text-center shadow-lg shadow-[#E9C349]/20"
          >
            Apply Now
          </button>
        </div>
      )}
    </nav>
  );
}
