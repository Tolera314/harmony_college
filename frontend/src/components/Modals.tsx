import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, User, Mail, GraduationCap, ArrowRight, ArrowLeft, Send, Phone, Calendar, Check } from 'lucide-react';
import { School, NewsArticle } from '../types';
import { schoolsData } from '../data/schools';
import { newsData } from '../data/news';

const APPLY_PROGRAMS = [
  { group: 'Visual Arts & Photography',  options: ['Photography', 'Videography'] },
  { group: 'Performing Arts & Film',     options: ['Theatrical Art', 'Filmmaking'] },
  { group: 'Music',                      options: ['Music Instruments', 'Vocal Arts'] },
  { group: 'Music Production',           options: ['Cubase & Music Production'] },
  { group: 'Design & Marketing',         options: ['Graphic Design', 'Digital Marketing'] },
  { group: 'Media, IT & Languages',      options: ['Journalism', 'Information Technology (IT)', 'Languages'] },
];

// ── shared input style helper ─────────────────────────────────────────────
const iStyle = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};
const iFocus = (e: React.FocusEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
  (e.target.style.borderColor = '#E9C349');
const iBlur = (e: React.FocusEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
  (e.target.style.borderColor = 'var(--border-default)');

// ── SEARCH MODAL ──────────────────────────────────────────────────────────
interface SearchModalProps {
  isOpen: boolean; onClose: () => void;
  onSelectSchool: (id: string) => void; onSelectNews: (a: NewsArticle) => void;
}

export function SearchModal({ isOpen, onClose, onSelectSchool, onSelectNews }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
  const [filteredNews, setFilteredNews]       = useState<NewsArticle[]>([]);

  useEffect(() => {
    if (!query) { setFilteredSchools([]); setFilteredNews([]); return; }
    const q = query.toLowerCase();
    setFilteredSchools(schoolsData.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.degrees.some(d => d.name.toLowerCase().includes(q))));
    setFilteredNews(newsData.filter(n => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.category.toLowerCase().includes(q)));
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 sm:px-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 backdrop-blur-md" style={{ backgroundColor: 'var(--overlay-modal-bg)' }} />
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="relative w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden z-10"
            style={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--border-default)' }}>
            {/* Input */}
            <div className="flex items-center gap-3 p-5" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <Search className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search programs, schools, departments, news..."
                className="w-full bg-transparent font-sans text-lg focus:outline-none placeholder-gray-400"
                style={{ color: 'var(--text-primary)' }} autoFocus />
              <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto p-5 space-y-6">
              {!query ? (
                <div className="text-center py-10" style={{ color: 'var(--text-secondary)' }}>
                  <p className="font-sans text-sm">Type to begin searching the Harmony ecosystem.</p>
                  <p className="text-xs mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>Try "photography", "music", "design", or "journalism"</p>
                </div>
              ) : filteredSchools.length === 0 && filteredNews.length === 0 ? (
                <div className="text-center py-10" style={{ color: 'var(--text-secondary)' }}>
                  <p className="font-sans text-sm">No results found for &ldquo;{query}&rdquo;.</p>
                </div>
              ) : (
                <>
                  {filteredSchools.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349] mb-3">Academic Ecosystems</h4>
                      <div className="space-y-2">
                        {filteredSchools.map(school => (
                          <div key={school.id} onClick={() => { onSelectSchool(school.id); onClose(); }}
                            className="p-3 rounded-lg cursor-pointer flex justify-between items-center group transition-all"
                            style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(233,195,73,0.30)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'}>
                            <div>
                              <p className="font-sans font-semibold group-hover:text-[#E9C349] transition-colors" style={{ color: 'var(--text-primary)' }}>{school.name}</p>
                              <p className="font-sans text-xs line-clamp-1 mt-0.5" style={{ color: 'var(--text-secondary)' }}>{school.description}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 group-hover:text-[#E9C349] group-hover:translate-x-1 transition-all" style={{ color: 'var(--text-muted)' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {filteredNews.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349] mb-3">Latest From Aurora</h4>
                      <div className="space-y-2">
                        {filteredNews.map(article => (
                          <div key={article.id} onClick={() => { onSelectNews(article); onClose(); }}
                            className="p-3 rounded-lg cursor-pointer flex justify-between items-center group transition-all"
                            style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(233,195,73,0.30)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase bg-[#E9C349]/10 text-[#E9C349]">{article.category}</span>
                                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{article.date}</span>
                              </div>
                              <p className="font-sans font-semibold mt-1 group-hover:text-[#E9C349] transition-colors" style={{ color: 'var(--text-primary)' }}>{article.title}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 group-hover:text-[#E9C349] group-hover:translate-x-1 transition-all" style={{ color: 'var(--text-muted)' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── APPLY MODAL ───────────────────────────────────────────────────────────
interface ApplyModalProps {
  isOpen: boolean; onClose: () => void; onApplicationSuccess: (data: any) => void;
}

export function ApplyModal({ isOpen, onClose, onApplicationSuccess }: ApplyModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', birthDate: '', program: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!formData.fullName.trim()) errs.fullName = 'Full name is required';
      if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Valid email required';
      if (!formData.phone.trim()) errs.phone = 'Phone number required';
      if (!formData.birthDate) errs.birthDate = 'Date of birth required';
    }
    if (step === 2 && !formData.program) errs.program = 'Please select a program';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleResetAndClose = () => { setStep(1); setFormData({ fullName: '', email: '', phone: '', birthDate: '', program: '' }); setErrors({}); onClose(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const params = new URLSearchParams({ name: formData.fullName, email: formData.email, phone: formData.phone, dob: formData.birthDate, program: formData.program });
    onApplicationSuccess(formData);
    onClose();
    router.push(`/apply?${params.toString()}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleResetAndClose} className="fixed inset-0 backdrop-blur-md" style={{ backgroundColor: 'var(--overlay-modal-bg)' }} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl rounded-xl shadow-2xl overflow-hidden z-10"
            style={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--border-default)' }}>
            <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-modal-hdr)' }}>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#E9C349]">Step {step} of 2 · Admission Portal</span>
                <h3 className="font-serif text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Harmony College Application</h3>
              </div>
              <button onClick={handleResetAndClose} className="p-1 rounded-full hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-glass)' }}>
                  <div className="bg-[#E9C349] h-full transition-all duration-300" style={{ width: `${(step / 2) * 100}%` }} />
                </div>

                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <h4 className="font-serif text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Contact & Personal Details</h4>
                    <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>We&apos;ll carry these details into the full application.</p>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <User className="w-3 h-3 text-[#E9C349]" /> Full Name
                      </label>
                      <input type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Abebe Girma" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors" style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                      {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><Mail className="w-3 h-3 text-[#E9C349]" /> Email</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                          placeholder="abebe@example.com" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors" style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                        {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><Phone className="w-3 h-3 text-[#E9C349]" /> Phone</label>
                        <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="09XXXXXXXX" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors" style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                        {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><Calendar className="w-3 h-3 text-[#E9C349]" /> Date of Birth</label>
                      <input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors" style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                      {errors.birthDate && <p className="text-red-500 text-xs">{errors.birthDate}</p>}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <h4 className="font-serif text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Select Your Program</h4>
                    <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>Choose the program you&apos;d like to apply for.</p>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><GraduationCap className="w-3 h-3 text-[#E9C349]" /> Program</label>
                      <select value={formData.program} onChange={e => setFormData({ ...formData, program: e.target.value })}
                        className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors appearance-none" style={iStyle} onFocus={iFocus} onBlur={iBlur}>
                        <option value="" disabled hidden>Select a program…</option>
                        {APPLY_PROGRAMS.map(({ group, options }) => (
                          <optgroup key={group} label={group}>
                            {options.map(o => <option key={o} value={o}>{o}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      {errors.program && <p className="text-red-500 text-xs">{errors.program}</p>}
                    </div>
                    <div className="p-4 rounded-lg text-xs font-sans leading-relaxed" style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      Clicking <strong style={{ color: 'var(--text-primary)' }}>Start Full Application</strong> opens the complete form with your details pre-filled.
                    </div>
                  </motion.div>
                )}

                <div className="pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  {step > 1 ? (
                    <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-xs font-mono uppercase tracking-widest rounded-full transition-colors flex items-center gap-2"
                      style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  ) : <div />}
                  {step < 2 ? (
                    <button type="button" onClick={() => { if (validate()) setStep(2); }}
                      className="px-6 py-2 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded-full font-bold hover:scale-105 transition-all flex items-center gap-2 ml-auto shadow-lg shadow-[#E9C349]/20">
                      Continue <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button type="submit"
                      className="px-8 py-2.5 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded-full font-bold hover:scale-105 transition-all flex items-center gap-2 ml-auto shadow-lg shadow-[#E9C349]/20">
                      Start Full Application <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── CONTACT MODAL ─────────────────────────────────────────────────────────
interface ContactModalProps { isOpen: boolean; onClose: () => void; }

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({ name: '', email: '', topic: 'Admissions Inquiry', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => { setIsSubmitting(false); setIsSuccess(true); }, 1200);
  };

  const handleResetAndClose = () => { setFormData({ name: '', email: '', topic: 'Admissions Inquiry', message: '' }); setIsSuccess(false); onClose(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleResetAndClose} className="fixed inset-0 backdrop-blur-md" style={{ backgroundColor: 'var(--overlay-modal-bg)' }} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden z-10"
            style={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--border-default)' }}>
            <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-modal-hdr)' }}>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#E9C349]">Get in Touch</span>
                <h3 className="font-serif text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Contact Admissions Office</h3>
              </div>
              <button onClick={handleResetAndClose} className="p-1 rounded-full hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[['Your Name','text','name','Jane Smith'],['Email Address','email','email','jane@example.com']].map(([label, type, field, ph]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                      <input required type={type} value={(formData as any)[field]} onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                        placeholder={ph} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors" style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Inquiry Topic</label>
                    <select value={formData.topic} onChange={e => setFormData({ ...formData, topic: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors" style={iStyle} onFocus={iFocus} onBlur={iBlur}>
                      {['Admissions Inquiry','Scholarships & Financial Aid','Campus Tour Booking','Transfer Credits','Other'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Inquiry Message</label>
                    <textarea rows={4} required value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Type your questions here..."
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors resize-none" style={iStyle}
                      onFocus={iFocus as any} onBlur={iBlur as any} />
                  </div>
                  <button type="submit" disabled={isSubmitting}
                    className="w-full py-3 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded-full font-bold hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-[#E9C349]/20">
                    {isSubmitting ? 'Sending...' : 'Send Inquiry'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 bg-[#E9C349]/20 rounded-full flex items-center justify-center mx-auto" style={{ border: '1px solid #E9C349' }}>
                    <Check className="w-6 h-6 text-[#E9C349]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Inquiry Sent!</h4>
                    <p className="font-sans text-xs max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>
                      Thank you, <strong>{formData.name}</strong>. An advisor will contact you at <strong>{formData.email}</strong> within 24 business hours.
                    </p>
                  </div>
                  <button onClick={handleResetAndClose}
                    className="px-6 py-2 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded-full font-bold hover:scale-105 transition-all shadow-lg shadow-[#E9C349]/20">
                    Close Dialog
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
