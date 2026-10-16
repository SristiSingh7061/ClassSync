const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { Subject, Room, Section } = require('../models');
const a = require('../controllers/auth');
const t = require('../controllers/teachers');
const crud = require('../controllers/crud');
const tt = require('../controllers/timetable');
const ch = require('../controllers/changes');
const sb = require('../controllers/substitutes');
const adm = require('../controllers/admin');
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.post('/auth/register', wrap(a.register));
router.post('/auth/login', wrap(a.login));
router.get('/auth/me', authenticate, a.me);
router.get('/public/sections', wrap(tt.publicSections));

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

// Week 3-4: assignments, availability, generator
router.post('/assignments', ...admin, wrap(tt.createAssignment));
router.get('/assignments', ...admin, wrap(tt.listAssignments));
router.delete('/assignments/:id', ...admin, wrap(tt.removeAssignment));
router.post('/teachers/:id/unavailability', ...admin, wrap(tt.addUnavailability));
router.post('/timetable/generate', ...admin, wrap(tt.generate));
router.get('/timetable/section/:id', authenticate, wrap(tt.sectionTimetable));

// Week 5: teacher's own schedule
router.get('/timetable/teacher/me', authenticate, authorize('teacher'), wrap(tt.teacherTimetable));

// Week 6: cancel / reschedule / undo (teacher for own classes, admin for any)
const staff = [authenticate, authorize('teacher', 'admin')];
router.post('/slots/:id/cancel', ...staff, wrap(ch.cancel));
router.post('/slots/:id/reschedule', ...staff, wrap(ch.reschedule));
router.delete('/changes/:id', ...staff, wrap(ch.undo));

// Week 7: substitute teacher flow, analytics, audit log
const teacherOnly = [authenticate, authorize('teacher')];
router.get('/slots/:id/free-teachers', ...staff, wrap(sb.freeList));
router.post('/slots/:id/substitute', ...staff, wrap(sb.request));
router.get('/substitutes/mine', ...teacherOnly, wrap(sb.mine));
router.post('/substitutes/:groupId/respond', ...teacherOnly, wrap(sb.respond));
router.delete('/substitutes/:groupId', ...staff, wrap(sb.cancelRequest));
router.get('/analytics', ...admin, wrap(adm.analytics));
router.get('/audit', ...admin, wrap(adm.audit));

module.exports = router;
