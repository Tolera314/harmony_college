'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FolderOpen, Upload, Eye, Download, RefreshCw, Search } from 'lucide-react';
import { DocumentCategory } from '../../../types/hr';
import { hrDocuments, employees } from '../../../data/hrData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';

const catColor: Record<DocumentCategory, string> = {
  CV: 'text-sky-400', Contract: 'text-[#E9C349]', 'National ID': 'text-rose-400',
  Certificate: 'text-emerald-400', 'Performance Report': 'text-purple-400',
  Payslip: 'text-amber-400', 'Leave Document': 'text-white/60',
};

export const HRDocumentsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'All'|DocumentCategory>('All');
  const [uploadModal, setUploadModal] = useState(false);

  const filtered = hrDocuments.filter(d => {
    const q = search.toLowerCase();
    const emp = employees.find(e => e.id === d.employeeId);
    const matchQ = !q || d.title.toLowerCase().includes(q) || emp?.name.toLowerCase().includes(q);
    const matchC = catFilter === 'All' || d.category === catFilter;
    return matchQ && matchC;
  });

  const categories: DocumentCategory[] = ['CV', 'Contract', 'National ID', 'Certificate', 'Performance Report', 'Payslip', 'Leave Document'];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="HR Documents"
        subtitle={`${hrDocuments.length} documents stored`}
        icon={<FolderOpen className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Upload className="w-4 h-4" />} onClick={() => setUploadModal(true)}>Upload Document</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><Input icon={<Search className="w-4 h-4" />} placeholder="Search by document title or employee..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCatFilter('All')} className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${catFilter === 'All' ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>All</button>
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${catFilter === c ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Document grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(doc => {
          const emp = employees.find(e => e.id === doc.employeeId);
          return (
            <motion.div key={doc.id} whileHover={{ y: -3 }} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:bg-white/[0.08] transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`font-mono text-xs font-semibold ${catColor[doc.category]}`}>{doc.category}</span>
                  <p className="font-sans text-sm font-semibold text-white mt-1 leading-snug">{doc.title}</p>
                </div>
                <Badge variant="glass" className="text-[10px] shrink-0">v{doc.version}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <img src={emp?.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10" />
                <span className="font-sans text-xs text-white/60 truncate">{emp?.name}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                <span>{doc.fileSize}</span>
                <span>{doc.uploadedAt}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" aria-label="Preview"><Eye className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" aria-label="Download"><Download className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" aria-label="Replace"><RefreshCw className="w-4 h-4" /></button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={uploadModal} onClose={() => setUploadModal(false)} title="Upload Document" maxWidth="max-w-md">
        <div className="space-y-4 font-sans text-sm">
          <div className="space-y-1.5">
            <label className="font-sans text-xs font-semibold text-white/70">Employee</label>
            <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-sans text-sm text-white focus:outline-none focus:border-[#E9C349]">
              <option className="bg-[#1a1a1b]">Select employee...</option>
              {employees.filter(e => e.status === 'Active').map(e => <option key={e.id} className="bg-[#1a1a1b]" value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="font-sans text-xs font-semibold text-white/70">Document Category</label>
            <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-sans text-sm text-white focus:outline-none focus:border-[#E9C349]">
              {categories.map(c => <option key={c} className="bg-[#1a1a1b]">{c}</option>)}
            </select>
          </div>
          <div className="border-2 border-dashed border-white/15 rounded-xl p-8 text-center hover:border-[#E9C349]/40 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="text-white/50 text-xs">Click to upload or drag & drop</p>
            <p className="text-white/30 text-[10px] mt-1 font-mono">PDF, DOCX, JPG up to 20MB</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setUploadModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" icon={<Upload className="w-4 h-4" />} onClick={() => setUploadModal(false)}>Upload</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
