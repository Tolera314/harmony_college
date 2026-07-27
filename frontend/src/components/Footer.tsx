import React, { useState } from 'react';
import Image from 'next/image';
import { Mail, Send, Check } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please provide a valid email.'); return; }
    setError('');
    setIsSubscribed(true);
    setEmail('');
    setTimeout(() => setIsSubscribed(false), 5000);
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="border-t py-16 font-sans text-xs transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-footer)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
    >
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">

        {/* Brand identity */}
        <div className="md:col-span-5 space-y-6">
          <div className="flex items-center gap-3">
            <Image alt="Harmony College Logo" width={36} height={36} className="object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkk-GfOeeS5kDbA0-xztv8nzqkDrjaLS9xrLYqbgsKDnF3Mgv96Vc6Y3DD4IWBFmoV8u_skSaXfx90BGbNSsit1rc6tnddGQr95P7j0XYaVMT-mv9BIr-INftW65Au2LacF37YGXy4n5CkW1e3oDOI8CUTg4wHCFFuY5-a-_LwZdZbdsruqrfDTWakKwehMJk_9SkFYy9ssYdDjfMKD_e4REWNqaiaoYA9Ppx_gYawAHQQjXFAAHh_uYQcMyOXdTB31Xj6fpKXxQ" />
            <div className="flex flex-col">
              <span className="font-serif text-base tracking-wider font-extrabold" style={{ color: 'var(--text-primary)' }}>HARMONY</span>
              <span className="text-[8px] font-mono tracking-[0.3em] text-[#E9C349] -mt-1 font-semibold">COLLEGE</span>
            </div>
          </div>
          <p className="max-w-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Nurturing creative and professional talent in photography, music, design, and media since 2015. Located in Sheger, Burayu — infront of Burayu City Administration.
          </p>
          <div className="space-y-1" style={{ color: 'var(--text-muted)' }}>
            <p><strong>Address:</strong> Sheger, Burayu, Infront of Burayu City Administration</p>
            <p><strong>Phone:</strong> +251 911 000 000 • admissions@harmonycollege.edu.et</p>
          </div>
        </div>

        {/* Programs links */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Programs</h4>
          <ul className="space-y-2" style={{ color: 'var(--text-secondary)' }}>
            {['Photography & Videography','Theatrical Art & Filmmaking','Music Instruments & Vocal','Cubase Music Production','Graphic Design & Digital Marketing'].map(p => (
              <li key={p}>
                <button onClick={() => document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-[#E9C349] transition-colors cursor-pointer text-left">{p}</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick links */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Quick Links</h4>
          <ul className="space-y-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
            {[['#about','About Harmony'],['#programs','All Programs'],['#admissions','Admissions Guide'],['#campus','Campus Life'],['#research','News & Events']].map(([href, label]) => (
              <li key={label}><a href={href} className="hover:text-[#E9C349] transition-colors">{label}</a></li>
            ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div className="md:col-span-3 space-y-4">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Stay Connected</h4>
          <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Subscribe to our newsletter for updates on new programs, student showcases, and events at Harmony College.
          </p>
          <form onSubmit={handleSubscribe} className="space-y-2">
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="email" placeholder="professor@university.edu" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-full pl-10 pr-12 py-2.5 text-xs focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)', caretColor: '#E9C349',
                }}
                onFocus={e => (e.target.style.borderColor = '#E9C349')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
              />
              <button type="submit" aria-label="Submit newsletter subscription"
                className="absolute right-1.5 p-1.5 rounded-full bg-[#E9C349] hover:bg-white text-black transition-colors cursor-pointer">
                <Send className="w-3 h-3" />
              </button>
            </div>
            {error && <p className="text-red-500 text-[10px] font-mono mt-1 pl-2">{error}</p>}
            {isSubscribed && (
              <p className="text-green-600 text-[10px] font-mono mt-1 pl-2 flex items-center gap-1">
                <Check className="w-3 h-3" /> Registered successfully! Welcome.
              </p>
            )}
          </form>
        </div>
      </div>

      <div
        className="w-full px-6 sm:px-12 max-w-7xl mx-auto mt-16 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono"
        style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-faint)' }}
      >
        <p>&copy; {currentYear} Harmony College. All rights reserved.</p>
        <div className="flex gap-6 uppercase tracking-wider">
          {['Charters & Audits','Privacy Shield','Nondiscrimination Policies'].map(l => (
            <a key={l} href="#about" className="hover:text-[#E9C349] transition-colors">{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}
