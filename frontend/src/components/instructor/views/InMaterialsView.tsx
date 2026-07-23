'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FolderOpen, FileText, Presentation, Video, BookOpen, Upload, Eye, Trash2, Edit, Link } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { courseMaterials } from '../../../data/instructorData';
import { MaterialType, MaterialVisibility } from '../../../types/instructor';

const typeIcon: Record<MaterialType, React.ReactNode> = {
  PDF:        <FileText className="w-5 h-5" />,
  Slides:     <Presentation className="w-5 h-5" />,
  Assignment: <BookOpen className="w-5 h-5" />,
  Video:      <Video className="w-5 h-5" />,
  Reference:  <Link className="w-5 h-5" />,
  Syllabus:   <FileText className="w-5 h-5" />,
};

const typeColor: Record<MaterialType, string> = {
  PDF: 'text-rose-400', Slides: 'text-sky-400', Assignment: 'text-[#E9C349]',
  Video: 'text-purple-400', Reference: 'text-emerald-400', Syllabus: 'text-amber-400',
};

const visibilityBadge = (v: MaterialVisibility) =>
  v === 'Published' ? 'emerald' : v === 'Draft' ? 'glass' : 'amber';

export const InMaterialsView: React.FC = () => {
  const [courseFilter, setCourseFilter] = useState<'all' | 'c01' | 'c02'>('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = courseMaterials.filter(m => courseFilter === 'all' || m.courseId === courseFilter);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Course Materials"
        subtitle={`${courseMaterials.length} files across 2 courses`}
        icon={<FolderOpen className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Upload className="w-4 h-4" />} onClick={() => setUploadOpen(true)}>Upload</Button>}
      />

      <div className="flex gap-2">
        {(['all', 'c01', 'c02'] as const).map(f => (
          <button key={f} onClick={() => setCourseFilter(f)}
            className={`px-3 py-2 rounded-xl font-sans text-xs font-medium border transition-all ${courseFilter === f ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
            {f === 'all' ? 'All Courses' : f === 'c01' ? 'FILM402' : 'FILM301'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(m => (
          <motion.div key={m.id} whileHover={{ y: -3 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:bg-white/[0.08] transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className={`w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center ${typeColor[m.type]}`}>
                {typeIcon[m.type]}
              </div>
              <Badge variant={visibilityBadge(m.visibility) as 'emerald'|'glass'|'amber'}>{m.visibility}</Badge>
            </div>
            <div>
              <p className="font-sans text-sm font-semibold text-white leading-snug">{m.title}</p>
              <p className="font-sans text-xs text-white/50 mt-1 line-clamp-2">{m.description}</p>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
              <span>{m.type} · {m.fileSize}</span>
              <span>{m.downloads} downloads</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-white/30">{m.uploadedAt}</span>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" aria-label="Preview"><Eye className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" aria-label="Edit"><Edit className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg hover:bg-rose-950/30 text-white/50 hover:text-rose-400 transition-colors" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Course Material" maxWidth="max-w-lg">
        <div className="space-y-4 font-sans text-sm">
          <Input label="Title" placeholder="e.g. Week 9 — Advanced Lighting Techniques" />
          <div className="space-y-1.5">
            <label className="font-sans text-xs font-semibold text-white/70">Course</label>
            <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-sans text-sm text-white focus:outline-none focus:border-[#E9C349]">
              <option className="bg-[#1a1a1b]" value="c01">FILM402 — Advanced Digital Cinematography</option>
              <option className="bg-[#1a1a1b]" value="c02">FILM301 — Narrative Screenwriting</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="font-sans text-xs font-semibold text-white/70">Type</label>
            <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-sans text-sm text-white focus:outline-none focus:border-[#E9C349]">
              {['PDF', 'Slides', 'Assignment', 'Video', 'Reference', 'Syllabus'].map(t => (
                <option key={t} className="bg-[#1a1a1b]" value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="border-2 border-dashed border-white/15 rounded-xl p-8 text-center hover:border-[#E9C349]/40 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="text-white/50 text-xs">Click to upload or drag & drop</p>
            <p className="text-white/30 text-[10px] mt-1 font-mono">PDF, PPTX, MP4, DOCX up to 50MB</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" icon={<Upload className="w-4 h-4" />} onClick={() => setUploadOpen(false)}>Upload</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
