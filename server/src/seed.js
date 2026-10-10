require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Section, Room, Subject } = require('./models');
(async () => {
  await sequelize.sync({ alter: true });
  const [admin, made] = await User.findOrCreate({ where: { email: process.env.ADMIN_EMAIL }, defaults: { name: 'HOD', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10), role: 'admin' } });
  await Section.findOrCreate({ where: { name: 'A', semester: 5 } });
  await Room.findOrCreate({ where: { name: 'Room 101' }, defaults: { type: 'classroom', capacity: 60 } });
  await Room.findOrCreate({ where: { name: 'Lab 2' }, defaults: { type: 'lab', capacity: 30 } });
  await Subject.findOrCreate({ where: { code: 'CS501' }, defaults: { name: 'DBMS', weeklyCount: 4, semester: 5 } });
  console.log(made ? 'Admin created:' : 'Admin already exists:', admin.email);
  process.exit(0);
})();