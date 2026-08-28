'use client';

/**
 * EmployeeFormPanel — Shared SlidePanel form for Create AND Edit
 * ─────────────────────────────────────────────────────────────────────────────
 * Used for both modes:
 *   mode="create"  — empty form, POST /api/hr/employees
 *   mode="edit"    — pre-populated form, PATCH /api/hr/employees/:id
 *
 * Role rules (enforced here AND in backend):
 *   - STUDENT, ADMIN, SUPER_ADMIN cannot be selected
 *   - INSTRUCTOR / DEPARTMENT_HEAD → courseId is REQUIRED
 *   - All other roles → course field hidden
 *
 * Required uploads (create only):
 *   - Certificate (PDF/image)
 *   - Fayda ID (PDF/image)
 *   Files POST to /api/upload, receive { fileUrl } back.
 *   Existing URLs shown in edit mode (not re-required unless replacing).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, CheckCircle2, AlertCircle, Eye, EyeOff, X,
} from 'lucide-react';
import { SlidePanel } from '../ui/SlidePanel';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  hrEmployeesApi, hrDepartmentsApi, hrCoursesApi,
  type HREmployeeApi, type HRDepartmentApi, type HRCourseOption,
  EMPLOYMENT_TYPE_LABEL,
} from '../../lib/hrApi';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_SYSTEM_ROLES = [
  { value: 'INSTRUCTOR',      label: 'Instructor' },
  { value: 'DEPARTMENT_HEAD', label: 'Department Head' },
  { value: 'REGISTRAR',       label: 'Registrar' },
  { value: 'FINANCE_OFFICER', label: 'Finance Officer' },
  { value: 'HR_OFFICER',      label: 'HR Officer' },
] as const;

const COURSE_REQUIRED_ROLES = new Set(['INSTRUCTOR', 'DEPARTMENT_HEAD']);

// ── File upload helper ────────────────────────────────────────────────────────

interface UploadedFile {
  url: string;
  size: string;
  name: string;
}

async function uploadFile(file: File): Promise<UploadedFile> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Upload failed (${res.status})`);
  }
  const { fileUrl } = await res.json() as { fileUrl: string };
  return {
    url:  fileUrl,
    size: `${(file.size / 1024).toFixed(0)} KB`,
    name: file.name,
  };
}

// ── FileUploadField ───────────────────────────────────────────────────────────

interface FileUploadFieldProps {
  label:       string;
  required?:   boolean;
  accept?:     string;
  existing?:   string | null;       // existing URL (edit mode)
  onUploaded:  (f: UploadedFile | null) => void;
  error?:      string;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label, required, accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  existing, onUploaded, error,
}) => {
  const ref  = useRef<HTMLInputElement>(null);
  const [status,   setStatus]   = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
  const [errMsg,   setErrMsg]   = useState('');

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('uploading'); setErrMsg('');
    try {
      const result = await uploadFile(file);
      setUploaded(result);
      setStatus('done');
      onUploaded(result);
    } catch (err) {
      setStatus('error');
      setErrMsg(err instanceof Error ? err.message : 'Upload failed');
      onUploaded(null);
    }
  };

  const clear = () => {
    setStatus('idle'); setUploaded(null); setErrMsg('');
    if (ref.current) ref.current.value = '';
    onUploaded(null);
  };

  const effectiveUrl = uploaded?.url ?? existing ?? null;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-(--text-secondary) block">
        {label}{required && <span className="ml-1 text-(--status-danger)" aria-hidden="true">*</span>}
      </label>

      {/* Current / uploaded file strip */}
      {effectiveUrl && (
        <div className="flex items-center gap-2 px-3 py-2 bg-(--hover-overlay) border border-(--border-subtle) rounded-xl text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-(--status-success) shrink-0" />
          <a href={effectiveUrl} target="_blank" rel="noopener noreferrer"
            className="text-(--brand-gold) underline truncate flex-1">
            {uploaded?.name ?? 'View existing file'}
          </a>
          {uploaded?.size && <span className="text-(--text-faint) shrink-0">{uploaded.size}</span>}
          <button type="button" onClick={clear}
            className="p-0.5 text-(--text-faint) hover:text-(--status-danger) transition-colors shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Upload trigger */}
      {(!effectiveUrl || uploaded) && (
        <label className={`flex items-center gap-3 px-4 py-3 border border-dashed rounded-xl cursor-pointer transition-colors ${
          error || status === 'error'
            ? 'border-(--status-danger) bg-(--status-danger-bg)'
            : 'border-(--border-default) bg-(--hover-overlay) hover:border-(--brand-gold)/60'
        }`}>
          {status === 'uploading' ? (
            <span className="flex items-center gap-2 text-xs text-(--text-faint) animate-pulse">
              <Upload className="w-4 h-4 shrink-0" /> Uploading…
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs text-(--text-secondary)">
              <Upload className="w-4 h-4 shrink-0 text-(--text-faint)" />
              {effectiveUrl ? 'Replace file' : `Select ${label}`}
            </span>
          )}
          <input ref={ref} type="file" accept={accept} className="hidden"
            onChange={handleChange} disabled={status === 'uploading'} />
        </label>
      )}

      {(error || errMsg) && (
        <p className="flex items-center gap-1 text-[11px] text-(--status-danger)">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error || errMsg}
        </p>
      )}
    </div>
  );
};

// ── Form state shape ──────────────────────────────────────────────────────────

export interface EmployeeFormData {
  // Personal
  fullName:     string;
  email:        string;
  phone:        string;
  gender:       'MALE' | 'FEMALE';
  dateOfBirth:  string;
  address:      string;
  // Employment
  departmentId:   string;
  position:       string;
  employmentType: string;
  systemRole:     string;
  courseId:       string;
  hireDate:       string;
  contractEndDate: string;
  managerId:      string;
  education:      string;
  experienceYears: number;
  // Salary
  basicSalary:  number;
  allowances:   number;
  deductions:   number;
  // Sensitive
  nationalId:   string;
  bankAccount:  string;
  taxNumber:    string;
  // Documents (URLs from /api/upload)
  faydaIdUrl:         string;
  faydaIdFileSize:    string;
  certificateUrl:     string;
  certificateFileSize: string;
  // Emergency
  emergencyName:     string;
  emergencyPhone:    string;
  emergencyRelation: string;
}

const EMPTY: EmployeeFormData = {
  fullName: '', email: '', phone: '', gender: 'MALE',
  dateOfBirth: '', address: '',
  departmentId: '', position: '', employmentType: 'FULL_TIME',
  systemRole: '', courseId: '',
  hireDate: new Date().toISOString().slice(0, 10),
  contractEndDate: '', managerId: '',
  education: '', experienceYears: 0,
  basicSalary: 0, allowances: 0, deductions: 0,
  nationalId: '', bankAccount: '', taxNumber: '',
  faydaIdUrl: '', faydaIdFileSize: '',
  certificateUrl: '', certificateFileSize: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
};

// ── Main component ────────────────────────────────────────────────────────────

export interface EmployeeFormPanelProps {
  isOpen:    boolean;
  onClose:   () => void;
  mode:      'create' | 'edit';
  employee?: HREmployeeApi | null;       // required when mode="edit"
  onSuccess: () => void;                 // called after successful save to refresh list
}

export const EmployeeFormPanel: React.FC<EmployeeFormPanelProps> = ({
  isOpen, onClose, mode, employee, onSuccess,
}) => {
  const [form,     setForm]     = useState<EmployeeFormData>(EMPTY);
  const [depts,    setDepts]    = useState<HRDepartmentApi[]>([]);
  const [courses,  setCourses]  = useState<HRCourseOption[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [errors,   setErrors]   = useState<Partial<Record<keyof EmployeeFormData | 'root', string>>>({});

  const courseRequired = COURSE_REQUIRED_ROLES.has(form.systemRole.toUpperCase());

  // ── Load departments + courses once ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    hrDepartmentsApi.list().then(setDepts).catch(() => {});
    hrCoursesApi.list().then(setCourses).catch(() => {});
  }, [isOpen]);

  // ── Populate form when editing ──────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && employee) {
      setForm({
        fullName:     employee.fullName,
        email:        employee.email,
        phone:        employee.phone        ?? '',
        gender:       employee.gender,
        dateOfBirth:  employee.dateOfBirth
          ? new Date(employee.dateOfBirth).toISOString().slice(0, 10)
          : '',
        address:      employee.address      ?? '',
        departmentId: employee.departmentId,
        position:     employee.position,
        employmentType: employee.employmentType,
        systemRole:   employee.systemRole   ?? '',
        courseId:     employee.courseId     ?? '',
        hireDate:     new Date(employee.hireDate).toISOString().slice(0, 10),
        contractEndDate: employee.contractEndDate
          ? new Date(employee.contractEndDate).toISOString().slice(0, 10)
          : '',
        managerId:    employee.managerId    ?? '',
        education:    employee.education    ?? '',
        experienceYears: employee.experienceYears ?? 0,
        basicSalary:  employee.basicSalary,
        allowances:   employee.allowances,
        deductions:   employee.deductions,
        nationalId:   employee.nationalId   ?? '',
        bankAccount:  employee.bankAccount  ?? '',
        taxNumber:    employee.taxNumber    ?? '',
        faydaIdUrl:       employee.faydaIdUrl       ?? '',
        faydaIdFileSize:  employee.faydaIdFileSize   ?? '',
        certificateUrl:   employee.certificateUrl    ?? '',
        certificateFileSize: employee.certificateFileSize ?? '',
        emergencyName:     employee.emergencyName    ?? '',
        emergencyPhone:    employee.emergencyPhone   ?? '',
        emergencyRelation: employee.emergencyRelation ?? '',
      });
    } else if (mode === 'create') {
      setForm(EMPTY);
    }
    setErrors({});
  }, [isOpen, mode, employee]);

  const set = <K extends keyof EmployeeFormData>(key: K, value: EmployeeFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: typeof errors = {};

    if (!form.fullName.trim())   errs.fullName    = 'Full name is required';
    if (!form.email.trim())      errs.email       = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.departmentId)      errs.departmentId = 'Department is required';
    if (!form.position.trim())   errs.position    = 'Position is required';
    if (!form.hireDate)          errs.hireDate    = 'Hire date is required';

    if (form.basicSalary < 0)    errs.basicSalary = 'Cannot be negative';
    if (form.allowances  < 0)    errs.allowances  = 'Cannot be negative';
    if (form.deductions  < 0)    errs.deductions  = 'Cannot be negative';

    if (courseRequired && !form.courseId)
      errs.courseId = `Course is required for ${form.systemRole}`;

    if (mode === 'create') {
      if (!form.certificateUrl)
        errs.certificateUrl = 'Certificate upload is required';
      if (!form.faydaIdUrl)
        errs.faydaIdUrl = 'Fayda ID upload is required';
    }

    if (form.contractEndDate && form.contractEndDate < form.hireDate)
      errs.contractEndDate = 'Contract end must be after hire date';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Auto-generate employee code ─────────────────────────────────────────────
  const generateCode = useCallback((deptId: string, role: string) => {
    const dept = depts.find(d => d.id === deptId);
    const prefix = dept?.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) ?? 'HC';
    const rolePrefix = role === 'INSTRUCTOR' ? 'FAC' : role === 'HR_OFFICER' ? 'HR' : prefix;
    return `HC-${rolePrefix}-${Date.now().toString().slice(-5)}`;
  }, [depts]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setErrors({});

    try {
      const payload: Record<string, unknown> = {
        fullName:     form.fullName.trim(),
        email:        form.email.trim(),
        phone:        form.phone     || null,
        gender:       form.gender,
        dateOfBirth:  form.dateOfBirth || null,
        address:      form.address   || null,
        departmentId: form.departmentId,
        position:     form.position.trim(),
        employmentType: form.employmentType,
        systemRole:   form.systemRole || null,
        courseId:     (courseRequired && form.courseId) ? form.courseId : null,
        hireDate:     form.hireDate,
        contractEndDate: form.contractEndDate || null,
        managerId:    form.managerId   || null,
        education:    form.education   || null,
        experienceYears: form.experienceYears,
        basicSalary:  form.basicSalary,
        allowances:   form.allowances,
        deductions:   form.deductions,
        nationalId:   form.nationalId  || null,
        bankAccount:  form.bankAccount || null,
        taxNumber:    form.taxNumber   || null,
        faydaIdUrl:       form.faydaIdUrl       || null,
        faydaIdFileSize:  form.faydaIdFileSize   || null,
        certificateUrl:   form.certificateUrl    || null,
        certificateFileSize: form.certificateFileSize || null,
        emergencyName:     form.emergencyName    || null,
        emergencyPhone:    form.emergencyPhone   || null,
        emergencyRelation: form.emergencyRelation || null,
      };

      if (mode === 'create') {
        payload.employeeCode = generateCode(form.departmentId, form.systemRole);
        await hrEmployeesApi.create(payload);
      } else if (mode === 'edit' && employee) {
        await hrEmployeesApi.update(employee.id, payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrors({ root: err instanceof Error ? err.message : 'Save failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const sel = 'w-full px-3 py-2.5 bg-(--bg-base) border border-(--border-default) rounded-xl text-xs text-(--text-primary) focus:outline-none focus:border-(--brand-gold) transition-colors';
  const selErr = `${sel} border-(--status-danger)`;

  const sectionHeader = (title: string) => (
    <p className="font-mono text-[11px] uppercase tracking-wider text-(--brand-gold) pt-1">{title}</p>
  );

  const fieldErr = (key: keyof EmployeeFormData) =>
    errors[key] ? <p className="text-[11px] text-(--status-danger) mt-0.5">{errors[key]}</p> : null;

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Employee' : `Edit: ${employee?.fullName ?? ''}`}
      subtitle={mode === 'create' ? 'HR · Employee Registration' : 'HR · Employee Management'}
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full">
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Root error */}
          {errors.root && (
            <div className="flex items-start gap-2 p-3 bg-(--status-danger-bg) border border-(--status-danger-border) rounded-xl text-xs text-(--status-danger)">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {errors.root}
            </div>
          )}

          {/* ── Personal ─────────────────────────────────────────────────── */}
          {sectionHeader('Personal Information')}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Full Name" required value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
                error={errors.fullName} />
            </div>
            <div>
              <Input label="Email Address" required type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                error={errors.email} />
            </div>
            <div>
              <Input label="Phone" value={form.phone}
                onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-secondary)">
                Gender <span className="text-(--status-danger)" aria-hidden="true">*</span>
              </label>
              <select value={form.gender} onChange={e => set('gender', e.target.value as 'MALE'|'FEMALE')} className={sel}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-secondary)">Date of Birth</label>
              <input type="date" value={form.dateOfBirth}
                onChange={e => set('dateOfBirth', e.target.value)}
                max={new Date().toISOString().slice(0, 10)} className={sel} />
            </div>
            <div>
              <Input label="Address" value={form.address}
                onChange={e => set('address', e.target.value)} />
            </div>
          </div>

          {/* ── Employment ───────────────────────────────────────────────── */}
          {sectionHeader('Employment Details')}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-secondary)">
                Department <span className="text-(--status-danger)" aria-hidden="true">*</span>
              </label>
              <select value={form.departmentId}
                onChange={e => set('departmentId', e.target.value)}
                className={errors.departmentId ? selErr : sel}>
                <option value="">— Select Department —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {fieldErr('departmentId')}
            </div>
            <div>
              <Input label="Position Title" required value={form.position}
                onChange={e => set('position', e.target.value)}
                error={errors.position} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-secondary)">System Role</label>
              <select value={form.systemRole} onChange={e => {
                set('systemRole', e.target.value);
                // Clear course if new role doesn't need it
                if (!COURSE_REQUIRED_ROLES.has(e.target.value.toUpperCase())) {
                  set('courseId', '');
                }
              }} className={sel}>
                <option value="">— No platform role —</option>
                {ALLOWED_SYSTEM_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-(--text-faint)">The platform login role this employee will have.</p>
            </div>

            {/* Course — conditional, shown only for INSTRUCTOR / DEPARTMENT_HEAD */}
            {courseRequired && (
              <AnimatePresence>
                <motion.div
                  key="course-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-xs font-semibold text-(--text-secondary)">
                    Course <span className="text-(--status-danger)" aria-hidden="true">*</span>
                    <Badge variant="amber" className="ml-2 text-[9px]">Required for {form.systemRole}</Badge>
                  </label>
                  <select value={form.courseId}
                    onChange={e => set('courseId', e.target.value)}
                    className={errors.courseId ? selErr : sel}>
                    <option value="">— Select Course —</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                  {fieldErr('courseId')}
                </motion.div>
              </AnimatePresence>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-secondary)">
                Employment Type <span className="text-(--status-danger)" aria-hidden="true">*</span>
              </label>
              <select value={form.employmentType}
                onChange={e => set('employmentType', e.target.value)} className={sel}>
                {(['FULL_TIME','PART_TIME','CONTRACT','INTERN'] as const).map(t => (
                  <option key={t} value={t}>{(EMPLOYMENT_TYPE_LABEL as Record<string,string>)[t]}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-secondary)">
                Hire / Start Date <span className="text-(--status-danger)" aria-hidden="true">*</span>
              </label>
              <input type="date" value={form.hireDate}
                onChange={e => set('hireDate', e.target.value)}
                className={errors.hireDate ? selErr : sel} />
              {fieldErr('hireDate')}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-secondary)">Contract End Date</label>
              <input type="date" value={form.contractEndDate}
                onChange={e => set('contractEndDate', e.target.value)}
                min={form.hireDate || undefined}
                className={errors.contractEndDate ? selErr : sel} />
              {fieldErr('contractEndDate')}
              <p className="text-[10px] text-(--text-faint)">Leave empty for permanent contracts.</p>
            </div>

            <div>
              <Input label="Education / Qualifications" value={form.education}
                onChange={e => set('education', e.target.value)} />
            </div>
            <div>
              <Input label="Years of Experience" type="number" min="0" max="60"
                value={String(form.experienceYears)}
                onChange={e => set('experienceYears', Number(e.target.value))} />
            </div>
          </div>

          {/* ── Required documents ───────────────────────────────────────── */}
          {sectionHeader(`Documents ${mode === 'create' ? '(Required)' : ''}`)}
          <div className="grid grid-cols-2 gap-4">
            <FileUploadField
              label="Certificate"
              required={mode === 'create' && !form.certificateUrl}
              accept=".pdf,.jpg,.jpeg,.png"
              existing={mode === 'edit' ? form.certificateUrl : null}
              error={errors.certificateUrl}
              onUploaded={f => {
                set('certificateUrl',      f?.url  ?? '');
                set('certificateFileSize', f?.size ?? '');
              }}
            />
            <FileUploadField
              label="Fayda ID"
              required={mode === 'create' && !form.faydaIdUrl}
              accept=".pdf,.jpg,.jpeg,.png"
              existing={mode === 'edit' ? form.faydaIdUrl : null}
              error={errors.faydaIdUrl}
              onUploaded={f => {
                set('faydaIdUrl',      f?.url  ?? '');
                set('faydaIdFileSize', f?.size ?? '');
              }}
            />
          </div>

          {/* ── Salary ───────────────────────────────────────────────────── */}
          {sectionHeader('Salary (ETB)')}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Input label="Basic Salary" required type="number" min="0"
                value={String(form.basicSalary)}
                onChange={e => set('basicSalary', Number(e.target.value))}
                error={errors.basicSalary} />
            </div>
            <div>
              <Input label="Allowances" type="number" min="0"
                value={String(form.allowances)}
                onChange={e => set('allowances', Number(e.target.value))}
                error={errors.allowances}
                hint="Optional" />
            </div>
            <div>
              <Input label="Deductions" type="number" min="0"
                value={String(form.deductions)}
                onChange={e => set('deductions', Number(e.target.value))}
                error={errors.deductions}
                hint="Optional" />
            </div>
          </div>
          {(form.basicSalary > 0) && (
            <div className="px-3 py-2 bg-(--accent-gold-subtle) border border-(--accent-gold-border) rounded-xl font-mono text-xs text-(--brand-gold)">
              Gross monthly: ETB {(form.basicSalary + form.allowances).toLocaleString()}
            </div>
          )}

          {/* ── Sensitive / banking ──────────────────────────────────────── */}
          {sectionHeader('Sensitive Information')}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Input label="National ID" value={form.nationalId}
                onChange={e => set('nationalId', e.target.value)} />
            </div>
            <div>
              <Input label="Bank Account" value={form.bankAccount}
                onChange={e => set('bankAccount', e.target.value)} />
            </div>
            <div>
              <Input label="Tax Number" value={form.taxNumber}
                onChange={e => set('taxNumber', e.target.value)} />
            </div>
          </div>

          {/* ── Emergency contact ────────────────────────────────────────── */}
          {sectionHeader('Emergency Contact')}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Input label="Name" value={form.emergencyName}
                onChange={e => set('emergencyName', e.target.value)} />
            </div>
            <div>
              <Input label="Phone" value={form.emergencyPhone}
                onChange={e => set('emergencyPhone', e.target.value)} />
            </div>
            <div>
              <Input label="Relation" value={form.emergencyRelation}
                onChange={e => set('emergencyRelation', e.target.value)} />
            </div>
          </div>

          {/* ── Edit-only status fields ───────────────────────────────────── */}
          {mode === 'edit' && (
            <>
              {sectionHeader('Status')}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-secondary)">Employee Status</label>
                  <select value={form.position /* placeholder — actual below */}
                    className={sel} disabled>
                    <option>Use Deactivate button to change status</option>
                  </select>
                  <p className="text-[10px] text-(--text-faint)">Use the Deactivate action in the employee list to change status.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Sticky footer ────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 border-t border-(--border-default) bg-(--bg-modal) flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" disabled={saving}>
            {saving
              ? (mode === 'create' ? 'Creating…' : 'Saving…')
              : (mode === 'create' ? 'Create Employee' : 'Save Changes')}
          </Button>
        </div>
      </form>
    </SlidePanel>
  );
};
