'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, CheckCircle2, Circle, ChevronRight, Save, Upload, Plus } from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { onboardingRecords, employees } from '../../../data/hrData';
import { OnboardingStep } from '../../../types/hr';

const STEPS: { id: OnboardingStep; label: string; desc: string }[] = [
  { id: 'personal_info',      label: 'Personal Information',  desc: 'Basic personal and contact details' },
  { id: 'employment_details', label: 'Employment Details',    desc: 'Position, department, and employment type' },
  { id: 'contract',           label: 'Contract',              desc: 'Contract type, duration, and terms' },
  { id: 'salary',             label: 'Salary & Benefits',     desc: 'Compensation structure and benefits' },
  { id: 'benefits',           label: 'Benefits',              desc: 'Health, pension, and other benefits' },
  { id: 'documents',          label: 'Documents',             desc: 'Upload required documents' },
  { id: 'review',             label: 'Review & Submit',       desc: 'Final review before submission' },
];

export const HROnboardingView: React.FC = () => {
  const [mode, setMode] = useState<'list' | 'new' | 'existing'>('list');
  const [currentStep, setCurrentStep] = useState(0);
  const [saved, setSaved] = useState(false);

  const record = onboardingRecords[0];
  const emp = employees.find(e => e.id === record?.employeeId);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  if (mode === 'new' || mode === 'existing') {
    const activeStep = mode === 'existing' ? record.currentStep : currentStep;
    const setStep = mode === 'existing' ? () => {} : setCurrentStep;
    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
        <DHPageHeader
          title={mode === 'new' ? 'New Employee Onboarding' : `Onboarding — ${emp?.name}`}
          subtitle={`Step ${activeStep + 1} of ${STEPS.length}`}
          icon={<UserPlus className="w-5 h-5" />}
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMode('list')}>← Back</Button>
              <Button variant="secondary" size="sm" icon={<Save className="w-4 h-4" />} onClick={handleSave}>Save Draft</Button>
            </div>
          }
        />

        {saved && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl font-sans text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Draft saved successfully.
          </motion.div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Step sidebar */}
          <div className="lg:w-64 shrink-0 space-y-1">
            {STEPS.map((step, i) => {
              const done = mode === 'existing' ? record.steps[i].completed : i < currentStep;
              const active = i === (mode === 'new' ? currentStep : activeStep);
              return (
                <button
                  key={step.id}
                  onClick={() => mode === 'new' && setCurrentStep(i)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${active ? 'bg-[#E9C349]/12 border border-[#E9C349]/30 text-[#E9C349]' : done ? 'bg-emerald-950/20 border border-emerald-800/30 text-emerald-300' : 'bg-white/5 border border-white/8 text-white/50 hover:text-white'}`}
                >
                  <div className="shrink-0">
                    {done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : active ? <div className="w-4 h-4 rounded-full border-2 border-[#E9C349] bg-[#E9C349]/20" /> : <Circle className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans text-xs font-semibold truncate">{step.label}</p>
                    <p className="font-sans text-[10px] text-white/40 truncate">{step.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step content */}
          <div className="flex-1 min-w-0">
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-white border-b border-white/10 pb-4">
                {STEPS[mode === 'new' ? currentStep : activeStep]?.label}
              </h3>

              {(mode === 'new' ? currentStep : activeStep) === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Full Name" placeholder="e.g. Dr. Almaz Bekele" defaultValue={mode === 'existing' ? emp?.name : ''} />
                  <Input label="Date of Birth" type="date" />
                  <Input label="Gender" placeholder="Select..." />
                  <Input label="Phone Number" placeholder="+251..." defaultValue={mode === 'existing' ? emp?.phone : ''} />
                  <Input label="Personal Email" type="email" placeholder="personal@email.com" />
                  <Input label="Address" placeholder="Addis Ababa, Ethiopia" />
                  <Input label="National ID" placeholder="Will be masked after save" />
                  <Input label="Emergency Contact Name" defaultValue={mode === 'existing' ? emp?.emergencyName : ''} />
                  <Input label="Emergency Contact Phone" defaultValue={mode === 'existing' ? emp?.emergencyPhone : ''} />
                  <Input label="Emergency Contact Relation" defaultValue={mode === 'existing' ? emp?.emergencyRelation : ''} />
                </div>
              )}

              {(mode === 'new' ? currentStep : activeStep) === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Employee ID" placeholder="Auto-generated on submit" disabled className="opacity-50" />
                  <Input label="Position / Job Title" placeholder="e.g. Assistant Professor" />
                  <div className="space-y-1.5">
                    <label className="font-sans text-xs font-semibold text-white/70">Department</label>
                    <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-sans text-sm text-white focus:outline-none focus:border-[#E9C349]">
                      <option className="bg-[#1a1a1b]">Select Department</option>
                      <option className="bg-[#1a1a1b]">Theatrical Art & Digital Media</option>
                      <option className="bg-[#1a1a1b]">Computer Science & Engineering</option>
                      <option className="bg-[#1a1a1b]">Human Resources</option>
                      <option className="bg-[#1a1a1b]">Finance & Accounting</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-sans text-xs font-semibold text-white/70">Employment Type</label>
                    <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-sans text-sm text-white focus:outline-none focus:border-[#E9C349]">
                      <option className="bg-[#1a1a1b]">Full-Time</option>
                      <option className="bg-[#1a1a1b]">Part-Time</option>
                      <option className="bg-[#1a1a1b]">Contract</option>
                    </select>
                  </div>
                  <Input label="Start / Hire Date" type="date" />
                  <Input label="Reporting Manager" placeholder="Search manager..." />
                </div>
              )}

              {(mode === 'new' ? currentStep : activeStep) === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-sans text-xs font-semibold text-white/70">Contract Type</label>
                    <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-sans text-sm text-white focus:outline-none focus:border-[#E9C349]">
                      <option className="bg-[#1a1a1b]">Permanent</option>
                      <option className="bg-[#1a1a1b]">Fixed-Term</option>
                      <option className="bg-[#1a1a1b]">Probationary</option>
                    </select>
                  </div>
                  <Input label="Contract Start Date" type="date" />
                  <Input label="Contract End Date (if applicable)" type="date" />
                  <Input label="Probation Period (months)" type="number" placeholder="3" />
                </div>
              )}

              {(mode === 'new' ? currentStep : activeStep) === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Basic Salary (ETB)" type="number" placeholder="e.g. 35000" />
                  <Input label="Housing Allowance (ETB)" type="number" placeholder="e.g. 3000" />
                  <Input label="Transport Allowance (ETB)" type="number" placeholder="e.g. 1500" />
                  <Input label="Bank Account Number" placeholder="Will be masked after save" />
                  <Input label="Tax Identification Number" placeholder="Will be masked after save" />
                  <Input label="Pension Fund Number" placeholder="Optional" />
                </div>
              )}

              {(mode === 'new' ? currentStep : activeStep) === 4 && (
                <div className="space-y-3">
                  {[{ label: 'Medical Insurance', sub: 'NYALA Life & General Insurance' }, { label: 'Pension Contribution', sub: '7% employee + 11% employer (CBE Birr)' }, { label: 'Annual Leave', sub: '20 days per year' }, { label: 'Sick Leave', sub: '15 days per year' }].map(b => (
                    <label key={b.label} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl cursor-pointer border border-white/10">
                      <div>
                        <p className="font-sans text-sm font-semibold text-white">{b.label}</p>
                        <p className="font-sans text-xs text-white/50 mt-0.5">{b.sub}</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#E9C349] cursor-pointer" />
                    </label>
                  ))}
                </div>
              )}

              {(mode === 'new' ? currentStep : activeStep) === 5 && (
                <div className="space-y-4">
                  {['CV / Resume', 'Employment Contract', 'National ID Copy', 'Academic Certificates', 'Recent Photo (passport size)'].map(doc => (
                    <div key={doc} className="flex items-center justify-between p-4 bg-white/5 border border-white/8 rounded-xl">
                      <p className="font-sans text-xs font-semibold text-white">{doc}</p>
                      <Button variant="secondary" size="sm" icon={<Upload className="w-4 h-4" />}>Upload</Button>
                    </div>
                  ))}
                </div>
              )}

              {(mode === 'new' ? currentStep : activeStep) === 6 && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#E9C349]/8 border border-[#E9C349]/20 rounded-xl">
                    <p className="font-sans text-sm text-white/70">Please review all information before submitting. Once submitted, the employee will be activated in the system and receive their credentials.</p>
                  </div>
                  <Button variant="primary" className="w-full" icon={<CheckCircle2 className="w-4 h-4" />}>Complete Onboarding</Button>
                </div>
              )}

              {/* Step navigation */}
              <div className="flex justify-between pt-4 border-t border-white/10">
                <Button variant="secondary" size="sm" onClick={() => mode === 'new' && setCurrentStep(p => Math.max(0, p - 1))} disabled={mode === 'new' && currentStep === 0}>← Previous</Button>
                <Button variant="primary" size="sm" onClick={() => mode === 'new' && setCurrentStep(p => Math.min(STEPS.length - 1, p + 1))} disabled={mode === 'new' && currentStep === STEPS.length - 1}>
                  {mode === 'new' && currentStep === STEPS.length - 1 ? 'Submit' : 'Next →'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Onboarding"
        subtitle={`${onboardingRecords.filter(o => o.status === 'In Progress').length} in progress`}
        icon={<UserPlus className="w-5 h-5" />}
        actions={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setMode('new')}>Start New Onboarding</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {onboardingRecords.map(record => {
          const emp = employees.find(e => e.id === record.employeeId);
          const pct = Math.round((record.steps.filter(s => s.completed).length / record.steps.length) * 100);
          return (
            <Card key={record.id} hoverable className="space-y-4" onClick={() => setMode('existing')}>
              <div className="flex items-center gap-3">
                <img src={emp?.avatar} alt={emp?.name} className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" />
                <div className="min-w-0">
                  <p className="font-serif text-sm font-bold text-white truncate">{emp?.name}</p>
                  <p className="font-sans text-xs text-white/50 truncate">{emp?.position}</p>
                  <Badge variant={record.status === 'Completed' ? 'emerald' : record.status === 'In Progress' ? 'gold' : 'glass'} className="mt-1 text-[10px]">{record.status}</Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                  <span>Progress</span><span className="text-[#E9C349]">{pct}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-[#E9C349] rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {record.steps.map((s, i) => (
                  <div key={i} className={`w-4 h-1.5 rounded-full ${s.completed ? 'bg-emerald-400' : 'bg-white/15'}`} />
                ))}
              </div>
              <p className="font-mono text-[10px] text-white/30">Started {record.startedAt}</p>
            </Card>
          );
        })}

        {onboardingRecords.length === 0 && (
          <div className="col-span-3 py-20 text-center">
            <UserPlus className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="font-sans text-sm text-white/30">No onboarding records. Start a new employee onboarding above.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Missing import for Plus — moved to top
