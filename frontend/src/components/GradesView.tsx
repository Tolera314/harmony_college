'use client';

import React, { useState } from 'react';
import { GradeRecord, StudentProfile } from '../types';
import {
  GraduationCap,
  Calculator,
  Download,
  Printer,
  FileCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { SlidePanel } from './ui/SlidePanel';
import { Table, Column } from './ui/Table';
import { printTranscript } from '../lib/exportUtils';

// ── GPA Summary helpers ───────────────────────────────────────────────────────
function calcGPA(records: GradeRecord[]): { gpa: number; credits: number } {
  const graded = records.filter((g) => g.numericGpa > 0);
  if (graded.length === 0) return { gpa: 0, credits: 0 };
  const totalCredits = graded.reduce((s, g) => s + g.credits, 0);
  const totalPoints  = graded.reduce((s, g) => s + g.numericGpa * g.credits, 0);
  return { gpa: totalPoints / totalCredits, credits: totalCredits };
}

function gpaLabel(gpa: number): string {
  if (gpa >= 3.9)  return 'Summa Cum Laude';
  if (gpa >= 3.7)  return 'Magna Cum Laude';
  if (gpa >= 3.5)  return 'Cum Laude';
  if (gpa >= 3.0)  return 'Good Standing';
  if (gpa >= 2.0)  return 'Satisfactory';
  return 'Academic Warning';
}

function gpaColor(gpa: number): string {
  if (gpa >= 3.7) return 'var(--status-success)';
  if (gpa >= 3.0) return 'var(--brand-gold)';
  if (gpa >= 2.0) return 'var(--status-warning)';
  return 'var(--status-error)';
}

interface GPASummaryProps {
  grades: GradeRecord[];
  filteredGrades: GradeRecord[];
  selectedTerm: string;
}

function GPASummary({ grades, filteredGrades, selectedTerm }: GPASummaryProps) {
  const allTerms    = [...new Set(grades.map((g) => g.term))];
  const currentTerm = allTerms[0] ?? 'Current Semester';
  const semGPA      = calcGPA(grades.filter((g) => g.term === currentTerm));
  const cumGPA      = calcGPA(grades);
  const viewGPA     = calcGPA(selectedTerm === 'All' ? grades.filter((g) => g.term === currentTerm) : filteredGrades);
  const viewLabel   = selectedTerm === 'All' ? currentTerm : selectedTerm;

  const stats = [
    { label: 'Current Semester', sublabel: currentTerm, gpa: semGPA.gpa, credits: semGPA.credits, courses: grades.filter((g) => g.term === currentTerm).length },
    ...(selectedTerm !== 'All' && selectedTerm !== currentTerm
      ? [{ label: 'Selected Term', sublabel: selectedTerm, gpa: viewGPA.gpa, credits: viewGPA.credits, courses: filteredGrades.length }]
      : []),
    { label: 'Cumulative', sublabel: `${grades.length} courses · ${cumGPA.credits} credits`, gpa: cumGPA.gpa, credits: cumGPA.credits, courses: grades.length },
  ];

  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center justify-between px-5 py-4 rounded-2xl border"
          style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)' }}>
          <div className="space-y-0.5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{s.label}</p>
            <p className="font-sans text-xs" style={{ color: 'var(--text-muted)' }}>{s.sublabel}</p>
            <p className="font-sans text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>{s.courses} course{s.courses !== 1 ? 's' : ''} · {s.credits} credits</p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="font-mono text-3xl font-bold leading-none" style={{ color: gpaColor(s.gpa) }}>{s.gpa.toFixed(2)}</p>
            <p className="font-sans text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>{gpaLabel(s.gpa)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
interface GradesViewProps {
  profile: StudentProfile;
  grades: GradeRecord[];
  enrolledCourses?: { id: string; code: string; name: string; credits: number }[];
}

export const GradesView: React.FC<GradesViewProps> = ({ profile, grades, enrolledCourses }) => {
  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  const [showTranscriptModal, setShowTranscriptModal] = useState<boolean>(false);

  // GPA Simulator — use real enrolled courses if available, fall back to 3 hardcoded defaults
  const simCourses = enrolledCourses && enrolledCourses.length > 0
    ? enrolledCourses.slice(0, 4)
    : [
        { id: 'cs402', code: 'CS402', name: 'Software Engineering II', credits: 4 },
        { id: 'ds301', code: 'DS301', name: 'Database Systems',        credits: 4 },
        { id: 'ai440', code: 'AI440', name: 'Artificial Intelligence', credits: 4 },
      ];

  const [simValues, setSimValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(simCourses.map(c => [c.id, 4.0])),
  );

  // Keep simValues in sync if courses change (lazy init won't re-run)
  const simKeys = simCourses.map(c => c.id).join(',');
  React.useEffect(() => {
    setSimValues(prev => {
      const next: Record<string, number> = {};
      simCourses.forEach(c => { next[c.id] = prev[c.id] ?? 4.0; });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simKeys]);

  const calculateSimulatedGpa = () => {
    const newCredits = simCourses.reduce((s, c) => s + c.credits, 0);
    const newPoints  = simCourses.reduce((s, c) => s + (simValues[c.id] ?? 4.0) * c.credits, 0);
    const prevPoints = profile.cumulativeGpa * profile.completedCredits;
    const total      = profile.completedCredits + newCredits;
    return total > 0 ? ((prevPoints + newPoints) / total).toFixed(3) : '0.000';
  };

  const gpaLabels: Record<number, string> = { 4.0: 'A (4.0)', 3.7: 'A- (3.7)', 3.5: 'B+ (3.5)', 3.0: 'B (3.0)', 2.7: 'B- (2.7)', 2.0: 'C (2.0)' };
  const gpaSteps = [4.0, 3.7, 3.5, 3.0, 2.7, 2.0];

  const allTerms = [...new Set(grades.map(g => g.term))];
  const terms = ['All', ...allTerms];

  const filteredGrades = selectedTerm === 'All'
    ? grades
    : grades.filter((g) => g.term === selectedTerm);

  const columns: Column<GradeRecord>[] = [
    { header: 'Course Title', cell: (g) => <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{g.courseTitle}</span> },
    { header: 'Course Code',  cell: (g) => <Badge variant="gold">{g.courseCode}</Badge> },
    { header: 'Term',         cell: (g) => <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{g.term}</span> },
    { header: 'Cr.Hr.',       cell: (g) => <span className="font-mono">{g.credits}</span>, align: 'center' },
    { header: 'Grade',        cell: (g) => <Badge variant="gold">{g.grade}</Badge>, align: 'center' },
  ];

  const transcriptData = {
    studentName: profile.name, studentId: profile.id, major: profile.major,
    degree: profile.degree, cumulativeGpa: profile.cumulativeGpa,
    completedCredits: profile.completedCredits, expectedGraduation: profile.expectedGraduation,
    email: profile.email, grades,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-8"
    >
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverable={false} className="space-y-2">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>Cumulative GPA</p>
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile.cumulativeGpa.toFixed(2)}</h3>
            <Badge variant="gold">Summa Cum Laude</Badge>
          </div>
          <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>Based on {profile.completedCredits} graded semester credits</p>
        </Card>

        <Card hoverable={false} className="space-y-2">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>Academic Status</p>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: 'var(--status-success)' }}>Good Standing</h3>
          <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>Dean's List honors achieved 4 consecutive terms</p>
        </Card>

        <Card hoverable={false} className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-faint)' }}>Official Transcript</p>
            <p className="font-sans text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Digitally verified watermarked academic record available.</p>
          </div>
          <Button variant="primary" onClick={() => setShowTranscriptModal(true)} icon={<Download className="w-4 h-4" />} className="mt-4">
            Download Official Transcript
          </Button>
        </Card>
      </div>

      {/* Grades Table + GPA Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Grade History Records</h3>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {terms.map((term) => (
                <button key={term} onClick={() => setSelectedTerm(term)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all touch-target ${selectedTerm === term ? 'font-semibold' : 'border'}`}
                  style={selectedTerm === term
                    ? { backgroundColor: 'var(--brand-gold)', color: 'var(--text-inverse)' }
                    : { backgroundColor: 'var(--hover-overlay)', color: 'var(--text-muted)', borderColor: 'var(--border-default)' }}>
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <Table data={filteredGrades} columns={columns} keyExtractor={(g) => g.id} />
            <GPASummary grades={grades} filteredGrades={filteredGrades} selectedTerm={selectedTerm} />
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filteredGrades.map((g) => (
              <Card key={g.id} hoverable={false} className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <Badge variant="gold">{g.courseCode}</Badge>
                  <Badge variant="gold">{g.grade}</Badge>
                </div>
                <h4 className="font-sans text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{g.courseTitle}</h4>
                <div className="flex justify-between text-xs font-mono pt-1" style={{ color: 'var(--text-faint)' }}>
                  <span>Term: {g.term}</span><span>{g.credits} Credits</span>
                </div>
              </Card>
            ))}
            <GPASummary grades={grades} filteredGrades={filteredGrades} selectedTerm={selectedTerm} />
          </div>
        </div>

        {/* GPA Simulator */}
        <Card hoverable={false} className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-2.5 border-b pb-4" style={{ borderColor: 'var(--border-default)' }}>
            <Calculator className="w-5 h-5 text-[#E9C349]" />
            <h3 className="font-sans font-bold text-base" style={{ color: 'var(--text-primary)' }}>GPA Simulator</h3>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Adjust expected grades for your current enrolled courses to project your GPA.
          </p>
          <div className="space-y-4">
            {simCourses.map(course => {
              const val = simValues[course.id] ?? 4.0;
              return (
                <div key={course.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    <span className="truncate max-w-[65%]">{course.code}: {course.name} ({course.credits} cr)</span>
                    <span className="font-mono shrink-0 ml-2" style={{ color: 'var(--brand-gold)' }}>
                      {gpaLabels[val] ?? `${val.toFixed(1)}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2.0" max="4.0" step="0.1"
                    value={val}
                    onChange={e => {
                      const raw = parseFloat(e.target.value);
                      // Snap to nearest allowed step
                      const snapped = gpaSteps.reduce((prev, curr) =>
                        Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev,
                      );
                      setSimValues(prev => ({ ...prev, [course.id]: snapped }));
                    }}
                    className="w-full accent-[#E9C349] cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
          <div className="p-4 rounded-2xl space-y-1 text-center border"
            style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--accent-gold-border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>Projected Cumulative GPA</p>
            <p className="font-serif text-3xl font-bold" style={{ color: 'var(--brand-gold)' }}>{calculateSimulatedGpa()}</p>
            <p className="text-[10px] font-bold" style={{ color: parseFloat(calculateSimulatedGpa()) >= 3.7 ? 'var(--status-success)' : 'var(--brand-gold)' }}>
              {parseFloat(calculateSimulatedGpa()) >= 3.9 ? 'On track for Highest Honors'
                : parseFloat(calculateSimulatedGpa()) >= 3.7 ? 'On track for Magna Cum Laude'
                : parseFloat(calculateSimulatedGpa()) >= 3.0 ? 'Good Academic Standing'
                : 'Review academic advisor'}
            </p>
          </div>
        </Card>
      </div>

      {/* Official Transcript — SlidePanel (teammate's modernized UX) */}
      <SlidePanel
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
        title="Official Academic Transcript"
        subtitle="Grades & Transcript"
        width="max-w-2xl"
      >
        {/* Print / Save buttons */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <p className="font-sans text-xs" style={{ color: 'var(--text-muted)' }}>Digitally certified · Harmony College</p>
          <div className="flex gap-2">
            <button onClick={() => printTranscript(transcriptData)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-sans text-xs font-semibold transition-colors border"
              style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={() => printTranscript(transcriptData)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E9C349] hover:bg-[#d8b238] rounded-xl font-sans text-xs font-bold text-[#0F0F10] transition-colors">
              <Download className="w-3.5 h-3.5" /> Save as PDF
            </button>
          </div>
        </div>
        <div className="bg-white text-black p-6 rounded-2xl space-y-6">
          <div className="border-b-2 border-black pb-4">
            <h2 className="font-serif text-3xl font-bold tracking-wide">HARMONY COLLEGE</h2>
            <p className="font-mono text-xs uppercase tracking-widest text-gray-600 mt-1">
              OFFICIAL ACADEMIC TRANSCRIPT • OFFICE OF THE REGISTRAR
            </p>
          </div>
        </div>

        {/* Transcript document */}
        <div id="official-transcript" className="bg-white text-black rounded-2xl border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="bg-[#0F0F10] p-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#E9C349]/50 shrink-0">
                  <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-white tracking-wide">HARMONY COLLEGE</h2>
                  <p className="font-mono text-[10px] text-[#E9C349] uppercase tracking-widest">Sheger, Burayu, Ethiopia</p>
                </div>
              </div>
              <p className="font-mono text-[10px] text-white/50 uppercase tracking-widest">OFFICIAL ACADEMIC TRANSCRIPT · OFFICE OF THE REGISTRAR</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="font-mono text-[10px] text-white/40">Date Issued</p>
              <p className="font-mono text-xs text-white font-bold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              <p className="font-mono text-[10px] text-[#E9C349] mt-1">HC-2024-X8921</p>
            </div>
          </div>

          {/* Student info grid */}
          <div className="p-5 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-sans">
              {[
                ['Student Name',        profile.name],
                ['Cumulative GPA',      `${profile.cumulativeGpa.toFixed(2)} / 4.00`],
                ['Student ID',          profile.id],
                ['Credits Earned',      String(profile.completedCredits)],
                ['Program',             profile.degree],
                ['Expected Graduation', profile.expectedGraduation],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500 font-semibold">{label}</span>
                  <span className="font-bold text-black text-right ml-2 max-w-[160px] truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Course table */}
          <div className="p-5 border-b border-gray-200">
            <h4 className="font-serif text-xs font-bold text-black mb-3 uppercase tracking-wide">Course History & Academic Record</h4>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  {['Code','Course Title','Term','Cr.','Grade'].map((h, i) => (
                    <th key={h} className={`py-2 px-2 font-mono font-bold text-gray-700 border border-gray-200 text-[10px] ${i >= 3 ? 'text-center' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grades.map((g, i) => (
                  <tr key={g.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-1.5 px-2 font-mono font-bold text-black border border-gray-100 text-[10px]">{g.courseCode}</td>
                    <td className="py-1.5 px-2 text-gray-800 border border-gray-100 text-[10px]">{g.courseTitle}</td>
                    <td className="py-1.5 px-2 font-mono text-gray-600 border border-gray-100 text-[10px]">{g.term}</td>
                    <td className="py-1.5 px-2 text-center font-mono text-gray-800 border border-gray-100 text-[10px]">{g.credits}</td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-black border border-gray-100 text-[10px]">{g.grade}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={3} className="py-1.5 px-2 font-mono text-gray-700 border border-gray-200 text-[10px]">TOTALS</td>
                  <td className="py-1.5 px-2 text-center font-mono text-black border border-gray-200 text-[10px]">{grades.reduce((s,g)=>s+g.credits,0)}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-black border border-gray-200 text-[10px]">
                    {(grades.reduce((s,g)=>s+g.numericGpa*g.credits,0)/grades.reduce((s,g)=>s+g.credits,0)).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* College stamp + seal + signature */}
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#E9C349]/60 shrink-0">
                <img src="/logo2.jpg" alt="Harmony College Seal" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-serif text-sm font-bold text-black">HARMONY COLLEGE</p>
                <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">Sheger, Burayu, Ethiopia</p>
                <p className="font-mono text-[9px] text-gray-500">Tel: +251 911 000 000</p>
                <p className="font-mono text-[9px] text-yellow-600 font-bold mt-0.5">OFFICIAL RECORD — NOT VALID WITHOUT SEAL</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center bg-gray-50 shrink-0">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-mono text-[9px] font-bold text-black uppercase tracking-wider">Cryptographic Seal</p>
                  <p className="font-mono text-[8px] text-gray-500">sha256: 8f44d90...b9a2c3d · Token: HC-2024-X8921</p>
                  <p className="font-mono text-[8px] text-gray-400">Issued: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="border-b-2 border-black w-36 mb-1 ml-auto" />
                <p className="font-sans text-[10px] font-bold text-black">Registrar, Harmony College</p>
                <p className="font-mono text-[8px] text-gray-400">Office of Academic Records</p>
              </div>
            </div>
          </div>

        </div>{/* end official-transcript */}
      </SlidePanel>
    </motion.div>
  );
};
