# Harmony College — Frontend

Next.js 15 app (React 19, Tailwind CSS 4, TypeScript).

## Prerequisites

- Node.js 18+
- The backend server running on port 4000 (see `../backend`)

## Setup

```bash
cp .env.example .env
# Edit .env — set NEXT_PUBLIC_BACKEND_URL, JWT_SECRET
npm install
npm run dev        # http://localhost:3000
```

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Express backend URL (default `http://localhost:4000`) |
| `JWT_SECRET` | Must match `JWT_SECRET` in `backend/.env` |
| `NEXT_PUBLIC_APP_URL` | Public URL of this frontend |

## How the API proxy works

`next.config.ts` rewrites all `/api/*` and `/uploads/*` requests to the backend.
Frontend code calls `/api/auth/signin` etc. with no special config — Next.js forwards them.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
