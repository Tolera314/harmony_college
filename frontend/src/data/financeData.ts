// ─────────────────────────────────────────────────────────────────────────────
// Harmony College — Finance Officer Shared Mock Dataset
// Single source of truth for all finance views.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  FOProfile, Department, Program, FinanceStudent, Transaction,
  Receipt, ReconciliationEntry, FONotification, FOAuditEntry,
  MonthlyRevenue, PaymentMethodBreakdown,
  DailyCollection, OutstandingTrend, InstallmentPlan,
} from '../types/finance';

// ── Finance Officer Profile ───────────────────────────────────────────────────
export const foProfile: FOProfile = {
  name: 'Ato Kebede Worku',
  title: 'Senior Finance Officer',
  department: 'Finance & Bursary Office',
  email: 'k.worku@harmony.edu',
  phone: '+251 (0)91 500 8844',
  officeRoom: 'Admin Building, Room 105',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  employeeId: 'HC-FIN-0007',
  academicYear: '2024–2025',
  currentSemester: 'Fall 2024',
};

// ── Departments ───────────────────────────────────────────────────────────────
export const departments: Department[] = [
  { id: 'd01', name: 'Photography & Visual Media', code: 'PHOTO', college: 'College of Arts & Creative Industries', headName: 'Ato Biruk Tadesse', studentCount: 280, totalRevenue: 4_200_000, outstandingBalance: 320_000 },
  { id: 'd02', name: 'Theatrical Art & Filmmaking', code: 'FILM', college: 'College of Arts & Creative Industries', headName: 'Dr. Natnael Bekele', studentCount: 312, totalRevenue: 4_680_000, outstandingBalance: 386_500 },
  { id: 'd03', name: 'Music & Cubase Production', code: 'MUSIC', college: 'College of Music & Performing Arts', headName: 'Prof. Sarah Jenkins', studentCount: 245, totalRevenue: 3_675_000, outstandingBalance: 290_000 },
  { id: 'd04', name: 'Graphic Design & Digital Marketing', code: 'DESIGN', college: 'College of Arts & Creative Industries', headName: 'Dr. Tigist Haile', studentCount: 330, totalRevenue: 4_950_000, outstandingBalance: 410_000 },
  { id: 'd05', name: 'Journalism & Media', code: 'JOUR', college: 'College of Media & Communication', headName: 'Prof. James Adeyemi', studentCount: 198, totalRevenue: 2_970_000, outstandingBalance: 210_000 },
  { id: 'd06', name: 'Information Technology', code: 'IT', college: 'College of Technology', headName: 'Dr. Solomon Tesfaye', studentCount: 395, totalRevenue: 6_320_000, outstandingBalance: 441_000 },
  { id: 'd07', name: 'Languages', code: 'LANG', college: 'College of Liberal Arts', headName: 'W/ro Hana Tesfaye', studentCount: 155, totalRevenue: 1_860_000, outstandingBalance: 140_000 },
  { id: 'd08', name: 'Pharmacy', code: 'PHARM', college: 'College of Health Sciences', headName: 'Dr. Tigist Asnake', studentCount: 180, totalRevenue: 5_400_000, outstandingBalance: 380_000 },
];

// ── Programs ──────────────────────────────────────────────────────────────────
export const programs: Program[] = [
  { id: 'p01', name: 'Photography',              code: 'PHOTO',   departmentId: 'd01', level: 'Diploma',           durationYears: 2, annualTuition: 14_000 },
  { id: 'p02', name: 'Videography',              code: 'VIDEO',   departmentId: 'd01', level: 'Diploma',           durationYears: 2, annualTuition: 14_000 },
  { id: 'p03', name: 'Theatrical Art',           code: 'THEA',    departmentId: 'd02', level: 'Undergraduate',     durationYears: 4, annualTuition: 15_000 },
  { id: 'p04', name: 'Filmmaking',               code: 'FILM',    departmentId: 'd02', level: 'Undergraduate',     durationYears: 4, annualTuition: 15_000 },
  { id: 'p05', name: 'Music Instruments',        code: 'MUSIC',   departmentId: 'd03', level: 'Diploma',           durationYears: 2, annualTuition: 12_000 },
  { id: 'p06', name: 'Vocal Arts',               code: 'VOCAL',   departmentId: 'd03', level: 'Diploma',           durationYears: 2, annualTuition: 12_000 },
  { id: 'p07', name: 'Cubase Music Production',  code: 'CUBASE',  departmentId: 'd03', level: 'Diploma',           durationYears: 2, annualTuition: 13_000 },
  { id: 'p08', name: 'Graphic Design',           code: 'GDES',    departmentId: 'd04', level: 'Diploma',           durationYears: 2, annualTuition: 14_000 },
  { id: 'p09', name: 'Digital Marketing',        code: 'DMARK',   departmentId: 'd04', level: 'Diploma',           durationYears: 2, annualTuition: 13_000 },
  { id: 'p10', name: 'Journalism',               code: 'JOUR',    departmentId: 'd05', level: 'Undergraduate',     durationYears: 4, annualTuition: 14_500 },
  { id: 'p11', name: 'Information Technology',   code: 'IT',      departmentId: 'd06', level: 'Undergraduate',     durationYears: 4, annualTuition: 16_000 },
  { id: 'p12', name: 'Languages',                code: 'LANG',    departmentId: 'd07', level: 'Diploma',           durationYears: 1, annualTuition: 8_000  },
  { id: 'p13', name: 'Pharmacy',                 code: 'PHARM',   departmentId: 'd08', level: 'Undergraduate',     durationYears: 4, annualTuition: 22_000 },
];

// ── Finance Students (20) ─────────────────────────────────────────────────────
export const financeStudents: FinanceStudent[] = [
  { id:'fs01',name:'Selam Alemayehu',studentId:'HC-2024-8832',avatar:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',email:'selam.a@harmony.edu',phone:'+251 911 200 001',programId:'p01',programName:'BA Theatrical Art & Digital Media',departmentId:'d01',departmentName:'Theatrical Art & Digital Media',year:4,semester:'Fall 2024',tuition:15_000,adminFees:1_200,labFees:800,libraryFines:0,otherCharges:0,scholarshipDiscount:3_000,totalCharged:14_000,totalPaid:14_000,outstanding:0,paymentStatus:'Paid',riskLevel:'Low',daysOverdue:0,lastPaymentDate:'2024-09-05',installmentPlan:false },
  { id:'fs02',name:'Biruk Teshome',studentId:'HC-2023-7641',avatar:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',email:'biruk.t@harmony.edu',phone:'+251 911 200 002',programId:'p01',programName:'BA Theatrical Art & Digital Media',departmentId:'d01',departmentName:'Theatrical Art & Digital Media',year:3,semester:'Fall 2024',tuition:15_000,adminFees:1_200,labFees:800,libraryFines:150,otherCharges:0,scholarshipDiscount:0,totalCharged:17_150,totalPaid:10_000,outstanding:7_150,paymentStatus:'Partial',riskLevel:'Medium',daysOverdue:18,lastPaymentDate:'2024-09-20',installmentPlan:true },
  { id:'fs03',name:'Hana Wolde',studentId:'HC-2024-9001',avatar:'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80',email:'hana.w@harmony.edu',phone:'+251 911 200 003',programId:'p02',programName:'BA Broadcast Journalism',departmentId:'d01',departmentName:'Theatrical Art & Digital Media',year:2,semester:'Fall 2024',tuition:14_500,adminFees:1_200,labFees:600,libraryFines:0,otherCharges:0,scholarshipDiscount:0,totalCharged:16_300,totalPaid:16_300,outstanding:0,paymentStatus:'Paid',riskLevel:'Low',daysOverdue:0,lastPaymentDate:'2024-09-02',installmentPlan:false },
  { id:'fs04',name:'Yonas Kebede',studentId:'HC-2022-5520',avatar:'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=300&q=80',email:'yonas.k@harmony.edu',phone:'+251 911 200 004',programId:'p03',programName:'BA Business Administration',departmentId:'d02',departmentName:'Business Administration',year:4,semester:'Fall 2024',tuition:15_000,adminFees:1_200,labFees:0,libraryFines:500,otherCharges:300,scholarshipDiscount:0,totalCharged:17_000,totalPaid:4_500,outstanding:12_500,paymentStatus:'Overdue',riskLevel:'Critical',daysOverdue:45,lastPaymentDate:'2024-08-10',installmentPlan:false,notes:'Repeated late payment. Sent 3 reminders.' },
  { id:'fs05',name:'Liya Girma',studentId:'HC-2025-1122',avatar:'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=300&q=80',email:'liya.g@harmony.edu',phone:'+251 911 200 005',programId:'p05',programName:'BSc Information Technology',departmentId:'d03',departmentName:'Information Technology',year:1,semester:'Fall 2024',tuition:16_000,adminFees:1_500,labFees:1_200,libraryFines:0,otherCharges:0,scholarshipDiscount:2_000,totalCharged:16_700,totalPaid:16_700,outstanding:0,paymentStatus:'Paid',riskLevel:'Low',daysOverdue:0,lastPaymentDate:'2024-09-01',installmentPlan:false },
  { id:'fs06',name:'Dawit Mekonnen',studentId:'HC-2023-7200',avatar:'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',email:'dawit.m@harmony.edu',phone:'+251 911 200 006',programId:'p05',programName:'BSc Information Technology',departmentId:'d03',departmentName:'Information Technology',year:3,semester:'Fall 2024',tuition:16_000,adminFees:1_500,labFees:1_200,libraryFines:200,otherCharges:0,scholarshipDiscount:0,totalCharged:18_900,totalPaid:9_450,outstanding:9_450,paymentStatus:'Partial',riskLevel:'High',daysOverdue:30,lastPaymentDate:'2024-09-15',installmentPlan:true },
  { id:'fs07',name:'Feven Hailu',studentId:'HC-2024-8510',avatar:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',email:'feven.h@harmony.edu',phone:'+251 911 200 007',programId:'p07',programName:'BSc Public Health',departmentId:'d04',departmentName:'Health Sciences',year:2,semester:'Fall 2024',tuition:22_000,adminFees:1_800,labFees:2_000,libraryFines:0,otherCharges:0,scholarshipDiscount:5_000,totalCharged:20_800,totalPaid:20_800,outstanding:0,paymentStatus:'Paid',riskLevel:'Low',daysOverdue:0,lastPaymentDate:'2024-09-03',installmentPlan:false },
  { id:'fs08',name:'Robel Bekele',studentId:'HC-2022-5130',avatar:'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',email:'robel.b@harmony.edu',phone:'+251 911 200 008',programId:'p09',programName:'LLB Law',departmentId:'d05',departmentName:'Law & Governance',year:4,semester:'Fall 2024',tuition:18_000,adminFees:1_500,labFees:0,libraryFines:0,otherCharges:0,scholarshipDiscount:0,totalCharged:19_500,totalPaid:19_500,outstanding:0,paymentStatus:'Paid',riskLevel:'Low',daysOverdue:0,lastPaymentDate:'2024-09-08',installmentPlan:false },
  { id:'fs09',name:'Mekdes Alemu',studentId:'HC-2023-6955',avatar:'https://images.unsplash.com/photo-1535468850893-d6e543fbd7f5?auto=format&fit=crop&w=300&q=80',email:'mekdes.a@harmony.edu',phone:'+251 911 200 009',programId:'p11',programName:'BSc Architecture',departmentId:'d06',departmentName:'Architecture & Built Environment',year:3,semester:'Fall 2024',tuition:20_000,adminFees:1_800,labFees:1_500,libraryFines:300,otherCharges:0,scholarshipDiscount:0,totalCharged:23_600,totalPaid:11_800,outstanding:11_800,paymentStatus:'Partial',riskLevel:'High',daysOverdue:22,lastPaymentDate:'2024-09-25',installmentPlan:true },
  { id:'fs10',name:'Abel Tesfaye',studentId:'HC-2025-1340',avatar:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',email:'abel.t@harmony.edu',phone:'+251 911 200 010',programId:'p06',programName:'BSc Computer Science',departmentId:'d03',departmentName:'Information Technology',year:1,semester:'Fall 2024',tuition:16_000,adminFees:1_500,labFees:1_200,libraryFines:0,otherCharges:0,scholarshipDiscount:0,totalCharged:18_700,totalPaid:18_700,outstanding:0,paymentStatus:'Paid',riskLevel:'Low',daysOverdue:0,lastPaymentDate:'2024-09-04',installmentPlan:false },
  { id:'fs11',name:'Selamawit Desta',studentId:'HC-2022-4980',avatar:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',email:'selamawit.d@harmony.edu',phone:'+251 911 200 011',programId:'p04',programName:'MBA',departmentId:'d02',departmentName:'Business Administration',year:2,semester:'Fall 2024',tuition:22_000,adminFees:2_000,labFees:0,libraryFines:0,otherCharges:500,scholarshipDiscount:0,totalCharged:24_500,totalPaid:24_500,outstanding:0,paymentStatus:'Paid',riskLevel:'Low',daysOverdue:0,lastPaymentDate:'2024-09-06',installmentPlan:false },
  { id:'fs12',name:'Henok Mulugeta',studentId:'HC-2024-8761',avatar:'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',email:'henok.m@harmony.edu',phone:'+251 911 200 012',programId:'p08',programName:'BSc Nursing',departmentId:'d04',departmentName:'Health Sciences',year:2,semester:'Fall 2024',tuition:22_000,adminFees:1_800,labFees:2_500,libraryFines:0,otherCharges:0,scholarshipDiscount:3_000,totalCharged:23_300,totalPaid:0,outstanding:23_300,paymentStatus:'Unpaid',riskLevel:'Critical',daysOverdue:55,lastPaymentDate:null,installmentPlan:false,notes:'No payment received this semester. Student on academic hold.' },
  { id:'fs13',name:'Tigist Worku',studentId:'HC-2023-7388',avatar:'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80',email:'tigist.w@harmony.edu',phone:'+251 911 200 013',programId:'p03',programName:'BA Business Administration',departmentId:'d02',departmentName:'Business Administration',year:3,semester:'Fall 2024',tuition:15_000,adminFees:1_200,labFees:0,libraryFines:100,otherCharges:0,scholarshipDiscount:1_500,totalCharged:14_800,totalPaid:14_800,outstanding:0,paymentStatus:'Paid',riskLevel:'Low',daysOverdue:0,lastPaymentDate:'2024-09-10',installmentPlan:false },
  { id:'fs14',name:'Ezra Habtamu',studentId:'HC-2025-1290',avatar:'https://images.unsplash.com/photo-1590086782957-93c06ef21604?auto=format&fit=crop&w=300&q=80',email:'ezra.h@harmony.edu',phone:'+251 911 200 014',programId:'p09',programName:'LLB Law',departmentId:'d05',departmentName:'Law & Governance',year:1,semester:'Fall 2024',tuition:18_000,adminFees:1_500,labFees:0,libraryFines:0,otherCharges:0,scholarshipDiscount:0,totalCharged:19_500,totalPaid:10_000,outstanding:9_500,paymentStatus:'Partial',riskLevel:'Medium',daysOverdue:12,lastPaymentDate:'2024-10-01',installmentPlan:true },
  { id:'fs15',name:'Bethlehem Girma',studentId:'HC-2022-5060',avatar:'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=300&q=80',email:'bethlehem.g@harmony.edu',phone:'+251 911 200 015',programId:'p07',programName:'BSc Public Health',departmentId:'d04',departmentName:'Health Sciences',year:4,semester:'Fall 2024',tuition:22_000,adminFees:1_800,labFees:2_000,libraryFines:0,otherCharges:0,scholarshipDiscount:4_000,totalCharged:21_800,totalPaid:21_800,outstanding:0,paymentStatus:'Paid',riskLevel:'Low',daysOverdue:0,lastPaymentDate:'2024-09-07',installmentPlan:false },
  { id:'fs16',name:'Samuel Teklu',studentId:'HC-2023-7050',avatar:'https://images.unsplash.com/photo-1542178243-bc20204b769f?auto=format&fit=crop&w=300&q=80',email:'samuel.t@harmony.edu',phone:'+251 911 200 016',programId:'p11',programName:'BSc Architecture',departmentId:'d06',departmentName:'Architecture & Built Environment',year:3,semester:'Fall 2024',tuition:20_000,adminFees:1_800,labFees:1_500,libraryFines:450,otherCharges:0,scholarshipDiscount:0,totalCharged:23_750,totalPaid:0,outstanding:23_750,paymentStatus:'Overdue',riskLevel:'Critical',daysOverdue:62,lastPaymentDate:null,installmentPlan:false,notes:'Escalated to student affairs. Risk of semester deregistration.' },
  { id:'fs17',name:'Mahlet Tafesse',studentId:'HC-2024-8400',avatar:'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',email:'mahlet.t@harmony.edu',phone:'+251 911 200 017',programId:'p01',programName:'BA Theatrical Art & Digital Media',departmentId:'d01',departmentName:'Theatrical Art & Digital Media',year:2,semester:'Fall 2024',tuition:15_000,adminFees:1_200,labFees:800,libraryFines:0,otherCharges:0,scholarshipDiscount:0,totalCharged:17_000,totalPaid:17_000,outstanding:0,paymentStatus:'Paid',riskLevel:'Low',daysOverdue:0,lastPaymentDate:'2024-09-12',installmentPlan:false },
  { id:'fs18',name:'Naol Bekele',studentId:'HC-2025-1500',avatar:'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=300&q=80',email:'naol.b@harmony.edu',phone:'+251 911 200 018',programId:'p06',programName:'BSc Computer Science',departmentId:'d03',departmentName:'Information Technology',year:1,semester:'Fall 2024',tuition:16_000,adminFees:1_500,labFees:1_200,libraryFines:0,otherCharges:0,scholarshipDiscount:2_500,totalCharged:16_200,totalPaid:8_100,outstanding:8_100,paymentStatus:'Partial',riskLevel:'Medium',daysOverdue:8,lastPaymentDate:'2024-10-05',installmentPlan:true },
  { id:'fs19',name:'Tsehay Alemu',studentId:'HC-2022-4800',avatar:'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&q=80',email:'tsehay.a@harmony.edu',phone:'+251 911 200 019',programId:'p10',programName:'MA Public Policy',departmentId:'d05',departmentName:'Law & Governance',year:2,semester:'Fall 2024',tuition:20_000,adminFees:1_800,labFees:0,libraryFines:0,otherCharges:0,scholarshipDiscount:0,totalCharged:21_800,totalPaid:21_800,outstanding:0,paymentStatus:'Paid',riskLevel:'Low',daysOverdue:0,lastPaymentDate:'2024-09-09',installmentPlan:false },
  { id:'fs20',name:'Abebe Tesfaye',studentId:'HC-2023-6700',avatar:'https://images.unsplash.com/photo-1528892952291-009c663ce843?auto=format&fit=crop&w=300&q=80',email:'abebe.t@harmony.edu',phone:'+251 911 200 020',programId:'p12',programName:'Diploma Interior Design',departmentId:'d06',departmentName:'Architecture & Built Environment',year:2,semester:'Fall 2024',tuition:12_000,adminFees:1_000,labFees:800,libraryFines:0,otherCharges:0,scholarshipDiscount:0,totalCharged:13_800,totalPaid:6_900,outstanding:6_900,paymentStatus:'Partial',riskLevel:'High',daysOverdue:35,lastPaymentDate:'2024-09-18',installmentPlan:true },
];

// ── Transactions (42 detailed + loop-generated historical) ────────────────────
function makeTxn(id:string,studentId:string,studentName:string,programName:string,type:Transaction['type'],description:string,amount:number,paymentMethod:Transaction['paymentMethod'],referenceNumber:string,receiptId:string|null,cashierId:string,cashierName:string,date:string,time:string,status:Transaction['status']='Completed',gatewayTxnId?:string):Transaction{
  return{id,studentId,studentName,studentProgramName:programName,type,description,amount,paymentMethod,referenceNumber,receiptId,cashierId,cashierName,date,time,status,gatewayTxnId};
}

export const transactions: Transaction[] = [
  makeTxn('tx001','fs01','Selam Alemayehu','BA Theatrical Art & Digital Media','Tuition','Semester tuition — Fall 2024',12_000,'Bank Transfer','BT-HC-10001','rc001','fin01','Ato Kebede Worku','2024-09-05','09:14'),
  makeTxn('tx002','fs01','Selam Alemayehu','BA Theatrical Art & Digital Media','Fee','Administrative & lab fees',2_000,'Cash','CASH-10002','rc002','fin01','Ato Kebede Worku','2024-09-05','09:22'),
  makeTxn('tx003','fs01','Selam Alemayehu','BA Theatrical Art & Digital Media','Scholarship','Merit scholarship credit',-3_000,'Bank Transfer','SCH-10001',null,'fin01','Ato Kebede Worku','2024-09-04','11:00'),
  makeTxn('tx004','fs02','Biruk Teshome','BA Theatrical Art & Digital Media','Tuition','First installment — Fall 2024',6_000,'Telebirr','TLB-20041','rc003','fin01','Ato Kebede Worku','2024-09-20','14:05'),
  makeTxn('tx005','fs02','Biruk Teshome','BA Theatrical Art & Digital Media','Tuition','Second installment',4_000,'Telebirr','TLB-20088','rc004','fin01','Ato Kebede Worku','2024-10-10','10:30'),
  makeTxn('tx006','fs02','Biruk Teshome','BA Theatrical Art & Digital Media','Fine','Library fine — overdue books',150,'Cash','CASH-10050',null,'fin01','Ato Kebede Worku','2024-09-18','16:00'),
  makeTxn('tx007','fs03','Hana Wolde','BA Broadcast Journalism','Tuition','Full tuition — Fall 2024',14_500,'Chapa','CHP-30011','rc005','fin02','W/t Meron Alemu','2024-09-02','08:45'),
  makeTxn('tx008','fs03','Hana Wolde','BA Broadcast Journalism','Fee','Administrative fees',1_200,'Chapa','CHP-30012','rc006','fin02','W/t Meron Alemu','2024-09-02','08:50'),
  makeTxn('tx009','fs03','Hana Wolde','BA Broadcast Journalism','Fee','Lab fees',600,'Chapa','CHP-30013','rc007','fin02','W/t Meron Alemu','2024-09-02','08:55'),
  makeTxn('tx010','fs04','Yonas Kebede','BA Business Administration','Tuition','Partial tuition payment',4_000,'Cash','CASH-10099','rc008','fin01','Ato Kebede Worku','2024-08-10','11:20'),
  makeTxn('tx011','fs04','Yonas Kebede','BA Business Administration','Fine','Library fines',500,'Cash','CASH-10100',null,'fin01','Ato Kebede Worku','2024-09-01','15:30'),
  makeTxn('tx012','fs04','Yonas Kebede','BA Business Administration','Fee','Miscellaneous charges',300,'Cash','CASH-10101',null,'fin01','Ato Kebede Worku','2024-09-01','15:35'),
  makeTxn('tx013','fs05','Liya Girma','BSc Information Technology','Tuition','Full tuition — Fall 2024',16_000,'Bank Transfer','BT-HC-10020','rc009','fin02','W/t Meron Alemu','2024-09-01','10:00'),
  makeTxn('tx014','fs05','Liya Girma','BSc Information Technology','Fee','Administrative & lab fees',2_700,'Bank Transfer','BT-HC-10021','rc010','fin02','W/t Meron Alemu','2024-09-01','10:05'),
  makeTxn('tx015','fs05','Liya Girma','BSc Information Technology','Scholarship','Need-based scholarship',-2_000,'Bank Transfer','SCH-10005',null,'fin02','W/t Meron Alemu','2024-08-31','14:00'),
  makeTxn('tx016','fs06','Dawit Mekonnen','BSc Information Technology','Tuition','First installment',9_450,'Telebirr','TLB-20110','rc011','fin01','Ato Kebede Worku','2024-09-15','09:30'),
  makeTxn('tx017','fs06','Dawit Mekonnen','BSc Information Technology','Fine','Library fine',200,'Cash','CASH-10120',null,'fin01','Ato Kebede Worku','2024-09-14','16:10'),
  makeTxn('tx018','fs07','Feven Hailu','BSc Public Health','Tuition','Full tuition payment',22_000,'Bank Transfer','BT-HC-10035','rc012','fin02','W/t Meron Alemu','2024-09-03','08:00'),
  makeTxn('tx019','fs07','Feven Hailu','BSc Public Health','Fee','Admin + lab fees',3_800,'Bank Transfer','BT-HC-10036','rc013','fin02','W/t Meron Alemu','2024-09-03','08:10'),
  makeTxn('tx020','fs07','Feven Hailu','BSc Public Health','Scholarship','Health sciences bursary',-5_000,'Bank Transfer','SCH-10010',null,'fin02','W/t Meron Alemu','2024-09-02','14:00'),
  makeTxn('tx021','fs08','Robel Bekele','LLB Law','Tuition','Full tuition — Fall 2024',18_000,'Chapa','CHP-30050','rc014','fin01','Ato Kebede Worku','2024-09-08','11:45'),
  makeTxn('tx022','fs08','Robel Bekele','LLB Law','Fee','Administrative fees',1_500,'Chapa','CHP-30051','rc015','fin01','Ato Kebede Worku','2024-09-08','11:50'),
  makeTxn('tx023','fs09','Mekdes Alemu','BSc Architecture','Tuition','First installment',11_800,'Bank Transfer','BT-HC-10044','rc016','fin02','W/t Meron Alemu','2024-09-25','10:15'),
  makeTxn('tx024','fs09','Mekdes Alemu','BSc Architecture','Fine','Library fine',300,'Cash','CASH-10130',null,'fin02','W/t Meron Alemu','2024-09-24','15:00'),
  makeTxn('tx025','fs10','Abel Tesfaye','BSc Computer Science','Tuition','Full tuition — Fall 2024',16_000,'Bank Transfer','BT-HC-10055','rc017','fin01','Ato Kebede Worku','2024-09-04','09:00'),
  makeTxn('tx026','fs10','Abel Tesfaye','BSc Computer Science','Fee','Admin + lab fees',2_700,'Bank Transfer','BT-HC-10056','rc018','fin01','Ato Kebede Worku','2024-09-04','09:05'),
  makeTxn('tx027','fs11','Selamawit Desta','MBA','Tuition','Full MBA tuition',22_000,'Bank Transfer','BT-HC-10060','rc019','fin01','Ato Kebede Worku','2024-09-06','10:30'),
  makeTxn('tx028','fs11','Selamawit Desta','MBA','Fee','Admin fees + misc',2_500,'Bank Transfer','BT-HC-10061','rc020','fin01','Ato Kebede Worku','2024-09-06','10:35'),
  makeTxn('tx029','fs13','Tigist Worku','BA Business Administration','Tuition','Tuition — Fall 2024',13_300,'Chapa','CHP-30080','rc021','fin02','W/t Meron Alemu','2024-09-10','14:00'),
  makeTxn('tx030','fs13','Tigist Worku','BA Business Administration','Fine','Library fine',100,'Cash','CASH-10150',null,'fin02','W/t Meron Alemu','2024-09-09','11:00'),
  makeTxn('tx031','fs13','Tigist Worku','BA Business Administration','Scholarship','Merit discount',-1_500,'Bank Transfer','SCH-10015',null,'fin02','W/t Meron Alemu','2024-09-08','14:00'),
  makeTxn('tx032','fs14','Ezra Habtamu','LLB Law','Tuition','First installment',10_000,'Telebirr','TLB-20200','rc022','fin01','Ato Kebede Worku','2024-10-01','09:00'),
  makeTxn('tx033','fs15','Bethlehem Girma','BSc Public Health','Tuition','Full tuition',22_000,'Bank Transfer','BT-HC-10070','rc023','fin01','Ato Kebede Worku','2024-09-07','08:30'),
  makeTxn('tx034','fs15','Bethlehem Girma','BSc Public Health','Fee','Admin + lab fees',3_800,'Bank Transfer','BT-HC-10071','rc024','fin01','Ato Kebede Worku','2024-09-07','08:35'),
  makeTxn('tx035','fs15','Bethlehem Girma','BSc Public Health','Scholarship','Bursary award',-4_000,'Bank Transfer','SCH-10020',null,'fin01','Ato Kebede Worku','2024-09-06','14:00'),
  makeTxn('tx036','fs17','Mahlet Tafesse','BA Theatrical Art & Digital Media','Tuition','Full tuition',15_000,'Chapa','CHP-30100','rc025','fin02','W/t Meron Alemu','2024-09-12','11:00'),
  makeTxn('tx037','fs17','Mahlet Tafesse','BA Theatrical Art & Digital Media','Fee','Admin + lab fees',2_000,'Chapa','CHP-30101','rc026','fin02','W/t Meron Alemu','2024-09-12','11:05'),
  makeTxn('tx038','fs18','Naol Bekele','BSc Computer Science','Tuition','First installment',8_100,'Bank Transfer','BT-HC-10080','rc027','fin01','Ato Kebede Worku','2024-10-05','10:00'),
  makeTxn('tx039','fs18','Naol Bekele','BSc Computer Science','Scholarship','Partial scholarship',-2_500,'Bank Transfer','SCH-10025',null,'fin01','Ato Kebede Worku','2024-10-04','14:00'),
  makeTxn('tx040','fs19','Tsehay Alemu','MA Public Policy','Tuition','Full tuition',20_000,'Bank Transfer','BT-HC-10085','rc028','fin01','Ato Kebede Worku','2024-09-09','09:00'),
  makeTxn('tx041','fs19','Tsehay Alemu','MA Public Policy','Fee','Admin fees',1_800,'Bank Transfer','BT-HC-10086','rc029','fin01','Ato Kebede Worku','2024-09-09','09:05'),
  makeTxn('tx042','fs20','Abebe Tesfaye','Diploma Interior Design','Tuition','First installment',6_900,'Telebirr','TLB-20250','rc030','fin02','W/t Meron Alemu','2024-09-18','13:30'),
];

// Historical transactions (bulk generated — months Jun/Jul/Aug)
(function generateHistorical(){
  const students=financeStudents;
  const methods:Transaction['paymentMethod'][]=['Cash','Bank Transfer','Telebirr','Chapa'];
  const types:Transaction['type'][]=['Tuition','Fee','Fine','Installment'];
  const months=['2024-06','2024-07','2024-08'];
  for(let i=43;i<=250;i++){
    const s=students[(i-1)%20];
    const month=months[Math.floor((i-43)/70)]||'2024-08';
    const day=String(1+(i%28)).padStart(2,'0');
    const method=methods[i%4];
    const type=types[i%4];
    const amts={Tuition:3_000+(i%5)*1_000,Fee:500+(i%3)*200,Fine:50+(i%5)*50,Installment:2_000+(i%4)*500,Scholarship:0,Refund:0};
    const pfx={Cash:'CASH','Bank Transfer':'BT-HC',Telebirr:'TLB',Chapa:'CHP'};
    const cashier=i%2===0?'fin01':'fin02';
    const cashierName=i%2===0?'Ato Kebede Worku':'W/t Meron Alemu';
    const rid=type!=='Fine'&&type!=='Scholarship'?`rc${String(30+i).padStart(3,'0')}`:null;
    transactions.push(makeTxn(
      `tx${String(i).padStart(3,'0')}`,s.id,s.name,s.programName,type,
      `${type} — historical`,amts[type],method,`${pfx[method]}-${10000+i}`,
      rid,cashier,cashierName,`${month}-${day}`,
      `${9+(i%8)}:${String((i*7)%60).padStart(2,'0')}`
    ));
  }
})();

// ── Receipts (10 detailed + 110 generated) ────────────────────────────────────
export const receipts: Receipt[] = [
  { id:'rc001',receiptNumber:'HC-RCP-2024-001',studentId:'fs01',studentName:'Selam Alemayehu',studentProgramName:'BA Theatrical Art & Digital Media',amount:12_000,paymentMethod:'Bank Transfer',referenceNumber:'BT-HC-10001',cashierId:'fin01',cashierName:'Ato Kebede Worku',date:'2024-09-05',time:'09:14',description:'Semester tuition payment — Fall 2024',items:[{label:'Tuition Fee',amount:12_000}],qrCode:'QR-HC-001',printed:true,shared:false },
  { id:'rc002',receiptNumber:'HC-RCP-2024-002',studentId:'fs01',studentName:'Selam Alemayehu',studentProgramName:'BA Theatrical Art & Digital Media',amount:2_000,paymentMethod:'Cash',referenceNumber:'CASH-10002',cashierId:'fin01',cashierName:'Ato Kebede Worku',date:'2024-09-05',time:'09:22',description:'Administrative and lab fees',items:[{label:'Administrative Fee',amount:1_200},{label:'Laboratory Fee',amount:800}],qrCode:'QR-HC-002',printed:true,shared:false },
  { id:'rc003',receiptNumber:'HC-RCP-2024-003',studentId:'fs02',studentName:'Biruk Teshome',studentProgramName:'BA Theatrical Art & Digital Media',amount:6_000,paymentMethod:'Telebirr',referenceNumber:'TLB-20041',cashierId:'fin01',cashierName:'Ato Kebede Worku',date:'2024-09-20',time:'14:05',description:'First installment — Fall 2024',items:[{label:'Tuition Installment 1/3',amount:6_000}],qrCode:'QR-HC-003',printed:false,shared:true },
  { id:'rc004',receiptNumber:'HC-RCP-2024-004',studentId:'fs02',studentName:'Biruk Teshome',studentProgramName:'BA Theatrical Art & Digital Media',amount:4_000,paymentMethod:'Telebirr',referenceNumber:'TLB-20088',cashierId:'fin01',cashierName:'Ato Kebede Worku',date:'2024-10-10',time:'10:30',description:'Second installment — Fall 2024',items:[{label:'Tuition Installment 2/3',amount:4_000}],qrCode:'QR-HC-004',printed:false,shared:false },
  { id:'rc005',receiptNumber:'HC-RCP-2024-005',studentId:'fs03',studentName:'Hana Wolde',studentProgramName:'BA Broadcast Journalism',amount:14_500,paymentMethod:'Chapa',referenceNumber:'CHP-30011',cashierId:'fin02',cashierName:'W/t Meron Alemu',date:'2024-09-02',time:'08:45',description:'Full tuition payment — Fall 2024',items:[{label:'Tuition Fee',amount:14_500}],qrCode:'QR-HC-005',printed:true,shared:true },
  { id:'rc006',receiptNumber:'HC-RCP-2024-006',studentId:'fs03',studentName:'Hana Wolde',studentProgramName:'BA Broadcast Journalism',amount:1_200,paymentMethod:'Chapa',referenceNumber:'CHP-30012',cashierId:'fin02',cashierName:'W/t Meron Alemu',date:'2024-09-02',time:'08:50',description:'Administrative fees',items:[{label:'Administrative Fee',amount:1_200}],qrCode:'QR-HC-006',printed:true,shared:false },
  { id:'rc007',receiptNumber:'HC-RCP-2024-007',studentId:'fs03',studentName:'Hana Wolde',studentProgramName:'BA Broadcast Journalism',amount:600,paymentMethod:'Chapa',referenceNumber:'CHP-30013',cashierId:'fin02',cashierName:'W/t Meron Alemu',date:'2024-09-02',time:'08:55',description:'Lab fees',items:[{label:'Laboratory Fee',amount:600}],qrCode:'QR-HC-007',printed:false,shared:false },
  { id:'rc008',receiptNumber:'HC-RCP-2024-008',studentId:'fs04',studentName:'Yonas Kebede',studentProgramName:'BA Business Administration',amount:4_000,paymentMethod:'Cash',referenceNumber:'CASH-10099',cashierId:'fin01',cashierName:'Ato Kebede Worku',date:'2024-08-10',time:'11:20',description:'Partial tuition payment',items:[{label:'Tuition (Partial)',amount:4_000}],qrCode:'QR-HC-008',printed:true,shared:false },
  { id:'rc009',receiptNumber:'HC-RCP-2024-009',studentId:'fs05',studentName:'Liya Girma',studentProgramName:'BSc Information Technology',amount:16_000,paymentMethod:'Bank Transfer',referenceNumber:'BT-HC-10020',cashierId:'fin02',cashierName:'W/t Meron Alemu',date:'2024-09-01',time:'10:00',description:'Full tuition — Fall 2024',items:[{label:'Tuition Fee',amount:16_000}],qrCode:'QR-HC-009',printed:true,shared:false },
  { id:'rc010',receiptNumber:'HC-RCP-2024-010',studentId:'fs05',studentName:'Liya Girma',studentProgramName:'BSc Information Technology',amount:2_700,paymentMethod:'Bank Transfer',referenceNumber:'BT-HC-10021',cashierId:'fin02',cashierName:'W/t Meron Alemu',date:'2024-09-01',time:'10:05',description:'Administrative & lab fees',items:[{label:'Administrative Fee',amount:1_500},{label:'Laboratory Fee',amount:1_200}],qrCode:'QR-HC-010',printed:true,shared:true },
];
// Generate receipts rc011–rc120
(function generateReceipts(){
  const students=financeStudents;
  const methods:Receipt['paymentMethod'][]=['Cash','Bank Transfer','Telebirr','Chapa'];
  const months=['2024-06','2024-07','2024-08','2024-09','2024-10'];
  for(let i=11;i<=120;i++){
    const s=students[(i-1)%20];
    const month=months[i%5];
    const day=String(1+(i%28)).padStart(2,'0');
    const method=methods[i%4];
    const amount=1_500+(i%10)*1_000;
    const pfx={Cash:'CASH','Bank Transfer':'BT-HC',Telebirr:'TLB',Chapa:'CHP'};
    receipts.push({
      id:`rc${String(i).padStart(3,'0')}`,
      receiptNumber:`HC-RCP-2024-${String(i).padStart(3,'0')}`,
      studentId:s.id,studentName:s.name,studentProgramName:s.programName,
      amount,paymentMethod:method,
      referenceNumber:`${pfx[method]}-${20000+i}`,
      cashierId:i%2===0?'fin01':'fin02',
      cashierName:i%2===0?'Ato Kebede Worku':'W/t Meron Alemu',
      date:`${month}-${day}`,time:`${9+(i%8)}:${String((i*7)%60).padStart(2,'0')}`,
      description:`Payment receipt — ${s.programName}`,
      items:[{label:'Payment',amount}],
      qrCode:`QR-HC-${String(i).padStart(3,'0')}`,
      printed:i%3!==0,shared:i%5===0,
    });
  }
})();

// ── Reconciliation Entries ────────────────────────────────────────────────────
export const reconciliationEntries: ReconciliationEntry[] = [
  {id:'re001',gatewayTxnId:'CHP-TXN-88441',studentId:'fs03',studentName:'Hana Wolde',source:'Chapa',amount:14_500,status:'Matched',date:'2024-09-02',time:'08:43',matchedReceiptId:'rc005'},
  {id:'re002',gatewayTxnId:'CHP-TXN-88442',studentId:'fs03',studentName:'Hana Wolde',source:'Chapa',amount:1_200,status:'Matched',date:'2024-09-02',time:'08:48',matchedReceiptId:'rc006'},
  {id:'re003',gatewayTxnId:'TLB-TXN-55210',studentId:'fs02',studentName:'Biruk Teshome',source:'Telebirr',amount:6_000,status:'Matched',date:'2024-09-20',time:'14:02',matchedReceiptId:'rc003'},
  {id:'re004',gatewayTxnId:'TLB-TXN-55211',studentId:'fs02',studentName:'Biruk Teshome',source:'Telebirr',amount:4_000,status:'Matched',date:'2024-10-10',time:'10:28',matchedReceiptId:'rc004'},
  {id:'re005',gatewayTxnId:'BNK-TXN-10200',studentId:'fs05',studentName:'Liya Girma',source:'Bank Transfer',amount:16_000,status:'Matched',date:'2024-09-01',time:'09:58',matchedReceiptId:'rc009'},
  {id:'re006',gatewayTxnId:'CHP-TXN-91100',studentId:null,studentName:null,source:'Chapa',amount:18_000,status:'Unmatched',date:'2024-10-12',time:'11:05',matchedReceiptId:null,failureReason:'Student ID not found in system. Reference: UNKNOWN-9900.'},
  {id:'re007',gatewayTxnId:'TLB-TXN-60030',studentId:null,studentName:null,source:'Telebirr',amount:7_500,status:'Unmatched',date:'2024-10-11',time:'09:20',matchedReceiptId:null,failureReason:'Duplicate transaction detected. Original: TLB-TXN-60029.'},
  {id:'re008',gatewayTxnId:'CHP-TXN-89900',studentId:'fs08',studentName:'Robel Bekele',source:'Chapa',amount:18_000,status:'Matched',date:'2024-09-08',time:'11:42',matchedReceiptId:'rc014'},
  {id:'re009',gatewayTxnId:'BNK-TXN-10500',studentId:'fs11',studentName:'Selamawit Desta',source:'Bank Transfer',amount:22_000,status:'Matched',date:'2024-09-06',time:'10:28',matchedReceiptId:'rc019'},
  {id:'re010',gatewayTxnId:'CHP-TXN-92000',studentId:null,studentName:null,source:'Chapa',amount:500,status:'Failed',date:'2024-10-13',time:'14:30',matchedReceiptId:null,failureReason:'Payment gateway timeout. Transaction rolled back.'},
  {id:'re011',gatewayTxnId:'TLB-TXN-61100',studentId:'fs06',studentName:'Dawit Mekonnen',source:'Telebirr',amount:9_450,status:'Matched',date:'2024-09-15',time:'09:28',matchedReceiptId:'rc011'},
  {id:'re012',gatewayTxnId:'BNK-TXN-10800',studentId:'fs15',studentName:'Bethlehem Girma',source:'Bank Transfer',amount:22_000,status:'Matched',date:'2024-09-07',time:'08:28',matchedReceiptId:'rc023'},
  {id:'re013',gatewayTxnId:'CHP-TXN-93400',studentId:null,studentName:null,source:'Chapa',amount:12_000,status:'Pending Review',date:'2024-10-14',time:'16:00',matchedReceiptId:null,reviewNotes:'Amount does not match any outstanding balance. Under manual review.'},
  {id:'re014',gatewayTxnId:'TLB-TXN-62000',studentId:'fs20',studentName:'Abebe Tesfaye',source:'Telebirr',amount:6_900,status:'Matched',date:'2024-09-18',time:'13:28',matchedReceiptId:'rc030'},
  {id:'re015',gatewayTxnId:'BNK-TXN-11000',studentId:'fs14',studentName:'Ezra Habtamu',source:'Bank Transfer',amount:10_000,status:'Matched',date:'2024-10-01',time:'08:58',matchedReceiptId:'rc022'},
  {id:'re016',gatewayTxnId:'CHP-TXN-94500',studentId:null,studentName:null,source:'Chapa',amount:3_200,status:'Unmatched',date:'2024-10-15',time:'10:45',matchedReceiptId:null,failureReason:'No matching student invoice. Possible wrong student ID entered.'},
  {id:'re017',gatewayTxnId:'TLB-TXN-63100',studentId:'fs18',studentName:'Naol Bekele',source:'Telebirr',amount:8_100,status:'Matched',date:'2024-10-05',time:'09:58',matchedReceiptId:'rc027'},
  {id:'re018',gatewayTxnId:'BNK-TXN-11200',studentId:'fs19',studentName:'Tsehay Alemu',source:'Bank Transfer',amount:20_000,status:'Matched',date:'2024-09-09',time:'08:58',matchedReceiptId:'rc028'},
  {id:'re019',gatewayTxnId:'CHP-TXN-95000',studentId:null,studentName:null,source:'Chapa',amount:15_000,status:'Failed',date:'2024-10-16',time:'11:20',matchedReceiptId:null,failureReason:'Chapa API returned error code 402. Insufficient funds or card declined.'},
  {id:'re020',gatewayTxnId:'TLB-TXN-64000',studentId:'fs09',studentName:'Mekdes Alemu',source:'Telebirr',amount:11_800,status:'Matched',date:'2024-09-25',time:'10:13',matchedReceiptId:'rc016'},
];

// ── Notifications ─────────────────────────────────────────────────────────────
export const foNotifications: FONotification[] = [
  {id:'fn001',type:'payment_received',title:'Payment Received',message:'Selam Alemayehu (HC-2024-8832) paid ETB 12,000 via Bank Transfer for Fall 2024 tuition.',timestamp:'2024-09-05 09:14',read:true,tab:'payments',amount:12_000,studentId:'fs01'},
  {id:'fn002',type:'payment_overdue',title:'Overdue Account — Critical',message:'Yonas Kebede (HC-2022-5520) has an outstanding balance of ETB 12,500. 45 days overdue.',timestamp:'2024-10-15 08:00',read:false,tab:'outstanding',amount:12_500,studentId:'fs04'},
  {id:'fn003',type:'payment_overdue',title:'Overdue Account — Critical',message:'Henok Mulugeta (HC-2024-8761) has not made any payment this semester. ETB 23,300 outstanding.',timestamp:'2024-10-15 08:01',read:false,tab:'outstanding',amount:23_300,studentId:'fs12'},
  {id:'fn004',type:'reconciliation_failed',title:'Reconciliation Failed',message:'Chapa gateway transaction CHP-TXN-91100 (ETB 18,000) could not be matched to any student.',timestamp:'2024-10-12 11:10',read:false,tab:'reconciliation',amount:18_000},
  {id:'fn005',type:'large_payment',title:'Large Payment Recorded',message:'MBA tuition payment of ETB 22,000 received from Selamawit Desta (HC-2022-4980).',timestamp:'2024-09-06 10:35',read:true,tab:'payments',amount:22_000,studentId:'fs11'},
  {id:'fn006',type:'installment_due',title:'Installment Due Today',message:'Biruk Teshome (HC-2023-7641) has an installment of ETB 4,000 due today.',timestamp:'2024-10-10 08:00',read:true,tab:'student_accounts',amount:4_000,studentId:'fs02'},
  {id:'fn007',type:'reconciliation_failed',title:'Gateway Error',message:'Chapa API error on transaction CHP-TXN-95000 (ETB 15,000). Error code 402.',timestamp:'2024-10-16 11:25',read:false,tab:'reconciliation',amount:15_000},
  {id:'fn008',type:'payment_overdue',title:'Overdue Account — Critical',message:'Samuel Teklu (HC-2023-7050) has ETB 23,750 outstanding. 62 days overdue.',timestamp:'2024-10-15 08:02',read:false,tab:'outstanding',amount:23_750,studentId:'fs16'},
  {id:'fn009',type:'payment_received',title:'Installment Received',message:'Ezra Habtamu (HC-2025-1290) paid ETB 10,000 installment via Telebirr.',timestamp:'2024-10-01 09:05',read:true,tab:'payments',amount:10_000,studentId:'fs14'},
  {id:'fn010',type:'system',title:'End-of-Day Summary',message:"Today's collections: ETB 48,200 across 12 transactions. 3 pending reconciliations.",timestamp:'2024-10-15 18:00',read:false,tab:'overview'},
  {id:'fn011',type:'installment_due',title:'Installment Reminder',message:'Naol Bekele (HC-2025-1500) second installment of ETB 8,100 is due in 3 days.',timestamp:'2024-10-12 09:00',read:false,tab:'student_accounts',amount:8_100,studentId:'fs18'},
  {id:'fn012',type:'reconciliation_failed',title:'Unmatched Transaction',message:'Telebirr transaction TLB-TXN-60030 (ETB 7,500) flagged as possible duplicate.',timestamp:'2024-10-11 09:25',read:true,tab:'reconciliation',amount:7_500},
  {id:'fn013',type:'payment_received',title:'Payment Received',message:'Bethlehem Girma paid full tuition ETB 22,000 via Bank Transfer.',timestamp:'2024-09-07 08:35',read:true,tab:'payments',amount:22_000,studentId:'fs15'},
  {id:'fn014',type:'reminder',title:'Monthly Report Due',message:'September 2024 financial report is due for submission by end of week.',timestamp:'2024-10-14 09:00',read:false,tab:'reports'},
  {id:'fn015',type:'payment_overdue',title:'Overdue Reminder Sent',message:'Automated reminder sent to 4 students with overdue balances.',timestamp:'2024-10-13 10:00',read:true,tab:'outstanding'},
];

// ── Audit Log ─────────────────────────────────────────────────────────────────
export const foAuditLog: FOAuditEntry[] = [
  {id:'al001',date:'2024-10-15',time:'09:14',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:'fs01',studentName:'Selam Alemayehu',action:'Payment Recorded',module:'Payments',amount:12_000,previousValue:'Outstanding: 12000',newValue:'Outstanding: 0',status:'Success',ipAddress:'192.168.1.10'},
  {id:'al002',date:'2024-10-15',time:'09:22',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:'fs01',studentName:'Selam Alemayehu',action:'Receipt Generated',module:'Receipts',amount:12_000,previousValue:null,newValue:'Receipt HC-RCP-2024-001',status:'Success',ipAddress:'192.168.1.10'},
  {id:'al003',date:'2024-10-14',time:'11:30',officerId:'fin02',officerName:'W/t Meron Alemu',studentId:'fs04',studentName:'Yonas Kebede',action:'Payment Reminder Sent',module:'Outstanding',amount:null,previousValue:null,newValue:'Reminder email sent',status:'Success',ipAddress:'192.168.1.12'},
  {id:'al004',date:'2024-10-14',time:'14:00',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:'fs02',studentName:'Biruk Teshome',action:'Installment Plan Created',module:'Student Accounts',amount:17_150,previousValue:'No plan',newValue:'3 installments: 6000+4000+7150',status:'Success',ipAddress:'192.168.1.10'},
  {id:'al005',date:'2024-10-13',time:'10:05',officerId:'fin02',officerName:'W/t Meron Alemu',studentId:null,studentName:null,action:'Reconciliation Run',module:'Reconciliation',amount:null,previousValue:'20 unmatched',newValue:'15 matched, 5 unmatched',status:'Success',ipAddress:'192.168.1.12'},
  {id:'al006',date:'2024-10-12',time:'11:12',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:null,studentName:null,action:'Unmatched Transaction Flagged',module:'Reconciliation',amount:18_000,previousValue:'Unmatched',newValue:'Flagged for review',status:'Warning',ipAddress:'192.168.1.10'},
  {id:'al007',date:'2024-10-11',time:'09:00',officerId:'fin02',officerName:'W/t Meron Alemu',studentId:'fs09',studentName:'Mekdes Alemu',action:'Fine Recorded',module:'Student Accounts',amount:300,previousValue:'Fines: 0',newValue:'Fines: 300',status:'Success',ipAddress:'192.168.1.12'},
  {id:'al008',date:'2024-10-10',time:'10:30',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:'fs02',studentName:'Biruk Teshome',action:'Installment Payment',module:'Payments',amount:4_000,previousValue:'Outstanding: 11150',newValue:'Outstanding: 7150',status:'Success',ipAddress:'192.168.1.10'},
  {id:'al009',date:'2024-10-09',time:'16:00',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:null,studentName:null,action:'Report Generated',module:'Reports',amount:null,previousValue:null,newValue:'September 2024 Revenue Report',status:'Success',ipAddress:'192.168.1.10'},
  {id:'al010',date:'2024-10-08',time:'14:20',officerId:'fin02',officerName:'W/t Meron Alemu',studentId:'fs12',studentName:'Henok Mulugeta',action:'Account Flagged',module:'Outstanding',amount:23_300,previousValue:'Risk: High',newValue:'Risk: Critical — Academic Hold',status:'Warning',ipAddress:'192.168.1.12'},
  {id:'al011',date:'2024-10-07',time:'09:30',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:'fs06',studentName:'Dawit Mekonnen',action:'Installment Plan Updated',module:'Student Accounts',amount:9_450,previousValue:'Due: 2024-10-15',newValue:'Due: 2024-10-25 (extended)',status:'Success',ipAddress:'192.168.1.10'},
  {id:'al012',date:'2024-10-06',time:'11:00',officerId:'fin02',officerName:'W/t Meron Alemu',studentId:null,studentName:null,action:'Login',module:'System',amount:null,previousValue:null,newValue:'Session started',status:'Success',ipAddress:'192.168.1.12'},
  {id:'al013',date:'2024-10-05',time:'10:02',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:'fs18',studentName:'Naol Bekele',action:'Payment Recorded',module:'Payments',amount:8_100,previousValue:'Outstanding: 16200',newValue:'Outstanding: 8100',status:'Success',ipAddress:'192.168.1.10'},
  {id:'al014',date:'2024-10-04',time:'15:30',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:'fs16',studentName:'Samuel Teklu',action:'Escalation Created',module:'Outstanding',amount:23_750,previousValue:'Reminder sent',newValue:'Escalated to Student Affairs',status:'Warning',ipAddress:'192.168.1.10'},
  {id:'al015',date:'2024-10-03',time:'10:00',officerId:'fin02',officerName:'W/t Meron Alemu',studentId:null,studentName:null,action:'Bulk Reminder Sent',module:'Outstanding',amount:null,previousValue:null,newValue:'4 reminder emails dispatched',status:'Success',ipAddress:'192.168.1.12'},
  {id:'al016',date:'2024-10-02',time:'09:10',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:'fs14',studentName:'Ezra Habtamu',action:'Payment Recorded',module:'Payments',amount:10_000,previousValue:'Outstanding: 19500',newValue:'Outstanding: 9500',status:'Success',ipAddress:'192.168.1.10'},
  {id:'al017',date:'2024-10-01',time:'08:00',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:null,studentName:null,action:'Month-End Report',module:'Reports',amount:null,previousValue:null,newValue:'September 2024 report archived',status:'Success',ipAddress:'192.168.1.10'},
  {id:'al018',date:'2024-09-30',time:'17:55',officerId:'fin02',officerName:'W/t Meron Alemu',studentId:null,studentName:null,action:'System Export',module:'Audit Log',amount:null,previousValue:null,newValue:'Audit log exported to CSV',status:'Success',ipAddress:'192.168.1.12'},
  {id:'al019',date:'2024-09-25',time:'10:18',officerId:'fin02',officerName:'W/t Meron Alemu',studentId:'fs09',studentName:'Mekdes Alemu',action:'Installment Payment',module:'Payments',amount:11_800,previousValue:'Outstanding: 23600',newValue:'Outstanding: 11800',status:'Success',ipAddress:'192.168.1.12'},
  {id:'al020',date:'2024-09-20',time:'14:08',officerId:'fin01',officerName:'Ato Kebede Worku',studentId:'fs02',studentName:'Biruk Teshome',action:'Payment Recorded',module:'Payments',amount:6_000,previousValue:'Outstanding: 17150',newValue:'Outstanding: 11150',status:'Success',ipAddress:'192.168.1.10'},
];

// ── KPI Summary ───────────────────────────────────────────────────────────────
export const foKpis = {
  totalRevenueSemester: 31_800_000,
  totalOutstanding:      2_082_500,
  overdueAccounts:       4,
  receiptsIssued:        120,
  todaysCollections:     520_000,
  pendingReconciliation: 5,
  averageDailyRevenue:   358_000,
  recentTransactionsCount: 42,
};

// ── Chart Data ────────────────────────────────────────────────────────────────
export const monthlyRevenue: MonthlyRevenue[] = [
  { month:'Jan', revenue:1_820_000, target:2_000_000, collections:1_650_000 },
  { month:'Feb', revenue:2_140_000, target:2_000_000, collections:1_980_000 },
  { month:'Mar', revenue:1_960_000, target:2_000_000, collections:1_800_000 },
  { month:'Apr', revenue:1_450_000, target:1_500_000, collections:1_350_000 },
  { month:'May', revenue:1_380_000, target:1_500_000, collections:1_250_000 },
  { month:'Jun', revenue:2_280_000, target:2_200_000, collections:2_100_000 },
  { month:'Jul', revenue:2_560_000, target:2_400_000, collections:2_380_000 },
  { month:'Aug', revenue:3_120_000, target:3_000_000, collections:2_950_000 },
  { month:'Sep', revenue:4_840_000, target:4_500_000, collections:4_620_000 },
  { month:'Oct', revenue:2_280_000, target:3_000_000, collections:2_100_000 },
];

export const paymentMethodBreakdown: PaymentMethodBreakdown[] = [
  { method:'Bank Transfer', amount:12_840_000, count:98, color:'#E9C349' },
  { method:'Telebirr',      amount:5_620_000,  count:72, color:'#34d399' },
  { method:'Chapa',         amount:4_380_000,  count:55, color:'#60a5fa' },
  { method:'Cash',          amount:2_960_000,  count:41, color:'#f87171' },
];

export const dailyCollections: DailyCollection[] = [
  { day:'Mon', amount:420_000 },
  { day:'Tue', amount:380_000 },
  { day:'Wed', amount:610_000 },
  { day:'Thu', amount:290_000 },
  { day:'Fri', amount:540_000 },
  { day:'Sat', amount:180_000 },
  { day:'Sun', amount:95_000  },
];

export const outstandingTrend: OutstandingTrend[] = [
  { month:'Jun', amount:980_000   },
  { month:'Jul', amount:850_000   },
  { month:'Aug', amount:920_000   },
  { month:'Sep', amount:2_082_500 },
  { month:'Oct', amount:1_892_300 },
];

// ── Installment Plans ─────────────────────────────────────────────────────────
export const installmentPlans: InstallmentPlan[] = [
  { id:'ip001', studentId:'fs02', totalAmount:17_150, paidAmount:10_000, remainingAmount:7_150, createdAt:'2024-09-01', approvedBy:'Ato Kebede Worku',
    installments:[{id:'ip001-1',dueDate:'2024-09-20',amount:6_000,paid:true,paidDate:'2024-09-20'},{id:'ip001-2',dueDate:'2024-10-10',amount:4_000,paid:true,paidDate:'2024-10-10'},{id:'ip001-3',dueDate:'2024-11-10',amount:7_150,paid:false}] },
  { id:'ip002', studentId:'fs06', totalAmount:18_900, paidAmount:9_450,  remainingAmount:9_450,  createdAt:'2024-09-10', approvedBy:'W/t Meron Alemu',
    installments:[{id:'ip002-1',dueDate:'2024-09-15',amount:9_450,paid:true,paidDate:'2024-09-15'},{id:'ip002-2',dueDate:'2024-10-25',amount:9_450,paid:false}] },
  { id:'ip003', studentId:'fs09', totalAmount:23_600, paidAmount:11_800, remainingAmount:11_800, createdAt:'2024-09-20', approvedBy:'Ato Kebede Worku',
    installments:[{id:'ip003-1',dueDate:'2024-09-25',amount:11_800,paid:true,paidDate:'2024-09-25'},{id:'ip003-2',dueDate:'2024-11-01',amount:11_800,paid:false}] },
  { id:'ip004', studentId:'fs14', totalAmount:19_500, paidAmount:10_000, remainingAmount:9_500,  createdAt:'2024-09-28', approvedBy:'Ato Kebede Worku',
    installments:[{id:'ip004-1',dueDate:'2024-10-01',amount:10_000,paid:true,paidDate:'2024-10-01'},{id:'ip004-2',dueDate:'2024-11-15',amount:9_500,paid:false}] },
  { id:'ip005', studentId:'fs18', totalAmount:16_200, paidAmount:8_100,  remainingAmount:8_100,  createdAt:'2024-09-30', approvedBy:'W/t Meron Alemu',
    installments:[{id:'ip005-1',dueDate:'2024-10-05',amount:8_100,paid:true,paidDate:'2024-10-05'},{id:'ip005-2',dueDate:'2024-11-10',amount:8_100,paid:false}] },
  { id:'ip006', studentId:'fs20', totalAmount:13_800, paidAmount:6_900,  remainingAmount:6_900,  createdAt:'2024-09-15', approvedBy:'W/t Meron Alemu',
    installments:[{id:'ip006-1',dueDate:'2024-09-18',amount:6_900,paid:true,paidDate:'2024-09-18'},{id:'ip006-2',dueDate:'2024-10-30',amount:6_900,paid:false}] },
];

// ── Derived export used by overview and reports ───────────────────────────────
export const deptRevenue = departments.map((d) => ({
  department: d.code,
  revenue: d.totalRevenue,
  outstanding: d.outstandingBalance,
}));

export const programRevenue = programs.map((p) => ({
  program: p.code,
  revenue: p.annualTuition * 40,
  students: 40,
}));
