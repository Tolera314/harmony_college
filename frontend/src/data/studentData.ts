import {
  StudentProfile,
  Course,
  TimetableEvent,
  AlertItem,
  GradeRecord,
  FinancialTransaction,
  RequirementCategory
} from '../types';

export const initialStudentProfile: StudentProfile = {
  name: 'Selam Alemayehu',
  id: 'HC-2024-8832',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  major: 'Theatrical Art & Digital Filmmaking',
  degree: 'Bachelor of Arts in Theatrical Art & Digital Media Production',
  email: 'selam.a@harmony.edu',
  phone: '+251 (0)91 123 4567',
  cumulativeGpa: 3.92,
  gpaChange: 0.04,
  completedCredits: 105,
  totalRequiredCredits: 120,
  attendanceRate: 97,
  cohortPercentile: 'Top 5% of Cohort',
  accountBalance: 0.00,
  clearedTerm: 'Fall 2024',
  expectedGraduation: 'May 2025',
  advisorName: 'Dr. Marcus Vance',
  advisorEmail: 'm.vance@harmony.edu'
};

export const initialActiveCourses: Course[] = [
  {
    id: 'film402',
    code: 'FILM402',
    title: 'Advanced Digital Cinematography & Directing',
    department: 'Theatrical Art & Filmmaking',
    credits: 4,
    instructor: 'Dr. Marcus Vance',
    instructorTitle: 'Senior Professor of Media Arts',
    instructorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    progress: 78,
    assignmentsDueText: '2 Film Reels Due',
    schedule: 'Mon, Wed 09:00 - 11:30',
    room: 'Sheger Film Studio A',
    description: 'Advanced RED & ARRI camera operations, dramatic scene directing, multi-camera lighting setups, color grading in DaVinci Resolve, and cinematic narrative composition.',
    syllabusOverview: 'Covers camera movement mechanics, dramatic actor blocking, multi-track audio sync, and peer-reviewed film festival submissions.',
    status: 'registered',
    assignments: [
      { id: 'a1', title: 'Short Narrative Dramatic Scene Edit', dueDate: 'Tomorrow, 11:59 PM', points: 100, status: 'pending' },
      { id: 'a2', title: 'Lighting Breakdown & Camera Test', dueDate: 'Jul 26, 2024', points: 50, status: 'pending' },
      { id: 'a3', title: 'Color Grading & Sound Master Reel', dueDate: 'Jul 12, 2024', points: 100, status: 'graded', grade: 'A (98%)' }
    ]
  },
  {
    id: 'audio301',
    code: 'AUDIO301',
    title: 'Cubase Audio Engineering & Music Production',
    department: 'Cubase & Music Production',
    credits: 4,
    instructor: 'Prof. Sarah Jenkins',
    instructorTitle: 'Head of Audio Engineering',
    instructorPhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    progress: 62,
    noPendingTasks: true,
    schedule: 'Mon, Wed 13:00 - 15:00',
    room: 'Sound Lab B (Sheger)',
    description: 'Multi-track Cubase DAW recording, spatial acoustic isolation, vocal tuning, synthesizer patch design, mixing console routing, and stereo mastering for film scores.',
    syllabusOverview: 'Deep dive into Cubase Pro 13, MIDI sequencing, VST instrumentation, side-chain compression, and commercial audio mastering.',
    status: 'registered',
    assignments: [
      { id: 'b1', title: 'Full Track Stereo Mixing & Mastering', dueDate: 'Jul 15, 2024', points: 100, status: 'graded', grade: 'A (95%)' },
      { id: 'b2', title: 'Vocal Tuning & Compression Benchmark', dueDate: 'Jul 08, 2024', points: 50, status: 'graded', grade: 'A+ (100%)' }
    ]
  },
  {
    id: 'desn440',
    code: 'DESN440',
    title: 'Graphic Design & Digital Marketing Strategy',
    department: 'Graphic Design & Digital Marketing',
    credits: 4,
    instructor: 'Prof. Elias Tadesse',
    instructorTitle: 'Digital Media Specialist',
    instructorPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    progress: 85,
    midtermAlert: 'Presentation Tomorrow',
    schedule: 'Tue, Thu 14:00 - 15:30',
    room: 'Media Center 204',
    description: 'Brand identity design, vector typography, social campaign analytics, UI/UX prototyping, digital poster art, and cross-channel marketing funnels.',
    syllabusOverview: 'Hands-on practice with Adobe Creative Cloud, Figma prototypes, audience analytics, and commercial brand launches.',
    status: 'registered',
    assignments: [
      { id: 'c1', title: 'Brand Identity & Digital Campaign Deck', dueDate: 'Tomorrow, 02:00 PM', points: 150, status: 'pending' },
      { id: 'c2', title: 'Vector Typography & Poster Portfolio', dueDate: 'Jul 28, 2024', points: 100, status: 'pending' },
      { id: 'c3', title: 'Social Media Analytics & UI Mockup', dueDate: 'Jul 05, 2024', points: 80, status: 'graded', grade: 'A (96%)' }
    ]
  }
];

export const catalogCourses: Course[] = [
  ...initialActiveCourses,
  {
    id: 'photo210',
    code: 'PHOTO210',
    title: 'Commercial Photography & Studio Lighting',
    department: 'Visual Arts & Photography',
    credits: 3,
    instructor: 'Prof. Helen Berhe',
    instructorTitle: 'Master Photographer',
    instructorPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    progress: 0,
    schedule: 'Tue, Thu 10:00 - 11:30',
    room: 'Burayu Photo Studio',
    description: 'Studio strobe lighting, portrait retouching, fashion photography composition, and commercial print preparation.',
    syllabusOverview: 'Professional lighting setups, high-key portraiture, RAW image editing, and gallery exhibition curation.',
    status: 'available',
    assignments: []
  },
  {
    id: 'journ305',
    code: 'JOURN305',
    title: 'Digital Journalism & New Media Broadcast',
    department: 'Journalism, IT & Languages',
    credits: 3,
    instructor: 'Prof. Dawit Solomon',
    instructorTitle: 'Senior Journalist & Producer',
    instructorPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    progress: 0,
    schedule: 'Mon, Wed 15:30 - 17:00',
    room: 'Broadcast Center 101 (Burayu)',
    description: 'Investigative reporting, podcast production, live broadcast anchoring, mobile journalism techniques, and digital media publishing ethics.',
    syllabusOverview: 'Field news gathering, teleprompter technique, video editing for news, and web publishing.',
    status: 'available',
    assignments: []
  },
  {
    id: 'mus220',
    code: 'MUS220',
    title: 'Music Instruments & Vocal Performance',
    department: 'Music Instruments & Vocal',
    credits: 3,
    instructor: 'Prof. Meron Haile',
    instructorTitle: 'Vocal Masterclass Director',
    instructorPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    progress: 0,
    schedule: 'Fri 09:00 - 12:00',
    room: 'Harmony Music Suite',
    description: 'Vocal breath control, keyboard technique, acoustic ensemble arrangement, stage presence, and song arrangement.',
    syllabusOverview: 'Solo and ensemble performance, pitch control, ear training, and live stage sound synthesis.',
    status: 'available',
    assignments: []
  }
];

export const todayTimetable: TimetableEvent[] = [
  {
    id: 't1',
    time: '09:00 - 11:30 • CURRENT',
    title: 'Digital Cinematography & Directing',
    location: 'Sheger Film Studio A',
    courseCode: 'FILM402',
    isCurrent: true
  },
  {
    id: 't2',
    time: '13:00 - 15:00',
    title: 'Cubase Audio Engineering Practice',
    location: 'Sound Lab B (Sheger)',
    courseCode: 'AUDIO301'
  },
  {
    id: 't3',
    time: '15:30 - 17:00',
    title: 'Burayu Student Exhibition Review',
    location: 'Burayu Cultural Media Hall'
  }
];

export const recentAlerts: AlertItem[] = [
  {
    id: 'a1',
    source: 'Burayu Media Center',
    message: 'Harmony College Annual Photography & Short Film Exhibition opens this Friday at Burayu Cultural Hall.',
    date: 'July 21, 2024',
    type: 'secondary',
    urgent: false
  },
  {
    id: 'a2',
    source: 'Sound Engineering Dept',
    message: 'New Cubase Pro 13 Workstations upgraded in Sound Studio B (Sheger Campus).',
    date: 'July 19, 2024',
    type: 'info',
    urgent: false
  },
  {
    id: 'a3',
    source: 'Registrar Office',
    message: 'Spring 2025 Senior Capstone Film & Portfolio registration window is now open.',
    date: 'July 16, 2024',
    type: 'secondary',
    urgent: false
  }
];

export const gradeHistory: GradeRecord[] = [
  { id: 'g1', courseCode: 'FILM301', courseTitle: 'Digital Lighting & Composition', term: 'Spring 2024', credits: 4, grade: 'A', numericGpa: 4.0, instructor: 'Dr. Marcus Vance' },
  { id: 'g2', courseCode: 'DESN201', courseTitle: 'Vector Graphics & Layout Design', term: 'Spring 2024', credits: 4, grade: 'A', numericGpa: 4.0, instructor: 'Prof. Elias Tadesse' },
  { id: 'g3', courseCode: 'JOURN202', courseTitle: 'Media Ethics & Public Communication', term: 'Spring 2024', credits: 3, grade: 'A-', numericGpa: 3.7, instructor: 'Prof. Dawit Solomon' },
  { id: 'g4', courseCode: 'AUDIO101', courseTitle: 'Fundamentals of Sound Synthesis', term: 'Spring 2024', credits: 3, grade: 'A', numericGpa: 4.0, instructor: 'Prof. Sarah Jenkins' },

  { id: 'g5', courseCode: 'THEA210', courseTitle: 'Stage Directing & Screenwriting', term: 'Fall 2023', credits: 4, grade: 'A', numericGpa: 4.0, instructor: 'Prof. Meron Haile' },
  { id: 'g6', courseCode: 'PHOTO101', courseTitle: 'Introduction to Photography', term: 'Fall 2023', credits: 4, grade: 'A', numericGpa: 4.0, instructor: 'Prof. Helen Berhe' },
  { id: 'g7', courseCode: 'IT105', courseTitle: 'Web Technologies & Media Systems', term: 'Fall 2023', credits: 4, grade: 'A', numericGpa: 4.0, instructor: 'Prof. Elias Tadesse' }
];

export const financialTransactions: FinancialTransaction[] = [
  { id: 'ft1', date: 'Jul 01, 2024', description: 'Harmony Creative Leadership Merit Scholarship', category: 'Scholarship', amount: -15000, status: 'Completed', receiptId: 'REC-2024-9981' },
  { id: 'ft2', date: 'Jul 01, 2024', description: 'Fall 2024 Full Creative Arts & Media Tuition', category: 'Tuition', amount: 18500, status: 'Completed', receiptId: 'REC-2024-9980' },
  { id: 'ft3', date: 'Jul 01, 2024', description: 'Student Health & Campus Insurance', category: 'Fee', amount: 1200, status: 'Completed', receiptId: 'REC-2024-9979' },
  { id: 'ft4', date: 'Jul 01, 2024', description: 'Cubase Studio & Camera Lab Infrastructure Fee', category: 'Fee', amount: 650, status: 'Completed', receiptId: 'REC-2024-9978' },
  { id: 'ft5', date: 'Jul 01, 2024', description: 'Sheger Media Arts Departmental Grant', category: 'Scholarship', amount: -5350, status: 'Completed', receiptId: 'REC-2024-9977' }
];

export const degreeRequirements: RequirementCategory[] = [
  {
    title: 'Theatrical Art & Digital Filmmaking Core',
    requiredCredits: 36,
    completedCredits: 36,
    courses: [
      { code: 'THEA101', title: 'Intro to Dramatic Arts', credits: 4, status: 'completed', grade: 'A' },
      { code: 'FILM201', title: 'Screenwriting & Storyboarding', credits: 4, status: 'completed', grade: 'A' },
      { code: 'PHOTO101', title: 'Introduction to Photography', credits: 4, status: 'completed', grade: 'A' },
      { code: 'FILM301', title: 'Digital Lighting & Composition', credits: 4, status: 'completed', grade: 'A' },
      { code: 'THEA210', title: 'Stage Directing & Acting', credits: 4, status: 'completed', grade: 'A' },
      { code: 'FILM402', title: 'Advanced Digital Cinematography', credits: 4, status: 'in_progress' },
      { code: 'AUDIO301', title: 'Cubase Audio Engineering', credits: 4, status: 'in_progress' },
      { code: 'DESN440', title: 'Graphic Design & Digital Marketing', credits: 4, status: 'in_progress' },
      { code: 'FILM490', title: 'Senior Capstone Film Project', credits: 4, status: 'remaining' }
    ]
  },
  {
    title: 'Cubase Audio & Media Arts Electives',
    requiredCredits: 30,
    completedCredits: 24,
    courses: [
      { code: 'AUDIO101', title: 'Fundamentals of Sound Synthesis', credits: 4, status: 'completed', grade: 'A' },
      { code: 'MUS110', title: 'Acoustic Instrumentation', credits: 4, status: 'completed', grade: 'A' },
      { code: 'DESN201', title: 'Vector Graphics & Layout Design', credits: 4, status: 'completed', grade: 'A' },
      { code: 'FILM350', title: 'Post-Production & Video Editing', credits: 4, status: 'completed', grade: 'A-' },
      { code: 'AUDIO250', title: 'Film Scoring & Sound Effects', credits: 4, status: 'completed', grade: 'A' },
      { code: 'PHOTO210', title: 'Commercial Photography & Studio Lighting', credits: 3, status: 'remaining' },
      { code: 'MUS220', title: 'Music Instruments & Vocal Performance', credits: 3, status: 'remaining' }
    ]
  },
  {
    title: 'Graphic Design & Digital Technology',
    requiredCredits: 24,
    completedCredits: 24,
    courses: [
      { code: 'IT105', title: 'Web Technologies & Media Systems', credits: 4, status: 'completed', grade: 'A' },
      { code: 'DESN110', title: 'Typography & Color Theory', credits: 4, status: 'completed', grade: 'A' },
      { code: 'DESN301', title: 'User Interface & Digital Prototyping', credits: 4, status: 'completed', grade: 'A' },
      { code: 'IT220', title: 'Digital Media Database Storage', credits: 4, status: 'completed', grade: 'A' },
      { code: 'DESN350', title: 'Motion Graphics & 2D Animation', credits: 4, status: 'completed', grade: 'A' },
      { code: 'IT401', title: 'Cloud Media Streaming Infrastructure', credits: 4, status: 'completed', grade: 'A' }
    ]
  },
  {
    title: 'Journalism, Languages & Communication',
    requiredCredits: 30,
    completedCredits: 21,
    courses: [
      { code: 'ENG101', title: 'Academic Writing & Public Rhetoric', credits: 3, status: 'completed', grade: 'A' },
      { code: 'JOURN202', title: 'Media Ethics & Public Communication', credits: 3, status: 'completed', grade: 'A-' },
      { code: 'HIS110', title: 'African Cinema & Cultural History', credits: 3, status: 'completed', grade: 'A' },
      { code: 'LANG101', title: 'Professional English & Media Diction', credits: 3, status: 'completed', grade: 'A' },
      { code: 'SOC105', title: 'Sociology of Digital Networks', credits: 3, status: 'completed', grade: 'A' },
      { code: 'ART120', title: 'Visual Aesthetics & Art History', credits: 3, status: 'completed', grade: 'A' },
      { code: 'JOURN305', title: 'Digital Journalism & New Media Broadcast', credits: 3, status: 'remaining' },
      { code: 'HUM300', title: 'Creative Leadership Seminar', credits: 3, status: 'remaining' },
      { code: 'FILM101', title: 'World Cinema & Narrative Analysis', credits: 3, status: 'remaining' }
    ]
  }
];
