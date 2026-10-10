const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.authenticate = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Login required' });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(id, { attributes: { exclude: ['passwordHash'] } });
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch { res.status(401).json({ message: 'Invalid or expired token' }); }
};

// usage: authorize('admin') or authorize('admin', 'teacher')
exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Access denied for your role' });