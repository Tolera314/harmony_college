/**
 * HR Module Seed — Harmony College
 * Run: npx tsx prisma/seedHR.ts
 *
 * Seeds: departments, employees, leave requests, leave balances,
 *        payroll records + approvals + payslips, performance reviews,
 *        documents, onboarding, offboarding, audit logs, notifications.
 *
 * Idempotent: uses upsert everywhere so it can be re-run safely.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding HR module…');

  // ── 1. HR Departments ────────────────────────────────────────────────────
  const depts = await Promise.all([
    prisma.hRDepartment.upsert({ where: { name: 'Theatrical Art & Digital Media' }, update: { budget: 1_800_000 }, create: { name: 'Theatrical Art & Digital Media', budget: 1_800_000 } }),
    prisma.hRDepartment.upsert({ where: { name: 'Computer Science & Engineering'  }, update: { budget: 2_400_000 }, create: { name: 'Computer Science & Engineering',  budget: 2_400_000 } }),
    prisma.hRDepartment.upsert({ where: { name: 'Human Resources'                 }, update: { budget:   600_000 }, create: { name: 'Human Resources',                 budget:   600_000 } }),
    prisma.hRDepartment.upsert({ where: { name: 'Finance & Accounting'            }, update: { budget:   900_000 }, create: { name: 'Finance & Accounting',            budget:   900_000 } }),
    prisma.hRDepartment.upsert({ where: { name: 'Registrar & Student Affairs'     }, update: { budget:   750_000 }, create: { name: 'Registrar & Student Affairs',     budget:   750_000 } }),
    prisma.hRDepartment.upsert({ where: { name: 'Library & Research Services'     }, update: { budget:   480_000 }, create: { name: 'Library & Research Services',     budget:   480_000 } }),
  ]);
  const [dArt, dCS, dHR, dFin, dReg, dLib] = depts;
  console.log('  ✓ Departments');

  // ── 2. HR Employees ──────────────────────────────────────────────────────
  const hireDates: Record<string, Date> = {
    e01: new Date('2016-09-01'), e02: new Date('2016-08-15'), e03: new Date('2018-01-10'),
    e04: new Date('2020-03-01'), e05: new Date('2021-09-01'), e06: new Date('2015-08-01'),
    e07: new Date('2022-01-15'), e08: new Date('2017-08-01'), e09: new Date('2022-02-01'),
    e10: new Date('2019-03-01'), e11: new Date('2018-06-01'), e12: new Date('2017-09-15'),
    e13: new Date('2020-01-20'), e14: new Date('2024-05-01'), e15: new Date('2021-07-10'),
    e16: new Date('2022-10-01'), e17: new Date('2020-04-15'), e18: new Date('2024-01-15'),
    e19: new Date('2021-03-01'), e20: new Date('2020-08-01'),
  };

  type EmpInput = {
    code: string; deptId: string; fullName: string; avatarUrl: string; gender: 'MALE'|'FEMALE';
    email: string; phone: string; position: string; empType: 'FULL_TIME'|'PART_TIME'|'CONTRACT'|'INTERN';
    contractStatus: 'ACTIVE'|'EXPIRING_SOON'|'EXPIRED'|'PROBATION';
    status: 'ACTIVE'|'INACTIVE'|'ON_LEAVE'|'TERMINATED';
    hireKey: string; contractEnd?: Date; managerId?: string; education: string; exp: number;
    basic: number; allow: number; deduct: number;
    natId: string; bank: string; tax: string;
    ergName: string; ergPhone: string; ergRel: string;
  };

  const empRows: EmpInput[] = [
    { code:'HC-FAC-0042', deptId:dArt.id, fullName:'Dr. Natnael Bekele',    avatarUrl:'/natnael.png',         gender:'MALE',   email:'n.bekele@harmony.edu',    phone:'+251911200334', position:'Department Head & Associate Professor', empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e01', education:'PhD in Film Studies',        exp:14, basic:48000, allow:8000, deduct:6200, natId:'1234-5678-9012', bank:'1000234567891', tax:'TN-HC-0042', ergName:'Hana Bekele',     ergPhone:'+251911999001', ergRel:'Spouse'  },
    { code:'HC-FAC-0001', deptId:dArt.id, fullName:'Dr. Marcus Vance',      avatarUrl:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', gender:'MALE',   email:'m.vance@harmony.edu',     phone:'+251911100001', position:'Professor of Cinematography',           empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e02', education:'PhD in Media Arts',          exp:15, basic:45000, allow:7500, deduct:5800, natId:'2345-6789-0123', bank:'1000234567892', tax:'TN-HC-0001', ergName:'Lisa Vance',      ergPhone:'+251911999002', ergRel:'Spouse'  },
    { code:'HC-FAC-0019', deptId:dArt.id, fullName:'Prof. Sarah Jenkins',   avatarUrl:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80', gender:'FEMALE', email:'s.jenkins@harmony.edu',   phone:'+251911100002', position:'Associate Professor, Audio Engineering', empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e03', education:'MFA in Music Production',    exp:11, basic:38000, allow:6500, deduct:4900, natId:'3456-7890-1234', bank:'1000234567893', tax:'TN-HC-0019', ergName:'Tom Jenkins',     ergPhone:'+251911999003', ergRel:'Spouse'  },
    { code:'HC-FAC-0033', deptId:dArt.id, fullName:'Mr. Daniel Osei',       avatarUrl:'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=300&q=80', gender:'MALE',   email:'d.osei@harmony.edu',      phone:'+251911100004', position:'Assistant Professor, Theatre Arts',      empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e04', education:'MA in Theatre',              exp: 8, basic:32000, allow:5500, deduct:4100, natId:'4567-8901-2345', bank:'1000234567894', tax:'TN-HC-0033', ergName:'Ama Osei',        ergPhone:'+251911999004', ergRel:'Spouse'  },
    { code:'HC-FAC-0055', deptId:dArt.id, fullName:'Dr. Meron Tadesse',     avatarUrl:'/Meron.png',           gender:'FEMALE', email:'m.tadesse@harmony.edu',   phone:'+251911100005', position:'Assistant Professor, Media Studies',      empType:'FULL_TIME', contractStatus:'EXPIRING_SOON', status:'ACTIVE',     hireKey:'e05', contractEnd:new Date('2024-08-31'), education:'PhD in Cultural Studies',    exp: 7, basic:30000, allow:5000, deduct:3800, natId:'5678-9012-3456', bank:'1000234567895', tax:'TN-HC-0055', ergName:'Alemu Tadesse',   ergPhone:'+251911999005', ergRel:'Father'  },
    { code:'HC-FAC-0008', deptId:dCS.id,  fullName:'Prof. James Adeyemi',   avatarUrl:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', gender:'MALE',   email:'j.adeyemi@harmony.edu',   phone:'+251911100006', position:'Professor & CS Department Head',         empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e06', education:'PhD Computer Science',       exp:18, basic:50000, allow:9000, deduct:6500, natId:'6789-0123-4567', bank:'1000234567896', tax:'TN-HC-0008', ergName:'Ngozi Adeyemi',   ergPhone:'+251911999006', ergRel:'Spouse'  },
    { code:'HC-FAC-0061', deptId:dArt.id, fullName:'Ms. Rahel Solomon',     avatarUrl:'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=300&q=80', gender:'FEMALE', email:'r.solomon@harmony.edu',   phone:'+251911100007', position:'Lecturer, Digital Photography',           empType:'PART_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e07', education:'MFA Photography',            exp: 5, basic:18000, allow:2500, deduct:2200, natId:'7890-1234-5678', bank:'1000234567897', tax:'TN-HC-0061', ergName:'Kidist Solomon',  ergPhone:'+251911999007', ergRel:'Mother'  },
    { code:'HC-FAC-0072', deptId:dArt.id, fullName:'Dr. Yohannes Girma',    avatarUrl:'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80', gender:'MALE',   email:'y.girma@harmony.edu',     phone:'+251911100008', position:'Associate Professor, Film Theory',        empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ON_LEAVE',   hireKey:'e08', education:'PhD Film Theory',            exp:12, basic:38000, allow:6000, deduct:4800, natId:'8901-2345-6789', bank:'1000234567898', tax:'TN-HC-0072', ergName:'Hiwot Girma',     ergPhone:'+251911999008', ergRel:'Spouse'  },
    { code:'HC-FAC-0088', deptId:dCS.id,  fullName:'Dr. Amina Okafor',      avatarUrl:'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80', gender:'FEMALE', email:'a.okafor@harmony.edu',    phone:'+251911100010', position:'Assistant Professor, Animation',          empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e09', education:'PhD in Animation',           exp: 6, basic:33000, allow:5500, deduct:4200, natId:'9012-3456-7890', bank:'1000234567899', tax:'TN-HC-0088', ergName:'Chidi Okafor',    ergPhone:'+251911999009', ergRel:'Spouse'  },
    { code:'HC-HR-0001',  deptId:dHR.id,  fullName:'Tigist Haile',          avatarUrl:'/tigist.png',          gender:'FEMALE', email:'hr@harmony.edu',          phone:'+251911300112', position:'Senior HR Officer',                       empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e10', education:'MBA Human Resources',        exp: 9, basic:35000, allow:6000, deduct:4500, natId:'0123-4567-8901', bank:'1000234567900', tax:'TN-HC-HR01', ergName:'Biruk Haile',     ergPhone:'+251911999010', ergRel:'Spouse'  },
    { code:'HC-FIN-0012', deptId:dFin.id, fullName:'Selamawit Desta',       avatarUrl:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80', gender:'FEMALE', email:'fin@harmony.edu',         phone:'+251911400220', position:'Finance Manager',                         empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e11', education:'MSc Accounting & Finance',   exp:10, basic:42000, allow:7000, deduct:5400, natId:'1234-0987-6543', bank:'1000234567901', tax:'TN-HC-FIN01', ergName:'Tesfaye Desta',   ergPhone:'+251911999011', ergRel:'Spouse'  },
    { code:'HC-REG-0005', deptId:dReg.id, fullName:'Robel Bekele',          avatarUrl:'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80', gender:'MALE',   email:'registrar@harmony.edu',   phone:'+251911500330', position:'Registrar',                               empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e12', education:'MA Education Management',    exp:11, basic:40000, allow:6500, deduct:5100, natId:'2345-1098-7654', bank:'1000234567902', tax:'TN-HC-REG01', ergName:'Lemlem Bekele',   ergPhone:'+251911999012', ergRel:'Spouse'  },
    { code:'HC-LIB-0003', deptId:dLib.id, fullName:'Dawit Mekonnen',        avatarUrl:'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80', gender:'MALE',   email:'library@harmony.edu',     phone:'+251911600440', position:'Head Librarian',                          empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e13', education:'MLIS Library Science',       exp: 8, basic:28000, allow:4500, deduct:3500, natId:'3456-2109-8765', bank:'1000234567903', tax:'TN-HC-LIB01', ergName:'Yeshi Mekonnen',  ergPhone:'+251911999013', ergRel:'Spouse'  },
    { code:'HC-ADM-0021', deptId:dHR.id,  fullName:'Bethlehem Girma',       avatarUrl:'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=300&q=80', gender:'FEMALE', email:'b.girma@harmony.edu',     phone:'+251911700550', position:'HR Officer',                              empType:'FULL_TIME', contractStatus:'PROBATION',     status:'ACTIVE',     hireKey:'e14', education:'BA Human Resource Management',exp: 2, basic:25000, allow:4000, deduct:3100, natId:'4567-3210-9876', bank:'1000234567904', tax:'TN-HC-ADM21', ergName:'Girma Tadesse',   ergPhone:'+251911999014', ergRel:'Father'  },
    { code:'HC-SEC-0009', deptId:dReg.id, fullName:'Samuel Teklu',          avatarUrl:'https://images.unsplash.com/photo-1542178243-bc20204b769f?auto=format&fit=crop&w=300&q=80', gender:'MALE',   email:'s.teklu@harmony.edu',     phone:'+251911800660', position:'Student Affairs Officer',                 empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e15', education:'BA Social Work',             exp: 7, basic:26000, allow:4200, deduct:3200, natId:'5678-4321-0987', bank:'1000234567905', tax:'TN-HC-SEC09', ergName:'Azeb Teklu',      ergPhone:'+251911999015', ergRel:'Spouse'  },
    { code:'HC-IT-0014',  deptId:dCS.id,  fullName:'Abel Tesfaye',          avatarUrl:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', gender:'MALE',   email:'it@harmony.edu',          phone:'+251911900770', position:'IT Systems Administrator',                empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e16', education:'BSc Computer Science',       exp: 5, basic:30000, allow:5000, deduct:3800, natId:'6789-5432-1098', bank:'1000234567906', tax:'TN-HC-IT014', ergName:'Hana Tesfaye',    ergPhone:'+251911999016', ergRel:'Spouse'  },
    { code:'HC-FIN-0025', deptId:dFin.id, fullName:'Mahlet Tafesse',        avatarUrl:'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80', gender:'FEMALE', email:'m.tafesse@harmony.edu',   phone:'+251912100880', position:'Senior Accountant',                       empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e17', education:'BSc Accounting',             exp: 8, basic:32000, allow:5200, deduct:4100, natId:'7890-6543-2109', bank:'1000234567907', tax:'TN-HC-FIN25', ergName:'Liya Tafesse',    ergPhone:'+251911999017', ergRel:'Mother'  },
    { code:'HC-INF-0034', deptId:dCS.id,  fullName:'Naol Bekele',           avatarUrl:'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=300&q=80', gender:'MALE',   email:'naol.bekele@harmony.edu', phone:'+251912200990', position:'Junior Software Engineer',                empType:'CONTRACT',  contractStatus:'EXPIRING_SOON', status:'ACTIVE',     hireKey:'e18', contractEnd:new Date('2024-12-31'), education:'BSc Software Engineering',   exp: 2, basic:22000, allow:3500, deduct:2800, natId:'8901-7654-3210', bank:'1000234567908', tax:'TN-HC-INF34', ergName:'Meseret Bekele',  ergPhone:'+251911999018', ergRel:'Mother'  },
    { code:'HC-LIB-0007', deptId:dLib.id, fullName:'Tsehay Alemu',          avatarUrl:'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&q=80', gender:'FEMALE', email:'t.alemu@harmony.edu',     phone:'+251912300110', position:'Assistant Librarian',                     empType:'PART_TIME', contractStatus:'ACTIVE',        status:'ACTIVE',     hireKey:'e19', education:'BA Library Science',         exp: 5, basic:15000, allow:2200, deduct:1800, natId:'9012-8765-4321', bank:'1000234567909', tax:'TN-HC-LIB07', ergName:'Bekele Alemu',    ergPhone:'+251911999019', ergRel:'Father'  },
    { code:'HC-SEC-0018', deptId:dReg.id, fullName:'Henok Mulugeta',         avatarUrl:'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80', gender:'MALE',   email:'h.mulugeta@harmony.edu',  phone:'+251912400220', position:'Admissions Officer',                      empType:'FULL_TIME', contractStatus:'ACTIVE',        status:'TERMINATED', hireKey:'e20', education:'BA Education',               exp: 6, basic: 0,    allow: 0,   deduct: 0,   natId:'0123-9876-5432', bank:'1000234567910', tax:'TN-HC-SEC18', ergName:'Tigist Mulugeta', ergPhone:'+251911999020', ergRel:'Spouse'  },
  ];

  const empMap: Record<string, string> = {}; // code → DB id
  for (const e of empRows) {
    const created = await prisma.hREmployee.upsert({
      where: { employeeCode: e.code },
      update: {
        status: e.status as any, contractStatus: e.contractStatus as any,
        basicSalary: e.basic, allowances: e.allow, deductions: e.deduct,
      },
      create: {
        employeeCode: e.code, departmentId: e.deptId,
        fullName: e.fullName, avatarUrl: e.avatarUrl, gender: e.gender as any,
        email: e.email, phone: e.phone, position: e.position,
        employmentType: e.empType as any, contractStatus: e.contractStatus as any,
        status: e.status as any, hireDate: hireDates[e.hireKey]!,
        contractEndDate: e.contractEnd,
        education: e.education, experienceYears: e.exp,
        basicSalary: e.basic, allowances: e.allow, deductions: e.deduct,
        nationalId: e.natId, bankAccount: e.bank, taxNumber: e.tax,
        emergencyName: e.ergName, emergencyPhone: e.ergPhone, emergencyRelation: e.ergRel,
      },
    });
    empMap[e.code] = created.id;
  }

  // set manager FK after all employees exist
  const managerPairs: [string, string][] = [
    ['HC-FAC-0001','HC-FAC-0042'], ['HC-FAC-0019','HC-FAC-0042'], ['HC-FAC-0033','HC-FAC-0042'],
    ['HC-FAC-0055','HC-FAC-0042'], ['HC-FAC-0061','HC-FAC-0042'], ['HC-FAC-0072','HC-FAC-0042'],
    ['HC-FAC-0088','HC-FAC-0008'], ['HC-ADM-0021','HC-HR-0001'],
    ['HC-SEC-0009','HC-REG-0005'], ['HC-SEC-0018','HC-REG-0005'],
    ['HC-IT-0014','HC-FAC-0008'],  ['HC-INF-0034','HC-IT-0014'],
    ['HC-FIN-0025','HC-FIN-0012'], ['HC-LIB-0007','HC-LIB-0003'],
  ];
  for (const [empCode, mgrCode] of managerPairs) {
    await prisma.hREmployee.update({
      where: { employeeCode: empCode },
      data:  { managerId: empMap[mgrCode] },
    });
  }

  // update dept head IDs
  await prisma.hRDepartment.update({ where: { id: dArt.id }, data: { headEmployeeId: empMap['HC-FAC-0042'] } });
  await prisma.hRDepartment.update({ where: { id: dCS.id  }, data: { headEmployeeId: empMap['HC-FAC-0008'] } });
  await prisma.hRDepartment.update({ where: { id: dHR.id  }, data: { headEmployeeId: empMap['HC-HR-0001']  } });
  await prisma.hRDepartment.update({ where: { id: dFin.id }, data: { headEmployeeId: empMap['HC-FIN-0012'] } });
  await prisma.hRDepartment.update({ where: { id: dReg.id }, data: { headEmployeeId: empMap['HC-REG-0005'] } });
  await prisma.hRDepartment.update({ where: { id: dLib.id }, data: { headEmployeeId: empMap['HC-LIB-0003'] } });
  console.log('  ✓ Employees');

  // ── 3. Leave balances ────────────────────────────────────────────────────
  const activeCodes = empRows.filter(e => e.status === 'ACTIVE').map(e => e.code);
  const takenAnnual = [0,5,3,2,8,4,1,0,6,3,2,1,4,2,0,3,5,1,2,0];
  const takenSick   = [0,2,0,1,3,0,0,0,1,0,0,0,2,0,1,0,1,0,1,0];
  const takenStudy  = [0,5,0,0,0,3,0,0,0,0,0,0,1,0,0,0,0,0,0,0];
  for (let i = 0; i < activeCodes.length; i++) {
    const eId = empMap[activeCodes[i]!]!;
    for (const [type, entitled, taken] of [
      ['ANNUAL',20,takenAnnual[i]??0],
      ['SICK',  15,takenSick[i]??0],
      ['STUDY', 10,takenStudy[i]??0],
    ] as [string,number,number][]) {
      await prisma.hRLeaveBalance.upsert({
        where: { employeeId_leaveType_year: { employeeId: eId, leaveType: type as any, year: 2024 } },
        update: { taken, remaining: entitled - taken },
        create: { employeeId: eId, leaveType: type as any, entitled, taken, remaining: entitled - taken, year: 2024 },
      });
    }
  }
  console.log('  ✓ Leave balances');

  // ── 4. Leave requests ────────────────────────────────────────────────────
  const leaveData = [
    { code:'HC-FAC-0072', type:'STUDY',     start:'2024-08-05', end:'2024-08-18', days:14, reason:'Presenting paper at African Film Academy Conference, Nairobi.',         status:'APPROVED',  mgrApp:'APPROVED', hrApp:'APPROVED', submittedAt:'2024-07-10', reviewedAt:'2024-07-12' },
    { code:'HC-FAC-0055', type:'SICK',      start:'2024-07-22', end:'2024-07-31', days:10, reason:'Recovery from minor surgery. Doctor clearance attached.',               status:'PENDING',   mgrApp:'APPROVED', hrApp:'PENDING',  submittedAt:'2024-07-19' },
    { code:'HC-FAC-0061', type:'ANNUAL',    start:'2024-07-29', end:'2024-08-02', days: 5, reason:'Family obligation requiring travel to Hawassa.',                        status:'PENDING',   mgrApp:'PENDING',  hrApp:'PENDING',  submittedAt:'2024-07-20' },
    { code:'HC-FAC-0019', type:'ANNUAL',    start:'2024-08-20', end:'2024-08-23', days: 4, reason:'Attending International Design & Branding Symposium, Addis Ababa.',     status:'APPROVED',  mgrApp:'APPROVED', hrApp:'APPROVED', submittedAt:'2024-07-08', reviewedAt:'2024-07-09' },
    { code:'HC-ADM-0021', type:'EMERGENCY', start:'2024-07-15', end:'2024-07-16', days: 2, reason:'Family emergency — immediate travel required.',                         status:'APPROVED',  mgrApp:'APPROVED', hrApp:'APPROVED', submittedAt:'2024-07-14', reviewedAt:'2024-07-14' },
    { code:'HC-FAC-0033', type:'ANNUAL',    start:'2024-08-10', end:'2024-08-14', days: 5, reason:'Annual vacation — family trip to Lalibela.',                           status:'PENDING',   mgrApp:'APPROVED', hrApp:'PENDING',  submittedAt:'2024-07-21' },
    { code:'HC-FIN-0025', type:'SICK',      start:'2024-07-10', end:'2024-07-12', days: 3, reason:'Flu and fever. Medical certificate attached.',                         status:'APPROVED',  mgrApp:'APPROVED', hrApp:'APPROVED', submittedAt:'2024-07-09', reviewedAt:'2024-07-09' },
    { code:'HC-IT-0014',  type:'ANNUAL',    start:'2024-08-26', end:'2024-08-30', days: 5, reason:'End-of-summer annual leave.',                                          status:'PENDING',   mgrApp:'PENDING',  hrApp:'PENDING',  submittedAt:'2024-07-22' },
    { code:'HC-FAC-0001', type:'STUDY',     start:'2024-09-10', end:'2024-09-14', days: 5, reason:'Attending industry masterclass on cinematography, Cape Town.',         status:'PENDING',   mgrApp:'APPROVED', hrApp:'PENDING',  submittedAt:'2024-07-18' },
    { code:'HC-SEC-0009', type:'ANNUAL',    start:'2024-08-05', end:'2024-08-09', days: 5, reason:'Planned annual leave for family visit.',                               status:'REJECTED',  mgrApp:'REJECTED', hrApp:'REJECTED', submittedAt:'2024-07-05', reviewedAt:'2024-07-06', comment:'Critical student intake period — cannot be approved at this time.' },
    { code:'HC-FAC-0088', type:'MATERNITY', start:'2024-09-01', end:'2024-11-30', days:90, reason:'Maternity leave as per HR policy.',                                    status:'APPROVED',  mgrApp:'APPROVED', hrApp:'APPROVED', submittedAt:'2024-07-01', reviewedAt:'2024-07-02' },
    { code:'HC-LIB-0003', type:'ANNUAL',    start:'2024-08-19', end:'2024-08-23', days: 5, reason:'Annual leave — vacation in Gondar.',                                   status:'PENDING',   mgrApp:'APPROVED', hrApp:'PENDING',  submittedAt:'2024-07-22' },
  ];
  for (const lr of leaveData) {
    await prisma.hRLeaveRequest.create({
      data: {
        employeeId:      empMap[lr.code]!,
        leaveType:       lr.type as any,
        startDate:       new Date(lr.start),
        endDate:         new Date(lr.end),
        daysCount:       lr.days,
        reason:          lr.reason,
        status:          lr.status as any,
        managerApproval: lr.mgrApp as any,
        hrApproval:      lr.hrApp as any,
        reviewComment:   (lr as any).comment ?? null,
        submittedAt:     new Date(lr.submittedAt),
        reviewedAt:      (lr as any).reviewedAt ? new Date((lr as any).reviewedAt) : null,
      },
    });
  }
  console.log('  ✓ Leave requests');

  // ── 5. Payroll records ───────────────────────────────────────────────────
  const payrollData = [
    { month:'July',  year:2024, stage:'PENDING_HR_APPROVAL', gross:5_840_000, net:4_620_000, emp:19,
      approvals:[
        { stage:'Draft',           approver:'System',          status:'APPROVED',  date:'2024-07-25', comment:'Auto-generated' },
        { stage:'Finance Review',  approver:'Selamawit Desta', status:'APPROVED',  date:'2024-07-26', comment:'Reviewed and confirmed. All figures match budget.' },
        { stage:'HR Final Approval', approver:'Tigist Haile',  status:'PENDING',   date:null, comment:null },
      ]},
    { month:'June',  year:2024, stage:'LOCKED', gross:5_780_000, net:4_580_000, emp:19,
      approvals:[
        { stage:'Draft',           approver:'System',          status:'APPROVED', date:'2024-06-25', comment:null },
        { stage:'Finance Review',  approver:'Selamawit Desta', status:'APPROVED', date:'2024-06-26', comment:null },
        { stage:'HR Final Approval', approver:'Tigist Haile',  status:'APPROVED', date:'2024-06-27', comment:'Approved. Payslips released to employees.' },
      ]},
    { month:'May',   year:2024, stage:'LOCKED', gross:5_760_000, net:4_560_000, emp:18,
      approvals:[
        { stage:'Draft',           approver:'System',          status:'APPROVED', date:'2024-05-25', comment:null },
        { stage:'Finance Review',  approver:'Selamawit Desta', status:'APPROVED', date:'2024-05-26', comment:null },
        { stage:'HR Final Approval', approver:'Tigist Haile',  status:'APPROVED', date:'2024-05-27', comment:null },
      ]},
    { month:'April', year:2024, stage:'LOCKED', gross:5_700_000, net:4_510_000, emp:18,
      approvals:[
        { stage:'Draft',           approver:'System',          status:'APPROVED', date:'2024-04-25', comment:null },
        { stage:'Finance Review',  approver:'Selamawit Desta', status:'APPROVED', date:'2024-04-26', comment:null },
        { stage:'HR Final Approval', approver:'Tigist Haile',  status:'APPROVED', date:'2024-04-27', comment:null },
      ]},
  ];

  for (const pr of payrollData) {
    const record = await prisma.hRPayrollRecord.upsert({
      where: { month_year: { month: pr.month, year: pr.year } },
      update: { stage: pr.stage as any },
      create: {
        month: pr.month, year: pr.year, stage: pr.stage as any,
        totalGross: pr.gross, totalNet: pr.net, employeeCount: pr.emp,
        generatedAt: new Date(`${pr.year}-${pr.month === 'July' ? '07' : pr.month === 'June' ? '06' : pr.month === 'May' ? '05' : '04'}-25`),
      },
    });
    // Remove old approvals and recreate
    await prisma.hRPayrollApproval.deleteMany({ where: { payrollId: record.id } });
    for (const ap of pr.approvals) {
      await prisma.hRPayrollApproval.create({
        data: {
          payrollId: record.id, stageName: ap.stage, approverName: ap.approver,
          status: ap.status as any, approvedAt: ap.date ? new Date(ap.date) : null,
          comment: ap.comment,
        },
      });
    }

    // Payslips for July only (current month)
    if (pr.month === 'July') {
      for (const e of empRows.filter(e => e.status !== 'TERMINATED')) {
        const bonus   = e.basic > 35000 ? 2000 : 0;
        const tax     = Math.round((e.basic + e.allow) * 0.15);
        const pension = Math.round(e.basic * 0.07);
        const other   = e.deduct - tax - pension;
        await prisma.hRPayslip.upsert({
          where:  { payrollId_employeeId: { payrollId: record.id, employeeId: empMap[e.code]! } },
          update: {},
          create: {
            payrollId: record.id, employeeId: empMap[e.code]!,
            basicSalary: e.basic, allowances: e.allow, bonuses: bonus,
            tax, pension, otherDeductions: Math.max(0, other),
            netSalary: e.basic + e.allow + bonus - e.deduct,
          },
        });
      }
    }
  }
  console.log('  ✓ Payroll');

  // ── 6. Performance reviews ───────────────────────────────────────────────
  const perfData = [
    { code:'HC-FAC-0001', cycle:'SEMI_ANNUAL', period:'H1 2024', status:'COMPLETED',   due:'2024-07-15', score:4.5, goals:5, comp:4, att:5, comm:4, lead:4, tech:5, mgrC:'Outstanding performance. Strong cinematic direction.', hrC:'Recommend for salary review.', completedAt:'2024-07-14' },
    { code:'HC-FAC-0019', cycle:'SEMI_ANNUAL', period:'H1 2024', status:'COMPLETED',   due:'2024-07-15', score:4.2, goals:4, comp:4, att:5, comm:5, lead:4, tech:4, mgrC:'Excellent teamwork and student engagement.', hrC:'', completedAt:'2024-07-12' },
    { code:'HC-FAC-0033', cycle:'SEMI_ANNUAL', period:'H1 2024', status:'IN_PROGRESS', due:'2024-07-30' },
    { code:'HC-FAC-0055', cycle:'SEMI_ANNUAL', period:'H1 2024', status:'OVERDUE',     due:'2024-07-10' },
    { code:'HC-FAC-0008', cycle:'ANNUAL',      period:'2024',    status:'PENDING',     due:'2024-08-15' },
    { code:'HC-FAC-0088', cycle:'ANNUAL',      period:'2024',    status:'PENDING',     due:'2024-08-15' },
    { code:'HC-FIN-0012', cycle:'SEMI_ANNUAL', period:'H1 2024', status:'COMPLETED',   due:'2024-07-15', score:4.8, goals:5, comp:5, att:5, comm:5, lead:5, tech:4, mgrC:'Exceptional financial leadership.', hrC:'Promote to Finance Director review.', completedAt:'2024-07-10' },
    { code:'HC-ADM-0021', cycle:'QUARTERLY',   period:'Q2 2024', status:'IN_PROGRESS', due:'2024-07-25' },
  ];
  for (const pv of perfData) {
    await prisma.hRPerformanceReview.create({
      data: {
        employeeId: empMap[pv.code]!, cycle: pv.cycle as any, period: pv.period,
        status: pv.status as any, dueDate: new Date(pv.due),
        overallScore: (pv as any).score ?? null,
        goalsScore: (pv as any).goals ?? null, competenciesScore: (pv as any).comp ?? null,
        attendanceScore: (pv as any).att ?? null, communicationScore: (pv as any).comm ?? null,
        leadershipScore: (pv as any).lead ?? null, technicalScore: (pv as any).tech ?? null,
        managerComment: (pv as any).mgrC ?? null, hrComment: (pv as any).hrC ?? null,
        completedAt: (pv as any).completedAt ? new Date((pv as any).completedAt) : null,
      },
    });
  }
  console.log('  ✓ Performance reviews');

  // ── 7. Documents ─────────────────────────────────────────────────────────
  const docsData = [
    { code:'HC-FAC-0001', cat:'CONTRACT',          title:'Employment Contract — Dr. Marcus Vance',           size:'1.2 MB', uploadedAt:'2016-08-15', uploader:'HR Office',         version:3 },
    { code:'HC-FAC-0001', cat:'CV',                title:'CV — Dr. Marcus Vance (2024 updated)',              size:'0.8 MB', uploadedAt:'2024-01-10', uploader:'Dr. Marcus Vance',  version:4 },
    { code:'HC-FAC-0019', cat:'CONTRACT',          title:'Employment Contract — Prof. Sarah Jenkins',         size:'1.1 MB', uploadedAt:'2018-01-10', uploader:'HR Office',         version:2 },
    { code:'HC-FAC-0055', cat:'CONTRACT',          title:'Contract — Dr. Meron Tadesse (Renewal Pending)',    size:'1.0 MB', uploadedAt:'2021-09-01', uploader:'HR Office',         version:1 },
    { code:'HC-ADM-0021', cat:'CV',                title:'CV — Bethlehem Girma',                             size:'0.6 MB', uploadedAt:'2024-05-01', uploader:'Bethlehem Girma',   version:1 },
    { code:'HC-ADM-0021', cat:'CONTRACT',          title:'Probationary Contract — Bethlehem Girma',           size:'0.9 MB', uploadedAt:'2024-05-01', uploader:'HR Office',         version:1 },
    { code:'HC-FIN-0012', cat:'PERFORMANCE_REPORT',title:'H1 2024 Performance Review — Selamawit Desta',     size:'0.4 MB', uploadedAt:'2024-07-10', uploader:'Tigist Haile',      version:1 },
    { code:'HC-INF-0034', cat:'CONTRACT',          title:'Fixed-Term Contract — Naol Bekele',                size:'1.0 MB', uploadedAt:'2024-01-15', uploader:'HR Office',         version:1 },
    { code:'HC-FAC-0042', cat:'CERTIFICATE',       title:'PhD Certificate — Dr. Natnael Bekele',              size:'2.1 MB', uploadedAt:'2016-09-01', uploader:'Dr. Natnael Bekele',version:1 },
    { code:'HC-FAC-0072', cat:'LEAVE_DOCUMENT',    title:'Leave Approval — Yohannes Girma (Research)',        size:'0.3 MB', uploadedAt:'2024-07-12', uploader:'Tigist Haile',      version:1 },
  ];
  for (const d of docsData) {
    await prisma.hRDocument.create({
      data: {
        employeeId: empMap[d.code]!, category: d.cat as any, title: d.title,
        fileSize: d.size, uploadedByName: d.uploader, version: d.version,
        uploadedAt: new Date(d.uploadedAt),
      },
    });
  }
  console.log('  ✓ Documents');

  // ── 8. Onboarding ────────────────────────────────────────────────────────
  const obRec = await prisma.hROnboardingRecord.upsert({
    where:  { employeeId: empMap['HC-ADM-0021']! },
    update: { currentStep: 4, status: 'IN_PROGRESS' },
    create: { employeeId: empMap['HC-ADM-0021']!, currentStep: 4, status: 'IN_PROGRESS', startedAt: new Date('2024-05-01') },
  });
  const obSteps = [
    { key:'personal_info',      label:'Personal Information', completed:true,  order:0 },
    { key:'employment_details', label:'Employment Details',   completed:true,  order:1 },
    { key:'contract',           label:'Contract',             completed:true,  order:2 },
    { key:'salary',             label:'Salary & Benefits',    completed:true,  order:3 },
    { key:'benefits',           label:'Benefits',             completed:false, order:4 },
    { key:'documents',          label:'Documents',            completed:false, order:5 },
    { key:'review',             label:'Review & Submit',      completed:false, order:6 },
  ];
  for (const s of obSteps) {
    await prisma.hROnboardingStep.upsert({
      where:  { recordId_stepKey: { recordId: obRec.id, stepKey: s.key } },
      update: { completed: s.completed },
      create: { recordId: obRec.id, stepKey: s.key, label: s.label, completed: s.completed, orderIndex: s.order },
    });
  }

  // Offboarding
  const offRec = await prisma.hROffboardingRecord.upsert({
    where:  { employeeId: empMap['HC-SEC-0018']! },
    update: {},
    create: {
      employeeId: empMap['HC-SEC-0018']!, lastWorkingDay: new Date('2024-06-30'),
      exitReason: 'RESIGNATION', currentStep: 5, status: 'COMPLETED',
    },
  });
  await prisma.hRAssetCheckItem.deleteMany({ where: { recordId: offRec.id } });
  for (const item of [['Laptop',true],['ID Card',true],['Access Card',true],['Office Keys',true]] as [string,boolean][]) {
    await prisma.hRAssetCheckItem.create({ data: { recordId: offRec.id, item: item[0], returned: item[1] } });
  }
  console.log('  ✓ Onboarding / Offboarding');

  // ── 9. Audit log ─────────────────────────────────────────────────────────
  const auditData = [
    { date:'2024-07-26T14:05:00Z', action:'Payroll Reviewed',        empName:'All Staff',       module:'Payroll',     actor:'Selamawit Desta', desc:'July 2024 payroll reviewed and forwarded to HR for final approval.',  status:'SUCCESS' },
    { date:'2024-07-25T09:00:00Z', action:'Payroll Generated',       empName:'All Staff',       module:'Payroll',     actor:'System',          desc:'July 2024 payroll auto-generated for 19 active employees.',          status:'SUCCESS' },
    { date:'2024-07-22T11:30:00Z', action:'Leave Request Submitted', empName:'Abel Tesfaye',    module:'Leave',       actor:'Abel Tesfaye',    desc:'5-day annual leave submitted for Aug 26–30.',                        status:'SUCCESS' },
    { date:'2024-07-21T10:15:00Z', action:'Leave Request Submitted', empName:'Daniel Osei',     module:'Leave',       actor:'Daniel Osei',     desc:'5-day annual leave submitted for Aug 10–14.',                        status:'SUCCESS' },
    { date:'2024-07-20T09:00:00Z', action:'Leave Request Submitted', empName:'Rahel Solomon',   module:'Leave',       actor:'Rahel Solomon',   desc:'5-day annual leave submitted for Jul 29 – Aug 2.',                   status:'SUCCESS' },
    { date:'2024-07-19T09:30:00Z', action:'Leave Request Submitted', empName:'Meron Tadesse',   module:'Leave',       actor:'Meron Tadesse',   desc:'10-day sick leave submitted for Jul 22–31.',                         status:'WARNING' },
    { date:'2024-07-15T08:10:00Z', action:'Contract Alert Triggered',empName:'Meron Tadesse',   module:'Employees',   actor:'System',          desc:'Contract expiry alert — expires Aug 31, 2024.',                      status:'WARNING' },
    { date:'2024-07-14T14:20:00Z', action:'Leave Approved',          empName:'Bethlehem Girma', module:'Leave',       actor:'Tigist Haile',    desc:'2-day emergency leave approved.',                                    status:'SUCCESS' },
    { date:'2024-07-12T10:00:00Z', action:'Leave Approved',          empName:'Yohannes Girma',  module:'Leave',       actor:'Tigist Haile',    desc:'14-day research conference leave approved.',                         status:'SUCCESS' },
    { date:'2024-07-10T11:20:00Z', action:'Performance Review Completed', empName:'Marcus Vance', module:'Performance', actor:'Natnael Bekele', desc:'H1 2024 semi-annual review completed — score: 4.5/5.',            status:'SUCCESS' },
    { date:'2024-07-09T15:00:00Z', action:'Document Uploaded',       empName:'Selamawit Desta', module:'Documents',   actor:'Tigist Haile',    desc:'H1 2024 performance report uploaded.',                               status:'SUCCESS' },
    { date:'2024-07-06T09:45:00Z', action:'Leave Rejected',          empName:'Samuel Teklu',    module:'Leave',       actor:'Tigist Haile',    desc:'Annual leave rejected — critical intake period.',                    status:'FAILED'  },
  ];
  for (const a of auditData) {
    await prisma.hRAuditLog.create({
      data: { actorName: a.actor, action: a.action, employeeName: a.empName, module: a.module, description: a.desc, status: a.status as any, createdAt: new Date(a.date) },
    });
  }
  console.log('  ✓ Audit log');

  // ── 10. HR Notifications ─────────────────────────────────────────────────
  // Find the HR officer User to set recipientUserId
  // We use a placeholder — in production this would be the actual User.id
  const hrUser = await prisma.user.findFirst({ where: { role: 'HR_OFFICER' }, select: { id: true } });
  const recipientId = hrUser?.id ?? 'hr-officer-placeholder';

  const notifData = [
    { empCode:'HC-FAC-0055', type:'PAYROLL',     title:'Payroll Awaiting HR Approval',          message:'July 2024 payroll has been reviewed by Finance. Your final approval is required to release payslips.', tab:'payroll',     read:false, createdAt:'2024-07-26T14:00:00Z' },
    { empCode:'HC-FAC-0055', type:'LEAVE',       title:'Leave Request: Dr. Meron Tadesse',       message:'10-day sick leave request submitted. Manager has approved. Awaiting HR decision.',                       tab:'leave',       read:false, createdAt:'2024-07-19T09:00:00Z' },
    { empCode:'HC-FAC-0033', type:'LEAVE',       title:'Leave Request: Mr. Daniel Osei',         message:'5-day annual leave request for Aug 10–14. Manager approved. Awaiting HR decision.',                      tab:'leave',       read:false, createdAt:'2024-07-21T11:00:00Z' },
    { empCode:'HC-FAC-0055', type:'CONTRACT',    title:'Contract Expiring: Dr. Meron Tadesse',   message:'Employment contract for Dr. Meron Tadesse expires on Aug 31, 2024. Renewal action required.',            tab:'employees',   read:false, createdAt:'2024-07-15T08:00:00Z' },
    { empCode:'HC-INF-0034', type:'CONTRACT',    title:'Contract Expiring: Naol Bekele',          message:'Fixed-term contract for Naol Bekele expires Dec 31, 2024. Review and renewal due within 60 days.',       tab:'employees',   read:true,  createdAt:'2024-07-14T08:00:00Z' },
    { empCode:'HC-FAC-0055', type:'PERFORMANCE', title:'Performance Review Overdue: Dr. Meron Tadesse', message:'H1 2024 semi-annual performance review is overdue (due Jul 10). Immediate action required.',      tab:'performance', read:false, createdAt:'2024-07-11T08:00:00Z' },
    { empCode:'HC-ADM-0021', type:'ONBOARDING',  title:'Onboarding: Bethlehem Girma',            message:'New HR Officer Bethlehem Girma onboarding is 60% complete. Documents pending.',                          tab:'onboarding',  read:true,  createdAt:'2024-05-01T10:00:00Z' },
    { empCode:'HC-FAC-0088', type:'LEAVE',       title:'Leave Approved: Dr. Amina Okafor',        message:'Maternity leave for Dr. Amina Okafor (Sep 1 – Nov 30) approved by HR.',                                  tab:'leave',       read:true,  createdAt:'2024-07-02T11:00:00Z' },
  ];
  for (const n of notifData) {
    await prisma.hRNotification.create({
      data: {
        employeeId: empMap[n.empCode] ?? null,
        recipientUserId: recipientId, type: n.type as any,
        title: n.title, message: n.message, tab: n.tab,
        isRead: n.read, createdAt: new Date(n.createdAt),
      },
    });
  }
  console.log('  ✓ Notifications');

  console.log('✅  HR seed complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
