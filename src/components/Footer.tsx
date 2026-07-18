import React, { useState } from 'react';
import { Mail, Send, Check } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please provide a valid email.');
      return;
    }

    setError('');
    setIsSubscribed(true);
    setEmail('');
    setTimeout(() => setIsSubscribed(false), 5000);
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0A0A0B] border-t border-white/5 py-16 text-gray-500 font-sans text-xs">
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
        
        {/* Brand identity */}
        <div className="md:col-span-5 space-y-6">
          <div className="flex items-center gap-3">
            <img
              alt="Harmony College Logo"
              className="h-9 w-9 object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkk-GfOeeS5kDbA0-xztv8nzqkDrjaLS9xrLYqbgsKDnF3Mgv96Vc6Y3DD4IWBFmoV8u_skSaXfx90BGbNSsit1rc6tnddGQr95P7j0XYaVMT-mv9BIr-INftW65Au2LacF37YGXy4n5CkW1e3oDOI8CUTg4wHCFFuY5-a-_LwZdZbdsruqrfDTWakKwehMJk_9SkFYy9ssYdDjfMKD_e4REWNqaiaoYA9Ppx_gYawAHQQjXFAAHh_uYQcMyOXdTB31Xj6fpKXxQ"
            />
            <div className="flex flex-col">
              <span className="font-serif text-base tracking-wider font-extrabold text-white">
                HARMONY
              </span>
              <span className="text-[8px] font-mono tracking-[0.3em] text-[#E9C349] -mt-1 font-semibold">
                COLLEGE
              </span>
            </div>
          </div>

          <p className="text-gray-400 max-w-sm leading-relaxed">
            Nurturing creative and professional talent in photography, music, design, and media since 2015. Located in Sheger, Burayu — infront of Burayu City Administration.
          </p>

          <div className="space-y-1 text-gray-500">
            <p><strong>Address:</strong> Sheger, Burayu, Infront of Burayu City Administration</p>
            <p><strong>Phone:</strong> +251 911 000 000 • admissions@harmonycollege.edu.et</p>
          </div>
        </div>

        {/* Academic Column links */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
            Programs
          </h4>
          <ul className="space-y-2 text-gray-400">
            <li><button onClick={() => document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#E9C349] transition-colors cursor-pointer">Photography & Videography</button></li>
            <li><button onClick={() => document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#E9C349] transition-colors cursor-pointer">Theatrical Art & Filmmaking</button></li>
            <li><button onClick={() => document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#E9C349] transition-colors cursor-pointer">Music Instruments & Vocal</button></li>
            <li><button onClick={() => document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#E9C349] transition-colors cursor-pointer">Cubase Music Production</button></li>
            <li><button onClick={() => document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#E9C349] transition-colors cursor-pointer">Graphic Design & Digital Marketing</button></li>
          </ul>
        </div>

        {/* Portals / Info Column */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
            Quick Links
          </h4>
          <ul className="space-y-2 text-gray-400 font-medium">
            <li><a href="#about" className="hover:text-[#E9C349] transition-colors">About Harmony</a></li>
            <li><a href="#programs" className="hover:text-[#E9C349] transition-colors">All Programs</a></li>
            <li><a href="#admissions" className="hover:text-[#E9C349] transition-colors">Admissions Guide</a></li>
            <li><a href="#campus" className="hover:text-[#E9C349] transition-colors">Campus Life</a></li>
            <li><a href="#research" className="hover:text-[#E9C349] transition-colors">News & Events</a></li>
          </ul>
        </div>

        {/* Newsletter Signup Form Widget */}
        <div className="md:col-span-3 space-y-4">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
            Stay Connected
          </h4>
          <p className="text-gray-400 leading-relaxed">
            Subscribe to our newsletter for updates on new programs, student showcases, and events at Harmony College.
          </p>

          <form onSubmit={handleSubscribe} className="space-y-2">
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-gray-500" />
              <input
                type="email"
                placeholder="professor@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-white/5 focus:border-[#E9C349] rounded-full pl-10 pr-12 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                aria-label="Submit newsletter subscription"
                className="absolute right-1.5 p-1.5 rounded-full bg-[#E9C349] hover:bg-white text-black transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>

            {error && <p className="text-red-400 text-[10px] font-mono mt-1 pl-2">{error}</p>}
            
            {isSubscribed && (
              <p className="text-green-400 text-[10px] font-mono mt-1 pl-2 flex items-center gap-1">
                <Check className="w-3 h-3" /> Registered successfully! Welcome.
              </p>
            )}
          </form>
        </div>
      </div>

      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-gray-600 font-mono">
        <p>&copy; {currentYear} Harmony College. All rights reserved.</p>
        <div className="flex gap-6 uppercase tracking-wider">
          <a href="#about" className="hover:text-[#E9C349] transition-colors">Charters & Audits</a>
          <a href="#about" className="hover:text-[#E9C349] transition-colors">Privacy Shield</a>
          <a href="#about" className="hover:text-[#E9C349] transition-colors">Nondiscrimination Policies</a>
        </div>
      </div>
    </footer>
  );
}
