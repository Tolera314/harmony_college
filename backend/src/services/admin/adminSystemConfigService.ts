import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/prisma';
import { AuditAction } from '@prisma/client';

const CONFIG_DIR = path.join(process.cwd(), 'uploads', 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'system_config.json');

// Ensure directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

export interface SystemConfigData {
  identity: {
    institutionName: string;
    shortName: string;
    contactEmail: string;
    supportPhone: string;
    campusAddress: string;
    currency: string;
  };
  academics: {
    academicYear: string;
    currentSemester: string;
    maxCreditHours: number;
    defaultPassingGrade: string;
    allowLateRegistration: boolean;
    addDropGraceDays: number;
  };
  financials: {
    defaultCreditHourFee: number;
    admissionApplicationFee: number;
    paymentGraceDays: number;
    autoLockUnpaidAccounts: boolean;
  };
  security: {
    maxLoginAttempts: number;
    sessionTimeoutMinutes: number;
    requireMFA: boolean;
    allowStaffSelfRegistration: boolean;
  };
  notifications: {
    senderName: string;
    senderEmail: string;
    enableEmailNotifs: boolean;
    enableSmsNotifs: boolean;
  };
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_SYSTEM_CONFIG: SystemConfigData = {
  identity: {
    institutionName: 'Harmony College',
    shortName: 'HC',
    contactEmail: 'admin@harmonycollege.edu.et',
    supportPhone: '+251 11 600 0000',
    campusAddress: 'Addis Ababa, Ethiopia',
    currency: 'ETB',
  },
  academics: {
    academicYear: '2025/2026',
    currentSemester: 'Semester I',
    maxCreditHours: 21,
    defaultPassingGrade: 'C',
    allowLateRegistration: true,
    addDropGraceDays: 14,
  },
  financials: {
    defaultCreditHourFee: 650,
    admissionApplicationFee: 300,
    paymentGraceDays: 30,
    autoLockUnpaidAccounts: false,
  },
  security: {
    maxLoginAttempts: 5,
    sessionTimeoutMinutes: 30,
    requireMFA: false,
    allowStaffSelfRegistration: false,
  },
  notifications: {
    senderName: 'Harmony Registrar',
    senderEmail: 'noreply@harmonycollege.edu.et',
    enableEmailNotifs: true,
    enableSmsNotifs: false,
  },
};

export function getSystemConfig(): SystemConfigData {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_SYSTEM_CONFIG, null, 2), 'utf-8');
    return DEFAULT_SYSTEM_CONFIG;
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SYSTEM_CONFIG,
      ...parsed,
      identity: { ...DEFAULT_SYSTEM_CONFIG.identity, ...(parsed.identity || {}) },
      academics: { ...DEFAULT_SYSTEM_CONFIG.academics, ...(parsed.academics || {}) },
      financials: { ...DEFAULT_SYSTEM_CONFIG.financials, ...(parsed.financials || {}) },
      security: { ...DEFAULT_SYSTEM_CONFIG.security, ...(parsed.security || {}) },
      notifications: { ...DEFAULT_SYSTEM_CONFIG.notifications, ...(parsed.notifications || {}) },
    };
  } catch {
    return DEFAULT_SYSTEM_CONFIG;
  }
}

export async function updateSystemConfig(
  newConfig: Partial<SystemConfigData>,
  adminUserId: string,
  ipAddress?: string
): Promise<SystemConfigData> {
  const current = getSystemConfig();
  const updated: SystemConfigData = {
    identity: { ...current.identity, ...(newConfig.identity || {}) },
    academics: { ...current.academics, ...(newConfig.academics || {}) },
    financials: { ...current.financials, ...(newConfig.financials || {}) },
    security: { ...current.security, ...(newConfig.security || {}) },
    notifications: { ...current.notifications, ...(newConfig.notifications || {}) },
    updatedAt: new Date().toISOString(),
    updatedBy: adminUserId,
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: AuditAction.STAFF_INVITATION_CREATED, // or audit log event
      ipAddress,
      metadata: {
        description: 'System configuration parameters updated',
        updatedConfig: updated,
      } as any,
    },
  });

  return updated;
}

export async function resetSystemConfigToDefaults(adminUserId: string, ipAddress?: string): Promise<SystemConfigData> {
  const resetConfig: SystemConfigData = {
    ...DEFAULT_SYSTEM_CONFIG,
    updatedAt: new Date().toISOString(),
    updatedBy: adminUserId,
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(resetConfig, null, 2), 'utf-8');

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: AuditAction.STAFF_INVITATION_CREATED,
      ipAddress,
      metadata: {
        description: 'System configuration parameters reset to default baseline',
      },
    },
  });

  return resetConfig;
}
