'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, Search, FileText, CheckCircle2, 
  XCircle, Award, Check, Info, ShieldAlert, AlertTriangle,
  ArrowRight, HeartHandshake, ShieldCheck
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Mock graduation auditing applicants
const initialCandidates = [
  {
    id: 'c01',
    studentId: 'HC-2023-0832',
    name: 'Selam Alemayehu',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    program: 'Computer Science (B.Sc.)',
    cgpa: 3.92,
    creditsCompleted: 112,
    creditsRequired: 120,
    status: 'Pending Audit',
    checklist: [
      { id: 'ch1', name: 'Core Curriculums', met: true, details: 'Completed all 18 mandatory CS cores.' },
      { id: 'ch2', name: 'Senior Capstone Project', met: true, details: 'Capstone CS490 signed off by Advisor (Grade: A).' },
      { id: 'ch3', name: 'GPA Requirement (CGPA >= 2.0)', met: true, details: 'Current GPA is 3.92.' },
      { id: 'ch4', name: 'Financial Clearance', met: true, details: 'Outstanding balance is 0 ETB.' },
      { id: 'ch5', name: 'Library Return Clear', met: false, details: 'Pending return of 1 textbook (Introduction to Algorithms).' }
    ],
    history: [
      { time: 'Jul 20, 2026 10:00 AM', user: 'System', action: 'Graduation file compiled automatically.' }
    ]
  },
  {
    id: 'c02',
    studentId: 'HC-2023-0182',
    name: 'Kidus Tilahun',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    program: 'Computer Science (B.Sc.)',
    cgpa: 2.12,
    creditsCompleted: 120,
    creditsRequired: 120,
    status: 'Under Review',
    checklist: [
      { id: 'ch1', name: 'Core Curriculums', met: true, details: 'Completed all 18 CS cores.' },
      { id: 'ch2', name: 'Senior Capstone Project', met: true, details: 'Capstone CS490 signed off (Grade: C).' },
      { id: 'ch3', name: 'GPA Requirement (CGPA >= 2.0)', met: true, details: 'Current GPA is 2.12.' },
      { id: 'ch4', name: 'Financial Clearance', met: false, details: 'Outstanding Tuition Balance: 4,500 ETB.' },
      { id: 'ch5', name: 'Library Return Clear', met: true, details: 'Library records clear.' }
    ],
    history: [
      { time: 'Jul 18, 2026 04:00 PM', user: 'Registrar Office', action: 'Advising checklist submitted for degree auditing.' }
    ]
  },
  {
    id: 'c03',
    studentId: 'HC-2022-0941',
    name: 'Yohannes Abebe',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    program: 'Mechanical Engineering (B.Sc.)',
    cgpa: 3.65,
    creditsCompleted: 140,
    creditsRequired: 140,
    status: 'Approved',
    checklist: [
      { id: 'ch1', name: 'Core Curriculums', met: true, details: 'Engineering core requirements met.' },
      { id: 'ch2', name: 'Senior Capstone Project', met: true, details: 'Capstone project completed successfully.' },
      { id: 'ch3', name: 'GPA Requirement (CGPA >= 2.0)', met: true, details: 'Current GPA is 3.65.' },
      { id: 'ch4', name: 'Financial Clearance', met: true, details: 'Finance clearance issued.' },
      { id: 'ch5', name: 'Library Return Clear', met: true, details: 'Library clearance issued.' }
    ],
    history: [
      { time: 'Jul 15, 2026 09:30 AM', user: 'System', action: 'Auditing complete. Checklist verified.' },
      { time: 'Jul 16, 2026 02:00 PM', user: 'Registrar Office', action: 'Graduation file approved for certification.' }
    ]
  }
];

export const GraduationAuditing: React.FC = () => {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState<typeof initialCandidates[0] | null>(null);
  const [search, setSearch] = useState('');
  
  // Action details
  const [reasonMsg, setReasonMsg] = useState('');

  const filteredCandidates = candidates.filter(cand => 
    cand.name.toLowerCase().includes(search.toLowerCase()) || 
    cand.studentId.toLowerCase().includes(search.toLowerCase())
  );

  const handleClearChecklistItem = (itemId: string) => {
    if (!selectedCandidate) return;

    setCandidates(prev => prev.map(cand => {
      if (cand.id === selectedCandidate.id) {
        const updatedChecklist = cand.checklist.map(item => {
          if (item.id === itemId) {
            return { ...item, met: true, details: item.details + ' (Manually Cleared by Registrar)' };
          }
          return item;
        });
        const updated = { ...cand, checklist: updatedChecklist };
        setSelectedCandidate(updated);
        return updated;
      }
      return cand;
    }));
  };

  const handleDecision = (newStatus: 'Approved' | 'Rejected', desc: string) => {
    if (!selectedCandidate) return;

    setCandidates(prev => prev.map(cand => {
      if (cand.id === selectedCandidate.id) {
        const timestamp = new Date().toLocaleString();
        const updatedHistory = [
          ...cand.history,
          { time: timestamp, user: 'Registrar Office', action: `${newStatus} degree candidacy: "${desc}"` }
        ];
        const updated = { ...cand, status: newStatus, history: updatedHistory };
        setSelectedCandidate(updated);
        return updated;
      }
      return cand;
    }));

    setReasonMsg('');
    alert(`Graduation status updated to ${newStatus} for student ${selectedCandidate.name}. Notification queued.`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Graduation Auditing</h2>
        <p className="text-xs text-white/50">Audit student degree requirements, verify clearance metrics, and authorize graduation lists.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Candidates list (5 cols) */}
        <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
          <h3 className="font-serif text-base font-bold text-white">Graduation Applicants</h3>
          
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search Candidate by Name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/8 rounded-xl focus:outline-none focus:border-[#D4AF37] text-xs text-white"
            />
          </div>

          <div className="space-y-3">
            {filteredCandidates.map(cand => (
              <div 
                key={cand.id} 
                onClick={() => setSelectedCandidate(cand)}
                className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                  selectedCandidate?.id === cand.id 
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-lg' 
                    : 'bg-black/20 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={cand.avatar} alt={cand.name} className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                  <div>
                    <h4 className="text-xs font-semibold text-white">{cand.name}</h4>
                    <p className="text-[10px] text-white/40 font-mono">{cand.studentId} · {cand.program}</p>
                  </div>
                </div>

                <Badge variant={cand.status === 'Approved' ? 'emerald' : cand.status === 'Rejected' ? 'rose' : 'amber'}>
                  {cand.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Degree Audit Sheet (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedCandidate ? (
            <div className="space-y-6">
              
              {/* Candidate Info Overview */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <img src={selectedCandidate.avatar} alt={selectedCandidate.name} className="w-11 h-11 rounded-xl border border-white/10 object-cover" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{selectedCandidate.name}</h3>
                      <p className="text-xs text-white/40">{selectedCandidate.program} · Yr 4</p>
                    </div>
                  </div>
                  <Badge variant="gold" className="font-mono text-xs font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                    CGPA: {selectedCandidate.cgpa.toFixed(2)}
                  </Badge>
                </div>

                {/* Credit progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Credit Progress Requirement</span>
                    <span className="font-mono font-bold text-white">
                      {selectedCandidate.creditsCompleted} / {selectedCandidate.creditsRequired} Credits Completed
                    </span>
                  </div>
                  <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#B49020] to-[#D4AF37] rounded-full"
                      style={{ width: `${(selectedCandidate.creditsCompleted / selectedCandidate.creditsRequired) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Requirements Checklist */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-white/40">Clearance Checklist Verification</h4>
                
                <div className="space-y-3">
                  {selectedCandidate.checklist.map(item => (
                    <div 
                      key={item.id}
                      className={`p-3 border rounded-xl flex items-center justify-between gap-4 transition-colors ${
                        item.met 
                          ? 'bg-emerald-500/5 border-emerald-500/25' 
                          : 'bg-red-500/5 border-red-500/25'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-white">{item.name}</p>
                        <p className="text-[10px] text-white/50">{item.details}</p>
                      </div>

                      {item.met ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <button
                          onClick={() => handleClearChecklistItem(item.id)}
                          className="px-2.5 py-1 bg-red-500/10 hover:bg-[#D4AF37]/15 border border-red-500/30 hover:border-[#D4AF37]/45 rounded-lg text-[9px] font-semibold text-red-400 hover:text-white transition-all flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Force Clear
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Graduation Approval Decision Box */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-white/40">Audit Assessment Decision</h4>
                
                {/* Check if checklist is fully cleared */}
                {selectedCandidate.checklist.every(item => item.met) ? (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/25 rounded-xl text-[11px] leading-relaxed text-emerald-400 flex gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Degree Candidate meets all graduation prerequisites. Ready to authorize.</span>
                  </div>
                ) : (
                  <div className="p-3 bg-red-500/5 border border-red-500/25 rounded-xl text-[11px] leading-relaxed text-red-400 flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Candidacy Blocked: Student has pending library returns or outstanding fees.</span>
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter audit review comments or rejection reason..."
                    value={reasonMsg}
                    onChange={(e) => setReasonMsg(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => handleDecision('Approved', reasonMsg || 'Verified degree audits.')}
                      className="flex-1 font-semibold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Award className="w-4 h-4" /> Approve Degree Graduation
                    </Button>
                    <Button
                      variant="rose"
                      size="sm"
                      onClick={() => handleDecision('Rejected', reasonMsg || 'Cleared check failures.')}
                      className="flex-1 font-semibold text-xs flex items-center justify-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                    >
                      <XCircle className="w-4 h-4" /> Reject Degree Candidacy
                    </Button>
                  </div>
                </div>

                {/* Audit history timeline */}
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <p className="text-[10px] font-mono text-white/40 uppercase">Audit Clearance Logs</p>
                  <div className="space-y-3 pl-3 border-l border-white/10">
                    {selectedCandidate.history.map((h, idx) => (
                      <div key={idx} className="relative text-xs">
                        <span className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#D4AF37] border-2 border-[#0F0F10]" />
                        <div className="space-y-0.5">
                          <p className="text-white/40 font-mono text-[9px]">{h.time} · {h.user}</p>
                          <p className="text-white/90 font-medium">{h.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-[480px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 text-center text-white/30 p-6 bg-white/5">
              <GraduationCap className="w-8 h-8 text-white/20 animate-bounce" />
              <div>
                <h4 className="text-xs font-bold text-white font-sans">No Candidate Audited</h4>
                <p className="text-[10px] text-white/45 max-w-xs mt-1">Select a graduation applicant from the list to display their degree requirements audit checklist sheet.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
};
