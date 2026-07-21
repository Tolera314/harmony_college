import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

// Resolve upload directory (relative to backend root, or from env)
const UPLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR ?? 'uploads'
);

// Ensure the directory exists at startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
    }
  },
});

// ── POST /api/upload ──────────────────────────────────────────────────────────
router.post('/', upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided.' });
    return;
  }

  // Return a URL path the frontend can use
  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, fileUrl });
});

// Multer error handler (oversized file, wrong type, etc.)
router.use((err: Error, _req: Request, res: Response, _next: Function): void => {
  if (err.message.startsWith('Invalid file type')) {
    res.status(400).json({ error: err.message });
  } else if (err.message.includes('File too large')) {
    res.status(400).json({ error: 'File is too large. Maximum size is 10 MB.' });
  } else {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during file upload.' });
  }
});

export default router;
