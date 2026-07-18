import { School } from '../types';

export const schoolsData: School[] = [
  {
    id: 'visual-arts',
    name: 'Visual Arts & Photography',
    icon: 'Camera',
    description: 'Master the art of capturing moments through professional photography, videography, and visual storytelling.',
    longDescription: 'The Department of Visual Arts & Photography at Harmony College equips students with professional-grade skills in still photography and videography. From studio lighting and composition to post-production editing, students graduate ready for careers in commercial photography, documentary filmmaking, content creation, and broadcast media. Our studios feature industry-standard cameras, lighting rigs, and fully equipped editing suites.',
    dean: 'Ato Biruk Tadesse, MFA in Visual Communication',
    tuitionPerCredit: 850,
    degrees: [
      { name: 'Diploma in Professional Photography', level: 'Undergraduate', duration: '1 Year' },
      { name: 'Diploma in Videography & Content Production', level: 'Undergraduate', duration: '1 Year' },
      { name: 'Advanced Certificate in Commercial Photography', level: 'Graduate', duration: '6 Months' },
    ],
    labs: [
      { name: 'Harmony Photo & Video Studio', focus: 'Professional lighting setups, backdrops, and camera gear for live shoots.' },
      { name: 'Post-Production Editing Suite', focus: 'Adobe Premiere, Lightroom, and DaVinci Resolve workstations.' },
    ],
    requirements: [
      'High school completion certificate or equivalent',
      'Personal portfolio or sample work (optional for beginners)',
      'Passion for visual storytelling and creative arts',
    ],
  },
  {
    id: 'performing-arts',
    name: 'Theatrical Art & Filmmaking',
    icon: 'Film',
    description: 'Develop your voice on stage and behind the camera — from acting and directing to full film production.',
    longDescription: 'Harmony College\'s Theatrical Arts & Filmmaking program bridges the worlds of live performance and cinematic storytelling. Students learn acting fundamentals, stage direction, scriptwriting, and the full pipeline of independent film production. Our black-box theatre and on-location shoots give every student real performance and production experience from day one.',
    dean: 'W/ro Selamawit Girma, MA in Dramatic Arts',
    tuitionPerCredit: 900,
    degrees: [
      { name: 'Diploma in Theatrical Performance & Direction', level: 'Undergraduate', duration: '1 Year' },
      { name: 'Diploma in Independent Filmmaking', level: 'Undergraduate', duration: '1 Year' },
      { name: 'Advanced Certificate in Screenwriting & Film Direction', level: 'Graduate', duration: '6 Months' },
    ],
    labs: [
      { name: 'Harmony Black-Box Theatre', focus: 'Live stage performances, rehearsals, and audience productions.' },
      { name: 'Film Production Workshop', focus: 'Scriptwriting, directing, cinematography, and post-production for short films.' },
    ],
    requirements: [
      'High school completion certificate or equivalent',
      'Audition or creative writing sample (encouraged)',
      'Interest in performance, direction, or cinematic arts',
    ],
  },
  {
    id: 'music',
    name: 'Music Instruments & Vocal',
    icon: 'Music',
    description: 'Train with professional musicians across a wide range of instruments and develop your vocal artistry.',
    longDescription: 'The Music Department at Harmony College offers hands-on training in a variety of instruments including guitar, keyboard, bass, drums, and traditional Ethiopian instruments, alongside dedicated vocal coaching. Students receive one-on-one instruction, participate in ensemble rehearsals, and perform at college showcases and community events throughout the year.',
    dean: 'Ato Yonas Haile, BMus in Performance & Composition',
    tuitionPerCredit: 800,
    degrees: [
      { name: 'Diploma in Instrumental Performance', level: 'Undergraduate', duration: '1 Year' },
      { name: 'Diploma in Vocal Arts & Singing', level: 'Undergraduate', duration: '1 Year' },
      { name: 'Certificate in Music Theory & Composition', level: 'Undergraduate', duration: '6 Months' },
    ],
    labs: [
      { name: 'Harmony Music Practice Rooms', focus: 'Soundproofed individual and ensemble practice spaces with instruments.' },
      { name: 'Live Performance Stage', focus: 'Regular showcases, recitals, and community concert events.' },
    ],
    requirements: [
      'High school completion certificate or equivalent',
      'Basic musical interest or prior instrument exposure welcome',
      'Audition for advanced vocal or instrumental tracks',
    ],
  },
  {
    id: 'production',
    name: 'Cubase & Music Production',
    icon: 'Headphones',
    description: 'Learn professional music production, beat-making, mixing, and mastering using industry-standard Cubase software.',
    longDescription: 'Harmony College\'s Cubase & Music Production program trains students to produce, mix, and master professional-quality audio. Working exclusively in Steinberg Cubase, students learn MIDI programming, sound design, beat construction, vocal processing, and final mastering for streaming and broadcast. This program is ideal for aspiring music producers, beatmakers, and audio engineers.',
    dean: 'Ato Dawit Bekele, Cert. in Audio Engineering & Music Production',
    tuitionPerCredit: 870,
    degrees: [
      { name: 'Diploma in Music Production with Cubase', level: 'Undergraduate', duration: '1 Year' },
      { name: 'Certificate in Beat Making & Sound Design', level: 'Undergraduate', duration: '6 Months' },
      { name: 'Advanced Certificate in Mixing & Mastering', level: 'Graduate', duration: '6 Months' },
    ],
    labs: [
      { name: 'Digital Audio Workstation Lab', focus: 'Cubase-equipped workstations with studio monitors, MIDI controllers, and audio interfaces.' },
      { name: 'Harmony Recording Studio', focus: 'Professional vocal booth and live instrument recording for student productions.' },
    ],
    requirements: [
      'High school completion certificate or equivalent',
      'Basic computer literacy',
      'Interest in music creation, production, or audio engineering',
    ],
  },
  {
    id: 'design-marketing',
    name: 'Graphic Design & Digital Marketing',
    icon: 'Palette',
    description: 'Build a career in creative design and digital marketing — from brand identity to social media campaigns.',
    longDescription: 'Harmony College\'s Graphic Design & Digital Marketing department prepares students for Ethiopia\'s fast-growing creative economy. Students learn brand design, typography, illustration, and UI/UX principles using Adobe Creative Suite, while the digital marketing track covers SEO, social media strategy, content marketing, Google Ads, and analytics. Graduates are equipped to work at agencies, startups, or as independent freelancers.',
    dean: 'W/ro Hana Tesfaye, BSc in Graphic Communication & Marketing',
    tuitionPerCredit: 820,
    degrees: [
      { name: 'Diploma in Graphic Design', level: 'Undergraduate', duration: '1 Year' },
      { name: 'Diploma in Digital Marketing', level: 'Undergraduate', duration: '1 Year' },
      { name: 'Advanced Certificate in Brand Strategy & Social Media', level: 'Graduate', duration: '6 Months' },
    ],
    labs: [
      { name: 'Creative Design Studio', focus: 'Adobe Photoshop, Illustrator, and InDesign workstations for design projects.' },
      { name: 'Digital Marketing Simulation Lab', focus: 'Live campaign management using Google Ads, Meta Ads Manager, and analytics tools.' },
    ],
    requirements: [
      'High school completion certificate or equivalent',
      'Creative portfolio or interest in visual communication',
      'Basic computer skills',
    ],
  },
  {
    id: 'media-it',
    name: 'Journalism, IT & Languages',
    icon: 'Globe',
    description: 'Develop skills in media reporting, information technology, and multilingual communication for today\'s connected world.',
    longDescription: 'Harmony College\'s Journalism, IT & Languages department prepares students across three vital disciplines. The Journalism track trains students in news writing, broadcast reporting, and digital media. The IT track covers networking, computer hardware, and software fundamentals. The Languages track offers instruction in English, French, and Arabic, equipping students with professional language proficiency for global careers and further education.',
    dean: 'Ato Ermias Alemu, MA in Journalism & Media Studies',
    tuitionPerCredit: 780,
    degrees: [
      { name: 'Diploma in Journalism & Media Reporting', level: 'Undergraduate', duration: '1 Year' },
      { name: 'Diploma in Information Technology (IT)', level: 'Undergraduate', duration: '1 Year' },
      { name: 'Certificate in Professional Languages (English / French / Arabic)', level: 'Undergraduate', duration: '6 Months' },
    ],
    labs: [
      { name: 'Harmony Media & Broadcast Studio', focus: 'Radio-style recording booth, camera setup, and newsroom simulation for journalism students.' },
      { name: 'IT & Networking Lab', focus: 'Hardware, software, and networking equipment for hands-on IT training.' },
    ],
    requirements: [
      'High school completion certificate or equivalent',
      'Strong interest in communication, technology, or languages',
      'Basic English literacy (for language track applicants)',
    ],
  },
];
