// A teacher asks another teacher to take ONE class on ONE date.
// A lab (2 periods) = 2 rows sharing the same groupId.
const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db');
const { TimetableSlot, Teacher } = require('./index');

const SubstituteRequest = sequelize.define('SubstituteRequest', {
  groupId: { type: D.UUID, allowNull: false },
  TimetableSlotId: { type: D.INTEGER, allowNull: false },
  date: { type: D.DATEONLY, allowNull: false },
  FromTeacherId: { type: D.INTEGER, allowNull: false },
  ToTeacherId: { type: D.INTEGER, allowNull: false },
  status: { type: D.ENUM('pending', 'accepted', 'declined', 'cancelled'), allowNull: false, defaultValue: 'pending' },
  reason: D.TEXT,
  ByUserId: D.INTEGER,
}, { indexes: [{ fields: ['groupId'] }, { fields: ['TimetableSlotId', 'date'] }] });

SubstituteRequest.belongsTo(TimetableSlot, { foreignKey: 'TimetableSlotId', onDelete: 'CASCADE' });
TimetableSlot.hasMany(SubstituteRequest, { foreignKey: 'TimetableSlotId', onDelete: 'CASCADE' });
SubstituteRequest.belongsTo(Teacher, { as: 'from', foreignKey: 'FromTeacherId' });
SubstituteRequest.belongsTo(Teacher, { as: 'to', foreignKey: 'ToTeacherId' });

module.exports = SubstituteRequest;
