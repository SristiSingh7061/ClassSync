// Generic admin CRUD for Subject, Room, Section
const { AuditLog } = require('../models');

module.exports = (Model, name, fields) => {
  const pick = (body) => Object.fromEntries(fields.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
  const log = (req, action, details) => AuditLog.create({ UserId: req.user.id, action: `${name}.${action}`, details });

  return {
    list: async (req, res) => res.json(await Model.findAll({ order: [['id', 'ASC']] })),
    get: async (req, res) => {
      const row = await Model.findByPk(req.params.id);
      return row ? res.json(row) : res.status(404).json({ message: `${name} not found` });
    },
    create: async (req, res) => {
      const row = await Model.create(pick(req.body));
      await log(req, 'create', { id: row.id });
      res.status(201).json(row);
    },
    update: async (req, res) => {
      const row = await Model.findByPk(req.params.id);
      if (!row) return res.status(404).json({ message: `${name} not found` });
      await row.update(pick(req.body));
      await log(req, 'update', { id: row.id });
      res.json(row);
    },
    remove: async (req, res) => {
      const row = await Model.findByPk(req.params.id);
      if (!row) return res.status(404).json({ message: `${name} not found` });
      await row.destroy();
      await log(req, 'delete', { id: req.params.id });
      res.json({ message: 'Deleted' });
    },
  };
};