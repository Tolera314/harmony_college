'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import {
  HelpCircle, ChevronLeft, ChevronRight, CheckCircle2, Clock,
  AlertTriangle, BookOpen, Send, X, Star
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { SlidePanel } from './ui/SlidePanel';
import { Card } from './ui/Card';
import { EmptyState } from './ui/States';
import { initialActiveCourses } from '../data/studentData';
import type { StudentQuiz, Course, QuizQuestion } from '../types';
import { studentDashApi } from '@/src/lib/studentApi';

interface StudentQuizzesViewProps {
  enrolledCourses?: Course[];
}

export const StudentQuizzesView: React.FC<StudentQuizzesViewProps> = ({ enrolledCourses }) => {
  const [courses, setCourses] = useState<Course[]>(enrolledCourses && enrolledCourses.length > 0 ? enrolledCourses : initialActiveCourses);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');

  useEffect(() => {
    if (enrolledCourses && enrolledCourses.length > 0) {
      setCourses(enrolledCourses);
      if (!selectedCourseId || !enrolledCourses.find(c => c.id === selectedCourseId)) {
        setSelectedCourseId(enrolledCourses[0].id);
      }
    }
  }, [enrolledCourses, selectedCourseId]);
  
  // Slide panel state (for instructions / details before taking quiz, or viewing results)
  const [selectedQuiz, setSelectedQuiz] = useState<StudentQuiz | null>(null);
  
  // Taking Quiz state
  const [isTakingQuiz, setIsTakingQuiz] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isReviewing, setIsReviewing] = useState(false);

  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
  const quizzes = activeCourse?.quizzes || [];

  const pendingQuizzes = quizzes.filter(q => !q.attempt || q.attempt.status === 'in_progress');
  const completedQuizzes = quizzes.filter(q => q.attempt && (q.attempt.status === 'submitted' || q.attempt.status === 'graded'));

  // Timer effect
  useEffect(() => {
    if (isTakingQuiz && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (isTakingQuiz && timeLeft === 0) {
      // Auto submit when time expires
      handleSubmitQuiz();
    }
  }, [isTakingQuiz, timeLeft]);

  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);

  const handleStartQuiz = async (quiz: StudentQuiz) => {
    // Try to start/resume via real API; fall back to local if no attempt ID available
    try {
      const result = await studentDashApi.startQuiz(quiz.id);
      setActiveAttemptId(result.attemptId);
      setTimeLeft(result.durationMinutes * 60);
    } catch {
      // Network failure or quiz not in DB — use duration from local data
      setActiveAttemptId(null);
      setTimeLeft(quiz.durationMinutes * 60);
    }
    setSelectedQuiz(quiz);
    setIsTakingQuiz(true);
    setCurrentQuestionIdx(0);
    setAnswers(quiz.attempt?.answers || {});
    setIsReviewing(false);
  };

  const handleSelectAnswer = (qId: string, answer: string) => {
    setAnswers(prev => {
      const updated = { ...prev, [qId]: answer };
      // Auto-save each answer to the backend
      if (activeAttemptId) {
        studentDashApi.saveAnswer(activeAttemptId, qId, answer).catch(() => {});
      }
      return updated;
    });
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz) return;

    // Submit via real API if we have an attempt ID
    if (activeAttemptId) {
      try {
        await studentDashApi.submitQuiz(activeAttemptId);
      } catch {
        // Already submitted or network failure — proceed with local update
      }
    }

    // Optimistic local state update so the UI reflects the submission
    const updatedCourses = courses.map(c => {
      if (c.id !== selectedCourseId) return c;
      const updatedQuizzes = (c.quizzes || []).map(q => {
        if (q.id !== selectedQuiz.id) return q;
        return {
          ...q,
          attempt: {
            status: 'submitted' as const,
            answers,
            startedAt: new Date().toISOString(),
            submittedAt: new Date().toISOString(),
          },
        };
      });
      return { ...c, quizzes: updatedQuizzes };
    });

    setCourses(updatedCourses);
    setIsTakingQuiz(false);
    setSelectedQuiz(null);
    setActiveAttemptId(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Take Quiz Overlay ───────────────────────────────────────────────────────
  if (isTakingQuiz && selectedQuiz) {
    const currentQuestion = selectedQuiz.questions[currentQuestionIdx];
    const isLastQuestion = currentQuestionIdx === selectedQuiz.questions.length - 1;
    const qType = String(currentQuestion.type || '').toUpperCase().replace('-', '_');
    const isChoice = qType === 'MCQ' || qType === 'TRUE_FALSE' || qType === 'TRUEFALSE';
    const isFill = qType === 'FILL_BLANK' || qType === 'FILLBLANK';
    const isEssay = qType === 'SHORT_ANSWER' || qType === 'SHORTANSWER' || qType === 'ESSAY';
    
    return (
      <div className="fixed inset-0 z-[100] bg-(--bg-app) flex flex-col">
        {/* Top Bar */}
        <div className="h-16 border-b border-(--border-default) px-6 flex items-center justify-between bg-(--bg-card-solid)">
          <div className="flex items-center gap-4">
            <h2 className="font-serif font-bold text-lg text-(--text-primary)">{selectedQuiz.title}</h2>
            <Badge variant="glass">{currentQuestionIdx + 1} of {selectedQuiz.questions.length}</Badge>
          </div>
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timeLeft < 300 ? 'text-(--status-danger) animate-pulse' : 'text-(--brand-gold)'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
            <Button variant="secondary" onClick={() => setIsTakingQuiz(false)}>Save & Exit</Button>
          </div>
        </div>

        {/* Quiz Content */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center">
          <div className="w-full max-w-3xl pt-8">
            {!isReviewing ? (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={DURATION.medium}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-semibold text-(--text-muted) uppercase tracking-widest font-mono">Question {currentQuestionIdx + 1}</span>
                    <span className="text-xs font-mono font-bold text-(--brand-gold)">{currentQuestion.points} pts</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold leading-relaxed">{currentQuestion.questionText}</h3>
                </div>

                <div className="space-y-4 mt-8">
                  {isChoice ? (
                    (currentQuestion.options || []).map((opt, i) => {
                      const optText = typeof opt === 'string' ? opt : (opt as any)?.text ?? String(opt);
                      const isSelected = answers[currentQuestion.id] === optText;
                      return (
                        <button
                          key={i}
                          onClick={() => handleSelectAnswer(currentQuestion.id, optText)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                            isSelected 
                              ? 'border-(--brand-gold) bg-(--accent-gold-subtle)' 
                              : 'border-(--border-subtle) bg-(--hover-overlay) hover:border-(--border-default)'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-(--brand-gold)' : 'border-(--text-muted)'}`}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-(--brand-gold)" />}
                          </div>
                          <span className="text-sm font-semibold">{optText}</span>
                        </button>
                      );
                    })
                  ) : isFill ? (
                    <div className="space-y-2">
                      <p className="text-xs text-(--text-muted) font-mono uppercase tracking-widest">Fill in the blank:</p>
                      <input
                        type="text"
                        placeholder="Type your answer..."
                        className="w-full p-4 rounded-xl border border-(--border-default) bg-(--bg-input) text-sm focus:border-(--brand-gold) focus:ring-1 focus:ring-(--brand-gold) outline-none transition-all"
                        value={answers[currentQuestion.id] || ''}
                        onChange={e => handleSelectAnswer(currentQuestion.id, e.target.value)}
                      />
                    </div>
                  ) : (
                    <textarea
                      rows={qType === 'ESSAY' ? 8 : 4}
                      placeholder="Type your answer here..."
                      className="w-full p-4 rounded-xl border border-(--border-default) bg-(--bg-input) text-sm focus:border-(--brand-gold) focus:ring-1 focus:ring-(--brand-gold) outline-none transition-all"
                      value={answers[currentQuestion.id] || ''}
                      onChange={e => handleSelectAnswer(currentQuestion.id, e.target.value)}
                    />
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="text-center space-y-4 mb-8">
                  <h3 className="text-3xl font-serif font-bold text-(--text-primary)">Review & Submit</h3>
                  <p className="text-(--text-secondary)">Please review your answers before final submission.</p>
                </div>
                
                <div className="space-y-4">
                  {selectedQuiz.questions.map((q, idx) => {
                    const ans = answers[q.id];
                    return (
                      <div key={q.id} className="p-4 rounded-xl border border-(--border-subtle) bg-(--hover-overlay) flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-(--bg-card-solid) border border-(--border-default) flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold mb-2">{q.questionText}</p>
                          {ans ? (
                            <p className="text-sm text-(--brand-gold) italic border-l-2 border-(--brand-gold) pl-3">{ans}</p>
                          ) : (
                            <p className="text-sm text-(--status-danger) italic flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> No answer provided</p>
                          )}
                        </div>
                        <Button variant="secondary" className="text-xs shrink-0" onClick={() => { setIsReviewing(false); setCurrentQuestionIdx(idx); }}>Edit</Button>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="h-20 border-t border-(--border-default) px-6 flex items-center justify-between bg-(--bg-card-solid)">
          {!isReviewing ? (
            <>
              <Button
                variant="secondary"
                icon={<ChevronLeft className="w-4 h-4" />}
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
              >
                Previous
              </Button>
              <div className="flex gap-2">
                {selectedQuiz.questions.map((q, i) => (
                  <div key={q.id} className={`w-2 h-2 rounded-full ${i === currentQuestionIdx ? 'bg-(--brand-gold) scale-125' : answers[q.id] ? 'bg-(--brand-gold) opacity-50' : 'bg-(--border-strong)'}`} />
                ))}
              </div>
              {!isLastQuestion ? (
                <Button
                  variant="primary"
                  className="flex-row-reverse"
                  icon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button variant="primary" icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => setIsReviewing(true)}>Review</Button>
              )}
            </>
          ) : (
            <>
              <Button variant="secondary" icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setIsReviewing(false)}>Back to Quiz</Button>
              <Button variant="primary" className="bg-(--status-success) text-white" icon={<Send className="w-4 h-4" />} onClick={handleSubmitQuiz}>Submit Quiz</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main Hub View ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-(--text-primary)">Quizzes & Exams</h1>
          <p className="font-sans text-sm text-(--text-secondary) mt-1">Manage and take your online assessments.</p>
        </div>
        <div className="flex gap-2">
          {courses.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCourseId(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${selectedCourseId === c.id ? 'bg-(--brand-gold) text-(--text-inverse) border-transparent shadow' : 'bg-(--hover-overlay) text-(--text-primary) border-(--border-subtle) hover:border-(--border-default)'}`}
            >
              {c.code}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Quizzes */}
        <section className="space-y-4">
          <h2 className="font-sans text-lg font-bold text-(--text-primary) flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-(--brand-gold)" /> Action Required
          </h2>
          {pendingQuizzes.length > 0 ? (
            pendingQuizzes.map(quiz => (
              <Card key={quiz.id} hoverable className="group border-l-4 border-l-(--brand-gold)">
                <div className="p-1">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h3 className="font-semibold text-(--text-primary)">{quiz.title}</h3>
                    <Badge variant="amber">Due soon</Badge>
                  </div>
                  <p className="text-xs text-(--text-secondary) mb-4 line-clamp-2">{quiz.description}</p>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-(--border-subtle)">
                    <div className="flex items-center gap-4 text-xs font-mono text-(--text-muted)">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{quiz.durationMinutes}m</span>
                      <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" />{quiz.questions.length} Qs</span>
                    </div>
                    <Button variant="secondary" className="text-xs" onClick={() => setSelectedQuiz(quiz)}>View Details</Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
             <EmptyState icon={CheckCircle2} title="All Caught Up" description="You have no pending quizzes for this course." />
          )}
        </section>

        {/* Completed Quizzes */}
        <section className="space-y-4">
          <h2 className="font-sans text-lg font-bold text-(--text-primary) flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-(--status-success)" /> Completed
          </h2>
          {completedQuizzes.length > 0 ? (
            completedQuizzes.map(quiz => (
              <Card key={quiz.id} hoverable className="group">
                <div className="p-1">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h3 className="font-semibold text-(--text-primary)">{quiz.title}</h3>
                    {quiz.attempt?.status === 'graded' ? (
                      <Badge variant="emerald">{quiz.attempt.score} / {quiz.totalPoints} pts</Badge>
                    ) : (
                      <Badge variant="glass">Awaiting Grade</Badge>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-(--text-muted) mb-4">Submitted: {quiz.attempt?.submittedAt}</p>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-(--border-subtle)">
                    <Button variant="secondary" className="text-xs w-full" onClick={() => setSelectedQuiz(quiz)}>View Results</Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState icon={BookOpen} title="No History" description="You haven't completed any quizzes yet." />
          )}
        </section>
      </div>

      {/* ── SlidePanel for Details or Results ───────────────────────────────── */}
      <SlidePanel
        isOpen={!!selectedQuiz && !isTakingQuiz}
        onClose={() => setSelectedQuiz(null)}
        title={selectedQuiz?.attempt?.status === 'graded' ? 'Quiz Results' : 'Quiz Details'}
        width="max-w-2xl"
      >
        {selectedQuiz && (
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold">{selectedQuiz.title}</h2>
              <p className="text-sm text-(--text-secondary) leading-relaxed">{selectedQuiz.description}</p>
              
              <div className="flex flex-wrap gap-3">
                <Badge variant="glass"><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {selectedQuiz.durationMinutes} Minutes</span></Badge>
                <Badge variant="glass"><span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5"/> {selectedQuiz.questions.length} Questions</span></Badge>
                <Badge variant="glass"><span className="flex items-center gap-1"><Star className="w-3.5 h-3.5"/> {selectedQuiz.totalPoints} Total Points</span></Badge>
              </div>
            </div>

            {(!selectedQuiz.attempt || selectedQuiz.attempt.status === 'in_progress') ? (
              // Pre-quiz instructions
              <>
                <div className="p-5 border border-(--brand-gold) bg-(--accent-gold-subtle) rounded-xl">
                  <h4 className="font-bold text-(--text-primary) mb-2">Instructions</h4>
                  <p className="text-sm text-(--text-secondary) whitespace-pre-wrap">{selectedQuiz.instructions}</p>
                </div>

                <div className="pt-6 border-t border-(--border-default)">
                  <Button variant="primary" className="w-full py-4 text-base shadow-xl" onClick={() => handleStartQuiz(selectedQuiz)}>
                    {selectedQuiz.attempt?.status === 'in_progress' ? 'Resume Quiz' : 'Start Quiz Now'}
                  </Button>
                </div>
              </>
            ) : (
              // Post-quiz results
              <div className="space-y-6">
                <div className="flex items-center gap-6 p-6 rounded-2xl bg-(--bg-card-solid) border border-(--border-default) shadow-sm">
                  <div className="w-24 h-24 rounded-full border-4 border-(--brand-gold) flex items-center justify-center shrink-0">
                    <span className="font-serif text-2xl font-bold text-(--text-primary)">
                      {selectedQuiz.attempt.score ?? '-'}<span className="text-base text-(--text-muted)">/{selectedQuiz.totalPoints}</span>
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Final Score</h3>
                    <p className="text-sm text-(--text-secondary) mt-1">
                      {selectedQuiz.attempt.status === 'graded' 
                        ? 'Your instructor has graded this attempt.' 
                        : 'Your quiz was submitted successfully and is awaiting manual grading.'}
                    </p>
                  </div>
                </div>

                {selectedQuiz.attempt.feedback && (
                  <div className="p-5 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl">
                    <h4 className="font-bold text-sm mb-2 text-(--brand-gold)">Instructor Feedback</h4>
                    <p className="text-sm italic">"{selectedQuiz.attempt.feedback}"</p>
                  </div>
                )}

                {selectedQuiz.showResultsImmediately && (
                  <div className="space-y-4 pt-4 border-t border-(--border-default)">
                    <h4 className="font-bold text-lg">Your Answers</h4>
                    {selectedQuiz.questions.map((q, idx) => {
                      const ans = selectedQuiz.attempt!.answers[q.id];
                      return (
                        <div key={q.id} className="p-4 rounded-xl border border-(--border-subtle) bg-(--bg-input)">
                          <p className="text-sm font-semibold mb-2"><span className="text-(--text-muted) mr-2">{idx+1}.</span>{q.questionText}</p>
                          <div className="pl-6 border-l-2 border-(--border-default)">
                            <p className="text-sm text-(--brand-gold)">{ans || 'No answer'}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  );
};
