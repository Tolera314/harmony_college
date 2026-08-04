'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette, Music, Mic2, Camera, BookOpen, Award,
  MapPin, Users, GraduationCap, Star, ChevronRight, Landmark,
} from 'lucide-react';

// ── Program categories ────────────────────────────────────────────────────────
const programs = [
  {
    id: 'photo',
    icon: <Camera className="w-6 h-6" />,
    color: '#E9C349',
    title: 'Photography & Videography',
    desc: 'Professional photography and videography training using industry-standard equipment and techniques.',
    highlights: ['Studio Photography', 'Outdoor & Event Photography', 'Video Production', 'Photo & Video Editing'],
  },
  {
    id: 'film',
    icon: <Mic2 className="w-6 h-6" />,
    color: '#f87171',
    title: 'Theatrical Art & Filmmaking',
    desc: 'Acting, stage direction, screenwriting, and digital filmmaking rooted in Ethiopian storytelling tradition.',
    highlights: ['Acting & Stage Direction', 'Screenwriting & Directing', 'Digital Cinematography', 'Film Production'],
  },
  {
    id: 'music',
    icon: <Music className="w-6 h-6" />,
    color: '#60a5fa',
    title: 'Music Instruments & Vocal',
    desc: 'Classical and contemporary music training covering instruments, vocal performance, and music theory.',
    highlights: ['Guitar, Piano & Keyboard', 'Vocal Arts & Performance', 'Music Theory', 'Band & Ensemble'],
  },
  {
    id: 'cubase',
    icon: <Palette className="w-6 h-6" />,
    color: '#a78bfa',
    title: 'Cubase Music Production',
    desc: 'Professional music production using Cubase — from beat making to mixing, mastering, and sound design.',
    highlights: ['Beat Making & Composition', 'Recording & Mixing', 'Mastering & Sound Design', 'Studio Operations'],
  },
  {
    id: 'design',
    icon: <Palette className="w-6 h-6" />,
    color: '#34d399',
    title: 'Graphic Design',
    desc: 'Brand identity, visual communication, and digital design using Adobe Creative Suite.',
    highlights: ['Brand Identity & Logos', 'Print & Digital Layout', 'Adobe Photoshop & Illustrator', 'Typography & Color'],
  },
  {
    id: 'marketing',
    icon: <BookOpen className="w-6 h-6" />,
    color: '#fb923c',
    title: 'Digital Marketing',
    desc: 'Social media marketing, content creation, SEO, and digital advertising for modern businesses.',
    highlights: ['Social Media Strategy', 'Content Creation', 'SEO & Google Ads', 'Analytics & Reporting'],
  },
  {
    id: 'journalism',
    icon: <BookOpen className="w-6 h-6" />,
    color: '#f59e0b',
    title: 'Journalism',
    desc: 'Broadcast and print journalism, media ethics, reporting, and news production.',
    highlights: ['News Writing & Reporting', 'Broadcast Journalism', 'Media Ethics', 'Investigative Journalism'],
  },
  {
    id: 'it',
    icon: <BookOpen className="w-6 h-6" />,
    color: '#22d3ee',
    title: 'Information Technology (IT)',
    desc: 'Computer science, networking, software development, and digital literacy skills.',
    highlights: ['Programming & Web Development', 'Networking & Systems', 'Database Management', 'Cybersecurity Basics'],
  },
  {
    id: 'languages',
    icon: <BookOpen className="w-6 h-6" />,
    color: '#e879f9',
    title: 'Languages',
    desc: 'English, Arabic, French, and other language courses for professional and academic communication.',
    highlights: ['English for Communication', 'Arabic Language', 'French Language', 'Business Language Skills'],
  },
  {
    id: 'pharmacy',
    icon: <Award className="w-6 h-6" />,
    color: '#4ade80',
    title: 'Pharmacy',
    desc: 'Pharmaceutical sciences, drug dispensing, and healthcare fundamentals for pharmacy professionals.',
    highlights: ['Pharmaceutical Sciences', 'Drug Dispensing & Safety', 'Healthcare Fundamentals', 'Clinical Pharmacy'],
  },
];

// ── Why Harmony facts ─────────────────────────────────────────────────────────
const facts = [
  { icon: <MapPin className="w-5 h-5" />, label: 'Location', value: 'Sheger, Burayu · Addis Ababa' },
  { icon: <GraduationCap className="w-5 h-5" />, label: 'Programs', value: '12+ Undergraduate & Postgraduate' },
  { icon: <Users className="w-5 h-5" />, label: 'Students', value: '1,800+ Enrolled' },
  { icon: <Award className="w-5 h-5" />, label: 'Faculty', value: '60+ Expert Instructors' },
  { icon: <Star className="w-5 h-5" />, label: 'Established', value: 'Sheger City Licensed' },
  { icon: <Landmark className="w-5 h-5" />, label: 'Language', value: 'Amharic & English Medium' },
];

// ── Component ─────────────────────────────────────────────────────────────────
interface RoadmapProps {
  hasApplied?: boolean;
  appliedData?: unknown;
}

export default function Roadmap({ hasApplied, appliedData }: RoadmapProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false, 4: false });
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [calcGPA, setCalcGPA] = useState('3.8');
  const [calcSAT, setCalcSAT] = useState('1450');
  const [acceptanceChance, setAcceptanceChance] = useState<number | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewer, setInterviewer] = useState('Ato Biruk Tadesse');
  const [interviewBooked, setInterviewBooked] = useState(false);
  const [signedConduct, setSignedConduct] = useState(false);

  useEffect(() => {
    if (hasApplied) {
      setCompletedSteps(p => ({ ...p, 1: true }));
      setUploadedFileName('Harmony_Application_Form_Submitted.pdf');
    }
  }, [hasApplied]);

  const handleCalculateChance = (e: React.FormEvent) => {
    e.preventDefault();
    const gpa = parseFloat(calcGPA); const sat = parseInt(calcSAT);
    if (isNaN(gpa) || gpa < 0 || gpa > 4.0 || isNaN(sat) || sat < 400 || sat > 1600) return;
    const finalChance = Math.min(99, Math.max(10, Math.round(gpa * 15 + ((sat - 400) / 1200) * 40)));
    setAcceptanceChance(finalChance);
    setCompletedSteps(p => ({ ...p, 2: true }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]?.type === 'application/pdf') {
      setUploadedFileName(e.dataTransfer.files[0].name);
      setCompletedSteps(p => ({ ...p, 1: true }));
    } else {
      // Invalid file type — silently ignore or show inline error
    }
  };

  const handleManualFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { setUploadedFileName(e.target.files[0].name); setCompletedSteps(p => ({ ...p, 1: true })); }
  };

  const handleBookInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewDate) return;
    setInterviewBooked(true);
    setCompletedSteps(p => ({ ...p, 3: true }));
  };

  const numCompleted = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = (numCompleted / 4) * 100;

  const stepsData = [
    { id: 1, title: 'Submit Application', sub: 'Deliver transcript & portfolios.', icon: FileText, desc: 'The first step in your journey at Harmony College is submitting your details and choosing your preferred program.' },
    { id: 2, title: 'Portfolio Review', sub: 'Ecosystem matching assessment.', icon: Award, desc: 'Our instructors review your application and creative background to match you with the right program track.' },
    { id: 3, title: 'Academic Interview', sub: 'Collaborative vision alignment.', icon: Calendar, desc: 'A short 15-minute session with your department instructor to discuss your creative goals and program expectations.' },
    { id: 4, title: 'Final Enrollment', sub: 'Matriculate & secure residency.', icon: CheckCircle2, desc: 'Complete enrollment by paying the registration fee, signing the student code of conduct, and receiving your student ID.' },
  ];

  // shared input style helper
  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.target.style.borderColor = '#E9C349');
  const inputBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.target.style.borderColor = 'var(--border-default)');

  return (
    <section id="admissions" className="py-24 relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* Background glow */}
      <div className="absolute top-1/3 -right-64 w-[500px] h-[500px] bg-[#E9C349]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#E9C349]/3 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto space-y-20">

        {/* ── Section header ───────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-[#E9C349] font-sans text-[10px] font-bold uppercase tracking-[0.25em] mb-4 block">
            Our Programs
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-extrabold leading-tight"
            style={{ color: 'var(--text-primary)' }}>
            Creative Education for Ethiopia&apos;s Next Generation
          </h2>
          <p className="font-sans text-sm mt-4 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}>
            Harmony College offers industry-focused creative arts and professional programs
            in the heart of Sheger City — bridging Ethiopian cultural heritage with modern creative careers.
          </p>
        </div>

        {/* ── Program explorer ─────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Left — tab list */}
          <div className="lg:col-span-4 space-y-2">
            {programs.map((p) => {
              const isActive = activeProgram === p.id;
              return (
                <motion.button
                  key={p.id}
                  onClick={() => setActiveProgram(p.id)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all"
                  style={{
                    backgroundColor: isActive ? `${p.color}18` : 'var(--bg-glass)',
                    border: `1px solid ${isActive ? `${p.color}40` : 'var(--border-subtle)'}`,
                  }}
                >
                  <span style={{ color: isActive ? p.color : 'var(--text-muted)' }}>
                    {p.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm font-bold truncate"
                      style={{ color: isActive ? p.color : 'var(--text-primary)' }}>
                      {p.title}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 transition-transform"
                    style={{ color: isActive ? p.color : 'var(--text-muted)', transform: isActive ? 'rotate(90deg)' : 'none' }} />
                </motion.button>
              );
            })}
          </div>

          {/* Right — detail panel */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl p-8 space-y-6 shadow-2xl"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: `1px solid ${current.color}25`,
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Header */}
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${current.color}18`, border: `1px solid ${current.color}30`, color: current.color }}>
                    <span style={{ color: current.color }}>{current.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {current.title}
                    </h3>
                    <p className="font-sans text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {current.desc}
                    </p>
                  </div>
                </div>

                <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

                {/* Highlights */}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                    Courses Offered
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {current.highlights.map((h) => (
                      <div key={h}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: current.color }} />
                        <span className="font-sans text-sm" style={{ color: 'var(--text-primary)' }}>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-3 flex-wrap pt-2">
                  <button
                    onClick={() => document.getElementById('apply-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-6 py-2.5 rounded-xl font-sans text-sm font-bold transition-all hover:scale-105"
                    style={{ backgroundColor: current.color, color: '#0F0F10' }}
                  >
                    Apply to This Program
                  </button>
                  <button
                    onClick={() => document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-6 py-2.5 rounded-xl font-sans text-sm font-medium transition-all border"
                    style={{ color: current.color, borderColor: `${current.color}40` }}
                  >
                    View All Courses
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── College facts strip ───────────────────────────────────────────── */}
        <div>
          <p className="text-center font-mono text-[10px] uppercase tracking-widest mb-8"
            style={{ color: 'var(--text-muted)' }}>
            Harmony College at a Glance
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {facts.map((f) => (
              <motion.div
                key={f.label}
                whileHover={{ y: -4 }}
                className="flex flex-col items-center text-center gap-2 px-4 py-5 rounded-2xl"
                style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[#E9C349]">{f.icon}</span>
                <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {f.label}
                </span>
                <span className="font-serif text-xs font-bold text-center leading-tight"
                  style={{ color: 'var(--text-primary)' }}>
                  {f.value}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
