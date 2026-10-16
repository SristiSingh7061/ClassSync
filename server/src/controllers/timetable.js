const { sequelize, Assignment, Subject, Room, Section, Teacher, User, TeacherUnavailability, TimetableSlot, AuditLog } = require('../models');
const { generate } = require('../services/generator');
const { loadChanges } = require('./changes');
const { loadSubs } = require('./substitutes');

// ---- Assignments (teacher + subject + section) ----
exports.createAssignment = async (req, res) => {
  const { teacherId, subjectId, sectionId } = req.body;
  if (!teacherId || !subjectId || !sectionId) return res.status(400).json({ message: 'teacherId, subjectId, sectionId required' });
  const [a, made] = await Assignment.findOrCreate({ where: { SubjectId: subjectId, SectionId: sectionId }, defaults: { TeacherId: teacherId } });
  if (!made) await a.update({ TeacherId: teacherId });
  await AuditLog.create({ UserId: req.user.id, action: 'assignment.set', details: { teacherId, subjectId, sectionId } });
  res.status(made ? 201 : 200).json(a);
};
exports.listAssignments = async (req, res) =>
  res.json(await Assignment.findAll({ include: [Subject, Section, { model: Teacher, include: [{ model: User, attributes: ['name'] }] }] }));
exports.removeAssignment = async (req, res) => {
  const n = await Assignment.destroy({ where: { id: req.params.id } });
  res.status(n ? 200 : 404).json({ message: n ? 'Deleted' : 'Not found' });
};

// ---- Teacher unavailability ----
exports.addUnavailability = async (req, res) => {
  const { day, period } = req.body; // period omitted = whole day
  if (!day) return res.status(400).json({ message: 'day (1=Mon..6=Sat) required' });
  res.status(201).json(await TeacherUnavailability.create({ TeacherId: req.params.id, day, period: period ?? null }));
};

// ---- Generate ----
exports.generate = async (req, res) => {
  const { sectionIds, periods = 6 } = req.body;
  const where = sectionIds?.length ? { SectionId: sectionIds } : {};
  const assigns = await Assignment.findAll({ where, include: [Subject] });
  if (!assigns.length) return res.status(400).json({ message: 'No assignments found. Assign teachers to subjects first.' });

  const classes = assigns.map((a) => ({
    sectionId: a.SectionId, subjectId: a.SubjectId, teacherId: a.TeacherId,
    type: a.Subject.type, periodsPerWeek: a.Subject.weeklyCount,
  }));
  const rooms = (await Room.findAll()).map((r) => ({ id: r.id, type: r.type }));
  if (!rooms.length) return res.status(400).json({ message: 'Add rooms first' });
  const unavailable = (await TeacherUnavailability.findAll()).map((u) => ({ teacherId: u.TeacherId, day: u.day, period: u.period }));

  const out = generate({ classes, rooms, unavailable, periods });
  if (!out.ok) return res.status(422).json({ message: out.message });

  const secIds = [...new Set(classes.map((c) => c.sectionId))];
  await sequelize.transaction(async (t) => {
    await TimetableSlot.destroy({ where: { SectionId: secIds }, transaction: t });
    await TimetableSlot.bulkCreate(out.slots, { transaction: t });
    await AuditLog.create({ UserId: req.user.id, action: 'timetable.generate', details: { sections: secIds, slots: out.slots.length } }, { transaction: t });
  });
  res.status(201).json({ message: 'Timetable generated', sections: secIds, slots: out.slots.length });
};

// ---- Read ----
const include = [Subject, Room, { model: Teacher, include: [{ model: User, attributes: ['name'] }] }];
exports.sectionTimetable = async (req, res) => {
  const rows = await TimetableSlot.findAll({ where: { SectionId: req.params.id }, include, order: [['day', 'ASC'], ['period', 'ASC']] });
  const week = {};
  rows.forEach((s) => {
    (week[s.day] ||= []).push({ id: s.id, period: s.period, status: s.status, subject: s.Subject?.name, code: s.Subject?.code, type: s.Subject?.type, room: s.Room?.name, teacher: s.Teacher?.User?.name });
  });
  const changes = await loadChanges({ sectionId: Number(req.params.id) });
  const subs = await loadSubs({ sectionId: Number(req.params.id) });
  res.json({ sectionId: Number(req.params.id), week, changes, subs });
};

// Teacher's own weekly schedule (used by the React teacher page)
exports.teacherTimetable = async (req, res) => {
  const teacher = await Teacher.findOne({ where: { UserId: req.user.id } });
  if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });
  const rows = await TimetableSlot.findAll({
    where: { TeacherId: teacher.id },
    include: [Subject, Room, Section],
    order: [['day', 'ASC'], ['period', 'ASC']],
  });
  const week = {};
  rows.forEach((s) => {
    (week[s.day] ||= []).push({ id: s.id, period: s.period, status: s.status, subject: s.Subject?.name, code: s.Subject?.code, type: s.Subject?.type, room: s.Room?.name, section: s.Section?.name });
  });
  const changes = await loadChanges({ teacherId: teacher.id });
  const subs = await loadSubs({ teacherId: teacher.id });
  res.json({ week, changes, subs, teacherId: teacher.id });
};

// Section list for the public student signup form
exports.publicSections = async (req, res) =>
  res.json(await Section.findAll({ attributes: ['id', 'name', 'semester'], order: [['id', 'ASC']] }));
