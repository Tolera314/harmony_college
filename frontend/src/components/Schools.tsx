import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Film,
  Music,
  Headphones,
  Palette,
  Globe,
  X,
  ArrowUpRight,
  BookOpen,
  Award,
  Info,
  ChevronRight
} from 'lucide-react';
import { School } from '../types';
import { schoolsData } from '../data/schools';

// Icon Map helper to return correct React component dynamically
const iconMap: Record<string, React.ComponentType<any>> = {
  Camera: Camera,
  Film: Film,
  Music: Music,
  Headphones: Headphones,
  Palette: Palette,
  Globe: Globe,
};

interface SchoolsProps {
  onSelectSchoolId?: string;
  onClearSelectedSchoolId?: () => void;
}

export default function Schools({ onSelectSchoolId, onClearSelectedSchoolId }: SchoolsProps) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [calculatorCredits, setCalculatorCredits] = useState(12);
  const [isInternational, setIsInternational] = useState(false);
  const [activeDegreeTab, setActiveDegreeTab] = useState<'All' | 'Undergraduate' | 'Graduate'>('All');

  // Sync external school selection (e.g. from Search)
  React.useEffect(() => {
    if (onSelectSchoolId) {
      const match = schoolsData.find((s) => s.id === onSelectSchoolId);
      if (match) {
        setSelectedSchool(match);
      }
    }
  }, [onSelectSchoolId]);

  const handleCloseDetail = () => {
    setSelectedSchool(null);
    if (onClearSelectedSchoolId) onClearSelectedSchoolId();
  };

  const handleCardClick = (school: School) => {
    setSelectedSchool(school);
    setCalculatorCredits(12); // Reset credits slider
    setIsInternational(false); // Reset residency
    setActiveDegreeTab('All'); // Reset degree filter
  };

  // Tuition Calculator Logic
  const calculateFees = (school: School) => {
    const basePerCredit = school.tuitionPerCredit;
    const creditRate = isInternational ? basePerCredit * 1.35 : basePerCredit;
    const baseTuition = Math.round(calculatorCredits * creditRate);
    
    const technologyFee = 150;
    const campusRecreationFee = 120;
    const healthInsuranceFee = isInternational ? 450 : 200;
    
    const subtotal = baseTuition + technologyFee + campusRecreationFee + healthInsuranceFee;
    
    // Auto discount for full-time loads (>= 15 credits)
    const fullTimeDiscount = calculatorCredits >= 15 ? Math.round(baseTuition * 0.08) : 0;
    const finalTotal = subtotal - fullTimeDiscount;

    return {
      rate: Math.round(creditRate),
      tuition: baseTuition,
      fees: technologyFee + campusRecreationFee + healthInsuranceFee,
      discount: fullTimeDiscount,
      total: finalTotal,
    };
  };

  return (
    <section id="programs" className="py-24 bg-[#0F0F10] relative">
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-4">
          <div>
            <span className="text-[#E9C349] font-sans text-[10px] font-bold uppercase tracking-[0.25em] mb-4 block">
              Our Schools
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
              Diverse Academic Ecosystems
            </h2>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('admissions');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="border-b border-[#E9C349] text-[#E9C349] font-sans text-xs font-semibold uppercase tracking-widest pb-1 hover:pb-2 transition-all cursor-pointer"
          >
            Explore Admissions Roadmap
          </button>
        </div>

        {/* Schools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {schoolsData.map((school) => {
            const IconComponent = iconMap[school.icon] || Camera;
            return (
              <motion.div
                key={school.id}
                whileHover={{ y: -5 }}
                onClick={() => handleCardClick(school)}
                className="group relative rounded-xl border border-white/5 bg-[#1A1A1C]/60 hover:bg-[#1A1A1C] p-8 cursor-pointer shadow-xl transition-all flex flex-col justify-between min-h-[300px] overflow-hidden"
              >
                {/* Accent Blur */}
                <div className="absolute -right-24 -bottom-24 w-48 h-48 bg-[#E9C349]/5 rounded-full blur-3xl group-hover:bg-[#E9C349]/10 transition-all duration-500" />
                
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-[#E9C349] mb-8 group-hover:bg-[#E9C349]/10 group-hover:scale-110 transition-all duration-300">
                    <IconComponent className="w-6 h-6" />
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-[#E9C349] transition-colors">
                    {school.name}
                  </h3>
                  <p className="font-sans text-sm text-gray-400 line-clamp-3 leading-relaxed">
                    {school.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#E9C349] pt-6 group-hover:translate-x-1 transition-transform">
                  Explore Ecosystem <ArrowUpRight className="w-4 h-4" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* DETAIL DRAWER / SLIDE-OVER */}
      <AnimatePresence>
        {selectedSchool && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDetail}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Slide-over Container */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 150 }}
                className="w-screen max-w-2xl bg-[#1A1A1C] border-l border-white/10 flex flex-col shadow-2xl relative"
              >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#141313]/60 sticky top-0 z-10 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-[#E9C349]">
                      {React.createElement(iconMap[selectedSchool.icon] || Camera, { className: 'w-5 h-5' })}
                    </div>
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-white">{selectedSchool.name}</h3>
                      <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400">Dean: {selectedSchool.dean}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseDetail}
                    className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  
                  {/* Bio */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349]">School Statement</h4>
                    <p className="font-sans text-sm text-gray-300 leading-relaxed">{selectedSchool.longDescription}</p>
                  </div>

                  <div className="h-[1px] bg-white/10" />

                  {/* Academic Programs List with Tabs */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349]">Offered Degrees</h4>
                      <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                        {(['All', 'Undergraduate', 'Graduate'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveDegreeTab(tab)}
                            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded-md transition-all ${
                              activeDegreeTab === tab
                                ? 'bg-[#E9C349] text-black font-bold'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedSchool.degrees
                        .filter((deg) => activeDegreeTab === 'All' || deg.level === activeDegreeTab)
                        .map((deg, i) => (
                          <div
                            key={i}
                            className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-white/10 text-gray-300">
                                {deg.level}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">{deg.duration}</span>
                            </div>
                            <h5 className="font-serif text-sm font-bold text-white mt-3 leading-snug">{deg.name}</h5>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="h-[1px] bg-white/10" />

                  {/* Research & Advanced labs */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349]">Active Research Hubs</h4>
                    <div className="space-y-3">
                      {selectedSchool.labs.map((lab, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-4 items-start">
                          <div className="p-2 rounded-lg bg-[#E9C349]/10 text-[#E9C349] text-xs font-bold font-mono">
                            0{i + 1}
                          </div>
                          <div className="space-y-1">
                            <h5 className="font-serif text-sm font-semibold text-white">{lab.name}</h5>
                            <p className="font-sans text-xs text-gray-400 leading-relaxed">{lab.focus}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-[1px] bg-white/10" />

                  {/* Requirements list */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#E9C349]">Ecosystem Entrance Requirements</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedSchool.requirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs font-sans text-gray-300 bg-white/5 px-3.5 py-2.5 rounded-lg border border-white/5">
                          <ChevronRight className="w-4 h-4 text-[#E9C349]" /> {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="h-[1px] bg-white/10" />

                  {/* Interactive Tuition Fees Calculator widget */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-[#E9C349]/20 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <BookOpen className="w-32 h-32 text-white" />
                    </div>

                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#E9C349]" /> Semester Financial Blueprint
                      </span>
                      <h4 className="font-serif text-lg font-bold text-white mt-1">Tuition & Fee Calculator</h4>
                    </div>

                    {/* Credit hours slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-gray-400">Semester Course Load:</span>
                        <span className="text-white font-bold">{calculatorCredits} Credits</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="18"
                        step="1"
                        value={calculatorCredits}
                        onChange={(e) => setCalculatorCredits(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E9C349]"
                      />
                      <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                        <span>3 credits (Min)</span>
                        <span>12 credits (Full load)</span>
                        <span>18 credits (Max)</span>
                      </div>
                    </div>

                    {/* International switch toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141313] border border-white/5">
                      <div>
                        <p className="text-xs font-semibold text-white">International Student Registry</p>
                        <p className="text-[10px] text-gray-400">Applies international structural levy (35% adjustment)</p>
                      </div>
                      <button
                        onClick={() => setIsInternational(!isInternational)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          isInternational ? 'bg-[#E9C349]' : 'bg-white/10'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isInternational ? 'translate-x-6 bg-[#141313]' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Financial Blueprint breakdown details */}
                    {(() => {
                      const blueprint = calculateFees(selectedSchool);
                      return (
                        <div className="space-y-3 pt-2">
                          <div className="flex justify-between text-xs font-sans">
                            <span className="text-gray-400">Credit Rate:</span>
                            <span className="text-gray-300 font-mono">${blueprint.rate} USD / Credit</span>
                          </div>
                          <div className="flex justify-between text-xs font-sans">
                            <span className="text-gray-400">Base Instruction Cost:</span>
                            <span className="text-gray-300 font-mono">${blueprint.tuition.toLocaleString()} USD</span>
                          </div>
                          <div className="flex justify-between text-xs font-sans">
                            <span className="text-gray-400">Standard Service Fees:</span>
                            <span className="text-gray-300 font-mono">${blueprint.fees} USD</span>
                          </div>
                          {blueprint.discount > 0 && (
                            <div className="flex justify-between text-xs font-sans text-green-400">
                              <span>Full-Time Scholar Discount (8%):</span>
                              <span className="font-mono">-${blueprint.discount} USD</span>
                            </div>
                          )}
                          <div className="h-[1px] bg-white/10 pt-2" />
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-sm font-serif font-bold text-white">Estimated Total:</span>
                            <span className="text-xl font-serif font-black text-[#E9C349] font-mono">
                              ${blueprint.total.toLocaleString()} USD
                            </span>
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
