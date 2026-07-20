'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, User, Mail, Phone, MapPin, 
  FileText, Camera, UploadCloud, ArrowRight, 
  CheckCircle2, BookOpen, Users, Award, Calendar, Flag,
  Edit2, FileCheck2, Lock, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

// ─── Harmony College programs ────────────────────────────────────────────────
const PROGRAMS = [
  { group: 'Visual Arts & Photography', options: ['Photography', 'Videography'] },
  { group: 'Performing Arts & Film', options: ['Theatrical Art', 'Filmmaking'] },
  { group: 'Music', options: ['Music Instruments', 'Vocal Arts'] },
  { group: 'Music Production', options: ['Cubase & Music Production'] },
  { group: 'Design & Marketing', options: ['Graphic Design', 'Digital Marketing'] },
  { group: 'Media, IT & Languages', options: ['Journalism', 'Information Technology (IT)', 'Languages'] },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface DocState {
  file: File | null;
  url: string;
  uploading: boolean;
  error: string;
}

const emptyDoc = (): DocState => ({ file: null, url: '', uploading: false, error: '' });

interface FormData {
  fullName: string; dob: string; age: string; gender: string;
  nationality: string; phone: string; emergencyContact: string;
  email: string; password: string; city: string; address: string;
  program: string; academicYear: string; semester: string; studyMode: string;
}

// ─── FileUploadCard (real upload) ────────────────────────────────────────────
function FileUploadCard({
  title,
  docState,
  onUpload,
}: {
  title: string;
  docState: DocState;
  onUpload: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (file: File) => {
    if (file) onUpload(file);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-6 transition-all relative overflow-hidden flex flex-col justify-center items-center cursor-pointer
        ${isDragging ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-white/10 hover:border-[#D4AF37]/50 bg-black/40'}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) pick(e.dataTransfer.files[0]); }}
    >
      <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => { if (e.target.files?.[0]) pick(e.target.files[0]); }} />

      {docState.uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Uploading…</p>
        </div>
      ) : docState.url ? (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-white font-medium text-sm truncate max-w-[180px]">{docState.file?.name ?? 'Uploaded'}</p>
          <button className="text-xs text-[#D4AF37] hover:text-white mt-1 transition-colors"
            onClick={(e) => { e.stopPropagation(); onUpload(docState.file!); }}>Replace</button>
        </motion.div>
      ) : (
        <>
          <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-2">
            <UploadCloud className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <p className="text-sm font-medium text-white text-center px-2 leading-tight">{title}</p>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mt-1">PDF / JPG / PNG · 10 MB max</p>
          {docState.error && <p className="text-xs text-red-400 mt-1 text-center">{docState.error}</p>}
        </>
      )}
    </div>
  );
}

// ─── InputField ──────────────────────────────────────────────────────────────
function InputField({ icon: Icon, label, type = 'text', required = false, value, onChange, readOnly = false }: {
  icon: React.ComponentType<any>; label: string; type?: string;
  required?: boolean; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; readOnly?: boolean;
}) {
  return (
    <div className="relative group mb-5">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" />
      <input
        type={type} required={required} value={value} onChange={onChange} readOnly={readOnly}
        className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all peer placeholder-transparent disabled:opacity-60"
        placeholder={label}
      />
      <label className="absolute left-12 -top-2.5 bg-[#0F0F10] px-1 text-xs text-gray-500 peer-focus:text-[#D4AF37] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:-top-2.5 peer-focus:text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function ApplyPageInner() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Consent checkboxes — Step 5
  const [consents, setConsents] = useState({
    certify: false,
    falseInfo: false,
    admissionPolicy: false,
    privacyPolicy: false,
  });

  const [formData, setFormData] = useState<FormData>({
    fullName: '', dob: '', age: '', gender: 'Male',
    nationality: '', phone: '', emergencyContact: '',
    email: '', password: '', city: '', address: '',
    program: '', academicYear: '', semester: 'Semester I', studyMode: 'In-Person',
  });

  // Document upload states
  const [docs, setDocs] = useState({
    matric: emptyDoc(),
    grade8: emptyDoc(),
    transcript910: emptyDoc(),
    transcript1112: emptyDoc(),
  });

  // Auto-calc age from DOB
  useEffect(() => {
    if (!formData.dob) return;
    const birth = new Date(formData.dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    setFormData((p) => ({ ...p, age: age > 0 ? String(age) : '' }));
  }, [formData.dob]);

  // Pre-fill from modal quick-start query params (?name=&email=&phone=&dob=&program=)
  useEffect(() => {
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const dob = searchParams.get('dob');
    const program = searchParams.get('program');
    if (name || email || phone || dob || program) {
      setFormData((p) => ({
        ...p,
        ...(name ? { fullName: name } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(dob ? { dob } : {}),
        ...(program ? { program } : {}),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData((p) => ({ ...p, [key]: e.target.value }));

  const set = (key: keyof FormData, val: string) =>
    setFormData((p) => ({ ...p, [key]: val }));

  // ── Upload a single document ──────────────────────────────────────────────
  const uploadDoc = async (key: keyof typeof docs, file: File) => {
    setDocs((p) => ({ ...p, [key]: { ...p[key], file, uploading: true, error: '', url: '' } }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setDocs((p) => ({ ...p, [key]: { file, url: data.fileUrl, uploading: false, error: '' } }));
    } catch (err: any) {
      setDocs((p) => ({ ...p, [key]: { file, url: '', uploading: false, error: err.message } }));
    }
  };

  // ── Step validation before advancing ─────────────────────────────────────
  const validateStep = (): string | null => {
    if (step === 1) {
      if (!formData.fullName.trim()) return 'Full name is required.';
      if (!formData.dob) return 'Date of birth is required.';
      const age = Number(formData.age);
      if (!formData.age || isNaN(age) || age < 15) return 'Applicant must be at least 15 years old.';
    }
    if (step === 2) {
      if (!formData.nationality) return 'Nationality is required.';
      if (!formData.phone.trim()) return 'Phone number is required.';
      if (!formData.emergencyContact.trim()) return 'Emergency contact is required.';
      if (!formData.email.trim()) return 'Email address is required.';
      if (!formData.password || formData.password.length < 6) return 'Password must be at least 6 characters.';
      if (!formData.city) return 'City is required.';
      if (!formData.address.trim()) return 'Address is required.';
    }
    if (step === 3) {
      if (!formData.program) return 'Please select a program.';
      if (!formData.academicYear) return 'Please select an academic year.';
    }
    if (step === 4) {
      if (!docs.matric.url) return 'Grade 12 / Matric document is required.';
      if (!docs.grade8.url) return 'Grade 8 / Ministry document is required.';
      if (!docs.transcript910.url) return 'Transcript 9–10 is required.';
      if (!docs.transcript1112.url) return 'Transcript 11–12 is required.';
    }
    if (step === 5) {
      if (!consents.certify) return 'Please certify that all information is accurate.';
      if (!consents.falseInfo) return 'Please acknowledge the false information policy.';
      if (!consents.admissionPolicy) return 'Please agree to the Admission Policy.';
      if (!consents.privacyPolicy) return 'Please consent to the Privacy Policy.';
    }
    return null;
  };

  const nextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep();
    if (err) { setSubmitError(err); return; }
    setSubmitError('');
    if (step < totalSteps) setStep((s) => s + 1);
    else await handleSubmit();
  };

  const prevStep = () => { setSubmitError(''); if (step > 1) setStep((s) => s - 1); };

  // ── Submit to real API ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          dob: formData.dob,
          age: Number(formData.age),
          gender: formData.gender,
          nationality: formData.nationality,
          phone: formData.phone,
          emergencyContact: formData.emergencyContact,
          email: formData.email,
          password: formData.password,
          city: formData.city,
          address: formData.address,
          program: formData.program,
          academicYear: formData.academicYear,
          semester: formData.semester,
          studyMode: formData.studyMode,
          matricFileUrl: docs.matric.url,
          grade8FileUrl: docs.grade8.url,
          transcript910FileUrl: docs.transcript910.url,
          transcript1112FileUrl: docs.transcript1112.url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed.');
      setIsSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message ?? 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateConfetti = () =>
    Array.from({ length: 40 }).map((_, i) => (
      <motion.div key={i} className="absolute w-2 h-2 bg-[#D4AF37] rounded-sm"
        initial={{ top: '50%', left: '50%', opacity: 1, scale: Math.random() * 1.5 + 0.5 }}
        animate={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, opacity: 0, rotate: Math.random() * 360 }}
        transition={{ duration: 2, ease: 'easeOut' }} />
    ));

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[#0F0F10] text-white overflow-hidden font-sans">

      {/* ── LEFT PANEL ── */}
      <div className="relative w-full md:w-[45%] h-[25vh] md:h-full shrink-0 border-r border-white/5 overflow-hidden">
        <Image src="/hero.png" alt="Campus" fill priority sizes="45vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F10]/90 via-[#0F0F10]/60 to-[#0F0F10]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F10] via-transparent to-transparent md:hidden" />

        <div className="absolute inset-0 flex flex-col p-8 md:p-12 justify-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <span className="inline-block uppercase tracking-widest text-[#D4AF37] text-xs font-bold mb-3 font-mono border border-[#D4AF37]/30 px-3 py-1 rounded-full bg-[#D4AF37]/10">
              College Admission
            </span>
            <h1 className="text-4xl md:text-5xl font-serif font-semibold leading-[1.1] mb-4 text-white drop-shadow-lg">
              Your Future <br />Begins Here.
            </h1>
            <p className="text-gray-300 text-sm md:text-base max-w-md font-sans leading-relaxed hidden md:block">
              Complete your admission application and take the first step toward a creative career at Harmony College.
            </p>
          </motion.div>

          <div className="hidden md:grid grid-cols-2 gap-4 mt-12 max-w-md">
            {[
              { label: 'Students', value: '500+', icon: Users },
              { label: 'Programs', value: '10+', icon: BookOpen },
              { label: 'Placement', value: '90%', icon: GraduationCap },
              { label: 'Est.', value: '2015', icon: Award },
            ].map((stat, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 + idx * 0.1 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 relative overflow-hidden group">
                <div className="absolute -right-2 -top-2 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  <stat.icon className="w-12 h-12 text-[#D4AF37]" />
                </div>
                <div className="text-2xl font-serif font-bold text-white mb-1">{stat.value}</div>
                <div className="text-[10px] text-gray-400 font-sans uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-full md:w-[55%] h-full bg-gradient-to-br from-[#0F0F10] via-[#151517] to-[#1F1F22] flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[#D4AF37]/5 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-2xl bg-[#0F0F10]/80 backdrop-blur-3xl rounded-[22px] border border-[#D4AF37]/20 p-8 md:p-10 shadow-[0_8px_40px_0_rgba(0,0,0,0.6)] relative z-10 flex flex-col"
          style={{ maxHeight: '90vh' }}
        >
          {isSuccess && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">{generateConfetti()}</div>
          )}

          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="flex justify-between items-center mb-8 pb-5 border-b border-white/5 shrink-0">
                <div>
                  <h2 className="text-2xl font-serif font-semibold text-white">Student Registration</h2>
                  <p className="text-gray-400 text-sm mt-1 max-w-sm">Complete all required information carefully.</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 uppercase tracking-widest font-mono block mb-2">
                    Step {step} of {totalSteps}
                  </span>
                  <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#D4AF37]"
                      initial={{ width: `${((step - 1) / totalSteps) * 100}%` }}
                      animate={{ width: `${(step / totalSteps) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              {/* Error banner */}
              {submitError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl px-4 py-3 mb-4 shrink-0">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {submitError}
                </div>
              )}

              {/* FORM AREA */}
              <form onSubmit={nextStep} className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pr-2">
                <AnimatePresence mode="wait">

                  {/* STEP 1 — Personal */}
                  {step === 1 && (
                    <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2 pb-4">
                      <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
                        <User className="text-[#D4AF37] w-5 h-5" /> Personal Details
                      </h3>

                      <div className="flex items-center gap-6 mb-8 bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="w-20 h-20 rounded-full bg-black/50 border border-dashed border-white/20 flex flex-col items-center justify-center text-gray-500 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all cursor-pointer relative group shrink-0">
                          <Camera className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] uppercase">Upload</span>
                          <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                        </div>
                        <div>
                          <p className="text-base text-white font-medium">Profile Image</p>
                          <p className="text-xs text-gray-400 mt-1">Passport size photo. JPG or PNG under 2 MB.</p>
                        </div>
                      </div>

                      <InputField icon={User} label="Full Name" required value={formData.fullName}
                        onChange={update('fullName')} />

                      <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="relative group">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" />
                          <input type="date" required value={formData.dob} onChange={update('dob')}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all [color-scheme:dark]" />
                          <label className="absolute left-12 -top-2.5 bg-[#0F0F10] px-1 text-xs text-gray-500">Date of Birth *</label>
                        </div>
                        <InputField icon={User} label="Age (auto)" type="text" value={formData.age} onChange={() => {}} readOnly />
                      </div>

                      <div className="mb-2">
                        <label className="block text-sm text-gray-400 mb-2 ml-1">Gender *</label>
                        <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10">
                          {['Male', 'Female'].map((g) => (
                            <button type="button" key={g} onClick={() => set('gender', g)}
                              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${formData.gender === g ? 'bg-[#332A15] text-[#D4AF37] shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2 — Contact */}
                  {step === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2 pb-4">
                      <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
                        <MapPin className="text-[#D4AF37] w-5 h-5" /> Contact Information
                      </h3>

                      <div className="relative group mb-5">
                        <Flag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" />
                        <select required value={formData.nationality} onChange={update('nationality')}
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all appearance-none cursor-pointer">
                          <option value="" disabled hidden>Nationality *</option>
                          <option value="Ethiopia">🇪🇹 Ethiopia</option>
                          <option value="Kenya">🇰🇪 Kenya</option>
                          <option value="South Sudan">🇸🇸 South Sudan</option>
                          <option value="Other">🌍 Other</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <InputField icon={Phone} label="Phone Number" type="tel" required value={formData.phone} onChange={update('phone')} />
                        <InputField icon={Phone} label="Emergency Contact" type="tel" required value={formData.emergencyContact} onChange={update('emergencyContact')} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <InputField icon={Mail} label="Email Address" type="email" required value={formData.email} onChange={update('email')} />
                        <InputField icon={Lock} label="Account Password" type="password" required value={formData.password} onChange={update('password')} />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-1">
                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" />
                          <select required value={formData.city} onChange={update('city')}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all appearance-none cursor-pointer">
                            <option value="" disabled hidden>City / Town *</option>
                            <option>Addis Ababa</option>
                            <option>Sheger</option>
                            <option>Burayu</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <InputField icon={MapPin} label="Manual Address" required value={formData.address} onChange={update('address')} />
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3 — Academic */}
                  {step === 3 && (
                    <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2 pb-4">
                      <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
                        <BookOpen className="text-[#D4AF37] w-5 h-5" /> Academic Preferences
                      </h3>

                      <div className="relative group mb-6">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                        <select required value={formData.program} onChange={update('program')}
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all appearance-none cursor-pointer">
                          <option value="" disabled hidden>Program Applying For *</option>
                          {PROGRAMS.map(({ group, options }) => (
                            <optgroup key={group} label={group}>
                              {options.map((o) => <option key={o} value={o}>{o}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div className="relative group mb-8">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                        <select required value={formData.academicYear} onChange={update('academicYear')}
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all appearance-none cursor-pointer">
                          <option value="" disabled hidden>Academic Year *</option>
                          <option>2025/2026</option>
                          <option>2026/2027</option>
                          <option>2027/2028</option>
                        </select>
                      </div>

                      <div className="mb-6">
                        <label className="block text-sm text-gray-400 mb-3 ml-1">Semester *</label>
                        <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10">
                          {['Semester I', 'Semester II'].map((s) => (
                            <button type="button" key={s} onClick={() => set('semester', s)}
                              className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${formData.semester === s ? 'bg-[#332A15] text-[#D4AF37] shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mb-2">
                        <label className="block text-sm text-gray-400 mb-3 ml-1">Study Mode *</label>
                        <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10">
                          {['In-Person', 'Online'].map((m) => (
                            <button type="button" key={m} onClick={() => set('studyMode', m)}
                              className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${formData.studyMode === m ? 'bg-[#332A15] text-[#D4AF37] shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4 — Documents */}
                  {step === 4 && (
                    <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2 pb-4">
                      <h3 className="text-lg font-serif text-white mb-2 flex items-center gap-2">
                        <FileText className="text-[#D4AF37] w-5 h-5" /> Document Uploads
                      </h3>
                      <p className="text-xs text-gray-400 mb-6">All four documents are required before you can continue. PDF, JPG or PNG · max 10 MB each.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileUploadCard title="Grade 12 / Matric *" docState={docs.matric}
                          onUpload={(f) => uploadDoc('matric', f)} />
                        <FileUploadCard title="Grade 8 / Ministry *" docState={docs.grade8}
                          onUpload={(f) => uploadDoc('grade8', f)} />
                        <FileUploadCard title="Transcript 9–10 *" docState={docs.transcript910}
                          onUpload={(f) => uploadDoc('transcript910', f)} />
                        <FileUploadCard title="Transcript 11–12 *" docState={docs.transcript1112}
                          onUpload={(f) => uploadDoc('transcript1112', f)} />
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 5 — Review & Consent */}
                  {step === 5 && (
                    <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2 pb-4">
                      <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
                        <FileCheck2 className="text-[#D4AF37] w-5 h-5" /> Review & Consent
                      </h3>

                      {/* Summary card */}
                      <div className="bg-black/30 border border-white/10 rounded-xl p-5 relative overflow-hidden mb-6">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-bl-full pointer-events-none" />
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                          <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-mono">Summary</h4>
                          <button type="button" onClick={() => setStep(1)}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
                          <div><p className="text-gray-500 text-[10px] uppercase">Name</p><p className="font-medium text-white truncate">{formData.fullName || '—'}</p></div>
                          <div><p className="text-gray-500 text-[10px] uppercase">Program</p><p className="font-medium text-white truncate">{formData.program || '—'}</p></div>
                          <div><p className="text-gray-500 text-[10px] uppercase">Phone</p><p className="font-medium text-white truncate">{formData.phone || '—'}</p></div>
                          <div><p className="text-gray-500 text-[10px] uppercase">Email</p><p className="font-medium text-white truncate">{formData.email || '—'}</p></div>
                          <div><p className="text-gray-500 text-[10px] uppercase">City</p><p className="font-medium text-white truncate">{formData.city || '—'}</p></div>
                          <div><p className="text-gray-500 text-[10px] uppercase">Year</p><p className="font-medium text-white truncate">{formData.academicYear || '—'}</p></div>
                        </div>
                      </div>

                      {/* Declarations */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-medium text-white mb-3">Declaration</h4>
                          <div className="space-y-3">
                            {['I certify that all information provided is accurate.', 'I understand that false information may result in rejection.'].map((text, i) => (
                              <label key={i} className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-center justify-center w-4 h-4 mt-0.5 shrink-0">
                                  <input type="checkbox" required className="peer appearance-none w-4 h-4 border border-gray-600 rounded-[3px] checked:bg-[#D4AF37] checked:border-[#D4AF37] transition-all cursor-pointer" />
                                  <svg className="absolute w-3 h-3 text-[#0F0F10] opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{text}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-white mb-3">Terms & Privacy</h4>
                          <div className="space-y-3">
                            {[
                              <>I agree to the <span className="text-[#D4AF37]">Admission Policy</span>.</>,
                              <>I consent to data processing per the <span className="text-[#D4AF37]">Privacy Policy</span>.</>,
                            ].map((text, i) => (
                              <label key={i} className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-center justify-center w-4 h-4 mt-0.5 shrink-0">
                                  <input type="checkbox" required className="peer appearance-none w-4 h-4 border border-gray-600 rounded-[3px] checked:bg-[#D4AF37] checked:border-[#D4AF37] transition-all" />
                                  <svg className="absolute w-3 h-3 text-[#0F0F10] opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                <span className="text-xs text-gray-300">{text}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </form>

              {/* Footer Actions */}
              <div className="mt-6 pt-5 border-t border-white/5 shrink-0 flex items-center justify-between">
                {step > 1 ? (
                  <button type="button" onClick={prevStep}
                    className="px-6 py-3 rounded-xl border border-white/10 text-sm font-medium text-white hover:bg-white/5 transition-all">
                    Back
                  </button>
                ) : (
                  <Link href="/signin"
                    className="px-6 py-3 rounded-xl border border-white/10 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                    Sign In Instead
                  </Link>
                )}

                {step < totalSteps ? (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="bg-[#D4AF37] text-black px-8 py-3 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center gap-2 hover:bg-[#E9C349] transition-colors">
                    Continue <ArrowRight className="w-4 h-4" />
                  </motion.button>
                ) : (
                  <motion.button
                    disabled={isSubmitting}
                    whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="bg-gradient-to-r from-[#B49020] to-[#D4AF37] text-black px-8 py-3 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center gap-2 disabled:opacity-60">
                    {isSubmitting ? (
                      <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Submitting…</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> Submit Application</>
                    )}
                  </motion.button>
                )}
              </div>
            </>
          ) : (
            /* ── Success Screen ── */
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center py-10 space-y-6 flex-1">
              <div className="w-20 h-20 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-[#D4AF37]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-serif font-bold text-white">Application Submitted!</h3>
                <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                  Welcome to Harmony College, <strong className="text-white">{formData.fullName}</strong>!
                  Your application for <strong className="text-white">{formData.program}</strong> has been received.
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-left text-xs space-y-2 w-full max-w-xs">
                <p className="text-gray-400"><span className="text-white font-medium">Email:</span> {formData.email}</p>
                <p className="text-gray-400"><span className="text-white font-medium">Program:</span> {formData.program}</p>
                <p className="text-gray-400"><span className="text-white font-medium">Status:</span> <span className="text-[#D4AF37]">Under Review</span></p>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">You can now sign in to track your application status.</p>
              <Link href="/signin"
                className="bg-[#D4AF37] text-black px-8 py-3 rounded-xl text-sm font-bold hover:bg-[#E9C349] transition-colors flex items-center gap-2">
                Sign In to Your Portal <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense>
      <ApplyPageInner />
    </Suspense>
  );
}
