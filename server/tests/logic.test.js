// Run: npm test   (plain node:assert, no extra packages)
const assert = require('assert');

// ---- reschedule, lab blocks, dates (Week 6) ----
{

const d = require('../src/services/dates');
const { findProblem, contiguousRun } = require('../src/services/reschedule');
// dates
assert(d.isYmd('2026-10-12') && !d.isYmd('2026-02-31') && !d.isYmd('12-10-2026') && !d.isYmd(null));
assert.strictEqual(d.dow('2026-10-12'), 1);   // Monday
assert.strictEqual(d.dow('2026-10-11'), 0);   // Sunday
// conflict check
const slot = { TeacherId: 1, SectionId: 1, RoomId: 1, roomType: 'classroom' };
const rooms = [{ id: 1, type: 'classroom' }, { id: 2, type: 'classroom' }, { id: 3, type: 'lab' }];
const base = { slot, toDay: 3, toPeriod: 2, weekly: [], vacated: new Set(), movedIn: [], unavailable: [], rooms };
let r = findProblem(base); assert(r.ok && r.roomId === 1, 'free target, same room preferred');
r = findProblem({ ...base, weekly: [{ id: 9, TeacherId: 1, SectionId: 5, RoomId: 2 }] }); assert(!r.ok && /Teacher/.test(r.message), 'teacher busy');
r = findProblem({ ...base, weekly: [{ id: 9, TeacherId: 7, SectionId: 1, RoomId: 2 }] }); assert(!r.ok && /section/i.test(r.message), 'section busy');
r = findProblem({ ...base, weekly: [{ id: 9, TeacherId: 1, SectionId: 1, RoomId: 1 }], vacated: new Set([9]) }); assert(r.ok, 'vacated slot is free');
r = findProblem({ ...base, weekly: [{ id: 9, TeacherId: 7, SectionId: 5, RoomId: 1 }] }); assert(r.ok && r.roomId === 2, 'falls to other room');
r = findProblem({ ...base, weekly: [{ id: 9, TeacherId: 7, SectionId: 5, RoomId: 1 }, { id: 8, TeacherId: 8, SectionId: 6, RoomId: 2 }] }); assert(!r.ok && /room/i.test(r.message), 'no room');
r = findProblem({ ...base, movedIn: [{ TeacherId: 1, SectionId: 9, RoomId: 2 }] }); assert(!r.ok, 'moved-in class blocks teacher');
r = findProblem({ ...base, unavailable: [{ day: 3, period: null }] }); assert(!r.ok && /available/.test(r.message), 'teacher off whole day');
r = findProblem({ ...base, unavailable: [{ day: 3, period: 4 }] }); assert(r.ok, 'off other period is fine');
// lab block detection
const rows = [{ id: 1, period: 2 }, { id: 2, period: 3 }, { id: 3, period: 5 }, { id: 4, period: 6 }];
assert.deepStrictEqual(contiguousRun(rows, rows[1]).map((x) => x.id), [1, 2]);
assert.deepStrictEqual(contiguousRun(rows, rows[3]).map((x) => x.id), [3, 4]);
assert.deepStrictEqual(contiguousRun([{ id: 7, period: 1 }], { id: 7, period: 1 }).map((x) => x.id), [7]);


}

// ---- substitutes, analytics (Week 7) ----
{

const { freeTeachers } = require('../src/services/substitute');
const { buildAnalytics } = require('../src/services/analytics');
const T = [{ id: 1, name: 'Ravi' }, { id: 2, name: 'Amit' }, { id: 3, name: 'Neha' }, { id: 4, name: 'Om' }];
const base = { teachers: T, periods: [3], day: 2, weekly: [], vacated: new Set(), movedIn: [], covering: [], unavailable: [], excludeIds: new Set([1]) };
let r = freeTeachers(base); assert.deepStrictEqual(r.map((t) => t.id), [2, 3, 4], 'excludes the original teacher');
r = freeTeachers({ ...base, weekly: [{ id: 9, TeacherId: 2, period: 3 }] }); assert(!r.some((t) => t.id === 2), 'teaching that period');
r = freeTeachers({ ...base, weekly: [{ id: 9, TeacherId: 2, period: 3 }], vacated: new Set([9]) }); assert(r.some((t) => t.id === 2), 'cancelled class frees teacher');
r = freeTeachers({ ...base, movedIn: [{ TeacherId: 3, period: 3 }] }); assert(!r.some((t) => t.id === 3), 'shifted class makes busy');
r = freeTeachers({ ...base, covering: [{ TeacherId: 4, period: 3 }] }); assert(!r.some((t) => t.id === 4), 'already substituting');
r = freeTeachers({ ...base, unavailable: [{ TeacherId: 2, day: 2, period: null }] }); assert(!r.some((t) => t.id === 2), 'off whole day');
r = freeTeachers({ ...base, unavailable: [{ TeacherId: 2, day: 5, period: null }] }); assert(r.some((t) => t.id === 2), 'off other day is fine');
r = freeTeachers({ ...base, periods: [2, 3], weekly: [{ id: 9, TeacherId: 3, period: 2 }] }); assert(!r.some((t) => t.id === 3), 'lab needs both periods free');

const a = buildAnalytics({
  teachers: T.slice(0, 2), rooms: [{ id: 1, name: 'R1', type: 'classroom' }, { id: 2, name: 'Lab', type: 'lab' }],
  slots: [{ day: 1, period: 1, TeacherId: 1, RoomId: 1 }, { day: 1, period: 2, TeacherId: 1, RoomId: 2 }, { day: 1, period: 3, TeacherId: 1, RoomId: 2 }, { day: 2, period: 1, TeacherId: 2, RoomId: 1 }],
  changes: [
    { type: 'cancel', date: '2026-10-12', teacherId: 1, sectionId: 1, subjectId: 5, isLab: true, period: 2 },
    { type: 'cancel', date: '2026-10-12', teacherId: 1, sectionId: 1, subjectId: 5, isLab: true, period: 3 }, // same lab, 2nd period
    { type: 'cancel', date: '2026-10-12', teacherId: 1, sectionId: 1, subjectId: 6, isLab: false, period: 1 },
    { type: 'reschedule', date: '2026-10-13', teacherId: 2, sectionId: 1, subjectId: 6, isLab: false, period: 1 },
  ],
  subs: [{ groupId: 'g1', status: 'accepted', FromTeacherId: 1, ToTeacherId: 2 }, { groupId: 'g1', status: 'accepted', FromTeacherId: 1, ToTeacherId: 2 }, { groupId: 'g2', status: 'pending', FromTeacherId: 1, ToTeacherId: 2 }],
  counts: { teachers: 2, students: 30, sections: 1, subjects: 3 },
});
assert.strictEqual(a.last30.cancelled, 2, 'lab block counted once');
assert.strictEqual(a.last30.rescheduled, 1);
assert.strictEqual(a.last30.substituted, 1, 'lab sub counted once');
assert.strictEqual(a.last30.substitutePending, 1);
assert.strictEqual(a.rooms[0].used, 2); assert.strictEqual(a.rooms[0].percent, Math.round(2 / 36 * 100));
assert.strictEqual(a.teachers[0].name, 'Ravi'); assert.strictEqual(a.teachers[0].weeklyLoad, 3); assert.strictEqual(a.teachers[0].cancels, 2);
assert.strictEqual(a.teachers[1].subsTaken, 1);
assert.strictEqual(a.heat.rows[0][0], 1); assert.strictEqual(a.heat.rows.length, 6); assert.strictEqual(a.totals.weeklyClasses, 4);


}

// ---- deployment guards ----
{
  const { checkEnv } = require('../src/services/env');
  const { parseOrigins, corsOrigin } = require('../src/services/origins');
  const good = { DATABASE_URL: 'postgres://x', JWT_SECRET: 'a'.repeat(48), NODE_ENV: 'production', CLIENT_URL: 'https://classsync.vercel.app', ADMIN_PASSWORD: 'Str0ng!Pass' };
  assert.deepStrictEqual(checkEnv(good), []);
  assert(checkEnv({ ...good, JWT_SECRET: 'classsync_super_secret_key_2026_xyz_but_long_enough_123' }).length, 'known weak secret blocked');
  assert(checkEnv({ ...good, JWT_SECRET: 'short' }).length, 'short secret blocked');
  assert(checkEnv({ ...good, CLIENT_URL: '' }).length, 'CLIENT_URL needed in production');
  assert(checkEnv({ ...good, ADMIN_PASSWORD: 'ChangeMe123' }).length, 'default admin password blocked');
  assert.deepStrictEqual(checkEnv({ DATABASE_URL: 'x', JWT_SECRET: 'dev' }), [], 'local dev is not blocked');
  assert(checkEnv({ NODE_ENV: 'production' }).length >= 2);
  assert.deepStrictEqual(parseOrigins('https://a.vercel.app/, http://localhost:5173 '), ['https://a.vercel.app', 'http://localhost:5173']);
  assert.strictEqual(corsOrigin(''), '*');
}
console.log('All server logic tests passed');
