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
import { Modal } from './ui/Modal';
import { SlidePanel } from './ui/SlidePanel';
import { Table, Column } from './ui/Table';
import { printTranscript } from '../lib/exportUtils';

interface GradesViewProps {
  profile: StudentProfile;
  grades: GradeRecord[];
}

export const GradesView: React.FC<GradesViewProps> = ({ profile, grades }) => {
  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  const [showTranscriptModal, setShowTranscriptModal] = useState<boolean>(false);

  // Grade Simulator State
  const [simCs402, setSimCs402] = useState<number>(4.0);
  const [simDs301, setSimDs301] = useState<number>(3.7);
  const [simAi440, setSimAi440] = useState<number>(4.0);

  const terms = ['All', 'Spring 2024', 'Fall 2023', 'Spring 2023'];

  const filteredGrades = selectedTerm === 'All'
    ? grades
    : grades.filter((g) => g.term === selectedTerm);

  const calculateSimulatedGpa = () => {
    const totalPreviousPoints = profile.cumulativeGpa * profile.completedCredits;
    const newCourseCredits = 12;
    const newPoints = (simCs402 * 4) + (simDs301 * 4) + (simAi440 * 4);
    const totalSimulatedGpa = (totalPreviousPoints + newPoints) / (profile.completedCredits + newCourseCredits);
    return totalSimulatedGpa.toFixed(3);
  };

  const columns: Column<GradeRecord>[] = [
    {
      header: 'Course',
      cell: (g) => <Badge variant="gold">{g.courseCode}</Badge>
    },
    {
      header: 'Title',
      cell: (g) => <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{g.courseTitle}</span>
    },
    {
      header: 'Term',
      cell: (g) => <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{g.term}</span>
    },
    {
      header: 'Credits',
      cell: (g) => <span className="font-mono">{g.credits}</span>,
      align: 'center'
    },
    {
      header: 'Grade',
      cell: (g) => (
        <Badge variant="gold">
          {g.grade} ({g.numericGpa.toFixed(1)})
        </Badge>
      ),
      align: 'center'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-8"
    >
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverable={false} className="space-y-2">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: "var(--text-faint)" }}>
            Cumulative GPA
          </p>
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
              {profile.cumulativeGpa.toFixed(2)}
            </h3>
            <Badge variant="gold">Summa Cum Laude</Badge>
          </div>
          <p className="font-sans text-xs" style={{ color: "var(--text-secondary)" }}>  Based on {profile.completedCredits} graded semester credits
          </p>
        </Card>

        <Card hoverable={false} className="space-y-2">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: "var(--text-faint)" }}>
            Academic Status
          </p>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: "var(--status-success)" }}>
            Good Standing
          </h3>
          <p className="font-sans text-xs" style={{ color: "var(--text-secondary)" }}>  Dean's List honors achieved 4 consecutive terms
          </p>
        </Card>

        <Card hoverable={false} className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: "var(--text-faint)" }}>
              Official Transcript
            </p>
            <p className="font-sans text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Digitally verified watermarked academic record available.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowTranscriptModal(true)}
            icon={<Download className="w-4 h-4" />}
            className="mt-4"
          >
            Download Official Transcript
          </Button>
        </Card>
      </div>

      {/* Main Grid: Grades Table vs GPA Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Cols: Grade Records */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h3 className="font-serif text-2xl font-bold" style={{ color: "var(--text-primary)" }}>  Grade History Records
            </h3>

            {/* Term Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {terms.map((term) => (
                <button
                  key={term}
                  onClick={() => setSelectedTerm(term)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all touch-target ${
                    selectedTerm === term ? "font-semibold" : "border"} style={selectedTerm === term ? { backgroundColor: "var(--brand-gold)", color: "var(--text-inverse)" } : { backgroundColor: "var(--hover-overlay)", color: "var(--text-muted)", borderColor: "var(--border-default)"
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table
              data={filteredGrades}
              columns={columns}
              keyExtractor={(g) => g.id}
            />
          </div>

          {/* Mobile Card List Alternative */}
          <div className="sm:hidden space-y-3">
            {filteredGrades.map((g) => (
              <Card key={g.id} hoverable={false} className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <Badge variant="gold">{g.courseCode}</Badge>
                  <Badge variant="gold">
                    {g.grade} ({g.numericGpa.toFixed(1)})
                  </Badge>
                </div>
                <h4 className="font-sans text-sm font-semibold" style={{ color: "var(--text-primary)" }}>  {g.courseTitle}
                </h4>
                <div className="flex justify-between text-xs font-mono pt-1" style={{ color: "var(--text-faint)" }}>
                  <span>Term: {g.term}</span>
                  <span>{g.credits} Credits</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right 4 Cols: Interactive GPA Calculator Simulator */}
        <Card hoverable={false} className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-2.5 border-b pb-4" style={{ borderColor: "var(--border-default)" }}>
            <Calculator className="w-5 h-5 text-[#E9C349]" />
            <h3 className="font-sans font-bold text-base" style={{ color: "var(--text-primary)" }}>
              Fall 2024 GPA Simulator
            </h3>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Test prospective term grades to project your final graduation GPA.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                <span>CS402: Software Eng II (4 cr)</span>
                <span className="font-mono" style={{ color: "var(--brand-gold)" }}>
                  {simCs402 === 4 ? 'A (4.0)' : simCs402 === 3.7 ? 'A- (3.7)' : 'B+ (3.3)'}
                </span>
              </div>
              <input
                type="range"
                min="3.0"
                max="4.0"
                step="0.3"
                value={simCs402}
                onChange={(e) => setSimCs402(parseFloat(e.target.value))}
                className="w-full accent-[#E9C349] cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                <span>DS301: Database Systems (4 cr)</span>
                <span className="font-mono" style={{ color: "var(--brand-gold)" }}>
                  {simDs301 === 4 ? 'A (4.0)' : simDs301 === 3.7 ? 'A- (3.7)' : 'B+ (3.3)'}
                </span>
              </div>
              <input
                type="range"
                min="3.0"
                max="4.0"
                step="0.3"
                value={simDs301}
                onChange={(e) => setSimDs301(parseFloat(e.target.value))}
                className="w-full accent-[#E9C349] cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                <span>AI440: Artificial Intelligence (4 cr)</span>
                <span className="font-mono" style={{ color: "var(--brand-gold)" }}>
                  {simAi440 === 4 ? 'A (4.0)' : simAi440 === 3.7 ? 'A- (3.7)' : 'B+ (3.3)'}
                </span>
              </div>
              <input
                type="range"
                min="3.0"
                max="4.0"
                step="0.3"
                value={simAi440}
                onChange={(e) => setSimAi440(parseFloat(e.target.value))}
                className="w-full accent-[#E9C349] cursor-pointer"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl space-y-1 text-center border" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--accent-gold-border)" }}>
            <p className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>Projected Cumulative GPA</p>
            <p className="font-serif text-3xl font-bold" style={{ color: "var(--brand-gold)" }}>
              {calculateSimulatedGpa()}
            </p>
            <p className="text-[10px] font-bold" style={{ color: "var(--status-success)" }}>
              On track for Graduation with Highest Honors
            </p>
          </div>
        </Card>
      </div>

      {/* Official Digital Transcript — SlidePanel */}
      <SlidePanel
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
        title="Official Academic Transcript"
        subtitle="Grades & Transcript"
        width="max-w-2xl"
      >
        {/* Action buttons */}
        <div className="flex items-center justify-between mb-4">
          <p className="font-sans text-xs text-white/50">Digitally certified · Harmony College</p>
          <div className="flex gap-2">
            <button
              onClick={() => printTranscript({ studentName: profile.name, studentId: profile.id, major: profile.major, degree: profile.degree, cumulativeGpa: profile.cumulativeGpa, completedCredits: profile.completedCredits, expectedGraduation: profile.expectedGraduation, email: profile.email, grades })}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl font-sans text-xs font-semibold text-white transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={() => printTranscript({ studentName: profile.name, studentId: profile.id, major: profile.major, degree: profile.degree, cumulativeGpa: profile.cumulativeGpa, completedCredits: profile.completedCredits, expectedGraduation: profile.expectedGraduation, email: profile.email, grades })}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E9C349] hover:bg-[#d8b238] rounded-xl font-sans text-xs font-bold text-[#0F0F10] transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Save as PDF
            </button>
        <div className="bg-white text-black p-6 rounded-2xl space-y-6">
          <div className="border-b-2 border-black pb-4">
            <h2 className="font-serif text-3xl font-bold tracking-wide">HARMONY COLLEGE</h2>
            <p className="font-mono text-xs uppercase tracking-widest text-gray-600 mt-1">
              OFFICIAL ACADEMIC TRANSCRIPT • OFFICE OF THE REGISTRAR
            </p>
          </div>
        </div>

        {/* Transcript content — no inner scroll, Modal itself scrolls */}
        <div id="official-transcript" className="bg-white text-black rounded-2xl border border-gray-200">

          {/* Header */}
          <div className="bg-[#0F0F10] p-5 flex items-start justify-between rounded-t-2xl">
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
              <p className="font-mono text-[10px] text-white/50 uppercase tracking-widest">
                OFFICIAL ACADEMIC TRANSCRIPT · OFFICE OF THE REGISTRAR
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="font-mono text-[10px] text-white/40">Date Issued</p>
              <p className="font-mono text-xs text-white font-bold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              <p className="font-mono text-[10px] text-[#E9C349] mt-1">HC-2024-X8921</p>
            </div>
          </div>

          {/* Student info */}
          <div className="p-5 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-sans">
              {[
                ['Student Name', profile.name],
                ['Cumulative GPA', `${profile.cumulativeGpa.toFixed(2)} / 4.00`],
                ['Student ID', profile.id],
                ['Credits Earned', String(profile.completedCredits)],
                ['Program', profile.degree],
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
                  <th className="py-2 px-2 text-left font-mono font-bold text-gray-700 border border-gray-200 text-[10px]">Code</th>
                  <th className="py-2 px-2 text-left font-mono font-bold text-gray-700 border border-gray-200 text-[10px]">Course Title</th>
                  <th className="py-2 px-2 text-left font-mono font-bold text-gray-700 border border-gray-200 text-[10px]">Term</th>
                  <th className="py-2 px-2 text-center font-mono font-bold text-gray-700 border border-gray-200 text-[10px]">Cr.</th>
                  <th className="py-2 px-2 text-center font-mono font-bold text-gray-700 border border-gray-200 text-[10px]">Grade</th>
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
                  <td className="py-1.5 px-2 text-center font-mono text-black border border-gray-200 text-[10px]">
                    {grades.reduce((s, g) => s + g.credits, 0)}
                  </td>
                  <td className="py-1.5 px-2 text-center font-mono text-black border border-gray-200 text-[10px]">
                    {(grades.reduce((s, g) => s + g.numericGpa * g.credits, 0) / grades.reduce((s, g) => s + g.credits, 0)).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* College stamp + seal + signature */}
          <div className="p-5 space-y-4">
            {/* Stamp */}
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

            {/* Seal + signature */}
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
      </Modal>
        </div>
      </SlidePanel>
    </motion.div>
  );
};
