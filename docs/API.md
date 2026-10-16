# ClassSync API

Base URL: `https://YOUR-API.onrender.com/api` (local: `http://localhost:5000/api`)

Auth: send `Authorization: Bearer <token>` (token from `/auth/login`). Errors always look like `{ "message": "..." }`.
Dates are `YYYY-MM-DD`. Days: 1 = Mon ... 6 = Sat.

Roles: **any** = any logged-in user, **admin** = HOD, **teacher**, **staff** = teacher (own classes) or admin.

## Auth

| Method | Path | Access | Body | Returns |
|---|---|---|---|---|
| POST | `/auth/register` | public | `name, email, password (8+), sectionId` | `201 { token, user }` (student account) |
| POST | `/auth/login` | public | `email, password` | `{ token, user }` |
| GET | `/auth/me` | any | | `{ user }` |
| GET | `/public/sections` | public | | `[{ id, name, semester }]` |

Failed login / register attempts are rate limited (30 per 15 minutes per IP).

## People and master data

| Method | Path | Access | Body |
|---|---|---|---|
| POST | `/teachers` | admin | `name, email, password (8+), department?` → `{ user, teacherId }` |
| GET | `/teachers` | admin | |
| PUT | `/teachers/:id` | admin | `name?, email?, password?, department?` |
| DELETE | `/teachers/:id` | admin | |
| GET / GET `/:id` | `/subjects`, `/rooms`, `/sections` | any | |
| POST / PUT `/:id` / DELETE `/:id` | `/subjects` | admin | `name, code, type (theory\|lab), weeklyCount, semester` |
| POST / PUT / DELETE | `/rooms` | admin | `name, type (classroom\|lab), capacity` |
| POST / PUT / DELETE | `/sections` | admin | `name, semester` |

## Timetable

| Method | Path | Access | Body / Returns |
|---|---|---|---|
| POST | `/assignments` | admin | `teacherId, subjectId, sectionId` (one teacher per subject per section) |
| GET | `/assignments` | admin | list |
| DELETE | `/assignments/:id` | admin | |
| POST | `/teachers/:id/unavailability` | admin | `day, period?` (no period = whole day off) |
| POST | `/timetable/generate` | admin | `sectionIds?, periods? (default 6)` → `201 { sections, slots }`, `422` if no clash-free routine exists |
| GET | `/timetable/section/:id` | any | `{ sectionId, week, changes, subs }` |
| GET | `/timetable/teacher/me` | teacher | `{ week, changes, subs, teacherId }` |

`week` is `{ "1": [ { id, period, status, subject, room, teacher, type } ], ... }`.
`changes` and `subs` are the date-specific cancellations / shifts / substitutes from 7 days ago onwards.

## Cancel, shift, undo

| Method | Path | Access | Body |
|---|---|---|---|
| POST | `/slots/:id/cancel` | staff | `date, reason?` (a lab cancels both periods) |
| POST | `/slots/:id/reschedule` | staff | `date, toDate, toPeriod, reason?` (theory only; checks teacher, section, room, off-days) |
| DELETE | `/changes/:id` | staff | undo a cancel / shift |

Common errors: `400` wrong date or weekday, `403` not your class, `409` clash or a change already exists.

## Substitutes

| Method | Path | Access | Body / Returns |
|---|---|---|---|
| GET | `/slots/:id/free-teachers?date=` | staff | `[{ id, name }]` teachers free for every period of that class |
| POST | `/slots/:id/substitute` | staff | `date, toTeacherId, reason?`. Teacher: creates a `pending` request. Admin: assigns directly |
| GET | `/substitutes/mine` | teacher | incoming and outgoing requests from today onwards |
| POST | `/substitutes/:groupId/respond` | teacher | `accept: true\|false` (re-checks availability on accept) |
| DELETE | `/substitutes/:groupId` | staff | withdraw a request or undo an accepted substitute |

## HOD

| Method | Path | Returns |
|---|---|---|
| GET | `/analytics` | `{ totals, last30, rooms, teachers, heat }` |
| GET | `/audit?limit=30&before=<id>` | `[{ id, action, details, at, user, role }]` newest first |
| GET | `/health` | `{ status: "ok" }` (public, used for uptime checks) |

## Live events (Socket.io)

Connect to the API origin with `io(url, { auth: { token } })`.

| Event | Who receives it | Payload |
|---|---|---|
| `class:update` | the section's students, the teacher(s) involved, admins | `kind: cancel\|reschedule\|substitute\|restored, subject, section, date, period, reason, ...` |
| `sub:request` | the teacher who was asked | `groupId, subject, date, period, fromTeacher, reason` |
| `sub:response` | the teacher who asked | `kind: accepted\|declined\|cancelled, subject, date, toTeacher` |
