import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, User, Mail, GraduationCap, ArrowRight, ArrowLeft, Send, Phone, Calendar, Check } from 'lucide-react';
import { School, NewsArticle } from '../types';
import { schoolsData } from '../data/schools';
import { newsData } from '../data/news';

// Programs list (mirrors /apply page)
const APPLY_PROGRAMS = [
  { group: 'Visual Arts & Photography', options: ['Photography', 'Videography'] },
  { group: 'Performing Arts & Film', options: ['Theatrical Art', 'Filmmaking'] },
  { group: 'Music', options: ['Music Instruments', 'Vocal Arts'] },
  { group: 'Music Production', options: ['Cubase & Music Production'] },
  { group: 'Design & Marketing', options: ['Graphic Design', 'Digital Marketing'] },
  { group: 'Media, IT & Languages', options: ['Journalism', 'Information Technology (IT)', 'Languages'] },
];

// ==================== SEARCH MODAL ====================
interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSchool: (schoolId: string) => void;
  onSelectNews: (article: NewsArticle) => void;
}

export function SearchModal({ isOpen, onClose, onSelectSchool, onSelectNews }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>([]);

  useEffect(() => {
    if (!query) {
      setFilteredSchools([]);
      setFilteredNews([]);
      return;
    }

    const lowerQuery = query.toLowerCase();

    const matchedSchools = schoolsData.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery) ||
        s.degrees.some((d) => d.name.toLowerCase().includes(lowerQuery))
    );

    const matchedNews = newsData.filter(
      (n) =>
        n.title.toLowerCase().includes(lowerQuery) ||
        n.summary.toLowerCase().includes(lowerQuery) ||
        n.category.toLowerCase().includes(lowerQuery)
    );

    setFilteredSchools(matchedSchools);
    setFilteredNews(matchedNews);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 sm:px-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="relative w-full max-w-2xl bg-[#1A1A1C] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 p-5 border-b border-white/10">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search programs, schools, departments, news..."
                className="w-full bg-transparent text-white font-sans text-lg focus:outline-none placeholder-gray-500"
                autoFocus
              />
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Results */}
            <div className="max-h-[400px] overflow-y-auto p-5 space-y-6">
              {!query ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="font-sans text-sm">Type to begin searching the Aurora ecosystem.</p>
                  <p className="text-xs text-gray-500 mt-2 font-mono">Try "computing", "quantum", "business", or "finance"</p>
                </div>
              ) : filteredSchools.length === 0 && filteredNews.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="font-sans text-sm">No results found for "{query}".</p>
                  <p className="text-xs text-gray-500 mt-2">Check the spelling or try searching for another academic keyword.</p>
                </div>
              ) : (
                <>
                  {/* Schools / Programs Results */}
                  {filteredSchools.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349] mb-3">Academic Ecosystems</h4>
                      <div className="space-y-2">
                        {filteredSchools.map((school) => (
                          <div
                            key={school.id}
                            onClick={() => {
                              onSelectSchool(school.id);
                              onClose();
                            }}
                            className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#E9C349]/30 transition-all cursor-pointer flex justify-between items-center group"
                          >
                            <div>
                              <p className="font-sans font-semibold text-white group-hover:text-[#E9C349] transition-colors">{school.name}</p>
                              <p className="font-sans text-xs text-gray-400 line-clamp-1 mt-0.5">{school.description}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#E9C349] transform group-hover:translate-x-1 transition-all" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* News Results */}
                  {filteredNews.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349] mb-3">Latest From Aurora</h4>
                      <div className="space-y-2">
                        {filteredNews.map((article) => (
                          <div
                            key={article.id}
                            onClick={() => {
                              onSelectNews(article);
                              onClose();
                            }}
                            className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#E9C349]/30 transition-all cursor-pointer flex justify-between items-center group"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase bg-[#E9C349]/10 text-[#E9C349]">
                                  {article.category}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">{article.date}</span>
                              </div>
                              <p className="font-sans font-semibold text-white group-hover:text-[#E9C349] transition-colors mt-1">{article.title}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#E9C349] transform group-hover:translate-x-1 transition-all" />
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


// ==================== APPLY NOW MODAL ====================
// Lightweight launcher: collects name/email/phone/dob/program then
// redirects to /apply with those as query params so the full form
// is pre-filled. No API calls or partial DB writes from here.

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplicationSuccess: (applicationData: any) => void;
}

export function ApplyModal({ isOpen, onClose, onApplicationSuccess }: ApplyModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    program: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!formData.fullName.trim()) errs.fullName = 'Full name is required';
      if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email))
        errs.email = 'Valid email is required';
      if (!formData.phone.trim()) errs.phone = 'Phone number is required';
      if (!formData.birthDate) errs.birthDate = 'Date of birth is required';
    }
    if (step === 2) {
      if (!formData.program) errs.program = 'Please select a program';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleResetAndClose = () => {
    setStep(1);
    setFormData({ fullName: '', email: '', phone: '', birthDate: '', program: '' });
    setErrors({});
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const params = new URLSearchParams({
      name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      dob: formData.birthDate,
      program: formData.program,
    });
    onApplicationSuccess(formData);
    onClose();
    router.push(`/apply?${params.toString()}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleResetAndClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl bg-[#1A1A1C] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#141313]/60">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#E9C349]">
                  Step {step} of 2 · Admission Portal
                </span>
                <h3 className="font-serif text-xl font-bold text-white mt-1">
                  Harmony College Application
                </h3>
              </div>
              <button
                onClick={handleResetAndClose}
                className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Progress bar */}
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#E9C349] h-full transition-all duration-300"
                    style={{ width: `${(step / 2) * 100}%` }}
                  />
                </div>

                {/* STEP 1 — Personal info */}
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <h4 className="font-serif text-lg font-semibold text-white">Contact & Personal Details</h4>
                    <p className="font-sans text-xs text-gray-400">
                      We'll carry these details into the full application so you don't have to type them twice.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-[#E9C349]" /> Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Abebe Girma"
                        className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2.5 focus:outline-none transition-colors text-sm"
                      />
                      {errors.fullName && <p className="text-red-400 font-sans text-xs">{errors.fullName}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-[#E9C349]" /> Email Address
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="abebe@example.com"
                          className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2.5 focus:outline-none transition-colors text-sm"
                        />
                        {errors.email && <p className="text-red-400 font-sans text-xs">{errors.email}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-[#E9C349]" /> Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="09XXXXXXXX"
                          className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2.5 focus:outline-none transition-colors text-sm"
                        />
                        {errors.phone && <p className="text-red-400 font-sans text-xs">{errors.phone}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-[#E9C349]" /> Date of Birth
                      </label>
                      <input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2.5 focus:outline-none transition-colors text-sm [color-scheme:dark]"
                      />
                      {errors.birthDate && <p className="text-red-400 font-sans text-xs">{errors.birthDate}</p>}
                    </div>
                  </motion.div>
                )}

                {/* STEP 2 — Program selection */}
                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <h4 className="font-serif text-lg font-semibold text-white">Select Your Program</h4>
                    <p className="font-sans text-xs text-gray-400">
                      Choose the program you'd like to apply for. You can update it on the next page.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <GraduationCap className="w-3 h-3 text-[#E9C349]" /> Program
                      </label>
                      <select
                        value={formData.program}
                        onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                        className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2.5 focus:outline-none transition-colors text-sm appearance-none"
                      >
                        <option value="" disabled hidden>Select a program…</option>
                        {APPLY_PROGRAMS.map(({ group, options }) => (
                          <optgroup key={group} label={group}>
                            {options.map((o) => <option key={o} value={o}>{o}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      {errors.program && <p className="text-red-400 font-sans text-xs">{errors.program}</p>}
                    </div>

                    <div className="p-4 rounded-lg bg-white/5 border border-white/5 text-xs font-sans text-gray-400 leading-relaxed">
                      Clicking <strong className="text-white">Start Full Application</strong> opens the complete form with your details pre-filled — including document uploads, address, and account setup.
                    </div>
                  </motion.div>
                )}

                {/* Navigation */}
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 text-xs font-mono uppercase tracking-widest border border-white/10 hover:bg-white/5 rounded-full text-white transition-colors flex items-center gap-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  ) : (
                    <div />
                  )}
                  {step < 2 ? (
                    <button
                      type="button"
                      onClick={() => { if (validate()) setStep(2); }}
                      className="px-6 py-2 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded-full font-bold hover:scale-105 transition-all flex items-center gap-2 ml-auto shadow-lg shadow-[#E9C349]/20"
                    >
                      Continue <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-8 py-2.5 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded-full font-bold hover:scale-105 transition-all flex items-center gap-2 ml-auto shadow-lg shadow-[#E9C349]/20"
                    >
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


// ==================== CONTACT ADMISSIONS MODAL ====================
interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'Admissions Inquiry',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1200);
  };

  const handleResetAndClose = () => {
    setFormData({ name: '', email: '', topic: 'Admissions Inquiry', message: '' });
    setIsSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleResetAndClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#1A1A1C] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#141313]/60">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#E9C349]">
                  Get in Touch
                </span>
                <h3 className="font-serif text-xl font-bold text-white mt-1">Contact Admissions Office</h3>
              </div>
              <button
                onClick={handleResetAndClose}
                className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Your Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Jane Smith"
                      className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2 focus:outline-none transition-colors text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2 focus:outline-none transition-colors text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Inquiry Topic</label>
                    <select
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2 focus:outline-none transition-colors text-sm"
                    >
                      <option value="Admissions Inquiry">Admissions Inquiry</option>
                      <option value="Scholarships & Financial Aid">Scholarships & Financial Aid</option>
                      <option value="Campus Tour Booking">Campus Tour Booking</option>
                      <option value="Transfer Credits">Transfer Credits</option>
                      <option value="Other">Other Topic</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Inquiry Message</label>
                    <textarea
                      rows={4}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Type your questions here..."
                      className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2 focus:outline-none transition-colors text-sm resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded-full font-bold hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-[#E9C349]/20"
                  >
                    {isSubmitting ? 'Sending Request...' : 'Send Inquiry'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 bg-[#E9C349]/20 rounded-full flex items-center justify-center mx-auto border border-[#E9C349]">
                    <Check className="w-6 h-6 text-[#E9C349]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg font-bold text-white">Inquiry Sent!</h4>
                    <p className="font-sans text-xs text-gray-400 max-w-xs mx-auto">
                      Thank you, <strong>{formData.name}</strong>. An advisor from the Admissions Office will contact you at <strong>{formData.email}</strong> within 24 business hours.
                    </p>
                  </div>
                  <button
                    onClick={handleResetAndClose}
                    className="px-6 py-2 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded-full font-bold hover:scale-105 transition-all shadow-lg shadow-[#E9C349]/20"
                  >
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
