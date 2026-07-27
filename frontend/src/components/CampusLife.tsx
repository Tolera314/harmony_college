import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Users, Check, MapPin, X, Bookmark } from 'lucide-react';

interface GalleryItem {
  id: string; title: string; category: string; description: string;
  hours: string; location: string; capacity: string; image: string; span: string;
}

export default function CampusLife() {
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);
  const [occupancy, setOccupancy] = useState<Record<string, number>>({ library: 65, cafe: 82, athletics: 40, conservatory: 25 });
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [isBooked, setIsBooked] = useState(false);
  const [myBookings, setMyBookings] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('aurora_reservations');
    if (saved) setMyBookings(JSON.parse(saved));
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);
    const interval = setInterval(() => {
      setOccupancy(p => ({
        library: Math.min(95, Math.max(30, p.library + (Math.random() > .5 ? 2 : -2))),
        cafe: Math.min(98, Math.max(20, p.cafe + (Math.random() > .5 ? 3 : -3))),
        athletics: Math.min(90, Math.max(15, p.athletics + (Math.random() > .5 ? 4 : -4))),
        conservatory: Math.min(75, Math.max(10, p.conservatory + (Math.random() > .5 ? 1 : -1))),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const galleryItems: GalleryItem[] = [
    { id: 'library', title: 'Historical Sterling Library', category: 'Academic Sanctuary', description: 'Built in 1895 and modernized in 2024, housing over 1.2 million volumes, holographic study bays, and collaborative research pods.', hours: 'Open 24/7 for Scholars', location: 'Central Quadrangle, Wing B', capacity: '850 Studious Seats', image: 'library.png', span: 'lg:col-span-4 lg:row-span-2' },
    { id: 'cafe', title: 'The Golden Crest Café & Commons', category: 'Student Hub', description: 'An organic, artisan coffee house and cooperative student dining center. Serving shade-grown coffee and fresh bakes.', hours: '7:00 AM - 11:00 PM Daily', location: 'Student Union, Level 1', capacity: '240 Social Spots', image: 'cafe.png', span: 'lg:col-span-4' },
    { id: 'athletics', title: 'Vance High-Performance Athletics Center', category: 'Recreational Arena', description: 'Featuring Olympic-sized indoor swimming pools, custom running loops, weightrooms, and physiological tracking centers.', hours: '5:00 AM - Midnight Daily', location: 'West Campus Athletic Complex', capacity: '400 Active Slots', image: 'athletics.png', span: 'lg:col-span-4' },
    { id: 'conservatory', title: 'Botanical Research Conservatory', category: 'Eco-Living Lab', description: 'A massive temperature-controlled biome housing over 400 species of tropical and arid plants for research and quiet study.', hours: '8:00 AM - 8:00 PM Daily', location: 'East Campus Biosphere Area', capacity: '80 Serene Benches', image: 'Botanical.png', span: 'lg:col-span-8' },
  ];

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    const newBooking = { id: `RES-${Date.now()}`, locationName: activeItem.title, locationId: activeItem.id, date: bookingDate, time: bookingTime, createdAt: new Date().toLocaleDateString() };
    const updated = [newBooking, ...myBookings];
    setMyBookings(updated);
    localStorage.setItem('aurora_reservations', JSON.stringify(updated));
    setIsBooked(true);
    setTimeout(() => setIsBooked(false), 4000);
  };

  const handleCancelBooking = (id: string) => {
    const updated = myBookings.filter(b => b.id !== id);
    setMyBookings(updated);
    localStorage.setItem('aurora_reservations', JSON.stringify(updated));
  };

  return (
    <section id="campus" className="py-24 relative transition-colors duration-300" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16 space-y-4">
          <span className="text-[#E9C349] font-sans text-[10px] font-bold uppercase tracking-[0.25em] block">Life on Campus</span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
            A sanctuary for innovation and personal growth, where heritage meets the future.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 auto-rows-[250px]">
          {galleryItems.map(item => (
            <div key={item.id} onClick={() => { setActiveItem(item); setIsBooked(false); }}
              className={`group relative rounded-xl overflow-hidden cursor-pointer shadow-xl transition-all ${item.span}`}
              style={{ border: '1px solid var(--border-card)', backgroundColor: 'var(--bg-card)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-card)'}
            >
              <img className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] group-hover:scale-105 group-hover:brightness-[0.45] transition-all duration-700"
                alt={item.title} src={item.image} loading="lazy" decoding="async" />
              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between z-10">
                <span className="px-2.5 py-1 rounded bg-black/60 text-[9px] font-mono uppercase tracking-widest text-white w-fit"
                  style={{ border: '1px solid rgba(255,255,255,0.10)' }}>{item.category}</span>
                <div className="space-y-2">
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white group-hover:text-[#E9C349] transition-colors">{item.title}</h3>
                  <p className="font-sans text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2 max-w-xl">{item.description}</p>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-gray-400 pt-1 group-hover:text-[#E9C349] transition-colors">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {item.hours}</span>
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Live Load: {occupancy[item.id] || 50}%</span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 z-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox modal */}
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveItem(null)} className="fixed inset-0 backdrop-blur-md"
              style={{ backgroundColor: 'var(--overlay-dark-bg)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl z-10 grid md:grid-cols-12"
              style={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--border-default)' }}>
              <button onClick={() => setActiveItem(null)}
                className="absolute top-4 right-4 z-30 p-1.5 rounded-full bg-black/60 text-gray-300 hover:text-white hover:scale-105 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
                <X className="w-5 h-5" />
              </button>
              <div className="md:col-span-7 relative h-[250px] md:h-full min-h-[300px]">
                <img className="w-full h-full object-cover filter brightness-[0.7]" alt={activeItem.title} src={activeItem.image} loading="lazy" decoding="async" />
                <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to top, var(--bg-modal), transparent)' }} />
                <div className="absolute bottom-6 left-6 right-6 z-20 space-y-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-[#E9C349]/20 text-[#E9C349]"
                    style={{ border: '1px solid rgba(233,195,73,0.30)' }}>{activeItem.category}</span>
                  <h3 className="font-serif text-2xl font-bold text-white leading-tight">{activeItem.title}</h3>
                  <div className="flex flex-col gap-1.5 text-xs font-mono text-gray-300 pt-1">
                    <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#E9C349]" /> {activeItem.location}</span>
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#E9C349]" /> {activeItem.hours}</span>
                    <span className="flex items-center gap-2"><Users className="w-4 h-4 text-[#E9C349]" /> {activeItem.capacity}</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6"
                style={{ backgroundColor: 'var(--bg-modal-hdr)', borderLeft: '1px solid var(--border-subtle)' }}>
                <div className="space-y-4">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349]">About This Sanctuary</h4>
                  <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{activeItem.description}</p>
                </div>
                <div className="h-px" style={{ backgroundColor: 'var(--border-default)' }} />
                <form onSubmit={handleBooking} className="space-y-4">
                  <div>
                    <h5 className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 mb-2" style={{ color: 'var(--text-muted)' }}>
                      <Bookmark className="w-3.5 h-3.5 text-[#E9C349]" /> Desk / Room Reservation
                    </h5>
                    <p className="text-[11px] font-sans" style={{ color: 'var(--text-muted)' }}>Book a collaborative study capsule or quiet table ahead of time.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Target Date</label>
                      <input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)}
                        className="w-full rounded px-2.5 py-1.5 text-xs focus:outline-none [color-scheme:dark] transition-colors"
                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        onFocus={e => (e.target.style.borderColor = '#E9C349')} onBlur={e => (e.target.style.borderColor = 'var(--border-default)')} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Target Time</label>
                      <select value={bookingTime} onChange={e => setBookingTime(e.target.value)}
                        className="w-full rounded px-2.5 py-1.5 text-xs focus:outline-none transition-colors"
                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                        {['08:00 AM','10:00 AM','12:00 PM','02:00 PM','04:00 PM','06:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded font-bold hover:scale-[1.02] transition-transform shadow-md shadow-[#E9C349]/10">
                    Confirm Booking
                  </button>
                </form>
                {isBooked && (
                  <div className="p-3 rounded text-[11px] font-sans flex items-center gap-2"
                    style={{ backgroundColor: 'rgba(21,128,61,0.10)', border: '1px solid rgba(21,128,61,0.30)', color: '#16a34a' }}>
                    <Check className="w-4 h-4 flex-shrink-0" /><span>Slot saved!</span>
                  </div>
                )}
                {myBookings.filter(b => b.locationId === activeItem.id).length > 0 && (
                  <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <p className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>Your Active Holds</p>
                    {myBookings.filter(b => b.locationId === activeItem.id).map(b => (
                      <div key={b.id} className="flex items-center justify-between p-2 rounded text-[10px] font-mono"
                        style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{b.date} • {b.time}</p>
                          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{b.id}</p>
                        </div>
                        <button onClick={() => handleCancelBooking(b.id)} className="text-red-500 hover:text-red-400 font-bold uppercase text-[9px] transition-colors">Cancel</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
