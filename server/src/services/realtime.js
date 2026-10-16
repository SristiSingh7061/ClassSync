// Socket.io: students join their section's room, teachers/admins get their own rooms.
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

let io = null;

exports.initSocket = (httpServer) => {
  io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL || '*' } });

  io.use(async (socket, next) => {
    try {
      const { id } = jwt.verify(socket.handshake.auth?.token || '', process.env.JWT_SECRET);
      const user = await User.findByPk(id, { attributes: ['id', 'role', 'SectionId'] });
      if (!user) return next(new Error('unauthorized'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const u = socket.data.user;
    socket.join(`user:${u.id}`);
    if (u.role === 'admin') socket.join('admin');
    if (u.role === 'student' && u.SectionId) socket.join(`section:${u.SectionId}`);
  });
  return io;
};

// Send one event to: the section's students, the teacher, and all admins
exports.emitChange = (payload, { sectionId, teacherUserId }) => {
  if (!io) return;
  let target = io.to('admin');
  if (sectionId) target = target.to(`section:${sectionId}`);
  [].concat(teacherUserId || []).forEach((id) => { target = target.to(`user:${id}`); }); // one id or a list
  target.emit('class:update', payload);
};

// Private message to one user (substitute requests / replies)
exports.emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
};
