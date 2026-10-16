const crypto = require('crypto');
const { Op } = require('sequelize');
const { TimetableSlot, Subject, Room, Section, Teacher, User, TeacherUnavailability, AuditLog } = require('../models');
const SlotChange = require('../models/slotChange');
const SubstituteRequest = require('../models/substituteRequest');
const { isYmd, dow, today, daysAgo, DAY_NAMES } = require('../services/dates');
const { contiguousRun } = require('../services/reschedule');
const { freeTeachers } = require('../services/substitute');
const { emitChange, emitToUser } = require('../services/realtime');
const { sendMail } = require('../services/mailer');

const teacherWithUser = { model: Teacher, include: [{ model: User, attributes: ['id', 'name'] }] };
const slotInclude = [Subject, Room, Section, teacherWithUser];
const userOf = (as) => ({ model: Teacher, as, include: [{ model: User, attributes: ['id', 'name'] }] });

const loadSlot = (id) => TimetableSlot.findByPk(id, { include: slotInclude });
const canManage = (req, slot) => req.user.role === 'admin' || (req.user.role === 'teacher' && slot.Teacher?.UserId === req.user.id);
const audit = (req, action, details) => AuditLog.create({ UserId: req.user.id, action, details });
const myTeacher = (req) => Teacher.findOne({ where: { UserId: req.user.id }, include: [{ model: User, attributes: ['id', 'name'] }] });

async function blockRows(slot) {
  if (slot.Subject?.type !== 'lab') return [slot];
  const all = await TimetableSlot.findAll({
    where: { SectionId: slot.SectionId, SubjectId: slot.SubjectId, TeacherId: slot.TeacherId, day: slot.day },
    order: [['period', 'ASC']],
  });
  return contiguousRun(all, slot);
}

// Who is free for every period of this class on this date?
async function computeFree(slot, rows, date) {
  const day = dow(date);
  const periods = rows.map((r) => r.period);
  const teachers = (await Teacher.findAll({ include: [{ model: User, attributes: ['id', 'name'] }] })).map((t) => ({ id: t.id, name: t.User?.name, userId: t.UserId }));
  const weekly = await TimetableSlot.findAll({ where: { day, period: periods }, attributes: ['id', 'TeacherId', 'period'] });
  const vacated = new Set((await SlotChange.findAll({ where: { date }, attributes: ['TimetableSlotId'] })).map((c) => c.TimetableSlotId));
  const accepted = await SubstituteRequest.findAll({ where: { date, status: 'accepted' }, include: [{ model: TimetableSlot, attributes: ['id', 'period'] }] });
  accepted.forEach((a) => vacated.add(a.TimetableSlotId)); // the original teacher is not teaching it
  const covering = accepted.map((a) => ({ TeacherId: a.ToTeacherId, period: a.TimetableSlot.period }));
  const moved = await SlotChange.findAll({ where: { type: 'reschedule', toDate: date, toPeriod: periods }, include: [{ model: TimetableSlot, attributes: ['TeacherId'] }] });
  const movedIn = moved.map((c) => ({ TeacherId: c.TimetableSlot.TeacherId, period: c.toPeriod }));
  const unavailable = (await TeacherUnavailability.findAll()).map((u) => ({ TeacherId: u.TeacherId, day: u.day, period: u.period }));
  return freeTeachers({ teachers, periods, day, weekly, vacated, movedIn, covering, unavailable, excludeIds: new Set([slot.TeacherId]) });
}

function checkSlotAndDate(req, slot, date) {
  if (!slot) return { code: 404, message: 'Class not found' };
  if (!canManage(req, slot)) return { code: 403, message: 'This class does not belong to you' };
  if (!isYmd(date)) return { code: 400, message: 'date (YYYY-MM-DD) is required' };
  if (date < today()) return { code: 400, message: 'Substitutes cannot be requested for past dates' };
  if (dow(date) !== slot.day) return { code: 400, message: `This class is on ${DAY_NAMES[slot.day]}, but ${date} is a ${DAY_NAMES[dow(date)]}` };
  return null;
}

// Tell students (live + email), the original teacher and the substitute
async function announce(kind, slot, rows, { date, reason, fromName, toName, toUserId }) {
  const periods = rows.map((r) => r.period);
  const payload = {
    kind, subject: slot.Subject?.name, section: slot.Section?.name, date, period: Math.min(...periods), endPeriod: Math.max(...periods),
    reason: reason || null, fromTeacher: fromName, toTeacher: toName,
  };
  emitChange(payload, { sectionId: slot.SectionId, teacherUserId: [slot.Teacher?.UserId, toUserId] });
  const text = kind === 'substitute'
    ? `${payload.subject} (Section ${payload.section}) on ${date} (${DAY_NAMES[dow(date)]}), P${payload.period}: ${toName} will take the class instead of ${fromName}.${reason ? `\nReason: ${reason}` : ''}`
    : `${payload.subject} (Section ${payload.section}) on ${date}, P${payload.period}: back to ${fromName} as usual.`;
  const students = await User.findAll({ where: { role: 'student', SectionId: slot.SectionId }, attributes: ['email'] });
  sendMail({ bcc: students.map((s) => s.email), subject: `[ClassSync] ${payload.subject} - ${kind === 'substitute' ? 'substitute teacher' : 'teacher back'} (${date})`, text: `${text}\n\nOpen ClassSync for the latest routine.` });
}

// ---- GET /api/slots/:id/free-teachers?date=YYYY-MM-DD ----
exports.freeList = async (req, res) => {
  const date = req.query.date;
  const slot = await loadSlot(req.params.id);
  const bad = checkSlotAndDate(req, slot, date);
  if (bad) return res.status(bad.code).json({ message: bad.message });
  const free = await computeFree(slot, await blockRows(slot), date);
  res.json(free.map((t) => ({ id: t.id, name: t.name })));
};

// ---- POST /api/slots/:id/substitute  { date, toTeacherId, reason } ----
exports.request = async (req, res) => {
  const { date, toTeacherId, reason } = req.body;
  const slot = await loadSlot(req.params.id);
  const bad = checkSlotAndDate(req, slot, date);
  if (bad) return res.status(bad.code).json({ message: bad.message });
  if (!toTeacherId) return res.status(400).json({ message: 'should specify toTeacherId' });

  const rows = await blockRows(slot);
  const ids = rows.map((r) => r.id);
  if (await SlotChange.count({ where: { TimetableSlotId: ids, date } })) return res.status(409).json({ message: 'A class is already cancelled/shifted on that date. Please undo it first.' });
  if (await SubstituteRequest.count({ where: { TimetableSlotId: ids, date, status: ['pending', 'accepted'] } })) return res.status(409).json({ message: 'A substitute is already requested for this class.' });

  const target = (await computeFree(slot, rows, date)).find((t) => t.id === Number(toTeacherId));
  if (!target) return res.status(409).json({ message: 'That teacher is not available at that time' });

  const direct = req.user.role === 'admin'; // HOD assigns directly, teachers must ask
  const groupId = crypto.randomUUID();
  const fromName = slot.Teacher?.User?.name;
  await SubstituteRequest.bulkCreate(rows.map((r) => ({
    groupId, TimetableSlotId: r.id, date, FromTeacherId: slot.TeacherId, ToTeacherId: target.id,
    status: direct ? 'accepted' : 'pending', reason: reason || null, ByUserId: req.user.id,
  })));
  await audit(req, direct ? 'substitute.assign' : 'substitute.request', { slotIds: ids, date, toTeacherId: target.id, reason });
  if (direct) await announce('substitute', slot, rows, { date, reason, fromName, toName: target.name, toUserId: target.userId });
  else emitToUser(target.userId, 'sub:request', { kind: 'request', groupId, subject: slot.Subject?.name, section: slot.Section?.name, date, period: Math.min(...rows.map((r) => r.period)), fromTeacher: fromName, reason: reason || null });
  res.status(201).json({ message: direct ? 'Substitute assigned successfully' : `${target.name} requested sent` });
};

const formatGroup = (rows, meId) => {
  const first = rows[0];
  const periods = rows.map((r) => r.TimetableSlot.period);
  return {
    groupId: first.groupId, status: first.status, date: first.date, reason: first.reason,
    slotIds: rows.map((r) => r.TimetableSlotId),
    subject: first.TimetableSlot.Subject?.name, section: first.TimetableSlot.Section?.name,
    period: Math.min(...periods), endPeriod: Math.max(...periods),
    fromTeacher: first.from?.User?.name, toTeacher: first.to?.User?.name,
    direction: first.ToTeacherId === meId ? 'incoming' : 'outgoing',
  };
};

// ---- GET /api/substitutes/mine  (incoming + outgoing, from today onwards) ----
exports.mine = async (req, res) => {
  const me = await myTeacher(req);
  if (!me) return res.status(404).json({ message: 'Teacher profile not found' });
  const rows = await SubstituteRequest.findAll({
    where: { date: { [Op.gte]: today() }, status: ['pending', 'accepted', 'declined'], [Op.or]: [{ FromTeacherId: me.id }, { ToTeacherId: me.id }] },
    include: [{ model: TimetableSlot, required: true, include: [Subject, Section] }, userOf('from'), userOf('to')],
    order: [['date', 'ASC'], ['id', 'ASC']],
  });
  const groups = new Map();
  rows.forEach((r) => { if (!groups.has(r.groupId)) groups.set(r.groupId, []); groups.get(r.groupId).push(r); });
  res.json([...groups.values()].map((g) => formatGroup(g, me.id)));
};

// ---- POST /api/substitutes/:groupId/respond  { accept: true|false }  (the asked teacher) ----
exports.respond = async (req, res) => {
  const me = await myTeacher(req);
  if (!me) return res.status(403).json({ message: 'Only the teacher can respond' });
  const rows = await SubstituteRequest.findAll({
    where: { groupId: req.params.groupId, ToTeacherId: me.id, status: 'pending' },
    include: [{ model: TimetableSlot, include: slotInclude }],
    order: [['id', 'ASC']],
  });
  if (!rows.length) return res.status(404).json({ message: 'Request not found or already responded to' });
  const date = rows[0].date;
  if (date < today()) return res.status(400).json({ message: 'This date has already passed' });
  const slot = rows[0].TimetableSlot;
  const accept = req.body.accept === true;

  if (accept) {
    const stillFree = (await computeFree(slot, rows.map((r) => r.TimetableSlot), date)).some((t) => t.id === me.id);
    if (!stillFree) return res.status(409).json({ message: 'You are not available at that time, so you cannot accept the request' });
  }
  await SubstituteRequest.update({ status: accept ? 'accepted' : 'declined' }, { where: { groupId: req.params.groupId, status: 'pending' } });
  await audit(req, accept ? 'substitute.accept' : 'substitute.decline', { groupId: req.params.groupId, date });

  const fromName = slot.Teacher?.User?.name;
  emitToUser(slot.Teacher?.UserId, 'sub:response', { kind: accept ? 'accepted' : 'declined', subject: slot.Subject?.name, date, period: slot.period, toTeacher: me.User?.name });
  if (accept) await announce('substitute', slot, rows.map((r) => r.TimetableSlot), { date, reason: rows[0].reason, fromName, toName: me.User?.name, toUserId: me.UserId });
  res.json({ message: accept ? 'Substitute accepted' : 'Request declined' });
};

// ---- DELETE /api/substitutes/:groupId  (requester / HOD withdraws or undoes) ----
exports.cancelRequest = async (req, res) => {
  const rows = await SubstituteRequest.findAll({
    where: { groupId: req.params.groupId, status: ['pending', 'accepted'] },
    include: [{ model: TimetableSlot, include: slotInclude }, userOf('to')],
    order: [['id', 'ASC']],
  });
  if (!rows.length) return res.status(404).json({ message: 'Request not found' });
  const slot = rows[0].TimetableSlot;
  if (!canManage(req, slot)) return res.status(403).json({ message: 'You are not the owner of this request' });
  const wasAccepted = rows[0].status === 'accepted';
  const date = rows[0].date;
  await SubstituteRequest.update({ status: 'cancelled' }, { where: { groupId: req.params.groupId, status: ['pending', 'accepted'] } });
  await audit(req, 'substitute.cancel', { groupId: req.params.groupId, date });

  const fromName = slot.Teacher?.User?.name;
  const toName = rows[0].to?.User?.name;
  emitToUser(rows[0].to?.UserId, 'sub:response', { kind: 'cancelled', subject: slot.Subject?.name, date, period: slot.period, fromTeacher: fromName });
  if (wasAccepted) await announce('restored', slot, rows.map((r) => r.TimetableSlot), { date, fromName, toName, toUserId: rows[0].to?.UserId });
  res.json({ message: 'Substitute cancelled' });
};

// ---- used by the timetable endpoints: accepted substitutions (last 7 days onwards) ----
exports.loadSubs = async ({ sectionId, teacherId }) => {
  const where = { status: 'accepted', date: { [Op.gte]: daysAgo(7) } };
  if (teacherId) where[Op.or] = [{ FromTeacherId: teacherId }, { ToTeacherId: teacherId }];
  const slotInc = { model: TimetableSlot, required: true, include: [Subject, Room, Section] };
  if (sectionId) slotInc.where = { SectionId: sectionId };
  const rows = await SubstituteRequest.findAll({ where, include: [slotInc, userOf('from'), userOf('to')], order: [['date', 'ASC']] });
  return rows.map((r) => ({
    id: r.id, groupId: r.groupId, slotId: r.TimetableSlotId, date: r.date, period: r.TimetableSlot.period, reason: r.reason,
    subject: r.TimetableSlot.Subject?.name, code: r.TimetableSlot.Subject?.code, room: r.TimetableSlot.Room?.name, section: r.TimetableSlot.Section?.name,
    fromTeacherId: r.FromTeacherId, toTeacherId: r.ToTeacherId, fromTeacher: r.from?.User?.name, toTeacher: r.to?.User?.name,
  }));
};
