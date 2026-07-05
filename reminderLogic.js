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

const GRACE_MS = 15 * 60 * 1000; // catch-up window: fire anytime from the due time up to 15 min after

/**
 * Decide if `reminder` should fire at `now` (a Date).
 * A reminder fires at most once per calendar day, tracked via
 * reminder.lastFiredKey (a "YYYY-MM-DD" string).
 *
 * Instead of requiring an exact-minute match (which silently skips a
 * reminder forever if the server happened to be asleep at that exact
 * minute — Render's free tier spins down after 15 min idle), this checks
 * a grace window: the reminder fires on the first tick where "now" is at
 * or after its due time, as long as that's within GRACE_MS of the due
 * time. If the server was asleep and wakes up 5 minutes late, it still
 * catches the reminder; if it's more than 15 minutes late, it gives up
 * for today rather than firing a very stale reminder unexpectedly.
 */
function shouldFireNow(reminder, now = new Date()) {
  if (!reminder.enabled || reminder.completed) return false;
  if (!reminder.time) return false;

  const todayKey = dateKey(now);
  if (reminder.lastFiredKey === todayKey) return false; // already fired today

  let refDateKey;
  switch (reminder.repeat) {
    case 'daily':
      refDateKey = todayKey;
      break;
    case 'weekly': {
      if (!reminder.date) return false;
      const start = new Date(reminder.date + 'T00:00:00');
      if (start.getDay() !== now.getDay()) return false;
      refDateKey = todayKey;
      break;
    }
    case 'custom': {
      const days = Array.isArray(reminder.customDays) ? reminder.customDays : [];
      if (!days.includes(now.getDay())) return false;
      refDateKey = todayKey;
      break;
    }
    case 'none':
    default:
      if (reminder.date !== todayKey) return false;
      refDateKey = todayKey;
  }

  const target = new Date(`${refDateKey}T${reminder.time}:00`);
  const diffMs = now.getTime() - target.getTime();
  return diffMs >= 0 && diffMs <= GRACE_MS;
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
