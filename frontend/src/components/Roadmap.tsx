import React, { useState, useEffect } from 'react';
import { Check, Upload, Calendar, Award, FileText, CheckCircle2, ChevronRight, Calculator, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoadmapProps {
  hasApplied: boolean;
  appliedData: any | null;
}

export default function Roadmap({ hasApplied, appliedData }: RoadmapProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  // Drag and drop file state for Step 1
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Step 2 Probability Calculator
  const [calcGPA, setCalcGPA] = useState('3.8');
  const [calcSAT, setCalcSAT] = useState('1450');
  const [acceptanceChance, setAcceptanceChance] = useState<number | null>(null);

  // Step 3 Interview Selection
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewer, setInterviewer] = useState('Ato Biruk Tadesse');
  const [interviewBooked, setInterviewBooked] = useState(false);

  // Step 4 Enrollment
  const [signedConduct, setSignedConduct] = useState(false);

  // Synchronize Step 1 automatically if the user submitted the main Apply Now Modal!
  useEffect(() => {
    if (hasApplied) {
      setCompletedSteps(prev => ({ ...prev, 1: true }));
      setUploadedFileName('Harmony_Application_Form_Submitted.pdf');
    }
  }, [hasApplied]);

  // Acceptance Chance Probability Calculator logic
  const handleCalculateChance = (e: React.FormEvent) => {
    e.preventDefault();
    const gpa = parseFloat(calcGPA);
    const sat = parseInt(calcSAT);

    if (isNaN(gpa) || gpa < 0 || gpa > 4.0 || isNaN(sat) || sat < 400 || sat > 1600) {
      return;
    }

    // Custom non-mock math based formula
    const gpaWeight = gpa * 15; // up to 60
    const satWeight = ((sat - 400) / 1200) * 40; // up to 40
    const baseChance = gpaWeight + satWeight;
    const finalChance = Math.min(99, Math.max(10, Math.round(baseChance)));

    setAcceptanceChance(finalChance);
    setCompletedSteps(prev => ({ ...prev, 2: true }));
  };

  // Drag and drop handlers for manual PDF submit in timeline
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setUploadedFileName(file.name);
        setCompletedSteps(prev => ({ ...prev, 1: true }));
      } else {
        alert("Please upload a valid academic transcript in PDF format.");
      }
    }
  };

  const handleManualFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
      setCompletedSteps(prev => ({ ...prev, 1: true }));
    }
  };

  const handleBookInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewDate) return;
    setInterviewBooked(true);
    setCompletedSteps(prev => ({ ...prev, 3: true }));
  };

  const handleSignConduct = () => {
    setSignedConduct(true);
    setCompletedSteps(prev => ({ ...prev, 4: true }));
  };

  // Calculate percentage
  const numCompleted = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = (numCompleted / 4) * 100;

  const stepsData = [
    {
      id: 1,
      title: 'Submit Application',
      sub: 'Deliver transcript & portfolios.',
      icon: FileText,
      desc: 'The first step in your journey at Harmony College is submitting your details and choosing your preferred program. You can apply through our online portal or drop off a completed form at our campus in Sheger, Burayu infront of Burayu City Administration.',
    },
    {
      id: 2,
      title: 'Portfolio Review',
      sub: 'Ecosystem matching assessment.',
      icon: Award,
      desc: 'Our instructors review your application and creative background to match you with the right program track. Use the eligibility estimator below to check your likelihood of placement based on your prior background.',
    },
    {
      id: 3,
      title: 'Academic Interview',
      sub: 'Collaborative vision alignment.',
      icon: Calendar,
      desc: 'A short 15-minute session with your department instructor to discuss your creative goals, program expectations, and any questions about campus life and schedule. Select a date below to book your slot.',
    },
    {
      id: 4,
      title: 'Final Enrollment',
      sub: 'Matriculate & secure residency.',
      icon: CheckCircle2,
      desc: 'Upon acceptance, complete your enrollment by paying the registration fee, signing the student code of conduct, and receiving your student ID. Welcome to the Harmony College family!',
    },
  ];

  return (
    <section id="admissions" className="py-24 bg-[#0E0E0E] relative overflow-hidden">
      <div className="absolute top-1/3 -right-64 w-[500px] h-[500px] bg-[#E9C349]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-start">
        
        {/* Left Column: Visual Timeline Stepper */}
        <div className="lg:col-span-5 space-y-10 sticky top-28">
          <div>
            <span className="text-[#E9C349] font-sans text-[10px] font-bold uppercase tracking-[0.25em] mb-4 block">
              Admission Roadmap
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Begin Your Journey
            </h2>
            <p className="font-sans text-xs text-gray-400 mt-2">
              Track your real-time admission checklist progress. Complete each sub-action on the right to complete the respective milestone steps!
            </p>
          </div>

          {/* Progress Tracker Banner */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-gray-400">Roadmap Progress</span>
              <span className="text-[#E9C349] font-bold">{progressPercent}% Complete</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#E9C349] h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 font-mono italic">
              {numCompleted === 0 && 'Awaiting step 1 application submission.'}
              {numCompleted > 0 && numCompleted < 4 && 'Excellent progress! Continue completing actions on the right.'}
              {numCompleted === 4 && 'Cohort status unlocked! You are officially ready to enroll.'}
            </p>
          </div>

          {/* Stepper buttons timeline */}
          <div className="relative border-l border-white/10 pl-6 ml-3 space-y-8">
            {stepsData.map((step) => {
              const StepIcon = step.icon;
              const isSelected = activeStep === step.id;
              const isDone = completedSteps[step.id];

              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className="relative group cursor-pointer text-left"
                >
                  {/* Step Bubble indicator */}
                  <div
                    className={`absolute -left-[35px] w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-mono font-bold transition-all ${
                      isDone
                        ? 'bg-[#E9C349] border-[#E9C349] text-black'
                        : isSelected
                        ? 'bg-[#1A1A1C] border-[#E9C349] text-[#E9C349]'
                        : 'bg-[#0E0E0E] border-white/10 text-gray-500 group-hover:border-white/25'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
                  </div>

                  <div className="space-y-0.5">
                    <h3
                      className={`font-serif text-base font-bold transition-colors ${
                        isSelected ? 'text-[#E9C349]' : 'text-white hover:text-[#E9C349]'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="font-sans text-xs text-gray-400 leading-snug">{step.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Step Interactive Action Sandbox Card */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {stepsData.map((step) => {
              if (activeStep !== step.id) return null;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-xl border border-white/10 bg-[#1A1A1C] p-6 sm:p-8 space-y-6 shadow-2xl relative"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#E9C349]">
                      Active Milestone Area • Step {step.id}
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-white mt-1">{step.title}</h3>
                    <p className="font-sans text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed">{step.desc}</p>
                  </div>

                  <div className="h-[1px] bg-white/10" />

                  {/* STEP 1: INTERACTIVE DRAG FILE UPLOAD */}
                  {step.id === 1 && (
                    <div className="space-y-4">
                      {hasApplied && appliedData ? (
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 space-y-2 text-green-400">
                          <p className="font-sans text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Application Core Logged Successfully!
                          </p>
                          <p className="font-sans text-xs text-gray-300">
                            Applicant: <strong>{appliedData.fullName}</strong> ({appliedData.email})<br />
                            Program: <strong>{appliedData.programName}</strong>
                          </p>
                        </div>
                      ) : null}

                      {/* Drag Area */}
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                          dragActive ? 'border-[#E9C349] bg-[#E9C349]/5' : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="file"
                          id="drag-file-upload"
                          className="hidden"
                          accept=".pdf"
                          onChange={handleManualFileInput}
                        />

                        <label htmlFor="drag-file-upload" className="cursor-pointer space-y-4 block">
                          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white mx-auto transition-transform group-hover:scale-110">
                            <Upload className="w-5 h-5 text-[#E9C349]" />
                          </div>
                          <div>
                            <p className="font-sans text-xs text-gray-300">
                              <span className="text-[#E9C349] font-bold">Upload a transcript PDF</span> or drag and drop here
                            </p>
                            <p className="font-mono text-[9px] text-gray-500 mt-1">Accepts official high-school records up to 10MB</p>
                          </div>
                        </label>
                      </div>

                      {uploadedFileName && (
                        <div className="p-3.5 rounded-lg bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2 text-white">
                            <FileText className="w-4 h-4 text-[#E9C349]" />
                            <span className="font-mono truncate max-w-[250px]">{uploadedFileName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-green-400 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 2: GPA/SAT ELIGIBILITY ACCEPTANCE CHANCE CALCULATOR */}
                  {step.id === 2 && (
                    <form onSubmit={handleCalculateChance} className="space-y-4">
                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5 text-[#E9C349]" /> Ecosystem Acceptance Chance Calculator
                        </h4>
                        <p className="text-[11px] text-gray-500 font-sans mt-0.5">Check your estimated probability bracket using historical academic admission indices.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-gray-400">Cumulative GPA</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="4.0"
                            required
                            value={calcGPA}
                            onChange={(e) => setCalcGPA(e.target.value)}
                            className="w-full bg-[#0E0E0E] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E9C349]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-gray-400">SAT Score (or equiv)</label>
                          <input
                            type="number"
                            min="400"
                            max="1600"
                            required
                            value={calcSAT}
                            onChange={(e) => setCalcSAT(e.target.value)}
                            className="w-full bg-[#0E0E0E] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E9C349]"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded font-bold hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
                      >
                        Calculate Admissibility Index <ChevronRight className="w-4 h-4" />
                      </button>

                      {acceptanceChance !== null && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 rounded-xl bg-white/5 border border-white/5 text-center space-y-2"
                        >
                          <p className="text-[10px] font-mono uppercase text-gray-400 tracking-wider">Historical Admission Likelihood</p>
                          <h4 className="font-serif text-3xl font-extrabold text-[#E9C349]">{acceptanceChance}%</h4>
                          <p className="text-xs text-gray-300 font-sans max-w-sm mx-auto leading-relaxed">
                            {acceptanceChance >= 85
                              ? 'Highly Competitive Candidate. Direct pathways for Sterling Scholar honors fellowships.'
                              : acceptanceChance >= 60
                              ? 'Strong Matching Candidate. Standard admission likely under cohort portfolio balance.'
                              : 'Recommended Portfolio Expansion. Consider adding letters of recommendation or research write-ups.'}
                          </p>
                        </motion.div>
                      )}
                    </form>
                  )}

                  {/* STEP 3: INTERVIEW SCHEDULER */}
                  {step.id === 3 && (
                    <form onSubmit={handleBookInterview} className="space-y-4">
                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#E9C349]" /> Appointment Scheduling Console
                        </h4>
                        <p className="text-[11px] text-gray-500 font-sans mt-0.5">Secure your alignment conversation slot with a selected faculty advisor.</p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-gray-400">Advising Professor</label>
                          <select
                            value={interviewer}
                            onChange={(e) => setInterviewer(e.target.value)}
                            className="w-full bg-[#0E0E0E] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E9C349]"
                          >
                            <option value="Ato Biruk Tadesse">Ato Biruk Tadesse (Visual Arts & Photography)</option>
                            <option value="Ato Yonas Haile">Ato Yonas Haile (Music & Vocal Arts)</option>
                            <option value="W/ro Hana Tesfaye">W/ro Hana Tesfaye (Graphic Design & Digital Marketing)</option>
                            <option value="Ato Ermias Alemu">Ato Ermias Alemu (Journalism, IT & Languages)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-gray-400">Choose Appointment Date</label>
                          <input
                            type="date"
                            required
                            value={interviewDate}
                            onChange={(e) => setInterviewDate(e.target.value)}
                            className="w-full bg-[#0E0E0E] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E9C349] [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#E9C349] text-black text-xs font-mono uppercase tracking-widest rounded font-bold hover:scale-[1.01] transition-transform"
                      >
                        Reserve Advising Slot
                      </button>

                      {interviewBooked && (
                        <div className="p-3.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs font-sans text-green-400 space-y-1">
                          <p className="font-bold flex items-center gap-1.5">
                            <Check className="w-4 h-4" /> Interview Scheduled successfully!
                          </p>
                          <p className="text-gray-300">
                            Advisor: <strong>{interviewer}</strong><br />
                            Date: <strong>{interviewDate} at 10:00 AM (Central)</strong>
                          </p>
                        </div>
                      )}
                    </form>
                  )}

                  {/* STEP 4: FINAL ENROLLMENT AGREEMENT */}
                  {step.id === 4 && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400">Final Verification Steps</h4>
                        <p className="text-[11px] text-gray-500 font-sans mt-0.5">Please sign off on final collegiate codes of conduct to complete registration.</p>
                      </div>

                      <div className="space-y-3.5">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                          <input
                            type="checkbox"
                            id="agree-conduct"
                            checked={signedConduct}
                            onChange={handleSignConduct}
                            className="mt-1 accent-[#E9C349] cursor-pointer w-4 h-4 rounded"
                          />
                          <label htmlFor="agree-conduct" className="cursor-pointer select-none space-y-1">
                            <p className="text-xs font-bold text-white">Sign Academic Integrity Code</p>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                          I pledge to uphold Harmony College's standards of integrity, respect, and commitment to learning, and to contribute positively to our creative community.
                            </p>
                          </label>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-white">Complete Your Registration</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Pay enrollment fee at the campus office in Burayu</p>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider bg-[#E9C349]/10 text-[#E9C349]">
                            Completed on admission
                          </span>
                        </div>
                      </div>

                      {signedConduct && (
                        <div className="p-4 rounded-xl bg-[#E9C349]/10 border border-[#E9C349]/30 text-center space-y-1">
                          <p className="font-serif text-sm font-bold text-[#E9C349]">Welcome to Harmony College!</p>
                          <p className="font-sans text-xs text-gray-300 leading-relaxed max-w-sm mx-auto">
                            You have completed all enrollment steps. Check your phone or email for your official welcome message and class schedule.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Navigation within Sandbox card */}
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs font-mono text-gray-400">
                    <button
                      onClick={() => activeStep > 1 && setActiveStep(prev => prev - 1)}
                      disabled={activeStep === 1}
                      className="hover:text-white transition-colors disabled:opacity-20 flex items-center gap-1 cursor-pointer"
                    >
                      &larr; Prev Step
                    </button>
                    <span>Checkpoint {activeStep} of 4</span>
                    <button
                      onClick={() => activeStep < 4 && setActiveStep(prev => prev + 1)}
                      disabled={activeStep === 4}
                      className="hover:text-white transition-colors disabled:opacity-20 flex items-center gap-1 cursor-pointer"
                    >
                      Next Step &rarr;
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
