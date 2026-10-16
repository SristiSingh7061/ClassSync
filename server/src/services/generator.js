// Pure backtracking timetable generator (no DB code, easy to test).
// classes: [{ sectionId, subjectId, teacherId, type:'theory'|'lab', periodsPerWeek }]
// rooms:   [{ id, type:'classroom'|'lab' }]
// unavailable: [{ teacherId, day, period|null }]
function generate({ classes, rooms, unavailable = [], days = [1, 2, 3, 4, 5, 6], periods = 6, labBlock = 2, maxNodes = 200000 }) {
  // 1) Expand into "units": theory = 1 period, lab = block of `labBlock` consecutive periods
  let units = [];
  for (const c of classes) {
    if (c.type === 'lab') {
      const sessions = Math.max(1, Math.ceil(c.periodsPerWeek / labBlock));
      for (let i = 0; i < sessions; i++) units.push({ ...c, len: labBlock });
    } else {
      for (let i = 0; i < c.periodsPerWeek; i++) units.push({ ...c, len: 1 });
    }
  }
  // 2) Hardest first: labs, then subjects with more weekly classes
  units.sort((a, b) => b.len - a.len || b.periodsPerWeek - a.periodsPerWeek);

  const busy = { teacher: new Set(), room: new Set(), section: new Set() };
  const k = (id, d, p) => `${id}|${d}|${p}`;
  const off = new Set(unavailable.map((u) => (u.period == null ? `${u.teacherId}|${u.day}|*` : k(u.teacherId, u.day, u.period))));
  const teacherOff = (t, d, p) => off.has(`${t}|${d}|*`) || off.has(k(t, d, p));
  const perDay = {}; // section|subject|day -> count (spread subjects across days)
  const pdKey = (u, d) => `${u.sectionId}|${u.subjectId}|${d}`;
  const result = [];
  let nodes = 0;

  const roomsFor = (u) => rooms.filter((r) => (u.type === 'lab' ? r.type === 'lab' : r.type === 'classroom'));

  function place(i) {
    if (i === units.length) return true;
    if (++nodes > maxNodes) return false;
    const u = units[i];
    // try days with the fewest classes of this subject first (even spread)
    const order = [...days].sort((a, b) => (perDay[pdKey(u, a)] || 0) - (perDay[pdKey(u, b)] || 0));
    for (const d of order) {
      if (u.len === 1 && (perDay[pdKey(u, d)] || 0) >= 2) continue; // max 2 same theory per day
      if (u.len > 1 && (perDay[pdKey(u, d)] || 0) >= 1) continue;   // one lab session per day
      for (let p = 1; p + u.len - 1 <= periods; p++) {
        const ps = Array.from({ length: u.len }, (_, x) => p + x);
        if (ps.some((q) => busy.section.has(k(u.sectionId, d, q)) || busy.teacher.has(k(u.teacherId, d, q)) || teacherOff(u.teacherId, d, q))) continue;
        for (const r of roomsFor(u)) {
          if (ps.some((q) => busy.room.has(k(r.id, d, q)))) continue;
          ps.forEach((q) => { busy.section.add(k(u.sectionId, d, q)); busy.teacher.add(k(u.teacherId, d, q)); busy.room.add(k(r.id, d, q)); });
          perDay[pdKey(u, d)] = (perDay[pdKey(u, d)] || 0) + 1;
          result.push(...ps.map((q) => ({ SectionId: u.sectionId, SubjectId: u.subjectId, TeacherId: u.teacherId, RoomId: r.id, day: d, period: q })));
          if (place(i + 1)) return true;
          // BACKTRACK
          result.length -= ps.length;
          perDay[pdKey(u, d)]--;
          ps.forEach((q) => { busy.section.delete(k(u.sectionId, d, q)); busy.teacher.delete(k(u.teacherId, d, q)); busy.room.delete(k(r.id, d, q)); });
        }
      }
    }
    return false;
  }

  const ok = place(0);
  return ok ? { ok: true, slots: result, nodes } : { ok: false, message: nodes > maxNodes ? 'Too complex / not enough rooms, teachers or periods' : 'No conflict-free routine possible with this data', nodes };
}
module.exports = { generate };