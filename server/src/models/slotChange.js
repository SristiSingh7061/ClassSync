// One row = "this weekly slot is changed on this particular date" (cancel or reschedule).
// Separate table, so the weekly timetable itself is never modified.
const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db');
const { TimetableSlot, Room, User } = require('./index');

const SlotChange = sequelize.define('SlotChange', {
  TimetableSlotId: { type: D.INTEGER, allowNull: false },
  date: { type: D.DATEONLY, allowNull: false },            // the date of the ORIGINAL class
  type: { type: D.ENUM('cancel', 'reschedule'), allowNull: false },
  reason: D.TEXT,
  toDate: D.DATEONLY,                                        // reschedule only
  toPeriod: D.INTEGER,
  ToRoomId: D.INTEGER,
  ByUserId: D.INTEGER,
}, { indexes: [{ unique: true, fields: ['TimetableSlotId', 'date'], name: 'uniq_slot_date' }] });

SlotChange.belongsTo(TimetableSlot, { foreignKey: 'TimetableSlotId', onDelete: 'CASCADE' });
TimetableSlot.hasMany(SlotChange, { foreignKey: 'TimetableSlotId', onDelete: 'CASCADE' });
SlotChange.belongsTo(Room, { as: 'toRoom', foreignKey: 'ToRoomId' });
SlotChange.belongsTo(User, { as: 'by', foreignKey: 'ByUserId' });

module.exports = SlotChange;
