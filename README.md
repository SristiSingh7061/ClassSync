# ClassSync: Smart Timetable & Department Hub

A live class routine for a college department. It replaces the routine PDF that gets forwarded on WhatsApp.
The HOD builds a conflict-free timetable in one click; when a teacher cancels, shifts or hands over a class,
students see it **instantly** (live alerts + optional emails).



## Features

| Area | What it does |
|---|---|
| Roles | HOD (admin), Teacher, Student. Every role sees only what it needs (JWT + role checks on the API) |
| Auto timetable | Backtracking solver: no teacher / room / section clashes, labs as 2-period blocks in lab rooms, teacher off-days, even spread across the week |
| Cancel / Shift | Per-date changes on top of the weekly routine (the routine itself is never edited). Shift checks teacher, section and room availability |
| Substitute flow | Teacher picks from teachers who are actually free, the other teacher accepts or declines, students see "X instead of Y" |
| Live alerts | Socket.io rooms per section; reconnect refreshes missed changes; email to the section (optional, SMTP) |
| HOD analytics | Room use, teacher load, 30-day cancel / shift / substitute counts, busiest periods heatmap |
| Audit log | Every important action is recorded (who, what, when) |

## Tech stack

React 18 + Vite + Tailwind CSS · Node.js + Express · PostgreSQL + Sequelize · Socket.io · JWT + bcrypt · Nodemailer

```mermaid
flowchart LR
  S[Student / Teacher / HOD<br/>React app on Vercel] -- REST + JWT --> A[Express API on Render]
  S -- Socket.io --> A
  A --> D[(PostgreSQL on Neon)]
  A -. optional .-> M[SMTP email]
```

## How the timetable generator works

1. Every (teacher, subject, section) assignment becomes *units*: 1 period for theory, a 2-period block for a lab.
2. Units are sorted hardest-first (labs, then subjects with more periods per week).
3. Depth-first search places each unit on a (day, period, room) that is free for the teacher, the section and the room, and respects teacher off-days.
4. If a branch dead-ends it **backtracks**. A node limit stops impossible inputs, and the API answers `422` with a clear message.
5. Same subject at most twice a day (labs once) so the week stays balanced.

Cancel / shift / substitute are stored in separate tables (`SlotChanges`, `SubstituteRequests`) keyed by date, so the weekly routine stays clean and every change can be undone.

## Run locally

```bash
# 1) database: create an empty PostgreSQL database called classsync
# 2) server
cd server
cp .env.example .env        # fill DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run seed                # tables + HOD account + demo section, rooms, subject
npm run dev                 # http://localhost:5000/api/health

# 3) client (new terminal)
cd client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Tests: `cd server && npm test` (generator, reschedule conflicts, lab blocks, substitutes, analytics, production guards).

## Environment variables (server)

| Name | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Neon / Supabase / local |
| `DB_SSL` | `true` | `true` for hosted databases, `false` locally |
| `JWT_SECRET` | 48+ random characters | Server refuses to start in production with a weak one |
| `JWT_EXPIRES_IN` | `7d` | |
| `CLIENT_URL` | `https://classsync.vercel.app` | Allowed origin(s) for CORS and Socket.io, comma separated |
| `NODE_ENV` | `production` | Hides internal error details |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | | Used by the seed scripts |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | | Optional. Without them emails are skipped |

Client: `VITE_API_URL=https://YOUR-API.onrender.com/api`

## Deploy (free tier)

| Part | Service | Settings |
|---|---|---|
| Database | Neon | New project, copy the connection string |
| API | Render (Web Service) | Root `server`, build `npm install`, start `npm start`, add the env vars above, health check `/api/health` |
| Client | Vercel | Root `client`, framework Vite, env `VITE_API_URL` |

After the first deploy run the production seed once from your laptop against the Neon database:
`DATABASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node src/seed-prod.js`

Free Render services sleep when idle (first request can take ~30-50 s). A free uptime monitor pinging `/api/health` every 5 minutes keeps it awake.

## Project structure

```
client/src   pages (Login, Register, Student, Teacher, Admin), components, live.jsx (Socket.io), lib.js (week logic)
server/src   routes, controllers, models, services (generator, reschedule, substitute, analytics, realtime, mailer)
server/tests logic tests
docs         API.md, PILOT.md
```

## Known limits

- Labs can be cancelled but not shifted; HOD assigns substitutes through the API only (no button yet).
- Timetable is generated for one fixed bell schedule (6 periods, Mon-Sat), editable in `client/src/config.js`.
- Dates use the server's time zone: set `TZ=Asia/Kolkata` on the host.

API reference: [docs/API.md](docs/API.md) · Pilot plan: [docs/PILOT.md](docs/PILOT.md)
