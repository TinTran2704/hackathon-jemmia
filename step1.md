# Step 1 — Local Storage Foundation

> Goal: create the project skeleton and a file-based storage layer that the
> rest of the app will build on. No AI, no UI logic yet — just a solid,
> testable foundation. Estimated effort: 1–2 hours.

## 1. Outcome

After this step:
- `hirekit/` repo exists with `server/` and `client/` scaffolded and running.
- `server/storage/` directory tree is auto-created on boot.
- A repository layer (`jobsRepo`, `candidatesRepo`) can create/read/list
  entities as JSON files with atomic writes.
- Health endpoint `GET /api/health` returns storage status.

## 2. Tasks (in order)

### 2.1 Scaffold

```bash
mkdir hirekit && cd hirekit
git init

# Server
mkdir -p server/src/{routes,services,repositories,prompts,schemas,lib}
cd server && npm init -y && npm pkg set type=module
npm i express cors dotenv zod nanoid
npm i -D nodemon eslint
cd ..

# Client
npm create vite@latest client -- --template react
cd client && npm i && npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
cd ..
```

Add to root `.gitignore`:

```
node_modules/
.env
server/storage/
dist/
```

Create `server/.env.example` (commit this, not `.env`):

```
PORT=3001
ANTHROPIC_API_KEY=your-key-here
```

### 2.2 Config — `server/src/lib/config.js`

Single place that reads env vars. Throw at boot if a required var is
missing (fail fast).

```js
import 'dotenv/config';

const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
};

export const config = {
  port: Number(process.env.PORT ?? 3001),
  anthropicKey: required('ANTHROPIC_API_KEY'),
  storageRoot: new URL('../../storage/', import.meta.url).pathname,
};
```

### 2.3 Storage bootstrap — `server/src/lib/storage.js`

Creates the directory tree on boot. Idempotent.

```js
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

export const paths = {
  root: config.storageRoot,
  jobs: path.join(config.storageRoot, 'jobs'),
  uploads: path.join(config.storageRoot, 'uploads'),
};

export async function initStorage() {
  await Promise.all(
    Object.values(paths).map((p) => mkdir(p, { recursive: true })),
  );
}
```

### 2.4 Atomic JSON helpers — `server/src/lib/jsonFile.js`

The core primitive every repository uses. Write-to-tmp-then-rename makes
writes atomic — a crash mid-write never corrupts existing data.

```js
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';

export async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await rename(tmp, filePath); // atomic on same filesystem
}
```

### 2.5 Schemas — `server/src/schemas/job.js`

```js
import { z } from 'zod';

export const JobSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),      // the JD text
  createdAt: z.string().datetime(),
  status: z.enum(['open', 'closed']).default('open'),
});
```

(`candidateProfile` schema comes in step 2 — do not design it yet.)

### 2.6 Repository — `server/src/repositories/jobsRepo.js`

All filesystem knowledge stays here. Services never touch `fs`.

```js
import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { nanoid } from 'nanoid';
import { paths } from '../lib/storage.js';
import { readJson, writeJson } from '../lib/jsonFile.js';
import { JobSchema } from '../schemas/job.js';

const jobFile = (id) => path.join(paths.jobs, id, 'job.json');

export const jobsRepo = {
  async create({ title, description }) {
    const job = JobSchema.parse({
      id: nanoid(10),
      title,
      description,
      createdAt: new Date().toISOString(),
      status: 'open',
    });
    await writeJson(jobFile(job.id), job);
    return job;
  },

  async getById(id) {
    return readJson(jobFile(id));
  },

  async list() {
    try {
      const ids = await readdir(paths.jobs);
      const jobs = await Promise.all(ids.map((id) => readJson(jobFile(id))));
      return jobs.filter(Boolean);
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  },
};
```

### 2.7 Server bootstrap — `server/src/index.js`

```js
import express from 'express';
import cors from 'cors';
import { config } from './lib/config.js';
import { initStorage } from './lib/storage.js';
import { jobsRouter } from './routes/jobs.js';

await initStorage();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, storage: 'ready' }),
);
app.use('/api/jobs', jobsRouter);

// single error handler
app.use((err, _req, res, _next) => {
  const status = err.httpStatus ?? 500;
  res.status(status).json({
    error: { code: err.code ?? 'INTERNAL', message: err.message },
  });
});

app.listen(config.port, () =>
  console.log(`HireKit server on :${config.port}`),
);
```

### 2.8 First route — `server/src/routes/jobs.js`

```js
import { Router } from 'express';
import { z } from 'zod';
import { jobsRepo } from '../repositories/jobsRepo.js';

const CreateJobBody = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const jobsRouter = Router();

jobsRouter.post('/', async (req, res, next) => {
  try {
    const body = CreateJobBody.parse(req.body);
    const job = await jobsRepo.create(body);
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

jobsRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await jobsRepo.list());
  } catch (err) {
    next(err);
  }
});
```

### 2.9 npm scripts — `server/package.json`

```json
"scripts": {
  "dev": "nodemon src/index.js",
  "start": "node src/index.js"
}
```

## 3. Verification Checklist (Definition of Done)

Run these and confirm every one passes:

- [ ] `npm run dev` in `server/` boots with no errors and logs the port.
- [ ] `server/storage/jobs/` and `server/storage/uploads/` exist after boot.
- [ ] `curl localhost:3001/api/health` → `{ "ok": true, "storage": "ready" }`
- [ ] `curl -X POST localhost:3001/api/jobs -H 'Content-Type: application/json' -d '{"title":"Backend Dev","description":"Node.js, 2yr exp"}'` → returns job with `id`.
- [ ] The file `server/storage/jobs/<id>/job.json` exists and is valid pretty-printed JSON.
- [ ] `curl localhost:3001/api/jobs` → returns array containing that job.
- [ ] POST with empty title → HTTP 4xx/500 with `{ error: ... }` JSON shape (zod rejects it), server does NOT crash.
- [ ] Kill server mid-run, restart → data still intact, boot still idempotent.
- [ ] `.env` and `server/storage/` are NOT tracked by git (`git status`).
- [ ] Commit: `feat: step1 local storage foundation (repos, atomic json, jobs api)`

## 4. Out of Scope for This Step

- CV upload handling (multer) → step 2
- Any LLM call → step 2+
- React UI beyond the Vite default page → step 4
- Candidate schemas → step 2

Stopping here keeps the foundation reviewable. When all checkboxes pass,
proceed to `step2.md`.
