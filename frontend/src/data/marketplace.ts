/**
 * Harmony Learning Marketplace — Mock Data
 * All content is realistic and aligned with Harmony College programs.
 */

export type ResourceType = 'book' | 'video' | 'course' | 'resource' | 'bundle';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type Category =
  | 'Photography' | 'Videography' | 'Music Production' | 'Graphic Design'
  | 'Digital Marketing' | 'Filmmaking' | 'IT & Technology' | 'Languages'
  | 'Pharmacy & Health' | 'Journalism' | 'Vocal Arts' | 'Business';

export interface Review {
  id: string;
  reviewer: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  helpful: number;
}

export interface Book {
  id: string;
  type: 'book';
  title: string;
  author: string;
  publisher: string;
  category: Category;
  cover: string;
  description: string;
  longDescription: string;
  pages: number;
  language: string;
  publishedDate: string;
  isbn: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  isBestseller?: boolean;
  isNew?: boolean;
  isFree?: boolean;
  tableOfContents: string[];
  reviews: Review[];
  tags: string[];
}

export interface Video {
  id: string;
  type: 'video';
  title: string;
  instructor: string;
  instructorBio: string;
  instructorAvatar: string;
  category: Category;
  thumbnail: string;
  duration: string;
  description: string;
  longDescription: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  views: number;
  isBestseller?: boolean;
  isNew?: boolean;
  objectives: string[];
  reviews: Review[];
  tags: string[];
  episodes?: { id: string; title: string; duration: string }[];
}

export interface Course {
  id: string;
  type: 'course';
  title: string;
  instructor: string;
  instructorBio: string;
  instructorAvatar: string;
  category: Category;
  thumbnail: string;
  duration: string;
  difficulty: Difficulty;
  lessonsCount: number;
  studentsCount: number;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  isBestseller?: boolean;
  isNew?: boolean;
  hasCertificate: boolean;
  description: string;
  longDescription: string;
  curriculum: { section: string; lessons: { id: string; title: string; duration: string; preview: boolean }[] }[];
  requirements: string[];
  objectives: string[];
  reviews: Review[];
  tags: string[];
  faqs: { q: string; a: string }[];
}

export interface Resource {
  id: string;
  type: 'resource';
  title: string;
  author: string;
  category: Category;
  thumbnail: string;
  fileType: 'PDF' | 'ZIP' | 'PSD' | 'AI' | 'MP3';
  fileSize: string;
  description: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  isNew?: boolean;
  isFree?: boolean;
  tags: string[];
  reviews: Review[];
}

export interface Bundle {
  id: string;
  type: 'bundle';
  title: string;
  description: string;
  thumbnail: string;
  category: Category;
  items: { type: ResourceType; id: string; title: string }[];
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  savingsPct: number;
  rating: number;
  studentsCount: number;
  isPopular?: boolean;
}

export type MarketplaceItem = Book | Video | Course | Resource | Bundle;

// ── Shared mock reviews ───────────────────────────────────────────────────────
const REVIEWS_SET_A: Review[] = [
  { id: 'r1', reviewer: 'Meron A.', avatar: '/Meron.png', rating: 5, date: 'Jul 10, 2026', comment: 'Absolutely transformative. The depth of content exceeded my expectations completely.', helpful: 42 },
  { id: 'r2', reviewer: 'Natnael G.', avatar: '/natnael.png', rating: 5, date: 'Jun 22, 2026', comment: 'Professional quality content. I use this daily in my practice. Highly recommended.', helpful: 38 },
  { id: 'r3', reviewer: 'Tigist H.', avatar: '/tigist.png', rating: 4, date: 'Jun 5, 2026', comment: 'Very practical and well structured. Would love a follow-up advanced edition.', helpful: 29 },
];

const REVIEWS_SET_B: Review[] = [
  { id: 'r4', reviewer: 'Abebe K.', avatar: '/Meron.png', rating: 5, date: 'Jul 15, 2026', comment: 'Best resource I found for this topic. Clear, concise, professionally produced.', helpful: 55 },
  { id: 'r5', reviewer: 'Sara M.', avatar: '/tigist.png', rating: 4, date: 'Jul 1, 2026', comment: 'Excellent foundation material. Covered everything I needed to get started confidently.', helpful: 31 },
];

// ── BOOKS ─────────────────────────────────────────────────────────────────────
export const BOOKS: Book[] = [
  {
    id: 'bk-001',
    type: 'book',
    title: 'Mastering Photography: Light, Composition & Storytelling',
    author: 'Ato Biruk Tadesse',
    publisher: 'Harmony Press',
    category: 'Photography',
    cover: '/exhibition.png',
    description: 'A comprehensive guide to professional photography from exposure basics to editorial storytelling.',
    longDescription: 'This definitive guide covers the full photographic journey — from understanding light and mastering your camera settings, through composition theory, post-processing workflows, and building a professional portfolio that speaks for itself. Practical exercises accompany every chapter.',
    pages: 340,
    language: 'English',
    publishedDate: 'Jan 2026',
    isbn: '978-0-00-000001-0',
    price: 299,
    originalPrice: 450,
    rating: 4.8,
    reviewCount: 124,
    isBestseller: true,
    tableOfContents: ['1. Understanding Light', '2. Exposure Triangle', '3. Composition Principles', '4. Portrait Photography', '5. Landscape & Documentary', '6. Post-Processing in Lightroom', '7. Building Your Portfolio', '8. Commercial Photography'],
    reviews: REVIEWS_SET_A,
    tags: ['photography', 'composition', 'lightroom', 'portrait'],
  },
  {
    id: 'bk-002',
    type: 'book',
    title: 'Graphic Design Foundations: Principles & Practice',
    author: 'W/ro Hana Tesfaye',
    publisher: 'Harmony Press',
    category: 'Graphic Design',
    cover: '/research.png',
    description: 'Typography, colour theory, branding, and layout design for aspiring creative professionals.',
    longDescription: 'From the fundamentals of visual hierarchy to advanced branding systems, this book provides a complete roadmap for professional graphic designers working in agencies, freelance environments, and corporate settings across Ethiopia and beyond.',
    pages: 280,
    language: 'English',
    publishedDate: 'Mar 2026',
    isbn: '978-0-00-000002-7',
    price: 249,
    originalPrice: 380,
    rating: 4.7,
    reviewCount: 98,
    isNew: true,
    tableOfContents: ['1. Elements of Design', '2. Typography Mastery', '3. Colour Theory', '4. Layout & Grid Systems', '5. Brand Identity Design', '6. Digital & Print Production', '7. Portfolio Development'],
    reviews: REVIEWS_SET_B,
    tags: ['graphic design', 'typography', 'branding', 'layout'],
  },
  {
    id: 'bk-003',
    type: 'book',
    title: 'Music Production with Cubase: Complete Guide',
    author: 'Ato Dawit Bekele',
    publisher: 'Harmony Press',
    category: 'Music Production',
    cover: '/music.png',
    description: 'Professional beat-making, mixing, and mastering with Steinberg Cubase Pro.',
    longDescription: 'An exhaustive reference for music producers at every level. Covers the Cubase interface, MIDI programming, sound design, beat construction, professional mixing techniques, and mastering for streaming platforms including Spotify and Apple Music.',
    pages: 420,
    language: 'English',
    publishedDate: 'Feb 2026',
    isbn: '978-0-00-000003-4',
    price: 320,
    rating: 4.9,
    reviewCount: 156,
    isBestseller: true,
    tableOfContents: ['1. Cubase Interface Overview', '2. MIDI Programming', '3. Beat Construction', '4. Sound Design Fundamentals', '5. Mixing Principles', '6. Mastering for Streaming', '7. Advanced Production Techniques'],
    reviews: REVIEWS_SET_A,
    tags: ['cubase', 'music production', 'mixing', 'mastering'],
  },
  {
    id: 'bk-004',
    type: 'book',
    title: 'Digital Marketing Strategy: From Zero to Campaign',
    author: 'W/ro Hana Tesfaye',
    publisher: 'Harmony Press',
    category: 'Digital Marketing',
    cover: '/cafe.png',
    description: 'SEO, paid advertising, social media strategy, and analytics for modern marketers.',
    longDescription: 'A practical, data-driven approach to digital marketing covering organic growth, paid campaigns across Meta and Google platforms, email marketing automation, influencer strategy, and measuring ROI with Google Analytics 4.',
    pages: 310,
    language: 'English',
    publishedDate: 'Apr 2026',
    isbn: '978-0-00-000004-1',
    price: 279,
    originalPrice: 400,
    rating: 4.6,
    reviewCount: 87,
    isNew: true,
    tableOfContents: ['1. Digital Marketing Fundamentals', '2. SEO Strategy', '3. Google Ads Mastery', '4. Meta Advertising', '5. Email Marketing', '6. Social Media Strategy', '7. Analytics & Reporting'],
    reviews: REVIEWS_SET_B,
    tags: ['digital marketing', 'SEO', 'google ads', 'social media'],
  },
  {
    id: 'bk-005',
    type: 'book',
    title: 'Journalism & Media Writing: The Ethiopian Perspective',
    author: 'Ato Ermias Alemu',
    publisher: 'Harmony Press',
    category: 'Journalism',
    cover: '/athletics.png',
    description: 'News writing, broadcast journalism, and digital media for Ethiopian journalists.',
    longDescription: 'This authoritative guide covers the craft of journalism from newsgathering and interviews through editorial standards, broadcast scripting, investigative reporting, and navigating media ethics in the Ethiopian context.',
    pages: 295,
    language: 'English & Amharic',
    publishedDate: 'May 2026',
    isbn: '978-0-00-000005-8',
    price: 220,
    rating: 4.5,
    reviewCount: 63,
    isFree: false,
    tableOfContents: ['1. Principles of Journalism', '2. News Gathering', '3. Writing for Print', '4. Broadcast Scripting', '5. Digital Journalism', '6. Investigative Reporting', '7. Media Ethics in Ethiopia'],
    reviews: REVIEWS_SET_A,
    tags: ['journalism', 'media writing', 'broadcast', 'ethiopia'],
  },
  {
    id: 'bk-006',
    type: 'book',
    title: 'Pharmacy Practice: Drug Dispensing & Patient Care',
    author: 'Dr. Tigist Asnake',
    publisher: 'Harmony Press',
    category: 'Pharmacy & Health',
    cover: '/Botanical.png',
    description: 'Essential pharmacy reference covering drug interactions, dispensing, and patient counselling.',
    longDescription: 'A clinical reference combining pharmaceutical theory with practical dispensing workflows. Covers drug classifications, common interactions, patient counselling techniques, dosage calculations, and Ethiopian healthcare regulations.',
    pages: 380,
    language: 'English',
    publishedDate: 'Jan 2026',
    isbn: '978-0-00-000006-5',
    price: 350,
    originalPrice: 500,
    rating: 4.9,
    reviewCount: 201,
    isBestseller: true,
    tableOfContents: ['1. Pharmaceutical Sciences', '2. Drug Classification', '3. Dosage Calculations', '4. Dispensing Procedures', '5. Drug Interactions', '6. Patient Counselling', '7. Ethiopian Drug Regulations', '8. Clinical Practice Scenarios'],
    reviews: REVIEWS_SET_B,
    tags: ['pharmacy', 'drug dispensing', 'patient care', 'clinical'],
  },
];

// ── VIDEOS ────────────────────────────────────────────────────────────────────
export const VIDEOS: Video[] = [
  {
    id: 'vid-001',
    type: 'video',
    title: 'Professional Portrait Photography: Studio to Location',
    instructor: 'Ato Biruk Tadesse',
    instructorBio: 'MFA in Visual Communication · 12 years professional photographer',
    instructorAvatar: '/natnael.png',
    category: 'Photography',
    thumbnail: '/exhibition.png',
    duration: '4h 32m',
    description: 'Master portrait photography across studio and outdoor environments.',
    longDescription: 'A complete video course covering studio lighting setups, natural light portraits, environmental portraiture, posing techniques, and post-processing for consistent professional results.',
    price: 399,
    originalPrice: 599,
    rating: 4.9,
    reviewCount: 188,
    views: 12400,
    isBestseller: true,
    objectives: ['Master three-point lighting', 'Pose subjects confidently', 'Edit portraits in Lightroom', 'Build a portrait portfolio'],
    reviews: REVIEWS_SET_A,
    tags: ['portrait', 'studio', 'lightroom', 'lighting'],
    episodes: [
      { id: 'e1', title: 'Studio Lighting Fundamentals', duration: '45m' },
      { id: 'e2', title: 'Posing Techniques', duration: '38m' },
      { id: 'e3', title: 'Natural Light Portraits', duration: '42m' },
      { id: 'e4', title: 'Location Shooting', duration: '35m' },
      { id: 'e5', title: 'Post-Processing Workflow', duration: '52m' },
    ],
  },
  {
    id: 'vid-002',
    type: 'video',
    title: 'Cubase Pro: Beat Making Masterclass',
    instructor: 'Ato Dawit Bekele',
    instructorBio: 'Certified Audio Engineer · Music Producer with 8 years experience',
    instructorAvatar: '/Meron.png',
    category: 'Music Production',
    thumbnail: '/music.png',
    duration: '6h 15m',
    description: 'Complete beat-making workflow in Cubase Pro from scratch to release.',
    longDescription: 'Step-by-step production of professional-quality beats across multiple genres. Covers drum programming, bass lines, chord progressions, vocal chops, mixing, and mastering for streaming platforms.',
    price: 449,
    originalPrice: 700,
    rating: 4.8,
    reviewCount: 312,
    views: 18900,
    isBestseller: true,
    objectives: ['Build beats from scratch', 'Program realistic drums', 'Mix and master tracks', 'Export for streaming'],
    reviews: REVIEWS_SET_B,
    tags: ['cubase', 'beat making', 'music production', 'mixing'],
    episodes: [
      { id: 'e1', title: 'Project Setup & Templates', duration: '28m' },
      { id: 'e2', title: 'Drum Programming', duration: '55m' },
      { id: 'e3', title: 'Bass & Chord Progressions', duration: '62m' },
      { id: 'e4', title: 'Arrangement & Structure', duration: '48m' },
      { id: 'e5', title: 'Mixing Essentials', duration: '72m' },
      { id: 'e6', title: 'Mastering for Streaming', duration: '50m' },
    ],
  },
  {
    id: 'vid-003',
    type: 'video',
    title: 'Graphic Design in Adobe Illustrator: Brand Identity',
    instructor: 'W/ro Hana Tesfaye',
    instructorBio: 'BSc Graphic Communication · Creative Director at Addis agency',
    instructorAvatar: '/tigist.png',
    category: 'Graphic Design',
    thumbnail: '/research.png',
    duration: '5h 20m',
    description: 'Build complete brand identity systems using Adobe Illustrator.',
    longDescription: 'From logo design concepts through full brand identity system creation. Covers Illustrator tools, brand guidelines, business card design, social media templates, and client presentation.',
    price: 379,
    originalPrice: 550,
    rating: 4.7,
    reviewCount: 245,
    views: 14700,
    isNew: true,
    objectives: ['Design professional logos', 'Build brand guidelines', 'Create stationery systems', 'Present to clients'],
    reviews: REVIEWS_SET_A,
    tags: ['illustrator', 'logo design', 'branding', 'identity'],
    episodes: [
      { id: 'e1', title: 'Illustrator Fundamentals', duration: '40m' },
      { id: 'e2', title: 'Logo Design Process', duration: '65m' },
      { id: 'e3', title: 'Typography Systems', duration: '45m' },
      { id: 'e4', title: 'Colour Palette & Brand Guidelines', duration: '38m' },
      { id: 'e5', title: 'Stationery & Applications', duration: '52m' },
    ],
  },
  {
    id: 'vid-004',
    type: 'video',
    title: 'Short Film Production: From Script to Screen',
    instructor: 'W/ro Selamawit Girma',
    instructorBio: 'MA Dramatic Arts · Award-winning filmmaker',
    instructorAvatar: '/Meron.png',
    category: 'Filmmaking',
    thumbnail: '/athletics.png',
    duration: '7h 45m',
    description: 'Complete short film production pipeline from screenplay to final cut.',
    longDescription: 'A master course covering screenwriting, pre-production planning, on-set direction, cinematography, sound recording, and post-production editing. Every lesson includes behind-the-scenes footage from real productions.',
    price: 499,
    originalPrice: 750,
    rating: 4.8,
    reviewCount: 178,
    views: 9800,
    isBestseller: true,
    objectives: ['Write a compelling short film script', 'Plan and manage a production', 'Direct actors and crew', 'Edit and deliver a finished film'],
    reviews: REVIEWS_SET_B,
    tags: ['filmmaking', 'screenwriting', 'directing', 'editing'],
    episodes: [
      { id: 'e1', title: 'Screenplay Writing', duration: '58m' },
      { id: 'e2', title: 'Pre-Production & Planning', duration: '45m' },
      { id: 'e3', title: 'Cinematography Essentials', duration: '62m' },
      { id: 'e4', title: 'Directing Actors', duration: '50m' },
      { id: 'e5', title: 'Sound Design', duration: '42m' },
      { id: 'e6', title: 'Editing in Premiere Pro', duration: '68m' },
      { id: 'e7', title: 'Color Grading & Delivery', duration: '40m' },
    ],
  },
];

// ── COURSES ───────────────────────────────────────────────────────────────────
export const COURSES: Course[] = [
  {
    id: 'crs-001',
    type: 'course',
    title: 'Professional Photography: Complete Diploma Prep',
    instructor: 'Ato Biruk Tadesse',
    instructorBio: 'MFA in Visual Communication · 12 years professional photographer · Harmony College Dept Head',
    instructorAvatar: '/natnael.png',
    category: 'Photography',
    thumbnail: '/exhibition.png',
    duration: '40 hours',
    difficulty: 'Beginner',
    lessonsCount: 68,
    studentsCount: 1240,
    price: 799,
    originalPrice: 1200,
    rating: 4.9,
    reviewCount: 342,
    isBestseller: true,
    hasCertificate: true,
    description: 'The complete photography course — from DSLR fundamentals to professional commercial work.',
    longDescription: 'This flagship course mirrors the Harmony College Photography Diploma curriculum. You will progress from camera fundamentals through advanced studio work, commercial photography, and portfolio development with personalised feedback on every major assignment.',
    curriculum: [
      { section: 'Module 1: Camera & Exposure Fundamentals', lessons: [
        { id: 'l1', title: 'Understanding Your DSLR/Mirrorless Camera', duration: '22m', preview: true },
        { id: 'l2', title: 'Exposure Triangle: ISO, Aperture, Shutter', duration: '28m', preview: true },
        { id: 'l3', title: 'Metering Modes & Histograms', duration: '18m', preview: false },
        { id: 'l4', title: 'White Balance & Colour', duration: '15m', preview: false },
      ]},
      { section: 'Module 2: Composition & Vision', lessons: [
        { id: 'l5', title: 'Rule of Thirds & Beyond', duration: '20m', preview: false },
        { id: 'l6', title: 'Leading Lines & Framing', duration: '18m', preview: false },
        { id: 'l7', title: 'Depth of Field Artistry', duration: '25m', preview: false },
      ]},
      { section: 'Module 3: Lighting Mastery', lessons: [
        { id: 'l8', title: 'Natural Light: Golden Hour to Overcast', duration: '32m', preview: false },
        { id: 'l9', title: 'Studio Strobe & Continuous Lighting', duration: '45m', preview: false },
        { id: 'l10', title: 'Three-Point Lighting Setup', duration: '38m', preview: false },
      ]},
    ],
    requirements: ['A DSLR or mirrorless camera', 'Adobe Lightroom (trial available)', 'Basic computer skills'],
    objectives: ['Master exposure control', 'Compose professional images', 'Light any subject', 'Edit in Lightroom', 'Build a professional portfolio', 'Work with commercial clients'],
    reviews: REVIEWS_SET_A,
    tags: ['photography', 'DSLR', 'lightroom', 'studio', 'commercial'],
    faqs: [
      { q: 'Do I need an expensive camera?', a: 'Any DSLR or mirrorless camera will work. Even a mid-range smartphone can be used for early exercises.' },
      { q: 'Is a certificate included?', a: 'Yes. A Harmony College certificate of completion is awarded upon finishing all modules and assignments.' },
      { q: 'How long do I have access?', a: 'Lifetime access once purchased.' },
    ],
  },
  {
    id: 'crs-002',
    type: 'course',
    title: 'Cubase Music Production: Diploma Preparation',
    instructor: 'Ato Dawit Bekele',
    instructorBio: 'Certified Audio Engineer · 8 years studio production · Harmony College Music Production Lead',
    instructorAvatar: '/Meron.png',
    category: 'Music Production',
    thumbnail: '/music.png',
    duration: '55 hours',
    difficulty: 'Intermediate',
    lessonsCount: 92,
    studentsCount: 980,
    price: 899,
    originalPrice: 1400,
    rating: 4.8,
    reviewCount: 287,
    isBestseller: true,
    hasCertificate: true,
    description: 'Full music production course from arrangement to release-ready master.',
    longDescription: 'This course covers the complete Cubase production workflow — from initial track setup through composition, arrangement, recording, mixing, and mastering. Professional templates and sample packs included.',
    curriculum: [
      { section: 'Module 1: Cubase Pro Setup', lessons: [
        { id: 'l1', title: 'Interface Overview & Key Commands', duration: '30m', preview: true },
        { id: 'l2', title: 'Project Setup & Audio Configuration', duration: '25m', preview: true },
        { id: 'l3', title: 'VST Instruments & Plugin Management', duration: '28m', preview: false },
      ]},
      { section: 'Module 2: Beat & Composition', lessons: [
        { id: 'l4', title: 'Drum Programming: Pattern to Groove', duration: '45m', preview: false },
        { id: 'l5', title: 'Bass Lines & Chord Progressions', duration: '52m', preview: false },
        { id: 'l6', title: 'Melody Writing & Motifs', duration: '38m', preview: false },
      ]},
      { section: 'Module 3: Mixing & Mastering', lessons: [
        { id: 'l7', title: 'Gain Staging & Headroom', duration: '22m', preview: false },
        { id: 'l8', title: 'EQ, Compression & Dynamics', duration: '55m', preview: false },
        { id: 'l9', title: 'Reverb, Delay & Space', duration: '42m', preview: false },
        { id: 'l10', title: 'Mastering for Spotify & Apple Music', duration: '35m', preview: false },
      ]},
    ],
    requirements: ['Steinberg Cubase Pro (trial available)', 'Audio interface recommended', 'Headphones or studio monitors'],
    objectives: ['Produce professional-quality beats', 'Mix and master tracks', 'Use VST instruments fluently', 'Export release-ready audio', 'Earn Harmony College Certificate'],
    reviews: REVIEWS_SET_B,
    tags: ['cubase', 'music production', 'mixing', 'mastering', 'beats'],
    faqs: [
      { q: 'Which version of Cubase do I need?', a: 'Cubase Pro 12 or newer is recommended. The free trial covers all course exercises.' },
      { q: 'Are sample packs included?', a: 'Yes. A custom Harmony College sample pack with 500+ sounds is included.' },
    ],
  },
  {
    id: 'crs-003',
    type: 'course',
    title: 'Graphic Design: Brand Identity & Digital Design',
    instructor: 'W/ro Hana Tesfaye',
    instructorBio: 'BSc Graphic Communication · Creative Director · 10 years agency experience',
    instructorAvatar: '/tigist.png',
    category: 'Graphic Design',
    thumbnail: '/research.png',
    duration: '35 hours',
    difficulty: 'Beginner',
    lessonsCount: 58,
    studentsCount: 1560,
    price: 749,
    originalPrice: 1100,
    rating: 4.7,
    reviewCount: 412,
    isBestseller: true,
    hasCertificate: true,
    description: 'Complete brand identity design using Adobe Illustrator and Photoshop.',
    longDescription: 'Build complete brand identity systems from concept to delivery. Every lesson is project-based with real client briefs from Ethiopian businesses. Covers logo design, typography, colour systems, brand guidelines, and digital production.',
    curriculum: [
      { section: 'Module 1: Design Foundations', lessons: [
        { id: 'l1', title: 'Elements & Principles of Design', duration: '25m', preview: true },
        { id: 'l2', title: 'Typography Systems', duration: '32m', preview: true },
        { id: 'l3', title: 'Colour Theory & Application', duration: '28m', preview: false },
      ]},
      { section: 'Module 2: Logo & Brand Design', lessons: [
        { id: 'l4', title: 'Logo Design Process & Concepts', duration: '45m', preview: false },
        { id: 'l5', title: 'Vector Mastery in Illustrator', duration: '52m', preview: false },
        { id: 'l6', title: 'Brand Guidelines Document', duration: '38m', preview: false },
      ]},
    ],
    requirements: ['Adobe Illustrator & Photoshop (trial available)', 'Basic computer skills', 'A sketchbook for ideation exercises'],
    objectives: ['Design professional logos', 'Create complete brand systems', 'Build a design portfolio', 'Work with real client briefs'],
    reviews: REVIEWS_SET_A,
    tags: ['graphic design', 'illustrator', 'branding', 'typography'],
    faqs: [
      { q: 'Do I need design experience?', a: 'No prior experience needed. The course starts from absolute fundamentals.' },
      { q: 'Will I have a portfolio after the course?', a: 'Yes — you will complete 5 real brand identity projects during the course.' },
    ],
  },
];

// ── RESOURCES ─────────────────────────────────────────────────────────────────
export const RESOURCES: Resource[] = [
  {
    id: 'res-001', type: 'resource', title: '100 Lightroom Presets — Portrait & Landscape',
    author: 'Ato Biruk Tadesse', category: 'Photography', thumbnail: '/exhibition.png',
    fileType: 'ZIP', fileSize: '45 MB',
    description: 'Professional Lightroom presets optimised for Ethiopian light conditions.',
    price: 149, originalPrice: 250, rating: 4.8, reviewCount: 89, downloadCount: 1240,
    isNew: false, tags: ['lightroom', 'presets', 'photography'], reviews: REVIEWS_SET_A,
  },
  {
    id: 'res-002', type: 'resource', title: 'Brand Identity Starter Kit — Illustrator Templates',
    author: 'W/ro Hana Tesfaye', category: 'Graphic Design', thumbnail: '/research.png',
    fileType: 'AI', fileSize: '28 MB',
    description: '15 professional AI templates for logos, business cards, and brand guidelines.',
    price: 199, originalPrice: 320, rating: 4.7, reviewCount: 134, downloadCount: 980,
    isNew: true, tags: ['illustrator', 'templates', 'branding'], reviews: REVIEWS_SET_B,
  },
  {
    id: 'res-003', type: 'resource', title: 'Cubase Project Templates: 10 Genre Starters',
    author: 'Ato Dawit Bekele', category: 'Music Production', thumbnail: '/music.png',
    fileType: 'ZIP', fileSize: '320 MB',
    description: '10 professional Cubase project templates across Afrobeats, Gospel, Pop, and Electronic genres.',
    price: 249, rating: 4.9, reviewCount: 201, downloadCount: 2100,
    isFree: false, tags: ['cubase', 'templates', 'beats'], reviews: REVIEWS_SET_A,
  },
  {
    id: 'res-004', type: 'resource', title: 'Digital Marketing Campaign Planner',
    author: 'W/ro Hana Tesfaye', category: 'Digital Marketing', thumbnail: '/cafe.png',
    fileType: 'PDF', fileSize: '8 MB',
    description: 'Complete campaign planning workbook with templates, KPI trackers, and reporting frameworks.',
    price: 99, originalPrice: 150, rating: 4.5, reviewCount: 67, downloadCount: 845,
    isNew: true, isFree: false, tags: ['marketing', 'planning', 'templates'], reviews: REVIEWS_SET_B,
  },
  {
    id: 'res-005', type: 'resource', title: 'Pharmacy Quick Reference Guide 2026',
    author: 'Dr. Tigist Asnake', category: 'Pharmacy & Health', thumbnail: '/Botanical.png',
    fileType: 'PDF', fileSize: '12 MB',
    description: 'Pocket reference for drug dosages, interactions, and Ethiopian drug formulary.',
    price: 0, rating: 4.6, reviewCount: 312, downloadCount: 4200,
    isFree: true, tags: ['pharmacy', 'drugs', 'reference'], reviews: REVIEWS_SET_A,
  },
];

// ── BUNDLES ───────────────────────────────────────────────────────────────────
export const BUNDLES: Bundle[] = [
  {
    id: 'bndl-001', type: 'bundle',
    title: 'Photography Mastery Bundle',
    description: 'Everything you need to become a professional photographer — the book, the course, and 100 Lightroom presets.',
    thumbnail: '/exhibition.png',
    category: 'Photography',
    items: [
      { type: 'book', id: 'bk-001', title: 'Mastering Photography' },
      { type: 'course', id: 'crs-001', title: 'Professional Photography: Complete Diploma Prep' },
      { type: 'resource', id: 'res-001', title: '100 Lightroom Presets' },
    ],
    originalPrice: 1247, bundlePrice: 849, savings: 398, savingsPct: 32,
    rating: 4.9, studentsCount: 580, isPopular: true,
  },
  {
    id: 'bndl-002', type: 'bundle',
    title: 'Music Production Bundle',
    description: 'The complete music production stack — textbook, course, and 10 professional project templates.',
    thumbnail: '/music.png',
    category: 'Music Production',
    items: [
      { type: 'book', id: 'bk-003', title: 'Music Production with Cubase' },
      { type: 'video', id: 'vid-002', title: 'Cubase Pro: Beat Making Masterclass' },
      { type: 'course', id: 'crs-002', title: 'Cubase Music Production: Diploma Prep' },
      { type: 'resource', id: 'res-003', title: 'Cubase Project Templates' },
    ],
    originalPrice: 1917, bundlePrice: 1199, savings: 718, savingsPct: 37,
    rating: 4.8, studentsCount: 420, isPopular: true,
  },
  {
    id: 'bndl-003', type: 'bundle',
    title: 'Creative Design Bundle',
    description: 'Master graphic design with the complete book, video course, and professional Illustrator template pack.',
    thumbnail: '/research.png',
    category: 'Graphic Design',
    items: [
      { type: 'book', id: 'bk-002', title: 'Graphic Design Foundations' },
      { type: 'video', id: 'vid-003', title: 'Graphic Design in Adobe Illustrator' },
      { type: 'course', id: 'crs-003', title: 'Graphic Design: Brand Identity & Digital Design' },
      { type: 'resource', id: 'res-002', title: 'Brand Identity Starter Kit' },
    ],
    originalPrice: 1576, bundlePrice: 999, savings: 577, savingsPct: 37,
    rating: 4.7, studentsCount: 340,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
export const ALL_ITEMS: MarketplaceItem[] = [
  ...BOOKS, ...VIDEOS, ...COURSES, ...RESOURCES, ...BUNDLES,
];

export const CATEGORIES: Category[] = [
  'Photography', 'Videography', 'Music Production', 'Graphic Design',
  'Digital Marketing', 'Filmmaking', 'IT & Technology', 'Languages',
  'Pharmacy & Health', 'Journalism', 'Vocal Arts', 'Business',
];

export const FEATURED_IDS = ['crs-001', 'crs-002', 'bndl-001', 'vid-001', 'bk-003'];
export const BESTSELLER_IDS = ['bk-001', 'bk-003', 'bk-006', 'vid-001', 'vid-002', 'crs-001'];
export const NEW_RELEASE_IDS = ['bk-002', 'bk-004', 'vid-003', 'res-002', 'res-004'];

// ── Mock purchased/library items (initially empty — added via cart) ────────────
export const INITIAL_LIBRARY: string[] = [];
export const INITIAL_WISHLIST: string[] = [];
