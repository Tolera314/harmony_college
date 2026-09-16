import { prisma } from '../../lib/prisma';
import * as foAuditService from './foAuditService';

export interface FOSettingsData {
  // Profile
  name: string;
  email: string;
  phone: string;
  officeRoom: string;
  department: string;
  employeeId: string;

  // Financial Policies & Rates
  academicYear: string;
  currentSemester: string;
  tuitionFeePerCredit: number;
  registrationFee: number;
  lateFeePercentage: number;
  gracePeriodDays: number;
  currency: string;
  telebirrMerchantId: string;
  chapaPublicKey: string;
  bankAccountDetails: string;
  autoReconciliationEnabled: boolean;
  overdueAlertThresholdDays: number;

  // Preferences & Appearance
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  activeTheme: string;
  tableDensity: string;
  accentColor: string;
  displayLanguage: string;
  dateFormat: string;
}

let settingsStore: FOSettingsData = {
  name: 'Dawit Alemu',
  email: 'fo@harmony.edu.et',
  phone: '+251 911 234 567',
  officeRoom: 'Block B — Room 204',
  department: 'Finance & Accounting',
  employeeId: 'EMP-FO-2026-01',

  academicYear: '2026/2027',
  currentSemester: 'Fall 2026',
  tuitionFeePerCredit: 1250,
  registrationFee: 1500,
  lateFeePercentage: 5,
  gracePeriodDays: 15,
  currency: 'ETB',
  telebirrMerchantId: 'MERCHANT-HC-9021',
  chapaPublicKey: 'CHAPUBK_TEST-xxxxxx',
  bankAccountDetails: 'CBE Account: 1000188992001 (Harmony College Main Operating)',
  autoReconciliationEnabled: true,
  overdueAlertThresholdDays: 30,

  emailNotificationsEnabled: true,
  smsNotificationsEnabled: false,
  activeTheme: 'dark',
  tableDensity: 'Comfortable',
  accentColor: '#E9C349',
  displayLanguage: 'English',
  dateFormat: 'YYYY-MM-DD',
};

export async function getSettings(userId?: string) {
  let userOverlay: Partial<FOSettingsData> = {};
  if (userId) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        userOverlay = {
          name: user.fullName || undefined,
          email: user.email || undefined,
          phone: user.phone || undefined,
          employeeId: `EMP-FO-${user.id.slice(-4).toUpperCase()}`,
        };
      }
    } catch { /* ignore */ }
  }

  return { settings: { ...settingsStore, ...userOverlay } };
}

export async function updateSettings(data: Partial<FOSettingsData>, userId?: string) {
  const previous = { ...settingsStore };
  settingsStore = { ...settingsStore, ...data };

  if (userId && (data.name || data.email || data.phone)) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { fullName: data.name }),
          ...(data.email && { email: data.email }),
          ...(data.phone && { phone: data.phone }),
        },
      });
    } catch { /* ignore */ }
  }

  // Log key financial setting changes in Audit Log
  if (data.tuitionFeePerCredit || data.registrationFee || data.telebirrMerchantId || data.chapaPublicKey) {
    await foAuditService.logFinanceAction({
      actorName: data.name || settingsStore.name || 'Finance Officer',
      action: 'Updated Financial Settings Policy',
      module: 'Settings',
      previousValue: `Tuition Rate: ETB ${previous.tuitionFeePerCredit}, Reg Fee: ETB ${previous.registrationFee}`,
      newValue: `Tuition Rate: ETB ${settingsStore.tuitionFeePerCredit}, Reg Fee: ETB ${settingsStore.registrationFee}`,
      status: 'Success',
    });
  }

  return { settings: settingsStore };
}
