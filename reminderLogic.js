// reminderLogic.js
// Pure functions for reminder scheduling — kept separate from the
// scheduler/routes so the "when should this fire" rule lives in one place.

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function dateKey(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function timeKey(d) {
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/**
 * Decide if `reminder` should fire at `now` (a Date).
 * A reminder fires at most once per calendar day, tracked via
 * reminder.lastFiredKey (a "YYYY-MM-DD" string).
 */
function shouldFireNow(reminder, now = new Date()) {
  if (!reminder.enabled || reminder.completed) return false;
  if (!reminder.time) return false;

  const todayKey = dateKey(now);
  if (reminder.lastFiredKey === todayKey) return false; // already fired today
  if (timeKey(now) !== reminder.time) return false;      // not this minute

  switch (reminder.repeat) {
    case 'daily':
      return true;
    case 'weekly': {
      if (!reminder.date) return false;
      const start = new Date(reminder.date + 'T00:00:00');
      return start.getDay() === now.getDay();
    }
    case 'custom': {
      const days = Array.isArray(reminder.customDays) ? reminder.customDays : [];
      return days.includes(now.getDay());
    }
    case 'none':
    default:
      return reminder.date === todayKey;
  }
}

/**
 * After a reminder fires, decide what state it should move to.
 * - 'none' repeat: one-shot, disable it so it doesn't fire again.
 * - daily/weekly/custom: stays enabled, just stamp lastFiredKey so it
 *   won't double-fire today; it'll naturally fire again on its next
 *   matching day.
 */
function applyFired(reminder, now = new Date()) {
  reminder.lastFiredKey = dateKey(now);
  if (reminder.repeat === 'none') {
    reminder.enabled = false;
  }
  return reminder;
}

/** Push a reminder's fire time forward by N minutes (used by snooze). */
function applySnooze(reminder, minutes, now = new Date()) {
  const snoozed = new Date(now.getTime() + minutes * 60000);
  reminder.date = dateKey(snoozed);
  reminder.time = timeKey(snoozed);
  reminder.repeat = 'none';
  reminder.enabled = true;
  reminder.lastFiredKey = null; // allow it to fire again at the new time
  return reminder;
}

module.exports = { shouldFireNow, applyFired, applySnooze, dateKey, timeKey };
