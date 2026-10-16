const { Op } = require('sequelize');
const { User, Teacher, Subject, Room, Section, TimetableSlot, AuditLog } = require('../models');
const SlotChange = require('../models/slotChange');
const SubstituteRequest = require('../models/substituteRequest');
const { daysAgo } = require('../services/dates');
const { buildAnalytics } = require('../services/analytics');

// ---- GET /api/analytics ----
exports.analytics = async (req, res) => {
  const since = daysAgo(30);
  const [teachers, rooms, slots, students, sections, subjects] = await Promise.all([
    Teacher.findAll({ include: [{ model: User, attributes: ['name'] }] }),
    Room.findAll(),
    TimetableSlot.findAll({ attributes: ['day', 'period', 'TeacherId', 'RoomId'] }),
    User.count({ where: { role: 'student' } }),
    Section.count(),
    Subject.count(),
  ]);
  const changeRows = await SlotChange.findAll({
    where: { date: { [Op.gte]: since } },
    include: [{ model: TimetableSlot, attributes: ['TeacherId', 'SectionId', 'SubjectId', 'period'], include: [{ model: Subject, attributes: ['type'] }] }],
  });
  const subRows = await SubstituteRequest.findAll({ where: { date: { [Op.gte]: since } }, attributes: ['groupId', 'status', 'FromTeacherId', 'ToTeacherId'] });

  res.json(buildAnalytics({
    teachers: teachers.map((t) => ({ id: t.id, name: t.User?.name })),
    rooms: rooms.map((r) => ({ id: r.id, name: r.name, type: r.type })),
    slots: slots.map((s) => ({ day: s.day, period: s.period, TeacherId: s.TeacherId, RoomId: s.RoomId })),
    changes: changeRows.map((c) => ({
      type: c.type, date: c.date, teacherId: c.TimetableSlot.TeacherId, sectionId: c.TimetableSlot.SectionId,
      subjectId: c.TimetableSlot.SubjectId, isLab: c.TimetableSlot.Subject?.type === 'lab', period: c.TimetableSlot.period,
    })),
    subs: subRows.map((s) => ({ groupId: s.groupId, status: s.status, FromTeacherId: s.FromTeacherId, ToTeacherId: s.ToTeacherId })),
    counts: { teachers: teachers.length, students, sections, subjects },
  }));
};

// ---- GET /api/audit?limit=30&before=<id> ----
exports.audit = async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const where = req.query.before ? { id: { [Op.lt]: Number(req.query.before) } } : {};
  const rows = await AuditLog.findAll({ where, include: [{ model: User, attributes: ['name', 'role'] }], order: [['id', 'DESC']], limit });
  res.json(rows.map((r) => ({ id: r.id, action: r.action, details: r.details, at: r.createdAt, user: r.User?.name || 'system', role: r.User?.role })));
};
