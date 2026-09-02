import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/prisma';
import { AuditAction } from '@prisma/client';

const BACKUP_DIR = path.join(process.cwd(), 'uploads', 'backups');
const MANIFEST_PATH = path.join(BACKUP_DIR, 'backups_manifest.json');
const MAINTENANCE_PATH = path.join(BACKUP_DIR, 'maintenance.json');

// Ensure directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export interface BackupSnapshotMeta {
  id: string;
  filename: string;
  type: 'FULL' | 'DATABASE' | 'DOCUMENTS';
  sizeBytes: number;
  status: 'COMPLETED' | 'FAILED';
  createdAt: string;
  createdBy: string;
}

export interface MaintenanceState {
  active: boolean;
  reason?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function readManifest(): BackupSnapshotMeta[] {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeManifest(manifest: BackupSnapshotMeta[]) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

export function getMaintenanceState(): MaintenanceState {
  if (!fs.existsSync(MAINTENANCE_PATH)) return { active: false };
  try {
    const raw = fs.readFileSync(MAINTENANCE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { active: false };
  }
}

export function setMaintenanceState(active: boolean, reason?: string, adminUserId?: string): MaintenanceState {
  const state: MaintenanceState = {
    active,
    reason: reason || (active ? 'Scheduled System Maintenance' : undefined),
    updatedAt: new Date().toISOString(),
    updatedBy: adminUserId,
  };
  fs.writeFileSync(MAINTENANCE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  return state;
}

// ── Public Service API ───────────────────────────────────────────────────────

export async function getBackupStats() {
  const snapshots = readManifest();
  const totalSizeBytes = snapshots.reduce((sum, s) => sum + s.sizeBytes, 0);
  const lastBackup = snapshots[0]?.createdAt || null;
  const maintenance = getMaintenanceState();

  return {
    totalSnapshots: snapshots.length,
    totalSizeBytes,
    totalSizeMB: (totalSizeBytes / (1024 * 1024)).toFixed(2),
    lastBackupAt: lastBackup,
    maintenanceActive: maintenance.active,
    maintenanceReason: maintenance.reason,
  };
}

export async function listBackupSnapshots() {
  return readManifest();
}

export async function triggerBackup(
  type: 'FULL' | 'DATABASE' | 'DOCUMENTS' = 'FULL',
  adminUserId: string,
  ipAddress?: string
): Promise<BackupSnapshotMeta> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `harmony_backup_${type.toLowerCase()}_${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  // Extract snapshot data from database
  const [users, students, accounts, transactions, hrEmployees, offerings] = await Promise.all([
    prisma.user.findMany({ select: { id: true, fullName: true, email: true, role: true, status: true, createdAt: true } }),
    prisma.studentProfile.findMany(),
    prisma.financialAccount.findMany(),
    prisma.financialTransaction.findMany({ take: 500 }),
    prisma.hREmployee.findMany({ select: { id: true, employeeCode: true, fullName: true, position: true, status: true } }),
    prisma.courseOffering.findMany({ select: { id: true, courseId: true, status: true } }),
  ]);

  const payload = {
    metadata: {
      institution: 'Harmony College Management System',
      backupType: type,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
    },
    counts: {
      users: users.length,
      students: students.length,
      accounts: accounts.length,
      transactions: transactions.length,
      hrEmployees: hrEmployees.length,
      offerings: offerings.length,
    },
    data: {
      users,
      students,
      accounts,
      transactions,
      hrEmployees,
      offerings,
    },
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  fs.writeFileSync(filePath, jsonStr, 'utf-8');

  const stats = fs.statSync(filePath);
  const snapshot: BackupSnapshotMeta = {
    id: `bkp_${Date.now()}`,
    filename,
    type,
    sizeBytes: stats.size,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    createdBy: adminUserId,
  };

  const manifest = readManifest();
  manifest.unshift(snapshot);
  writeManifest(manifest);

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: AuditAction.STAFF_INVITATION_CREATED, // or audit log event
      ipAddress,
      metadata: {
        backupType: type,
        snapshotId: snapshot.id,
        filename,
        sizeBytes: stats.size,
      },
    },
  });

  return snapshot;
}

export function getBackupFilePath(id: string): string {
  const manifest = readManifest();
  const snapshot = manifest.find(s => s.id === id);

  if (!snapshot) {
    throw new Error('Backup snapshot record not found');
  }

  const filePath = path.join(BACKUP_DIR, snapshot.filename);
  if (!fs.existsSync(filePath)) {
    throw new Error('Backup file does not exist on disk');
  }

  return filePath;
}
