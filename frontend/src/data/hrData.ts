// ─────────────────────────────────────────────────────────────────────────────
// Harmony College — HR Shared Mock Dataset
// Single source of truth. All HR views reference this data.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  HROfficerProfile, Department, Employee, OnboardingRecord, LeaveRequest,
  LeaveBalance, PayrollRecord, PayslipEntry, PerformanceReview, HRDocument,
  HRNotification, HRAuditEntry, OffboardingRecord,
} from '../types/hr';

// ── HR Officer Profile ─────────────────────────────────────────────────────
export const hrProfile: HROfficerProfile = {
  name: 'Tigist Haile',
  title: 'Senior HR Officer',
  department: 'Human Resources',
  email: 'hr@harmony.edu',
  phone: '+251 (0)91 300 1122',
  officeRoom: 'Admin Building, Room 105',
  avatar: '/tigist.png',
  employeeId: 'HC-HR-0001',
  academicYear: '2024–2025',
  currentPayrollMonth: 'July 2024',
};

// ── Departments ────────────────────────────────────────────────────────────
export const departments: Department[] = [
  { id: 'd01', name: 'Theatrical Art & Digital Media', head: 'Dr. Natnael Bekele', headId: 'e01', employeeCount: 12, budget: 1_800_000 },
  { id: 'd02', name: 'Computer Science & Engineering',  head: 'Prof. James Adeyemi',headId: 'e06', employeeCount: 18, budget: 2_400_000 },
  { id: 'd03', name: 'Human Resources',                head: 'Tigist Haile',        headId: 'e10', employeeCount: 5,  budget: 600_000 },
  { id: 'd04', name: 'Finance & Accounting',           head: 'Selamawit Desta',     headId: 'e11', employeeCount: 8,  budget: 900_000 },
  { id: 'd05', name: 'Registrar & Student Affairs',    head: 'Robel Bekele',        headId: 'e12', employeeCount: 10, budget: 750_000 },
  { id: 'd06', name: 'Library & Research Services',    head: 'Dawit Mekonnen',      headId: 'e13', employeeCount: 7,  budget: 480_000 },
];

// ── Employees (20) ─────────────────────────────────────────────────────────
export const employees: Employee[] = [
  { id: 'e01', employeeId: 'HC-FAC-0042', name: 'Dr. Natnael Bekele',    avatar: '/natnael.png', departmentId: 'd01', position: 'Department Head & Associate Professor', employmentType: 'Full-Time', contractStatus: 'Active',         status: 'Active',   gender: 'Male',   email: 'n.bekele@harmony.edu',   phone: '+251911200334', hireDate: 'Sep 01, 2016', managerId: undefined,  basicSalary: 48000, allowances: 8000, deductions: 6200, nationalId: '1234-5678-9012', bankAccount: '1000234567891', taxNumber: 'TN-HC-0042', emergencyName: 'Hana Bekele',    emergencyPhone: '+251911999001', emergencyRelation: 'Spouse',  education: 'PhD in Film Studies',        experience: 14 },
  { id: 'e02', employeeId: 'HC-FAC-0001', name: 'Dr. Marcus Vance',      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', departmentId: 'd01', position: 'Professor of Cinematography', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Male', email: 'm.vance@harmony.edu', phone: '+251911100001', hireDate: 'Aug 15, 2016', managerId: 'e01', basicSalary: 45000, allowances: 7500, deductions: 5800, nationalId: '2345-6789-0123', bankAccount: '1000234567892', taxNumber: 'TN-HC-0001', emergencyName: 'Lisa Vance', emergencyPhone: '+251911999002', emergencyRelation: 'Spouse', education: 'PhD in Media Arts', experience: 15 },
  { id: 'e03', employeeId: 'HC-FAC-0019', name: 'Prof. Sarah Jenkins',   avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80', departmentId: 'd01', position: 'Associate Professor, Audio Engineering', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Female', email: 's.jenkins@harmony.edu', phone: '+251911100002', hireDate: 'Jan 10, 2018', managerId: 'e01', basicSalary: 38000, allowances: 6500, deductions: 4900, nationalId: '3456-7890-1234', bankAccount: '1000234567893', taxNumber: 'TN-HC-0019', emergencyName: 'Tom Jenkins', emergencyPhone: '+251911999003', emergencyRelation: 'Spouse', education: 'MFA in Music Production', experience: 11 },
  { id: 'e04', employeeId: 'HC-FAC-0033', name: 'Mr. Daniel Osei',       avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=300&q=80', departmentId: 'd01', position: 'Assistant Professor, Theatre Arts', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Male', email: 'd.osei@harmony.edu', phone: '+251911100004', hireDate: 'Mar 01, 2020', managerId: 'e01', basicSalary: 32000, allowances: 5500, deductions: 4100, nationalId: '4567-8901-2345', bankAccount: '1000234567894', taxNumber: 'TN-HC-0033', emergencyName: 'Ama Osei', emergencyPhone: '+251911999004', emergencyRelation: 'Spouse', education: 'MA in Theatre', experience: 8 },
  { id: 'e05', employeeId: 'HC-FAC-0055', name: 'Dr. Meron Tadesse',     avatar: '/Meron.png', departmentId: 'd01', position: 'Assistant Professor, Media Studies', employmentType: 'Full-Time', contractStatus: 'Expiring Soon', status: 'Active', gender: 'Female', email: 'm.tadesse@harmony.edu', phone: '+251911100005', hireDate: 'Sep 01, 2021', contractEndDate: 'Aug 31, 2024', managerId: 'e01', basicSalary: 30000, allowances: 5000, deductions: 3800, nationalId: '5678-9012-3456', bankAccount: '1000234567895', taxNumber: 'TN-HC-0055', emergencyName: 'Alemu Tadesse', emergencyPhone: '+251911999005', emergencyRelation: 'Father', education: 'PhD in Cultural Studies', experience: 7 },
  { id: 'e06', employeeId: 'HC-FAC-0008', name: 'Prof. James Adeyemi',   avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', departmentId: 'd02', position: 'Professor & CS Department Head', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Male', email: 'j.adeyemi@harmony.edu', phone: '+251911100006', hireDate: 'Aug 01, 2015', managerId: undefined, basicSalary: 50000, allowances: 9000, deductions: 6500, nationalId: '6789-0123-4567', bankAccount: '1000234567896', taxNumber: 'TN-HC-0008', emergencyName: 'Ngozi Adeyemi', emergencyPhone: '+251911999006', emergencyRelation: 'Spouse', education: 'PhD Computer Science', experience: 18 },
  { id: 'e07', employeeId: 'HC-FAC-0061', name: 'Ms. Rahel Solomon',     avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=300&q=80', departmentId: 'd01', position: 'Lecturer, Digital Photography', employmentType: 'Part-Time', contractStatus: 'Active', status: 'Active', gender: 'Female', email: 'r.solomon@harmony.edu', phone: '+251911100007', hireDate: 'Jan 15, 2022', managerId: 'e01', basicSalary: 18000, allowances: 2500, deductions: 2200, nationalId: '7890-1234-5678', bankAccount: '1000234567897', taxNumber: 'TN-HC-0061', emergencyName: 'Kidist Solomon', emergencyPhone: '+251911999007', emergencyRelation: 'Mother', education: 'MFA Photography', experience: 5 },
  { id: 'e08', employeeId: 'HC-FAC-0072', name: 'Dr. Yohannes Girma',    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80', departmentId: 'd01', position: 'Associate Professor, Film Theory', employmentType: 'Full-Time', contractStatus: 'Active', status: 'On Leave', gender: 'Male', email: 'y.girma@harmony.edu', phone: '+251911100008', hireDate: 'Aug 01, 2017', managerId: 'e01', basicSalary: 38000, allowances: 6000, deductions: 4800, nationalId: '8901-2345-6789', bankAccount: '1000234567898', taxNumber: 'TN-HC-0072', emergencyName: 'Hiwot Girma', emergencyPhone: '+251911999008', emergencyRelation: 'Spouse', education: 'PhD Film Theory', experience: 12 },
  { id: 'e09', employeeId: 'HC-FAC-0088', name: 'Dr. Amina Okafor',      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80', departmentId: 'd02', position: 'Assistant Professor, Animation', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Female', email: 'a.okafor@harmony.edu', phone: '+251911100010', hireDate: 'Feb 01, 2022', managerId: 'e06', basicSalary: 33000, allowances: 5500, deductions: 4200, nationalId: '9012-3456-7890', bankAccount: '1000234567899', taxNumber: 'TN-HC-0088', emergencyName: 'Chidi Okafor', emergencyPhone: '+251911999009', emergencyRelation: 'Spouse', education: 'PhD in Animation', experience: 6 },
  { id: 'e10', employeeId: 'HC-HR-0001',  name: 'Tigist Haile',          avatar: '/tigist.png', departmentId: 'd03', position: 'Senior HR Officer', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Female', email: 'hr@harmony.edu', phone: '+251911300112', hireDate: 'Mar 01, 2019', managerId: undefined, basicSalary: 35000, allowances: 6000, deductions: 4500, nationalId: '0123-4567-8901', bankAccount: '1000234567900', taxNumber: 'TN-HC-HR01', emergencyName: 'Biruk Haile', emergencyPhone: '+251911999010', emergencyRelation: 'Spouse', education: 'MBA Human Resources', experience: 9 },
  { id: 'e11', employeeId: 'HC-FIN-0012', name: 'Selamawit Desta',       avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80', departmentId: 'd04', position: 'Finance Manager', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Female', email: 'fin@harmony.edu', phone: '+251911400220', hireDate: 'Jun 01, 2018', managerId: undefined, basicSalary: 42000, allowances: 7000, deductions: 5400, nationalId: '1234-0987-6543', bankAccount: '1000234567901', taxNumber: 'TN-HC-FIN01', emergencyName: 'Tesfaye Desta', emergencyPhone: '+251911999011', emergencyRelation: 'Spouse', education: 'MSc Accounting & Finance', experience: 10 },
  { id: 'e12', employeeId: 'HC-REG-0005', name: 'Robel Bekele',          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80', departmentId: 'd05', position: 'Registrar', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Male', email: 'registrar@harmony.edu', phone: '+251911500330', hireDate: 'Sep 15, 2017', managerId: undefined, basicSalary: 40000, allowances: 6500, deductions: 5100, nationalId: '2345-1098-7654', bankAccount: '1000234567902', taxNumber: 'TN-HC-REG01', emergencyName: 'Lemlem Bekele', emergencyPhone: '+251911999012', emergencyRelation: 'Spouse', education: 'MA Education Management', experience: 11 },
  { id: 'e13', employeeId: 'HC-LIB-0003', name: 'Dawit Mekonnen',        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80', departmentId: 'd06', position: 'Head Librarian', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Male', email: 'library@harmony.edu', phone: '+251911600440', hireDate: 'Jan 20, 2020', managerId: undefined, basicSalary: 28000, allowances: 4500, deductions: 3500, nationalId: '3456-2109-8765', bankAccount: '1000234567903', taxNumber: 'TN-HC-LIB01', emergencyName: 'Yeshi Mekonnen', emergencyPhone: '+251911999013', emergencyRelation: 'Spouse', education: 'MLIS Library Science', experience: 8 },
  { id: 'e14', employeeId: 'HC-ADM-0021', name: 'Bethlehem Girma',       avatar: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=300&q=80', departmentId: 'd03', position: 'HR Officer',  employmentType: 'Full-Time', contractStatus: 'Probation', status: 'Active', gender: 'Female', email: 'b.girma@harmony.edu', phone: '+251911700550', hireDate: 'May 01, 2024', managerId: 'e10', basicSalary: 25000, allowances: 4000, deductions: 3100, nationalId: '4567-3210-9876', bankAccount: '1000234567904', taxNumber: 'TN-HC-ADM21', emergencyName: 'Girma Tadesse', emergencyPhone: '+251911999014', emergencyRelation: 'Father', education: 'BA Human Resource Management', experience: 2 },
  { id: 'e15', employeeId: 'HC-SEC-0009', name: 'Samuel Teklu',          avatar: 'https://images.unsplash.com/photo-1542178243-bc20204b769f?auto=format&fit=crop&w=300&q=80', departmentId: 'd05', position: 'Student Affairs Officer', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Male', email: 's.teklu@harmony.edu', phone: '+251911800660', hireDate: 'Jul 10, 2021', managerId: 'e12', basicSalary: 26000, allowances: 4200, deductions: 3200, nationalId: '5678-4321-0987', bankAccount: '1000234567905', taxNumber: 'TN-HC-SEC09', emergencyName: 'Azeb Teklu', emergencyPhone: '+251911999015', emergencyRelation: 'Spouse', education: 'BA Social Work', experience: 7 },
  { id: 'e16', employeeId: 'HC-IT-0014',  name: 'Abel Tesfaye',          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', departmentId: 'd02', position: 'IT Systems Administrator', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Male', email: 'it@harmony.edu', phone: '+251911900770', hireDate: 'Oct 01, 2022', managerId: 'e06', basicSalary: 30000, allowances: 5000, deductions: 3800, nationalId: '6789-5432-1098', bankAccount: '1000234567906', taxNumber: 'TN-HC-IT014', emergencyName: 'Hana Tesfaye', emergencyPhone: '+251911999016', emergencyRelation: 'Spouse', education: 'BSc Computer Science', experience: 5 },
  { id: 'e17', employeeId: 'HC-FIN-0025', name: 'Mahlet Tafesse',        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80', departmentId: 'd04', position: 'Senior Accountant', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Active', gender: 'Female', email: 'm.tafesse@harmony.edu', phone: '+251912100880', hireDate: 'Apr 15, 2020', managerId: 'e11', basicSalary: 32000, allowances: 5200, deductions: 4100, nationalId: '7890-6543-2109', bankAccount: '1000234567907', taxNumber: 'TN-HC-FIN25', emergencyName: 'Liya Tafesse', emergencyPhone: '+251911999017', emergencyRelation: 'Mother', education: 'BSc Accounting', experience: 8 },
  { id: 'e18', employeeId: 'HC-INF-0034', name: 'Naol Bekele',           avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=300&q=80', departmentId: 'd02', position: 'Junior Software Engineer', employmentType: 'Contract', contractStatus: 'Expiring Soon', status: 'Active', gender: 'Male', email: 'n.bekele@harmony.edu', phone: '+251912200990', hireDate: 'Jan 15, 2024', contractEndDate: 'Dec 31, 2024', managerId: 'e16', basicSalary: 22000, allowances: 3500, deductions: 2800, nationalId: '8901-7654-3210', bankAccount: '1000234567908', taxNumber: 'TN-HC-INF34', emergencyName: 'Meseret Bekele', emergencyPhone: '+251911999018', emergencyRelation: 'Mother', education: 'BSc Software Engineering', experience: 2 },
  { id: 'e19', employeeId: 'HC-LIB-0007', name: 'Tsehay Alemu',          avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&q=80', departmentId: 'd06', position: 'Assistant Librarian', employmentType: 'Part-Time', contractStatus: 'Active', status: 'Active', gender: 'Female', email: 't.alemu@harmony.edu', phone: '+251912300110', hireDate: 'Mar 01, 2021', managerId: 'e13', basicSalary: 15000, allowances: 2200, deductions: 1800, nationalId: '9012-8765-4321', bankAccount: '1000234567909', taxNumber: 'TN-HC-LIB07', emergencyName: 'Bekele Alemu', emergencyPhone: '+251911999019', emergencyRelation: 'Father', education: 'BA Library Science', experience: 5 },
  { id: 'e20', employeeId: 'HC-SEC-0018', name: 'Henok Mulugeta',         avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80', departmentId: 'd05', position: 'Admissions Officer', employmentType: 'Full-Time', contractStatus: 'Active', status: 'Terminated', gender: 'Male', email: 'h.mulugeta@harmony.edu', phone: '+251912400220', hireDate: 'Aug 01, 2020', managerId: 'e12', basicSalary: 0, allowances: 0, deductions: 0, nationalId: '0123-9876-5432', bankAccount: '1000234567910', taxNumber: 'TN-HC-SEC18', emergencyName: 'Tigist Mulugeta', emergencyPhone: '+251911999020', emergencyRelation: 'Spouse', education: 'BA Education', experience: 6 },
];

// ── Leave Requests ─────────────────────────────────────────────────────────
export const leaveRequests: LeaveRequest[] = [
  { id: 'lr01', employeeId: 'e08', type: 'Study',     startDate: 'Aug 05, 2024', endDate: 'Aug 18, 2024', days: 14, reason: 'Presenting paper at the African Film Academy Conference, Nairobi.',         status: 'Approved',  managerApproval: 'Approved', hrApproval: 'Approved', submittedAt: 'Jul 10, 2024', reviewedAt: 'Jul 12, 2024' },
  { id: 'lr02', employeeId: 'e05', type: 'Sick',      startDate: 'Jul 22, 2024', endDate: 'Jul 31, 2024', days: 10, reason: 'Recovery from minor surgery. Doctor clearance attached.',                   status: 'Pending',   managerApproval: 'Approved', hrApproval: 'Pending',  submittedAt: 'Jul 19, 2024' },
  { id: 'lr03', employeeId: 'e07', type: 'Annual',    startDate: 'Jul 29, 2024', endDate: 'Aug 02, 2024', days: 5,  reason: 'Family obligation requiring travel to Hawassa.',                            status: 'Pending',   managerApproval: 'Pending',  hrApproval: 'Pending',  submittedAt: 'Jul 20, 2024' },
  { id: 'lr04', employeeId: 'e03', type: 'Annual',    startDate: 'Aug 20, 2024', endDate: 'Aug 23, 2024', days: 4,  reason: 'Attending the International Design & Branding Symposium, Addis Ababa.',    status: 'Approved',  managerApproval: 'Approved', hrApproval: 'Approved', submittedAt: 'Jul 08, 2024', reviewedAt: 'Jul 09, 2024' },
  { id: 'lr05', employeeId: 'e14', type: 'Emergency', startDate: 'Jul 15, 2024', endDate: 'Jul 16, 2024', days: 2,  reason: 'Family emergency — immediate travel required.',                             status: 'Approved',  managerApproval: 'Approved', hrApproval: 'Approved', submittedAt: 'Jul 14, 2024', reviewedAt: 'Jul 14, 2024' },
  { id: 'lr06', employeeId: 'e04', type: 'Annual',    startDate: 'Aug 10, 2024', endDate: 'Aug 14, 2024', days: 5,  reason: 'Annual vacation — family trip to Lalibela.',                               status: 'Pending',   managerApproval: 'Approved', hrApproval: 'Pending',  submittedAt: 'Jul 21, 2024' },
  { id: 'lr07', employeeId: 'e17', type: 'Sick',      startDate: 'Jul 10, 2024', endDate: 'Jul 12, 2024', days: 3,  reason: 'Flu and fever. Medical certificate attached.',                             status: 'Approved',  managerApproval: 'Approved', hrApproval: 'Approved', submittedAt: 'Jul 09, 2024', reviewedAt: 'Jul 09, 2024' },
  { id: 'lr08', employeeId: 'e16', type: 'Annual',    startDate: 'Aug 26, 2024', endDate: 'Aug 30, 2024', days: 5,  reason: 'End-of-summer annual leave.',                                              status: 'Pending',   managerApproval: 'Pending',  hrApproval: 'Pending',  submittedAt: 'Jul 22, 2024' },
  { id: 'lr09', employeeId: 'e02', type: 'Study',     startDate: 'Sep 10, 2024', endDate: 'Sep 14, 2024', days: 5,  reason: 'Attending industry masterclass on cinematography, Cape Town.',             status: 'Pending',   managerApproval: 'Approved', hrApproval: 'Pending',  submittedAt: 'Jul 18, 2024' },
  { id: 'lr10', employeeId: 'e15', type: 'Annual',    startDate: 'Aug 05, 2024', endDate: 'Aug 09, 2024', days: 5,  reason: 'Planned annual leave for family visit.',                                   status: 'Rejected',  managerApproval: 'Rejected', hrApproval: 'Rejected', submittedAt: 'Jul 05, 2024', reviewedAt: 'Jul 06, 2024', comment: 'Critical student intake period — cannot be approved at this time.' },
  { id: 'lr11', employeeId: 'e09', type: 'Maternity', startDate: 'Sep 01, 2024', endDate: 'Nov 30, 2024', days: 90, reason: 'Maternity leave as per HR policy.',                                        status: 'Approved',  managerApproval: 'Approved', hrApproval: 'Approved', submittedAt: 'Jul 01, 2024', reviewedAt: 'Jul 02, 2024' },
  { id: 'lr12', employeeId: 'e13', type: 'Annual',    startDate: 'Aug 19, 2024', endDate: 'Aug 23, 2024', days: 5,  reason: 'Annual leave — vacation in Gondar.',                                       status: 'Pending',   managerApproval: 'Approved', hrApproval: 'Pending',  submittedAt: 'Jul 22, 2024' },
];

// ── Leave Balances ─────────────────────────────────────────────────────────
export const leaveBalances: LeaveBalance[] = employees.filter(e => e.status === 'Active').map(e => ({
  employeeId: e.id,
  annual: { entitled: 20, taken: Math.floor(Math.random() * 8), remaining: 0 },
  sick:   { entitled: 15, taken: Math.floor(Math.random() * 5), remaining: 0 },
  study:  { entitled: 10, taken: Math.floor(Math.random() * 3), remaining: 0 },
})).map(b => ({
  ...b,
  annual: { ...b.annual, remaining: 20 - b.annual.taken },
  sick:   { ...b.sick,   remaining: 15 - b.sick.taken   },
  study:  { ...b.study,  remaining: 10 - b.study.taken  },
}));

// ── Payroll Records ────────────────────────────────────────────────────────
export const payrollRecords: PayrollRecord[] = [
  { id: 'pr01', month: 'July',  year: 2024, stage: 'Pending HR Approval', totalGross: 5_840_000, totalNet: 4_620_000, employeeCount: 19, generatedAt: 'Jul 25, 2024 09:00 AM', approvals: [
    { stage: 'Draft',          approver: 'System',          date: 'Jul 25, 2024', status: 'Approved', comment: 'Auto-generated' },
    { stage: 'Finance Review', approver: 'Selamawit Desta', date: 'Jul 26, 2024', status: 'Approved', comment: 'Reviewed and confirmed. All figures match budget.' },
    { stage: 'HR Final Approval', approver: 'Tigist Haile', date: '',            status: 'Pending' },
  ]},
  { id: 'pr02', month: 'June',  year: 2024, stage: 'Locked', totalGross: 5_780_000, totalNet: 4_580_000, employeeCount: 19, generatedAt: 'Jun 25, 2024 09:00 AM', approvals: [
    { stage: 'Draft',             approver: 'System',          date: 'Jun 25, 2024', status: 'Approved' },
    { stage: 'Finance Review',    approver: 'Selamawit Desta', date: 'Jun 26, 2024', status: 'Approved' },
    { stage: 'HR Final Approval', approver: 'Tigist Haile',    date: 'Jun 27, 2024', status: 'Approved', comment: 'Approved. Payslips released to employees.' },
  ]},
  { id: 'pr03', month: 'May',   year: 2024, stage: 'Locked', totalGross: 5_760_000, totalNet: 4_560_000, employeeCount: 18, generatedAt: 'May 25, 2024 09:00 AM', approvals: [
    { stage: 'Draft',             approver: 'System',          date: 'May 25, 2024', status: 'Approved' },
    { stage: 'Finance Review',    approver: 'Selamawit Desta', date: 'May 26, 2024', status: 'Approved' },
    { stage: 'HR Final Approval', approver: 'Tigist Haile',    date: 'May 27, 2024', status: 'Approved' },
  ]},
  { id: 'pr04', month: 'April', year: 2024, stage: 'Locked', totalGross: 5_700_000, totalNet: 4_510_000, employeeCount: 18, generatedAt: 'Apr 25, 2024 09:00 AM', approvals: [
    { stage: 'Draft',             approver: 'System',          date: 'Apr 25, 2024', status: 'Approved' },
    { stage: 'Finance Review',    approver: 'Selamawit Desta', date: 'Apr 26, 2024', status: 'Approved' },
    { stage: 'HR Final Approval', approver: 'Tigist Haile',    date: 'Apr 27, 2024', status: 'Approved' },
  ]},
];

export const payslipEntries: PayslipEntry[] = employees.filter(e => e.status !== 'Terminated').map(e => ({
  employeeId: e.id,
  month: 'July', year: 2024,
  basicSalary: e.basicSalary,
  allowances: e.allowances,
  bonuses: e.basicSalary > 35000 ? 2000 : 0,
  tax: Math.round((e.basicSalary + e.allowances) * 0.15),
  pension: Math.round(e.basicSalary * 0.07),
  otherDeductions: e.deductions - Math.round(e.basicSalary * 0.07) - Math.round((e.basicSalary + e.allowances) * 0.15),
  netSalary: e.basicSalary + e.allowances + (e.basicSalary > 35000 ? 2000 : 0) - e.deductions,
}));

// ── Performance Reviews ────────────────────────────────────────────────────
export const performanceReviews: PerformanceReview[] = [
  { id: 'pv01', employeeId: 'e02', cycle: 'Semi-Annual', period: 'H1 2024', status: 'Completed',   dueDate: 'Jul 15, 2024', overallScore: 4.5, goals: 5, competencies: 4, attendance: 5, communication: 4, leadership: 4, technicalSkills: 5, managerComment: 'Outstanding performance. Strong cinematic direction.', hrComment: 'Recommend for salary review.', completedAt: 'Jul 14, 2024' },
  { id: 'pv02', employeeId: 'e03', cycle: 'Semi-Annual', period: 'H1 2024', status: 'Completed',   dueDate: 'Jul 15, 2024', overallScore: 4.2, goals: 4, competencies: 4, attendance: 5, communication: 5, leadership: 4, technicalSkills: 4, managerComment: 'Excellent teamwork and student engagement.', hrComment: '', completedAt: 'Jul 12, 2024' },
  { id: 'pv03', employeeId: 'e04', cycle: 'Semi-Annual', period: 'H1 2024', status: 'In Progress', dueDate: 'Jul 30, 2024', overallScore: undefined, goals: 0, competencies: 0, attendance: 0, communication: 0, leadership: 0, technicalSkills: 0 },
  { id: 'pv04', employeeId: 'e05', cycle: 'Semi-Annual', period: 'H1 2024', status: 'Overdue',     dueDate: 'Jul 10, 2024', overallScore: undefined, goals: 0, competencies: 0, attendance: 0, communication: 0, leadership: 0, technicalSkills: 0 },
  { id: 'pv05', employeeId: 'e06', cycle: 'Annual',      period: '2024',    status: 'Pending',     dueDate: 'Aug 15, 2024', overallScore: undefined, goals: 0, competencies: 0, attendance: 0, communication: 0, leadership: 0, technicalSkills: 0 },
  { id: 'pv06', employeeId: 'e09', cycle: 'Annual',      period: '2024',    status: 'Pending',     dueDate: 'Aug 15, 2024', overallScore: undefined, goals: 0, competencies: 0, attendance: 0, communication: 0, leadership: 0, technicalSkills: 0 },
  { id: 'pv07', employeeId: 'e11', cycle: 'Semi-Annual', period: 'H1 2024', status: 'Completed',   dueDate: 'Jul 15, 2024', overallScore: 4.8, goals: 5, competencies: 5, attendance: 5, communication: 5, leadership: 5, technicalSkills: 4, managerComment: 'Exceptional financial leadership.', hrComment: 'Promote to Finance Director review.', completedAt: 'Jul 10, 2024' },
  { id: 'pv08', employeeId: 'e14', cycle: 'Quarterly',   period: 'Q2 2024', status: 'In Progress', dueDate: 'Jul 25, 2024', overallScore: undefined, goals: 0, competencies: 0, attendance: 0, communication: 0, leadership: 0, technicalSkills: 0 },
];

// ── Documents ──────────────────────────────────────────────────────────────
export const hrDocuments: HRDocument[] = [
  { id: 'doc01', employeeId: 'e02', category: 'Contract',  title: 'Employment Contract — Dr. Marcus Vance',        fileSize: '1.2 MB', uploadedAt: 'Aug 15, 2016', uploadedBy: 'HR Office', version: 3 },
  { id: 'doc02', employeeId: 'e02', category: 'CV',        title: 'CV — Dr. Marcus Vance (2024 updated)',           fileSize: '0.8 MB', uploadedAt: 'Jan 10, 2024', uploadedBy: 'Dr. Marcus Vance', version: 4 },
  { id: 'doc03', employeeId: 'e03', category: 'Contract',  title: 'Employment Contract — Prof. Sarah Jenkins',      fileSize: '1.1 MB', uploadedAt: 'Jan 10, 2018', uploadedBy: 'HR Office', version: 2 },
  { id: 'doc04', employeeId: 'e05', category: 'Contract',  title: 'Contract — Dr. Meron Tadesse (Renewal Pending)', fileSize: '1.0 MB', uploadedAt: 'Sep 01, 2021', uploadedBy: 'HR Office', version: 1 },
  { id: 'doc05', employeeId: 'e14', category: 'CV',        title: 'CV — Bethlehem Girma',                          fileSize: '0.6 MB', uploadedAt: 'May 01, 2024', uploadedBy: 'Bethlehem Girma', version: 1 },
  { id: 'doc06', employeeId: 'e14', category: 'Contract',  title: 'Probationary Contract — Bethlehem Girma',       fileSize: '0.9 MB', uploadedAt: 'May 01, 2024', uploadedBy: 'HR Office', version: 1 },
  { id: 'doc07', employeeId: 'e11', category: 'Performance Report', title: 'H1 2024 Performance Review — Selamawit Desta', fileSize: '0.4 MB', uploadedAt: 'Jul 10, 2024', uploadedBy: 'Tigist Haile', version: 1 },
  { id: 'doc08', employeeId: 'e18', category: 'Contract',  title: 'Fixed-Term Contract — Naol Bekele',             fileSize: '1.0 MB', uploadedAt: 'Jan 15, 2024', uploadedBy: 'HR Office', version: 1 },
  { id: 'doc09', employeeId: 'e01', category: 'Certificate', title: 'PhD Certificate — Dr. Natnael Bekele',        fileSize: '2.1 MB', uploadedAt: 'Sep 01, 2016', uploadedBy: 'Dr. Natnael Bekele', version: 1 },
  { id: 'doc10', employeeId: 'e08', category: 'Leave Document', title: 'Leave Approval — Yohannes Girma (Research)', fileSize: '0.3 MB', uploadedAt: 'Jul 12, 2024', uploadedBy: 'Tigist Haile', version: 1 },
];

// ── HR Notifications ───────────────────────────────────────────────────────
export const hrNotifications: HRNotification[] = [
  { id: 'hn01', type: 'payroll',     title: 'Payroll Awaiting HR Approval', message: 'July 2024 payroll has been reviewed by Finance. Your final approval is required to release payslips.', timestamp: 'Jul 26, 2024 02:00 PM', read: false, tab: 'payroll' },
  { id: 'hn02', type: 'leave',       title: 'Leave Request: Dr. Meron Tadesse', message: '10-day sick leave request submitted. Manager has approved. Awaiting HR decision.', timestamp: 'Jul 19, 2024 09:00 AM', read: false, tab: 'leave' },
  { id: 'hn03', type: 'leave',       title: 'Leave Request: Mr. Daniel Osei', message: '5-day annual leave request for Aug 10–14. Manager approved. Awaiting HR decision.', timestamp: 'Jul 21, 2024 11:00 AM', read: false, tab: 'leave' },
  { id: 'hn04', type: 'contract',    title: 'Contract Expiring: Dr. Meron Tadesse', message: 'Employment contract for Dr. Meron Tadesse expires on Aug 31, 2024. Renewal action required.', timestamp: 'Jul 15, 2024 08:00 AM', read: false, tab: 'employees' },
  { id: 'hn05', type: 'contract',    title: 'Contract Expiring: Naol Bekele', message: 'Fixed-term contract for Naol Bekele expires Dec 31, 2024. Review and renewal due within 60 days.', timestamp: 'Jul 14, 2024 08:00 AM', read: true,  tab: 'employees' },
  { id: 'hn06', type: 'performance', title: 'Performance Review Overdue: Dr. Meron Tadesse', message: 'H1 2024 semi-annual performance review is overdue (due Jul 10). Immediate action required.', timestamp: 'Jul 11, 2024 08:00 AM', read: false, tab: 'performance' },
  { id: 'hn07', type: 'onboarding',  title: 'Onboarding: Bethlehem Girma', message: 'New HR Officer Bethlehem Girma onboarding is 60% complete. Documents pending.', timestamp: 'May 01, 2024 10:00 AM', read: true,  tab: 'onboarding' },
  { id: 'hn08', type: 'leave',       title: 'Leave Approved: Dr. Amina Okafor', message: 'Maternity leave for Dr. Amina Okafor (Sep 1 – Nov 30) approved by HR.', timestamp: 'Jul 02, 2024 11:00 AM', read: true,  tab: 'leave' },
];

// ── Audit Log ──────────────────────────────────────────────────────────────
export const hrAuditLog: HRAuditEntry[] = [
  { id: 'al01', date: 'Jul 26, 2024 14:05', action: 'Payroll Reviewed',        employee: 'All Staff',          module: 'Payroll',     user: 'Selamawit Desta', description: 'July 2024 payroll reviewed and forwarded to HR for final approval.', status: 'Success' },
  { id: 'al02', date: 'Jul 25, 2024 09:00', action: 'Payroll Generated',       employee: 'All Staff',          module: 'Payroll',     user: 'System',          description: 'July 2024 payroll auto-generated for 19 active employees.', status: 'Success' },
  { id: 'al03', date: 'Jul 22, 2024 11:30', action: 'Leave Request Submitted', employee: 'Abel Tesfaye',       module: 'Leave',       user: 'Abel Tesfaye',    description: '5-day annual leave submitted for Aug 26–30.', status: 'Success' },
  { id: 'al04', date: 'Jul 21, 2024 10:15', action: 'Leave Request Submitted', employee: 'Daniel Osei',        module: 'Leave',       user: 'Daniel Osei',     description: '5-day annual leave submitted for Aug 10–14.', status: 'Success' },
  { id: 'al05', date: 'Jul 20, 2024 09:00', action: 'Leave Request Submitted', employee: 'Rahel Solomon',      module: 'Leave',       user: 'Rahel Solomon',   description: '5-day annual leave submitted for Jul 29 – Aug 2.', status: 'Success' },
  { id: 'al06', date: 'Jul 19, 2024 09:30', action: 'Leave Request Submitted', employee: 'Meron Tadesse',      module: 'Leave',       user: 'Meron Tadesse',   description: '10-day sick leave submitted for Jul 22–31.', status: 'Warning' },
  { id: 'al07', date: 'Jul 15, 2024 08:10', action: 'Contract Alert Triggered',employee: 'Meron Tadesse',      module: 'Employees',   user: 'System',          description: 'Contract expiry alert — expires Aug 31, 2024.', status: 'Warning' },
  { id: 'al08', date: 'Jul 14, 2024 14:20', action: 'Leave Approved',          employee: 'Bethlehem Girma',    module: 'Leave',       user: 'Tigist Haile',    description: '2-day emergency leave approved.', status: 'Success' },
  { id: 'al09', date: 'Jul 12, 2024 10:00', action: 'Leave Approved',          employee: 'Yohannes Girma',     module: 'Leave',       user: 'Tigist Haile',    description: '14-day research conference leave approved.', status: 'Success' },
  { id: 'al10', date: 'Jul 10, 2024 11:20', action: 'Performance Review Completed', employee: 'Marcus Vance',  module: 'Performance', user: 'Natnael Bekele',  description: 'H1 2024 semi-annual review completed — score: 4.5/5.', status: 'Success' },
  { id: 'al11', date: 'Jul 09, 2024 15:00', action: 'Document Uploaded',       employee: 'Selamawit Desta',    module: 'Documents',   user: 'Tigist Haile',    description: 'H1 2024 performance report uploaded.', status: 'Success' },
  { id: 'al12', date: 'Jul 06, 2024 09:45', action: 'Leave Rejected',          employee: 'Samuel Teklu',       module: 'Leave',       user: 'Tigist Haile',    description: 'Annual leave rejected — critical intake period.', status: 'Failed' },
];

// ── Onboarding Records ─────────────────────────────────────────────────────
export const onboardingRecords: OnboardingRecord[] = [
  {
    id: 'ob01', employeeId: 'e14', status: 'In Progress', currentStep: 4,
    startedAt: 'May 01, 2024',
    steps: [
      { id: 'personal_info',      label: 'Personal Information', completed: true },
      { id: 'employment_details', label: 'Employment Details',   completed: true },
      { id: 'contract',           label: 'Contract',             completed: true },
      { id: 'salary',             label: 'Salary & Benefits',    completed: true },
      { id: 'benefits',           label: 'Benefits',             completed: false },
      { id: 'documents',          label: 'Documents',            completed: false },
      { id: 'review',             label: 'Review & Submit',      completed: false },
    ],
  },
];

// ── Offboarding Records ────────────────────────────────────────────────────
export const offboardingRecords: OffboardingRecord[] = [
  {
    id: 'off01', employeeId: 'e20', lastWorkingDay: 'Jun 30, 2024', exitReason: 'Resignation', currentStep: 5, status: 'Completed',
    assetChecklist: [
      { item: 'Laptop',     returned: true },
      { item: 'ID Card',    returned: true },
      { item: 'Access Card',returned: true },
      { item: 'Office Keys',returned: true },
    ],
  },
];

// ── Derived KPIs ───────────────────────────────────────────────────────────
export const hrKPIs = {
  activeEmployees:      employees.filter(e => e.status === 'Active').length,
  pendingLeaveRequests: leaveRequests.filter(l => l.status === 'Pending').length,
  performanceReviewsDue:performanceReviews.filter(p => p.status === 'Pending' || p.status === 'Overdue' || p.status === 'In Progress').length,
  newEmployeesThisMonth:employees.filter(e => e.hireDate.includes('2024') && (e.hireDate.includes('May') || e.hireDate.includes('Jun') || e.hireDate.includes('Jul'))).length,
  expiringContracts:    employees.filter(e => e.contractStatus === 'Expiring Soon').length,
  currentPayroll:       payrollRecords[0],
};

// ── Helpers ────────────────────────────────────────────────────────────────
export function getEmployeeById(id: string) { return employees.find(e => e.id === id); }
export function getDeptById(id: string) { return departments.find(d => d.id === id); }
export function getLeavesByEmployee(id: string) { return leaveRequests.filter(l => l.employeeId === id); }
export function getPerformanceByEmployee(id: string) { return performanceReviews.filter(p => p.employeeId === id); }
export function getDocsByEmployee(id: string) { return hrDocuments.filter(d => d.employeeId === id); }
