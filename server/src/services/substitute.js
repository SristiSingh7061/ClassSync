// Pure helper: which teachers are free for ALL the given periods on a date?
//  teachers   : [{ id, name }]
//  periods    : [3] or [2, 3] (a lab)
//  day        : 1..6 (weekday of the date)
//  weekly     : weekly slots at (day, periods)         -> [{ id, TeacherId, period }]
//  vacated    : Set of slot ids that do NOT happen on that date (cancelled / moved / already covered)
//  movedIn    : classes shifted INTO that date+period   -> [{ TeacherId, period }]
//  covering   : teachers already substituting that date -> [{ TeacherId, period }]
//  unavailable: [{ TeacherId, day, period }]  (period null = whole day)
function freeTeachers({ teachers, periods, day, weekly, vacated, movedIn, covering, unavailable, excludeIds = new Set() }) {
  const busy = (t, p) =>
    weekly.some((w) => w.TeacherId === t.id && w.period === p && !vacated.has(w.id)) ||
    movedIn.some((m) => m.TeacherId === t.id && m.period === p) ||
    covering.some((c) => c.TeacherId === t.id && c.period === p) ||
    unavailable.some((u) => u.TeacherId === t.id && u.day === day && (u.period == null || u.period === p));
  return teachers.filter((t) => !excludeIds.has(t.id) && periods.every((p) => !busy(t, p)));
}
module.exports = { freeTeachers };
