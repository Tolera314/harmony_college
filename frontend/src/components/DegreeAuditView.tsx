import React, { useState } from 'react';
import { RequirementCategory, StudentProfile, NavTab } from '../types';
import {
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface DegreeAuditViewProps {
  profile: StudentProfile;
  requirements: RequirementCategory[];
  setActiveTab: (tab: NavTab) => void;
}

export const DegreeAuditView: React.FC<DegreeAuditViewProps> = ({
  profile,
  requirements,
  setActiveTab
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'remaining'>('all');

  const totalCreditsRequired = profile.totalRequiredCredits;
  const totalCompleted = profile.completedCredits;
  const completionPercentage = ((totalCompleted / totalCreditsRequired) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8 pb-8"
    >
      {/* Degree Header Banner */}
      <Card hoverable={false} className="space-y-5">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <Badge variant="gold">Official Degree Audit Report</Badge>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-2">
              {profile.degree}
            </h2>
            <p className="font-sans text-xs sm:text-sm text-white/60 mt-1">
              Catalog Year: 2021-2022 • Expected Graduation: {profile.expectedGraduation}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="text-right">
              <p className="font-mono text-xs text-white/50">Core Progress</p>
              <p className="font-serif text-3xl font-bold text-[#E9C349]">
                {completionPercentage}%
              </p>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-[#E9C349] flex items-center justify-center font-mono text-xs font-bold text-white shrink-0">
              105/120
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-white/60">
            <span>Completed: 105 Credits</span>
            <span>15 Credits Remaining for Graduation</span>
          </div>
          <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
            <div
              className="bg-[#E9C349] h-full transition-all duration-700"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Graduation Milestone Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverable={false} className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-sans text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>GPA Requirement Met</span>
          </div>
          <p className="font-serif text-xl sm:text-2xl font-bold text-white">
            3.92 GPA (Min 2.0)
          </p>
        </Card>

        <Card hoverable={false} className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-sans text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Residency Credits Met</span>
          </div>
          <p className="font-serif text-xl sm:text-2xl font-bold text-white">
            60/60 Campus Credits
          </p>
        </Card>

        <Card hoverable={false} className="space-y-2">
          <div className="flex items-center gap-2 text-[#E9C349] font-sans text-xs font-bold">
            <Clock className="w-4 h-4" />
            <span>Senior Capstone Thesis</span>
          </div>
          <p className="font-serif text-xl sm:text-2xl font-bold text-white">
            Pending Registration
          </p>
        </Card>
      </div>

      {/* Requirement Categories Breakdown */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-2xl font-bold text-white">
            Curriculum Category Breakdown
          </h3>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all touch-target ${
                filterStatus === 'all'
                  ? 'bg-[#E9C349] text-[#0F0F10] font-semibold'
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              All Requirements
            </button>
            <button
              onClick={() => setFilterStatus('remaining')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all touch-target ${
                filterStatus === 'remaining'
                  ? 'bg-[#E9C349] text-[#0F0F10] font-semibold'
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              Remaining Only
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {requirements.map((category, idx) => {
            const catPercentage = Math.round((category.completedCredits / category.requiredCredits) * 100);
            const filteredCourses = filterStatus === 'remaining'
              ? category.courses.filter((c) => c.status === 'remaining')
              : category.courses;

            if (filteredCourses.length === 0) return null;

            return (
              <Card key={idx} hoverable={false} className="space-y-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h4 className="font-sans font-bold text-lg text-white">
                      {category.title}
                    </h4>
                    <p className="font-mono text-xs text-white/50 mt-0.5">
                      {category.completedCredits} of {category.requiredCredits} Credits Satisfied
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-28 bg-white/10 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#E9C349] h-full"
                        style={{ width: `${catPercentage}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-bold text-[#E9C349]">
                      {catPercentage}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCourses.map((c) => (
                    <div
                      key={c.code}
                      className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                        c.status === 'completed'
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                          : c.status === 'in_progress'
                          ? 'bg-[#E9C349]/15 border-[#E9C349]/30 text-[#E9C349]'
                          : 'bg-white/5 border-white/10 text-white/70'
                      }`}
                    >
                      <div className="flex justify-between items-center font-bold">
                        <span className="font-mono text-xs">{c.code}</span>
                        {c.status === 'completed' ? (
                          <Badge variant="emerald">Grade: {c.grade}</Badge>
                        ) : c.status === 'in_progress' ? (
                          <Badge variant="gold">In Progress</Badge>
                        ) : (
                          <button
                            onClick={() => setActiveTab('registration')}
                            className="text-[10px] font-mono text-[#E9C349] underline flex items-center font-semibold"
                          >
                            Register <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="font-sans font-semibold text-sm line-clamp-1">{c.title}</p>
                      <p className="font-mono text-[10px] opacity-75">{c.credits} Credits</p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
