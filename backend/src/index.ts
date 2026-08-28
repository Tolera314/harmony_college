import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';

import authRouter           from './routes/auth';
import uploadRouter         from './routes/upload';
import advisorRouter        from './routes/advisor';
import chatRouter           from './routes/chat';
import studentRouter        from './routes/student';
import registrarRouter      from './routes/registrar';
import studentDashRouter    from './routes/studentDashboard';
import attendanceRouter     from './routes/attendance';
import instructorRouter     from './routes/instructor';
import departmentHeadRouter from './routes/departmentHead';
import hrRouter             from './routes/hr';
import studentOnboarding    from './routes/studentOnboarding';
import financeOfficerRouter from './routes/financeOfficer';
import aiRouter             from './routes/ai';
import adminRouter          from './routes/admin';
import { adminInvitationsRouter } from './routes/adminInvitations';
import { initSocket }       from './lib/socket';
import { startContractExpiryJob } from './services/hr/hrContractExpiryJob';
import {
  loginLimiter, registerLimiter, refreshLimiter,
  verifyLimiter, resendLimiter, verifyStatusLimiter,
  forgotPasswordLimiter, resetPasswordLimiter,
} from './lib/rateLimit';
import { authenticate } from './middleware/auth';

const app          = express();
const PORT         = parseInt(process.env.PORT ?? '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const UPLOAD_DIR   = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy:     false,
    crossOriginEmbedderPolicy: false,
  })
);

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Auth-specific rate limiters ───────────────────────────────────────────────
app.use('/api/auth/login',                    loginLimiter);
app.use('/api/auth/signin',                   loginLimiter);
app.use('/api/auth/register',                 registerLimiter);
app.use('/api/auth/refresh',                  refreshLimiter);
app.use('/api/auth/verify/phone',             verifyLimiter);
app.use('/api/auth/verify/email',             verifyLimiter);
app.use('/api/auth/verify/resend',            resendLimiter);
app.use('/api/auth/verification-status',      verifyStatusLimiter);
app.use('/api/auth/forgot-password',          forgotPasswordLimiter);
app.use('/api/auth/forgot-password/phone-otp', resetPasswordLimiter);
app.use('/api/auth/reset-password',           resetPasswordLimiter);
app.use('/api/auth/reset-password/validate',  verifyStatusLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',               authRouter);
app.use('/api/upload',             authenticate, uploadRouter);
app.use('/api/advisor',            authenticate, advisorRouter);
app.use('/api/chat',               chatRouter);
app.use('/api/student',            studentRouter);
app.use('/api/student/onboarding', studentOnboarding);
app.use('/api/student/dashboard',  studentDashRouter);
app.use('/api/registrar',          registrarRouter);
app.use('/api/instructor',         instructorRouter);
app.use('/api/department-head',   departmentHeadRouter);
app.use('/api/hr',                 hrRouter);
app.use('/api/admin/invitations',  adminInvitationsRouter);
app.use('/api/admin',              adminRouter);
app.use('/api/finance-officer',    financeOfficerRouter);
app.use('/api/attendance',         attendanceRouter);
app.use('/api/ai',                 aiRouter);

// Public certificate verification (no auth)
app.get('/api/verify-certificate/:code', async (req, res) => {
  try {
    const { verifyCertificate } = await import('./services/registrar/certificateService');
    const result = await verifyCertificate(req.params.code);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

// ── HTTP + Socket.io server ───────────────────────────────────────────────────
const httpServer = http.createServer(app);
const io = initSocket(httpServer, FRONTEND_URL);

// ── Restore attendance auto-close timers on restart ───────────────────────────
// Delay 5 s to allow the Neon serverless DB connection pool to warm up first.
setTimeout(() => {
  import('./services/attendance/attendanceService').then(svc => {
    svc.restoreAutoCloseTimers().catch((err: unknown) => {
      console.error('[startup] Failed to restore attendance auto-close timers:', err);
    });
  });
}, 5000);

// ── HR: start daily contract expiry check ─────────────────────────────────────
// Delay 6 s for the same reason — Neon wakes on first query, not on connect.
setTimeout(() => startContractExpiryJob(), 6000);

httpServer.listen(PORT, () => {
  console.log(`🚀  Harmony College API  →  http://localhost:${PORT}`);
  console.log(`🔌  Socket.io ready      →  ws://localhost:${PORT}`);
  console.log(`    CORS origin: ${FRONTEND_URL}`);
});

export { app, io };
