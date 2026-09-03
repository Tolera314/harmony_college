'use client';

/**
 * StudentProfileView
 * ──────────────────
 * Renders the Student Profile form inside the Student Dashboard
 * allowing students to complete or update their profile at any time.
 *
 * Requirements:
 *  - Real Harmony College Programs (10 official programs)
 *  - Mandatory Program Type (TVET vs Short Program with 2 Months / 4 Months)
 *  - Full Address & Relationship removed completely
 *  - Academic Year is automatically assigned from system configuration (read-only)
 *  - National ID entered as 16-digit number with strict frontend & backend validation
 *  - Required Documents: Matric / Grade 12 Result, Ministry Exam Result, Academic Transcript (no "(Optional)")
 *  - Cloudinary profile photo upload with duplicate protection, validation, and persistence
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, BookOpen, Upload, Users, CheckCircle2,
  ArrowRight, ArrowLeft, GraduationCap, Flag,
  MapPin, Phone, Info, CreditCard, Clock, Layers,
} from 'lucide-react';
import { CircularProgress } from './onboarding/OnboardingProgress';
import { FileUploadCard, emptyUpload, type UploadState } from './onboarding/FileUploadCard';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { HARMONY_PROGRAMS } from '@/src/lib/harmonyPrograms';

// ── Profile data type ─────────────────────────────────────────────────────────
interface ProfileData {
  nationality: string;
  dob: string;
  gender: string;
  region: string;
  city: string;
  nationalId: string;
  program: string;
  programType: string; // 'TVET' | 'Short Program'
  shortProgramDuration: string; // '2 Months' | '4 Months'
  academicYear: string;
  semester: string;
  matricResult: string;
  ministryResult: string;
  profilePictureName: string;
  profilePicturePreview: string;
  faydaIdName: string;
  transcriptName: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyNotes: string;
}

const DEFAULT_ACADEMIC_YEAR = '2026/2027';

const EMPTY_PROFILE: ProfileData = {
  nationality: '',
  dob: '',
  gender: '',
  region: '',
  city: '',
  nationalId: '',
  program: '',
  programType: '',
  shortProgramDuration: '',
  academicYear: DEFAULT_ACADEMIC_YEAR,
  semester: 'Semester I',
  matricResult: '',
  ministryResult: '',
  profilePictureName: '',
  profilePicturePreview: '',
  faydaIdName: '',
  transcriptName: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyNotes: '',
};

const PROGRAMS = HARMONY_PROGRAMS as readonly string[];
const SEMESTERS = ['Semester I', 'Semester II', 'Semester III', 'Summer / Kiremt'];

// ── Required fields (must match backend profileCompletion.ts exactly) ─────────
// We do NOT compute completion locally. The percentage is ALWAYS the backend's
// authoritative value from data.profileCompletion in API responses.
// This eliminates all frontend ↔ backend calculation mismatches.

// ── Form inputs ───────────────────────────────────────────────────────────────
function Field({
  id, label, value, onChange, type = 'text', required, error, icon: Icon, children,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; error?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold font-sans"
        style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span className="ml-1" style={{ color: 'var(--status-danger)' }}>*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-faint)' }} />}
        {children ?? (
          <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
            aria-invalid={!!error} required={required}
            className={`w-full py-3 rounded-xl border text-sm font-sans transition-colors focus:outline-none ${Icon ? 'pl-10 pr-4' : 'px-4'}`}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: error ? 'var(--status-danger)' : 'var(--border-default)', color: 'var(--text-primary)' }} />
        )}
      </div>
      {error && <p role="alert" className="text-[11px] font-sans" style={{ color: 'var(--status-danger)' }}>{error}</p>}
    </div>
  );
}

function SelectField({
  id, label, value, onChange, options, required, error, icon: Icon,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  options: readonly string[]; required?: boolean; error?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <Field id={id} label={label} value={value} onChange={() => {}} required={required} error={error} icon={Icon}>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}
        aria-invalid={!!error} required={required}
        className={`w-full py-3 rounded-xl border text-sm font-sans transition-colors focus:outline-none appearance-none cursor-pointer ${Icon ? 'pl-10 pr-4' : 'px-4'}`}
        style={{ backgroundColor: 'var(--bg-input)', borderColor: error ? 'var(--status-danger)' : 'var(--border-default)', color: value ? 'var(--text-primary)' : 'var(--text-faint)' }}>
        <option value="">Select {label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

// ── Step components ───────────────────────────────────────────────────────────
function StepPersonal({ p, errors, set }: { p: ProfileData; errors: Record<string, string>; set: (k: keyof ProfileData, v: string) => void }) {
  const handleNationalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and cap at exactly 16 characters
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 16);
    set('nationalId', digitsOnly);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField id="nationality" label="Nationality" value={p.nationality} onChange={v => set('nationality', v)}
          required error={errors.nationality} icon={Flag}
          options={['Ethiopian', 'Kenyan', 'South Sudanese', 'Eritrean', 'Somali', 'Other']} />
        <Field id="dob" label="Date of Birth" type="date" value={p.dob} onChange={v => set('dob', v)}
          required error={errors.dob} />
      </div>
      <div>
        <label className="block text-xs font-semibold font-sans mb-2" style={{ color: 'var(--text-secondary)' }}>
          Gender <span style={{ color: 'var(--status-danger)' }}>*</span>
        </label>
        <div className="flex gap-3">
          {['Male', 'Female'].map(g => (
            <button key={g} type="button" onClick={() => set('gender', g)}
              className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all"
              style={{
                backgroundColor: p.gender === g ? 'var(--accent-gold-subtle)' : 'var(--bg-input)',
                borderColor:     p.gender === g ? 'var(--accent-gold-border)' : 'var(--border-default)',
                color:           p.gender === g ? 'var(--brand-gold)' : 'var(--text-secondary)',
              }}>
              {g}
            </button>
          ))}
        </div>
        {errors.gender && <p className="mt-1 text-[11px]" style={{ color: 'var(--status-danger)' }}>{errors.gender}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="region" label="Region / Zone" value={p.region} onChange={v => set('region', v)} icon={MapPin} />
        <Field id="city" label="City" value={p.city} onChange={v => set('city', v)} required error={errors.city} icon={MapPin} />
      </div>

      {/* National ID Input — Exactly 16 digits text/number input */}
      <Field id="nationalId" label="National ID (16 Digits)" value={p.nationalId} onChange={() => {}} required error={errors.nationalId} icon={CreditCard}>
        <div className="relative">
          <input
            id="nationalId"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={16}
            value={p.nationalId}
            onChange={handleNationalIdChange}
            placeholder="Enter exactly 16 digits (e.g. 1234567890123456)"
            aria-invalid={!!errors.nationalId}
            required
            className={`w-full py-3 pl-10 pr-16 rounded-xl border text-sm font-mono tracking-wider transition-colors focus:outline-none`}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: errors.nationalId ? 'var(--status-danger)' : 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-mono select-none"
            style={{ color: p.nationalId.length === 16 ? 'var(--status-success)' : 'var(--text-faint)' }}>
            {p.nationalId.length}/16
          </span>
        </div>
      </Field>
    </div>
  );
}

function StepAcademic({ p, errors, set }: { p: ProfileData; errors: Record<string, string>; set: (k: keyof ProfileData, v: string) => void }) {
  const programOptions = React.useMemo(() =>
    p.program && !PROGRAMS.includes(p.program) ? [p.program, ...PROGRAMS] : PROGRAMS,
  [p.program]);

  return (
    <div className="space-y-5">
      {/* Real Harmony College Program Selection */}
      <SelectField id="program" label="Program" value={p.program} onChange={v => set('program', v)}
        required error={errors.program} icon={GraduationCap} options={programOptions} />

      {/* Mandatory Program Type Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>
          Program Type <span style={{ color: 'var(--status-danger)' }}>*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'TVET', label: 'TVET Program', desc: 'Comprehensive technical diploma track' },
            { id: 'Short Program', label: 'Short Program', desc: 'Accelerated intensive certificate' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                set('programType', t.id);
                if (t.id === 'TVET') set('shortProgramDuration', '');
              }}
              className="p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1"
              style={{
                backgroundColor: p.programType === t.id ? 'var(--accent-gold-subtle)' : 'var(--bg-input)',
                borderColor:     p.programType === t.id ? 'var(--accent-gold-border)' : 'var(--border-default)',
              }}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-bold font-sans" style={{ color: p.programType === t.id ? 'var(--brand-gold)' : 'var(--text-primary)' }}>
                  {t.label}
                </span>
                {p.programType === t.id && <CheckCircle2 className="w-4 h-4 text-[#E9C349]" />}
              </div>
              <span className="text-[11px] font-sans" style={{ color: 'var(--text-muted)' }}>{t.desc}</span>
            </button>
          ))}
        </div>
        {errors.programType && <p className="text-[11px] font-sans" style={{ color: 'var(--status-danger)' }}>{errors.programType}</p>}
      </div>

      {/* Conditional Short Program Duration */}
      {p.programType === 'Short Program' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pt-1">
          <label className="block text-xs font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>
            Short Program Duration <span style={{ color: 'var(--status-danger)' }}>*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {['2 Months', '4 Months'].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => set('shortProgramDuration', d)}
                className="py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: p.shortProgramDuration === d ? 'var(--accent-gold-subtle)' : 'var(--bg-input)',
                  borderColor:     p.shortProgramDuration === d ? 'var(--accent-gold-border)' : 'var(--border-default)',
                  color:           p.shortProgramDuration === d ? 'var(--brand-gold)' : 'var(--text-secondary)',
                }}
              >
                <Clock className="w-4 h-4" />
                {d}
              </button>
            ))}
          </div>
          {errors.shortProgramDuration && <p className="text-[11px] font-sans" style={{ color: 'var(--status-danger)' }}>{errors.shortProgramDuration}</p>}
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Academic Year — Automatically Assigned by System (Read-Only) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>
            Academic Year <span className="text-[10px] font-normal font-mono ml-1.5 text-[#E9C349]">(Auto-Assigned)</span>
          </label>
          <div className="w-full py-3 px-4 rounded-xl border text-sm font-sans font-mono flex items-center justify-between"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
            <span>{p.academicYear || DEFAULT_ACADEMIC_YEAR}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold"
              style={{ backgroundColor: 'rgba(233,195,73,0.12)', color: 'var(--brand-gold)', border: '1px solid var(--accent-gold-border)' }}>
              Current Period
            </span>
          </div>
        </div>

        <SelectField id="semester" label="Semester" value={p.semester} onChange={v => set('semester', v)} options={SEMESTERS} />
      </div>

      {/* Required Academic Results (No Optional tag) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="matricResult" label="Matric / Grade 12 Result" value={p.matricResult} onChange={v => set('matricResult', v)}
          required error={errors.matricResult} />
        <Field id="ministryResult" label="Ministry Exam Result" value={p.ministryResult} onChange={v => set('ministryResult', v)}
          required error={errors.ministryResult} />
      </div>

      <div className="p-4 rounded-xl flex items-start gap-2.5"
        style={{ backgroundColor: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)' }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--status-info)' }} />
        <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Selected program and examination results will be registered in your official student dossier with the Registrar.
        </p>
      </div>
    </div>
  );
}

function StepDocuments({
  profilePic, transcript, errors, onProfilePic, onTranscript, onRemoveProfilePic, onRemoveTranscript
}: {
  profilePic: UploadState; transcript: UploadState; errors: Record<string, string>;
  onProfilePic: (f: File) => void; onTranscript: (f: File) => void;
  onRemoveProfilePic: () => void; onRemoveTranscript: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileUploadCard
          title="Profile Photo"
          description="Passport-size photo · JPG, PNG, WebP · 2 MB max"
          accept="image/jpeg,image/png,image/webp"
          maxSizeMB={2}
          state={profilePic}
          onChange={onProfilePic}
          onRemove={onRemoveProfilePic}
          imagePreview
          required
        />
        <FileUploadCard
          title="Academic Transcript"
          description="Official school transcript · PDF/JPG/PNG · 10 MB max"
          accept=".pdf,image/*"
          maxSizeMB={10}
          state={transcript}
          onChange={onTranscript}
          onRemove={onRemoveTranscript}
          required
        />
      </div>
      {errors.transcript && <p className="text-[11px] font-sans" style={{ color: 'var(--status-danger)' }}>{errors.transcript}</p>}

      <div className="p-4 rounded-xl flex items-start gap-2.5"
        style={{ backgroundColor: 'rgba(233,195,73,0.06)', border: '1px solid var(--accent-gold-border)' }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--brand-gold)' }} />
        <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Profile photos and academic transcripts are verified directly by the Office of the Registrar.
        </p>
      </div>
    </div>
  );
}

function StepEmergency({ p, errors, set }: { p: ProfileData; errors: Record<string, string>; set: (k: keyof ProfileData, v: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="emergencyName" label="Contact Full Name" value={p.emergencyName} onChange={v => set('emergencyName', v)}
          required error={errors.emergencyName} icon={User} />
        <Field id="emergencyPhone" label="Emergency Phone" type="tel" value={p.emergencyPhone}
          onChange={v => set('emergencyPhone', v)} required error={errors.emergencyPhone} icon={Phone} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="emergencyNotes" className="block text-xs font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>
          Notes (Optional)
        </label>
        <textarea id="emergencyNotes" value={p.emergencyNotes} onChange={e => set('emergencyNotes', e.target.value)}
          rows={3} placeholder="Any additional emergency information or instructions…"
          className="w-full px-4 py-3 rounded-xl border text-sm font-sans transition-colors focus:outline-none resize-none"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
      </div>
    </div>
  );
}

// ── Step metadata ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Personal',   sublabel: 'Info',    icon: User },
  { id: 2, label: 'Academic',   sublabel: 'Details', icon: BookOpen },
  { id: 3, label: 'Photo & Docs',sublabel: 'Uploads', icon: Upload },
  { id: 4, label: 'Emergency',  sublabel: 'Contact', icon: Users },
];

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  onProfileUpdated?: (pct: number) => void;
}

export function StudentProfileView({ onProfileUpdated }: Props) {
  const [profile,     setProfile]     = useState<ProfileData>(EMPTY_PROFILE);
  const [step,        setStep]        = useState(1);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  // saveStatus: the ONLY thing that changes the UI save indicator
  const [saveStatus,  setSaveStatus]  = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError,   setSaveError]   = useState('');
  const [submitted,   setSubmitted]   = useState(false);
  // completion is ONLY ever set from backend responses — never from local state
  const [completion,  setCompletion]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [fullName,    setFullName]    = useState('');
  const [appNumber,   setAppNumber]   = useState('');

  // Request counter — prevents stale responses from overwriting newer completion values
  const saveSeq = React.useRef(0);

  // Upload states
  const [profilePic,  setProfilePic]  = useState<UploadState>(emptyUpload());
  const [transcript,  setTranscript]  = useState<UploadState>(emptyUpload());

  // ── Load existing profile on mount ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [meRes, profileRes] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'include' }),
          fetch('/api/student/profile', { credentials: 'include' }),
        ]);
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.user) {
            setFullName(me.user.fullName ?? '');
            setAppNumber(`HC-${new Date().getFullYear()}-${me.user.id.slice(0, 6).toUpperCase()}`);
            // Use backend's authoritative completion on load
            setCompletion(me.user.profileCompletion ?? 0);
          }
        }
        if (profileRes.ok) {
          const pd = await profileRes.json();
          const bp = pd.profile;
          if (bp) {
            const loaded: ProfileData = {
              nationality:           bp.nationality            ?? '',
              dob:                   bp.dob ? bp.dob.split('T')[0] : '',
              gender:                bp.gender                ?? '',
              region:                bp.region                ?? '',
              city:                  bp.city                  ?? '',
              nationalId:            bp.nationalId            ?? '',
              program:               bp.program               ?? '',
              programType:           bp.programType           ?? '',
              shortProgramDuration:  bp.shortProgramDuration  ?? '',
              academicYear:          bp.academicYear          || DEFAULT_ACADEMIC_YEAR,
              semester:              bp.semester              || 'Semester I',
              matricResult:          bp.matricResult          ?? '',
              ministryResult:        bp.ministryResult        ?? '',
              profilePictureName:    bp.profilePictureUrl     ? 'Uploaded' : '',
              profilePicturePreview: bp.profilePictureUrl     ?? '',
              faydaIdName:           bp.faydaIdUrl            ? 'Uploaded' : '',
              transcriptName:        bp.transcriptUrl         ? 'Uploaded' : '',
              emergencyName:         bp.emergencyName         ?? '',
              emergencyPhone:        bp.emergencyPhone        ?? '',
              emergencyNotes:        bp.emergencyNotes        ?? '',
            };
            setProfile(loaded);
            // Prefer the backend's completion from /api/student/profile response
            // (it's already set from /api/auth/me above; only override if explicitly returned)
            if (typeof pd.profileCompletion === 'number') {
              setCompletion(pd.profileCompletion);
            }
            if (bp.profilePictureUrl) setProfilePic({ file: null, preview: bp.profilePictureUrl, uploading: false, error: '' });
            if (bp.transcriptUrl)     setTranscript( { file: null, preview: bp.transcriptUrl,     uploading: false, error: '' });
          }
        }
      } catch { /* keep empty form */ }
      finally { setLoading(false); }
    })();
  }, []);

  // ── setField — only updates profile form state, NEVER touches completion ──
  const setField = useCallback((k: keyof ProfileData, v: string) => {
    setProfile(prev => ({ ...prev, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
    // Clear 'saved' badge when user edits again
    setSaveStatus(s => s === 'saved' ? 'idle' : s);
  }, []);

  // ── patchProfile — calls backend, uses seq to reject stale responses ────────
  const patchProfile = useCallback(async (patch: Record<string, unknown>): Promise<number | null> => {
    const seq = ++saveSeq.current;
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed.');
      // Only apply if this is still the latest request
      if (seq === saveSeq.current && typeof data.profileCompletion === 'number') {
        setCompletion(data.profileCompletion);
        onProfileUpdated?.(data.profileCompletion);
      }
      if (seq === saveSeq.current) setSaveStatus('saved');
      return typeof data.profileCompletion === 'number' ? data.profileCompletion : null;
    } catch (err) {
      if (seq === saveSeq.current) {
        setSaveStatus('error');
        setSaveError(err instanceof Error ? err.message : 'Save failed. Please try again.');
      }
      return null;
    }
  }, [onProfileUpdated]);

  // ── File upload ───────────────────────────────────────────────────────────
  const uploadFile = async (file: File): Promise<string | null> => {
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      return (data.fileUrl as string) || null;
    } catch (err) {
      console.error('File upload error:', err);
      return null;
    }
  };

  const handleFileChange = (type: 'profilePic' | 'transcript') => async (file: File) => {
    const setter = type === 'profilePic' ? setProfilePic : setTranscript;

    if (type === 'profilePic') {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setter({ file: null, preview: '', uploading: false, error: 'Please upload a JPG, PNG, or WebP image.' });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setter({ file: null, preview: '', uploading: false, error: 'Photo size must be 2 MB or less.' });
        return;
      }
    }

    const preview = URL.createObjectURL(file);
    setter({ file, preview, uploading: true, error: '' });

    const fileUrl = await uploadFile(file);
    if (!fileUrl) {
      setter({ file, preview: '', uploading: false, error: 'Upload failed. Please try again.' });
      return;
    }

    setter({ file, preview: fileUrl, uploading: false, error: '' });

    if (type === 'profilePic') {
      setProfile(prev => ({ ...prev, profilePictureName: file.name, profilePicturePreview: fileUrl }));
      await patchProfile({ profilePictureUrl: fileUrl });
    } else {
      setProfile(prev => ({ ...prev, transcriptName: file.name }));
      await patchProfile({ transcriptUrl: fileUrl });
    }
  };

  const handleRemove = (type: 'profilePic' | 'transcript') => () => {
    if (type === 'profilePic') {
      setProfilePic(emptyUpload());
      setProfile(prev => ({ ...prev, profilePictureName: '', profilePicturePreview: '' }));
      patchProfile({ profilePictureUrl: null });
    } else {
      setTranscript(emptyUpload());
      setProfile(prev => ({ ...prev, transcriptName: '' }));
      patchProfile({ transcriptUrl: null });
    }
  };

  // ── Auto-save step → backend, completion comes back from response ─────────
  const autoSave = async (s: number) => {
    const payload: Record<string, unknown> = {};
    if (s === 1) {
      ['nationality', 'dob', 'gender', 'region', 'city', 'nationalId'].forEach(k => {
        const v = profile[k as keyof ProfileData];
        if (v) payload[k] = v;
      });
    } else if (s === 2) {
      ['program', 'programType', 'shortProgramDuration', 'academicYear', 'semester', 'matricResult', 'ministryResult'].forEach(k => {
        const v = profile[k as keyof ProfileData];
        if (v !== undefined && v !== '') payload[k] = v;
      });
      // Explicitly null shortProgramDuration when TVET
      if (profile.programType === 'TVET') payload.shortProgramDuration = null;
    } else if (s === 3) {
      if (profile.profilePicturePreview) payload.profilePictureUrl = profile.profilePicturePreview;
      if (transcript.preview)            payload.transcriptUrl     = transcript.preview;
    } else if (s === 4) {
      ['emergencyName', 'emergencyPhone', 'emergencyNotes'].forEach(k => {
        const v = profile[k as keyof ProfileData];
        if (v) payload[k] = v;
      });
    }
    if (Object.keys(payload).length > 0) await patchProfile(payload);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!profile.nationality) e.nationality = 'Required.';
      if (!profile.dob)         e.dob         = 'Required.';
      if (!profile.gender)      e.gender      = 'Select a gender.';
      if (!profile.city)        e.city        = 'Required.';
      if (!profile.nationalId || profile.nationalId.trim().length !== 16 || !/^\d{16}$/.test(profile.nationalId.trim())) {
        e.nationalId = 'National ID must be exactly 16 digits.';
      }
    }
    if (step === 2) {
      if (!profile.program) e.program = 'Select a program.';
      if (!profile.programType) {
        e.programType = 'Please select a program type.';
      } else if (profile.programType === 'Short Program' && !profile.shortProgramDuration) {
        e.shortProgramDuration = 'Please select a duration (2 Months or 4 Months).';
      }
      if (!profile.matricResult) e.matricResult = 'Matric / Grade 12 result is required.';
      if (!profile.ministryResult) e.ministryResult = 'Ministry Exam result is required.';
    }
    if (step === 3) {
      if (!profile.profilePicturePreview && !profilePic.preview) e.profilePic = 'Profile photo is required.';
      if (!transcript.preview && !profile.transcriptName) e.transcript = 'Academic transcript is required.';
    }
    if (step === 4) {
      if (!profile.emergencyName)  e.emergencyName  = 'Required.';
      if (!profile.emergencyPhone) e.emergencyPhone = 'Required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    await autoSave(step);
    // Only advance if the save didn't error
    if (saveStatus !== 'error') setStep(s => Math.min(4, s + 1));
  };

  const handlePrev = () => { setStep(s => Math.max(1, s - 1)); setErrors({}); };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaveError('');
    const pct = await patchProfile({
      nationality:         profile.nationality         || undefined,
      dob:                 profile.dob                 || undefined,
      gender:              profile.gender              || undefined,
      region:              profile.region              || undefined,
      city:                profile.city                || undefined,
      nationalId:          profile.nationalId          || undefined,
      program:             profile.program             || undefined,
      programType:         profile.programType         || undefined,
      shortProgramDuration: profile.programType === 'Short Program' ? profile.shortProgramDuration || undefined : null,
      academicYear:        profile.academicYear        || DEFAULT_ACADEMIC_YEAR,
      semester:            profile.semester            || undefined,
      matricResult:        profile.matricResult        || undefined,
      ministryResult:      profile.ministryResult      || undefined,
      profilePictureUrl:   profile.profilePicturePreview || undefined,
      transcriptUrl:       transcript.preview          || undefined,
      emergencyName:       profile.emergencyName       || undefined,
      emergencyPhone:      profile.emergencyPhone      || undefined,
      emergencyNotes:      profile.emergencyNotes      || undefined,
      submit: true,
    });
    if (pct !== null) setSubmitted(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--hover-overlay)' }} />
        ))}
      </div>
    );
  }

  const isUploadingActive = profilePic.uploading || transcript.uploading;
  const isSaving = saveStatus === 'saving';

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-8 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          My Profile
        </h1>
        <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
          Complete your student information. You can update your program or details at any time.
        </p>
      </div>

      {/* Progress card */}
      <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5"
        style={{ background: 'linear-gradient(135deg, rgba(233,195,73,0.08) 0%, rgba(233,195,73,0.03) 100%)', border: '1px solid var(--accent-gold-border)' }}>
        <div className="relative shrink-0">
          <CircularProgress value={completion} size={72} strokeWidth={6} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-sm font-black" style={{ color: 'var(--brand-gold)' }}>{completion}%</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {completion >= 100 ? 'Profile Complete 🎉' : 'Profile Completion'}
          </p>
          <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {completion >= 100
              ? 'All required information is complete.'
              : `Please complete the remaining information — ${100 - completion}% left.`}
          </p>
          {appNumber && (
            <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-faint)' }}>
              Application: {appNumber}
            </p>
          )}
          {/* Save status indicator — single source of truth */}
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-3 h-3 border-2 border-t-[var(--brand-gold)] border-white/10 rounded-full animate-spin inline-block" />
              <span className="text-[11px] font-mono" style={{ color: 'var(--brand-gold)' }}>Saving…</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--status-success)' }} />
              <span className="text-[11px] font-mono" style={{ color: 'var(--status-success)' }}>Saved</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <p className="text-[11px] font-mono mt-2" style={{ color: 'var(--status-danger)' }}>
              ✗ {saveError || 'Save failed'}
            </p>
          )}
          {/* Progress bar */}
          <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }}
              initial={{ width: '0%' }} animate={{ width: `${completion}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }} />
          </div>
        </div>
        {/* Profile avatar preview */}
        <div className="hidden sm:flex flex-col items-center gap-2 shrink-0">
          {profilePic.preview ? (
            <img src={profilePic.preview} alt="Profile" className="w-14 h-14 rounded-xl object-cover border-2"
              style={{ borderColor: 'var(--accent-gold-border)' }} />
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center font-serif text-2xl font-bold"
              style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)', color: 'var(--brand-gold)' }}>
              {fullName.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <Badge variant="gold" className="text-[10px]">{profile.program || 'No program'}</Badge>
        </div>
      </div>

      {/* Success state */}
      {submitted ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-2xl flex flex-col items-center text-center gap-4"
          style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--status-success-border)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--status-success-bg)', border: '2px solid var(--status-success-border)' }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--status-success)' }} />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Profile Saved!</h2>
            <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
              Your student profile and program selections have been updated and verified successfully.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setSubmitted(false)}>Edit Profile</Button>
        </motion.div>
      ) : (
        <div className="rounded-2xl overflow-hidden border"
          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--hover-overlay)' }}>

          {/* Step tabs */}
          <div className="grid grid-cols-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
            {STEPS.map(s => {
              const Icon = s.icon;
              const active = step === s.id;
              const done   = step > s.id;
              return (
                <button key={s.id} onClick={() => { if (done) { setStep(s.id); setErrors({}); } }}
                  className="flex flex-col items-center gap-1 py-3.5 px-2 text-center transition-all text-[10px] font-mono uppercase tracking-wide"
                  disabled={s.id > step}
                  style={{
                    borderBottom: active ? '2px solid var(--brand-gold)' : '2px solid transparent',
                    backgroundColor: active ? 'var(--accent-gold-subtle)' : 'transparent',
                    color: active ? 'var(--brand-gold)' : done ? 'var(--status-success)' : 'var(--text-faint)',
                    cursor: s.id > step ? 'not-allowed' : 'pointer',
                  }}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Step content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>

                <h2 className="font-serif text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
                  Step {step} — {STEPS[step - 1].label} Information
                </h2>

                {step === 1 && <StepPersonal p={profile} errors={errors} set={setField} />}
                {step === 2 && <StepAcademic p={profile} errors={errors} set={setField} />}
                {step === 3 && (
                  <StepDocuments
                    profilePic={profilePic}
                    transcript={transcript}
                    errors={errors}
                    onProfilePic={handleFileChange('profilePic')}
                    onTranscript={handleFileChange('transcript')}
                    onRemoveProfilePic={handleRemove('profilePic')}
                    onRemoveTranscript={handleRemove('transcript')}
                  />
                )}
                {step === 4 && <StepEmergency p={profile} errors={errors} set={setField} />}

              </motion.div>
            </AnimatePresence>

            {saveError && (
              <p className="mt-4 text-xs font-sans" style={{ color: 'var(--status-danger)' }}>{saveError}</p>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-6 pt-5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              {step > 1 && (
                <Button variant="secondary" size="md" onClick={handlePrev} icon={<ArrowLeft className="w-4 h-4" />}>
                  Back
                </Button>
              )}
              {step < 4 ? (
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={handleNext}
                  disabled={saveStatus === 'saving' || isUploadingActive}
                  icon={saveStatus === 'saving'
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <ArrowRight className="w-4 h-4" />}>
                  {saveStatus === 'saving' ? 'Saving…' : 'Save & Continue'}
                </Button>
              ) : (
                <Button
                  variant="gold"
                  size="md"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={saveStatus === 'saving' || isUploadingActive}
                  icon={saveStatus === 'saving'
                    ? <span className="w-4 h-4 border-2 border-[var(--bg-base)]/30 border-t-[var(--bg-base)] rounded-full animate-spin" />
                    : <CheckCircle2 className="w-4 h-4" />}>
                  {saveStatus === 'saving' ? 'Saving…' : 'Save Profile'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
