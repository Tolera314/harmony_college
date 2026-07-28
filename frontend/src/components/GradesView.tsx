import React, { useState } from 'react';
import { GradeRecord, StudentProfile } from '../types';
import {
  GraduationCap,
  Calculator,
  Download,
  Printer,
  FileCheck,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Table, Column } from './ui/Table';
import { printElement, shareContent } from '../lib/exportUtils';

interface GradesViewProps {
  profile: StudentProfile;
  grades: GradeRecord[];
}

// ── GPA Summary strip rendered below the table ─────────────────────────────
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
  if (gpa >= 3.7) return 'text-emerald-400';
  if (gpa >= 3.0) return 'text-[#E9C349]';
  if (gpa >= 2.0) return 'text-amber-400';
  return 'text-rose-400';
}

interface GPASummaryProps {
  grades: GradeRecord[];
  filteredGrades: GradeRecord[];
  selectedTerm: string;
}

function GPASummary({ grades, filteredGrades, selectedTerm }: GPASummaryProps) {
  // Most recent term in the full dataset
  const allTerms   = [...new Set(grades.map((g) => g.term))];
  const currentTerm = allTerms[0] ?? 'Current Semester';
  const semesterGrades = grades.filter((g) => g.term === currentTerm);
  const semGPA  = calcGPA(semesterGrades);
  const cumGPA  = calcGPA(grades);

  // If a specific term is filtered, show that term's GPA too
  const viewLabel   = selectedTerm === 'All' ? currentTerm : selectedTerm;
  const viewGrades  = selectedTerm === 'All' ? semesterGrades : filteredGrades;
  const viewGPA     = calcGPA(viewGrades);

  const stats = [
    {
      label: 'Current Semester',
      sublabel: currentTerm,
      gpa: semGPA.gpa,
      credits: semGPA.credits,
      courses: semesterGrades.length,
    },
    ...(selectedTerm !== 'All' && selectedTerm !== currentTerm ? [{
      label: 'Selected Term',
      sublabel: selectedTerm,
      gpa: viewGPA.gpa,
      credits: viewGPA.credits,
      courses: viewGrades.length,
    }] : []),
    {
      label: 'Cumulative',
      sublabel: `${grades.length} courses · ${cumGPA.credits} credits`,
      gpa: cumGPA.gpa,
      credits: cumGPA.credits,
      courses: grades.length,
    },
  ];

  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center justify-between px-5 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl"
        >
          <div className="space-y-0.5">
            <p className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-wider">
              {s.label}
            </p>
            <p className="font-sans text-xs text-white/50">{s.sublabel}</p>
            <p className="font-sans text-[10px] text-white/30 mt-1">
              {s.courses} course{s.courses !== 1 ? 's' : ''} · {s.credits} credits
            </p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className={`font-mono text-3xl font-bold leading-none ${gpaColor(s.gpa)}`}>
              {s.gpa.toFixed(2)}
            </p>
            <p className="font-sans text-[10px] text-white/40 mt-1">
              {gpaLabel(s.gpa)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
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
      header: 'Course Title',
      cell: (g) => <span className="font-semibold text-white">{g.courseTitle}</span>
    },
    {
      header: 'Course Code',
      cell: (g) => <Badge variant="gold">{g.courseCode}</Badge>
    },
    {
      header: 'Term',
      cell: (g) => <span className="font-mono text-white/60">{g.term}</span>
    },
    {
      header: 'Cr.Hr.',
      cell: (g) => <span className="font-mono">{g.credits}</span>,
      align: 'center'
    },
    {
      header: 'Grade',
      cell: (g) => (
        <Badge variant="gold">
          {g.grade}
        </Badge>
      ),
      align: 'center'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8 pb-8"
    >
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverable={false} className="space-y-2">
          <p className="font-mono text-xs text-white/50 uppercase font-bold tracking-wider">
            Cumulative GPA
          </p>
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-4xl font-bold text-white">
              {profile.cumulativeGpa.toFixed(2)}
            </h3>
            <Badge variant="gold">Summa Cum Laude</Badge>
          </div>
          <p className="font-sans text-xs text-white/60">
            Based on {profile.completedCredits} graded semester credits
          </p>
        </Card>

        <Card hoverable={false} className="space-y-2">
          <p className="font-mono text-xs text-white/50 uppercase font-bold tracking-wider">
            Academic Status
          </p>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-400">
            Good Standing
          </h3>
          <p className="font-sans text-xs text-white/60">
            Dean's List honors achieved 4 consecutive terms
          </p>
        </Card>

        <Card hoverable={false} className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-xs text-white/50 uppercase font-bold tracking-wider">
              Official Transcript
            </p>
            <p className="font-sans text-xs text-white/60 mt-1">
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
            <h3 className="font-serif text-2xl font-bold text-white">
              Grade History Records
            </h3>

            {/* Term Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {terms.map((term) => (
                <button
                  key={term}
                  onClick={() => setSelectedTerm(term)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all touch-target ${
                    selectedTerm === term
                      ? 'bg-[#E9C349] text-[#0F0F10] font-semibold'
                      : 'bg-white/5 text-white/60 border border-white/10'
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
            {/* GPA Summary Strip */}
            <GPASummary grades={grades} filteredGrades={filteredGrades} selectedTerm={selectedTerm} />
          </div>

          {/* Mobile Card List Alternative */}
          <div className="sm:hidden space-y-3">
            {filteredGrades.map((g) => (
              <Card key={g.id} hoverable={false} className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <Badge variant="gold">{g.courseCode}</Badge>
                  <Badge variant="gold">{g.grade}</Badge>
                </div>
                <h4 className="font-sans text-sm font-semibold text-white">
                  {g.courseTitle}
                </h4>
                <div className="flex justify-between text-xs font-mono text-white/50 pt-1">
                  <span>Term: {g.term}</span>
                  <span>{g.credits} Credits</span>
                </div>
              </Card>
            ))}
            {/* Mobile GPA Summary */}
            <GPASummary grades={grades} filteredGrades={filteredGrades} selectedTerm={selectedTerm} />
          </div>
        </div>

        {/* Right 4 Cols: Interactive GPA Calculator Simulator */}
        <Card hoverable={false} className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <Calculator className="w-5 h-5 text-[#E9C349]" />
            <h3 className="font-sans font-bold text-base text-white">
              Fall 2024 GPA Simulator
            </h3>
          </div>

          <p className="text-xs text-white/60 leading-relaxed">
            Test prospective term grades to project your final graduation GPA.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-white">
                <span>CS402: Software Eng II (4 cr)</span>
                <span className="font-mono text-[#E9C349]">
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
              <div className="flex justify-between text-xs font-semibold text-white">
                <span>DS301: Database Systems (4 cr)</span>
                <span className="font-mono text-[#E9C349]">
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
              <div className="flex justify-between text-xs font-semibold text-white">
                <span>AI440: Artificial Intelligence (4 cr)</span>
                <span className="font-mono text-[#E9C349]">
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

          <div className="p-4 bg-white/5 rounded-2xl space-y-1 text-center border border-[#E9C349]/20">
            <p className="text-xs font-mono text-white/50">Projected Cumulative GPA</p>
            <p className="font-serif text-3xl font-bold text-[#E9C349]">
              {calculateSimulatedGpa()}
            </p>
            <p className="text-[10px] text-emerald-400 font-bold">
              On track for Graduation with Highest Honors
            </p>
          </div>
        </Card>
      </div>

      {/* Official Digital Transcript Modal */}
      <Modal
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
      >
        <div id="official-transcript" className="bg-white text-black p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-start border-b-2 border-black pb-4">
            <div>
              <h2 className="font-serif text-3xl font-bold tracking-wide">HARMONY COLLEGE</h2>
              <p className="font-mono text-xs uppercase tracking-widest text-gray-600 mt-1">
                OFFICIAL ACADEMIC TRANSCRIPT • OFFICE OF THE REGISTRAR
              </p>
            </div>
            <button onClick={() => setShowTranscriptModal(false)} className="text-gray-500 hover:text-black">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <p><span className="font-bold">Student Name:</span> {profile.name}</p>
              <p><span className="font-bold">Student ID:</span> {profile.id}</p>
              <p><span className="font-bold">Major:</span> {profile.major}</p>
            </div>
            <div>
              <p><span className="font-bold">Cumulative GPA:</span> {profile.cumulativeGpa.toFixed(2)}</p>
              <p><span className="font-bold">Earned Credits:</span> {profile.completedCredits}</p>
              <p><span className="font-bold">Date Issued:</span> July 22, 2024</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <h4 className="font-bold font-serif text-base">Course History & Marks</h4>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-400 font-mono text-left">
                  <th className="py-2">Code</th>
                  <th className="py-2">Title</th>
                  <th className="py-2">Term</th>
                  <th className="py-2 text-center">Credits</th>
                  <th className="py-2 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-sans">
                {grades.map((g) => (
                  <tr key={g.id}>
                    <td className="py-2 font-mono font-bold">{g.courseCode}</td>
                    <td className="py-2">{g.courseTitle}</td>
                    <td className="py-2 font-mono">{g.term}</td>
                    <td className="py-2 text-center font-mono">{g.credits}</td>
                    <td className="py-2 text-center font-mono font-bold">{g.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-gray-300 flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-gray-500 gap-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Digitally Signed Token: HC-2024-X8921</span>
            </div>
            <button
              onClick={() => printElement('official-transcript')}
              className="px-5 py-2 bg-black text-white rounded-xl font-sans font-semibold flex items-center gap-2 hover:bg-gray-800 touch-target"
            >
              <Printer className="w-4 h-4" />
              Print Official Document
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
