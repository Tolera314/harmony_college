import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, FileText, User, Mail, GraduationCap, ArrowRight, ArrowLeft, Check, Send, Phone, Calendar } from 'lucide-react';
import { School, NewsArticle } from '../types';
import { schoolsData } from '../data/schools';
import { newsData } from '../data/news';

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
interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplicationSuccess: (applicationData: any) => void;
}

export function ApplyModal({ isOpen, onClose, onApplicationSuccess }: ApplyModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    // Step 2
    schoolId: 'visual-arts',
    programName: 'Diploma in Professional Photography',
    degreeLevel: 'Undergraduate',
    // Step 3
    currentGPA: '',
    portfolioLink: '',
    personalStatement: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Available degree programs based on selected school
  const currentDegrees = schoolsData.find(s => s.id === formData.schoolId)?.degrees || [];

  useEffect(() => {
    // Keep programName in sync when schoolId changes
    if (currentDegrees.length > 0) {
      setFormData(prev => ({
        ...prev,
        programName: currentDegrees[0].name,
        degreeLevel: currentDegrees[0].level
      }));
    }
  }, [formData.schoolId]);

  const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, schoolId: e.target.value }));
  };

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const matched = currentDegrees.find(d => d.name === e.target.value);
    setFormData(prev => ({
      ...prev,
      programName: e.target.value,
      degreeLevel: matched ? matched.level : 'Undergraduate'
    }));
  };

  const validateStep = (currentStep: number) => {
    const stepErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.fullName.trim()) stepErrors.fullName = 'Full name is required';
      if (!formData.email.trim()) {
        stepErrors.email = 'Email address is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        stepErrors.email = 'Please provide a valid email';
      }
      if (!formData.phone.trim()) stepErrors.phone = 'Phone number is required';
      if (!formData.birthDate) stepErrors.birthDate = 'Date of birth is required';
    }

    if (currentStep === 3) {
      if (!formData.currentGPA.trim()) {
        stepErrors.currentGPA = 'GPA is required';
      } else {
        const gpa = parseFloat(formData.currentGPA);
        if (isNaN(gpa) || gpa < 0 || gpa > 4.0) {
          stepErrors.currentGPA = 'GPA must be a number between 0.0 and 4.0';
        }
      }
      if (!formData.personalStatement.trim()) {
        stepErrors.personalStatement = 'Please provide a brief personal statement';
      } else if (formData.personalStatement.length < 50) {
        stepErrors.personalStatement = 'Statement must be at least 50 characters';
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setIsSubmitting(true);

    // Simulate server side submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      onApplicationSuccess(formData);
    }, 1500);
  };

  const handleResetAndClose = () => {
    setStep(1);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      birthDate: '',
      schoolId: 'visual-arts',
      programName: 'Diploma in Professional Photography',
      degreeLevel: 'Undergraduate',
      currentGPA: '',
      portfolioLink: '',
      personalStatement: '',
    });
    setErrors({});
    setIsSuccess(false);
    onClose();
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
                  {!isSuccess ? `Step ${step} of 3 • Admission Portal` : 'Application Completed'}
                </span>
                <h3 className="font-serif text-xl font-bold text-white mt-1">
                  {!isSuccess ? 'Harmony College Application' : 'Welcome to Harmony!'}
                </h3>
              </div>
              <button
                onClick={handleResetAndClose}
                className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Container */}
            <div className="p-6">
              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Progress Indicator */}
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#E9C349] h-full transition-all duration-300"
                      style={{ width: `${(step / 3) * 100}%` }}
                    />
                  </div>

                  {/* STEP 1: PERSONAL INFORMATION */}
                  {step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <h4 className="font-serif text-lg font-semibold text-white">Contact & Personal Details</h4>
                      <p className="font-sans text-xs text-gray-400">Please provide your legal personal details as they appear on your identification records.</p>
                      
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <User className="w-3 h-3 text-[#E9C349]" /> Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="Johnathan Doe"
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
                            placeholder="john@example.com"
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
                            placeholder="+1 (312) 555-0199"
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

                  {/* STEP 2: ACADEMIC PROGRAM */}
                  {step === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <h4 className="font-serif text-lg font-semibold text-white">Select Academic Pathway</h4>
                      <p className="font-sans text-xs text-gray-400">Choose the specific school and academic cohort you wish to join at Aurora University.</p>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <GraduationCap className="w-3 h-3 text-[#E9C349]" /> Target School
                        </label>
                        <select
                          value={formData.schoolId}
                          onChange={handleSchoolChange}
                          className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2.5 focus:outline-none transition-colors text-sm"
                        >
                          {schoolsData.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-[#E9C349]" /> Degree Program
                        </label>
                        <select
                          value={formData.programName}
                          onChange={handleProgramChange}
                          className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2.5 focus:outline-none transition-colors text-sm"
                        >
                          {currentDegrees.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name} ({d.level})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="p-4 rounded-lg bg-white/5 border border-white/5 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Degree Classification</p>
                          <p className="text-sm font-semibold text-white mt-0.5">{formData.degreeLevel}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Tuition per Credit</p>
                          <p className="text-sm font-semibold text-[#E9C349] mt-0.5">
                            ${schoolsData.find((s) => s.id === formData.schoolId)?.tuitionPerCredit || 0} USD
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: PORTFOLIO & STATEMENT */}
                  {step === 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <h4 className="font-serif text-lg font-semibold text-white">Qualifications & Narrative</h4>
                      <p className="font-sans text-xs text-gray-400">Submit your academic achievements and a brief statement explaining your ambition.</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
                            Cumulative GPA (4.0 scale)
                          </label>
                          <input
                            type="text"
                            value={formData.currentGPA}
                            onChange={(e) => setFormData({ ...formData, currentGPA: e.target.value })}
                            placeholder="3.85"
                            className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2.5 focus:outline-none transition-colors text-sm"
                          />
                          {errors.currentGPA && <p className="text-red-400 font-sans text-xs">{errors.currentGPA}</p>}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
                            Portfolio or GitHub Link (Optional)
                          </label>
                          <input
                            type="url"
                            value={formData.portfolioLink}
                            onChange={(e) => setFormData({ ...formData, portfolioLink: e.target.value })}
                            placeholder="https://github.com/myname"
                            className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2.5 focus:outline-none transition-colors text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
                          Personal Statement / Ambition (min 50 chars)
                        </label>
                        <textarea
                          rows={4}
                          value={formData.personalStatement}
                          onChange={(e) => setFormData({ ...formData, personalStatement: e.target.value })}
                          placeholder="Tell us what you want to achieve at Aurora and how your background drives you..."
                          className="w-full bg-[#141313] border border-white/10 focus:border-[#E9C349] text-white font-sans rounded-lg px-3 py-2.5 focus:outline-none transition-colors text-sm resize-none"
                        />
                        {errors.personalStatement && <p className="text-red-400 font-sans text-xs">{errors.personalStatement}</p>}
                      </div>
                    </motion.div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={handlePrev}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-xs font-mono uppercase tracking-widest border border-white/10 hover:bg-white/5 rounded-full text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>
                    ) : (
                      <div />
                    )}

                    {step < 3 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="px-6 py-2 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded-full font-bold hover:scale-105 transition-all flex items-center gap-2 ml-auto shadow-lg shadow-[#E9C349]/20"
                      >
                        Continue <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 py-2.5 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded-full font-bold hover:scale-105 transition-all flex items-center gap-2 ml-auto disabled:opacity-50 shadow-lg shadow-[#E9C349]/20"
                      >
                        {isSubmitting ? (
                          'Submitting...'
                        ) : (
                          <>
                            Submit Application <Send className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                /* Success Screen */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8 space-y-6"
                >
                  <div className="w-16 h-16 bg-[#E9C349]/20 rounded-full flex items-center justify-center mx-auto border border-[#E9C349]">
                    <Check className="w-8 h-8 text-[#E9C349]" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-serif text-2xl font-bold text-white">Application Received!</h4>
                    <p className="font-sans text-sm text-gray-400 max-w-sm mx-auto">
                      Congratulations, <strong>{formData.fullName}</strong>! Your academic portfolio for the{' '}
                      <strong>{formData.programName}</strong> has been logged in our registry.
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 max-w-sm mx-auto border border-white/5 text-left text-xs space-y-1.5">
                    <p className="text-gray-400 font-sans">
                      <strong className="text-white">Application ID:</strong> AR-{Math.floor(100000 + Math.random() * 900000)}
                    </p>
                    <p className="text-gray-400 font-sans">
                      <strong className="text-white">Reviewing Body:</strong> Harmony College Admissions Office
                    </p>
                          <strong className="text-white">Est. Notification Date:</strong> August 15, 2026
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono italic">
                    Your Roadmap has updated to 25% complete. Step 2: Portfolio Review has been initialized.
                  </p>
                  <button
                    onClick={handleResetAndClose}
                    className="px-8 py-3 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded-full font-bold hover:scale-105 transition-all shadow-lg shadow-[#E9C349]/20"
                  >
                    Return to Portal
                  </button>
                </motion.div>
              )}
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
