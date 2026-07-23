'use client';

import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Users, Calendar, MapPin, Clock, TrendingUp } from 'lucide-react';
import { InstructorNavTab } from '../../../types/instructor';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { courses, classrooms, students } from '../../../data/departmentData';

interface InMyClassesViewProps {
  setActiveTab: (tab: InstructorNavTab) => void;
}

export const InMyClassesView: React.FC<InMyClassesViewProps> = ({ setActiveTab }) => {
  const myCourses = courses.filter(c => c.facultyId === 'f01');

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="My Classes" subtitle="Fall 2024 · 2 active courses" icon={<BookOpen className="w-5 h-5" />} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {myCourses.map(course => {
          const room = classrooms.find(r => r.id === course.roomId);
          const enrolled = students.filter(s => s.enrolledCourseIds.includes(course.id));
          const avgAtt = enrolled.length ? Math.round(enrolled.reduce((s, st) => s + st.attendanceRate, 0) / enrolled.length) : 0;
          const avgGpa = enrolled.length ? (enrolled.reduce((s, st) => s + st.cgpa, 0) / enrolled.length).toFixed(2) : '0.00';
          const capPct = Math.round((course.registered / course.capacity) * 100);

          return (
            <Card key={course.id} hoverable className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-[#E9C349]">{course.code}</span>
                    <Badge variant={course.status === 'Active' ? 'emerald' : 'glass'}>{course.status}</Badge>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-white truncate">{course.title}</h3>
                  <p className="font-sans text-xs text-white/50 mt-1">{course.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-xl border border-white/8">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Credits</p>
                  <p className="font-mono text-lg font-bold text-white mt-0.5">{course.credits}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/8">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Enrolled</p>
                  <p className="font-mono text-lg font-bold text-white mt-0.5">{course.registered}/{course.capacity}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/8">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Avg Attendance</p>
                  <p className={`font-mono text-lg font-bold mt-0.5 ${avgAtt >= 90 ? 'text-emerald-400' : avgAtt >= 80 ? 'text-[#E9C349]' : 'text-rose-400'}`}>{avgAtt}%</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/8">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Avg GPA</p>
                  <p className="font-mono text-lg font-bold text-[#E9C349] mt-0.5">{avgGpa}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Calendar className="w-3.5 h-3.5 text-white/40" />
                  <span className="font-sans">{course.schedule}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <MapPin className="w-3.5 h-3.5 text-white/40" />
                  <span className="font-sans">{room?.name} · {room?.building}</span>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap pt-2">
                <Button variant="primary" size="sm" onClick={() => setActiveTab('attendance')}>Take Attendance</Button>
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('grades')}>Grades</Button>
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('students')}>Students</Button>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('materials')}>Materials</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
};
