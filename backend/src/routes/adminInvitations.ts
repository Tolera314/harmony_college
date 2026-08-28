import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';
import {
  createStaffInvitation,
  listStaffInvitations,
  resendStaffInvitation,
  revokeStaffInvitation,
  updateStaffInvitation,
} from '../services/invitationService';

export const adminInvitationsRouter = Router();

// Apply auth middleware for all admin invitation management routes
adminInvitationsRouter.use(requireAuth);
adminInvitationsRouter.use(requireRole([Role.ADMIN, Role.SUPER_ADMIN]));

function ip(req: AuthRequest): string | null {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? null;
}

const createInvitationSchema = z.object({
  fullName:       z.string().min(2, 'Full name must be at least 2 characters long').max(100),
  email:          z.string().email('Valid official email address is required'),
  role:           z.nativeEnum(Role),
  departmentId:   z.string().uuid('Valid department ID is required'),
  positionTitle:  z.string().max(100).optional(),
  employeeId:     z.string().max(50).optional(),
  phone:          z.string().max(20).optional(),
  specialization: z.string().max(200).optional(),
});

// POST /api/admin/invitations
adminInvitationsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const parsed = createInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const field = firstIssue?.path?.join('.');
      const msg = firstIssue?.message ?? 'Validation failed';
      const error = field ? `${field}: ${msg}` : msg;
      res.status(400).json({ error, details: parsed.error.flatten() });
      return;
    }

    const result = await createStaffInvitation(
      parsed.data,
      req.user!.userId,
      req.user!.role,
      ip(req)
    );

    const emailWarning = result.emailResult && !result.emailResult.success ? result.emailResult.error : undefined;

    res.status(201).json({
      success: true,
      message: emailWarning
        ? `Invitation created for ${result.invitation.email}. (Email provider note: ${emailWarning})`
        : `Invitation successfully sent to ${result.invitation.email}`,
      invitation: result.invitation,
      emailWarning,
      invitationLink: result.invitationLink,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to send invitation' });
  }
});

// GET /api/admin/invitations
adminInvitationsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const page  = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const search       = req.query.search as string | undefined;
    const role         = req.query.role as Role | undefined;
    const departmentId = req.query.departmentId as string | undefined;
    const status       = req.query.status as 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED' | undefined;

    const result = await listStaffInvitations({
      page,
      limit,
      search,
      role,
      departmentId,
      status,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to retrieve invitations' });
  }
});

// POST /api/admin/invitations/:id/resend
adminInvitationsRouter.post('/:id/resend', async (req: AuthRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await resendStaffInvitation(
      id,
      req.user!.userId,
      req.user!.role,
      ip(req)
    );

    const emailWarning = result.emailResult && !result.emailResult.success ? result.emailResult.error : undefined;

    res.json({
      success: true,
      message: emailWarning
        ? `Invitation resent for ${result.invitation.email}. (Email provider note: ${emailWarning})`
        : `Invitation successfully resent to ${result.invitation.email}`,
      invitation: result.invitation,
      emailWarning,
      invitationLink: result.invitationLink,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to resend invitation' });
  }
});

// PATCH /api/admin/invitations/:id
adminInvitationsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updateSchema = z.object({
      fullName:       z.string().min(2, 'Full name must be at least 2 characters long').max(100).optional(),
      email:          z.string().email('Valid official email address is required').optional(),
      role:           z.nativeEnum(Role).optional(),
      departmentId:   z.string().uuid('Valid department ID is required').optional(),
      positionTitle:  z.string().max(100).optional(),
      employeeId:     z.string().max(50).optional(),
      phone:          z.string().max(20).optional(),
      specialization: z.string().max(200).optional(),
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const msg = firstIssue?.message ?? 'Validation failed';
      res.status(400).json({ error: msg, details: parsed.error.flatten() });
      return;
    }

    const result = await updateStaffInvitation(
      id,
      parsed.data,
      req.user!.userId,
      req.user!.role,
      ip(req)
    );

    const emailWarning = result.emailResult && !result.emailResult.success ? result.emailResult.error : undefined;

    res.json({
      success: true,
      message: emailWarning
        ? `Invitation updated for ${result.invitation.email}. (Email provider note: ${emailWarning})`
        : `Invitation updated and resent to ${result.invitation.email}`,
      invitation: result.invitation,
      emailWarning,
      invitationLink: result.invitationLink,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to update invitation' });
  }
});

// POST /api/admin/invitations/:id/revoke
adminInvitationsRouter.post('/:id/revoke', async (req: AuthRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await revokeStaffInvitation(
      id,
      req.user!.userId,
      req.user!.role,
      ip(req)
    );

    res.json({
      success: true,
      message: `Invitation for ${result.email} has been revoked`,
      invitation: result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to revoke invitation' });
  }
});
