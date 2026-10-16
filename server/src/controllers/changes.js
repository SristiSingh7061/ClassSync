const { Op } = require('sequelize');
const { TimetableSlot, Subject, Room, Section, Teacher, User, TeacherUnavailability, AuditLog } = require('../models');
const SlotChange = require('../models/slotChange');
const SubstituteRequest = require('../models/substituteRequest');
const { isYmd, dow, today, daysAgo, DAY_NAMES } = require('../services/dates');
const { findProblem, contiguousRun } = require('../services/reschedule');
const { emitChange } = require('../services/realtime');
const { sendMail } = require('../services/mailer');

const MAX_PERIOD = 6;
const slotInclude = [Subject, Room, Section, { model: Teacher, include: [{ model: User, attributes: ['id', 'name'] }] }];
const changeInclude = (slotWhere) => [
  { model: TimetableSlot, where: slotWhere, required: true, include: slotInclude },
  { model: Room, as: 'toRoom', required: false },
];

const format = (c) => {
  const s = c.TimetableSlot;
  return {
    id: c.id, slotId: s.id, type: c.type, date: c.date, reason: c.reason, toDate: c.toDate, toPeriod: c.toPeriod,
    toRoom: c.toRoom?.name, day: s.day, period: s.period,
    subject: s.Subject?.name, code: s.Subject?.code, room: s.Room?.name, section: s.Section?.name, teacher: s.Teacher?.User?.name,
  };
};

// Changes shown on student / teacher pages (from 7 days ago onwards)
exports.loadChanges = async ({ sectionId, teacherId }) => {
  const slotWhere = sectionId ? { SectionId: sectionId } : { TeacherId: teacherId };
  const rows = await SlotChange.findAll({
    where: { date: { [Op.gte]: daysAgo(7) } },
    include: changeInclude(slotWhere),
    order: [['date', 'ASC']],
  });
  return rows.map(format);
};

const loadSlot = (id) => TimetableSlot.findByPk(id, { include: slotInclude });
const canManage = (req, slot) => req.user.role === 'admin' || (req.user.role === 'teacher' && slot.Teacher?.UserId === req.user.id);

// A lab is stored as 2 back-to-back rows; cancel/undo must treat them as ONE class.
async function blockRows(slot) {
  if (slot.Subject?.type !== 'lab') return [slot];
  const all = await TimetableSlot.findAll({
    where: { SectionId: slot.SectionId, SubjectId: slot.SubjectId, TeacherId: slot.TeacherId, day: slot.day },
    order: [['period', 'ASC']],
  });
  return contiguousRun(all, slot);
}

// ---- tell students (live + email), the teacher and admins ----
async function announce(kind, slot, rows, { date, reason, toDate, toPeriod }) {
  const periods = rows.map((r) => r.period);
  const payload = {
    kind, subject: slot.Subject?.name, section: slot.Section?.name, teacher: slot.Teacher?.User?.name,
    date, period: Math.min(...periods), endPeriod: Math.max(...periods), reason: reason || null, toDate: toDate || null, toPeriod: toPeriod || null,
  };
  emitChange(payload, { sectionId: slot.SectionId, teacherUserId: slot.Teacher?.UserId });

  const label = { cancel: 'CANCELLED', reschedule: 'RESCHEDULED', restored: 'back to normal' }[kind];
  const lines = [`${payload.subject} (Section ${payload.section}) on ${date} (${DAY_NAMES[dow(date)]}), P${payload.period}${payload.endPeriod !== payload.period ? `-P${payload.endPeriod}` : ''}: ${label}.`];
  if (kind === 'reschedule') lines.push(`New time: ${toDate} (${DAY_NAMES[dow(toDate)]}), P${toPeriod}.`);
  if (reason) lines.push(`Reason: ${reason}`);
  lines.push(`Teacher: ${payload.teacher}`, '', 'Open ClassSync for the latest routine.');
  const students = await User.findAll({ where: { role: 'student', SectionId: slot.SectionId }, attributes: ['email'] });
  sendMail({ bcc: students.map((s) => s.email), subject: `[ClassSync] ${payload.subject} ${label} - ${date}`, text: lines.join('\n') }); // not awaited on purpose
}

const audit = (req, action, details) => AuditLog.create({ UserId: req.user.id, action, details });

// ---- POST /api/slots/:id/cancel   { date, reason } ----
exports.cancel = async (req, res) => {
  const { date, reason } = req.body;
  const slot = await loadSlot(req.params.id);
  if (!slot) return res.status(404).json({ message: 'Class not found' });
  if (!canManage(req, slot)) return res.status(403).json({ message: 'You are not the owner of this class' });
  if (!isYmd(date)) return res.status(400).json({ message: 'date (YYYY-MM-DD) is required' });
  if (date < today()) return res.status(400).json({ message: 'Past dates cannot be cancelled' });
  if (dow(date) !== slot.day) return res.status(400).json({ message: `This class is scheduled for ${DAY_NAMES[slot.day]}, not for ${date} (${DAY_NAMES[dow(date)]})` });

  const rows = await blockRows(slot);
  if (await SlotChange.count({ where: { TimetableSlotId: rows.map((r) => r.id), date } }))
    return res.status(409).json({ message: 'This class has already been changed on this date. Undo it first.' });

  if (await SubstituteRequest.count({ where: { TimetableSlotId: rows.map((r) => r.id), date, status: ['pending', 'accepted'] } }))
    return res.status(409).json({ message: 'This class has a pending substitute request. Cancel the substitute first.' });

  await SlotChange.bulkCreate(rows.map((r) => ({ TimetableSlotId: r.id, date, type: 'cancel', reason: reason || null, ByUserId: req.user.id })));
  await audit(req, 'class.cancel', { slotIds: rows.map((r) => r.id), date, reason });
  await announce('cancel', slot, rows, { date, reason });
  res.status(201).json({ message: 'The class has been cancelled, the students have been notified.' });
};

// ---- POST /api/slots/:id/reschedule   { date, toDate, toPeriod, reason } (theory classes only) ----
exports.reschedule = async (req, res) => {
  const { date, toDate, reason } = req.body;
  const toPeriod = Number(req.body.toPeriod);
  const slot = await loadSlot(req.params.id);
  if (!slot) return res.status(404).json({ message: 'Class not found' });
  if (!canManage(req, slot)) return res.status(403).json({ message: 'You are not the owner of this class' });
  if (slot.Subject?.type === 'lab') return res.status(400).json({ message: 'Lab reschedule is not supported yet. Please cancel the class instead.' });
  if (!isYmd(date) || !isYmd(toDate)) return res.status(400).json({ message: 'date and toDate (YYYY-MM-DD) are required' });
  if (!Number.isInteger(toPeriod) || toPeriod < 1 || toPeriod > MAX_PERIOD) return res.status(400).json({ message: `toPeriod must be an integer between 1 and ${MAX_PERIOD}` });
  if (date < today() || toDate < today()) return res.status(400).json({ message: 'Past dates are not allowed' });
  if (dow(date) !== slot.day) return res.status(400).json({ message: `This class is scheduled for ${DAY_NAMES[slot.day]}, not for ${date} (${DAY_NAMES[dow(date)]})` });
  const toDay = dow(toDate);
  if (toDay === 0) return res.status(400).json({ message: 'Classes cannot be shifted to Sundays' });
  if (toDate === date && toPeriod === slot.period) return res.status(400).json({ message: 'The new time is the same as the current time' });
  if (await SlotChange.count({ where: { TimetableSlotId: slot.id, date } }))
    return res.status(409).json({ message: 'This class has already been changed on this date. Undo it first.' });

  if (await SubstituteRequest.count({ where: { TimetableSlotId: slot.id, date, status: ['pending', 'accepted'] } }))
    return res.status(409).json({ message: 'This class has a pending substitute request. Cancel the substitute first.' });

  // is the target free?
  const weekly = await TimetableSlot.findAll({ where: { day: toDay, period: toPeriod } });
  const vacated = new Set((await SlotChange.findAll({ where: { date: toDate }, attributes: ['TimetableSlotId'] })).map((c) => c.TimetableSlotId));
  const moved = await SlotChange.findAll({ where: { type: 'reschedule', toDate, toPeriod }, include: [{ model: TimetableSlot }] });
  const movedIn = moved.map((c) => ({ TeacherId: c.TimetableSlot.TeacherId, SectionId: c.TimetableSlot.SectionId, RoomId: c.ToRoomId }));
  const unavailable = (await TeacherUnavailability.findAll({ where: { TeacherId: slot.TeacherId } })).map((u) => ({ day: u.day, period: u.period }));
  const rooms = (await Room.findAll()).map((r) => ({ id: r.id, type: r.type }));

  const check = findProblem({
    slot: { TeacherId: slot.TeacherId, SectionId: slot.SectionId, RoomId: slot.RoomId, roomType: slot.Room?.type },
    toDay, toPeriod, weekly, vacated, movedIn, unavailable, rooms,
  });
  if (!check.ok) return res.status(409).json({ message: check.message });

  await SlotChange.create({ TimetableSlotId: slot.id, date, type: 'reschedule', reason: reason || null, toDate, toPeriod, ToRoomId: check.roomId, ByUserId: req.user.id });
  await audit(req, 'class.reschedule', { slotId: slot.id, date, toDate, toPeriod, reason });
  await announce('reschedule', slot, [slot], { date, reason, toDate, toPeriod });
  res.status(201).json({ message: 'The class got shifted, the students got notified.' });
};

// ---- DELETE /api/changes/:id  (undo a cancel / reschedule) ----
exports.undo = async (req, res) => {
  const change = await SlotChange.findByPk(req.params.id);
  if (!change) return res.status(404).json({ message: 'Change not found' });
  const slot = await loadSlot(change.TimetableSlotId);
  if (!slot) return res.status(404).json({ message: 'Class not found' });
  if (!canManage(req, slot)) return res.status(403).json({ message: 'You are not the owner of this class' });
  const rows = await blockRows(slot);
  await SlotChange.destroy({ where: { TimetableSlotId: rows.map((r) => r.id), date: change.date } });
  await audit(req, 'class.undo', { slotIds: rows.map((r) => r.id), date: change.date });
  await announce('restored', slot, rows, { date: change.date });
  res.json({ message: 'Change removed, class restored to normal' });
};
