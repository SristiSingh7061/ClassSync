const bcrypt = require('bcryptjs');
const { User, Teacher, AuditLog } = require('../models');

exports.list = async (req, res) => {
  const rows = await Teacher.findAll({ include: { model: User, attributes: ['id', 'name', 'email'] }, order: [['id', 'ASC']] });
  res.json(rows);
};

exports.update = async (req, res) => {
  const t = await Teacher.findByPk(req.params.id, { include: User });
  if (!t) return res.status(404).json({ message: 'Teacher not found' });
  const { name, email, password, department } = req.body;
  if (department) await t.update({ department });
  const u = {};
  if (name) u.name = name;
  if (email) u.email = email;
  if (password) {
    if (password.length < 8) return res.status(400).json({ message: 'Password min 8 chars' });
    u.passwordHash = await bcrypt.hash(password, 10);
  }
  await t.User.update(u);
  await AuditLog.create({ UserId: req.user.id, action: 'teacher.update', details: { teacherId: t.id } });
  res.json({ id: t.id, department: t.department, user: { id: t.User.id, name: t.User.name, email: t.User.email } });
};

exports.remove = async (req, res) => {
  const t = await Teacher.findByPk(req.params.id);
  if (!t) return res.status(404).json({ message: 'Teacher not found' });
  await User.destroy({ where: { id: t.UserId } }); // Teacher cascades
  await AuditLog.create({ UserId: req.user.id, action: 'teacher.delete', details: { teacherId: t.id } });
  res.json({ message: 'Deleted' });
};