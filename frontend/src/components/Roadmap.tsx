import React, { useState, useEffect } from 'react';
import { Check, Upload, Calendar, Award, FileText, CheckCircle2, ChevronRight, Calculator, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoadmapProps {
  hasApplied: boolean;
  appliedData: any | null;
}

export default function Roadmap({ hasApplied, appliedData }: RoadmapProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false, 4: false });
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [calcGPA, setCalcGPA] = useState('3.8');
  const [calcSAT, setCalcSAT] = useState('1450');
  const [acceptanceChance, setAcceptanceChance] = useState<number | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewer, setInterviewer] = useState('Ato Biruk Tadesse');
  const [interviewBooked, setInterviewBooked] = useState(false);
  const [signedConduct, setSignedConduct] = useState(false);

  useEffect(() => {
    if (hasApplied) {
      setCompletedSteps(p => ({ ...p, 1: true }));
      setUploadedFileName('Harmony_Application_Form_Submitted.pdf');
    }
  }, [hasApplied]);

  const handleCalculateChance = (e: React.FormEvent) => {
    e.preventDefault();
    const gpa = parseFloat(calcGPA); const sat = parseInt(calcSAT);
    if (isNaN(gpa) || gpa < 0 || gpa > 4.0 || isNaN(sat) || sat < 400 || sat > 1600) return;
    const finalChance = Math.min(99, Math.max(10, Math.round(gpa * 15 + ((sat - 400) / 1200) * 40)));
    setAcceptanceChance(finalChance);
    setCompletedSteps(p => ({ ...p, 2: true }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]?.type === 'application/pdf') {
      setUploadedFileName(e.dataTransfer.files[0].name);
      setCompletedSteps(p => ({ ...p, 1: true }));
    } else alert('Please upload a valid PDF.');
  };

  const handleManualFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { setUploadedFileName(e.target.files[0].name); setCompletedSteps(p => ({ ...p, 1: true })); }
  };

  const handleBookInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewDate) return;
    setInterviewBooked(true);
    setCompletedSteps(p => ({ ...p, 3: true }));
  };

  const numCompleted = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = (numCompleted / 4) * 100;

  const stepsData = [
    { id: 1, title: 'Submit Application', sub: 'Deliver transcript & portfolios.', icon: FileText, desc: 'The first step in your journey at Harmony College is submitting your details and choosing your preferred program.' },
    { id: 2, title: 'Portfolio Review', sub: 'Ecosystem matching assessment.', icon: Award, desc: 'Our instructors review your application and creative background to match you with the right program track.' },
    { id: 3, title: 'Academic Interview', sub: 'Collaborative vision alignment.', icon: Calendar, desc: 'A short 15-minute session with your department instructor to discuss your creative goals and program expectations.' },
    { id: 4, title: 'Final Enrollment', sub: 'Matriculate & secure residency.', icon: CheckCircle2, desc: 'Complete enrollment by paying the registration fee, signing the student code of conduct, and receiving your student ID.' },
  ];

  // shared input style helper
  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.target.style.borderColor = '#E9C349');
  const inputBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.target.style.borderColor = 'var(--border-default)');

  return (
    <section id="admissions" className="py-24 relative overflow-hidden transition-colors duration-300" style={{ backgroundColor: 'var(--bg-surface)' }}>
      <div className="absolute top-1/3 -right-64 w-[500px] h-[500px] bg-[#E9C349]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-start">

        {/* Left: Stepper */}
        <div className="lg:col-span-5 space-y-10 sticky top-28">
          <div>
            <span className="text-[#E9C349] font-sans text-[10px] font-bold uppercase tracking-[0.25em] mb-4 block">Admission Roadmap</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>Begin Your Journey</h2>
            <p className="font-sans text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              Track your real-time admission checklist progress.
            </p>
          </div>

          {/* Progress bar */}
          <div className="p-4 rounded-xl space-y-2" style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex justify-between items-center text-xs font-mono">
              <span style={{ color: 'var(--text-secondary)' }}>Roadmap Progress</span>
              <span className="text-[#E9C349] font-bold">{progressPercent}% Complete</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
              <div className="bg-[#E9C349] h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-[10px] font-mono italic" style={{ color: 'var(--text-muted)' }}>
              {numCompleted === 0 ? 'Awaiting step 1 application submission.' : numCompleted < 4 ? 'Excellent progress! Continue completing actions on the right.' : 'You are officially ready to enroll.'}
            </p>
          </div>

          {/* Stepper */}
          <div className="relative pl-6 ml-3 space-y-8" style={{ borderLeft: '1px solid var(--border-default)' }}>
            {stepsData.map(step => {
              const StepIcon = step.icon;
              const isSelected = activeStep === step.id;
              const isDone = completedSteps[step.id];
              return (
                <div key={step.id} onClick={() => setActiveStep(step.id)} className="relative group cursor-pointer text-left">
                  <div className={`absolute -left-[35px] w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all
                    ${isDone ? 'bg-[#E9C349] border-[#E9C349] text-black' : ''}`}
                    style={{
                      backgroundColor: isDone ? '#E9C349' : isSelected ? 'var(--bg-base)' : 'var(--bg-surface)',
                      border: `1px solid ${isDone ? '#E9C349' : isSelected ? '#E9C349' : 'var(--border-default)'}`,
                      color: isDone ? '#000' : isSelected ? '#E9C349' : 'var(--text-muted)',
                    }}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-serif text-base font-bold transition-colors hover:text-[#E9C349]"
                      style={{ color: isSelected ? '#E9C349' : 'var(--text-primary)' }}>{step.title}</h3>
                    <p className="font-sans text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{step.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active step */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {stepsData.map(step => {
              if (activeStep !== step.id) return null;
              return (
                <motion.div key={step.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}
                  className="rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', backdropFilter: 'blur(12px)' }}>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#E9C349]">Step {step.id} of 4</span>
                    <h3 className="font-serif text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
                    <p className="font-sans text-xs sm:text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
                  </div>
                  <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

                  {/* Step 1: File upload */}
                  {step.id === 1 && (
                    <div className="space-y-4">
                      {hasApplied && appliedData && (
                        <div className="p-4 rounded-xl space-y-2 text-xs" style={{ backgroundColor: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.20)', color: '#16a34a' }}>
                          <p className="font-sans font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Application Logged!</p>
                          <p className="font-sans" style={{ color: 'var(--text-secondary)' }}>Applicant: <strong>{appliedData.fullName}</strong> · Program: <strong>{appliedData.programName}</strong></p>
                        </div>
                      )}
                      <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                        className="border-2 border-dashed rounded-xl p-8 text-center transition-all"
                        style={{ borderColor: dragActive ? '#E9C349' : 'var(--border-default)', backgroundColor: dragActive ? 'rgba(233,195,73,0.05)' : 'transparent' }}>
                        <input type="file" id="drag-file-upload" className="hidden" accept=".pdf" onChange={handleManualFileInput} />
                        <label htmlFor="drag-file-upload" className="cursor-pointer space-y-4 block">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[#E9C349] mx-auto transition-transform hover:scale-110"
                            style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-default)' }}>
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
                              <span className="text-[#E9C349] font-bold">Upload a transcript PDF</span> or drag and drop here
                            </p>
                            <p className="font-mono text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>PDF up to 10MB</p>
                          </div>
                        </label>
                      </div>
                      {uploadedFileName && (
                        <div className="p-3.5 rounded-lg flex justify-between items-center text-xs"
                          style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                          <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <FileText className="w-4 h-4 text-[#E9C349]" />
                            <span className="font-mono truncate max-w-[250px]">{uploadedFileName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-green-600 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Uploaded</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Calculator */}
                  {step.id === 2 && (
                    <form onSubmit={handleCalculateChance} className="space-y-4">
                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          <Calculator className="w-3.5 h-3.5 text-[#E9C349]" /> Acceptance Chance Calculator
                        </h4>
                        <p className="text-[11px] font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>Check your estimated probability using historical admission indices.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[['Cumulative GPA', calcGPA, setCalcGPA, '0.01', '0', '4.0'],['SAT Score', calcSAT, setCalcSAT, '1', '400', '1600']].map(([label, val, setter, step, min, max]) => (
                          <div key={String(label)} className="space-y-1">
                            <label className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                            <input type="number" step={step as string} min={min as string} max={max as string} required
                              value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)}
                              className="w-full rounded px-3 py-2 text-xs focus:outline-none transition-colors" style={inputStyle}
                              onFocus={inputFocus as any} onBlur={inputBlur as any} />
                          </div>
                        ))}
                      </div>
                      <button type="submit" className="w-full py-2.5 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded font-bold hover:scale-[1.01] transition-transform flex items-center justify-center gap-2">
                        Calculate Admissibility Index <ChevronRight className="w-4 h-4" />
                      </button>
                      {acceptanceChance !== null && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="p-4 rounded-xl text-center space-y-2"
                          style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                          <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Historical Admission Likelihood</p>
                          <h4 className="font-serif text-3xl font-extrabold text-[#E9C349]">{acceptanceChance}%</h4>
                          <p className="text-xs font-sans max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {acceptanceChance >= 85 ? 'Highly Competitive Candidate.' : acceptanceChance >= 60 ? 'Strong Matching Candidate.' : 'Recommended Portfolio Expansion.'}
                          </p>
                        </motion.div>
                      )}
                    </form>
                  )}

                  {/* Step 3: Interview */}
                  {step.id === 3 && (
                    <form onSubmit={handleBookInterview} className="space-y-4">
                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          <Calendar className="w-3.5 h-3.5 text-[#E9C349]" /> Appointment Scheduling
                        </h4>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-secondary)' }}>Advising Professor</label>
                          <select value={interviewer} onChange={e => setInterviewer(e.target.value)}
                            className="w-full rounded px-3 py-2 text-xs focus:outline-none transition-colors" style={inputStyle}
                            onFocus={inputFocus as any} onBlur={inputBlur as any}>
                            <option value="Ato Biruk Tadesse">Ato Biruk Tadesse (Visual Arts & Photography)</option>
                            <option value="Ato Yonas Haile">Ato Yonas Haile (Music & Vocal Arts)</option>
                            <option value="W/ro Hana Tesfaye">W/ro Hana Tesfaye (Graphic Design)</option>
                            <option value="Ato Ermias Alemu">Ato Ermias Alemu (Journalism, IT & Languages)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-secondary)' }}>Appointment Date</label>
                          <input type="date" required value={interviewDate} onChange={e => setInterviewDate(e.target.value)}
                            className="w-full rounded px-3 py-2 text-xs focus:outline-none transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                            style={inputStyle} onFocus={inputFocus as any} onBlur={inputBlur as any} />
                        </div>
                      </div>
                      <button type="submit" className="w-full py-2.5 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded font-bold hover:scale-[1.01] transition-transform">
                        Reserve Advising Slot
                      </button>
                      {interviewBooked && (
                        <div className="p-3.5 rounded-lg text-xs font-sans space-y-1" style={{ backgroundColor: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.20)', color: '#16a34a' }}>
                          <p className="font-bold flex items-center gap-1.5"><Check className="w-4 h-4" /> Interview Scheduled!</p>
                          <p style={{ color: 'var(--text-secondary)' }}>Advisor: <strong>{interviewer}</strong> · {interviewDate} at 10:00 AM</p>
                        </div>
                      )}
                    </form>
                  )}

                  {/* Step 4: Enrollment */}
                  {step.id === 4 && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Final Verification Steps</h4>
                      </div>
                      <div className="space-y-3.5">
                        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                          <input type="checkbox" id="agree-conduct" checked={signedConduct} onChange={() => { setSignedConduct(true); setCompletedSteps(p => ({ ...p, 4: true })); }}
                            className="mt-1 accent-[#E9C349] cursor-pointer w-4 h-4 rounded" />
                          <label htmlFor="agree-conduct" className="cursor-pointer select-none space-y-1">
                            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Sign Academic Integrity Code</p>
                            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                              I pledge to uphold Harmony College&apos;s standards of integrity, respect, and commitment to learning.
                            </p>
                          </label>
                        </div>
                        <div className="p-4 rounded-xl flex justify-between items-center" style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                          <div>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Complete Your Registration</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Pay enrollment fee at the campus office</p>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider bg-[#E9C349]/10 text-[#E9C349]">On admission</span>
                        </div>
                      </div>
                      {signedConduct && (
                        <div className="p-4 rounded-xl text-center space-y-1" style={{ backgroundColor: 'rgba(233,195,73,0.08)', border: '1px solid rgba(233,195,73,0.25)' }}>
                          <p className="font-serif text-sm font-bold text-[#E9C349]">Welcome to Harmony College!</p>
                          <p className="font-sans text-xs leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                            You have completed all enrollment steps. Check your phone or email for your official welcome message.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step navigation */}
                  <div className="pt-4 flex justify-between items-center text-xs font-mono" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <button onClick={() => activeStep > 1 && setActiveStep(p => p - 1)} disabled={activeStep === 1}
                      className="hover:text-[#E9C349] transition-colors disabled:opacity-20 flex items-center gap-1 cursor-pointer">
                      ← Prev Step
                    </button>
                    <span>Checkpoint {activeStep} of 4</span>
                    <button onClick={() => activeStep < 4 && setActiveStep(p => p + 1)} disabled={activeStep === 4}
                      className="hover:text-[#E9C349] transition-colors disabled:opacity-20 flex items-center gap-1 cursor-pointer">
                      Next Step →
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
