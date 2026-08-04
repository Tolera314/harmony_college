export interface Degree {
  name: string;
  level: 'Undergraduate' | 'Graduate';
  duration: string;
}

export interface ResearchLab {
  name: string;
  focus: string;
}

export interface School {
  id: string;
  name: string;
  icon: string; // lucide icon name
  description: string;
  longDescription: string;
  dean: string;
  tuitionPerCredit: number;
  degrees: Degree[];
  labs: ResearchLab[];
  requirements: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  image: string;
  rating: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'Research' | 'Campus' | 'Events';
  date: string;
  image: string;
  author: string;
}

// ── Student Dashboard Types ────────────────────────────────────────────────────

export type NavTab =
  | 'dashboard'
  | 'my_courses'
  | 'registration'
  | 'assignments'
  | 'quizzes'
  | 'grades'
  | 'financials'
  | 'degree_audit'
  | 'support'
  | 'settings'
  | 'messages';

export interface StudentProfile {
  name: string;
  id: string;
  avatar: string;
  major: string;
  degree: string;
  email: string;
  phone: string;
  cumulativeGpa: number;
  gpaChange: number;
  completedCredits: number;
  totalRequiredCredits: number;
  attendanceRate: number;
  cohortPercentile: string;
  accountBalance: number;
  clearedTerm: string;
  expectedGraduation: string;
  advisorName: string;
  advisorEmail: string;
}

export interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  points: number;
  status: 'pending' | 'submitted' | 'graded';
  grade?: string;
  description?: string;
  instructions?: string;
  attachments?: { name: string; size: string; type: string }[];
  submittedAt?: string;
  submittedFile?: { name: string; size: string };
  submittedText?: string;
  feedback?: string;
  score?: number;
}

export type QuizQuestionType = 'MCQ' | 'TrueFalse' | 'FillBlank' | 'Matching' | 'ShortAnswer' | 'Essay';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  questionText: string;
  options?: string[]; // for MCQ, Matching
  points: number;
}

export interface StudentQuizAttempt {
  status: 'in_progress' | 'submitted' | 'graded';
  startedAt?: string;
  submittedAt?: string;
  score?: number;
  answers: Record<string, string>; // questionId -> answer
  feedback?: string;
}

export interface StudentQuiz {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  durationMinutes: number;
  availableDate: string;
  closingDate: string;
  passingScore: number;
  maxAttempts: number;
  totalPoints: number;
  showResultsImmediately: boolean;
  questions: QuizQuestion[];
  attempt?: StudentQuizAttempt;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  department: string;
  credits: number;
  instructor: string;
  instructorTitle: string;
  instructorPhoto: string;
  progress: number;
  assignmentsDueText?: string;
  midtermAlert?: string;
  noPendingTasks?: boolean;
  schedule: string;
  room: string;
  description: string;
  syllabusOverview: string;
  /** All enrolled curriculum courses have status 'enrolled' */
  status: 'enrolled' | 'completed' | 'upcoming';
  /** Semester this course belongs to e.g. "Semester 5 — Fall 2024" */
  semester?: string;
  /** Attendance percentage 0–100 */
  attendanceRate?: number;
  /** Letter grade if graded */
  currentGrade?: string;
  assignments: Assignment[];
  quizzes?: StudentQuiz[];
}

export interface TimetableEvent {
  id: string;
  time: string;
  title: string;
  location: string;
  courseCode?: string;
  isCurrent?: boolean;
}

export interface AlertItem {
  id: string;
  source: string;
  message: string;
  date: string;
  type: 'info' | 'error' | 'secondary';
  urgent: boolean;
}

export interface GradeRecord {
  id: string;
  courseCode: string;
  courseTitle: string;
  term: string;
  credits: number;
  grade: string;
  numericGpa: number;
  instructor: string;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  category: 'Tuition' | 'Fee' | 'Scholarship' | 'Payment';
  amount: number; // positive = charge, negative = credit
  status: string;
  receiptId: string;
}

export interface DegreeRequirementCourse {
  code: string;
  title: string;
  credits: number;
  status: 'completed' | 'in_progress' | 'remaining';
  grade?: string;
}

export interface RequirementCategory {
  title: string;
  requiredCredits: number;
  completedCredits: number;
  courses: DegreeRequirementCourse[];
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
