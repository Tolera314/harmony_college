'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { 
  Search, FileText, Download, Printer, ShieldCheck, 
  CheckCircle2, AlertCircle, Clock, Award, Check, ChevronRight
} from 'lucide-react';
import { EmptyState } from '../ui/States';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Mock student grades for transcripts
const transcriptRecords = [
  {
    id: 's01',
    studentId: 'HC-2024-0012',
    name: 'Selam Alemayehu',
    program: 'Computer Science (B.Sc.)',
    admissionDate: 'Sep 15, 2024',
    gpa: 3.92,
    credits: 112,
    status: 'Enrolled',
    semesters: [
      {
        name: 'Fall Semester 2024',
        gpa: 4.00,
        courses: [
          { code: 'CS101', name: 'Intro to Computer Science', credits: 4, grade: 'A', points: 4.0 },
          { code: 'MATH101', name: 'Calculus I', credits: 4, grade: 'A', points: 4.0 },
          { code: 'ENG101', name: 'Freshman English', credits: 3, grade: 'A', points: 4.0 }
        ]
      },
      {
        name: 'Spring Semester 2025',
        gpa: 3.85,
        courses: [
          { code: 'CS201', name: 'Data Structures & Algorithms', credits: 4, grade: 'A-', points: 3.75 },
          { code: 'MATH102', name: 'Calculus II', credits: 4, grade: 'A', points: 4.0 },
          { code: 'CS204', name: 'Computer Architecture', credits: 3, grade: 'B+', points: 3.3 }
        ]
      }
    ]
  },
  {
    id: 's02',
    studentId: 'HC-2024-0015',
    name: 'Yonas Kebede',
    program: 'Mechanical Engineering (B.Sc.)',
    admissionDate: 'Sep 15, 2024',
    gpa: 3.45,
    credits: 98,
    status: 'Enrolled',
    semesters: [
      {
        name: 'Fall Semester 2024',
        gpa: 3.50,
        courses: [
          { code: 'MATH101', name: 'Calculus I', credits: 4, grade: 'B+', points: 3.3 },
          { code: 'MECH101', name: 'Intro to Mechanical Eng.', credits: 3, grade: 'A', points: 4.0 }
        ]
      }
    ]
  }
];

const initialRequests = [
  { id: 'req1', name: 'Selam Alemayehu', idCode: 'HC-2024-0012', type: 'Official Electronic', requestedDate: 'Jul 22, 2026', destination: 'Stanford University (Grad Admissions)', status: 'Pending' },
  { id: 'req2', name: 'Marta Hailu', idCode: 'HC-2025-0912', type: 'Official Hardcopy', requestedDate: 'Jul 21, 2026', destination: 'Self Pickup', status: 'Approved' },
  { id: 'req3', name: 'Kidus Tilahun', idCode: 'HC-2023-0182', type: 'Official Electronic', requestedDate: 'Jul 18, 2026', destination: 'Ministry of Education, ET', status: 'Issued' }
];

export const TranscriptServices: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<typeof transcriptRecords[0] | null>(null);
  const [requests, setRequests] = useState(initialRequests);

  // Search filter
  const matchingStudents = searchQuery.trim() === '' ? [] : transcriptRecords.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectStudent = (st: typeof transcriptRecords[0]) => {
    setSelectedStudent(st);
    setSearchQuery(''); // clear list
  };

  const handleIssueTranscript = (reqId: string) => {
    setRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        return { ...req, status: 'Issued' };
      }
      return req;
    }));
    alert('Transcript Issued! Verification hash dispatched to destination address.');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    alert('Compiling official transcript layout...\nSecuring PDF document with digital certificate cryptography...\nSaved file: official_transcript_' + selectedStudent?.studentId + '.pdf');
  };

  const requestBadgeColor = {
    Pending: 'amber',
    Approved: 'glass',
    Issued: 'emerald',
    Rejected: 'rose'
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
          <div className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-5 backdrop-blur-md space-y-4">
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
          <div className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-5 backdrop-blur-md space-y-4">
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
              <div className="flex items-center justify-between bg-(--hover-overlay) border border-(--border-default) p-3 rounded-2xl">
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
                  <div className="space-y-1">
                    <p><strong className="text-gray-500 uppercase">Curriculum Program:</strong> <span className="font-semibold text-gray-900">{selectedStudent.program}</span></p>
                    <p><strong className="text-gray-500 uppercase">Credits Earned:</strong> <span className="text-gray-900">{selectedStudent.credits} Credits</span></p>
                    <p><strong className="text-gray-500 uppercase">Cumulative GPA:</strong> <span className="font-mono text-gray-900 font-bold">{selectedStudent.gpa.toFixed(2)} / 4.00</span></p>
                  </div>
                </div>

                {/* Semesters Grades Details */}
                <div className="space-y-5 border-t border-gray-200 pt-4">
                  {selectedStudent.semesters.map((sem, sIdx) => (
                    <div key={sIdx} className="space-y-2">
                      <div className="flex justify-between border-b border-gray-300 pb-0.5">
                        <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wide">{sem.name}</span>
                        <span className="text-[9px] font-mono text-gray-500 font-semibold">Term GPA: {sem.gpa.toFixed(2)}</span>
                      </div>

                      <table className="w-full text-left text-[9px] table-fixed">
                        <thead>
                          <tr className="text-gray-500 font-mono font-semibold uppercase">
                            <th className="w-[60px]">Code</th>
                            <th>Course Name</th>
                            <th className="w-[45px] text-center">Credits</th>
                            <th className="w-[45px] text-center">Grade</th>
                            <th className="w-[45px] text-right">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-900 font-medium">
                          {sem.courses.map((c, cIdx) => (
                            <tr key={cIdx} className="py-1">
                              <td className="font-mono py-1 text-gray-700">{c.code}</td>
                              <td className="truncate py-1 text-gray-800" title={c.name}>{c.name}</td>
                              <td className="text-center py-1 font-mono text-gray-600">{c.credits}</td>
                              <td className="text-center py-1 font-mono font-bold text-gray-900">{c.grade}</td>
                              <td className="text-right py-1 font-mono text-gray-600">{c.points.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>

                {/* Digital Certificate Sign Block */}
                <div className="border-t border-gray-300 mt-8 pt-6 flex justify-between items-end">
                  <div className="space-y-2 text-[8px] text-gray-500 font-mono">
                    <div className="flex items-center gap-1 text-(--status-success) font-bold uppercase">
                      <ShieldCheck className="w-3.5 h-3.5" /> Cryptographic Digital Seal Verified
                    </div>
                    <p className="max-w-[240px]">Certificate Hash: sha256:8f44d90...b9a2c3d</p>
                    <p className="max-w-[240px]">Verification Link: verification.harmony.edu/verify/auth-hash</p>
                  </div>
                  
                  {/* Registrar signature block */}
                  <div className="text-center space-y-1.5 shrink-0">
                    <div className="font-serif italic text-sm text-gray-800 border-b border-gray-400 pb-1 px-4 select-none">
                      Robel Bekele
                    </div>
                    <p className="text-[8px] font-mono uppercase text-gray-500 font-bold">Official Registrar Officer Signature</p>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="h-[480px] border border-dashed border-(--border-default) rounded-2xl flex flex-col items-center justify-center gap-3 text-center text-(--text-faint) p-6 bg-(--hover-overlay)">
              <FileText className="w-8 h-8 text-(--text-faint) animate-pulse" />
              <div>
                <h4 className="text-xs font-bold text-(--text-primary) font-sans">No Student Record Loaded</h4>
                <p className="text-[10px] text-(--text-faint) max-w-xs mt-1">Search for a student using the left panel to generate an official certified academic transcript layout.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
};
