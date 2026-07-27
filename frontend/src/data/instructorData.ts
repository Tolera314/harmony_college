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
