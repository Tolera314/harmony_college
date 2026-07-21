# Harmony College — Backend

Express.js REST API with Prisma ORM, PostgreSQL (Neon), bcrypt, JWT, Zod, Multer.

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon or local)

## Setup

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, FRONTEND_URL
npm install
npm run db:generate   # generate Prisma client
npm run db:migrate    # run migrations against the database
npm run dev           # http://localhost:4000
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing/verifying JWTs (must match frontend) |
| `PORT` | Port to listen on (default `4000`) |
| `FRONTEND_URL` | Allowed CORS origin (default `http://localhost:3000`) |
| `UPLOAD_DIR` | Directory for uploaded files (default `uploads/`) |
| `NODE_ENV` | `development` or `production` |

## API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register + submit application |
| `POST` | `/api/auth/signin` | Login, sets `session` cookie |
| `POST` | `/api/auth/signout` | Clear session cookie |
| `POST` | `/api/upload` | Upload file (PDF/JPG/PNG, max 10 MB) |
| `GET` | `/api/health` | Health check |

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development server with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled production build |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Prisma Studio UI |
