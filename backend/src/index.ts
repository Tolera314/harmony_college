import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRouter from './routes/auth';
import uploadRouter from './routes/upload';
import advisorRouter from './routes/advisor';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true, // allow cookies to be sent cross-origin
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files so the frontend can display them via /uploads/<filename>
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/advisor', advisorRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Harmony College API running on http://localhost:${PORT}`);
  console.log(`    CORS allowed origin: ${FRONTEND_URL}`);
  console.log(`    Uploads directory:   ${UPLOAD_DIR}`);
});

export default app;
