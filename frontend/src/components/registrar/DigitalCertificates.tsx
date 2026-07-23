'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [selectedCert, setSelectedCert] = useState<typeof initialCertificates[0] | null>(null);
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
    if (reason === null) return; // cancel
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
        <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Digital Certificates</h2>
        <p className="text-xs text-white/50">Issue secure cryptographic credentials, monitor verification links, and audit revocation records.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Generation form & listings (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Issue Certificate Form */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
            <h3 className="font-serif text-base font-bold text-white">Generate Graduate Certificate</h3>
            
            <form onSubmit={handleGenerate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-white/40 uppercase">Student ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HC-2023-0182"
                    value={newCert.studentId}
                    onChange={(e) => setNewCert(prev => ({ ...prev, studentId: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-white/40 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kidus Tilahun"
                    value={newCert.name}
                    onChange={(e) => setNewCert(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-white/40 uppercase">Degree Type & Program</label>
                <select
                  value={newCert.program}
                  onChange={(e) => setNewCert(prev => ({ ...prev, program: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white/80 focus:outline-none"
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
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
            <h3 className="font-serif text-base font-bold text-white">Issued Credentials</h3>
            
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search by Name or Cert ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/8 rounded-xl focus:outline-none focus:border-[#D4AF37] text-xs text-white"
              />
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {filteredCerts.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCert(c)}
                  className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    selectedCert?.id === c.id 
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37]' 
                      : 'bg-black/20 border-white/5 hover:border-white/12'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white">{c.name}</h4>
                    <p className="text-[9px] text-white/40 font-mono">{c.code} · {c.date}</p>
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
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60">Certificate verification: {selectedCert.code}</span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopyLink(selectedCert.code)}
                    className="flex items-center gap-1 font-semibold text-xs py-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Link
                  </Button>
                  <Button
                    variant="rose"
                    size="sm"
                    disabled={selectedCert.status === 'Revoked'}
                    onClick={() => handleRevoke(selectedCert.id)}
                    className="flex items-center gap-1 font-semibold text-xs py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
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
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <div className="border-8 border-red-600 bg-[#FFF0F0] text-red-600 font-bold uppercase tracking-widest text-4xl px-8 py-3 rounded-2xl opacity-80 -rotate-12 border-dashed shadow-2xl flex flex-col items-center">
                      <span>REVOKED</span>
                      <span className="text-xs font-mono lowercase tracking-normal mt-1 text-red-500 font-normal">
                        Reason: {selectedCert.revokeReason}
                      </span>
                    </div>
                  </div>
                )}

                {/* Seal background logo opacity */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
                  <Award className="w-80 h-80" />
                </div>

                {/* Certificate Core Text */}
                <div className="space-y-4 mt-6">
                  <p className="font-serif italic text-base text-[#7C663C] tracking-widest font-semibold uppercase">Harmony College</p>
                  
                  {/* University Seal Badge */}
                  <div className="flex justify-center my-2">
                    <div className="w-12 h-12 bg-white/40 border border-[#A58448]/30 rounded-full flex items-center justify-center shadow-inner">
                      <Award className="w-6 h-6 text-[#A58448]" />
                    </div>
                  </div>

                  <p className="text-xs font-mono uppercase tracking-wider text-gray-500">Upon Recommendation of the Faculty hereby confers on</p>
                  
                  {/* Graduate Name */}
                  <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-wide my-3 font-semibold">
                    {selectedCert.name}
                  </h1>

                  <p className="text-xs font-mono uppercase tracking-wider text-gray-500">the degree of</p>
                  
                  {/* Program Title */}
                  <h2 className="text-lg font-serif font-semibold text-[#8C6D32] tracking-wide my-2 uppercase">
                    {selectedCert.program}
                  </h2>

                  <p className="text-[10px] text-gray-600 leading-relaxed max-w-md mx-auto">
                    with all the rights, honors, and privileges thereunto appertaining. Given in Addis Ababa, Ethiopia on the <span className="font-bold text-gray-900">{selectedCert.date}</span>.
                  </p>
                </div>

                {/* Verification QR / Signature Footer block */}
                <div className="w-full flex justify-between items-end border-t border-[#A58448]/20 mt-8 pt-6">
                  {/* QR Verification */}
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-16 h-16 bg-white border border-[#A58448]/30 rounded p-1.5 flex items-center justify-center shadow-sm shrink-0">
                      <QrCode className="w-full h-full text-gray-800" />
                    </div>
                    <div className="space-y-1 font-mono text-[8px] text-gray-500 max-w-[200px]">
                      <div className="flex items-center gap-1 text-emerald-600 font-bold uppercase">
                        <ShieldCheck className="w-3.5 h-3.5" /> SECURE BLOCKCHAIN HASH
                      </div>
                      <p className="truncate font-semibold text-gray-700">{selectedCert.qrHash}</p>
                      <p>Verify: verification.harmony.edu/verify/{selectedCert.code}</p>
                    </div>
                  </div>

                  {/* Registrar signature */}
                  <div className="text-center space-y-1 shrink-0">
                    <div className="font-serif italic text-sm text-gray-900 border-b border-[#A58448]/30 pb-0.5 px-4">
                      Robel Bekele
                    </div>
                    <p className="text-[7px] font-mono uppercase text-gray-500 font-bold tracking-wider">University Registrar</p>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="h-[480px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 text-center text-white/30 p-6 bg-white/5">
              <QrCode className="w-8 h-8 text-white/20 animate-pulse" />
              <div>
                <h4 className="text-xs font-bold text-white font-sans">No Certificate Selected</h4>
                <p className="text-[10px] text-white/45 max-w-xs mt-1">Select an issued credential from the list, or generate a new digital certificate using the generation form.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
};
