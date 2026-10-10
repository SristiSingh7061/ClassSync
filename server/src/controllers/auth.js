const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Teacher, AuditLog } = require('../models');

const sign = (u) => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const safe = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, SectionId: u.SectionId });

// Public signup: students only
exports.register = async (req, res) => {
  const { name, email, password, sectionId } = req.body;
  if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: 'name, email and password (min 8 chars) are required' });
  if (await User.findOne({ where: { email } })) return res.status(409).json({ message: 'Email already registered' });
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'student', SectionId: sectionId || null });
  res.status(201).json({ token: sign(user), user: safe(user) });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = email && (await User.findOne({ where: { email } }));
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' });
  res.json({ token: sign(user), user: safe(user) });
};

exports.me = (req, res) => res.json({ user: safe(req.user) });

// Admin creates teacher accounts (HOD gives each teacher an ID + password)
exports.createTeacher = async (req, res) => {
  const { name, email, password, department } = req.body;
  if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: 'name, email and password (min 8 chars) are required' });
  if (await User.findOne({ where: { email } })) return res.status(409).json({ message: 'Email already registered' });
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'teacher' });
  const teacher = await Teacher.create({ UserId: user.id, department });
  await AuditLog.create({ UserId: req.user.id, action: 'teacher.create', details: { teacherId: teacher.id, email } });
  res.status(201).json({ user: safe(user), teacherId: teacher.id });
};