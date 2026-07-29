'use client';

import React, { useState } from 'react';
import { Course, StudentProfile } from '../types';
import {
  Search,
  Filter,
  CheckCircle2,
  Plus,
  Trash2,
  Clock,
  Building,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { EmptyState } from './ui/States';

interface CourseRegistrationViewProps {
  catalog: Course[];
  registeredCourses: Course[];
  profile: StudentProfile;
  onRegisterCourse: (course: Course) => void;
  onDropCourse: (courseId: string) => void;
}

export const CourseRegistrationView: React.FC<CourseRegistrationViewProps> = ({
  catalog,
  registeredCourses,
  profile,
  onRegisterCourse,
  onDropCourse
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [notification, setNotification] = useState<string | null>(null);

  const registeredIds = new Set(registeredCourses.map((c) => c.id));
  const totalRegisteredCredits = registeredCourses.reduce((acc, c) => acc + c.credits, 0);
  const departments = ['All', 'Computer Science', 'Data Science & CS', 'Mathematics', 'Economics'];

  const filteredCourses = catalog.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All' || course.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleRegister = (course: Course) => {
    onRegisterCourse(course);
    setNotification(`Registered for ${course.code}: ${course.title}`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDrop = (course: Course) => {
    onDropCourse(course.id);
    setNotification(`Dropped course ${course.code}`);
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-8"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-[#E9C349] text-(--text-inverse) rounded-2xl font-sans text-sm font-bold flex items-center justify-between shadow-xl gold-glow"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-(--text-inverse)" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-(--text-inverse) p-1 font-bold">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <Card hoverable={false} className="space-y-5">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div>
            <Badge variant="gold">Harmony Enrollment Simulator</Badge>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>  Course Registration & Planning
            </h2>
            <p className="font-sans text-xs sm:text-sm mt-1" style={{ color: "var(--text-secondary)" }}>  Harmony College Fall 2024 Semester Enrollment Window • Priority Group A
            </p>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl border text-xs font-mono" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--border-default)" }}>
            <div>
              <p className="" style={{ color: "var(--text-faint)" }}>Registered Credits</p>
              <p className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>  {totalRegisteredCredits} <span className="text-xs" style={{ color: "var(--text-faint)" }}>/ 18 Max</span>
              </p>
            </div>
            <div className="h-8 w-px" style={{ backgroundColor: "var(--border-strong)" }} />
            <div>
              <p className="" style={{ color: "var(--text-faint)" }}>Enrolled Courses</p>
              <p className="font-bold text-lg" style={{ color: "var(--brand-gold)" }}>
                {registeredCourses.length} Courses
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 pt-2">
          <div className="flex-1">
            <Input
              icon={<Search className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search course title, code (e.g. CS402), or professor..."
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all touch-target ${selectedDept === dept ? "font-semibold shadow-sm" : "transition-colors"} style={selectedDept === dept ? { backgroundColor: "var(--brand-gold)", color: "var(--text-inverse)" } : { backgroundColor: "var(--hover-overlay)", color: "var(--text-secondary)"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Catalog Grid vs Enrolled Schedule Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Cols: Course Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-serif text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>  Available Courses ({filteredCourses.length})
          </h3>

          <div className="space-y-4">
            {filteredCourses.map((course) => {
              const isRegistered = registeredIds.has(course.id);
              return (
                <Card key={course.id} hoverable={false} className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="gold">{course.code}</Badge>
                        <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>  {course.credits} Credits • {course.department}
                        </span>
                      </div>
                      <h4 className="font-sans text-lg font-semibold mt-1.5" style={{ color: "var(--text-primary)" }}>
                        {course.title}
                      </h4>
                    </div>

                    {isRegistered ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDrop(course)}
                        icon={<Trash2 className="w-4 h-4" />}
                      >
                        Drop
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRegister(course)}
                        icon={<Plus className="w-4 h-4" />}
                      >
                        Register
                      </Button>
                    )}
                  </div>

                  <p className="font-sans text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {course.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-xs pt-3 border-t font-mono gap-2" style={{ color: "var(--text-faint)", borderColor: "var(--border-default)" }}>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#E9C349]" />
                      <span>{course.schedule}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-[#E9C349]" />
                      <span>{course.room}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium" style={{ color: "var(--text-primary)" }}>
                      <span>Prof. {course.instructor}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Enrolled Schedule Summary */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-serif text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>  Enrolled Fall 2024 Schedule
          </h3>

          <Card hoverable={false} className="space-y-4">
            {registeredCourses.length === 0 ? (
              <EmptyState
                variant="courses"
                description="No courses enrolled yet. Select from the catalog on the left."
                compact
              />
            ) : (
              <div className="space-y-3">
                {registeredCourses.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl flex items-center justify-between border-l-4" style={{ backgroundColor: "var(--hover-overlay)", borderLeftColor: "var(--brand-gold)" }}
                  >
                    <div>
                      <span className="font-mono text-xs font-bold" style={{ color: "var(--brand-gold)" }}>  {c.code}
                      </span>
                      <h5 className="font-sans text-xs sm:text-sm font-semibold" style={{ color: "var(--text-primary)" }}>  {c.title}
                      </h5>
                      <p className="font-mono text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>  {c.schedule} • {c.credits} Credits
                      </p>
                    </div>
                    <button
                      onClick={() => handleDrop(c)}
                      className="p-2 transition-colors touch-target" style={{ color: "var(--text-muted)" }}
                      title="Drop course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t flex justify-between items-center text-xs font-sans" style={{ borderColor: "var(--border-default)" }}>
              <span className="" style={{ color: "var(--text-secondary)" }}>Schedule Conflict Check:</span>
              <span className="font-bold flex items-center gap-1" style={{ color: "var(--status-success)" }}>
                <CheckCircle2 className="w-4 h-4" /> No Conflicts
              </span>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
