// ─────────────────────────────────────────────────────────────────────────────
// Harmony College — Department Head Shared Mock Dataset
// All views reference this single source of truth.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  DHProfile, Faculty, Course, Classroom, DeptStudent,
  ApprovalRequest, LeaveRequest, DHNotification, AuditLogEntry,
  EnrollmentPoint, GPAPoint, AttendancePoint, WorkloadPoint,
} from '../types/department';

// ── Department Head Profile ───────────────────────────────────────────────────
export const dhProfile: DHProfile = {
  name: 'Dr. Natnael Bekele',
  title: 'Department Head & Associate Professor',
  department: 'Theatrical Art & Digital Media',
  college: 'College of Arts & Creative Industries',
  email: 'n.bekele@harmony.edu',
  phone: '+251 (0)91 200 3344',
  officeRoom: 'Creative Arts Building, Room 302',
  avatar: '/natnael.png',
  employeeId: 'HC-FAC-0042',
  academicYear: '2024–2025',
  currentSemester: 'Fall 2024',
};

// ── Classrooms ────────────────────────────────────────────────────────────────
export const classrooms: Classroom[] = [
  { id: 'r01', name: 'Sheger Film Studio A', building: 'Media Center', capacity: 40, type: 'Studio' },
  { id: 'r02', name: 'Sound Lab B', building: 'Media Center', capacity: 30, type: 'Lab' },
  { id: 'r03', name: 'Lecture Hall 1', building: 'Main Campus', capacity: 80, type: 'Lecture Hall' },
  { id: 'r04', name: 'Design Lab C', building: 'Creative Arts Building', capacity: 35, type: 'Lab' },
  { id: 'r05', name: 'Seminar Room 202', building: 'Arts Annex', capacity: 25, type: 'Seminar Room' },
  { id: 'r06', name: 'Broadcast Studio D', building: 'Media Center', capacity: 20, type: 'Studio' },
];

// ── Faculty ───────────────────────────────────────────────────────────────────
export const faculty: Faculty[] = [
  {
    id: 'f01', name: 'Dr. Marcus Vance', rank: 'Professor', status: 'Active',
    email: 'm.vance@harmony.edu', phone: '+251 911 100 001', officeRoom: 'CAB 201',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    department: 'Theatrical Art & Digital Media', specialization: 'Cinematography & Directing',
    courseIds: ['c01', 'c02'], weeklyHours: 14, maxHours: 18, joinedYear: 2016,
  },
  {
    id: 'f02', name: 'Prof. Sarah Jenkins', rank: 'Associate Professor', status: 'Active',
    email: 's.jenkins@harmony.edu', phone: '+251 911 100 002', officeRoom: 'CAB 205',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    department: 'Theatrical Art & Digital Media', specialization: 'Audio Engineering & Music Production',
    courseIds: ['c03', 'c04'], weeklyHours: 12, maxHours: 18, joinedYear: 2018,
  },
  {
    id: 'f03', name: 'Dr. Tigist Haile', rank: 'Associate Professor', status: 'Active',
    email: 't.haile@harmony.edu', phone: '+251 911 100 003', officeRoom: 'CAB 210',
    avatar: '/tigist.png',
    department: 'Theatrical Art & Digital Media', specialization: 'Graphic Design & Branding',
    courseIds: ['c05', 'c06'], weeklyHours: 10, maxHours: 18, joinedYear: 2019,
  },
  {
    id: 'f04', name: 'Mr. Daniel Osei', rank: 'Assistant Professor', status: 'Active',
    email: 'd.osei@harmony.edu', phone: '+251 911 100 004', officeRoom: 'CAB 215',
    avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=300&q=80',
    department: 'Theatrical Art & Digital Media', specialization: 'Acting & Stage Production',
    courseIds: ['c07', 'c08'], weeklyHours: 12, maxHours: 16, joinedYear: 2020,
  },
  {
    id: 'f05', name: 'Dr. Meron Tadesse', rank: 'Assistant Professor', status: 'Active',
    email: 'm.tadesse@harmony.edu', phone: '+251 911 100 005', officeRoom: 'CAB 220',
    avatar: '/Meron.png',
    department: 'Theatrical Art & Digital Media', specialization: 'Media Studies & Cultural Theory',
    courseIds: ['c09'], weeklyHours: 8, maxHours: 16, joinedYear: 2021,
  },
  {
    id: 'f06', name: 'Prof. James Adeyemi', rank: 'Professor', status: 'Active',
    email: 'j.adeyemi@harmony.edu', phone: '+251 911 100 006', officeRoom: 'CAB 225',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    department: 'Theatrical Art & Digital Media', specialization: 'Broadcast Journalism & Media Law',
    courseIds: ['c10', 'c11'], weeklyHours: 14, maxHours: 18, joinedYear: 2015,
  },
  {
    id: 'f07', name: 'Ms. Rahel Solomon', rank: 'Lecturer', status: 'Active',
    email: 'r.solomon@harmony.edu', phone: '+251 911 100 007', officeRoom: 'CAB 230',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=300&q=80',
    department: 'Theatrical Art & Digital Media', specialization: 'Digital Photography & Editing',
    courseIds: ['c12'], weeklyHours: 6, maxHours: 14, joinedYear: 2022,
  },
  {
    id: 'f08', name: 'Dr. Yohannes Girma', rank: 'Associate Professor', status: 'On Leave',
    email: 'y.girma@harmony.edu', phone: '+251 911 100 008', officeRoom: 'CAB 235',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    department: 'Theatrical Art & Digital Media', specialization: 'Film Theory & Post-Production',
    courseIds: [], weeklyHours: 0, maxHours: 18, joinedYear: 2017,
  },
  {
    id: 'f09', name: 'Mr. Kebede Alemu', rank: 'Visiting Lecturer', status: 'Part-Time',
    email: 'k.alemu@harmony.edu', phone: '+251 911 100 009', officeRoom: 'CAB 240',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    department: 'Theatrical Art & Digital Media', specialization: 'Live Event Production',
    courseIds: ['c07'], weeklyHours: 4, maxHours: 8, joinedYear: 2023,
  },
  {
    id: 'f10', name: 'Dr. Amina Okafor', rank: 'Assistant Professor', status: 'Active',
    email: 'a.okafor@harmony.edu', phone: '+251 911 100 010', officeRoom: 'CAB 245',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80',
    department: 'Theatrical Art & Digital Media', specialization: 'Animation & Motion Graphics',
    courseIds: ['c05', 'c11'], weeklyHours: 10, maxHours: 16, joinedYear: 2022,
  },
];

// ── Courses ───────────────────────────────────────────────────────────────────
export const courses: Course[] = [
  { id: 'c01', code: 'FILM402', title: 'Advanced Digital Cinematography & Directing', facultyId: 'f01', semester: 'Fall 2024', credits: 4, roomId: 'r01', capacity: 40, registered: 38, status: 'Active', schedule: 'Mon, Wed 09:00–11:30', description: 'Advanced RED & ARRI camera operations, dramatic scene directing and color grading.' },
  { id: 'c02', code: 'FILM301', title: 'Narrative Screenwriting & Story Development', facultyId: 'f01', semester: 'Fall 2024', credits: 3, roomId: 'r05', capacity: 25, registered: 23, status: 'Active', schedule: 'Tue, Thu 14:00–15:30', description: 'Three-act structure, character arc, dialogue writing and script formatting.' },
  { id: 'c03', code: 'AUDIO301', title: 'Cubase Audio Engineering & Music Production', facultyId: 'f02', semester: 'Fall 2024', credits: 4, roomId: 'r02', capacity: 30, registered: 28, status: 'Active', schedule: 'Mon, Wed 13:00–15:00', description: 'Multi-track recording, spatial acoustics, vocal tuning and stereo mastering.' },
  { id: 'c04', code: 'AUDIO201', title: 'Sound Design for Film & Television', facultyId: 'f02', semester: 'Spring 2025', credits: 3, roomId: 'r02', capacity: 30, registered: 0, status: 'Pending Approval', schedule: 'Tue, Thu 10:00–11:30', description: 'Foley art, ADR, surround sound mixing for narrative and documentary film.' },
  { id: 'c05', code: 'DESN440', title: 'Graphic Design & Digital Marketing Strategy', facultyId: 'f03', semester: 'Fall 2024', credits: 4, roomId: 'r04', capacity: 35, registered: 34, status: 'Active', schedule: 'Mon, Wed 15:00–17:00', description: 'Brand identity, UI/UX principles, social media strategy and content production.' },
  { id: 'c06', code: 'DESN201', title: 'Typography & Visual Communication', facultyId: 'f03', semester: 'Fall 2024', credits: 3, roomId: 'r04', capacity: 35, registered: 30, status: 'Active', schedule: 'Fri 09:00–12:00', description: 'Type anatomy, grid systems, hierarchy and print vs digital layout design.' },
  { id: 'c07', code: 'THEA310', title: 'Advanced Acting & Stage Direction', facultyId: 'f04', semester: 'Fall 2024', credits: 4, roomId: 'r03', capacity: 45, registered: 42, status: 'Active', schedule: 'Tue, Thu 08:00–10:00', description: 'Stanislavski method, physical theatre, improvisation and ensemble performance.' },
  { id: 'c08', code: 'THEA201', title: 'Introduction to Theatre Arts & Performance', facultyId: 'f04', semester: 'Fall 2024', credits: 3, roomId: 'r03', capacity: 80, registered: 71, status: 'Active', schedule: 'Mon, Wed 08:00–09:30', description: 'History of theatre, script reading, voice training and basic stagecraft.' },
  { id: 'c09', code: 'MDIA250', title: 'Media Studies & Cultural Theory', facultyId: 'f05', semester: 'Fall 2024', credits: 3, roomId: 'r05', capacity: 25, registered: 22, status: 'Active', schedule: 'Fri 13:00–16:00', description: 'Critical theory, representation, media ownership and digital culture discourse.' },
  { id: 'c10', code: 'JOUR401', title: 'Broadcast Journalism & Media Ethics', facultyId: 'f06', semester: 'Fall 2024', credits: 3, roomId: 'r06', capacity: 20, registered: 18, status: 'Active', schedule: 'Tue, Thu 13:00–14:30', description: 'Live reporting, news writing, ethical frameworks and media law principles.' },
  { id: 'c11', code: 'ANIM350', title: 'Motion Graphics & 2D Animation', facultyId: 'f10', semester: 'Spring 2025', credits: 4, roomId: 'r04', capacity: 35, registered: 0, status: 'Pending Approval', schedule: 'Mon, Wed 11:00–13:00', description: 'After Effects, character rigging, motion path timing and kinetic typography.' },
  { id: 'c12', code: 'PHOT210', title: 'Digital Photography & Post-Processing', facultyId: 'f07', semester: 'Fall 2024', credits: 3, roomId: 'r04', capacity: 35, registered: 29, status: 'Active', schedule: 'Thu 09:00–12:00', description: 'DSLR/mirrorless controls, studio lighting setups and Lightroom/Photoshop workflows.' },
];

// ── Students ──────────────────────────────────────────────────────────────────
export const students: DeptStudent[] = [
  { id: 's01', name: 'Selam Alemayehu', studentId: 'HC-2024-8832', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', program: 'BA Theatrical Art & Digital Media', year: 4, cgpa: 3.92, creditsEarned: 105, totalCredits: 120, attendanceRate: 97, standing: 'Excellent', advisorId: 'f01', riskLevel: 'Low', email: 'selam.a@harmony.edu', enrolledCourseIds: ['c01', 'c03', 'c05'] },
  { id: 's02', name: 'Biruk Teshome', studentId: 'HC-2023-7641', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', program: 'BA Theatrical Art & Digital Media', year: 3, cgpa: 3.74, creditsEarned: 82, totalCredits: 120, attendanceRate: 94, standing: 'Excellent', advisorId: 'f02', riskLevel: 'Low', email: 'biruk.t@harmony.edu', enrolledCourseIds: ['c03', 'c07', 'c10'] },
  { id: 's03', name: 'Hana Wolde', studentId: 'HC-2024-9001', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80', program: 'BA Broadcast Journalism', year: 2, cgpa: 3.51, creditsEarned: 58, totalCredits: 120, attendanceRate: 91, standing: 'Good', advisorId: 'f06', riskLevel: 'Low', email: 'hana.w@harmony.edu', enrolledCourseIds: ['c10', 'c09', 'c06'] },
  { id: 's04', name: 'Yonas Kebede', studentId: 'HC-2022-5520', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=300&q=80', program: 'BA Theatrical Art & Digital Media', year: 4, cgpa: 2.85, creditsEarned: 99, totalCredits: 120, attendanceRate: 78, standing: 'Warning', advisorId: 'f01', riskLevel: 'High', email: 'yonas.k@harmony.edu', enrolledCourseIds: ['c07', 'c08', 'c02'] },
  { id: 's05', name: 'Liya Girma', studentId: 'HC-2025-1122', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=300&q=80', program: 'BA Graphic Design & Digital Marketing', year: 1, cgpa: 3.88, creditsEarned: 22, totalCredits: 120, attendanceRate: 99, standing: 'Excellent', advisorId: 'f03', riskLevel: 'Low', email: 'liya.g@harmony.edu', enrolledCourseIds: ['c05', 'c06', 'c12'] },
  { id: 's06', name: 'Dawit Mekonnen', studentId: 'HC-2023-7200', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80', program: 'BA Audio Engineering & Music Production', year: 3, cgpa: 3.30, creditsEarned: 78, totalCredits: 120, attendanceRate: 88, standing: 'Good', advisorId: 'f02', riskLevel: 'Medium', email: 'dawit.m@harmony.edu', enrolledCourseIds: ['c03', 'c12', 'c09'] },
  { id: 's07', name: 'Feven Hailu', studentId: 'HC-2024-8510', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80', program: 'BA Theatrical Art & Digital Media', year: 2, cgpa: 2.45, creditsEarned: 42, totalCredits: 120, attendanceRate: 71, standing: 'Probation', advisorId: 'f05', riskLevel: 'Critical', email: 'feven.h@harmony.edu', enrolledCourseIds: ['c08', 'c09'] },
  { id: 's08', name: 'Robel Bekele', studentId: 'HC-2022-5130', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80', program: 'BA Broadcast Journalism', year: 4, cgpa: 3.65, creditsEarned: 112, totalCredits: 120, attendanceRate: 93, standing: 'Excellent', advisorId: 'f06', riskLevel: 'Low', email: 'robel.b@harmony.edu', enrolledCourseIds: ['c10', 'c01', 'c02'] },
  { id: 's09', name: 'Mekdes Alemu', studentId: 'HC-2023-6955', avatar: 'https://images.unsplash.com/photo-1535468850893-d6e543fbd7f5?auto=format&fit=crop&w=300&q=80', program: 'BA Graphic Design & Digital Marketing', year: 3, cgpa: 3.10, creditsEarned: 76, totalCredits: 120, attendanceRate: 85, standing: 'Good', advisorId: 'f03', riskLevel: 'Medium', email: 'mekdes.a@harmony.edu', enrolledCourseIds: ['c05', 'c11', 'c12'] },
  { id: 's10', name: 'Abel Tesfaye', studentId: 'HC-2025-1340', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', program: 'BA Audio Engineering & Music Production', year: 1, cgpa: 3.55, creditsEarned: 18, totalCredits: 120, attendanceRate: 96, standing: 'Good', advisorId: 'f02', riskLevel: 'Low', email: 'abel.t@harmony.edu', enrolledCourseIds: ['c03', 'c08'] },
  { id: 's11', name: 'Selamawit Desta', studentId: 'HC-2022-4980', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80', program: 'BA Theatrical Art & Digital Media', year: 4, cgpa: 2.70, creditsEarned: 98, totalCredits: 120, attendanceRate: 80, standing: 'Warning', advisorId: 'f04', riskLevel: 'High', email: 'selamawit.d@harmony.edu', enrolledCourseIds: ['c07', 'c02', 'c09'] },
  { id: 's12', name: 'Henok Mulugeta', studentId: 'HC-2024-8761', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80', program: 'BA Broadcast Journalism', year: 2, cgpa: 3.78, creditsEarned: 44, totalCredits: 120, attendanceRate: 95, standing: 'Excellent', advisorId: 'f06', riskLevel: 'Low', email: 'henok.m@harmony.edu', enrolledCourseIds: ['c10', 'c06', 'c05'] },
  { id: 's13', name: 'Tigist Worku', studentId: 'HC-2023-7388', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80', program: 'BA Graphic Design & Digital Marketing', year: 3, cgpa: 3.45, creditsEarned: 80, totalCredits: 120, attendanceRate: 90, standing: 'Good', advisorId: 'f10', riskLevel: 'Low', email: 'tigist.w@harmony.edu', enrolledCourseIds: ['c05', 'c11', 'c06'] },
  { id: 's14', name: 'Ezra Habtamu', studentId: 'HC-2025-1290', avatar: 'https://images.unsplash.com/photo-1590086782957-93c06ef21604?auto=format&fit=crop&w=300&q=80', program: 'BA Theatrical Art & Digital Media', year: 1, cgpa: 3.20, creditsEarned: 16, totalCredits: 120, attendanceRate: 88, standing: 'Good', advisorId: 'f04', riskLevel: 'Low', email: 'ezra.h@harmony.edu', enrolledCourseIds: ['c07', 'c08'] },
  { id: 's15', name: 'Bethlehem Girma', studentId: 'HC-2022-5060', avatar: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=300&q=80', program: 'BA Audio Engineering & Music Production', year: 4, cgpa: 3.90, creditsEarned: 110, totalCredits: 120, attendanceRate: 98, standing: 'Excellent', advisorId: 'f02', riskLevel: 'Low', email: 'bethlehem.g@harmony.edu', enrolledCourseIds: ['c03', 'c01', 'c12'] },
  { id: 's16', name: 'Samuel Teklu', studentId: 'HC-2023-7050', avatar: 'https://images.unsplash.com/photo-1542178243-bc20204b769f?auto=format&fit=crop&w=300&q=80', program: 'BA Broadcast Journalism', year: 3, cgpa: 2.90, creditsEarned: 74, totalCredits: 120, attendanceRate: 76, standing: 'Warning', advisorId: 'f06', riskLevel: 'High', email: 'samuel.t@harmony.edu', enrolledCourseIds: ['c10', 'c09'] },
  { id: 's17', name: 'Mahlet Tafesse', studentId: 'HC-2024-8400', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80', program: 'BA Theatrical Art & Digital Media', year: 2, cgpa: 3.62, creditsEarned: 48, totalCredits: 120, attendanceRate: 92, standing: 'Good', advisorId: 'f01', riskLevel: 'Low', email: 'mahlet.t@harmony.edu', enrolledCourseIds: ['c01', 'c07', 'c09'] },
  { id: 's18', name: 'Naol Bekele', studentId: 'HC-2025-1500', avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=300&q=80', program: 'BA Graphic Design & Digital Marketing', year: 1, cgpa: 3.40, creditsEarned: 14, totalCredits: 120, attendanceRate: 94, standing: 'Good', advisorId: 'f03', riskLevel: 'Low', email: 'naol.b@harmony.edu', enrolledCourseIds: ['c05', 'c06'] },
  { id: 's19', name: 'Tsehay Alemu', studentId: 'HC-2022-4800', avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&q=80', program: 'BA Theatrical Art & Digital Media', year: 4, cgpa: 3.15, creditsEarned: 103, totalCredits: 120, attendanceRate: 83, standing: 'Good', advisorId: 'f04', riskLevel: 'Medium', email: 'tsehay.a@harmony.edu', enrolledCourseIds: ['c07', 'c02', 'c12'] },
  { id: 's20', name: 'Abebe Tesfaye', studentId: 'HC-2023-6700', avatar: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?auto=format&fit=crop&w=300&q=80', program: 'BA Audio Engineering & Music Production', year: 3, cgpa: 2.60, creditsEarned: 72, totalCredits: 120, attendanceRate: 74, standing: 'Warning', advisorId: 'f02', riskLevel: 'High', email: 'abebe.t@harmony.edu', enrolledCourseIds: ['c03', 'c08', 'c09'] },
];

// ── Approval Requests ─────────────────────────────────────────────────────────
export const approvalRequests: ApprovalRequest[] = [
  { id: 'ap01', type: 'Course Offering', courseId: 'c04', submittedBy: 'Prof. Sarah Jenkins', submittedAt: 'Jul 18, 2024 10:22 AM', status: 'Pending', notes: 'Sound Design for Film — Spring 2025 offering. Lab B confirmed available.' },
  { id: 'ap02', type: 'Course Offering', courseId: 'c11', submittedBy: 'Dr. Amina Okafor', submittedAt: 'Jul 19, 2024 02:10 PM', status: 'Pending', notes: 'Motion Graphics course — new curriculum addition for Spring 2025.' },
  { id: 'ap03', type: 'Room Change', courseId: 'c08', submittedBy: 'Mr. Daniel Osei', submittedAt: 'Jul 15, 2024 09:00 AM', status: 'Approved', notes: 'Upgrading from Seminar Room to Lecture Hall 1 due to enrollment surge.' },
  { id: 'ap04', type: 'Course Change', courseId: 'c02', submittedBy: 'Dr. Marcus Vance', submittedAt: 'Jul 10, 2024 11:30 AM', status: 'Approved', notes: 'Credit hours changed from 2 to 3 to accommodate expanded curriculum.' },
  { id: 'ap05', type: 'New Course', courseId: 'c12', submittedBy: 'Ms. Rahel Solomon', submittedAt: 'Jun 28, 2024 04:15 PM', status: 'Approved', notes: 'New photography elective — approved and scheduled for Fall 2024.' },
  { id: 'ap06', type: 'Course Offering', courseId: 'c09', submittedBy: 'Dr. Meron Tadesse', submittedAt: 'Jul 20, 2024 08:45 AM', status: 'Rejected', notes: 'Duplicate topic coverage with JOUR401 detected. Revision required.' },
];

// ── Leave Requests ────────────────────────────────────────────────────────────
export const leaveRequests: LeaveRequest[] = [
  {
    id: 'lr01', facultyId: 'f08', type: 'Research', reason: 'Presenting paper at the African Film Academy Conference in Nairobi, Kenya.',
    startDate: 'Aug 05, 2024', endDate: 'Aug 18, 2024', days: 14, status: 'Approved',
    submittedAt: 'Jul 10, 2024', reviewedAt: 'Jul 12, 2024', hasDocument: true,
    timeline: [
      { date: 'Jul 10, 2024', action: 'Submitted', actor: 'Dr. Yohannes Girma' },
      { date: 'Jul 12, 2024', action: 'Approved by Department Head', actor: 'Dr. Natnael Bekele' },
      { date: 'Jul 12, 2024', action: 'Forwarded to HR', actor: 'System' },
    ],
  },
  {
    id: 'lr02', facultyId: 'f05', type: 'Medical', reason: 'Recovery from minor surgery. Doctor clearance attached.',
    startDate: 'Jul 22, 2024', endDate: 'Jul 31, 2024', days: 10, status: 'Pending',
    submittedAt: 'Jul 19, 2024', hasDocument: true,
    timeline: [
      { date: 'Jul 19, 2024', action: 'Submitted', actor: 'Dr. Meron Tadesse' },
    ],
  },
  {
    id: 'lr03', facultyId: 'f07', type: 'Personal', reason: 'Family obligation requiring travel to Hawassa for one week.',
    startDate: 'Jul 29, 2024', endDate: 'Aug 02, 2024', days: 5, status: 'Pending',
    submittedAt: 'Jul 20, 2024', hasDocument: false,
    timeline: [
      { date: 'Jul 20, 2024', action: 'Submitted', actor: 'Ms. Rahel Solomon' },
    ],
  },
  {
    id: 'lr04', facultyId: 'f03', type: 'Conference', reason: 'Attending the International Design & Branding Symposium in Addis Ababa.',
    startDate: 'Aug 20, 2024', endDate: 'Aug 23, 2024', days: 4, status: 'Approved',
    submittedAt: 'Jul 08, 2024', reviewedAt: 'Jul 09, 2024', hasDocument: true,
    timeline: [
      { date: 'Jul 08, 2024', action: 'Submitted', actor: 'Dr. Tigist Haile' },
      { date: 'Jul 09, 2024', action: 'Approved by Department Head', actor: 'Dr. Natnael Bekele' },
    ],
  },
];

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifications: DHNotification[] = [
  { id: 'n01', type: 'approval', title: 'Course Awaiting Approval', message: 'Prof. Sarah Jenkins submitted AUDIO201 (Sound Design) for Spring 2025 approval.', timestamp: 'Jul 19, 2024 02:10 PM', read: false, module: 'approvals' },
  { id: 'n02', type: 'approval', title: 'Course Awaiting Approval', message: 'Dr. Amina Okafor submitted ANIM350 (Motion Graphics) for Spring 2025 approval.', timestamp: 'Jul 19, 2024 02:10 PM', read: false, module: 'approvals' },
  { id: 'n03', type: 'warning', title: 'Faculty Leave Request', message: 'Dr. Meron Tadesse submitted a 10-day medical leave request. Action required.', timestamp: 'Jul 19, 2024 09:00 AM', read: false, module: 'leave_requests' },
  { id: 'n04', type: 'alert', title: 'Attendance Below Threshold', message: 'THEA201 attendance has dropped to 71% — below the 80% institutional minimum.', timestamp: 'Jul 18, 2024 04:00 PM', read: false, module: 'attendance' },
  { id: 'n05', type: 'alert', title: 'Department GPA Alert', message: 'Department average GPA dropped 0.08 points from last semester. Review recommended.', timestamp: 'Jul 17, 2024 10:30 AM', read: true, module: 'reports' },
  { id: 'n06', type: 'info', title: 'Course Reaching Capacity', message: 'THEA310 is at 93% capacity (42/45). Consider opening a second section.', timestamp: 'Jul 16, 2024 08:00 AM', read: true, module: 'courses' },
  { id: 'n07', type: 'info', title: 'Faculty Leave Request', message: 'Ms. Rahel Solomon submitted a 5-day personal leave request.', timestamp: 'Jul 20, 2024 03:15 PM', read: false, module: 'leave_requests' },
  { id: 'n08', type: 'info', title: 'Audit Log Updated', message: 'JOUR401 room change approval recorded in audit trail by registrar.', timestamp: 'Jul 15, 2024 11:00 AM', read: true, module: 'audit_log' },
];

// ── Audit Log ─────────────────────────────────────────────────────────────────
export const auditLog: AuditLogEntry[] = [
  { id: 'al01', date: 'Jul 20, 2024 08:45', action: 'Course Submitted', user: 'Dr. Meron Tadesse', module: 'Courses', description: 'Submitted MDIA250 for Fall 2024 offering.', status: 'Success' },
  { id: 'al02', date: 'Jul 19, 2024 14:10', action: 'Approval Submitted', user: 'Dr. Amina Okafor', module: 'Approvals', description: 'ANIM350 course offering submitted for Spring 2025 approval.', status: 'Success' },
  { id: 'al03', date: 'Jul 19, 2024 09:30', action: 'Leave Submitted', user: 'Dr. Meron Tadesse', module: 'Leave Requests', description: '10-day medical leave request submitted for Jul 22–31.', status: 'Warning' },
  { id: 'al04', date: 'Jul 18, 2024 16:00', action: 'Attendance Alert Triggered', user: 'System', module: 'Attendance', description: 'THEA201 attendance fell below 80% threshold.', status: 'Warning' },
  { id: 'al05', date: 'Jul 15, 2024 09:00', action: 'Approval Submitted', user: 'Mr. Daniel Osei', module: 'Approvals', description: 'THEA201 room change request submitted to department head.', status: 'Success' },
  { id: 'al06', date: 'Jul 15, 2024 11:00', action: 'Approval Granted', user: 'Dr. Natnael Bekele', module: 'Approvals', description: 'THEA201 room change approved — Lecture Hall 1 assigned.', status: 'Success' },
  { id: 'al07', date: 'Jul 12, 2024 10:15', action: 'Leave Approved', user: 'Dr. Natnael Bekele', module: 'Leave Requests', description: 'Approved 14-day research leave for Dr. Yohannes Girma.', status: 'Success' },
  { id: 'al08', date: 'Jul 10, 2024 11:30', action: 'Course Modified', user: 'Dr. Marcus Vance', module: 'Courses', description: 'FILM301 credit hours updated from 2 to 3 credits.', status: 'Success' },
  { id: 'al09', date: 'Jul 09, 2024 14:30', action: 'Leave Approved', user: 'Dr. Natnael Bekele', module: 'Leave Requests', description: 'Approved conference leave for Dr. Tigist Haile — Aug 20–23.', status: 'Success' },
  { id: 'al10', date: 'Jun 28, 2024 16:15', action: 'Approval Granted', user: 'Dr. Natnael Bekele', module: 'Approvals', description: 'PHOT210 approved as new elective — Fall 2024.', status: 'Success' },
  { id: 'al11', date: 'Jul 20, 2024 08:10', action: 'Approval Rejected', user: 'Dr. Natnael Bekele', module: 'Approvals', description: 'MDIA250 rejected — duplicate coverage with JOUR401.', status: 'Failed' },
  { id: 'al12', date: 'Jul 16, 2024 07:55', action: 'Capacity Alert Triggered', user: 'System', module: 'Courses', description: 'THEA310 reached 93% of 45-seat capacity.', status: 'Warning' },
];

// ── Chart Data ─────────────────────────────────────────────────────────────────
export const enrollmentTrend: EnrollmentPoint[] = [
  { semester: 'Fall 22', count: 198 },
  { semester: 'Spr 23', count: 215 },
  { semester: 'Fall 23', count: 230 },
  { semester: 'Spr 24', count: 218 },
  { semester: 'Fall 24', count: 248 },
];

export const gpaByCourseTrend: GPAPoint[] = [
  { course: 'FILM402', avgGpa: 3.72 },
  { course: 'AUDIO301', avgGpa: 3.55 },
  { course: 'DESN440', avgGpa: 3.41 },
  { course: 'THEA310', avgGpa: 3.30 },
  { course: 'THEA201', avgGpa: 3.10 },
  { course: 'MDIA250', avgGpa: 3.62 },
];

export const attendanceTrend: AttendancePoint[] = [
  { week: 'Wk 1', rate: 96 },
  { week: 'Wk 2', rate: 94 },
  { week: 'Wk 3', rate: 93 },
  { week: 'Wk 4', rate: 91 },
  { week: 'Wk 5', rate: 88 },
  { week: 'Wk 6', rate: 90 },
  { week: 'Wk 7', rate: 91 },
  { week: 'Wk 8', rate: 89 },
];

export const facultyWorkload: WorkloadPoint[] = faculty
  .filter((f) => f.status !== 'On Leave')
  .map((f) => ({ facultyName: f.name.split(' ').pop()!, hours: f.weeklyHours, maxHours: f.maxHours }));

// ── Derived KPIs ───────────────────────────────────────────────────────────────
export const kpiData = {
  totalStudents: students.length,
  facultyCount: faculty.length,
  activeCourses: courses.filter((c) => c.status === 'Active').length,
  pendingApprovals: approvalRequests.filter((a) => a.status === 'Pending').length,
  avgGpa: +(students.reduce((sum, s) => sum + s.cgpa, 0) / students.length).toFixed(2),
  avgAttendance: Math.round(students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length),
};

// ── Helpers ────────────────────────────────────────────────────────────────────
export function getFacultyById(id: string) { return faculty.find((f) => f.id === id); }
export function getCourseById(id: string) { return courses.find((c) => c.id === id); }
export function getClassroomById(id: string) { return classrooms.find((r) => r.id === id); }
