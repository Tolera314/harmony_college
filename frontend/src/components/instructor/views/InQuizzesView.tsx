'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  HelpCircle, Plus, ChevronLeft, Search, FileText, CheckCircle2,
  Clock, AlertTriangle, Users, Settings2, Trash2, Edit3, Send, X
} from 'lucide-react';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { SlidePanel } from '../../ui/SlidePanel';
import { instructorQuizzes } from '../../../data/instructorData';
import { courses } from '../../../data/departmentData';
import type { InstructorQuiz, InstructorQuizQuestion, InstructorQuizQuestionType } from '../../../types/instructor';

type QuizViewMode = 'list' | 'create' | 'monitor' | 'grade';

export const InQuizzesView: React.FC = () => {
  const [quizzes, setQuizzes] = useState<InstructorQuiz[]>(instructorQuizzes);
  const [mode, setMode] = useState<QuizViewMode>('list');
  const [selectedCourse, setSelectedCourse] = useState<string>('c01');
  const [activeQuiz, setActiveQuiz] = useState<InstructorQuiz | null>(null);

  // Form states for Create/Edit
  const [form, setForm] = useState<Partial<InstructorQuiz>>({});
  const [questions, setQuestions] = useState<InstructorQuizQuestion[]>([]);

  const filteredQuizzes = quizzes.filter(q => q.courseId === selectedCourse);

  const handleCreateNew = () => {
    setForm({
      title: '', description: '', instructions: '',
      durationMinutes: 30, passingScore: 60, maxAttempts: 1,
      shuffleQuestions: false, shuffleAnswers: false, showResultsImmediately: true
    });
    setQuestions([]);
    setMode('create');
  };

  const handleAddQuestion = (type: InstructorQuizQuestionType) => {
    const newQ: InstructorQuizQuestion = {
      id: `q_new_${Date.now()}`,
      type,
      questionText: '',
      points: 10,
      options: type === 'MCQ' || type === 'TrueFalse' ? ['', ''] : undefined
    };
    if (type === 'TrueFalse') newQ.options = ['True', 'False'];
    setQuestions([...questions, newQ]);
  };

  return (
    <div className="space-y-6">
      <DHPageHeader
        title="Quizzes & Assessments"
        subtitle="Manage live quizzes, auto-grading, and student attempts"
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreateNew}>Create Quiz</Button>}
      />

      {mode === 'list' && (
        <div className="space-y-5">
          {/* Course filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {['c01', 'c02'].map(cId => {
              const c = courses.find(x => x.id === cId);
              if (!c) return null;
              const isSel = selectedCourse === cId;
              return (
                <button
                  key={cId} onClick={() => setSelectedCourse(cId)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${isSel ? 'bg-(--brand-gold) text-(--text-inverse) border-transparent shadow' : 'bg-(--hover-overlay) text-(--text-primary) border-(--border-subtle) hover:border-(--border-default)'}`}
                >
                  {c.code} — {c.title}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuizzes.map(quiz => (
              <div key={quiz.id} className="p-5 rounded-2xl border bg-(--bg-card-solid) border-(--border-default) flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <Badge variant={quiz.status === 'Published' ? 'emerald' : 'glass'}>{quiz.status}</Badge>
                      <h3 className="font-semibold mt-2 text-(--text-primary)">{quiz.title}</h3>
                      <p className="text-xs text-(--text-secondary) mt-1 line-clamp-2">{quiz.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs font-mono text-(--text-muted)">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{quiz.durationMinutes}m</div>
                    <div className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" />{quiz.questions.length} Qs</div>
                    <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{quiz.attempts.length} Attempts</div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-(--border-subtle) flex gap-2">
                  <Button variant="secondary" className="flex-1 text-xs" onClick={() => { setActiveQuiz(quiz); setMode('monitor'); }}>
                    Live Monitor
                  </Button>
                  <Button variant="secondary" className="flex-1 text-xs" onClick={() => { setActiveQuiz(quiz); setMode('grade'); }}>
                    Grade Submissions
                  </Button>
                </div>
              </div>
            ))}
            {filteredQuizzes.length === 0 && (
              <div className="col-span-full py-10 text-center border rounded-2xl border-dashed">
                <p className="text-sm text-(--text-muted)">No quizzes found for this course.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE QUIZ SLIDEPANEL */}
      <SlidePanel
        isOpen={mode === 'create'}
        onClose={() => setMode('list')}
        title="Create New Quiz"
        width="max-w-3xl"
      >
        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-lg text-(--brand-gold)">1. Quiz Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-(--text-secondary)">Quiz Title</label>
                <input type="text" className="w-full p-2.5 bg-(--bg-input) border border-(--border-default) rounded-xl text-sm" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-(--text-secondary)">Description</label>
                <textarea rows={2} className="w-full p-2.5 bg-(--bg-input) border border-(--border-default) rounded-xl text-sm" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-(--text-secondary)">Duration (Minutes)</label>
                <input type="number" className="w-full p-2.5 bg-(--bg-input) border border-(--border-default) rounded-xl text-sm" value={form.durationMinutes || ''} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-(--text-secondary)">Passing Score (%)</label>
                <input type="number" className="w-full p-2.5 bg-(--bg-input) border border-(--border-default) rounded-xl text-sm" value={form.passingScore || ''} onChange={e => setForm({ ...form, passingScore: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-(--text-secondary)">Available Date</label>
                <input type="date" className="w-full p-2.5 bg-(--bg-input) border border-(--border-default) rounded-xl text-sm" value={form.availableDate || ''} onChange={e => setForm({ ...form, availableDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-(--text-secondary)">Closing Date</label>
                <input type="date" className="w-full p-2.5 bg-(--bg-input) border border-(--border-default) rounded-xl text-sm" value={form.closingDate || ''} onChange={e => setForm({ ...form, closingDate: e.target.value })} />
              </div>
            </div>
            
            {/* Toggles */}
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.shuffleQuestions || false} onChange={e => setForm({ ...form, shuffleQuestions: e.target.checked })} />
                Shuffle Questions
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.shuffleAnswers || false} onChange={e => setForm({ ...form, shuffleAnswers: e.target.checked })} />
                Shuffle Answers
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.showResultsImmediately || false} onChange={e => setForm({ ...form, showResultsImmediately: e.target.checked })} />
                Show Results Immediately
              </label>
            </div>
          </div>

          <div className="h-px bg-(--border-default)" />

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif font-bold text-lg text-(--brand-gold)">2. Build Questions</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="text-[10px] px-2 py-1" onClick={() => handleAddQuestion('MCQ')}>+ MCQ</Button>
                <Button variant="secondary" className="text-[10px] px-2 py-1" onClick={() => handleAddQuestion('TrueFalse')}>+ True/False</Button>
                <Button variant="secondary" className="text-[10px] px-2 py-1" onClick={() => handleAddQuestion('ShortAnswer')}>+ Short Answer</Button>
                <Button variant="secondary" className="text-[10px] px-2 py-1" onClick={() => handleAddQuestion('FillBlank')}>+ Fill in Blank</Button>
                <Button variant="secondary" className="text-[10px] px-2 py-1" onClick={() => handleAddQuestion('Essay')}>+ Essay</Button>
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-4 border border-(--border-subtle) bg-(--hover-overlay) rounded-xl relative group">
                  <button className="absolute top-2 right-2 p-1.5 text-(--text-faint) hover:text-(--status-danger)" onClick={() => setQuestions(questions.filter(x => x.id !== q.id))}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-(--border-default) flex items-center justify-center font-mono font-bold text-xs shrink-0">{idx + 1}</div>
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-3">
                        <Badge variant="glass">{q.type}</Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-(--text-muted)">Pts:</span>
                          <input type="number" className="w-16 p-1 text-xs border rounded bg-(--bg-input)" value={q.points} onChange={e => { const n = [...questions]; n[idx].points = Number(e.target.value); setQuestions(n); }} />
                        </div>
                      </div>
                      <textarea
                        placeholder="Enter question text..."
                        className="w-full p-2 text-sm border rounded-lg bg-(--bg-input)"
                        value={q.questionText}
                        onChange={e => { const n = [...questions]; n[idx].questionText = e.target.value; setQuestions(n); }}
                      />
                      {(q.type === 'MCQ' || q.type === 'TrueFalse') && (
                        <div className="space-y-2 pl-4 border-l-2 border-(--brand-gold)">
                          {q.options?.map((opt, oIdx) => (
                            <div key={oIdx} className="flex gap-2 items-center">
                              <input type="radio" name={`correct_${q.id}`} checked={q.correctAnswer === opt} onChange={() => { const n = [...questions]; n[idx].correctAnswer = opt; setQuestions(n); }} />
                              <input type="text" className="flex-1 p-1.5 text-xs border rounded bg-(--bg-input)" value={opt} onChange={e => { const n = [...questions]; n[idx].options![oIdx] = e.target.value; setQuestions(n); }} />
                            </div>
                          ))}
                          {q.type === 'MCQ' && (
                            <button className="text-[10px] text-(--brand-gold) font-bold" onClick={() => { const n = [...questions]; n[idx].options!.push(''); setQuestions(n); }}>+ Add Option</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <div className="py-8 text-center text-sm text-(--text-muted) border border-dashed rounded-xl">
                  No questions added yet.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-(--border-default)">
            <Button variant="secondary" onClick={() => setMode('list')}>Cancel</Button>
            <Button variant="primary" icon={<Send className="w-4 h-4" />} onClick={() => setMode('list')}>Publish Quiz</Button>
          </div>
        </div>
      </SlidePanel>

      {/* MONITOR LIVE ATTEMPTS */}
      <SlidePanel
        isOpen={mode === 'monitor'}
        onClose={() => setMode('list')}
        title={`Live Monitor: ${activeQuiz?.title}`}
        width="max-w-4xl"
      >
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-xl bg-(--hover-overlay)">
              <p className="text-xs text-(--text-muted) uppercase tracking-widest font-mono">In Progress</p>
              <p className="text-2xl font-bold text-(--text-primary) mt-1">{activeQuiz?.attempts.filter(a => a.status === 'in_progress').length}</p>
            </div>
            <div className="p-4 border rounded-xl bg-(--hover-overlay)">
              <p className="text-xs text-(--text-muted) uppercase tracking-widest font-mono">Submitted</p>
              <p className="text-2xl font-bold text-(--status-success) mt-1">{activeQuiz?.attempts.filter(a => a.status === 'submitted').length}</p>
            </div>
            <div className="p-4 border rounded-xl bg-(--hover-overlay)">
              <p className="text-xs text-(--text-muted) uppercase tracking-widest font-mono">Graded</p>
              <p className="text-2xl font-bold text-(--text-primary) mt-1">{activeQuiz?.attempts.filter(a => a.status === 'graded').length}</p>
            </div>
          </div>

          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-(--border-default) text-(--text-muted) font-mono text-xs uppercase">
                <th className="pb-3 font-semibold">Student</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Started At</th>
                <th className="pb-3 font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {activeQuiz?.attempts.map(att => (
                <tr key={att.id}>
                  <td className="py-4 font-semibold text-(--brand-gold)">{att.studentId}</td>
                  <td className="py-4">
                    {att.status === 'in_progress' && <Badge variant="amber"><span className="flex items-center gap-1"><Clock className="w-3 h-3" /> In Progress</span></Badge>}
                    {att.status === 'submitted' && <Badge variant="emerald"><span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Submitted</span></Badge>}
                    {att.status === 'graded' && <Badge variant="glass">Graded</Badge>}
                  </td>
                  <td className="py-4 font-mono text-xs">{att.startedAt}</td>
                  <td className="py-4">
                    {(() => {
                      const total = activeQuiz!.questions.length;
                      const answered = Object.keys(att.answers).length;
                      const pct = total > 0 ? Math.round((answered / total) * 100) : (att.status !== 'in_progress' ? 100 : 0);
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-(--border-default) rounded-full overflow-hidden">
                            <div className={`h-full transition-all ${att.status === 'in_progress' ? 'bg-(--brand-gold)' : 'bg-(--status-success)'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-(--text-muted)">{answered}/{total} Qs</span>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SlidePanel>

      {/* GRADE SUBMISSIONS */}
      <SlidePanel
        isOpen={mode === 'grade'}
        onClose={() => setMode('list')}
        title={`Grade Submissions: ${activeQuiz?.title}`}
        width="max-w-4xl"
      >
        <div className="p-6">
          <p className="text-sm text-(--text-secondary) mb-6">Review student submissions and assign grades to manual questions (Essays/Short Answers).</p>
          <div className="space-y-4">
            {activeQuiz?.attempts.filter(a => a.status === 'submitted' || a.status === 'graded').map(att => (
              <div key={att.id} className="p-5 border rounded-2xl bg-(--bg-card-solid)">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-(--border-subtle)">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-(--hover-overlay) flex items-center justify-center font-bold text-xs">{att.studentId.substring(0,3)}</div>
                    <div>
                      <h4 className="font-semibold text-sm">Student {att.studentId}</h4>
                      <p className="text-[10px] text-(--text-muted) font-mono">Submitted: {att.submittedAt}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-(--brand-gold)">{att.score ?? '-'} / {activeQuiz.questions.reduce((sum, q) => sum + q.points, 0)} pts</span>
                    {att.needsManualGrading && <p className="text-[10px] text-(--status-warning) font-bold flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3" /> Needs Manual Grading</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  {activeQuiz.questions.map((q, idx) => {
                    const ans = att.answers[q.id];
                    const isManual = q.type === 'Essay' || q.type === 'ShortAnswer';
                    const isCorrect = ans === q.correctAnswer;
                    
                    return (
                      <div key={q.id} className="p-3 bg-(--bg-input) rounded-xl border border-(--border-subtle) text-sm">
                        <p className="font-semibold mb-1"><span className="text-(--brand-gold) font-mono mr-2">{idx+1}.</span>{q.questionText}</p>
                        <div className="pl-6 space-y-2 mt-2">
                          <p className="text-(--text-secondary) italic border-l-2 border-(--border-default) pl-3 py-1">"{ans || 'No answer provided'}"</p>
                          
                          {!isManual && (
                            <div className="flex items-center gap-2 text-xs font-semibold mt-2">
                              {isCorrect ? <span className="text-(--status-success) flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Correct (+{q.points} pts)</span> : <span className="text-(--status-danger) flex items-center gap-1"><X className="w-3.5 h-3.5" /> Incorrect (0 pts)</span>}
                            </div>
                          )}
                          
                          {isManual && att.status === 'submitted' && (
                            <div className="mt-3 p-3 bg-(--hover-overlay) rounded-lg flex items-center gap-3">
                              <label className="text-xs font-semibold">Award Points:</label>
                              <input type="number" className="w-20 p-1.5 text-xs border rounded bg-(--bg-input)" placeholder={`Max ${q.points}`} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {att.status === 'submitted' && (
                  <div className="mt-5 flex justify-end">
                    <Button variant="primary" className="text-xs" onClick={() => setMode('list')}>Save Grades & Release</Button>
                  </div>
                )}
              </div>
            ))}
            {activeQuiz?.attempts.filter(a => a.status === 'submitted' || a.status === 'graded').length === 0 && (
              <div className="py-10 text-center text-sm text-(--text-muted) border border-dashed rounded-2xl">
                No submissions to grade yet.
              </div>
            )}
          </div>
        </div>
      </SlidePanel>
    </div>
  );
};
