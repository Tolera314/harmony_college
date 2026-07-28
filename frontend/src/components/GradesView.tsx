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
import { DURATION, EASE } from '@/src/lib/motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Table, Column } from './ui/Table';

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

      {/* Official Digital Transcript Modal */}
      <Modal
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
      >
        <div className="bg-white text-black p-6 rounded-2xl space-y-6">
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
              <FileCheck className="w-4 h-4 shrink-0" style={{ color: "var(--status-success)" }} />
              <span>Digitally Signed Token: HC-2024-X8921</span>
            </div>
            <button
              onClick={() => window.print()}
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
