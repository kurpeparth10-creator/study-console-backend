// reminderLogic.js — reminder scheduling (all time math done in IST).

function pad(n) { return n < 10 ? '0' + n : '' + n; }

const IST_OFFSET_MIN = 330; // India = UTC+5:30, no daylight saving

function istParts(d) {
  const s = new Date(d.getTime() + IST_OFFSET_MIN * 60000);
  return {
    y: s.getUTCFullYear(), mo: s.getUTCMonth(), day: s.getUTCDate(),
    dow: s.getUTCDay(), h: s.getUTCHours(), mi: s.getUTCMinutes(),
  };
}

function istInstant(dateKeyStr, timeStr) {
  const [y, mo, day] = dateKeyStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  return Date.UTC(y, mo - 1, day, h, mi) - IST_OFFSET_MIN * 60000;
}

function dateKey(d) {
  const p = istParts(d);
  return p.y + '-' + pad(p.mo + 1) + '-' + pad(p.day);
}
function timeKey(d) {
  const p = istParts(d);
  return pad(p.h) + ':' + pad(p.mi);
}

const GRACE_MS = 15 * 60 * 1000; // fire from due time up to 15 min after

function shouldFireNow(reminder, now = new Date()) {
  if (!reminder.enabled || reminder.completed) return false;
  if (!reminder.time) return false;

  const todayKey = dateKey(now);
  const nowDow = istParts(now).dow;
  if (reminder.lastFiredKey === todayKey) return false;

  let refDateKey;
  switch (reminder.repeat) {
    case 'daily':
      refDateKey = todayKey;
      break;
    case 'weekly': {
      if (!reminder.date) return false;
      const startDow = new Date(reminder.date + 'T12:00:00Z').getUTCDay();
      if (startDow !== nowDow) return false;
      refDateKey = todayKey;
      break;
    }
    case 'custom': {
      const days = Array.isArray(reminder.customDays) ? reminder.customDays : [];
      if (!days.includes(nowDow)) return false;
      refDateKey = todayKey;
      break;
    }
    case 'none':
    default:
      if (reminder.date !== todayKey) return false;
      refDateKey = todayKey;
  }

  const targetMs = istInstant(refDateKey, reminder.time);
  const diffMs = now.getTime() - targetMs;
  return diffMs >= 0 && diffMs <= GRACE_MS;
}

function applyFired(reminder, now = new Date()) {
  reminder.lastFiredKey = dateKey(now);
  if (reminder.repeat === 'none') reminder.enabled = false;
  return reminder;
}

function applySnooze(reminder, minutes, now = new Date()) {
  const snoozed = new Date(now.getTime() + minutes * 60000);
  reminder.date = dateKey(snoozed);
  reminder.time = timeKey(snoozed);
  reminder.repeat = 'none';
  reminder.enabled = true;
  reminder.lastFiredKey = null;
  return reminder;
}

module.exports = { shouldFireNow, applyFired, applySnooze, dateKey, timeKey };
