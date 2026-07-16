// routes/reminders.js
const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { applySnooze } = require('../reminderLogic');

const router = express.Router();

function validateBody(body) {
  const errors = [];
  if (!body.deviceId) errors.push('deviceId is required');
  if (!body.time) errors.push('time (HH:MM) is required');
  if (body.repeat && !['none', 'daily', 'weekly', 'custom'].includes(body.repeat)) {
    errors.push('repeat must be one of none, daily, weekly, custom');
  }
  return errors;
}

// POST /api/reminders — create a reminder
router.post('/', (req, res) => {
  const errors = validateBody(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const now = new Date();
  const reminder = {
    id: uuid(),
    deviceId: req.body.deviceId,
    taskId: req.body.taskId || null,
    label: req.body.label || 'Reminder',
    date: req.body.date || null,           // 'YYYY-MM-DD', required if repeat === 'none'
    time: req.body.time,                    // 'HH:MM' 24hr
    enabled: req.body.enabled !== false,
    repeat: req.body.repeat || 'none',      // none | daily | weekly | custom
    customDays: Array.isArray(req.body.customDays) ? req.body.customDays : [],
    sound: req.body.sound || 'classic',
    completed: false,
    lastFiredKey: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  db.saveReminder(reminder);
  res.status(201).json(reminder);
});

// GET /api/reminders?deviceId=...  — list all reminders for a device
router.get('/', (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) return res.status(400).json({ error: 'deviceId query param is required' });
  res.json(db.getRemindersForDevice(deviceId));
});

// GET /api/reminders/upcoming?deviceId=...&withinMinutes=60
router.get('/upcoming', (req, res) => {
  const { deviceId, withinMinutes = 60 } = req.query;
  if (!deviceId) return res.status(400).json({ error: 'deviceId query param is required' });

  const now = new Date();
  const horizon = new Date(now.getTime() + Number(withinMinutes) * 60000);

  const upcoming = db.getRemindersForDevice(deviceId).filter(r => {
    if (!r.enabled || r.completed || !r.date || !r.time) return false;
    const fireAt = new Date(`${r.date}T${r.time}:00`);
    return fireAt >= now && fireAt <= horizon;
  });

  res.json(upcoming);
});

// PUT /api/reminders/:id — update a reminder
router.put('/:id', (req, res) => {
  const existing = db.getReminderById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Reminder not found' });

  const updated = {
    ...existing,
    ...req.body,
    id: existing.id, // id is immutable
    updatedAt: new Date().toISOString(),
  };
  db.saveReminder(updated);
  res.json(updated);
});

// DELETE /api/reminders/:id
router.delete('/:id', (req, res) => {
  const existing = db.getReminderById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Reminder not found' });
  db.deleteReminder(req.params.id);
  res.status(204).end();
});

// POST /api/reminders/:id/complete
router.post('/:id/complete', (req, res) => {
  const existing = db.getReminderById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Reminder not found' });

  existing.completed = true;
  existing.enabled = false;
  existing.updatedAt = new Date().toISOString();
  db.saveReminder(existing);
  res.json(existing);
});

// POST /api/reminders/:id/snooze  { minutes: 5 | 10 | 15 }
router.post('/:id/snooze', (req, res) => {
  const existing = db.getReminderById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Reminder not found' });

  const minutes = Number(req.body.minutes);
  if (![5, 10, 15].includes(minutes)) {
    return res.status(400).json({ error: 'minutes must be 5, 10, or 15' });
  }

  const snoozed = applySnooze(existing, minutes);
  snoozed.updatedAt = new Date().toISOString();
  db.saveReminder(snoozed);
  res.json(snoozed);
});

module.exports = router;
