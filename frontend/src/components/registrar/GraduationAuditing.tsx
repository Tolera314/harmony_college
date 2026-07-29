'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { 
  GraduationCap, CheckCircle2, XCircle, AlertTriangle, 
  Search, ShieldCheck, FileCheck, Check, X, User, CheckCheck
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Mock candidates data
const initialCandidates = [
  {
    id: 'g01',
    name: 'Yonas Kebede',
    studentId: 'HC-2024-8832',
    program: 'B.Sc. Computer Science',
    cgpa: 3.85,
    creditsCompleted: 148,
    creditsRequired: 148,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'Pending Audit',
    checklist: [
      { id: 'chk1', name: 'Core Curriculum Credits (148 Cr)', met: true, details: '148/148 Credits fulfilled' },
      { id: 'chk2', name: 'Minimum CGPA Cutoff (>= 2.00)', met: true, details: 'Current CGPA 3.85 meets requirement' },
      { id: 'chk3', name: 'Senior Capstone Project', met: true, details: 'Submitted & Approved (Grade: A)' },
      { id: 'chk4', name: 'Library & Financial Clearance', met: true, details: 'Zero outstanding dues' },
    ]
  },
  {
    id: 'g02',
    name: 'Hanna Tadesse',
    studentId: 'HC-2023-4411',
    program: 'B.Sc. Business Administration',
    cgpa: 3.42,
    creditsCompleted: 142,
    creditsRequired: 148,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'Flagged Hold',
    checklist: [
      { id: 'chk1', name: 'Core Curriculum Credits (148 Cr)', met: false, details: 'Short by 6 elective credits' },
      { id: 'chk2', name: 'Minimum CGPA Cutoff (>= 2.00)', met: true, details: 'Current CGPA 3.42 meets requirement' },
      { id: 'chk3', name: 'Senior Capstone Project', met: true, details: 'Submitted & Approved' },
      { id: 'chk4', name: 'Library & Financial Clearance', met: false, details: 'Library book return unverified' },
    ]
  },
  {
    id: 'g03',
    name: 'Abebe Bikila',
    studentId: 'HC-2022-1002',
    program: 'B.Sc. Mechanical Engineering',
    cgpa: 3.91,
    creditsCompleted: 152,
    creditsRequired: 152,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'Approved',
    checklist: [
      { id: 'chk1', name: 'Core Curriculum Credits (152 Cr)', met: true, details: '152/152 Credits fulfilled' },
      { id: 'chk2', name: 'Minimum CGPA Cutoff (>= 2.00)', met: true, details: 'Current CGPA 3.91 meets requirement' },
      { id: 'chk3', name: 'Senior Capstone Project', met: true, details: 'Passed with Distinction' },
      { id: 'chk4', name: 'Library & Financial Clearance', met: true, details: 'Full Clearance Verified' },
    ]
  }
];

export const GraduationAuditing: React.FC = () => {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState<typeof initialCandidates[0] | null>(initialCandidates[0]);
  const [search, setSearch] = useState('');
  const [reasonMsg, setReasonMsg] = useState('');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const filteredCandidates = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.studentId.toLowerCase().includes(search.toLowerCase())
  );

  const handleClearChecklistItem = (itemKey: string) => {
    if (!selectedCandidate) return;
    setCandidates(prev => prev.map(c => {
      if (c.id === selectedCandidate.id) {
        const updatedList = c.checklist.map(item => item.id === itemKey ? { ...item, met: true } : item);
        const updated = { ...c, checklist: updatedList };
        setSelectedCandidate(updated);
        return updated;
      }
      return c;
    }));
  };

  const handleUpdateGradStatus = (newStatus: 'Approved' | 'Rejected' | 'Flagged Hold') => {
    if (!selectedCandidate) return;
    setCandidates(prev => prev.map(c => {
      if (c.id === selectedCandidate.id) {
        const updated = { ...c, status: newStatus };
        setSelectedCandidate(updated);
        return updated;
      }
      return c;
    }));

    setReasonMsg('');
    setStatusToast(`Graduation status updated to ${newStatus} for ${selectedCandidate.name}. Notification queued.`);
    setTimeout(() => setStatusToast(null), 4000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-serif font-bold text-(--text-primary) tracking-wide">Graduation Auditing</h2>
        <p className="text-xs text-(--text-muted)">Audit student degree requirements, verify clearance metrics, and authorize graduation lists.</p>
      </div>

      {/* Status toast */}
      {statusToast && (
        <div className="flex items-center gap-3 p-3 bg-(--status-success-bg) border border-(--status-success-border) rounded-xl text-xs text-(--status-success) font-semibold">
          <CheckCheck className="w-4 h-4 shrink-0" />
          {statusToast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Candidates list (5 cols) */}
        <div className="lg:col-span-5 ds-card rounded-2xl p-5 backdrop-blur-md space-y-4">
          <h3 className="font-serif text-base font-bold text-(--text-primary)">Graduation Applicants</h3>
          
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
            <input
              type="text"
              placeholder="Search Candidate by Name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-(--bg-input) border border-(--border-subtle) rounded-xl focus:outline-none focus:border-(--brand-gold) text-xs text-(--text-primary)"
            />
          </div>

          <div className="space-y-3">
            {filteredCandidates.map(cand => (
              <div 
                key={cand.id} 
                onClick={() => setSelectedCandidate(cand)}
                className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                  selectedCandidate?.id === cand.id 
                    ? 'bg-(--accent-gold-subtle) border-(--brand-gold) shadow-lg' 
                    : 'bg-(--hover-overlay) border-(--border-subtle) hover:border-(--border-strong)'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={cand.avatar} alt={cand.name} className="w-8 h-8 rounded-full border border-(--border-default) object-cover" />
                  <div>
                    <h4 className="text-xs font-semibold text-(--text-primary)">{cand.name}</h4>
                    <p className="text-[10px] text-(--text-faint) font-mono">{cand.studentId} · {cand.program}</p>
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
              <div className="ds-card rounded-2xl p-5 backdrop-blur-md space-y-4">
                <div className="flex justify-between items-start border-b border-(--border-subtle) pb-4">
                  <div className="flex items-center gap-3">
                    <img src={selectedCandidate.avatar} alt={selectedCandidate.name} className="w-11 h-11 rounded-xl border border-(--border-default) object-cover" />
                    <div>
                      <h3 className="text-sm font-semibold text-(--text-primary)">{selectedCandidate.name}</h3>
                      <p className="text-xs text-(--text-faint)">{selectedCandidate.program} · Yr 4</p>
                    </div>
                  </div>
                  <Badge variant="gold" className="font-mono text-xs font-bold bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--brand-gold)/20">
                    CGPA: {selectedCandidate.cgpa.toFixed(2)}
                  </Badge>
                </div>

                {/* Credit progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-(--text-secondary)">
                    <span>Credit Progress Requirement</span>
                    <span className="font-mono font-bold text-(--text-primary)">
                      {selectedCandidate.creditsCompleted} / {selectedCandidate.creditsRequired} Credits Completed
                    </span>
                  </div>
                  <div className="h-2.5 bg-(--hover-overlay) rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#B49020] to-(--brand-gold) rounded-full"
                      style={{ width: `${(selectedCandidate.creditsCompleted / selectedCandidate.creditsRequired) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Requirements Checklist */}
              <div className="ds-card rounded-2xl p-5 backdrop-blur-md space-y-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-(--text-faint)">Clearance Checklist Verification</h4>
                
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
                        <p className="text-xs font-semibold text-(--text-primary)">{item.name}</p>
                        <p className="text-[10px] text-(--text-muted)">{item.details}</p>
                      </div>

                      {item.met ? (
                        <CheckCircle2 className="w-5 h-5 text-(--status-success) shrink-0" />
                      ) : (
                        <button
                          onClick={() => handleClearChecklistItem(item.id)}
                          className="px-2.5 py-1 bg-(--status-danger-bg) hover:bg-(--accent-gold-subtle) border border-(--status-danger-border) hover:border-(--accent-gold-border) rounded-lg text-[9px] font-semibold text-(--status-danger) hover:text-(--text-primary) transition-all flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Force Clear
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Graduation Approval Decision Box */}
              <div className="ds-card rounded-2xl p-5 backdrop-blur-md space-y-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-(--text-faint)">Audit Assessment Decision</h4>
                
                {selectedCandidate.checklist.every(item => item.met) ? (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/25 rounded-xl text-[11px] leading-relaxed text-(--status-success) flex gap-2">
                    <ShieldCheck className="w-4 h-4 text-(--status-success) shrink-0" />
                    <span>Degree Candidate meets all graduation prerequisites. Ready to authorize.</span>
                  </div>
                ) : (
                  <div className="p-3 bg-red-500/5 border border-red-500/25 rounded-xl text-[11px] leading-relaxed text-(--status-danger) flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-(--status-danger) shrink-0" />
                    <span>Candidate has uncleared clearance items. Approving will generate a registrar override audit log.</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs text-(--text-secondary) font-medium block">Audit Remarks / Justification</label>
                  <input
                    type="text"
                    value={reasonMsg}
                    onChange={(e) => setReasonMsg(e.target.value)}
                    placeholder="Enter audit note or clearance override justification..."
                    className="w-full px-3.5 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold)"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => handleUpdateGradStatus('Approved')}
                    className="flex-1 py-2 font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve Graduation
                  </Button>

                  <Button
                    variant="rose"
                    size="sm"
                    onClick={() => handleUpdateGradStatus('Flagged Hold')}
                    className="flex-1 py-2 font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Place on Hold
                  </Button>
                </div>
              </div>

            </div>
          ) : (
            <div className="ds-card rounded-2xl p-12 text-center text-xs text-(--text-muted)">
              Select a graduation candidate to audit degree requirements.
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
};
