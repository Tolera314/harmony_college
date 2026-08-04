'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GESTURE, DURATION, EASE } from '@/src/lib/motion';
import { FolderOpen, Upload, Eye, Download, RefreshCw, Search } from 'lucide-react';
import { DocumentCategory } from '../../../types/hr';
import { hrDocuments, employees } from '../../../data/hrData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { SlidePanel } from '../../ui/SlidePanel';

const catColor: Record<DocumentCategory, string> = {
  CV: 'text-(--status-info)', Contract: 'text-(--brand-gold)', 'National ID': 'text-(--status-danger)',
  Certificate: 'text-(--status-success)', 'Performance Report': 'text-purple-400',
  Payslip: 'text-(--status-warning)', 'Leave Document': 'text-(--text-secondary)',
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
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
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
          <button onClick={() => setCatFilter('All')} className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${catFilter === 'All' ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>All</button>
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${catFilter === c ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Document grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(doc => {
          const emp = employees.find(e => e.id === doc.employeeId);
          return (
            <motion.div key={doc.id} whileHover={GESTURE.cardHover} className="bg-(--hover-overlay) border border-(--border-default) rounded-2xl p-5 space-y-3 hover:bg-(--hover-overlay) transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`font-mono text-xs font-semibold ${catColor[doc.category]}`}>{doc.category}</span>
                  <p className="font-sans text-sm font-semibold text-(--text-primary) mt-1 leading-snug">{doc.title}</p>
                </div>
                <Badge variant="glass" className="text-[10px] shrink-0">v{doc.version}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <img src={emp?.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-(--border-default)" />
                <span className="font-sans text-xs text-(--text-secondary) truncate">{emp?.name}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-(--text-faint)">
                <span>{doc.fileSize}</span>
                <span>{doc.uploadedAt}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="Preview"><Eye className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="Download"><Download className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors" aria-label="Replace"><RefreshCw className="w-4 h-4" /></button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Upload — SlidePanel */}
      <SlidePanel isOpen={uploadModal} onClose={() => setUploadModal(false)} title="Upload Document" subtitle="HR Documents" width="max-w-md">
        <div className="space-y-4 font-sans text-sm">
          <div className="space-y-1.5">
            <label className="font-sans text-xs font-semibold text-(--text-secondary)">Employee</label>
            <select className="w-full px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              <option className="bg-(--bg-card-solid)">Select employee...</option>
              {employees.filter(e => e.status === 'Active').map(e => <option key={e.id} className="bg-(--bg-card-solid)" value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="font-sans text-xs font-semibold text-(--text-secondary)">Document Category</label>
            <select className="w-full px-4 py-3 bg-(--hover-overlay) border border-(--border-default) rounded-xl font-sans text-sm text-(--text-primary) focus:outline-none focus:border-(--brand-gold)">
              {categories.map(c => <option key={c} className="bg-(--bg-card-solid)">{c}</option>)}
            </select>
          </div>
          <div className="border-2 border-dashed border-(--border-strong) rounded-xl p-8 text-center hover:border-(--accent-gold-border) transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-(--text-faint) mx-auto mb-2" />
            <p className="text-(--text-muted) text-xs">Click to upload or drag & drop</p>
            <p className="text-(--text-faint) text-[10px] mt-1 font-mono">PDF, DOCX, JPG up to 20MB</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setUploadModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" icon={<Upload className="w-4 h-4" />} onClick={() => setUploadModal(false)}>Upload</Button>
          </div>
        </div>
      </SlidePanel>
    </motion.div>
  );
};
