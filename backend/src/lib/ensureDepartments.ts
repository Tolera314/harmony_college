import { prisma } from './prisma';
import { ProgramType, CourseStatus, OfferingStatus } from '@prisma/client';

export const REAL_DEPARTMENTS = [
  { name: 'Photography & Videography', tvetCode: 'PHOTO-T', spCode: 'PHOTO-SP', description: 'Photography, Videography & Visual Storytelling' },
  { name: 'Theatrical Art & Filmmaking', tvetCode: 'FILM-T', spCode: 'FILM-SP', description: 'Theatre, Acting, Directing & Filmmaking' },
  { name: 'Music Instruments & Vocal', tvetCode: 'MUS-T', spCode: 'MUS-SP', description: 'Instrumental Performance & Vocal Arts' },
  { name: 'Cubase Music Production', tvetCode: 'CUB-T', spCode: 'CUB-SP', description: 'Digital Audio Workstation & Music Production' },
  { name: 'Graphic Design', tvetCode: 'DES-T', spCode: 'DES-SP', description: 'Visual Identity, Typography & Digital Design' },
  { name: 'Digital Marketing', tvetCode: 'DMKT-T', spCode: 'DMKT-SP', description: 'Social Media, Brand Strategy & Digital Marketing' },
  { name: 'Journalism', tvetCode: 'JOUR-T', spCode: 'JOUR-SP', description: 'News Reporting, Broadcast & Investigative Journalism' },
  { name: 'Information Technology (IT)', tvetCode: 'IT-T', spCode: 'IT-SP', description: 'IT, Networking, Software & Digital Systems' },
  { name: 'Languages', tvetCode: 'LANG-T', spCode: 'LANG-SP', description: 'International Languages, Translation & Communication' },
  { name: 'Pharmacy', tvetCode: 'PHARM-T', spCode: 'PHARM-SP', description: 'Pharmaceutical Sciences, Drug Dispensing & Clinical Practice' },
];

export const DEPARTMENT_COURSES: Record<string, {
  tvet: { code: string; name: string; credits: number; description: string }[];
  sp: { code: string; name: string; credits: number; description: string }[];
}> = {
  'Photography & Videography': {
    tvet: [
      { code: 'PHOTO-101', name: 'Fundamentals of Photography & Composition', credits: 3, description: 'Camera controls, exposure triangle, and visual composition.' },
      { code: 'PHOTO-102', name: 'Digital Videography & Cinematography', credits: 3, description: 'Motion picture camera techniques, framing, and movement.' },
      { code: 'PHOTO-103', name: 'Studio Lighting & Color Grading', credits: 3, description: 'Professional three-point lighting and post-color grading.' },
    ],
    sp: [
      { code: 'SP-PHOTO-101', name: 'Intensive Practical Photography', credits: 2, description: 'Hands-on practical shooting and photo processing.' },
      { code: 'SP-PHOTO-102', name: 'Commercial Video & Drone Operations', credits: 2, description: 'Short-form promotional video and aerial capture.' },
    ],
  },
  'Theatrical Art & Filmmaking': {
    tvet: [
      { code: 'FILM-101', name: 'Acting Fundamentals & Stage Performance', credits: 3, description: 'Characterization, voice projection, and stage movement.' },
      { code: 'FILM-102', name: 'Screenwriting & Directing Essentials', credits: 3, description: 'Narrative script structure and director-actor dynamics.' },
      { code: 'FILM-103', name: 'Film Production & Video Editing', credits: 3, description: 'Premiere Pro and DaVinci Resolve editing workflows.' },
    ],
    sp: [
      { code: 'SP-FILM-101', name: 'Screen Acting & Audition Masterclass', credits: 2, description: 'On-camera technique, audition preparation, and scene work.' },
      { code: 'SP-FILM-102', name: 'Short Film Directing & Smartphone Cinema', credits: 2, description: 'Fast-paced storytelling and mobile filmmaking.' },
    ],
  },
  'Music Instruments & Vocal': {
    tvet: [
      { code: 'MUS-101', name: 'Piano & Keyboard Performance I', credits: 3, description: 'Scales, chord progressions, and keyboard performance.' },
      { code: 'MUS-102', name: 'Acoustic & Electric Guitar Technique', credits: 3, description: 'Fretboard harmony, rhythm playing, and lead improvisation.' },
      { code: 'MUS-103', name: 'Vocal Techniques & Solfège', credits: 3, description: 'Breath support, pitch accuracy, ear training, and performance.' },
    ],
    sp: [
      { code: 'SP-MUS-101', name: 'Express Keyboard & Vocal Coaching', credits: 2, description: 'Intensive keyboard fundamentals and vocal pitch practice.' },
      { code: 'SP-MUS-102', name: 'Guitar Fundamentals & Chord Mastery', credits: 2, description: 'Essential chord patterns and strumming rhythms.' },
    ],
  },
  'Cubase Music Production': {
    tvet: [
      { code: 'CUB-101', name: 'Cubase DAW Mastery & MIDI Sequencing', credits: 3, description: 'Digital audio workstation navigation, virtual instruments, and MIDI.' },
      { code: 'CUB-102', name: 'Synthesis, Sampling & Sound Design', credits: 3, description: 'Synthesizers, sampler instruments, and custom sonic textures.' },
      { code: 'CUB-103', name: 'Audio Mixing, EQ & Mastering Techniques', credits: 3, description: 'Dynamic processors, spatial effects, and final mastering.' },
    ],
    sp: [
      { code: 'SP-CUB-101', name: 'Beatmaking & Modern Music Production', credits: 2, description: 'Creating beats, basslines, and loops in Cubase.' },
      { code: 'SP-CUB-102', name: 'Vocal Recording & Auto-Tune/Pitch Correction', credits: 2, description: 'Studio vocal tracking, Melodyne, and clean vocal mixes.' },
    ],
  },
  'Graphic Design': {
    tvet: [
      { code: 'DES-101', name: 'Adobe Photoshop & Digital Retouching', credits: 3, description: 'Layer workflows, masking, and high-end image manipulation.' },
      { code: 'DES-102', name: 'Adobe Illustrator & Vector Illustration', credits: 3, description: 'Vector graphics, typography, icon sets, and illustrations.' },
      { code: 'DES-103', name: 'Brand Identity & Print Design', credits: 3, description: 'Logos, style guides, prepress setup, and commercial packaging.' },
    ],
    sp: [
      { code: 'SP-DES-101', name: 'Social Media Graphics & Canva/Photoshop Express', credits: 2, description: 'Fast creative generation for social media and web banners.' },
      { code: 'SP-DES-102', name: 'Logo Design & Visual Branding Essentials', credits: 2, description: 'Typography rules, color theory, and logo creation.' },
    ],
  },
  'Digital Marketing': {
    tvet: [
      { code: 'DMKT-101', name: 'Social Media Strategy & Content Creation', credits: 3, description: 'Platform algorithms, content calendars, and engagement growth.' },
      { code: 'DMKT-102', name: 'Search Engine Optimization (SEO) & Analytics', credits: 3, description: 'On-page SEO, keyword research, and Google Analytics 4.' },
      { code: 'DMKT-103', name: 'Paid Advertising (Meta & Google Ads)', credits: 3, description: 'Ad copy, targeting parameters, pixel setup, and conversion tracking.' },
    ],
    sp: [
      { code: 'SP-DMKT-101', name: 'Viral Content Strategy & TikTok/Reels Growth', credits: 2, description: 'Short-form hooks, trending sounds, and organic reach.' },
      { code: 'SP-DMKT-102', name: 'Facebook & Instagram Paid Ads Bootcamp', credits: 2, description: 'Setting up profitable sponsored ads on Meta Business Manager.' },
    ],
  },
  'Journalism': {
    tvet: [
      { code: 'JOUR-101', name: 'News Writing & Investigative Reporting', credits: 3, description: 'Inverted pyramid style, fact-checking, and investigative interviews.' },
      { code: 'JOUR-102', name: 'Broadcast Journalism & Television Hosting', credits: 3, description: 'Teleprompter reading, news presentation, and live broadcast.' },
      { code: 'JOUR-103', name: 'Media Law, Ethics & Public Relations', credits: 3, description: 'Defamation law, journalist codes of ethics, and PR writing.' },
    ],
    sp: [
      { code: 'SP-JOUR-101', name: 'Mobile Journalism (MoJo) & Podcasting', credits: 2, description: 'Field reporting with smartphone kits and audio recording.' },
      { code: 'SP-JOUR-102', name: 'Interviewing Skills & Public Speaking', credits: 2, description: 'Asking tough questions and commanding the audience.' },
    ],
  },
  'Information Technology (IT)': {
    tvet: [
      { code: 'IT-101', name: 'Computer Hardware & Network Engineering', credits: 3, description: 'PC assembly, cabling, TCP/IP, routers, and switches.' },
      { code: 'IT-102', name: 'Full-Stack Web Development', credits: 3, description: 'HTML5, CSS3, modern JavaScript, and React fundamentals.' },
      { code: 'IT-103', name: 'Relational Databases & SQL Server', credits: 3, description: 'Database schema design, queries, normalization, and ACID.' },
    ],
    sp: [
      { code: 'SP-IT-101', name: 'IT Helpdesk & Network Troubleshooting', credits: 2, description: 'Operating system repairs, printer setup, and LAN troubleshooting.' },
      { code: 'SP-IT-102', name: 'Front-End Web Development Bootcamp', credits: 2, description: 'Building modern responsive websites and landing pages.' },
    ],
  },
  'Languages': {
    tvet: [
      { code: 'LANG-101', name: 'Advanced English Communication & Writing', credits: 3, description: 'Formal business writing, vocabulary expansion, and debate.' },
      { code: 'LANG-102', name: 'French Language & Francophone Culture', credits: 3, description: 'Grammar, everyday dialog, reading comprehension, and pronunciation.' },
      { code: 'LANG-103', name: 'Translation & Simultaneous Interpretation', credits: 3, description: 'Document translation principles and spoken conference translation.' },
    ],
    sp: [
      { code: 'SP-LANG-101', name: 'Conversational English Fluency Workshop', credits: 2, description: 'Daily speaking practice, accent reduction, and confidence.' },
      { code: 'SP-LANG-102', name: 'Business English & Workplace Correspondence', credits: 2, description: 'Email etiquette, meetings, negotiations, and presentations.' },
    ],
  },
  'Pharmacy': {
    tvet: [
      { code: 'PHARM-101', name: 'Fundamentals of Pharmacology & Therapeutics', credits: 3, description: 'Drug classes, mechanisms of action, and contraindications.' },
      { code: 'PHARM-102', name: 'Dispensing Practice & Patient Counseling', credits: 3, description: 'Prescription reading, dosage verification, and patient guidance.' },
      { code: 'PHARM-103', name: 'Pharmaceutical Calculations & Formulation', credits: 3, description: 'Dilutions, metric conversions, and non-sterile compounding.' },
    ],
    sp: [
      { code: 'SP-PHARM-101', name: 'Pharmacy Assistant & Over-The-Counter Drugs', credits: 2, description: 'Assisting licensed pharmacists, customer service, and OTC drugs.' },
      { code: 'SP-PHARM-102', name: 'Medical Store & Drug Inventory Management', credits: 2, description: 'Cold-chain storage, FEFO inventory, and stock control.' },
    ],
  },
};

const FAKE_DEPARTMENT_NAMES = [
  'Computer Science',
  'Mathematics',
  'Business Administration',
  'English Language',
  'Computer Science Test Dept',
  'Updated Dept D484',
  'Engineering',
  'Business',
  'Media, Communication & Languages',
  'Photography & Visual Media',
  'Music & Performing Arts',
  'Design & Digital Marketing',
  'Pharmacy & Health Sciences',
];

/**
 * Ensures the 10 real Harmony College departments exist separately for
 * BOTH TVET and SHORT_PROGRAM, links corresponding programs and semesters,
 * and migrates existing students cleanly into their respective program type.
 */
export async function ensureRealDepartments() {
  console.log('[ensureRealDepartments] Syncing TVET and Short Program academic structure...');

  // 1. Ensure Active Academic Year exists
  let academicYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
  });
  if (!academicYear) {
    academicYear = await prisma.academicYear.findFirst();
  }
  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        name: '2026/2027',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-06-30'),
        isCurrent: true,
      },
    });
  }

  // 2. Ensure Semesters exist for BOTH TVET and SHORT_PROGRAM
  for (const progType of [ProgramType.TVET, ProgramType.SHORT_PROGRAM]) {
    const sem1 = await prisma.semester.findFirst({
      where: { academicYearId: academicYear.id, name: 'Semester I', programType: progType },
    });
    if (!sem1) {
      await prisma.semester.create({
        data: {
          name: 'Semester I',
          academicYearId: academicYear.id,
          programType: progType,
          startDate: new Date('2026-09-01'),
          endDate: new Date('2027-01-31'),
          registrationStart: new Date('2026-08-15'),
          registrationEnd: new Date('2026-09-30'),
          addDropDeadline: new Date('2026-10-15'),
          isCurrent: true,
          isActive: true,
        },
      });
    }

    const sem2 = await prisma.semester.findFirst({
      where: { academicYearId: academicYear.id, name: 'Semester II', programType: progType },
    });
    if (!sem2) {
      await prisma.semester.create({
        data: {
          name: 'Semester II',
          academicYearId: academicYear.id,
          programType: progType,
          startDate: new Date('2027-02-01'),
          endDate: new Date('2027-06-30'),
          registrationStart: new Date('2027-01-15'),
          registrationEnd: new Date('2027-02-28'),
          addDropDeadline: new Date('2027-03-15'),
          isCurrent: false,
          isActive: true,
        },
      });
    }
  }

  // 3. Upsert 10 Real Departments for TVET
  for (const dept of REAL_DEPARTMENTS) {
    const tvetDept = await prisma.department.upsert({
      where: {
        name_programType: {
          name: dept.name,
          programType: ProgramType.TVET,
        },
      },
      update: {
        code: dept.tvetCode,
        description: dept.description,
        isActive: true,
      },
      create: {
        name: dept.name,
        code: dept.tvetCode,
        programType: ProgramType.TVET,
        description: dept.description,
        isActive: true,
      },
    });

    // Ensure TVET Program
    await prisma.program.upsert({
      where: { code: `${dept.tvetCode}-PROG` },
      update: { name: `${dept.name} (TVET)`, departmentId: tvetDept.id, isActive: true },
      create: {
        code: `${dept.tvetCode}-PROG`,
        name: `${dept.name} (TVET)`,
        departmentId: tvetDept.id,
        durationYears: 3,
        totalCredits: 90,
        isActive: true,
      },
    });

    // Ensure TVET Courses & Offerings for this department
    const tvetCourses = DEPARTMENT_COURSES[dept.name]?.tvet ?? [];
    for (const c of tvetCourses) {
      const course = await prisma.course.upsert({
        where: {
          code_programType: {
            code: c.code,
            programType: ProgramType.TVET,
          },
        },
        update: {
          name: c.name,
          creditHours: c.credits,
          description: c.description,
          departmentId: tvetDept.id,
          status: CourseStatus.ACTIVE,
        },
        create: {
          code: c.code,
          name: c.name,
          creditHours: c.credits,
          description: c.description,
          departmentId: tvetDept.id,
          programType: ProgramType.TVET,
          status: CourseStatus.ACTIVE,
        },
      });

      const tvetSemester = await prisma.semester.findFirst({
        where: { academicYearId: academicYear.id, isCurrent: true, programType: ProgramType.TVET },
      });
      if (tvetSemester) {
        const existingOffering = await prisma.courseOffering.findFirst({
          where: {
            courseId: course.id,
            semesterId: tvetSemester.id,
            programType: ProgramType.TVET,
          },
        });
        if (!existingOffering) {
          await prisma.courseOffering.create({
            data: {
              courseId: course.id,
              semesterId: tvetSemester.id,
              programType: ProgramType.TVET,
              capacity: 40,
              status: OfferingStatus.ACTIVE,
            },
          });
        }
      }
    }

    // Sync to HRDepartment
    await prisma.hRDepartment.upsert({
      where: { id: tvetDept.id },
      update: { name: dept.name, isActive: true },
      create: { id: tvetDept.id, name: dept.name, isActive: true },
    }).catch(async () => {
      await prisma.hRDepartment.upsert({
        where: { name: dept.name },
        update: { isActive: true },
        create: { name: dept.name, isActive: true },
      }).catch(() => {});
    });
  }

  // 4. Upsert 10 Real Departments for SHORT_PROGRAM
  for (const dept of REAL_DEPARTMENTS) {
    const spDept = await prisma.department.upsert({
      where: {
        name_programType: {
          name: dept.name,
          programType: ProgramType.SHORT_PROGRAM,
        },
      },
      update: {
        code: dept.spCode,
        description: `${dept.description} (Short Program)`,
        isActive: true,
      },
      create: {
        name: dept.name,
        code: dept.spCode,
        programType: ProgramType.SHORT_PROGRAM,
        description: `${dept.description} (Short Program)`,
        isActive: true,
      },
    });

    // Ensure Short Program Program
    await prisma.program.upsert({
      where: { code: `${dept.spCode}-PROG` },
      update: { name: `${dept.name} (Short Program)`, departmentId: spDept.id, isActive: true },
      create: {
        code: `${dept.spCode}-PROG`,
        name: `${dept.name} (Short Program)`,
        departmentId: spDept.id,
        durationYears: 1,
        totalCredits: 30,
        isActive: true,
      },
    });

    // Ensure Short Program Courses & Offerings for this department
    const spCourses = DEPARTMENT_COURSES[dept.name]?.sp ?? [];
    for (const c of spCourses) {
      const course = await prisma.course.upsert({
        where: {
          code_programType: {
            code: c.code,
            programType: ProgramType.SHORT_PROGRAM,
          },
        },
        update: {
          name: c.name,
          creditHours: c.credits,
          description: c.description,
          departmentId: spDept.id,
          status: CourseStatus.ACTIVE,
        },
        create: {
          code: c.code,
          name: c.name,
          creditHours: c.credits,
          description: c.description,
          departmentId: spDept.id,
          programType: ProgramType.SHORT_PROGRAM,
          status: CourseStatus.ACTIVE,
        },
      });

      const spSemester = await prisma.semester.findFirst({
        where: { academicYearId: academicYear.id, isCurrent: true, programType: ProgramType.SHORT_PROGRAM },
      });
      if (spSemester) {
        const existingOffering = await prisma.courseOffering.findFirst({
          where: {
            courseId: course.id,
            semesterId: spSemester.id,
            programType: ProgramType.SHORT_PROGRAM,
          },
        });
        if (!existingOffering) {
          await prisma.courseOffering.create({
            data: {
              courseId: course.id,
              semesterId: spSemester.id,
              programType: ProgramType.SHORT_PROGRAM,
              capacity: 30,
              status: OfferingStatus.ACTIVE,
            },
          });
        }
      }
    }
  }

  // 5. Deactivate fake departments
  await prisma.department.updateMany({
    where: {
      name: { in: FAKE_DEPARTMENT_NAMES },
    },
    data: {
      isActive: false,
    },
  });

  await prisma.hRDepartment.updateMany({
    where: {
      name: { in: FAKE_DEPARTMENT_NAMES },
    },
    data: {
      isActive: false,
    },
  });

  // 6. Migrate existing StudentRecords to clean TVET / Short Program alignment
  const allStudents = await prisma.studentRecord.findMany({
    include: {
      user: { include: { studentProfile: true } },
      department: true,
    },
  });

  const defaultTvetDept = await prisma.department.findFirst({
    where: { code: 'IT-T', programType: ProgramType.TVET },
  });
  const defaultTvetProg = await prisma.program.findFirst({
    where: { departmentId: defaultTvetDept?.id },
  });

  for (const s of allStudents) {
    const profile = s.user.studentProfile;
    const isShortProg = profile?.programType === 'Short Program' || (s.programType as any) === 'SHORT_PROGRAM';

    if (isShortProg) {
      // Find matching Short Program department
      const targetName = profile?.program || s.department?.name || 'Information Technology (IT)';
      const cleanName = targetName.split('(')[0].trim();
      const matchedSpDept = await prisma.department.findFirst({
        where: {
          name: { contains: cleanName, mode: 'insensitive' },
          programType: ProgramType.SHORT_PROGRAM,
          isActive: true,
        },
      });
      const matchedSpProg = matchedSpDept ? await prisma.program.findFirst({
        where: { departmentId: matchedSpDept.id },
      }) : null;

      await prisma.studentRecord.update({
        where: { id: s.id },
        data: {
          programType: ProgramType.SHORT_PROGRAM,
          shortProgramDuration: profile?.shortProgramDuration || '2 Months',
          ...(matchedSpDept ? { departmentId: matchedSpDept.id } : {}),
          ...(matchedSpProg ? { programId: matchedSpProg.id } : {}),
        },
      });
    } else {
      // TVET student: prioritize profile.program if set
      const targetName = profile?.program || s.department?.name || '';
      const cleanName = targetName.split('(')[0].trim();

      let tvetDept = cleanName ? await prisma.department.findFirst({
        where: {
          name: { contains: cleanName, mode: 'insensitive' },
          programType: ProgramType.TVET,
          isActive: true,
        },
      }) : null;

      if (!tvetDept && s.department?.programType === ProgramType.TVET) {
        tvetDept = s.department;
      }
      if (!tvetDept) tvetDept = defaultTvetDept;

      const tvetProg = tvetDept ? await prisma.program.findFirst({
        where: { departmentId: tvetDept.id },
      }) : defaultTvetProg;

      await prisma.studentRecord.update({
        where: { id: s.id },
        data: {
          programType: ProgramType.TVET,
          shortProgramDuration: null, // TVET students do not have short program duration
          ...(tvetDept ? { departmentId: tvetDept.id } : {}),
          ...(tvetProg ? { programId: tvetProg.id } : {}),
        },
      });

      if (profile && tvetDept) {
        await prisma.studentProfile.update({
          where: { id: profile.id },
          data: {
            selectedDepartmentId: tvetDept.id,
          },
        });
      }

      // Ensure StudentProfile is also TVET
      if (profile && !profile.programType) {
        await prisma.studentProfile.update({
          where: { id: profile.id },
          data: {
            programType: 'TVET',
            shortProgramDuration: null,
            ...(tvetDept ? { selectedDepartmentId: tvetDept.id } : {}),
          },
        });
      }
    }
  }

  console.log('[ensureRealDepartments] Complete TVET and Short Program separation synchronized successfully.');
}
