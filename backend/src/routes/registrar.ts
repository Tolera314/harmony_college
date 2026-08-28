/**
 * /api/registrar — Registrar Officer routes
 * All routes require: authenticate + requireRole([REGISTRAR, ADMIN, SUPER_ADMIN])
 */
import { Router, Response, Request } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role, ApplicationStatus, StudentStatus, CourseStatus, OfferingStatus, EnrollmentStatus } from '@prisma/client';
import * as dashboard from '../services/registrar/dashboardService';
import * as students  from '../services/registrar/studentService';
import * as admissions from '../services/registrar/admissionService';
import * as courses   from '../services/registrar/courseService';
import * as offerings from '../services/registrar/offeringService';
import * as enrollments from '../services/registrar/enrollmentService';
import * as transcripts from '../services/registrar/transcriptService';
import * as graduation from '../services/registrar/graduationService';
import * as certificates from '../services/registrar/certificateService';
import * as reports from '../services/registrar/reportsService';
import { prisma } from '../lib/prisma';
import {
  broadcastTimetableCreated,
  broadcastTimetableUpdated,
  broadcastTimetableDeleted,
  broadcastTimetableConflict,
} from '../lib/socket';

const router = Router();
const REGISTRAR_ROLES = [Role.REGISTRAR, Role.ADMIN, Role.SUPER_ADMIN];
router.use(authenticate, requireRole(REGISTRAR_ROLES));

// ── helpers ─────────────────────────────────────────────────────────────────
type Q = Record<string, string | undefined>;
function q(req: Request): Q { return req.query as Q; }
function pid(req: Request, key = 'id'): string { return req.params[key] as string; }
function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function fail(res: Response, err: unknown, status = 500) {
  const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
  const s = (status === 500 && (msg.includes('not found') || msg.includes('Not found'))) ? 404 : status;
  res.status(s).json({ error: msg });
}
function pageParams(query: Q) {
  const page  = Math.max(1, parseInt(query.page  ?? '1',  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20));
  return { page, limit };
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
router.get('/dashboard', async (_req, res) => {
  try { ok(res, await dashboard.getDashboardStats()); } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// STUDENTS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/students', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await students.listStudents({
      page, limit,
      search:       qp.search,
      programId:    qp.programId,
      departmentId: qp.departmentId,
      status:       qp.status as StudentStatus | undefined,
      sortBy:       qp.sortBy,
      sortOrder:    qp.sortOrder as 'asc' | 'desc' | undefined,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/students/:id', async (req: AuthRequest, res) => {
  try {
    const s = await students.getStudentById(pid(req));
    if (!s) { res.status(404).json({ error: 'Student not found' }); return; }
    ok(res, s);
  } catch (e) { fail(res, e); }
});

router.patch('/students/:id/status', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ status: z.nativeEnum(StudentStatus) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid status' }); return; }
    ok(res, await students.updateStudentStatus(pid(req), parsed.data.status, req.user!.userId));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMISSIONS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/admissions', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await admissions.listApplications({
      page, limit,
      search:       qp.search,
      status:       qp.status as ApplicationStatus | undefined,
      program:      qp.program,
      academicYear: qp.academicYear,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/admissions/:id', async (req: AuthRequest, res) => {
  try {
    const app = await admissions.getApplicationById(pid(req));
    if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
    ok(res, app);
  } catch (e) { fail(res, e); }
});

router.patch('/admissions/:id/approve', async (req: AuthRequest, res) => {
  try {
    const { comment } = req.body as { comment?: string };
    ok(res, await admissions.approveApplication(pid(req), req.user!.userId, comment));
  } catch (e) { fail(res, e, 400); }
});

router.patch('/admissions/:id/reject', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ reason: z.string().min(5, 'Reason must be at least 5 characters') }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Reason required' }); return; }
    ok(res, await admissions.rejectApplication(pid(req), req.user!.userId, parsed.data.reason));
  } catch (e) { fail(res, e, 400); }
});

router.patch('/admissions/:id/request-correction', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ comment: z.string().min(5) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Comment required' }); return; }
    ok(res, await admissions.requestCorrection(pid(req), req.user!.userId, parsed.data.comment));
  } catch (e) { fail(res, e, 400); }
});

router.post('/admissions/:id/comments', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ comment: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Comment is required' }); return; }
    ok(res, await admissions.addComment(pid(req), req.user!.userId, parsed.data.comment));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// COURSES
// ══════════════════════════════════════════════════════════════════════════════
router.get('/courses', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await courses.listCourses({
      page, limit,
      search:       qp.search,
      departmentId: qp.departmentId,
      status:       qp.status as CourseStatus | undefined,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/courses/meta', async (_req, res) => {
  try {
    const [depts, progs] = await Promise.all([courses.listDepartments(), courses.listPrograms()]);
    ok(res, { departments: depts, programs: progs });
  } catch (e) { fail(res, e); }
});

router.get('/courses/:id', async (req: AuthRequest, res) => {
  try {
    const c = await courses.getCourseById(pid(req));
    if (!c) { res.status(404).json({ error: 'Course not found' }); return; }
    ok(res, c);
  } catch (e) { fail(res, e); }
});

router.post('/courses', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      code: z.string().min(2).max(20), name: z.string().min(3).max(200),
      description: z.string().optional(), creditHours: z.number().int().min(1).max(10),
      departmentId: z.string().uuid(), prerequisiteIds: z.array(z.string().uuid()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await courses.createCourse(parsed.data, req.user!.userId), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/courses/:id', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name: z.string().min(3).optional(), description: z.string().optional(),
      creditHours: z.number().int().min(1).max(10).optional(),
      departmentId: z.string().uuid().optional(),
      prerequisiteIds: z.array(z.string().uuid()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await courses.updateCourse(pid(req), parsed.data, req.user!.userId));
  } catch (e) { fail(res, e, 400); }
});

router.patch('/courses/:id/status', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ status: z.nativeEnum(CourseStatus) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid status' }); return; }
    ok(res, await courses.setCourseStatus(pid(req), parsed.data.status, req.user!.userId));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// COURSE OFFERINGS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/offerings', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await offerings.listOfferings({
      page, limit,
      search:     qp.search,
      semesterId: qp.semesterId,
      status:     qp.status as OfferingStatus | undefined,
      courseId:   qp.courseId,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/offerings/meta', async (_req, res) => {
  try {
    const [sems, rooms, instrs] = await Promise.all([
      offerings.listSemesters(), offerings.listRooms(), offerings.listInstructors(),
    ]);
    ok(res, { semesters: sems, rooms, instructors: instrs });
  } catch (e) { fail(res, e); }
});

router.get('/offerings/:id', async (req: AuthRequest, res) => {
  try {
    const off = await offerings.getOfferingById(pid(req));
    if (!off) { res.status(404).json({ error: 'Offering not found' }); return; }
    ok(res, off);
  } catch (e) { fail(res, e); }
});

router.post('/offerings', async (req: AuthRequest, res) => {
  try {
    const slotSchema = z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: z.string(), endTime: z.string() });
    const schema = z.object({
      courseId: z.string().uuid(), semesterId: z.string().uuid(),
      instructorId: z.string().uuid().optional(), roomId: z.string().uuid().optional(),
      capacity: z.number().int().min(1).max(500).default(40),
      section: z.string().max(5).optional(), timetables: z.array(slotSchema).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await offerings.createOffering(parsed.data, req.user!.userId), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/offerings/:id', async (req: AuthRequest, res) => {
  try {
    const slotSchema = z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: z.string(), endTime: z.string() });
    const schema = z.object({
      instructorId: z.string().uuid().nullable().optional(),
      roomId: z.string().uuid().nullable().optional(),
      capacity: z.number().int().min(1).max(500).optional(),
      status: z.nativeEnum(OfferingStatus).optional(),
      timetables: z.array(slotSchema).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await offerings.updateOffering(pid(req), parsed.data, req.user!.userId));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ENROLLMENTS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/enrollments', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await enrollments.listEnrollments({
      page, limit,
      search:     qp.search,
      offeringId: qp.offeringId,
      studentId:  qp.studentId,
      status:     qp.status as EnrollmentStatus | undefined,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/enrollments/student/:studentRecordId', async (req: AuthRequest, res) => {
  try {
    const result = await enrollments.getStudentEnrollments(pid(req,"studentRecordId"));
    if (!result) { res.status(404).json({ error: 'Student not found' }); return; }
    ok(res, result);
  } catch (e) { fail(res, e); }
});

router.post('/enrollments', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ studentRecordId: z.string().uuid(), courseOfferingId: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await enrollments.addEnrollment({ ...parsed.data, registrarUserId: req.user!.userId }), 201);
  } catch (e) { fail(res, e, 400); }
});

router.post('/enrollments/force-add', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({
      studentRecordId: z.string().uuid(), courseOfferingId: z.string().uuid(),
      reason: z.string().min(5, 'Reason must be at least 5 characters'),
    }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await enrollments.forceAddEnrollment({ ...parsed.data, registrarUserId: req.user!.userId }), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/enrollments/:id/drop', async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body as { reason?: string };
    ok(res, await enrollments.dropEnrollment(pid(req), reason ?? '', req.user!.userId));
  } catch (e) { fail(res, e, 400); }
});

router.patch('/enrollments/:id/force-drop', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ reason: z.string().min(5, 'Reason must be at least 5 characters') }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Reason required' }); return; }
    ok(res, await enrollments.forceDropEnrollment({ enrollmentId: pid(req), reason: parsed.data.reason, registrarUserId: req.user!.userId }));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/audit-logs', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (qp.action)     where.action     = qp.action;
    if (qp.entityType) where.entityType = qp.entityType;
    if (qp.userId)     where.userId     = qp.userId;
    if (qp.from || qp.to) {
      const dateFilter: Record<string, Date> = {};
      if (qp.from) dateFilter.gte = new Date(qp.from);
      if (qp.to)   dateFilter.lte = new Date(qp.to);
      where.createdAt = dateFilter;
    }
    const [total, logs] = await Promise.all([
      prisma.registrarAuditLog.count({ where }),
      prisma.registrarAuditLog.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, role: true } } },
      }),
    ]);
    ok(res, { total, page, limit, totalPages: Math.ceil(total / limit), logs });
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ACADEMIC CALENDAR
// ══════════════════════════════════════════════════════════════════════════════
router.get('/calendar', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    const where: Record<string, unknown> = {};
    if (qp.academicYearId) where.academicYearId = qp.academicYearId;
    if (qp.published === 'true') where.isPublished = true;
    const events = await prisma.academicCalendarEvent.findMany({
      where, orderBy: { startDate: 'asc' },
      include: { academicYear: { select: { name: true } } },
    });
    ok(res, events);
  } catch (e) { fail(res, e); }
});

router.post('/calendar', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      title: z.string().min(3), description: z.string().optional(),
      eventType: z.string(), startDate: z.string(), endDate: z.string(),
      isPublished: z.boolean().optional(), academicYearId: z.string().uuid().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const event = await prisma.academicCalendarEvent.create({
      data: {
        title: parsed.data.title, description: parsed.data.description,
        eventType: parsed.data.eventType as any,
        startDate: new Date(parsed.data.startDate), endDate: new Date(parsed.data.endDate),
        isPublished: parsed.data.isPublished ?? false,
        academicYearId: parsed.data.academicYearId ?? null,
        createdBy: req.user!.userId,
      },
    });
    await prisma.registrarAuditLog.create({
      data: { userId: req.user!.userId, action: 'CALENDAR_EVENT_CREATED', entityType: 'AcademicCalendarEvent', entityId: event.id, description: `Calendar event created: ${event.title}` },
    });
    ok(res, event, 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/calendar/:id', async (req: AuthRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const event = await prisma.academicCalendarEvent.update({
      where: { id: pid(req) },
      data: {
        title:       body.title       as string | undefined,
        description: body.description as string | undefined,
        startDate:   body.startDate ? new Date(body.startDate as string) : undefined,
        endDate:     body.endDate   ? new Date(body.endDate   as string) : undefined,
        isPublished: body.isPublished as boolean | undefined,
      },
    });
    await prisma.registrarAuditLog.create({
      data: { userId: req.user!.userId, action: 'CALENDAR_EVENT_UPDATED', entityType: 'AcademicCalendarEvent', entityId: pid(req), description: `Calendar event updated: ${event.title}` },
    });
    ok(res, event);
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/announcements', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (qp.status) where.status = qp.status;
    const [total, announcements] = await Promise.all([
      prisma.announcement.count({ where }),
      prisma.announcement.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);
    ok(res, { total, page, limit, totalPages: Math.ceil(total / limit), announcements });
  } catch (e) { fail(res, e); }
});

router.post('/announcements', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      title: z.string().min(3), content: z.string().min(10),
      priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional(),
      targetAudience: z.string().optional(),
      publishDate: z.string().optional(), expirationDate: z.string().optional(),
      publish: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const willPublish = parsed.data.publish === true;
    const ann = await prisma.announcement.create({
      data: {
        title: parsed.data.title, content: parsed.data.content,
        priority: parsed.data.priority ?? 'NORMAL',
        targetAudience: parsed.data.targetAudience ?? 'ALL',
        status: willPublish ? 'PUBLISHED' : 'DRAFT',
        publishDate:     parsed.data.publishDate    ? new Date(parsed.data.publishDate)    : null,
        expirationDate:  parsed.data.expirationDate ? new Date(parsed.data.expirationDate) : null,
        createdBy: req.user!.userId,
        publishedBy:  willPublish ? req.user!.userId : null,
        publishedAt:  willPublish ? new Date()       : null,
      },
    });
    if (willPublish) {
      await prisma.registrarAuditLog.create({
        data: { userId: req.user!.userId, action: 'ANNOUNCEMENT_PUBLISHED', entityType: 'Announcement', entityId: ann.id, description: `Announcement published: ${ann.title}` },
      });
    }
    ok(res, ann, 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/announcements/:id', async (req: AuthRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const { publish, archive, ...rest } = body;
    const statusData: Record<string, unknown> = {};
    if (publish === true) { statusData.status = 'PUBLISHED'; statusData.publishedBy = req.user!.userId; statusData.publishedAt = new Date(); }
    if (archive === true) { statusData.status = 'ARCHIVED'; }
    const ann = await prisma.announcement.update({ where: { id: pid(req) }, data: { ...(rest as any), ...statusData } });
    if (publish === true) {
      await prisma.registrarAuditLog.create({
        data: { userId: req.user!.userId, action: 'ANNOUNCEMENT_PUBLISHED', entityType: 'Announcement', entityId: pid(req), description: `Announcement published: ${ann.title}` },
      });
    }
    ok(res, ann);
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// TRANSCRIPTS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/transcripts', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await transcripts.listTranscriptRequests({ page, limit, search: qp.search, status: qp.status }));
  } catch (e) { fail(res, e); }
});

router.get('/transcripts/student/:studentRecordId', async (req: AuthRequest, res) => {
  try {
    const data = await transcripts.getTranscriptData(pid(req, 'studentRecordId'));
    if (!data) { res.status(404).json({ error: 'Student not found' }); return; }
    ok(res, data);
  } catch (e) { fail(res, e); }
});

router.post('/transcripts/request', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ studentRecordId: z.string().uuid(), purpose: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed' }); return; }
    ok(res, await transcripts.createTranscriptRequest(parsed.data.studentRecordId, parsed.data.purpose ?? ''), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/transcripts/:id/approve', async (req: AuthRequest, res) => {
  try { ok(res, await transcripts.processTranscriptRequest(pid(req), 'approve', req.user!.userId)); }
  catch (e) { fail(res, e, 400); }
});

router.patch('/transcripts/:id/reject', async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body as { reason?: string };
    ok(res, await transcripts.processTranscriptRequest(pid(req), 'reject', req.user!.userId, reason));
  } catch (e) { fail(res, e, 400); }
});

router.patch('/transcripts/:id/issue', async (req: AuthRequest, res) => {
  try { ok(res, await transcripts.processTranscriptRequest(pid(req), 'issue', req.user!.userId)); }
  catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// GRADUATION
// ══════════════════════════════════════════════════════════════════════════════
router.get('/graduation', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await graduation.listGraduationAudits({ page, limit, search: qp.search, status: qp.status }));
  } catch (e) { fail(res, e); }
});

router.post('/graduation/audit/:studentRecordId', async (req: AuthRequest, res) => {
  try {
    ok(res, await graduation.runGraduationAudit(pid(req, 'studentRecordId'), req.user!.userId));
  } catch (e) { fail(res, e, 400); }
});

router.patch('/graduation/:id/approve', async (req: AuthRequest, res) => {
  try {
    const { notes } = req.body as { notes?: string };
    ok(res, await graduation.reviewGraduation(pid(req), 'approve', req.user!.userId, notes));
  } catch (e) { fail(res, e, 400); }
});

router.patch('/graduation/:id/reject', async (req: AuthRequest, res) => {
  try {
    const { notes } = req.body as { notes?: string };
    ok(res, await graduation.reviewGraduation(pid(req), 'reject', req.user!.userId, notes));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CERTIFICATES
// ══════════════════════════════════════════════════════════════════════════════
router.get('/certificates', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await certificates.listCertificates({ page, limit, search: qp.search, status: qp.status }));
  } catch (e) { fail(res, e); }
});

router.post('/certificates/issue', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ studentRecordId: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'studentRecordId required' }); return; }
    ok(res, await certificates.issueCertificate(parsed.data.studentRecordId, req.user!.userId), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/certificates/:id/revoke', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ reason: z.string().min(5) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Reason required (min 5 chars)' }); return; }
    ok(res, await certificates.revokeCertificate(pid(req), parsed.data.reason, req.user!.userId));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL SEARCH — searches students, applications, courses, offerings,
// enrollments, certificates, transcripts in parallel with a single query.
// ══════════════════════════════════════════════════════════════════════════════
router.get('/search', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    const term = qp.q?.trim();
    if (!term || term.length < 2) {
      ok(res, { query: term ?? '', results: [] });
      return;
    }

    const [studentRows, appRows, courseRows, offeringRows] = await Promise.all([
      prisma.studentRecord.findMany({
        where: {
          OR: [
            { studentId: { contains: term, mode: 'insensitive' } },
            { user: { fullName: { contains: term, mode: 'insensitive' } } },
            { user: { email:    { contains: term, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        select: { id: true, studentId: true, status: true, user: { select: { fullName: true } }, program: { select: { name: true } } },
      }),
      prisma.application.findMany({
        where: {
          OR: [
            { fullName: { contains: term, mode: 'insensitive' } },
            { user: { email: { contains: term, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        select: { id: true, fullName: true, status: true, program: true, submittedAt: true },
      }),
      prisma.course.findMany({
        where: {
          OR: [
            { code: { contains: term, mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, code: true, name: true, status: true, department: { select: { name: true } } },
      }),
      prisma.courseOffering.findMany({
        where: {
          OR: [
            { course: { code: { contains: term, mode: 'insensitive' } } },
            { course: { name: { contains: term, mode: 'insensitive' } } },
            { instructor: { user: { fullName: { contains: term, mode: 'insensitive' } } } },
          ],
        },
        take: 4,
        select: {
          id: true, status: true, section: true,
          course: { select: { code: true, name: true } },
          semester: { select: { name: true } },
        },
      }),
    ]);

    const results = [
      ...studentRows.map(s => ({
        type: 'student' as const,
        id: s.id,
        label: s.user.fullName,
        sub: `${s.studentId} · ${s.program.name}`,
        status: s.status,
        tab: 'students' as const,
      })),
      ...appRows.map(a => ({
        type: 'admission' as const,
        id: a.id,
        label: a.fullName,
        sub: `Application · ${a.program}`,
        status: a.status,
        tab: 'admissions' as const,
      })),
      ...courseRows.map(c => ({
        type: 'course' as const,
        id: c.id,
        label: `${c.code} — ${c.name}`,
        sub: c.department.name,
        status: c.status,
        tab: 'catalog' as const,
      })),
      ...offeringRows.map(o => ({
        type: 'offering' as const,
        id: o.id,
        label: `${o.course.code} — ${o.course.name} (${o.section})`,
        sub: o.semester.name,
        status: o.status,
        tab: 'offerings' as const,
      })),
    ];

    ok(res, { query: term, results });
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS — Profile, Password, Sessions, Registration Engine
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/registrar/settings/profile
router.get('/settings/profile', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, fullName: true, email: true, phone: true, role: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    ok(res, user);
  } catch (e) { fail(res, e); }
});

// PATCH /api/registrar/settings/profile
router.patch('/settings/profile', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(2).max(100).optional(),
      email:    z.string().email().optional(),
      phone:    z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }

    const { fullName, email, phone } = parsed.data;
    if (email) {
      const conflict = await prisma.user.findFirst({ where: { email, id: { not: req.user!.userId } } });
      if (conflict) { res.status(409).json({ error: 'Email already in use by another account' }); return; }
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(fullName && { fullName }),
        ...(email    && { email: email.toLowerCase() }),
        ...(phone    && { phone }),
      },
      select: { id: true, fullName: true, email: true, phone: true, role: true },
    });

    await prisma.registrarAuditLog.create({
      data: { userId: req.user!.userId, action: 'STUDENT_UPDATED', entityType: 'User', entityId: req.user!.userId, description: 'Registrar profile updated' },
    });

    ok(res, updated);
  } catch (e) { fail(res, e, 400); }
});

// POST /api/registrar/settings/password
router.post('/settings/password', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be at most 128 characters long')
        .regex(/^[A-Za-z0-9]+$/, 'Password must contain only letters and numbers')
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      confirmPassword: z.string(),
    }).refine(d => d.newPassword === d.confirmPassword, {
      message: 'Passwords do not match', path: ['confirmPassword'],
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }); return; }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { passwordHash: true } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (!user.passwordHash) { res.status(400).json({ error: 'No password set on this account (OAuth-only account).' }); return; }

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) { res.status(400).json({ error: 'Current password is incorrect' }); return; }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id: req.user!.userId }, data: { passwordHash: newHash } });

    // Revoke all other sessions for security
    const currentSessionId = req.user!.sessionId;
    await prisma.session.updateMany({
      where: { userId: req.user!.userId, id: { not: currentSessionId } },
      data: { isRevoked: true },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'PASSWORD_CHANGED', ipAddress: (req.ip ?? '').slice(0, 45) || null, userAgent: (req.headers['user-agent'] ?? '').slice(0, 255) || null },
    });

    ok(res, { success: true, message: 'Password updated. Other sessions have been revoked.' });
  } catch (e) { fail(res, e, 400); }
});

// GET /api/registrar/settings/sessions
router.get('/settings/sessions', async (req: AuthRequest, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.userId, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, deviceInfo: true, ipAddress: true, lastUsedAt: true, createdAt: true, expiresAt: true },
    });
    const currentSessionId = req.user!.sessionId;
    ok(res, sessions.map(s => ({ ...s, isCurrent: s.id === currentSessionId })));
  } catch (e) { fail(res, e); }
});

// DELETE /api/registrar/settings/sessions/:sessionId
router.delete('/settings/sessions/:sessionId', async (req: AuthRequest, res) => {
  try {
    const sessionId = pid(req, 'sessionId');
    if (sessionId === req.user!.sessionId) { res.status(400).json({ error: 'Cannot revoke your current session. Use logout instead.' }); return; }

    const session = await prisma.session.findFirst({ where: { id: sessionId, userId: req.user!.userId } });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    await prisma.session.update({ where: { id: sessionId }, data: { isRevoked: true } });

    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'SESSION_REVOKED', metadata: { revokedSessionId: sessionId } },
    });

    ok(res, { success: true });
  } catch (e) { fail(res, e, 400); }
});

// DELETE /api/registrar/settings/sessions — revoke ALL other sessions
router.delete('/settings/sessions', async (req: AuthRequest, res) => {
  try {
    const { count } = await prisma.session.updateMany({
      where: { userId: req.user!.userId, id: { not: req.user!.sessionId }, isRevoked: false },
      data: { isRevoked: true },
    });
    ok(res, { success: true, revokedCount: count });
  } catch (e) { fail(res, e); }
});

// GET /api/registrar/settings/registration
router.get('/settings/registration', async (req: AuthRequest, res) => {
  try {
    // Derive from current/active semester
    const semester = await prisma.semester.findFirst({
      where: { isCurrent: true },
      include: { academicYear: { select: { name: true } } },
    });
    ok(res, {
      semesterId:       semester?.id ?? null,
      semesterName:     semester ? `${semester.name} — ${semester.academicYear.name}` : null,
      registrationOpen: semester ? new Date() >= semester.registrationStart && new Date() <= semester.registrationEnd : false,
      registrationStart: semester?.registrationStart ?? null,
      registrationEnd:   semester?.registrationEnd ?? null,
      addDropDeadline:   semester?.addDropDeadline ?? null,
      isCurrent:         semester?.isCurrent ?? false,
    });
  } catch (e) { fail(res, e); }
});

// PATCH /api/registrar/settings/registration — update current semester dates
router.patch('/settings/registration', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      semesterId:        z.string().uuid().optional(),
      registrationStart: z.string().datetime().optional(),
      registrationEnd:   z.string().datetime().optional(),
      addDropDeadline:   z.string().datetime().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }

    const { semesterId, ...dates } = parsed.data;
    const target = semesterId ?? (await prisma.semester.findFirst({ where: { isCurrent: true } }))?.id;
    if (!target) { res.status(404).json({ error: 'No current semester found' }); return; }

    const updated = await prisma.semester.update({
      where: { id: target },
      data: {
        ...(dates.registrationStart && { registrationStart: new Date(dates.registrationStart) }),
        ...(dates.registrationEnd   && { registrationEnd:   new Date(dates.registrationEnd) }),
        ...(dates.addDropDeadline   && { addDropDeadline:   new Date(dates.addDropDeadline) }),
      },
    });

    await prisma.registrarAuditLog.create({
      data: { userId: req.user!.userId, action: 'CALENDAR_EVENT_UPDATED', entityType: 'Semester', entityId: target, description: 'Registration dates updated' },
    });

    ok(res, updated);
  } catch (e) { fail(res, e, 400); }
});
// ══════════════════════════════════════════════════════════════════════════════
router.get('/reports/enrollments', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await reports.getEnrollmentReport({
      academicYearId: qp.academicYearId, semesterId: qp.semesterId,
      departmentId: qp.departmentId, programId: qp.programId,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/reports/admissions', async (_req, res) => {
  try { ok(res, await reports.getAdmissionsReport()); } catch (e) { fail(res, e); }
});

router.get('/reports/graduation', async (_req, res) => {
  try { ok(res, await reports.getGraduationReport()); } catch (e) { fail(res, e); }
});

router.get('/reports/course-utilization', async (req: AuthRequest, res) => {
  try { ok(res, await reports.getCourseUtilizationReport(q(req).semesterId)); } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// TIMETABLE (dedicated endpoints)
// ══════════════════════════════════════════════════════════════════════════════

/** GET /timetable — list slots, filtered by semester / room / instructor / status */
router.get('/timetable', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    const where: any = { status: { in: ['PUBLISHED', 'DRAFT'] } };
    if (qp.semesterId)   where.courseOffering = { semesterId: qp.semesterId };
    if (qp.roomId)       where.roomId = qp.roomId;
    if (qp.instructorId) where.instructorId = qp.instructorId;
    if (qp.status)       where.status = qp.status;  // allow explicit override

    const slots = await prisma.timetableSlot.findMany({
      where,
      include: {
        courseOffering: {
          include: {
            course: { select: { code: true, name: true } },
            semester: { include: { academicYear: { select: { name: true } } } },
            instructor: { include: { user: { select: { fullName: true } } } },
          },
        },
        room: { select: { building: true, name: true, capacity: true, roomType: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    ok(res, slots);
  } catch (e) { fail(res, e); }
});

/** GET /timetable/conflicts — detect room and time-overlap conflicts in a semester */
router.get('/timetable/conflicts', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    const semesterId = qp.semesterId;

    // Use the service overlap-aware logic rather than the old raw SQL exact-match query
    const slots = await prisma.timetableSlot.findMany({
      where: {
        status: { in: ['PUBLISHED', 'DRAFT'] },
        ...(semesterId ? { courseOffering: { semesterId } } : {}),
      },
      include: {
        courseOffering: {
          include: { course: { select: { code: true } } },
        },
        room: { select: { building: true, name: true } },
      },
    });

    const conflicts: {
      type: 'ROOM' | 'INSTRUCTOR';
      dayOfWeek: number;
      slotA: { id: string; courseCode: string; startTime: string; endTime: string };
      slotB: { id: string; courseCode: string; startTime: string; endTime: string };
      resource: string;
    }[] = [];

    function toMin(t: string) {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    }
    function overlaps(a: typeof slots[0], b: typeof slots[0]) {
      return (
        a.dayOfWeek === b.dayOfWeek &&
        toMin(a.startTime) < toMin(b.endTime) &&
        toMin(a.endTime) > toMin(b.startTime)
      );
    }

    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i], b = slots[j];
        if (!overlaps(a, b)) continue;
        if (a.roomId && b.roomId && a.roomId === b.roomId) {
          conflicts.push({
            type: 'ROOM',
            dayOfWeek: a.dayOfWeek,
            slotA: { id: a.id, courseCode: a.courseOffering.course.code, startTime: a.startTime, endTime: a.endTime },
            slotB: { id: b.id, courseCode: b.courseOffering.course.code, startTime: b.startTime, endTime: b.endTime },
            resource: `${a.room?.building ?? ''} ${a.room?.name ?? ''}`.trim(),
          });
        }
        if (a.instructorId && b.instructorId && a.instructorId === b.instructorId) {
          conflicts.push({
            type: 'INSTRUCTOR',
            dayOfWeek: a.dayOfWeek,
            slotA: { id: a.id, courseCode: a.courseOffering.course.code, startTime: a.startTime, endTime: a.endTime },
            slotB: { id: b.id, courseCode: b.courseOffering.course.code, startTime: b.startTime, endTime: b.endTime },
            resource: a.instructorId,
          });
        }
      }
    }

    ok(res, conflicts);
  } catch (e) { fail(res, e); }
});

/** POST /timetable/check-conflicts — frontend pre-flight conflict check without saving */
router.post('/timetable/check-conflicts', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      semesterId:        z.string().uuid(),
      roomId:            z.string().uuid().nullable().optional(),
      instructorId:      z.string().uuid().nullable().optional(),
      excludeOfferingId: z.string().uuid().optional(),
      timetables: z.array(z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime:   z.string().regex(/^\d{2}:\d{2}$/),
      })).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const conflicts = await offerings.checkConflicts(parsed.data);
    ok(res, { conflicts, hasConflicts: conflicts.length > 0 });
  } catch (e) { fail(res, e, 400); }
});

/** POST /timetable — create a single timetable slot with full overlap conflict detection */
router.post('/timetable', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      courseOfferingId: z.string().uuid(),
      dayOfWeek:  z.number().int().min(0).max(6),
      startTime:  z.string().regex(/^\d{2}:\d{2}$/),
      endTime:    z.string().regex(/^\d{2}:\d{2}$/),
      roomId:     z.string().uuid().optional(),
      instructorId: z.string().uuid().optional(),
      status:     z.enum(['DRAFT', 'PUBLISHED']).optional().default('PUBLISHED'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { courseOfferingId, dayOfWeek, startTime, endTime, roomId, instructorId, status } = parsed.data;
    const offering = await prisma.courseOffering.findUnique({ where: { id: courseOfferingId } });
    if (!offering) { res.status(404).json({ error: 'Course offering not found' }); return; }

    // Full overlap-aware conflict check
    const conflicts = await offerings.checkConflicts({
      semesterId:   offering.semesterId,
      roomId:       roomId ?? null,
      instructorId: instructorId ?? null,
      excludeOfferingId: courseOfferingId,
      timetables:   [{ dayOfWeek, startTime, endTime }],
    });
    if (conflicts.length) {
      // Broadcast conflict notification to timetable room so other registrar tabs see it
      broadcastTimetableConflict({
        semesterId: offering.semesterId,
        conflicts,
        context: { dayOfWeek, startTime, endTime, roomId, instructorId },
      });
      res.status(409).json({ error: 'Schedule conflict detected', conflicts });
      return;
    }

    const slot = await prisma.timetableSlot.create({
      data: { courseOfferingId, dayOfWeek, startTime, endTime, roomId, instructorId, status },
    });
    await prisma.registrarAuditLog.create({
      data: {
        userId: req.user!.userId, action: 'TIMETABLE_CREATED',
        entityType: 'TimetableSlot', entityId: slot.id,
        description: `Timetable slot created for offering ${courseOfferingId}`,
      },
    });

    // Broadcast to all clients watching this semester
    broadcastTimetableCreated({
      semesterId: offering.semesterId,
      slot: {
        id: slot.id, courseOfferingId, dayOfWeek,
        startTime, endTime,
        roomId: slot.roomId, instructorId: slot.instructorId,
        status: slot.status,
      },
    });

    ok(res, slot, 201);
  } catch (e) { fail(res, e, 400); }
});

/** PATCH /timetable/:id — update a slot (reschedule, change room/instructor, change status) */
router.patch('/timetable/:id', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      dayOfWeek:    z.number().int().min(0).max(6).optional(),
      startTime:    z.string().regex(/^\d{2}:\d{2}$/).optional(),
      endTime:      z.string().regex(/^\d{2}:\d{2}$/).optional(),
      roomId:       z.string().uuid().nullable().optional(),
      instructorId: z.string().uuid().nullable().optional(),
      status:       z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const existing = await prisma.timetableSlot.findUnique({
      where: { id: pid(req) },
      include: { courseOffering: { select: { semesterId: true } } },
    });
    if (!existing) { res.status(404).json({ error: 'Timetable slot not found' }); return; }

    // If rescheduling (day or time changed) re-run conflict detection
    const newDay   = parsed.data.dayOfWeek   ?? existing.dayOfWeek;
    const newStart = parsed.data.startTime   ?? existing.startTime;
    const newEnd   = parsed.data.endTime     ?? existing.endTime;
    const newRoom  = parsed.data.roomId      !== undefined ? parsed.data.roomId  : existing.roomId;
    const newInstr = parsed.data.instructorId !== undefined ? parsed.data.instructorId : existing.instructorId;
    const isRescheduling =
      newDay !== existing.dayOfWeek || newStart !== existing.startTime || newEnd !== existing.endTime;

    if (isRescheduling) {
      const conflicts = await offerings.checkConflicts({
        semesterId:        existing.courseOffering.semesterId,
        roomId:            newRoom,
        instructorId:      newInstr,
        excludeOfferingId: existing.courseOfferingId,
        timetables:        [{ dayOfWeek: newDay, startTime: newStart, endTime: newEnd }],
      });
      if (conflicts.length) {
        broadcastTimetableConflict({
          semesterId: existing.courseOffering.semesterId,
          conflicts,
          context: { dayOfWeek: newDay, startTime: newStart, endTime: newEnd, roomId: newRoom, instructorId: newInstr },
        });
        res.status(409).json({ error: 'Schedule conflict detected', conflicts });
        return;
      }
    }

    const updated = await prisma.timetableSlot.update({
      where: { id: pid(req) },
      data: {
        ...(parsed.data.dayOfWeek    !== undefined && { dayOfWeek:    parsed.data.dayOfWeek }),
        ...(parsed.data.startTime    !== undefined && { startTime:    parsed.data.startTime }),
        ...(parsed.data.endTime      !== undefined && { endTime:      parsed.data.endTime }),
        ...(parsed.data.roomId       !== undefined && { roomId:       parsed.data.roomId }),
        ...(parsed.data.instructorId !== undefined && { instructorId: parsed.data.instructorId }),
        ...(parsed.data.status       !== undefined && { status:       parsed.data.status }),
      },
    });

    await prisma.registrarAuditLog.create({
      data: {
        userId: req.user!.userId, action: 'TIMETABLE_UPDATED',
        entityType: 'TimetableSlot', entityId: pid(req),
        description: `Timetable slot ${pid(req)} updated`,
      },
    });

    broadcastTimetableUpdated({
      semesterId: existing.courseOffering.semesterId,
      slot: {
        id: updated.id, courseOfferingId: updated.courseOfferingId,
        dayOfWeek: updated.dayOfWeek, startTime: updated.startTime, endTime: updated.endTime,
        roomId: updated.roomId, instructorId: updated.instructorId,
        status: updated.status,
      },
    });

    ok(res, updated);
  } catch (e) { fail(res, e, 400); }
});

/** DELETE /timetable/:id — soft-cancel (status → CANCELLED) rather than hard delete */
router.delete('/timetable/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.timetableSlot.findUnique({
      where: { id: pid(req) },
      include: { courseOffering: { select: { semesterId: true } } },
    });
    if (!existing) { res.status(404).json({ error: 'Timetable slot not found' }); return; }

    // Soft-cancel: preserve history for attendance and academic records
    await prisma.timetableSlot.update({
      where: { id: pid(req) },
      data: { status: 'CANCELLED' },
    });
    await prisma.registrarAuditLog.create({
      data: {
        userId: req.user!.userId, action: 'TIMETABLE_DELETED',
        entityType: 'TimetableSlot', entityId: pid(req),
        description: 'Timetable slot cancelled (soft delete)',
      },
    });

    broadcastTimetableDeleted({
      semesterId: existing.courseOffering.semesterId,
      slotId: pid(req),
      courseOfferingId: existing.courseOfferingId,
    });

    ok(res, { success: true });
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// GRADE SCALE — registrar manages letter grades and their point values
// ══════════════════════════════════════════════════════════════════════════════

router.get('/grade-scale', async (_req, res) => {
  try {
    const scales = await prisma.gradeScale.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    ok(res, scales);
  } catch (e) { fail(res, e); }
});

router.post('/grade-scale', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      letterGrade:  z.string().min(1).max(5).toUpperCase(),
      gradePoints:  z.number().min(0).max(5),
      description:  z.string().max(100).optional(),
      isPassing:    z.boolean().optional(),
      displayOrder: z.number().int().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }

    const existing = await prisma.gradeScale.findUnique({ where: { letterGrade: parsed.data.letterGrade } });
    if (existing) { res.status(409).json({ error: `Grade "${parsed.data.letterGrade}" already exists. Use PATCH to update.` }); return; }

    ok(res, await prisma.gradeScale.create({ data: parsed.data }), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/grade-scale/:id', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      gradePoints:  z.number().min(0).max(5).optional(),
      description:  z.string().max(100).optional(),
      isPassing:    z.boolean().optional(),
      isActive:     z.boolean().optional(),
      displayOrder: z.number().int().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }

    const updated = await prisma.gradeScale.update({
      where: { id: pid(req) },
      data: parsed.data,
    });
    ok(res, updated);
  } catch (e) { fail(res, e, 400); }
});

router.delete('/grade-scale/:id', async (req: AuthRequest, res) => {
  try {
    // Soft-delete via isActive rather than hard delete to preserve historical data integrity
    const updated = await prisma.gradeScale.update({
      where: { id: pid(req) },
      data: { isActive: false },
    });
    ok(res, updated);
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ONBOARDINGS — view-only list of all student onboarding registrations
// ══════════════════════════════════════════════════════════════════════════════

router.get('/onboardings', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    const { page, limit } = pageParams(qp);
    const skip = (page - 1) * limit;

    // Query ALL students (role=STUDENT), including those with no StudentProfile yet.
    // StudentProfile is a left join — null means the student hasn't started onboarding.
    const searchFilter: any = qp.search ? {
      OR: [
        { fullName: { contains: qp.search, mode: 'insensitive' } },
        { email:    { contains: qp.search, mode: 'insensitive' } },
        { phone:    { contains: qp.search, mode: 'insensitive' } },
      ],
    } : {};

    const where: any = { role: 'STUDENT', ...searchFilter };

    // Optional filter by payment/dept status (filter via profile)
    if (qp.feePaid !== undefined) {
      const paid = qp.feePaid === 'true';
      where.studentProfile = paid
        ? { registrationFeePaid: true }
        : { OR: [{ registrationFeePaid: false }, { is: null }] };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id:        true,
          fullName:  true,
          email:     true,
          phone:     true,
          createdAt: true,
          studentProfile: {
            select: {
              registrationFeePaid:      true,
              registrationFeePaidAt:    true,
              departmentSelected:       true,
              paymentVerifiedByFinance:  true,
              paymentVerifiedAt:        true,
              selectedDepartmentId:     true,
              createdAt:                true,
              selectedDepartment: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
    ]);

    // Normalise shape: always return the same fields whether profile exists or not
    const onboardings = users.map(u => ({
      userId:                   u.id,
      registrationFeePaid:      u.studentProfile?.registrationFeePaid      ?? false,
      registrationFeePaidAt:    u.studentProfile?.registrationFeePaidAt    ?? null,
      departmentSelected:       u.studentProfile?.departmentSelected        ?? false,
      paymentVerifiedByFinance:  u.studentProfile?.paymentVerifiedByFinance ?? false,
      paymentVerifiedAt:        u.studentProfile?.paymentVerifiedAt         ?? null,
      selectedDepartmentId:     u.studentProfile?.selectedDepartmentId      ?? null,
      createdAt:                u.studentProfile?.createdAt ?? u.createdAt,
      user:  { id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, createdAt: u.createdAt },
      selectedDepartment: u.studentProfile?.selectedDepartment ?? null,
    }));

    ok(res, { total, page, limit, totalPages: Math.ceil(total / limit), onboardings });
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMISSIONS-READY — students whose payment was verified by Finance Officer
// ══════════════════════════════════════════════════════════════════════════════

router.get('/admissions-ready', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    const { page, limit } = pageParams(qp);
    const skip = (page - 1) * limit;

    const where: any = { paymentVerifiedByFinance: true };
    if (qp.search) {
      where.user = {
        OR: [
          { fullName: { contains: qp.search, mode: 'insensitive' } },
          { email:    { contains: qp.search, mode: 'insensitive' } },
          { phone:    { contains: qp.search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, profiles] = await Promise.all([
      prisma.studentProfile.count({ where }),
      prisma.studentProfile.findMany({
        where, skip, take: limit,
        orderBy: { paymentVerifiedAt: 'desc' },
        select: {
          userId:                   true,
          registrationFeePaid:      true,
          registrationFeePaidAt:    true,
          departmentSelected:       true,
          paymentVerifiedByFinance:  true,
          paymentVerifiedAt:        true,
          paymentVerifiedByUserId:  true,
          selectedDepartmentId:     true,
          createdAt:                true,
          user: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } },
          selectedDepartment: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    ok(res, { total, page, limit, totalPages: Math.ceil(total / limit), admissions: profiles });
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC: Certificate verification (no auth required)
// ══════════════════════════════════════════════════════════════════════════════
export { router as registrarRouter };

export default router;


