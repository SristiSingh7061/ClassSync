const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db');

const Section = sequelize.define('Section', {
  name: { type: D.STRING, allowNull: false },            // e.g. "A"
  semester: { type: D.INTEGER, allowNull: false },       // 1-8
});
const User = sequelize.define('User', {
  name: { type: D.STRING, allowNull: false },
  email: { type: D.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: D.STRING, allowNull: false },
  role: { type: D.ENUM('admin', 'teacher', 'student'), allowNull: false, defaultValue: 'student' },
});
const Teacher = sequelize.define('Teacher', { department: { type: D.STRING, defaultValue: 'CSE' } });
const Subject = sequelize.define('Subject', {
  name: { type: D.STRING, allowNull: false },
  code: { type: D.STRING, allowNull: false, unique: true },
  type: { type: D.ENUM('theory', 'lab'), defaultValue: 'theory' },
  weeklyCount: { type: D.INTEGER, allowNull: false, defaultValue: 3 },
  semester: { type: D.INTEGER, allowNull: false },
});
const Room = sequelize.define('Room', {
  name: { type: D.STRING, allowNull: false, unique: true },
  type: { type: D.ENUM('classroom', 'lab'), defaultValue: 'classroom' },
  capacity: D.INTEGER,
});
const TeacherUnavailability = sequelize.define('TeacherUnavailability', {
  day: { type: D.INTEGER, allowNull: false },            // 1=Mon ... 6=Sat
  period: D.INTEGER,                                     // null = whole day
});
// Core table. Unique indexes stop double-booking at the DATABASE level.
const TimetableSlot = sequelize.define('TimetableSlot', {
  day: { type: D.INTEGER, allowNull: false },
  period: { type: D.INTEGER, allowNull: false },
  status: { type: D.ENUM('scheduled', 'cancelled', 'substituted'), defaultValue: 'scheduled' },
}, { indexes: [
  { unique: true, fields: ['TeacherId', 'day', 'period'], name: 'uniq_teacher_slot' },
  { unique: true, fields: ['RoomId', 'day', 'period'], name: 'uniq_room_slot' },
  { unique: true, fields: ['SectionId', 'day', 'period'], name: 'uniq_section_slot' },
] });
const ClassUpdate = sequelize.define('ClassUpdate', {
  type: { type: D.ENUM('cancel', 'reschedule', 'substitute'), allowNull: false },
  reason: D.TEXT,
});
const AuditLog = sequelize.define('AuditLog', {
  action: { type: D.STRING, allowNull: false },
  details: D.JSONB,
});

Section.hasMany(User); User.belongsTo(Section);
User.hasOne(Teacher, { onDelete: 'CASCADE' }); Teacher.belongsTo(User);
Teacher.hasMany(TeacherUnavailability); TeacherUnavailability.belongsTo(Teacher);
Section.hasMany(TimetableSlot); Subject.hasMany(TimetableSlot); Teacher.hasMany(TimetableSlot); Room.hasMany(TimetableSlot);
TimetableSlot.belongsTo(Section); TimetableSlot.belongsTo(Subject); TimetableSlot.belongsTo(Teacher); TimetableSlot.belongsTo(Room);
TimetableSlot.hasMany(ClassUpdate); ClassUpdate.belongsTo(TimetableSlot);
ClassUpdate.belongsTo(Teacher, { as: 'newTeacher' }); ClassUpdate.belongsTo(User, { as: 'by' });
User.hasMany(AuditLog); AuditLog.belongsTo(User);

module.exports = { sequelize, Section, User, Teacher, Subject, Room, TeacherUnavailability, TimetableSlot, ClassUpdate, AuditLog };