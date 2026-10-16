// Pure analytics for the HOD dashboard.
//  slots   : [{ day, period, TeacherId, RoomId }]            (whole weekly timetable)
//  changes : [{ type, date, teacherId, sectionId, subjectId, isLab, period }]   (last 30 days, one row per period)
//  subs    : [{ groupId, status, FromTeacherId, ToTeacherId }]                   (last 30 days, one row per period)
function buildAnalytics({ teachers, rooms, slots, changes, subs, counts, days = 6, periods = 6 }) {
  const capacity = days * periods;

  const roomUse = rooms.map((r) => {
    const used = slots.filter((s) => s.RoomId === r.id).length;
    return { name: r.name, type: r.type, used, capacity, percent: Math.round((used / capacity) * 100) };
  }).sort((a, b) => b.percent - a.percent);

  // a lab cancelled for 2 periods is ONE cancellation: skip the 2nd period row
  const seen = new Set(changes.map((c) => `${c.date}|${c.sectionId}|${c.subjectId}|${c.period}`));
  const unique = changes.filter((c) => !(c.isLab && seen.has(`${c.date}|${c.sectionId}|${c.subjectId}|${c.period - 1}`)));

  const subGroups = new Map();
  subs.forEach((s) => { if (!subGroups.has(s.groupId)) subGroups.set(s.groupId, s); });
  const subList = [...subGroups.values()];

  const teacherRows = teachers.map((t) => ({
    name: t.name,
    weeklyLoad: slots.filter((s) => s.TeacherId === t.id).length,
    cancels: unique.filter((c) => c.type === 'cancel' && c.teacherId === t.id).length,
    subsTaken: subList.filter((s) => s.status === 'accepted' && s.ToTeacherId === t.id).length,
  })).sort((a, b) => b.weeklyLoad - a.weeklyLoad);

  const heat = Array.from({ length: days }, (_, d) => Array.from({ length: periods }, (_, p) => slots.filter((s) => s.day === d + 1 && s.period === p + 1).length));
  const max = Math.max(1, ...heat.flat());

  return {
    totals: { ...counts, rooms: rooms.length, weeklyClasses: slots.length },
    last30: {
      cancelled: unique.filter((c) => c.type === 'cancel').length,
      rescheduled: unique.filter((c) => c.type === 'reschedule').length,
      substituted: subList.filter((s) => s.status === 'accepted').length,
      substitutePending: subList.filter((s) => s.status === 'pending').length,
    },
    rooms: roomUse,
    teachers: teacherRows,
    heat: { rows: heat, max },
  };
}
module.exports = { buildAnalytics };
