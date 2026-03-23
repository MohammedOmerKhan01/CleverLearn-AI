# CleverLearn AI — LMS

A production-ready Learning Management System with sequential video learning, JWT auth, and AI-powered lesson assistance.

**Stack:** Next.js 14 · Tailwind CSS · Zustand · Node.js · Express · MySQL

---

## Local Development

### Prerequisites
- Node.js 18+
- MySQL 8.0+

### Backend

```bash
cd backend
cp .env.example .env        # fill in your values
npm install
node src/config/migrate.js  # apply schema migrations
node src/config/seed.js     # seed sample data
npm run dev                 # runs on :4000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                 # runs on :3000
```

### Default credentials (after seed)
| Role    | Email               | Password   |
|---------|---------------------|------------|
| Admin   | admin@lms.dev       | admin123   |
| Student | student@lms.dev     | student123 |

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com), connect this repo
2. Set **Root Directory** to `backend`
3. Add environment variables in the Render dashboard:

| Variable             | Value                          |
|----------------------|--------------------------------|
| `DB_HOST`            | your Aiven/PlanetScale host    |
| `DB_USER`            | db username                    |
| `DB_PASSWORD`        | db password                    |
| `DB_NAME`            | lms_db                         |
| `DB_SSL`             | true                           |
| `HUGGINGFACE_API_KEY`| hf_...                         |
| `FRONTEND_URL`       | https://your-app.vercel.app    |

4. After first deploy, run the seed via Render Shell:
   ```bash
   node src/config/seed.js
   ```

### Frontend → Vercel

1. Import this repo on [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add environment variable:

| Variable              | Value                                  |
|-----------------------|----------------------------------------|
| `NEXT_PUBLIC_API_URL` | https://cleverlearn-backend.onrender.com |

4. Deploy — Vercel auto-builds on every push to `main`

---

## API Overview

| Method | Endpoint                          | Auth | Description              |
|--------|-----------------------------------|------|--------------------------|
| POST   | /api/auth/register                | —    | Register                 |
| POST   | /api/auth/login                   | —    | Login                    |
| POST   | /api/auth/refresh                 | —    | Refresh access token     |
| POST   | /api/auth/logout                  | ✓    | Logout                   |
| GET    | /api/subjects                     | ✓    | List subjects            |
| GET    | /api/subjects/:id/tree            | ✓    | Subject with sections    |
| GET    | /api/videos/:id                   | ✓    | Video + lock status      |
| GET    | /api/progress/videos/:id          | ✓    | Video progress           |
| POST   | /api/progress/videos/:id          | ✓    | Save progress            |
| GET    | /api/progress/subjects/:id        | ✓    | Subject progress         |
| POST   | /api/ai/ask                       | ✓    | AI Q&A                   |
| POST   | /api/ai/summarize                 | ✓    | Summarize lesson         |
| GET    | /api/health                       | —    | Health check             |
