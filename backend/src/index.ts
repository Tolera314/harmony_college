import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRouter from './routes/auth';
import uploadRouter from './routes/upload';
import advisorRouter from './routes/advisor';
import chatRouter from './routes/chat';
import { initSocket } from './lib/socket';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRouter);
app.use('/api/upload',  uploadRouter);
app.use('/api/advisor', advisorRouter);
app.use('/api/chat',    chatRouter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

// ── HTTP + Socket.io server ───────────────────────────────────────────────────
const httpServer = http.createServer(app);
const io = initSocket(httpServer, FRONTEND_URL);

httpServer.listen(PORT, () => {
  console.log(`🚀  Harmony College API  →  http://localhost:${PORT}`);
  console.log(`🔌  Socket.io ready      →  ws://localhost:${PORT}`);
  console.log(`    CORS origin: ${FRONTEND_URL}`);
});

export { app, io };
