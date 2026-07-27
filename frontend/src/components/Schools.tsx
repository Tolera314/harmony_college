import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Film, Music, Headphones, Palette, Globe, X, ArrowUpRight, BookOpen, Award, Info, ChevronRight } from 'lucide-react';
import { School } from '../types';
import { schoolsData } from '../data/schools';

const iconMap: Record<string, React.ComponentType<any>> = { Camera, Film, Music, Headphones, Palette, Globe };

interface SchoolsProps {
  onSelectSchoolId?: string;
  onClearSelectedSchoolId?: () => void;
}

export default function Schools({ onSelectSchoolId, onClearSelectedSchoolId }: SchoolsProps) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [calculatorCredits, setCalculatorCredits] = useState(12);
  const [isInternational, setIsInternational] = useState(false);
  const [activeDegreeTab, setActiveDegreeTab] = useState<'All'|'Undergraduate'|'Graduate'>('All');

  React.useEffect(() => {
    if (onSelectSchoolId) {
      const match = schoolsData.find(s => s.id === onSelectSchoolId);
      if (match) setSelectedSchool(match);
    }
  }, [onSelectSchoolId]);

  const handleCloseDetail = () => { setSelectedSchool(null); onClearSelectedSchoolId?.(); };
  const handleCardClick = (school: School) => { setSelectedSchool(school); setCalculatorCredits(12); setIsInternational(false); setActiveDegreeTab('All'); };

  const calculateFees = (school: School) => {
    const creditRate = isInternational ? school.tuitionPerCredit * 1.35 : school.tuitionPerCredit;
    const baseTuition = Math.round(calculatorCredits * creditRate);
    const fees = 150 + 120 + (isInternational ? 450 : 200);
    const discount = calculatorCredits >= 15 ? Math.round(baseTuition * 0.08) : 0;
    return { rate: Math.round(creditRate), tuition: baseTuition, fees, discount, total: baseTuition + fees - discount };
  };

  return (
    <section id="programs" className="py-24 relative transition-colors duration-300" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-4">
          <div>
            <span className="text-[#E9C349] font-sans text-[10px] font-bold uppercase tracking-[0.25em] mb-4 block">Our Schools</span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
              Diverse Academic Ecosystems
            </h2>
          </div>
          <button onClick={() => document.getElementById('admissions')?.scrollIntoView({ behavior: 'smooth' })}
            className="border-b border-[#E9C349] text-[#E9C349] font-sans text-xs font-semibold uppercase tracking-widest pb-1 hover:pb-2 transition-all cursor-pointer">
            Explore Admissions Roadmap
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {schoolsData.map(school => {
            const IconComponent = iconMap[school.icon] || Camera;
            return (
              <motion.div key={school.id} whileHover={{ y: -5 }} onClick={() => handleCardClick(school)}
                className="group relative rounded-xl p-8 cursor-pointer shadow-xl transition-all flex flex-col justify-between min-h-[300px] overflow-hidden"
                style={{ border: '1px solid var(--border-card)', backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(12px)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-card-solid)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-card)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-card)'; }}
              >
                <div className="absolute -right-24 -bottom-24 w-48 h-48 bg-[#E9C349]/5 rounded-full blur-3xl group-hover:bg-[#E9C349]/10 transition-all duration-500" />
                <div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[#E9C349] mb-8 group-hover:bg-[#E9C349]/10 group-hover:scale-110 transition-all duration-300"
                    style={{ backgroundColor: 'var(--bg-glass)' }}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold mb-3 group-hover:text-[#E9C349] transition-colors" style={{ color: 'var(--text-primary)' }}>
                    {school.name}
                  </h3>
                  <p className="font-sans text-sm line-clamp-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{school.description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#E9C349] pt-6 group-hover:translate-x-1 transition-transform">
                  Explore Ecosystem <ArrowUpRight className="w-4 h-4" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedSchool && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseDetail}
              className="absolute inset-0 backdrop-blur-md"
              style={{ backgroundColor: 'var(--overlay-dark-bg)' }} />

            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 150 }}
                className="w-screen max-w-2xl flex flex-col shadow-2xl relative"
                style={{ backgroundColor: 'var(--bg-modal)', borderLeft: '1px solid var(--border-default)' }}
              >
                {/* Header */}
                <div className="p-6 flex justify-between items-center sticky top-0 z-10 backdrop-blur-xl"
                  style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-modal-hdr)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[#E9C349]"
                      style={{ backgroundColor: 'var(--bg-glass)' }}>
                      {React.createElement(iconMap[selectedSchool.icon] || Camera, { className: 'w-5 h-5' })}
                    </div>
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedSchool.name}</h3>
                      <p className="font-sans text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Dean: {selectedSchool.dean}</p>
                    </div>
                  </div>
                  <button onClick={handleCloseDetail} className="p-1.5 rounded-full transition-colors" style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-glass)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349]">School Statement</h4>
                    <p className="font-sans text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedSchool.longDescription}</p>
                  </div>

                  <div className="h-px" style={{ backgroundColor: 'var(--border-default)' }} />

                  {/* Degrees */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349]">Offered Degrees</h4>
                      <div className="flex p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                        {(['All','Undergraduate','Graduate'] as const).map(tab => (
                          <button key={tab} onClick={() => setActiveDegreeTab(tab)}
                            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded-md transition-all ${activeDegreeTab === tab ? 'bg-[#E9C349] text-black font-bold' : 'hover:text-[#E9C349]'}`}
                            style={{ color: activeDegreeTab === tab ? '#000' : 'var(--text-secondary)' }}>
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedSchool.degrees.filter(d => activeDegreeTab === 'All' || d.level === activeDegreeTab).map((deg, i) => (
                        <div key={i} className="p-4 rounded-xl flex flex-col justify-between transition-colors"
                          style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                          <div className="flex items-start justify-between">
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider"
                              style={{ backgroundColor: 'var(--bg-glass)', color: 'var(--text-secondary)' }}>{deg.level}</span>
                            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{deg.duration}</span>
                          </div>
                          <h5 className="font-serif text-sm font-bold mt-3 leading-snug" style={{ color: 'var(--text-primary)' }}>{deg.name}</h5>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px" style={{ backgroundColor: 'var(--border-default)' }} />

                  {/* Labs */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349]">Active Research Hubs</h4>
                    <div className="space-y-3">
                      {selectedSchool.labs.map((lab, i) => (
                        <div key={i} className="p-4 rounded-xl flex gap-4 items-start"
                          style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                          <div className="p-2 rounded-lg bg-[#E9C349]/10 text-[#E9C349] text-xs font-bold font-mono">0{i + 1}</div>
                          <div className="space-y-1">
                            <h5 className="font-serif text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lab.name}</h5>
                            <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{lab.focus}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px" style={{ backgroundColor: 'var(--border-default)' }} />

                  {/* Requirements */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349]">Entrance Requirements</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedSchool.requirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs font-sans px-3.5 py-2.5 rounded-lg"
                          style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                          <ChevronRight className="w-4 h-4 text-[#E9C349]" /> {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="h-px" style={{ backgroundColor: 'var(--border-default)' }} />

                  {/* Tuition calculator */}
                  <div className="p-5 rounded-2xl space-y-6 relative overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid rgba(233,195,73,0.20)' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <BookOpen className="w-32 h-32" style={{ color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <Info className="w-3.5 h-3.5 text-[#E9C349]" /> Semester Financial Blueprint
                      </span>
                      <h4 className="font-serif text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Tuition & Fee Calculator</h4>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span style={{ color: 'var(--text-secondary)' }}>Semester Course Load:</span>
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{calculatorCredits} Credits</span>
                      </div>
                      <input type="range" min="3" max="18" step="1" value={calculatorCredits}
                        onChange={e => setCalculatorCredits(parseInt(e.target.value))}
                        className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-[#E9C349]"
                        style={{ backgroundColor: 'var(--border-default)' }} />
                      <div className="flex justify-between text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        <span>3 credits</span><span>12 credits</span><span>18 credits</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>International Student Registry</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>35% international levy applies</p>
                      </div>
                      <button onClick={() => setIsInternational(!isInternational)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isInternational ? 'bg-[#E9C349]' : ''}`}
                        style={{ backgroundColor: isInternational ? '#E9C349' : 'var(--border-strong)' }}>
                        <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${isInternational ? 'translate-x-6' : 'translate-x-1'}`}
                          style={{ backgroundColor: isInternational ? '#141313' : '#fff' }} />
                      </button>
                    </div>

                    {(() => {
                      const bp = calculateFees(selectedSchool);
                      return (
                        <div className="space-y-3 pt-2">
                          {[['Credit Rate', `$${bp.rate} USD / Credit`],['Base Instruction', `$${bp.tuition.toLocaleString()} USD`],['Standard Fees', `$${bp.fees} USD`]].map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs font-sans">
                              <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>
                              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{v}</span>
                            </div>
                          ))}
                          {bp.discount > 0 && (
                            <div className="flex justify-between text-xs font-sans text-green-600">
                              <span>Full-Time Discount (8%):</span>
                              <span className="font-mono">-${bp.discount} USD</span>
                            </div>
                          )}
                          <div className="h-px mt-2" style={{ backgroundColor: 'var(--border-default)' }} />
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-sm font-serif font-bold" style={{ color: 'var(--text-primary)' }}>Estimated Total:</span>
                            <span className="text-xl font-serif font-black text-[#E9C349] font-mono">${bp.total.toLocaleString()} USD</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
