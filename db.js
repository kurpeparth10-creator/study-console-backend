// db.js
// A tiny file-backed JSON datastore. Good enough for a single-instance
// deployment (Render/Railway free tier, a small VPS, etc). If you outgrow
// this, swap the read()/write() functions below for a real database
// (Postgres, MongoDB, etc) — every route file only calls the exported
// functions here, so that's the only file you'd need to change.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const REMINDERS_FILE = path.join(DATA_DIR, 'reminders.json');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');

function ensureFile(file, fallback) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
}

function readJSON(file, fallback) {
  ensureFile(file, fallback);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- Reminders ----------
function getAllReminders() {
  return readJSON(REMINDERS_FILE, []);
}

function getRemindersForDevice(deviceId) {
  return getAllReminders().filter(r => r.deviceId === deviceId);
}

function getReminderById(id) {
  return getAllReminders().find(r => r.id === id) || null;
}

function saveReminder(reminder) {
  const all = getAllReminders();
  const idx = all.findIndex(r => r.id === reminder.id);
  if (idx >= 0) all[idx] = reminder;
  else all.push(reminder);
  writeJSON(REMINDERS_FILE, all);
  return reminder;
}

function deleteReminder(id) {
  const all = getAllReminders().filter(r => r.id !== id);
  writeJSON(REMINDERS_FILE, all);
}

function replaceAllReminders(list) {
  writeJSON(REMINDERS_FILE, list);
}

// ---------- Push tokens ----------
function getAllTokens() {
  return readJSON(TOKENS_FILE, []);
}

function upsertToken(deviceId, token) {
  const all = getAllTokens();
  const idx = all.findIndex(t => t.deviceId === deviceId);
  const entry = { deviceId, token, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  writeJSON(TOKENS_FILE, all);
  return entry;
}

function getTokenForDevice(deviceId) {
  return getAllTokens().find(t => t.deviceId === deviceId) || null;
}

module.exports = {
  getAllReminders,
  getRemindersForDevice,
  getReminderById,
  saveReminder,
  deleteReminder,
  replaceAllReminders,
  getAllTokens,
  upsertToken,
  getTokenForDevice,
};
