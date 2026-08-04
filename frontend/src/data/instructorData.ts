// ─────────────────────────────────────────────────────────────────────────────
// Harmony College — Instructor Shared Mock Dataset
// Instructor: Dr. Marcus Vance (facultyId: f01)
// Courses: FILM402 (c01, 38 students), FILM301 (c02, 23 students)
// All student/course/classroom refs come from departmentData.ts
// ─────────────────────────────────────────────────────────────────────────────
import type {
  InstructorProfile, ScheduleClass, AttendanceRecord, AttendanceSession, AttendanceStatus,
  Assessment, GradeEntry, CourseMaterial, Announcement,
  InstructorNotification, InstructorAuditEntry, ClockEntry,
  InstructorQuiz
} from '../types/instructor';

// ── Instructor Profile ─────────────────────────────────────────────────────
export const instructorProfile: InstructorProfile = {
  name: 'Dr. Marcus Vance',
  title: 'Professor of Cinematography & Directing',
  department: 'Theatrical Art & Digital Media',
  email: 'm.vance@harmony.edu',
  phone: '+251 911 100 001',
  officeRoom: 'Creative Arts Building, Room 201',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  employeeId: 'HC-FAC-0001',
  academicYear: '2024–2025',
  currentSemester: 'Fall 2024',
  specialization: 'Cinematography & Directing',
};

// ── Today's Schedule (Monday) ─────────────────────────────────────────────
export const todaySchedule: ScheduleClass[] = [
  {
    courseId: 'c01',
    startTime: '09:00', endTime: '11:30',
    room: 'Sheger Film Studio A', building: 'Media Center',
    duration: '2h 30m', isNow: true, isNext: false,
  },
  {
    courseId: 'c02',
    startTime: '14:00', endTime: '15:30',
    room: 'Seminar Room 202', building: 'Arts Annex',
    duration: '1h 30m', isNow: false, isNext: true,
  },
];

// ── Assessments ───────────────────────────────────────────────────────────
export const assessments: Assessment[] = [
  // FILM402 assessments
  { id: 'a01', courseId: 'c01', title: 'Short Film Reel Submission', type: 'Assignment', maxScore: 100, weight: 20, dueDate: 'Jul 25, 2024', status: 'Pending' },
  { id: 'a02', courseId: 'c01', title: 'Camera Technique Quiz', type: 'Quiz', maxScore: 50, weight: 10, dueDate: 'Jul 15, 2024', status: 'Published' },
  { id: 'a03', courseId: 'c01', title: 'Midterm — Scene Direction', type: 'Midterm', maxScore: 100, weight: 30, dueDate: 'Jul 10, 2024', status: 'Published' },
  { id: 'a04', courseId: 'c01', title: 'Color Grading Project', type: 'Project', maxScore: 100, weight: 20, dueDate: 'Aug 15, 2024', status: 'Draft' },
  { id: 'a05', courseId: 'c01', title: 'Class Participation', type: 'Participation', maxScore: 50, weight: 10, dueDate: 'Ongoing', status: 'Draft' },
  { id: 'a06', courseId: 'c01', title: 'Final Film Production', type: 'Final', maxScore: 100, weight: 10, dueDate: 'Sep 01, 2024', status: 'Draft' },
  // FILM301 assessments
  { id: 'a07', courseId: 'c02', title: 'Three-Act Structure Essay', type: 'Assignment', maxScore: 100, weight: 25, dueDate: 'Jul 20, 2024', status: 'Pending' },
  { id: 'a08', courseId: 'c02', title: 'Dialogue Writing Quiz', type: 'Quiz', maxScore: 50, weight: 15, dueDate: 'Jul 12, 2024', status: 'Published' },
  { id: 'a09', courseId: 'c02', title: 'Midterm — Script Draft', type: 'Midterm', maxScore: 100, weight: 30, dueDate: 'Jul 08, 2024', status: 'Published' },
  { id: 'a10', courseId: 'c02', title: 'Final Screenplay', type: 'Final', maxScore: 100, weight: 30, dueDate: 'Sep 05, 2024', status: 'Draft' },
];

// ── Quizzes ───────────────────────────────────────────────────────────────
export const instructorQuizzes: InstructorQuiz[] = [
  {
    id: 'q1',
    courseId: 'c01',
    title: 'Cinematography Fundamentals Quiz',
    description: 'A comprehensive quiz on lens selection, f-stops, and basic framing.',
    instructions: 'You have 30 minutes to complete this quiz. It consists of multiple choice and short answer questions.',
    durationMinutes: 30,
    availableDate: 'Jul 20, 2024',
    closingDate: 'Jul 30, 2024',
    passingScore: 60,
    maxAttempts: 1,
    shuffleQuestions: true,
    shuffleAnswers: true,
    showResultsImmediately: true,
    status: 'Published',
    questions: [
      {
        id: 'q1_1',
        type: 'MCQ',
        questionText: 'Which lens focal length is generally considered "normal" on a 35mm full-frame camera?',
        options: ['35mm', '50mm', '85mm', '16mm'],
        correctAnswer: '50mm',
        points: 20
      },
      {
        id: 'q1_2',
        type: 'TrueFalse',
        questionText: 'A lower f-stop number (e.g. f/1.4) results in a deeper depth of field.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        points: 20
      },
      {
        id: 'q1_3',
        type: 'ShortAnswer',
        questionText: 'Briefly explain the rule of thirds.',
        points: 60
      }
    ],
    attempts: [
      {
        id: 'att_01',
        studentId: 's01',
        status: 'in_progress',
        startedAt: 'Jul 21, 2024 10:15',
        answers: { 'q1_1': '50mm' }
      },
      {
        id: 'att_02',
        studentId: 's08',
        status: 'submitted',
        startedAt: 'Jul 21, 2024 09:00',
        submittedAt: 'Jul 21, 2024 09:25',
        answers: { 'q1_1': '50mm', 'q1_2': 'True', 'q1_3': 'The rule of thirds divides the frame into 9 sections...' },
        needsManualGrading: true
      },
      {
        id: 'att_03',
        studentId: 's15',
        status: 'graded',
        startedAt: 'Jul 20, 2024 14:00',
        submittedAt: 'Jul 20, 2024 14:28',
        score: 95,
        answers: { 'q1_1': '50mm', 'q1_2': 'False', 'q1_3': 'It aligns subjects on intersection points of a 3x3 grid.' },
        feedback: 'Excellent explanation.'
      }
    ]
  },
  {
    id: 'q2',
    courseId: 'c01',
    title: 'Advanced Lighting Techniques',
    description: 'Focuses on 3-point lighting, color temperature, and modifying light.',
    instructions: '15 minutes. Multiple choice only.',
    durationMinutes: 15,
    availableDate: 'Aug 05, 2024',
    closingDate: 'Aug 10, 2024',
    passingScore: 70,
    maxAttempts: 1,
    shuffleQuestions: false,
    shuffleAnswers: false,
    showResultsImmediately: false,
    status: 'Draft',
    questions: [],
    attempts: []
  }
];

// ── Grade Entries ──────────────────────────────────────────────────────────
// Students in FILM402 (c01): s01,s08,s15,s17 + more from enrolledCourseIds
// Students in FILM301 (c02): s04,s08,s11,s19 + more

// FILM402 students (those who have c01 in enrolledCourseIds)
export const film402StudentIds = ['s01', 's08', 's15', 's17'];
// FILM301 students
export const film301StudentIds = ['s04', 's08', 's11', 's19'];

export const gradeEntries: GradeEntry[] = [
  // FILM402 — Quiz (a02)
  { id: 'g001', studentId: 's01', assessmentId: 'a02', score: 48, remarks: 'Excellent work', status: 'Published', updatedAt: 'Jul 15, 2024' },
  { id: 'g002', studentId: 's08', assessmentId: 'a02', score: 42, remarks: 'Good effort', status: 'Published', updatedAt: 'Jul 15, 2024' },
  { id: 'g003', studentId: 's15', assessmentId: 'a02', score: 50, remarks: 'Perfect score', status: 'Published', updatedAt: 'Jul 15, 2024' },
  { id: 'g004', studentId: 's17', assessmentId: 'a02', score: 38, remarks: 'Needs improvement', status: 'Published', updatedAt: 'Jul 15, 2024' },
  // FILM402 — Midterm (a03)
  { id: 'g005', studentId: 's01', assessmentId: 'a03', score: 92, remarks: 'Outstanding scene direction', status: 'Published', updatedAt: 'Jul 12, 2024' },
  { id: 'g006', studentId: 's08', assessmentId: 'a03', score: 85, remarks: 'Strong technical execution', status: 'Published', updatedAt: 'Jul 12, 2024' },
  { id: 'g007', studentId: 's15', assessmentId: 'a03', score: 96, remarks: 'Exceptional cinematic vision', status: 'Published', updatedAt: 'Jul 12, 2024' },
  { id: 'g008', studentId: 's17', assessmentId: 'a03', score: 78, remarks: 'Good effort, pacing issues', status: 'Published', updatedAt: 'Jul 12, 2024' },
  // FILM402 — Assignment a01 (pending)
  { id: 'g009', studentId: 's01', assessmentId: 'a01', score: null, remarks: '', status: 'Pending', updatedAt: '' },
  { id: 'g010', studentId: 's08', assessmentId: 'a01', score: null, remarks: '', status: 'Pending', updatedAt: '' },
  { id: 'g011', studentId: 's15', assessmentId: 'a01', score: null, remarks: '', status: 'Pending', updatedAt: '' },
  { id: 'g012', studentId: 's17', assessmentId: 'a01', score: null, remarks: '', status: 'Pending', updatedAt: '' },
  // FILM301 — Quiz (a08)
  { id: 'g013', studentId: 's04', assessmentId: 'a08', score: 30, remarks: 'Needs more practice', status: 'Published', updatedAt: 'Jul 13, 2024' },
  { id: 'g014', studentId: 's08', assessmentId: 'a08', score: 44, remarks: 'Very good', status: 'Published', updatedAt: 'Jul 13, 2024' },
  { id: 'g015', studentId: 's11', assessmentId: 'a08', score: 38, remarks: 'Satisfactory', status: 'Published', updatedAt: 'Jul 13, 2024' },
  { id: 'g016', studentId: 's19', assessmentId: 'a08', score: 40, remarks: 'Good understanding', status: 'Published', updatedAt: 'Jul 13, 2024' },
  // FILM301 — Midterm (a09)
  { id: 'g017', studentId: 's04', assessmentId: 'a09', score: 68, remarks: 'Structure needs work', status: 'Published', updatedAt: 'Jul 10, 2024' },
  { id: 'g018', studentId: 's08', assessmentId: 'a09', score: 82, remarks: 'Well-developed characters', status: 'Published', updatedAt: 'Jul 10, 2024' },
  { id: 'g019', studentId: 's11', assessmentId: 'a09', score: 74, remarks: 'Decent narrative arc', status: 'Published', updatedAt: 'Jul 10, 2024' },
  { id: 'g020', studentId: 's19', assessmentId: 'a09', score: 79, remarks: 'Good plot pacing', status: 'Published', updatedAt: 'Jul 10, 2024' },
];

// ── Attendance Sessions ────────────────────────────────────────────────────
export const attendanceSessions: AttendanceSession[] = [
  {
    id: 'as01',
    courseId: 'c01',
    date: 'Jul 22, 2024',
    startTime: '09:00',
    endTime: '11:30',
    isActive: true,
    qrCode: 'HC-ATT-C01-20240722-09:00',
    records: [
      { id: 'ar001', studentId: 's01', courseId: 'c01', date: 'Jul 22, 2024', status: 'Present', markedAt: '09:02' },
      { id: 'ar002', studentId: 's08', courseId: 'c01', date: 'Jul 22, 2024', status: 'Present', markedAt: '09:05' },
      { id: 'ar003', studentId: 's15', courseId: 'c01', date: 'Jul 22, 2024', status: 'Late', markedAt: '09:18', note: 'Traffic delay' },
      { id: 'ar004', studentId: 's17', courseId: 'c01', date: 'Jul 22, 2024', status: 'Present', markedAt: '08:58' },
    ],
  },
  {
    id: 'as02',
    courseId: 'c01',
    date: 'Jul 17, 2024',
    startTime: '09:00',
    endTime: '11:30',
    isActive: false,
    qrCode: 'HC-ATT-C01-20240717-09:00',
    records: [
      { id: 'ar005', studentId: 's01', courseId: 'c01', date: 'Jul 17, 2024', status: 'Present' },
      { id: 'ar006', studentId: 's08', courseId: 'c01', date: 'Jul 17, 2024', status: 'Absent', note: 'No reason provided' },
      { id: 'ar007', studentId: 's15', courseId: 'c01', date: 'Jul 17, 2024', status: 'Present' },
      { id: 'ar008', studentId: 's17', courseId: 'c01', date: 'Jul 17, 2024', status: 'Present' },
    ],
  },
  {
    id: 'as03',
    courseId: 'c02',
    date: 'Jul 23, 2024',
    startTime: '14:00',
    endTime: '15:30',
    isActive: false,
    qrCode: 'HC-ATT-C02-20240723-14:00',
    records: [
      { id: 'ar009', studentId: 's04', courseId: 'c02', date: 'Jul 23, 2024', status: 'Warning' as AttendanceStatus, note: 'Attendance at 78%' },
      { id: 'ar010', studentId: 's08', courseId: 'c02', date: 'Jul 23, 2024', status: 'Present' },
      { id: 'ar011', studentId: 's11', courseId: 'c02', date: 'Jul 23, 2024', status: 'Present' },
      { id: 'ar012', studentId: 's19', courseId: 'c02', date: 'Jul 23, 2024', status: 'Excused', note: 'Medical certificate submitted' },
    ],
  },
];

// ── Course Materials ───────────────────────────────────────────────────────
export const courseMaterials: CourseMaterial[] = [
  { id: 'm01', courseId: 'c01', title: 'FILM402 — Course Syllabus Fall 2024', description: 'Full course outline, grading rubric, and weekly schedule for FILM402.', type: 'Syllabus', fileSize: '1.2 MB', downloads: 38, visibility: 'Published', uploadedAt: 'Aug 28, 2024' },
  { id: 'm02', courseId: 'c01', title: 'Week 1 — Introduction to RED Camera Systems', description: 'Slides covering RED Cinema camera lineup, sensor specs and workflow overview.', type: 'Slides', fileSize: '8.4 MB', downloads: 36, visibility: 'Published', uploadedAt: 'Sep 02, 2024' },
  { id: 'm03', courseId: 'c01', title: 'Cinematography Fundamentals — Reference Guide', description: 'Comprehensive PDF covering exposure, depth-of-field, and lens selection.', type: 'Reference', fileSize: '4.7 MB', downloads: 32, visibility: 'Published', uploadedAt: 'Sep 05, 2024' },
  { id: 'm04', courseId: 'c01', title: 'Assignment 1 — Short Film Reel Brief', description: 'Requirements, marking rubric, and submission instructions for the film reel assignment.', type: 'Assignment', fileSize: '0.6 MB', downloads: 38, visibility: 'Published', uploadedAt: 'Sep 10, 2024' },
  { id: 'm05', courseId: 'c01', title: 'Week 6 — Color Grading in DaVinci Resolve', description: 'Advanced tutorial slides and reference LUTs for color correction workflow.', type: 'Slides', fileSize: '12.1 MB', downloads: 28, visibility: 'Published', uploadedAt: 'Oct 07, 2024' },
  { id: 'm06', courseId: 'c01', title: 'Color Grading Project — Brief & Rubric', description: 'Project brief, submission guidelines, and assessment criteria for the grading project.', type: 'Assignment', fileSize: '0.8 MB', downloads: 0, visibility: 'Draft', uploadedAt: 'Oct 20, 2024' },
  { id: 'm07', courseId: 'c02', title: 'FILM301 — Course Syllabus Fall 2024', description: 'Full course outline, grading rubric, and reading list for FILM301.', type: 'Syllabus', fileSize: '1.0 MB', downloads: 23, visibility: 'Published', uploadedAt: 'Aug 28, 2024' },
  { id: 'm08', courseId: 'c02', title: 'Week 2 — Three-Act Structure Deep Dive', description: 'Screenplay structure analysis slides with Hollywood script examples.', type: 'Slides', fileSize: '5.2 MB', downloads: 21, visibility: 'Published', uploadedAt: 'Sep 09, 2024' },
  { id: 'm09', courseId: 'c02', title: 'Screenplay Formatting Guide — Industry Standard', description: 'PDF guide covering Final Draft, Fountain format and industry submission norms.', type: 'Reference', fileSize: '2.3 MB', downloads: 19, visibility: 'Published', uploadedAt: 'Sep 11, 2024' },
  { id: 'm10', courseId: 'c02', title: 'Final Screenplay Assignment Brief', description: 'Complete instructions and rubric for the final screenplay submission.', type: 'Assignment', fileSize: '0.7 MB', downloads: 0, visibility: 'Draft', uploadedAt: 'Oct 22, 2024' },
];

// ── Announcements ─────────────────────────────────────────────────────────
export const announcements: Announcement[] = [
  { id: 'an01', title: 'Film Reel Assignment Deadline Extended', body: 'Due to the upcoming studio maintenance, the short film reel submission deadline has been extended to July 30th. Please use the time wisely to refine your color grading.', audience: 'FILM402', status: 'Pinned', publishedAt: 'Jul 20, 2024', views: 34, isPinned: true },
  { id: 'an02', title: 'Guest Lecture: Award-Winning Cinematographer Mesfin Alemu', body: 'We are honored to welcome Mesfin Alemu, ASC, for a guest lecture on October 4th in Lecture Hall 1. Attendance is mandatory for FILM402 students.', audience: 'FILM402', status: 'Published', publishedAt: 'Jul 18, 2024', views: 38, isPinned: false },
  { id: 'an03', title: 'Midterm Grades Released', body: 'FILM301 midterm script drafts have been graded and are now available in the portal. Please review your feedback and schedule office hours if needed.', audience: 'FILM301', status: 'Published', publishedAt: 'Jul 12, 2024', views: 22, isPinned: false },
  { id: 'an04', title: 'Studio Booking Policy Update', body: 'Effective immediately, all Sheger Film Studio A bookings must be made at least 48 hours in advance via the online booking system. Walk-ins will not be accommodated during peak hours.', audience: 'All Courses', status: 'Published', publishedAt: 'Jul 10, 2024', views: 58, isPinned: false },
  { id: 'an05', title: 'Final Screenplay Submission Guidelines', body: 'Final screenplay submissions must be in PDF format, formatted according to industry standard (Final Draft or Fountain). Submissions not meeting format requirements will be returned.', audience: 'FILM301', status: 'Draft', publishedAt: '', views: 0, isPinned: false },
];

// ── Notifications ─────────────────────────────────────────────────────────
export const instructorNotifications: InstructorNotification[] = [
  { id: 'in01', type: 'grade', title: 'Grades Due: Short Film Reel', message: 'Deadline for submitting FILM402 film reel grades is in 3 days (Jul 25).', timestamp: 'Jul 22, 2024 08:00 AM', read: false, tab: 'grades' },
  { id: 'in02', type: 'attendance', title: 'Attendance Warning: Yonas Kebede', message: 'Student Yonas Kebede (FILM301) has dropped below 80% attendance threshold.', timestamp: 'Jul 21, 2024 10:30 AM', read: false, tab: 'attendance' },
  { id: 'in03', type: 'grade', title: 'Pending Grades: FILM301 Essay', message: '4 students in FILM301 still have ungraded Three-Act Structure essays.', timestamp: 'Jul 21, 2024 09:00 AM', read: false, tab: 'grades' },
  { id: 'in04', type: 'enrollment', title: 'New Student Enrolled: FILM402', message: 'Mahlet Tafesse has been enrolled in FILM402 — Advanced Digital Cinematography.', timestamp: 'Jul 20, 2024 03:15 PM', read: false, tab: 'students' },
  { id: 'in05', type: 'schedule', title: 'Room Change: FILM301 Next Week', message: 'FILM301 session on Jul 30 moved from Seminar Room 202 to Room A105 due to maintenance.', timestamp: 'Jul 19, 2024 04:00 PM', read: true, tab: 'my_classes' },
  { id: 'in06', type: 'announcement', title: 'Announcement Viewed: 34 Students', message: 'Your film reel deadline extension announcement has been read by 34 out of 38 students.', timestamp: 'Jul 20, 2024 06:00 PM', read: true, tab: 'announcements' },
  { id: 'in07', type: 'system', title: 'Grade Submission Confirmed', message: 'FILM402 Camera Technique Quiz grades successfully submitted to the registrar.', timestamp: 'Jul 15, 2024 05:30 PM', read: true, tab: 'grades' },
];

// ── Audit Log ─────────────────────────────────────────────────────────────
export const instructorAuditLog: InstructorAuditEntry[] = [
  { id: 'il01', date: 'Jul 22, 2024 09:02', action: 'Attendance Started', course: 'FILM402', description: 'QR attendance session started for FILM402 — Jul 22.', status: 'Success' },
  { id: 'il02', date: 'Jul 21, 2024 14:10', action: 'Grade Updated', course: 'FILM301', student: 'Yonas Kebede', description: 'Midterm score updated from 65 to 68 — regrading request resolved.', status: 'Success' },
  { id: 'il03', date: 'Jul 20, 2024 11:30', action: 'Material Uploaded', course: 'FILM402', description: 'Color Grading Project Brief uploaded (Draft).', status: 'Success' },
  { id: 'il04', date: 'Jul 20, 2024 08:00', action: 'Announcement Published', course: 'FILM402', description: 'Film Reel Assignment Deadline Extended — published to 38 students.', status: 'Success' },
  { id: 'il05', date: 'Jul 18, 2024 15:45', action: 'Grades Submitted', course: 'FILM402', description: 'Camera Technique Quiz grades submitted to registrar for 4 students.', status: 'Success' },
  { id: 'il06', date: 'Jul 17, 2024 11:20', action: 'Attendance Edited', course: 'FILM402', student: 'Robel Bekele', description: 'Attendance status changed from Absent to Excused — medical note received.', status: 'Warning' },
  { id: 'il07', date: 'Jul 15, 2024 16:00', action: 'Grades Submitted', course: 'FILM402', description: 'FILM402 Midterm — Scene Direction grades published to students.', status: 'Success' },
  { id: 'il08', date: 'Jul 12, 2024 10:00', action: 'Grades Submitted', course: 'FILM301', description: 'FILM301 Midterm — Script Draft grades published to students.', status: 'Success' },
  { id: 'il09', date: 'Jul 10, 2024 09:30', action: 'Announcement Published', course: 'All Courses', description: 'Studio booking policy update published to all students.', status: 'Success' },
  { id: 'il10', date: 'Jul 08, 2024 14:20', action: 'Material Uploaded', course: 'FILM301', description: 'Final Screenplay Assignment Brief uploaded (Draft — not yet published).', status: 'Warning' },
];

// ── Clock Entries ──────────────────────────────────────────────────────────
export const clockEntries: ClockEntry[] = [
  { id: 'ce01', date: 'Jul 22, 2024', clockIn: '08:45', clockOut: undefined, hoursWorked: undefined, status: 'Active' },
  { id: 'ce02', date: 'Jul 21, 2024', clockIn: '08:30', clockOut: '16:00', hoursWorked: 7.5, status: 'Completed' },
  { id: 'ce03', date: 'Jul 20, 2024', clockIn: '09:00', clockOut: '15:30', hoursWorked: 6.5, status: 'Completed' },
  { id: 'ce04', date: 'Jul 19, 2024', clockIn: '08:45', clockOut: '16:15', hoursWorked: 7.5, status: 'Completed' },
  { id: 'ce05', date: 'Jul 18, 2024', clockIn: '09:15', clockOut: '15:00', hoursWorked: 5.75, status: 'Completed' },
];

// ── KPI Derivations ────────────────────────────────────────────────────────
export const instructorKPIs = {
  classesToday: todaySchedule.length,
  studentsTaught: 38 + 23, // c01 + c02
  pendingGrades: gradeEntries.filter(g => g.status === 'Pending').length,
  activeSessions: attendanceSessions.filter(s => s.isActive).length,
  upcomingClasses: todaySchedule.filter(c => c.isNext).length,
  avgAttendance: 91, // computed avg across both courses
};

// ── Attendance sparkline data ──────────────────────────────────────────────
export const attendanceSparkline = [96, 94, 91, 88, 90, 91, 89, 91];
export const gradeSparkline = [72, 76, 78, 80, 82, 81, 84, 85];

// \u2500\u2500 LMS Assignments \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
import type { LMSAssignment, AssignmentSubmission } from '../types/instructor';

export const lmsAssignments: LMSAssignment[] = [
  // FILM402 assignments
  {
    id: 'la01', courseId: 'c01',
    title: 'Short Film Reel Submission',
    description: 'Submit a 3\u20135 minute short film demonstrating mastery of RED camera systems, lighting design, and color grading principles covered in Weeks 1\u20136.',
    instructions: '1. Export your film as H.264 MP4 at 1080p 24fps.\n2. Include a brief director\u2019s note (PDF, max 1 page) explaining your creative choices.\n3. Upload both files as a ZIP archive.\n4. File naming: FILM402_YourID_ShortFilm.zip',
    dueDate: 'Aug 20, 2024 23:59',
    maxMarks: 100,
    allowedFileTypes: ['MP4', 'ZIP', 'PDF'],
    maxFileSizeMB: 500,
    submissionType: 'File Upload',
    allowLateSubmission: true,
    allowResubmission: false,
    attachments: [{ name: 'Short Film Reel Brief.pdf', size: '0.6 MB', type: 'PDF' }, { name: 'Grading Rubric.pdf', size: '0.3 MB', type: 'PDF' }],
    status: 'Published',
    createdAt: 'Sep 10, 2024',
    publishedAt: 'Sep 10, 2024',
    totalSubmissions: 3,
    gradedCount: 0,
  },
  {
    id: 'la02', courseId: 'c01',
    title: 'Camera Technique Analysis Essay',
    description: 'Analyze the cinematographic techniques used in a film of your choice. Focus on camera movement, lens selection, and lighting design.',
    instructions: '1. Write a 1,500\u20132,000 word essay.\n2. Include at least 5 scholarly references.\n3. Submit as a DOCX or PDF.\n4. File naming: FILM402_YourID_Essay.pdf',
    dueDate: 'Sep 05, 2024 23:59',
    maxMarks: 50,
    allowedFileTypes: ['PDF', 'DOCX'],
    maxFileSizeMB: 10,
    submissionType: 'Both',
    allowLateSubmission: false,
    allowResubmission: true,
    attachments: [{ name: 'Essay Guidelines.pdf', size: '0.2 MB', type: 'PDF' }],
    status: 'Published',
    createdAt: 'Aug 20, 2024',
    publishedAt: 'Aug 20, 2024',
    totalSubmissions: 4,
    gradedCount: 4,
  },
  {
    id: 'la03', courseId: 'c01',
    title: 'Color Grading Project',
    description: 'Apply professional color grading techniques to the provided raw footage using DaVinci Resolve. Demonstrate your understanding of primary/secondary corrections and LUT workflow.',
    instructions: '1. Download the provided RAW footage package.\n2. Apply primary and secondary color corrections.\n3. Export graded footage as ProRes or H.264.\n4. Include a brief workflow PDF.\n5. Submit as ZIP.',
    dueDate: 'Oct 15, 2024 23:59',
    maxMarks: 100,
    allowedFileTypes: ['ZIP', 'MP4', 'PDF'],
    maxFileSizeMB: 2000,
    submissionType: 'File Upload',
    allowLateSubmission: true,
    allowResubmission: true,
    attachments: [{ name: 'Raw Footage Package Link.pdf', size: '0.1 MB', type: 'PDF' }, { name: 'Color Grading Rubric.pdf', size: '0.4 MB', type: 'PDF' }],
    status: 'Draft',
    createdAt: 'Oct 01, 2024',
    totalSubmissions: 0,
    gradedCount: 0,
  },
  {
    id: 'la04', courseId: 'c01',
    title: 'Midterm Scene Direction',
    description: 'Direct a 2-minute scene with at least two actors demonstrating your understanding of blocking, camera placement, and on-set communication.',
    instructions: '1. Prepare a shot list and storyboard (PDF).\n2. Record your scene (min 1080p).\n3. Submit recording + storyboard as ZIP.',
    dueDate: 'Jul 10, 2024 23:59',
    maxMarks: 100,
    allowedFileTypes: ['ZIP', 'MP4'],
    maxFileSizeMB: 1000,
    submissionType: 'File Upload',
    allowLateSubmission: false,
    allowResubmission: false,
    attachments: [],
    status: 'Closed',
    createdAt: 'Jun 20, 2024',
    publishedAt: 'Jun 20, 2024',
    totalSubmissions: 4,
    gradedCount: 4,
  },
  // FILM301 assignments
  {
    id: 'la05', courseId: 'c02',
    title: 'Three-Act Structure Essay',
    description: 'Write a critical analysis of the three-act structure in a contemporary screenplay. Identify the key structural beats and argue for or against their effectiveness.',
    instructions: '1. Choose a produced screenplay from the approved list.\n2. Write 1,200\u20131,800 words.\n3. Submit as PDF.\n4. Use APA citation format.',
    dueDate: 'Aug 10, 2024 23:59',
    maxMarks: 100,
    allowedFileTypes: ['PDF', 'DOCX'],
    maxFileSizeMB: 15,
    submissionType: 'Both',
    allowLateSubmission: true,
    allowResubmission: false,
    attachments: [{ name: 'Approved Screenplay List.pdf', size: '0.1 MB', type: 'PDF' }],
    status: 'Published',
    createdAt: 'Jul 25, 2024',
    publishedAt: 'Jul 25, 2024',
    totalSubmissions: 3,
    gradedCount: 1,
  },
  {
    id: 'la06', courseId: 'c02',
    title: 'Dialogue Workshop: Scene Rewrite',
    description: 'Rewrite a provided scene with weak dialogue. Demonstrate subtext, character voice, and dramatic tension through improved dialogue.',
    instructions: '1. Download the provided scene draft.\n2. Rewrite the scene (2\u20134 pages, Fountain/Final Draft format).\n3. Include a 200-word rationale explaining your choices.\n4. Submit as PDF.',
    dueDate: 'Sep 01, 2024 23:59',
    maxMarks: 75,
    allowedFileTypes: ['PDF'],
    maxFileSizeMB: 10,
    submissionType: 'Both',
    allowLateSubmission: true,
    allowResubmission: true,
    attachments: [{ name: 'Scene Draft — Rewrite Task.pdf', size: '0.2 MB', type: 'PDF' }, { name: 'Dialogue Rubric.pdf', size: '0.2 MB', type: 'PDF' }],
    status: 'Published',
    createdAt: 'Aug 15, 2024',
    publishedAt: 'Aug 15, 2024',
    totalSubmissions: 4,
    gradedCount: 4,
  },
  {
    id: 'la07', courseId: 'c02',
    title: 'Final Screenplay — First Draft',
    description: 'Submit the first draft of your original feature-length screenplay. Minimum 90 pages, industry-standard format.',
    instructions: '1. Format using Final Draft or Fountain.\n2. Export as PDF.\n3. Include a logline and synopsis page.\n4. Min 90 pages, max 120 pages.',
    dueDate: 'Nov 01, 2024 23:59',
    maxMarks: 100,
    allowedFileTypes: ['PDF'],
    maxFileSizeMB: 50,
    submissionType: 'File Upload',
    allowLateSubmission: false,
    allowResubmission: true,
    attachments: [{ name: 'Final Screenplay Rubric.pdf', size: '0.5 MB', type: 'PDF' }],
    status: 'Draft',
    createdAt: 'Oct 10, 2024',
    totalSubmissions: 0,
    gradedCount: 0,
  },
];

// \u2500\u2500 Assignment Submissions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export const assignmentSubmissions: AssignmentSubmission[] = [
  // la01 \u2014 Short Film Reel (3 submitted, 0 graded)
  { id: 'sub01', assignmentId: 'la01', studentId: 's01', submittedAt: 'Aug 19, 2024 22:14', status: 'Submitted', fileAttachments: [{ name: 'FILM402_s01_ShortFilm.zip', size: '312 MB', type: 'ZIP' }], isLate: false },
  { id: 'sub02', assignmentId: 'la01', studentId: 's08', submittedAt: 'Aug 20, 2024 18:03', status: 'Submitted', fileAttachments: [{ name: 'FILM402_s08_ShortFilm.zip', size: '278 MB', type: 'ZIP' }], isLate: false },
  { id: 'sub03', assignmentId: 'la01', studentId: 's15', submittedAt: 'Aug 21, 2024 01:22', status: 'Late', fileAttachments: [{ name: 'FILM402_s15_ShortFilm.zip', size: '420 MB', type: 'ZIP' }], isLate: true },
  // la02 \u2014 Camera Technique Essay (4 submitted, 4 graded)
  { id: 'sub04', assignmentId: 'la02', studentId: 's01', submittedAt: 'Sep 04, 2024 20:00', status: 'Graded', fileAttachments: [{ name: 'FILM402_s01_Essay.pdf', size: '1.2 MB', type: 'PDF' }], textAnswer: 'In "2001: A Space Odyssey", Kubrick masterfully employs symmetric framing...', score: 46, feedback: 'Excellent analysis of lens choices. Your discussion of depth-of-field is particularly insightful. Consider expanding the section on lighting design.', gradedAt: 'Sep 08, 2024', isLate: false },
  { id: 'sub05', assignmentId: 'la02', studentId: 's08', submittedAt: 'Sep 05, 2024 10:30', status: 'Graded', fileAttachments: [{ name: 'FILM402_s08_Essay.pdf', size: '0.9 MB', type: 'PDF' }], score: 41, feedback: 'Good understanding of camera movement techniques. The essay would benefit from stronger scholarly references and a more structured argument.', gradedAt: 'Sep 08, 2024', isLate: false },
  { id: 'sub06', assignmentId: 'la02', studentId: 's15', submittedAt: 'Sep 04, 2024 08:15', status: 'Graded', fileAttachments: [{ name: 'FILM402_s15_Essay.pdf', size: '1.5 MB', type: 'PDF' }], score: 49, feedback: 'Exceptional work. Your analysis of the Dardenne brothers\u2019 handheld aesthetic is the most sophisticated submission in the class. Near-perfect.', gradedAt: 'Sep 09, 2024', isLate: false },
  { id: 'sub07', assignmentId: 'la02', studentId: 's17', submittedAt: 'Sep 05, 2024 23:55', status: 'Graded', fileAttachments: [{ name: 'FILM402_s17_Essay.pdf', size: '0.8 MB', type: 'PDF' }], score: 35, feedback: 'The essay covers the topic but lacks depth. Several claims are made without supporting evidence. Please revisit the grading rubric.', gradedAt: 'Sep 09, 2024', isLate: false },
  // la05 \u2014 Three-Act Essay (3 submitted, 1 graded)
  { id: 'sub08', assignmentId: 'la05', studentId: 's04', submittedAt: 'Aug 09, 2024 15:00', status: 'Graded', fileAttachments: [{ name: 'FILM301_s04_ThreeAct.pdf', size: '0.7 MB', type: 'PDF' }], score: 72, feedback: 'Solid structural analysis. Your argument about the second act midpoint is well-supported. Improve your thesis statement for greater clarity.', gradedAt: 'Aug 12, 2024', isLate: false },
  { id: 'sub09', assignmentId: 'la05', studentId: 's08', submittedAt: 'Aug 10, 2024 22:45', status: 'Submitted', fileAttachments: [{ name: 'FILM301_s08_ThreeAct.pdf', size: '0.9 MB', type: 'PDF' }], isLate: false },
  { id: 'sub10', assignmentId: 'la05', studentId: 's19', submittedAt: 'Aug 11, 2024 09:10', status: 'Late', fileAttachments: [{ name: 'FILM301_s19_ThreeAct.pdf', size: '0.6 MB', type: 'PDF' }], isLate: true },
  // la06 \u2014 Dialogue Rewrite (4 submitted, 4 graded)
  { id: 'sub11', assignmentId: 'la06', studentId: 's04', submittedAt: 'Aug 31, 2024 20:00', status: 'Graded', fileAttachments: [{ name: 'FILM301_s04_Dialogue.pdf', size: '0.4 MB', type: 'PDF' }], textAnswer: 'My revision focuses on subtext through pauses and deflection rather than direct statement...', score: 65, feedback: 'Good instincts for subtext. The revised dialogue is more natural, but some lines still feel on-the-nose. Continue to trust the actors to carry the meaning.', gradedAt: 'Sep 03, 2024', isLate: false },
  { id: 'sub12', assignmentId: 'la06', studentId: 's08', submittedAt: 'Sep 01, 2024 14:20', status: 'Graded', fileAttachments: [{ name: 'FILM301_s08_Dialogue.pdf', size: '0.5 MB', type: 'PDF' }], score: 70, feedback: 'Excellent command of character voice. Each character sounds distinct. The rationale demonstrates strong analytical thinking.', gradedAt: 'Sep 03, 2024', isLate: false },
  { id: 'sub13', assignmentId: 'la06', studentId: 's11', submittedAt: 'Sep 01, 2024 23:50', status: 'Graded', fileAttachments: [{ name: 'FILM301_s11_Dialogue.pdf', size: '0.3 MB', type: 'PDF' }], score: 58, feedback: 'The rewrite shows improvement over the original. The rationale could be more specific about the dramatic intent of each change.', gradedAt: 'Sep 04, 2024', isLate: false },
  { id: 'sub14', assignmentId: 'la06', studentId: 's19', submittedAt: 'Aug 30, 2024 18:00', status: 'Graded', fileAttachments: [{ name: 'FILM301_s19_Dialogue.pdf', size: '0.4 MB', type: 'PDF' }], score: 68, feedback: 'Very strong work. The scene has genuine tension now. Minor formatting inconsistencies in the screenplay format.', gradedAt: 'Sep 04, 2024', isLate: false },
];
