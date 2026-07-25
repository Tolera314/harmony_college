'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, X, ChevronRight, CheckCircle2, 
  XCircle, AlertCircle, FileText, Download, 
  ZoomIn, ZoomOut, RotateCw, Maximize2, Send, 
  Image as ImageIcon, Calendar, User, Phone, MapPin, 
  FileCheck2, ChevronLeft, ChevronDown
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Mock applicant data
const initialApplicants = [
  {
    id: 'app01',
    applicationId: 'HC-2026-0812',
    name: 'Selam Alemayehu',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    email: 'selam.a@gmail.com',
    phone: '+251911223344',
    gender: 'Female',
    dob: '2005-04-12',
    age: 21,
    nationality: 'Ethiopian',
    city: 'Addis Ababa',
    address: 'Bole Subcity, Woreda 03, H.No 451',
    emergencyContact: '+251911998877 (Spouse)',
    program: 'Computer Science (B.Sc.)',
    studyMode: 'Regular',
    academicYear: '2026-2027',
    semester: 'Semester I',
    status: 'Under Review',
    submittedAt: 'Jul 20, 2026',
    faydaId: 'ET-88392019482',
    documents: [
      { id: 'doc1', name: 'Matric Certificate (Grade 12)', type: 'PDF', url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80', file: 'grade12_matric.pdf' },
      { id: 'doc2', name: 'Ministry Result (Grade 8)', type: 'Image', url: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80', file: 'grade8_ministry.jpg' },
      { id: 'doc3', name: 'High School Transcripts (9-12)', type: 'PDF', url: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=800&q=80', file: 'hs_transcripts.pdf' },
      { id: 'doc4', name: 'National Fayda ID Card', type: 'Image', url: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=800&q=80', file: 'fayda_national_id.jpg' }
    ],
    history: [
      { time: 'Jul 20, 2026 09:30 AM', user: 'System', action: 'Application submitted online.' },
      { time: 'Jul 21, 2026 02:00 PM', user: 'Registrar Staff', action: 'Moved status to Under Review. Documents verified.' }
    ]
  },
  {
    id: 'app02',
    applicationId: 'HC-2026-0813',
    name: 'Yonas Kebede',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    email: 'yonas.k@gmail.com',
    phone: '+251911667788',
    gender: 'Male',
    dob: '2004-11-22',
    age: 22,
    nationality: 'Ethiopian',
    city: 'Adama',
    address: 'Kebele 04, H.No 129',
    emergencyContact: '+251911445566 (Mother)',
    program: 'Mechanical Engineering (B.Sc.)',
    studyMode: 'Regular',
    academicYear: '2026-2027',
    semester: 'Semester I',
    status: 'Applied',
    submittedAt: 'Jul 22, 2026',
    faydaId: 'ET-99485736201',
    documents: [
      { id: 'doc1', name: 'Matric Certificate (Grade 12)', type: 'PDF', url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80', file: 'matric_12_yonas.pdf' },
      { id: 'doc4', name: 'National Fayda ID Card', type: 'Image', url: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=800&q=80', file: 'fayda_yonas.jpg' }
    ],
    history: [
      { time: 'Jul 22, 2026 04:15 PM', user: 'System', action: 'Application submitted online.' }
    ]
  },
  {
    id: 'app03',
    applicationId: 'HC-2026-0814',
    name: 'Marta Hailu',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    email: 'marta.h@yahoo.com',
    phone: '+251911889900',
    gender: 'Female',
    dob: '2005-08-30',
    age: 20,
    nationality: 'Ethiopian',
    city: 'Hawassa',
    address: 'Kebele 02, H.No 778',
    emergencyContact: '+251911332211 (Father)',
    program: 'Business Administration (B.A.)',
    studyMode: 'Regular',
    academicYear: '2026-2027',
    semester: 'Semester I',
    status: 'Approved',
    submittedAt: 'Jul 18, 2026',
    faydaId: 'ET-38491029481',
    documents: [
      { id: 'doc1', name: 'Matric Certificate (Grade 12)', type: 'PDF', url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80', file: 'marta_matric.pdf' }
    ],
    history: [
      { time: 'Jul 18, 2026 11:00 AM', user: 'System', action: 'Application submitted online.' },
      { time: 'Jul 19, 2026 04:00 PM', user: 'Registrar Office', action: 'Application reviewed and approved for admission.' }
    ]
  },
  {
    id: 'app04',
    applicationId: 'HC-2026-0815',
    name: 'Kidus Tilahun',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    email: 'kidus.t@gmail.com',
    phone: '+251911443322',
    gender: 'Male',
    dob: '2003-01-15',
    age: 23,
    nationality: 'Ethiopian',
    city: 'Bahir Dar',
    address: 'Kebele 10, H.No 884',
    emergencyContact: '+251911776655 (Brother)',
    program: 'Computer Science (B.Sc.)',
    studyMode: 'Evening',
    academicYear: '2026-2027',
    semester: 'Semester I',
    status: 'Rejected',
    submittedAt: 'Jul 15, 2026',
    faydaId: 'ET-77394019284',
    documents: [],
    history: [
      { time: 'Jul 15, 2026 02:00 PM', user: 'System', action: 'Application submitted online.' },
      { time: 'Jul 16, 2026 05:00 PM', user: 'Registrar Office', action: 'Application rejected due to insufficient Matric scores (Score: 280, Required: 350 for CS).' }
    ]
  }
];

const statusBadgeColors = {
  Applied: 'glass',
  'Under Review': 'amber',
  Approved: 'gold',
  Enrolled: 'emerald',
  Rejected: 'rose',
  Waitlisted: 'amber'
};

export const AdmissionsManagement: React.FC = () => {
  const [applicants, setApplicants] = useState(initialApplicants);
  const [selectedApp, setSelectedApp] = useState<typeof initialApplicants[0] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [programFilter, setProgramFilter] = useState('All');
  
  // Document preview state
  const [activeDoc, setActiveDoc] = useState<typeof initialApplicants[0]['documents'][0] | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Comments
  const [commentText, setCommentText] = useState('');

  // Filtering
  const filteredApplicants = applicants.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) || 
                          app.applicationId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const matchesProgram = programFilter === 'All' || app.program.includes(programFilter);
    return matchesSearch && matchesStatus && matchesProgram;
  });

  // Action Handlers
  const handleUpdateStatus = (appId: string, newStatus: string, actionMsg: string) => {
    setApplicants(prev => prev.map(app => {
      if (app.id === appId) {
        const timestamp = new Date().toLocaleString();
        const updatedHistory = [
          ...app.history,
          { time: timestamp, user: 'Registrar Office', action: actionMsg }
        ];
        const updated = { ...app, status: newStatus as any, history: updatedHistory };
        // If drawer is open, update selected application state as well
        if (selectedApp?.id === appId) {
          setSelectedApp(updated);
        }
        return updated;
      }
      return app;
    }));

    // Trigger simulated applicant notification alert
    alert(`Notification logged for ${selectedApp?.name || 'Applicant'}: "Your application ${selectedApp?.applicationId} has been updated to ${newStatus}."`);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedApp) return;

    const timestamp = new Date().toLocaleString();
    const newHistory = [
      ...selectedApp.history,
      { time: timestamp, user: 'Registrar Note', action: `Comment added: "${commentText}"` }
    ];

    setApplicants(prev => prev.map(app => {
      if (app.id === selectedApp.id) {
        const updated = { ...app, history: newHistory };
        setSelectedApp(updated);
        return updated;
      }
      return app;
    }));

    setCommentText('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Admissions Management</h2>
          <p className="text-xs text-white/50">Verify documents and process applications for the incoming cohort.</p>
        </div>
      </div>

      {/* Advanced Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Applicant Name or Application ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/8 rounded-xl focus:outline-none focus:border-[#D4AF37] text-xs text-white"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-black/30 border border-white/8 rounded-xl focus:outline-none focus:border-[#D4AF37] text-xs text-white/70"
          >
            <option value="All">All Statuses</option>
            <option value="Applied">Applied</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-black/30 border border-white/8 rounded-xl focus:outline-none focus:border-[#D4AF37] text-xs text-white/70"
          >
            <option value="All">All Programs</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Engineering">Mechanical Engineering</option>
            <option value="Business">Business Administration</option>
          </select>
        </div>
      </div>

      {/* Applicant Records Table */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-white/5 border-b border-white/10 text-white/50 font-mono text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4">Applicant</th>
              <th className="px-5 py-4">Application ID</th>
              <th className="px-5 py-4">Program Applied</th>
              <th className="px-5 py-4">Submission Date</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/80">
            {filteredApplicants.map((app) => (
              <tr 
                key={app.id} 
                onClick={() => { setSelectedApp(app); setActiveDoc(null); }}
                className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <img src={app.avatar} alt={app.name} className="w-8 h-8 rounded-full border border-white/15 object-cover" />
                    <div>
                      <p className="font-semibold text-white group-hover:text-[#D4AF37] transition-colors">{app.name}</p>
                      <p className="text-[10px] text-white/40">{app.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-[11px] text-white/60">{app.applicationId}</td>
                <td className="px-5 py-4 text-white/70">{app.program}</td>
                <td className="px-5 py-4 font-mono text-white/50">{app.submittedAt}</td>
                <td className="px-5 py-4">
                  <Badge variant={statusBadgeColors[app.status as keyof typeof statusBadgeColors] as any}>
                    {app.status}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => { setSelectedApp(app); setActiveDoc(null); }}
                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 text-[10px] font-semibold transition-all"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {filteredApplicants.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-white/40 font-mono text-[11px]">
                  No applications found matching the search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Right Drawer Sliding Component */}
      <AnimatePresence>
        {selectedApp && (
          <>
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedApp(null)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[750px] bg-[#0F0F10] border-l border-white/10 z-50 overflow-y-auto flex flex-col shadow-2xl font-sans"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0F0F10] z-10">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Applicant Profile Drawer</span>
                  <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                    {selectedApp.name}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedApp(null)}
                  className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 p-6 space-y-6">
                
                {/* Personal Information Card */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                    <img src={selectedApp.avatar} alt={selectedApp.name} className="w-12 h-12 rounded-xl object-cover border border-white/15" />
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedApp.name}</p>
                      <p className="text-xs text-white/40">{selectedApp.email} · {selectedApp.phone}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { icon: User, label: 'Gender / Age', val: `${selectedApp.gender} · ${selectedApp.age} yrs` },
                      { icon: Calendar, label: 'DOB', val: selectedApp.dob },
                      { icon: FileText, label: 'Fayda ID', val: selectedApp.faydaId },
                      { icon: Phone, label: 'Emergency Contact', val: selectedApp.emergencyContact },
                      { icon: MapPin, label: 'Location', val: `${selectedApp.city}, ${selectedApp.nationality}` },
                      { icon: FileCheck2, label: 'Study Mode', val: `${selectedApp.studyMode} (${selectedApp.program})` }
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1 p-2.5 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-[10px] font-mono text-white/40 flex items-center gap-1">
                          <item.icon className="w-3 h-3 text-[#D4AF37]" /> {item.label}
                        </span>
                        <p className="text-xs text-white/90 font-medium truncate">{item.val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Uploaded Documents List & Premium File Viewer */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-white/40">Uploaded Documents Verification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {selectedApp.documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => {
                          setActiveDoc(doc);
                          setZoom(1);
                          setRotation(0);
                        }}
                        className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-2 text-center text-[10px] font-semibold transition-all ${
                          activeDoc?.id === doc.id
                            ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white shadow-md shadow-[#D4AF37]/10'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {doc.type === 'PDF' ? (
                          <FileText className="w-5 h-5 text-red-400" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-blue-400" />
                        )}
                        <span className="truncate w-full block">{doc.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* PDF/Image Preview Workspace */}
                  {activeDoc && (
                    <div className="p-4 bg-black/60 border border-white/10 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] font-mono text-[#D4AF37]">{activeDoc.file}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))} className="p-1 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
                          <span className="text-[10px] font-mono text-white/60">{Math.round(zoom * 100)}%</span>
                          <button onClick={() => setZoom(prev => Math.min(2.5, prev + 0.2))} className="p-1 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white" title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></button>
                          <div className="w-[1px] h-3 bg-white/10" />
                          <button onClick={() => setRotation(prev => (prev + 90) % 360)} className="p-1 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white" title="Rotate"><RotateCw className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setFullscreen(!fullscreen)} className="p-1 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white" title="Toggle Fullscreen"><Maximize2 className="w-3.5 h-3.5" /></button>
                          <a href={activeDoc.url} download={activeDoc.file} target="_blank" rel="noreferrer" className="p-1 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white" title="Download File"><Download className="w-3.5 h-3.5" /></a>
                        </div>
                      </div>

                      {/* Display Window */}
                      <div className={`relative overflow-hidden flex items-center justify-center bg-[#0F0F10] border border-white/5 rounded-xl transition-all ${fullscreen ? 'fixed inset-4 z-50 shadow-2xl p-8 border-white/20' : 'h-[240px]'}`}>
                        {fullscreen && (
                          <button 
                            onClick={() => setFullscreen(false)} 
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white/80 z-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <div 
                          style={{ 
                            transform: `scale(${zoom}) rotate(${rotation}deg)`,
                            transition: 'transform 0.2s ease-out'
                          }}
                          className="w-full max-w-[90%] h-full max-h-[90%] flex items-center justify-center select-none"
                        >
                          <img 
                            src={activeDoc.url} 
                            alt={activeDoc.name} 
                            className="object-contain max-h-full max-w-full rounded" 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Approve / Reject Actions Panel */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-white/40">Status Assessment Actions</h4>
                  
                  {/* Status Badges Info */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-white/60">Current Application Status:</span>
                    <Badge variant={statusBadgeColors[selectedApp.status as keyof typeof statusBadgeColors] as any}>
                      {selectedApp.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="gold"
                      size="sm"
                      disabled={selectedApp.status === 'Approved'}
                      onClick={() => handleUpdateStatus(selectedApp.id, 'Approved', 'Application reviewed and approved for admission.')}
                      className="flex-1 min-w-[130px] font-semibold flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve Admission
                    </Button>
                    <Button
                      variant="rose"
                      size="sm"
                      disabled={selectedApp.status === 'Rejected'}
                      onClick={() => handleUpdateStatus(selectedApp.id, 'Rejected', 'Application rejected due to criteria mismatches.')}
                      className="flex-1 min-w-[130px] font-semibold flex items-center justify-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                    >
                      <XCircle className="w-4 h-4" /> Reject Application
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedApp.id, 'Under Review', 'Requested document correction / clarifications.')}
                      className="flex-1 min-w-[130px] font-semibold flex items-center justify-center gap-1.5"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-400" /> Request Correction
                    </Button>
                  </div>
                </div>

                {/* Comments / Notes Input */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-white/40">Admissions Staff Comments</h4>
                  <form onSubmit={handleAddComment} className="flex gap-3">
                    <input
                      type="text"
                      required
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Type internal review notes or corrective remarks..."
                      className="flex-1 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <Button variant="gold" size="sm" type="submit" className="shrink-0 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" /> Post
                    </Button>
                  </form>
                </div>

                {/* Audit Timeline / History logs */}
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-white/40">Approval History & Timeline logs</h4>
                  <div className="space-y-3 pl-3 border-l border-white/10">
                    {selectedApp.history.map((h, idx) => (
                      <div key={idx} className="relative text-xs">
                        <span className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#D4AF37] border-2 border-[#0F0F10]" />
                        <div className="space-y-0.5">
                          <p className="text-white/60 font-mono text-[10px]">{h.time} · {h.user}</p>
                          <p className="text-white/95 font-medium leading-relaxed">{h.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
