const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { Subject, Room, Section } = require('../models');
const a = require('../controllers/auth');
const t = require('../controllers/teachers');
const crud = require('../controllers/crud');
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.post('/auth/register', wrap(a.register));
router.post('/auth/login', wrap(a.login));
router.get('/auth/me', authenticate, a.me);

const admin = [authenticate, authorize('admin')];

// Teachers
router.post('/teachers', ...admin, wrap(a.createTeacher));
router.get('/teachers', ...admin, wrap(t.list));
router.put('/teachers/:id', ...admin, wrap(t.update));
router.delete('/teachers/:id', ...admin, wrap(t.remove));

// Subjects / Rooms / Sections (reads open to any logged-in user, writes admin only)
const mount = (path, Model, name, fields) => {
  const c = crud(Model, name, fields);
  router.get(path, authenticate, wrap(c.list));
  router.get(`${path}/:id`, authenticate, wrap(c.get));
  router.post(path, ...admin, wrap(c.create));
  router.put(`${path}/:id`, ...admin, wrap(c.update));
  router.delete(`${path}/:id`, ...admin, wrap(c.remove));
};
mount('/subjects', Subject, 'subject', ['name', 'code', 'type', 'weeklyCount', 'semester']);
mount('/rooms', Room, 'room', ['name', 'type', 'capacity']);
mount('/sections', Section, 'section', ['name', 'semester']);

module.exports = router;