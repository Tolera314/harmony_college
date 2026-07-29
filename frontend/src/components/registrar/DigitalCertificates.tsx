'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { 
  Award, QrCode, Search, Trash2, CheckCircle2, 
  XCircle, Copy, Check, Download, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Initial issued certificates
const initialCertificates = [
  { id: 'cert1', code: 'CERT-2026-9831', studentId: 'HC-2022-0941', name: 'Yohannes Abebe', program: 'Bachelor of Science in Mechanical Engineering', date: 'Jul 16, 2026', qrHash: 'sha256:0b3f892a095...c3df8e', status: 'Issued' },
  { id: 'cert2', code: 'CERT-2026-8812', studentId: 'HC-2023-0832', name: 'Selam Alemayehu', program: 'Bachelor of Science in Computer Science', date: 'Jul 23, 2026', qrHash: 'sha256:1a84f3c2b8d...fa78c4', status: 'Issued' },
  { id: 'cert3', code: 'CERT-2025-4491', studentId: 'HC-2021-0082', name: 'Almaz Tefera', program: 'Bachelor of Arts in Business Administration', date: 'May 20, 2025', qrHash: 'sha256:9f44c3d2e1a...1b8c6a', status: 'Revoked', revokeReason: 'Incorrect minor credit calculations detected.' }
];

export const DigitalCertificates: React.FC = () => {
  const [certs, setCerts] = useState(initialCertificates);
  const [selectedCert, setSelectedCert] = useState<typeof initialCertificates[0] | null>(initialCertificates[0]);
  const [search, setSearch] = useState('');
  
  // Generation form
  const [newCert, setNewCert] = useState({
    studentId: '',
    name: '',
    program: 'Bachelor of Science in Computer Science'
  });

  const [copied, setCopied] = useState(false);

  const filteredCerts = certs.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(`https://verification.harmony.edu/credentials/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCert.name || !newCert.studentId) return;

    const code = `CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord = {
      id: 'cert' + (certs.length + 1),
      code,
      studentId: newCert.studentId.toUpperCase(),
      name: newCert.name,
      program: newCert.program,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      qrHash: `sha256:${Math.random().toString(16).substr(2, 16)}...hash`,
      status: 'Issued'
    };

    setCerts(prev => [newRecord, ...prev]);
    setSelectedCert(newRecord);
    setNewCert({ studentId: '', name: '', program: 'Bachelor of Science in Computer Science' });
    alert('Digital certificate generated successfully with unique cryptographic hash.');
  };

  const handleRevoke = (id: string) => {
    const reason = prompt('Please enter the administrative reason for revoking this certificate:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Revocation requires a valid justification reason.');
      return;
    }

    setCerts(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, status: 'Revoked', revokeReason: reason };
        if (selectedCert?.id === id) setSelectedCert(updated);
        return updated;
      }
      return c;
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-serif font-bold text-(--text-primary) tracking-wide">Digital Certificates</h2>
        <p className="text-xs text-(--text-muted)">Issue secure cryptographic credentials, monitor verification links, and audit revocation records.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Generation form & listings (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Issue Certificate Form */}
          <div className="ds-card rounded-2xl p-5 backdrop-blur-md space-y-4">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Generate Graduate Certificate</h3>
            
            <form onSubmit={handleGenerate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-(--text-faint) uppercase">Student ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HC-2023-0182"
                    value={newCert.studentId}
                    onChange={(e) => setNewCert(prev => ({ ...prev, studentId: e.target.value }))}
                    className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-strong) rounded-xl text-xs text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold)"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-(--text-faint) uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kidus Tilahun"
                    value={newCert.name}
                    onChange={(e) => setNewCert(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-strong) rounded-xl text-xs text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none focus:border-(--brand-gold)"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-(--text-faint) uppercase">Degree Type & Program</label>
                <select
                  value={newCert.program}
                  onChange={(e) => setNewCert(prev => ({ ...prev, program: e.target.value }))}
                  className="w-full px-3 py-2 bg-(--bg-input) border border-(--border-strong) rounded-xl text-xs text-(--text-secondary) focus:outline-none"
                >
                  <option value="Bachelor of Science in Computer Science">B.Sc. Computer Science</option>
                  <option value="Bachelor of Science in Mechanical Engineering">B.Sc. Mechanical Engineering</option>
                  <option value="Bachelor of Arts in Business Administration">B.A. Business Administration</option>
                </select>
              </div>

              <Button 
                variant="gold" 
                size="sm" 
                type="submit"
                className="w-full py-2.5 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Award className="w-4 h-4" /> Generate Cryptographic Certificate
              </Button>
            </form>
          </div>

          {/* List of Issued Certificates */}
          <div className="ds-card rounded-2xl p-5 backdrop-blur-md space-y-4">
            <h3 className="font-serif text-base font-bold text-(--text-primary)">Issued Credentials</h3>
            
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
              <input
                type="text"
                placeholder="Search by Name or Cert ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-(--bg-input) border border-(--border-subtle) rounded-xl focus:outline-none focus:border-(--brand-gold) text-xs text-(--text-primary)"
              />
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {filteredCerts.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCert(c)}
                  className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    selectedCert?.id === c.id 
                      ? 'bg-(--accent-gold-subtle) border-(--brand-gold)' 
                      : 'bg-(--hover-overlay) border-(--border-subtle) hover:border-(--border-default)'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-semibold text-(--text-primary)">{c.name}</h4>
                    <p className="text-[9px] text-(--text-faint) font-mono">{c.code} · {c.date}</p>
                  </div>
                  <Badge variant={c.status === 'Issued' ? 'emerald' : 'rose'}>
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Certificate Mockup preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCert ? (
            <div className="space-y-4">
              
              {/* Controls */}
              <div className="p-3 ds-card rounded-2xl flex items-center justify-between">
                <span className="text-xs font-semibold text-(--text-secondary)">Certificate verification: {selectedCert.code}</span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopyLink(selectedCert.code)}
                    className="flex items-center gap-1 font-semibold text-xs py-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-(--status-success)" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Link
                  </Button>
                  <Button
                    variant="rose"
                    size="sm"
                    disabled={selectedCert.status === 'Revoked'}
                    onClick={() => handleRevoke(selectedCert.id)}
                    className="flex items-center gap-1 font-semibold text-xs py-1.5 bg-(--status-danger-bg) border border-(--status-danger-border) text-(--status-danger) hover:bg-rose-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Revoke
                  </Button>
                </div>
              </div>

              {/* Certificate Sheet Document Layout */}
              <div className="p-10 bg-amber-50/95 text-[#2C2416] rounded-2xl relative shadow-2xl overflow-hidden font-sans border-[8px] border-double border-[#A58448] select-none min-h-[500px] flex flex-col justify-between items-center text-center">
                
                {/* Border corner decorations */}
                <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-[#A58448]" />
                <div className="absolute top-3 right-3 w-10 h-10 border-t-2 border-r-2 border-[#A58448]" />
                <div className="absolute bottom-3 left-3 w-10 h-10 border-b-2 border-l-2 border-[#A58448]" />
                <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-[#A58448]" />
                
                {/* Diagonal Revoked Stamp Overlay */}
                {selectedCert.status === 'Revoked' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs z-10 p-6">
                    <div className="border-4 border-red-600 text-red-600 px-6 py-2 rounded-xl text-3xl font-extrabold uppercase tracking-widest rotate-[-15deg] bg-white/90 shadow-2xl">
                      REVOKED
                    </div>
                    <p className="mt-4 text-xs font-mono text-white bg-black/80 px-4 py-2 rounded-lg max-w-sm">
                      Reason: {(selectedCert as any).revokeReason || 'Administrative decision.'}
                    </p>
                  </div>
                )}

                {/* Crest and Header */}
                <div className="space-y-2 pt-2">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#A58448]/10 border-2 border-[#A58448] flex items-center justify-center text-[#A58448]">
                    <Award className="w-8 h-8" />
                  </div>
                  <h1 className="text-xl font-serif font-bold uppercase tracking-widest text-[#2C2416]">Harmony College</h1>
                  <p className="text-[10px] font-mono uppercase text-[#A58448] tracking-wider font-semibold">Official Diploma Credential</p>
                </div>

                {/* Body Text */}
                <div className="space-y-4 max-w-md my-6">
                  <p className="text-xs italic text-[#5C4D35]">This is to certify that</p>
                  <h2 className="text-2xl font-serif font-extrabold tracking-wide text-[#1A140B] border-b border-[#A58448]/30 pb-2">
                    {selectedCert.name}
                  </h2>
                  <p className="text-xs leading-relaxed text-[#4A3E2B]">
                    having fulfilled all prescribed requirements of the Faculty and the Senate, has been awarded the degree of
                  </p>
                  <h3 className="text-base font-serif font-bold text-[#A58448]">
                    {selectedCert.program}
                  </h3>
                  <p className="text-[11px] text-[#5C4D35]">
                    with all rights, honors, and privileges pertaining thereto.
                  </p>
                </div>

                {/* Signatures and QR Code */}
                <div className="w-full flex justify-between items-end border-t border-[#A58448]/30 pt-4 text-[9px] text-[#4A3E2B]">
                  <div className="text-left space-y-1">
                    <p className="font-mono font-semibold text-[#1A140B]">{selectedCert.date}</p>
                    <p className="text-[8px] uppercase tracking-wider text-[#A58448]">Date of Conferral</p>
                  </div>

                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-10 h-10 bg-white border border-[#A58448] rounded p-1 flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-[#2C2416]" />
                    </div>
                    <p className="font-mono text-[8px] text-[#A58448]">{selectedCert.code}</p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="font-serif font-semibold text-[#1A140B]">Dr. Million G.</p>
                    <p className="text-[8px] uppercase tracking-wider text-[#A58448]">University President</p>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="ds-card rounded-2xl p-12 text-center text-xs text-(--text-muted)">
              Select a digital certificate to view and verify credentials.
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
};
