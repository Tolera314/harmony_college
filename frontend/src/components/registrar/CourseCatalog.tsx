'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, Plus, BookOpen, ChevronRight, 
  ChevronDown, HelpCircle, FileDown, FileUp, 
  Trash2, Edit, AlertCircle, Sparkles, X, Check
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Mock catalog data
const initialCourses = [
  { id: 'c01', code: 'CS101', name: 'Introduction to Computer Science', credits: 4, department: 'Computer Science', semester: 'Fall', prerequisites: [], desc: 'Covers core algorithmic paradigms, computational concepts, and introduction to Python programming.', status: 'Active' },
  { id: 'c02', code: 'CS201', name: 'Data Structures & Algorithms', credits: 4, department: 'Computer Science', semester: 'Spring', prerequisites: ['CS101'], desc: 'In-depth study of stacks, queues, hash tables, search trees, graphs, and algorithm runtime analysis (Big O).', status: 'Active' },
  { id: 'c03', code: 'CS302', name: 'Database Management Systems', credits: 3, department: 'Computer Science', semester: 'Fall', prerequisites: ['CS201'], desc: 'Relational databases, SQL query optimization, transaction management (ACID properties), and schema normalization.', status: 'Active' },
  { id: 'c04', code: 'CS440', name: 'Artificial Intelligence', credits: 4, department: 'Computer Science', semester: 'Spring', prerequisites: ['CS201', 'MATH302'], desc: 'Introduction to machine learning, neural networks, heuristic search algorithms, and logic systems.', status: 'Active' },
  { id: 'c05', code: 'MATH101', name: 'Calculus I', credits: 4, department: 'Mathematics', semester: 'Fall', prerequisites: [], desc: 'Limits, derivatives, integrals, and their applications in calculus.', status: 'Active' },
  { id: 'c06', code: 'MATH302', name: 'Calculus III (Multivariable)', credits: 3, department: 'Mathematics', semester: 'Spring', prerequisites: ['MATH101'], desc: 'Partial derivatives, multiple integrals, vector calculus, and line integrals.', status: 'Active' },
  { id: 'c07', code: 'MECH201', name: 'Engineering Statics', credits: 3, department: 'Mechanical Engineering', semester: 'Fall', prerequisites: ['MATH101'], desc: 'Forces, moments, couples, equilibrium of rigid bodies, and structure analysis.', status: 'Active' },
  { id: 'c08', code: 'BUS101', name: 'Principles of Management', credits: 3, department: 'Business Administration', semester: 'Fall', prerequisites: [], desc: 'Fundamentals of planning, organizing, leading, and controlling in organizational environments.', status: 'Active' }
];

const initialDepartments = ['Computer Science', 'Mathematics', 'Mechanical Engineering', 'Business Administration'];

export const CourseCatalog: React.FC = () => {
  const [courses, setCourses] = useState(initialCourses);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [semFilter, setSemFilter] = useState('All');

  // Add course modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: '',
    name: '',
    credits: 3,
    department: 'Computer Science',
    semester: 'Fall',
    prerequisites: [] as string[],
    desc: '',
    status: 'Active'
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrereqSelect = (code: string) => {
    setNewCourse(prev => {
      const selected = prev.prerequisites.includes(code)
        ? prev.prerequisites.filter(c => c !== code)
        : [...prev.prerequisites, code];
      return { ...prev, prerequisites: selected };
    });
  };

  const handleAddCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.name) return;

    const courseRecord = {
      id: 'c' + (courses.length + 1),
      code: newCourse.code.toUpperCase().replace(/\s/g, ''),
      name: newCourse.name,
      credits: Number(newCourse.credits),
      department: newCourse.department,
      semester: newCourse.semester,
      prerequisites: newCourse.prerequisites,
      desc: newCourse.desc || 'No description provided.',
      status: newCourse.status
    };

    setCourses(prev => [courseRecord, ...prev]);
    setIsModalOpen(false);
    
    // Reset form
    setNewCourse({
      code: '',
      name: '',
      credits: 3,
      department: 'Computer Science',
      semester: 'Fall',
      prerequisites: [],
      desc: '',
      status: 'Active'
    });
  };

  // Bulk simulated actions
  const handleExportCSV = () => {
    alert('Simulating Course Catalog CSV Export...\nCourses data compiled successfully.\nDownload file: course_catalog_export.csv');
  };

  const handleImportCSV = () => {
    alert('Simulating CSV Import...\nPlease select a CSV file formatted with: Code, Name, Credits, Dept, Semester, Prereqs.\nSuccess: Import dry-run parsed 4 courses.');
  };

  const handleDeleteCourse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to retire this course from the catalog? This action will disable future enrollment.')) {
      setCourses(prev => prev.filter(c => c.id !== id));
    }
  };

  // Filter computation
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(search.toLowerCase()) || 
                          c.name.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'All' || c.department === deptFilter;
    const matchesSem = semFilter === 'All' || c.semester === semFilter;
    return matchesSearch && matchesDept && matchesSem;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Course Catalog</h2>
          <p className="text-xs text-white/50">Configure core curricula, prerequisite hierarchies, and departmental structures.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleImportCSV}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold py-2"
          >
            <FileUp className="w-3.5 h-3.5" /> Import CSV
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleExportCSV}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold py-2"
          >
            <FileDown className="w-3.5 h-3.5" /> Export Catalog
          </Button>
          <Button 
            variant="gold" 
            size="sm" 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold py-2"
          >
            <Plus className="w-4 h-4" /> Add Course
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Course Code or Course Name..."
            className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/8 rounded-xl focus:outline-none focus:border-[#D4AF37] text-xs text-white"
          />
        </div>

        <div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-black/30 border border-white/8 rounded-xl focus:outline-none focus:border-[#D4AF37] text-xs text-white/70"
          >
            <option value="All">All Departments</option>
            {initialDepartments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={semFilter}
            onChange={(e) => setSemFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-black/30 border border-white/8 rounded-xl focus:outline-none focus:border-[#D4AF37] text-xs text-white/70"
          >
            <option value="All">All Semesters</option>
            <option value="Fall">Fall Term</option>
            <option value="Spring">Spring Term</option>
            <option value="Summer">Summer Term</option>
          </select>
        </div>
      </div>

      {/* Expandable Rows Course Table */}
      <div className="overflow-hidden border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-white/5 border-b border-white/10 text-white/50 font-mono text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4 w-[60px]" />
              <th className="px-5 py-4">Course Code</th>
              <th className="px-5 py-4">Course Title</th>
              <th className="px-5 py-4">Credits</th>
              <th className="px-5 py-4">Department</th>
              <th className="px-5 py-4">Term</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/80">
            {filteredCourses.map((c) => {
              const isExpanded = !!expandedRows[c.id];
              return (
                <React.Fragment key={c.id}>
                  <tr 
                    onClick={() => toggleRow(c.id)}
                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-4 text-center">
                      <div className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 group-hover:text-[#D4AF37] group-hover:border-[#D4AF37]/30 transition-all">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-white tracking-wider group-hover:text-[#D4AF37] transition-colors">{c.code}</td>
                    <td className="px-5 py-4 text-white/95 font-medium">{c.name}</td>
                    <td className="px-5 py-4 font-mono text-white/70">{c.credits} Cr</td>
                    <td className="px-5 py-4 text-white/60">{c.department}</td>
                    <td className="px-5 py-4 font-mono text-white/50">{c.semester}</td>
                    <td className="px-5 py-4">
                      <Badge variant={c.status === 'Active' ? 'emerald' : 'amber'}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => handleDeleteCourse(c.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Syllabus and Prerequisites Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <tr className="bg-black/20">
                        <td />
                        <td colSpan={7} className="px-5 py-5 border-l-2 border-[#D4AF37] space-y-4">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3.5 overflow-hidden text-xs text-white/70 leading-relaxed"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider">Course Syllabus Description</span>
                              <p className="text-white/80 max-w-2xl">{c.desc}</p>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">Academic Prerequisites</span>
                              <div className="flex flex-wrap gap-2">
                                {c.prerequisites.length > 0 ? (
                                  c.prerequisites.map(pr => {
                                    const pRec = courses.find(cr => cr.code === pr);
                                    return (
                                      <div key={pr} className="px-2.5 py-1 bg-white/5 border border-white/8 rounded-lg flex items-center gap-1.5 text-[11px]">
                                        <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                                        <span className="font-semibold text-white/95 font-mono">{pr}</span>
                                        <span className="text-white/40 font-sans">({pRec?.name || 'Curriculum Course'})</span>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                    No Prerequisites Required (Introductory Course)
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
            {filteredCourses.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-white/40 font-mono text-[11px]">
                  No courses found in the catalog matching the filter parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Course Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0F0F10] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 font-sans"
            >
              {/* Modal Close */}
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-serif font-bold text-white mb-4">Add Course to Catalog</h3>
              
              <form onSubmit={handleAddCourseSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Course Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS202"
                      value={newCourse.code}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Credits</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      required
                      value={newCourse.credits}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, credits: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/80">Course Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Operating Systems"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Department</label>
                    <select
                      value={newCourse.department}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    >
                      {initialDepartments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/80">Default Semester</label>
                    <select
                      value={newCourse.semester}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, semester: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="Fall">Fall</option>
                      <option value="Spring">Spring</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </div>
                </div>

                {/* Prerequisites Multi-Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/80 block">Select Prerequisites</label>
                  <div className="flex flex-wrap gap-2 max-h-[85px] overflow-y-auto p-2 bg-black/30 border border-white/8 rounded-xl">
                    {courses.map(c => {
                      const isSelected = newCourse.prerequisites.includes(c.code);
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => handlePrereqSelect(c.code)}
                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-semibold flex items-center gap-1 transition-all ${
                            isSelected 
                              ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]' 
                              : 'bg-white/5 border-white/8 text-white/40 hover:text-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {c.code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/80">Syllabus Summary Description</label>
                  <textarea
                    rows={3}
                    placeholder="Enter short syllabus contents..."
                    value={newCourse.desc}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, desc: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37] resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="gold" size="sm" type="submit">
                    Add Course
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
