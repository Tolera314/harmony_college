'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { 
  Search, FileText, Download, Printer, Check, 
  ChevronRight, Award, ShieldCheck, AlertCircle
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Mock student records
const mockStudents = [
  {
    id: 's01',
    name: 'Yonas Kebede',
    studentId: 'HC-2024-8832',
    program: 'B.Sc. Computer Science',
    gpa: 3.85,
    totalCredits: 94,
    standing: 'First Class Honors',
    admissionDate: 'Sept 2024',
    courses: [
      { code: 'CS101', title: 'Intro to Computer Science', grade: 'A', cr: 4, sem: 'Fall 2024' },
      { code: 'MATH101', title: 'Calculus I', grade: 'A-', cr: 4, sem: 'Fall 2024' },
      { code: 'CS201', title: 'Data Structures & Algorithms', grade: 'A', cr: 4, sem: 'Spring 2025' },
      { code: 'CS302', title: 'Database Management Systems', grade: 'A', cr: 3, sem: 'Fall 2025' },
      { code: 'MATH302', title: 'Calculus III (Multivariable)', grade: 'B+', cr: 3, sem: 'Spring 2025' },
    ]
  },
  {
    id: 's02',
    name: 'Selam Alemayehu',
    studentId: 'HC-2025-0812',
    program: 'B.Sc. Mechanical Engineering',
    gpa: 3.60,
    totalCredits: 62,
    standing: 'Deans List',
    admissionDate: 'Sept 2025',
    courses: [
      { code: 'MECH201', title: 'Engineering Statics', grade: 'A', cr: 3, sem: 'Fall 2025' },
      { code: 'MATH101', title: 'Calculus I', grade: 'B+', cr: 4, sem: 'Fall 2025' },
    ]
  }
];

const mockRequests = [
  { id: 'tr1', name: 'Yonas Kebede', idCode: 'HC-2024-8832', type: 'Official Digital Copy', requestedDate: 'Today, 09:30 AM', status: 'Pending Verification', destination: 'WES Evaluation' },
  { id: 'tr2', name: 'Hanna Tadesse', idCode: 'HC-2023-4411', type: 'Hardcopy Sealed Envelope', requestedDate: 'Yesterday', status: 'Processing', destination: 'Graduate Admissions' },
  { id: 'tr3', name: 'Abebe Bikila', idCode: 'HC-2022-1002', type: 'Official Digital Copy', requestedDate: 'Jul 24, 2026', status: 'Issued', destination: 'Direct Email Dispatch' },
];

const requestBadgeColor: Record<string, string> = {
  'Pending Verification': 'amber',
  Processing: 'blue',
  Issued: 'emerald',
};

export const TranscriptServices: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<typeof mockStudents[0] | null>(mockStudents[0]);
  const [requests, setRequests] = useState(mockRequests);

  const matchingStudents = searchQuery.trim() === '' ? [] : mockStudents.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectStudent = (st: typeof mockStudents[0]) => {
    setSelectedStudent(st);
    setSearchQuery('');
  };

  const handleIssueTranscript = (reqId: string) => {
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'Issued' } : r));
    alert('Official Transcript signed & issued electronically to destination.');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    alert(`Downloading official certified transcript PDF for ${selectedStudent?.name || 'Student'}...`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-serif font-bold text-(--text-primary) tracking-wide">Transcript Services</h2>
        <p className="text-xs text-(--text-muted)">Verify student records, print credentials, and issue certified electronic transcripts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Request Tracker & Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Student Transcript Search */}
          <div className="ds-card rounded-2xl p-5 backdrop-blur-md space-y-4">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Generate Student Transcript</h3>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
              <input
                type="text"
                placeholder="Search Student by Name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl focus:outline-none focus:border-(--brand-gold) text-xs text-(--text-primary)"
              />
            </div>

            {matchingStudents.length > 0 && (
              <div className="border border-(--border-subtle) rounded-xl bg-(--bg-input) overflow-hidden divide-y divide-(--border-subtle)">
                {matchingStudents.map(st => (
                  <button
                    key={st.id}
                    onClick={() => handleSelectStudent(st)}
                    className="w-full p-3 text-left hover:bg-(--hover-overlay) flex justify-between items-center transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-(--text-primary)">{st.name}</p>
                      <p className="text-[10px] text-(--text-faint) font-mono">{st.studentId} · {st.program}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-(--text-faint)" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Transcript Request Tracker */}
          <div className="ds-card rounded-2xl p-5 backdrop-blur-md space-y-4">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Incoming Transcript Requests</h3>
            
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="p-3.5 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-semibold text-(--text-primary)">{req.name}</h4>
                      <p className="text-[10px] text-(--text-faint) font-mono">{req.idCode} · {req.type}</p>
                    </div>
                    <Badge variant={requestBadgeColor[req.status as keyof typeof requestBadgeColor] as any}>
                      {req.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-(--border-subtle) pt-2.5 text-[10px] text-(--text-muted)">
                    <span className="truncate max-w-[170px]" title={req.destination}>Dest: {req.destination}</span>
                    <span>Date: {req.requestedDate}</span>
                  </div>

                  {req.status !== 'Issued' && (
                    <div className="flex gap-2">
                      <Button
                        variant="gold"
                        size="xs"
                        onClick={() => handleIssueTranscript(req.id)}
                        className="flex-1 py-1 font-semibold text-[9px] flex items-center justify-center gap-1 bg-(--accent-gold-subtle) hover:bg-(--accent-gold-subtle) text-(--brand-gold)"
                      >
                        <Check className="w-3 h-3" /> Issue Electronic
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: High-fidelity preview sheet (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedStudent ? (
            <div className="space-y-4">
              
              {/* Document actions */}
              <div className="flex items-center justify-between ds-card p-3 rounded-2xl">
                <span className="text-xs font-semibold text-(--text-secondary)">Official Preview Mode</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handlePrint} className="flex items-center gap-1.5 font-semibold text-xs py-1.5">
                    <Printer className="w-3.5 h-3.5" /> Print Layout
                  </Button>
                  <Button variant="gold" size="sm" onClick={handleDownloadPDF} className="flex items-center gap-1.5 font-semibold text-xs py-1.5">
                    <Download className="w-3.5 h-3.5" /> Download certified PDF
                  </Button>
                </div>
              </div>

              {/* Certified Official transcript sheet preview */}
              <div className="p-8 bg-white text-black rounded-2xl shadow-2xl relative overflow-hidden font-sans border-4 border-double border-gray-400 select-none min-h-[600px]">
                
                {/* Diagonal Official Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                  <div className="text-6xl font-bold font-sans uppercase rotate-45 select-none text-center">
                    OFFICIAL TRANSCRIPT · HARMONY COLLEGE · OFFICIAL TRANSCRIPT · HARMONY COLLEGE
                  </div>
                </div>

                {/* Header info */}
                <div className="border-b-2 border-gray-800 pb-4 flex justify-between items-start">
                  <div>
                    <h1 className="text-lg font-bold uppercase tracking-wider text-gray-900">Harmony College</h1>
                    <p className="text-[10px] uppercase text-gray-500 font-semibold font-mono">Office of the Registrar</p>
                    <p className="text-[9px] text-gray-500 max-w-[200px]">Sheger Subcity, Woreda 03, Addis Ababa, Ethiopia</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xs font-bold uppercase border border-gray-900 px-2 py-0.5 rounded inline-block bg-gray-100">Official Academic Transcript</h2>
                    <p className="text-[9px] font-mono text-gray-500 mt-1">Date Printed: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Student Info Box */}
                <div className="grid grid-cols-2 gap-4 py-4 text-[10px]">
                  <div className="space-y-1">
                    <p><strong className="text-gray-500 uppercase">Student Name:</strong> <span className="font-semibold text-gray-900">{selectedStudent.name}</span></p>
                    <p><strong className="text-gray-500 uppercase">Student ID:</strong> <span className="font-mono text-gray-900 font-semibold">{selectedStudent.studentId}</span></p>
                    <p><strong className="text-gray-500 uppercase">Admission Date:</strong> <span className="text-gray-900">{selectedStudent.admissionDate}</span></p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p><strong className="text-gray-500 uppercase">Program:</strong> <span className="font-semibold text-gray-900">{selectedStudent.program}</span></p>
                    <p><strong className="text-gray-500 uppercase">Cumulative GPA:</strong> <span className="font-mono font-bold text-gray-900">{selectedStudent.gpa} / 4.00</span></p>
                    <p><strong className="text-gray-500 uppercase">Standing:</strong> <span className="text-emerald-700 font-semibold">{selectedStudent.standing}</span></p>
                  </div>
                </div>

                {/* Course Table Sheet */}
                <div className="mt-2">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead>
                      <tr className="border-y-2 border-gray-800 bg-gray-50 text-gray-700 uppercase font-mono">
                        <th className="py-1.5 px-2">Code</th>
                        <th className="py-1.5 px-2">Course Title</th>
                        <th className="py-1.5 px-2">Semester</th>
                        <th className="py-1.5 px-2 text-center">Credits</th>
                        <th className="py-1.5 px-2 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedStudent.courses.map((c, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="py-2 px-2 font-mono font-bold text-gray-900">{c.code}</td>
                          <td className="py-2 px-2 text-gray-800">{c.title}</td>
                          <td className="py-2 px-2 text-gray-600 font-mono">{c.sem}</td>
                          <td className="py-2 px-2 text-center font-mono">{c.cr}</td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-gray-900">{c.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Signature Block */}
                <div className="mt-12 pt-6 border-t border-gray-300 flex justify-between items-end text-[9px] text-gray-600">
                  <div className="space-y-1">
                    <div className="w-24 h-12 border-b border-gray-400 flex items-center justify-center italic text-gray-400 font-serif">
                      [Registrar Stamp]
                    </div>
                    <p className="font-bold uppercase text-gray-800">Official Seal & Signature</p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="font-mono text-gray-400">Security Hash: 8F2B-901A-44C9-EED0</p>
                    <p className="text-gray-500">Valid only with raised embossed seal.</p>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="ds-card rounded-2xl p-12 text-center text-xs text-(--text-muted)">
              Select a student to generate and preview their official academic transcript.
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
};
