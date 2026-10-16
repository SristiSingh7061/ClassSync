import { PERIOD_TIMES } from './config';

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fmtDate = (s) => { const d = new Date(`${s}T12:00:00`); return `${DAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`; };

// 1 = Mon ... 6 = Sat, null on Sunday
export const todayIndex = () => { const d = new Date().getDay(); return d === 0 ? null : d; };

// Dates of the week being shown: { 1: '2026-10-12', ... 6: '2026-10-17' } (on Sunday it shows the coming week)
export function weekDates(base = new Date()) {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? 1 : 1 - dow));
  const out = {};
  for (let i = 1; i <= 6; i++) { const x = new Date(d); x.setDate(d.getDate() + i - 1); out[i] = ymd(x); }
  return out;
}

// Put cancellations, shifted classes and substitutes on top of the weekly routine.
//  subs: accepted substitutions.  me: the teacher's id when a TEACHER is viewing (null for students).
export function applyChanges(week = {}, changes = [], dates = weekDates(), { subs = [], me = null } = {}) {
  const byKey = {};
  changes.forEach((c) => { byKey[`${c.slotId}|${c.date}`] = c; });
  const subKey = {};
  subs.forEach((x) => { subKey[`${x.slotId}|${x.date}`] = x; });
  const out = {};
  const push = (d, item) => { (out[d] ||= []).push(item); };

  for (const [d, items] of Object.entries(week)) {
    for (const s of items) {
      const k = `${s.id}|${dates[d]}`;
      const c = byKey[k];
      const sb = subKey[k];
      if (c) {
        if (c.type === 'cancel') push(d, { ...s, status: 'cancelled', reason: c.reason, changeId: c.id });
        else push(d, { ...s, status: 'moved', reason: c.reason, changeId: c.id, note: `${fmtDate(c.toDate)}, P${c.toPeriod}` });
      } else if (sb && me == null) {
        push(d, { ...s, status: 'substituted', teacher: sb.toTeacher, note: `${sb.fromTeacher} instead`, reason: sb.reason });
      } else if (sb && sb.fromTeacherId === me) {
        push(d, { ...s, status: 'covered', note: `${sb.toTeacher} will take over`, reason: sb.reason });
      } else push(d, s);
    }
  }
  for (const c of changes) {
    if (c.type !== 'reschedule') continue;
    const hit = Object.entries(dates).find(([, dt]) => dt === c.toDate);
    if (!hit) continue;
    push(hit[0], { id: `m${c.id}`, period: c.toPeriod, status: 'rescheduled', subject: c.subject, code: c.code, room: c.toRoom, teacher: c.teacher, section: c.section, reason: c.reason, changeId: c.id });
  }
  // extra duty for the teacher who is substituting
  if (me != null) {
    for (const x of subs) {
      if (x.toTeacherId !== me) continue;
      const hit = Object.entries(dates).find(([, dt]) => dt === x.date);
      if (!hit) continue;
      push(hit[0], { id: `s${x.id}`, period: x.period, status: 'substituted', subject: x.subject, code: x.code, room: x.room, teacher: x.toTeacher, section: x.section, note: `${x.fromTeacher} instead`, reason: x.reason });
    }
  }
  return out;
}

// Merge back-to-back periods of the same class (e.g. a 2-period lab) into one block
export function mergeBlocks(slots = []) {
  const sorted = [...slots].sort((a, b) => a.period - b.period);
  const out = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && last.endPeriod + 1 === s.period && last.subject === s.subject && last.room === s.room && last.teacher === s.teacher && last.status === s.status && last.section === s.section) {
      last.endPeriod = s.period;
    } else {
      out.push({ ...s, startPeriod: s.period, endPeriod: s.period });
    }
  }
  return out.map((b) => ({ ...b, start: PERIOD_TIMES[b.startPeriod]?.[0], end: PERIOD_TIMES[b.endPeriod]?.[1] }));
}

// Which class is on right now, and which is next
export function nowNext(blocks, date = new Date()) {
  const now = date.getHours() * 60 + date.getMinutes();
  const live = blocks.find((b) => b.start && toMin(b.start) <= now && now < toMin(b.end));
  if (live) return { kind: 'now', block: live };
  const next = blocks.find((b) => b.start && toMin(b.start) > now);
  return next ? { kind: 'next', block: next } : null;
}
