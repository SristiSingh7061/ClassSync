// Pure conflict check for moving ONE theory class to another date + period (easy to unit test).
//  slot      : { TeacherId, SectionId, RoomId, roomType }
//  weekly    : weekly slots already at (toDay, toPeriod)         -> [{ id, TeacherId, SectionId, RoomId }]
//  vacated   : Set of slot ids that are cancelled/moved on toDate (so they are free that day)
//  movedIn   : classes already shifted INTO (toDate, toPeriod)   -> [{ TeacherId, SectionId, RoomId }]
//  unavailable: this teacher's off days/periods                  -> [{ day, period }]
//  rooms     : [{ id, type }]
function findProblem({ slot, toDay, toPeriod, weekly, vacated, movedIn, unavailable, rooms }) {
  const busy = [...weekly.filter((w) => !vacated.has(w.id)), ...movedIn];
  if (busy.some((b) => b.TeacherId === slot.TeacherId)) return { ok: false, message: 'Teacher is already busy at that time' };
  if (busy.some((b) => b.SectionId === slot.SectionId)) return { ok: false, message: 'This section has another class at that time' };
  if (unavailable.some((u) => u.day === toDay && (u.period == null || u.period === toPeriod))) return { ok: false, message: 'Teacher is not available on that day/period' };
  const used = new Set(busy.map((b) => b.RoomId));
  const room = rooms
    .filter((r) => r.type === slot.roomType)
    .sort((a, b) => (b.id === slot.RoomId) - (a.id === slot.RoomId)) // prefer the same room
    .find((r) => !used.has(r.id));
  if (!room) return { ok: false, message: 'There is no free room at that time' };
  return { ok: true, roomId: room.id };
}

// Given all rows of one lab on one day (sorted by period), return the back-to-back run that contains `slot`
function contiguousRun(rows, slot) {
  let run = [];
  for (const r of rows) {
    if (run.length && run[run.length - 1].period + 1 !== r.period) {
      if (run.some((x) => x.id === slot.id)) break;
      run = [];
    }
    run.push(r);
  }
  return run.some((x) => x.id === slot.id) ? run : [slot];
}
module.exports = { findProblem, contiguousRun };
