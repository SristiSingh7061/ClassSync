// Run: node src/test-generator.js
const { generate } = require('./services/generator');
const assert = require('assert');
const rooms = [{ id: 1, type: 'classroom' }, { id: 2, type: 'classroom' }, { id: 3, type: 'lab' }];
const classes = [
  { sectionId: 1, subjectId: 1, teacherId: 1, type: 'theory', periodsPerWeek: 4 },
  { sectionId: 1, subjectId: 2, teacherId: 2, type: 'theory', periodsPerWeek: 4 },
  { sectionId: 1, subjectId: 3, teacherId: 1, type: 'lab', periodsPerWeek: 2 },
  { sectionId: 2, subjectId: 1, teacherId: 1, type: 'theory', periodsPerWeek: 4 },
  { sectionId: 2, subjectId: 2, teacherId: 3, type: 'theory', periodsPerWeek: 4 },
  { sectionId: 2, subjectId: 3, teacherId: 3, type: 'lab', periodsPerWeek: 2 },
];
const r = generate({ classes, rooms, unavailable: [{ teacherId: 1, day: 1, period: null }] });
assert(r.ok, 'should generate');
// Test 1: no double booking of teacher / room / section
const seen = { t: new Set(), r: new Set(), s: new Set() };
for (const s of r.slots) {
  for (const [set, id] of [[seen.t, s.TeacherId], [seen.r, s.RoomId], [seen.s, s.SectionId]]) {
    const key = `${id}|${s.day}|${s.period}`; assert(!set.has(key), 'conflict ' + key); set.add(key);
  }
}
// Test 2: teacher unavailability respected
assert(!r.slots.some((s) => s.TeacherId === 1 && s.day === 1), 'teacher 1 is off on Monday');
// Test 3: labs only in lab room
assert(r.slots.filter((s) => s.SubjectId === 3).every((s) => s.RoomId === 3), 'lab in lab room');
// Test 4: counts
assert.strictEqual(r.slots.length, 20);
assert.strictEqual(r.slots.filter((s) => s.SectionId === 1 && s.SubjectId === 1).length, 4);
// Test 5: impossible case fails cleanly
const bad = generate({ classes: [{ sectionId: 1, subjectId: 1, teacherId: 1, type: 'theory', periodsPerWeek: 40 }], rooms, periods: 6 });
assert(!bad.ok, 'impossible case must fail');
console.log('All generator tests passed. Slots:', r.slots.length, 'nodes:', r.nodes);