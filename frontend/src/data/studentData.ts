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
    status: 'enrolled',
    semester: 'Semester 5 — Fall 2024',
    attendanceRate: 97,
    currentGrade: 'A',
    assignments: [
      {
        id: 'a1',
        title: 'Short Narrative Dramatic Scene Edit',
        dueDate: 'Tomorrow, 11:59 PM',
        points: 100,
        status: 'pending',
        description: 'Edit the provided raw footage of a 2-person dramatic scene. Focus on maintaining continuity, pacing for dramatic tension, and creative split-edits to emphasize subtext.',
        instructions: '1. Download the raw footage package (1080p ProRes).\n2. Create a rough cut focusing on the emotional beats.\n3. Apply final audio crossfades and a basic color pass.\n4. Export as FILM402_DramaticScene_YourName.mp4 at H.264 24fps.\n5. Max file size: 250 MB.',
        attachments: [
          { name: 'Dramatic Scene Screenplay Page.pdf', size: '150 KB', type: 'PDF' },
          { name: 'Footage Download Link.txt', size: '1 KB', type: 'TXT' }
        ]
      },
      {
        id: 'a2',
        title: 'Lighting Breakdown & Camera Test',
        dueDate: 'Jul 26, 2024',
        points: 50,
        status: 'pending',
        description: 'Submit a detailed schematic and storyboard illustrating a 3-point lighting setup for a high-contrast noir scene, along with a test shot video/image.',
        instructions: '1. Draw a top-down lighting diagram (Key, Fill, Backlight, Background lights).\n2. Note the intensity ratio, color temperature, and diffusion materials used.\n3. Take a reference shot showing the final look.\n4. Submit the diagram and shot as a single PDF or ZIP folder.',
        attachments: [
          { name: 'Lighting Schematic Template.pdf', size: '420 KB', type: 'PDF' }
        ]
      },
      {
        id: 'a3',
        title: 'Color Grading & Sound Master Reel',
        dueDate: 'Jul 12, 2024',
        points: 100,
        status: 'graded',
        grade: 'A (98%)',
        score: 98,
        description: 'Apply advanced color grading and spatial sound mastering techniques to your midterm film project.',
        instructions: '1. Use DaVinci Resolve for primary color wheel balances and secondary qualifier adjustments.\n2. In Cubase, master the stereo soundscape: adjust dynamic ranges and EQ parameters.\n3. Submit the final rendered clip and a brief workflow statement.',
        attachments: [],
        submittedAt: 'Jul 11, 2024 10:42 PM',
        submittedFile: { name: 'FILM402_MasterReel_SelamA.zip', size: '185 MB' },
        submittedText: 'Completed primary color wheel balancing, isolated skin tones using qualifiers for custom saturation levels, and mastered the audio track in Cubase Pro using standard limiting and EQ sweeps.',
        feedback: 'Superb execution, Selam! The skin tones look perfectly natural and contrast holds up beautifully in the shadow details. The sound master is crisp, dialogue is extremely clear, and VST score level transitions are perfectly smooth. Outstanding reel.'
      }
    ],
    quizzes: [
      {
        id: 'q1',
        title: 'Cinematography Fundamentals Quiz',
        description: 'A comprehensive quiz on lens selection, f-stops, and basic framing.',
        instructions: 'You have 30 minutes to complete this quiz. It consists of multiple choice and short answer questions.',
        durationMinutes: 30,
        availableDate: 'Jul 20, 2024',
        closingDate: 'Jul 30, 2024',
        passingScore: 60,
        maxAttempts: 1,
        totalPoints: 100,
        showResultsImmediately: true,
        questions: [
          {
            id: 'q1_1',
            type: 'MCQ',
            questionText: 'Which lens focal length is generally considered "normal" on a 35mm full-frame camera?',
            options: ['35mm', '50mm', '85mm', '16mm'],
            points: 20
          },
          {
            id: 'q1_2',
            type: 'TrueFalse',
            questionText: 'A lower f-stop number (e.g. f/1.4) results in a deeper depth of field.',
            options: ['True', 'False'],
            points: 20
          },
          {
            id: 'q1_3',
            type: 'ShortAnswer',
            questionText: 'Briefly explain the rule of thirds.',
            points: 60
          }
        ],
        attempt: undefined // Not attempted yet
      },
      {
        id: 'q2',
        title: 'Color Grading Terminology',
        description: 'Test your knowledge on color wheels, scopes, and luts.',
        instructions: '15 minutes. Multiple choice only.',
        durationMinutes: 15,
        availableDate: 'Jul 01, 2024',
        closingDate: 'Jul 10, 2024',
        passingScore: 70,
        maxAttempts: 2,
        totalPoints: 50,
        showResultsImmediately: true,
        questions: [
          {
            id: 'q2_1',
            type: 'MCQ',
            questionText: 'Which scope is best used to check for skin tone accuracy?',
            options: ['Waveform', 'Vectorscope', 'Histogram', 'RGB Parade'],
            points: 50
          }
        ],
        attempt: {
          status: 'graded',
          startedAt: 'Jul 05, 2024 14:00',
          submittedAt: 'Jul 05, 2024 14:10',
          score: 50,
          answers: { 'q2_1': 'Vectorscope' },
          feedback: 'Perfect!'
        }
      }
    ]
  },
  {
    id: 'audio301',
    code: 'AUDIO301',
    title: 'Cubase Audio Engineering & Music Production',
    department: 'Audio Engineering',
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
    status: 'enrolled',
    semester: 'Semester 5 — Fall 2024',
    attendanceRate: 91,
    currentGrade: 'A-',
    assignments: [
      {
        id: 'b1',
        title: 'Full Track Stereo Mixing & Mastering',
        dueDate: 'Jul 15, 2024',
        points: 100,
        status: 'graded',
        grade: 'A (95%)',
        score: 95,
        description: 'Mix and master the provided 24-track multi-track session inside Cubase Pro. Demonstrate advanced routing and compression techniques.',
        instructions: '1. Download the stems.\n2. Balance levels, pan positions, and insert primary compressors.\n3. Route sub-mixes to group channels.\n4. Apply final stereo bus compression and limiting.\n5. Export as 24-bit 48kHz WAV.',
        attachments: [],
        submittedAt: 'Jul 15, 2024 04:12 PM',
        submittedFile: { name: 'AUDIO301_StereoMaster_Selam.wav', size: '48 MB' },
        feedback: 'Clean mix with beautiful frequency separation. The drums feel punchy and the vocals sit perfectly in the center. The stereo width is excellent, although the low-end could be tamed slightly around 60Hz. Great job!'
      },
      {
        id: 'b2',
        title: 'Vocal Tuning & Compression Benchmark',
        dueDate: 'Jul 08, 2024',
        points: 50,
        status: 'graded',
        grade: 'A+ (100%)',
        score: 50,
        description: 'Tune a lead vocal track using Cubase VariAudio and apply multi-band compression for dynamic consistency.',
        instructions: '1. Use VariAudio to fix pitch discrepancies on the vocal stem.\n2. Smooth out vibrato and transitions.\n3. Apply dynamic multi-band compression.\n4. Submit the tuned audio file.',
        attachments: [],
        submittedAt: 'Jul 07, 2024 09:15 PM',
        submittedFile: { name: 'VariAudio_VocalTuned_Final.wav', size: '12 MB' },
        feedback: 'Faultless vocal pitch correction. Extremely transparent pitch-shifts that do not sound robotic. Compression settings hold the performance in a tight dynamic window. Perfect score.'
      }
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
    status: 'enrolled',
    semester: 'Semester 5 — Fall 2024',
    attendanceRate: 100,
    currentGrade: 'A+',
    assignments: [
      {
        id: 'c1',
        title: 'Brand Identity & Digital Campaign Deck',
        dueDate: 'Tomorrow, 02:00 PM',
        points: 150,
        status: 'pending',
        description: 'Create a full visual identity and campaign deck for a sustainable consumer brand. Include logo options, color palettes, typography guidelines, and mock social ads.',
        instructions: '1. Build a vector brand kit in Illustrator.\n2. Compose a 10-slide strategy presentation (PDF).\n3. Showcase color codes (HEX/CMYK), logo applications, and target demographic details.',
        attachments: [
          { name: 'Brand Strategy Presentation Guide.pdf', size: '1.2 MB', type: 'PDF' }
        ]
      },
      {
        id: 'c2',
        title: 'Vector Typography & Poster Portfolio',
        dueDate: 'Jul 28, 2024',
        points: 100,
        status: 'pending',
        description: 'Design a series of three visual posters featuring custom typography. Focus on hierarchy, readability, and modern graphic motifs.',
        instructions: '1. Develop your designs at A2 poster size.\n2. Use vector paths exclusively for type elements.\n3. Export as high-resolution print PDF.',
        attachments: []
      },
      {
        id: 'c3',
        title: 'Social Media Analytics & UI Mockup',
        dueDate: 'Jul 05, 2024',
        points: 80,
        status: 'graded',
        grade: 'A (96%)',
        score: 77,
        description: 'Construct a Figma UI mockup for a brand landing page and prepare a marketing forecast spreadsheet.',
        instructions: '1. Create a responsive landing page mockup in Figma.\n2. Document your layout grids and design system components.\n3. Submit your Figma workspace link and forecast PDF.',
        attachments: [],
        submittedAt: 'Jul 04, 2024 11:15 PM',
        submittedText: 'Designed page layouts for mobile and desktop viewports, set up global styles, and compiled campaign analytics forecast in the attached document.',
        feedback: 'Beautifully polished layouts. The typography scales correctly on mobile, and the components are extremely clean. Well done!'
      }
    ]
  }
];

/**
 * Curriculum definition for the student's program.
 * Courses are automatically assigned by the Registrar — students do NOT
 * manually register. This data represents the official program curriculum.
 */
export const programCurriculum = {
  program: 'Theatrical Art & Digital Media Production',
  currentSemester: 'Semester 5 — Fall 2024',
  semesters: [
    {
      id: 'sem1',
      label: 'Semester 1',
      status: 'completed' as const,
      courses: [
        { code: 'THEA101', title: 'Intro to Dramatic Arts', credits: 4 },
        { code: 'PHOTO101', title: 'Introduction to Photography', credits: 4 },
        { code: 'IT105', title: 'Web Technologies & Media Systems', credits: 4 },
        { code: 'ENG101', title: 'Academic Writing & Public Rhetoric', credits: 3 },
        { code: 'ART120', title: 'Visual Aesthetics & Art History', credits: 3 },
      ]
    },
    {
      id: 'sem5',
      label: 'Semester 5 — Fall 2024',
      status: 'current' as const,
      courses: [
        { code: 'FILM402', title: 'Advanced Digital Cinematography & Directing', credits: 4 },
        { code: 'AUDIO301', title: 'Cubase Audio Engineering & Music Production', credits: 4 },
        { code: 'DESN440', title: 'Graphic Design & Digital Marketing Strategy', credits: 4 },
      ]
    },
    {
      id: 'sem6',
      label: 'Semester 6 — Spring 2025',
      status: 'upcoming' as const,
      courses: [
        { code: 'FILM490', title: 'Senior Capstone Film Project', credits: 4 },
        { code: 'JOURN305', title: 'Digital Journalism & New Media Broadcast', credits: 3 },
        { code: 'HUM300', title: 'Creative Leadership Seminar', credits: 3 },
      ]
    }
  ]
};

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
