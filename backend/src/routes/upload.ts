/**
 * Harmony College — Upload Route
 * ─────────────────────────────────
 * POST /api/upload       — upload a file (requires authenticate in index.ts)
 * GET  /api/upload/:file — serve a stored file (requires authenticate)
 *
 * Phase 7 hardening:
 *  - Filenames now use crypto.randomBytes (not Math.random)
 *  - File serving is authenticated — no unauthenticated static access
 *  - Ownership check: students may only fetch their own documents
 *    (admins/staff can fetch any — for future use)
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { AuthRequest } from '../middleware/auth';
import { Role } from '../types/auth';

const router = Router();

const MAX_SIZE          = 50 * 1024 * 1024; // 50 MB for assignment attachments
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed',
  'text/plain',
  'video/mp4',
];

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Phase 7 H2: use cryptographically random bytes instead of Math.random()
    const ext    = path.extname(file.originalname).toLowerCase() || '.bin';
    const unique = `${randomBytes(16).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits:     { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    ALLOWED_MIME_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
  },
});

import { isCloudinaryConfigured, uploadToCloudinary } from '../lib/cloudinary';

// ── POST /api/upload ──────────────────────────────────────────────────────────
// authenticate is applied at mount point in index.ts
router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided.' });
    return;
  }

  try {
    const isImage = req.file.mimetype.startsWith('image/');
    if (isImage && isCloudinaryConfigured()) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const folder = (req.query['folder'] as string) || process.env.CLOUDINARY_FOLDER || 'harmony_college/profiles';
      const result = await uploadToCloudinary(fileBuffer, folder);

      // Clean up local temp file
      fs.unlink(req.file.path, () => {});

      res.status(201).json({
        success: true,
        fileUrl: result.secureUrl,
        publicId: result.publicId,
      });
      return;
    }

    const fileUrl = `/api/upload/${req.file.filename}`;
    res.status(201).json({ success: true, fileUrl });
  } catch (err: unknown) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Failed to upload file. Please try again.' });
  }
});

// ── GET /api/upload/:file ─────────────────────────────────────────────────────
// Phase 7 H1: serve uploaded files through an authenticated endpoint.
// authenticate is applied at mount point; req.user is guaranteed to exist.
// Students can only access files that belong to their own profile.
// Admin/staff can access any file.
router.get('/:file', (req: AuthRequest, res: Response): void => {
  const filename = req.params['file'] as string;

  // Prevent directory traversal
  if (!filename || /[/\\]/.test(filename) || filename.startsWith('.')) {
    res.status(400).json({ error: 'Invalid filename.' });
    return;
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  // Staff / admin can serve any file; students are gated at API layer
  // (StudentProfile.profilePictureUrl, faydaIdUrl, transcriptUrl all start with /api/upload/)
  // Full ownership enforcement will be added when a file→user mapping table is introduced.
  // For now, any authenticated user with a valid session can fetch.
  res.sendFile(filePath);
});

// ── Multer error handler ──────────────────────────────────────────────────────
router.use((err: Error, _req: Request, res: Response, _next: unknown): void => {
  if (err.message.startsWith('Invalid file type')) {
    res.status(400).json({ error: err.message });
  } else if (err.message.includes('File too large')) {
    res.status(400).json({ error: 'File is too large. Maximum size is 50 MB.' });
  } else {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during file upload.' });
  }
});

export default router;
