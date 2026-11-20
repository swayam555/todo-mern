import { Router } from 'express';
import mongoose from 'mongoose';
import { Task, PRIORITIES, STATUSES } from '../models/Task.js';
import { HttpError, asyncRoute, parseTimeZone } from '../lib/http.js';

const router = Router();
const EDITABLE = ['title', 'description', 'dueAt', 'priority', 'status'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Mongo expression: Monday-start week of dueAt, rendered as YYYY-MM-DD in the user's zone. */
const weekKey = (timezone) => ({
  $dateToString: {
    format: '%Y-%m-%d',
    timezone,
    date: { $dateTrunc: { date: '$dueAt', unit: 'week', startOfWeek: 'monday', timezone } },
  },
});

function pickBody(body, { partial }) {
  if (!body || typeof body !== 'object') throw new HttpError(400, 'JSON body required');
  const out = {};
  for (const key of EDITABLE) if (key in body) out[key] = body[key];
  if (!partial) {
    if (!out.title || !String(out.title).trim()) throw new HttpError(400, 'Title is required', { title: 'Title is required' });
    if (!out.dueAt) throw new HttpError(400, 'Date & time is required', { dueAt: 'Date & time is required' });
  }
  if ('title' in out && (typeof out.title !== 'string' || !out.title.trim()))
    throw new HttpError(400, 'Title is required', { title: 'Title is required' });
  if ('dueAt' in out) {
    const d = new Date(out.dueAt);
    if (out.dueAt === null || Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid date & time', { dueAt: 'Invalid date & time' });
    out.dueAt = d;
  }
  if ('priority' in out) {
    if (out.priority === '' ) out.priority = null;
    if (out.priority !== null && !PRIORITIES.includes(out.priority))
      throw new HttpError(400, 'Priority must be low, medium or high', { priority: 'Invalid priority' });
  }
  if ('description' in out && out.description != null && typeof out.description !== 'string')
    throw new HttpError(400, 'Description must be text');
  if ('status' in out) {
    if (!STATUSES.includes(out.status)) throw new HttpError(400, 'Status must be in_progress or completed');
    out.completedAt = out.status === 'completed' ? new Date() : null;
  }
  return out;
}

async function findOwned(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Task not found');
  const task = await Task.findOne({ _id: req.params.id, owner: req.owner });
  if (!task) throw new HttpError(404, 'Task not found');
  return task;
}

// Weekly summary cards: open vs completed per Monday–Sunday week.
router.get('/weeks', asyncRoute(async (req, res) => {
  const timezone = parseTimeZone(req.query.tz);
  const rows = await Task.aggregate([
    { $match: { owner: req.owner } },
    { $group: {
      _id: weekKey(timezone),
      total: { $sum: 1 },
      completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
    } },
    { $sort: { _id: 1 } },
  ]);
  res.json(rows.map((r) => ({ weekStart: r._id, total: r.total, completed: r.completed, open: r.total - r.completed })));
}));

// List / search. ?q= keyword search on title+description, ?week=YYYY-MM-DD&tz= for one week.
router.get('/', asyncRoute(async (req, res) => {
  const filter = { owner: req.owner };
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    const terms = q.split(/\s+/).slice(0, 8).map((t) => new RegExp(escapeRegex(t), 'i'));
    filter.$and = terms.map((rx) => ({ $or: [{ title: rx }, { description: rx }] }));
  }
  if (req.query.week !== undefined) {
    if (!ISO_DAY.test(req.query.week)) throw new HttpError(400, 'week must be YYYY-MM-DD');
    const timezone = parseTimeZone(req.query.tz);
    filter.$expr = { $eq: [weekKey(timezone), req.query.week] };
  }
  if (req.query.status !== undefined) {
    if (!STATUSES.includes(req.query.status)) throw new HttpError(400, 'Invalid status filter');
    filter.status = req.query.status;
  }
  if (req.query.priority !== undefined) {
    if (!PRIORITIES.includes(req.query.priority)) throw new HttpError(400, 'Invalid priority filter');
    filter.priority = req.query.priority;
  }
  // Overdue = still in progress and due before now.
  if (req.query.overdue === '1' || req.query.overdue === 'true') {
    if (filter.status === 'completed') return res.json([]);
    filter.status = 'in_progress';
    filter.dueAt = { $lt: new Date() };
  }
  const tasks = await Task.find(filter).sort({ dueAt: 1, createdAt: 1 }).limit(500);
  res.json(tasks);
}));

router.get('/:id', asyncRoute(async (req, res) => res.json(await findOwned(req))));

router.post('/', asyncRoute(async (req, res) => {
  const task = await Task.create({ ...pickBody(req.body, { partial: false }), owner: req.owner });
  res.status(201).json(task);
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const task = await findOwned(req);
  const changes = pickBody(req.body, { partial: true });
  if (changes.status === task.status) { delete changes.status; delete changes.completedAt; }
  task.set(changes);
  await task.save();
  res.json(task);
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const task = await findOwned(req);
  await task.deleteOne();
  res.status(204).end();
}));

export default router;
