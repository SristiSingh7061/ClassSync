// Production seed: creates the tables and the HOD (admin) account. Nothing else.
//   node src/seed-prod.js          -> admin only (HOD adds sections, rooms, subjects from the app)
//   node src/seed-prod.js --demo   -> also adds Section A, 2 rooms and DBMS
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Section, Room, Subject } = require('./models');
require('./models/slotChange');
require('./models/substituteRequest');

(async () => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 characters) first.');
    process.exit(1);
  }
  await sequelize.authenticate();
  await sequelize.sync();               // never "alter": safe on a live database
  const [admin, made] = await User.findOrCreate({
    where: { email: process.env.ADMIN_EMAIL },
    defaults: { name: 'HOD', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10), role: 'admin' },
  });
  console.log(made ? 'Admin created:' : 'Admin already exists:', admin.email);
  if (process.argv.includes('--demo')) {
    await Section.findOrCreate({ where: { name: 'A', semester: 5 } });
    await Room.findOrCreate({ where: { name: 'Room 101' }, defaults: { type: 'classroom', capacity: 60 } });
    await Room.findOrCreate({ where: { name: 'Lab 2' }, defaults: { type: 'lab', capacity: 30 } });
    await Subject.findOrCreate({ where: { code: 'CS501' }, defaults: { name: 'DBMS', weeklyCount: 4, semester: 5 } });
    console.log('Demo data added.');
  }
  process.exit(0);
})().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
