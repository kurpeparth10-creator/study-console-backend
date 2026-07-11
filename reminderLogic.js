// reminderLogic.js
// Pure functions for reminder scheduling — kept separate from the
// scheduler/routes so the "when should this fire" rule lives in one place.
//
// IMPORTANT — timezone handling:
// This server runs in UTC (standard for cloud hosts like Render), but a
// reminder's date/time fields ("2026-07-07", "12:20") are the user's own
// LOCAL wall-clock values, captured from their browser. Every reminder
// therefore carries a `tzOffsetMinutes` field — the value of the user's
// own `new Date().getTimezoneOffset()` at the moment they saved it — so
// this file can correctly convert between "user's local calendar day/time"
// and the absolute UTC instant needed to compare against the real clock.
// Without this conversion, a reminder set for "12:20" would only be
// evaluated as due at 12:20 UTC, which for an IST user (UTC+5:30) is
// 5:50 PM local time — a ~5.5 hour bug that looks like "nothing ever
// fires" from the user's perspective.

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function dateKey(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function timeKey(d) {
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/**
 * Given an absolute instant and a user's timezone offset (minutes, same
 * sign/meaning as JS's own `Date.prototype.getTimezoneOffset()`), return
 * that user's local calendar date-key, day-of-week, and the instant
 * shifted so its UTC getters read as the user's local wall clock.
 */
function toUserLocal(absoluteDate, tzOffsetMinutes) {
  const offset = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0;
  const shifted = new Date(absoluteDate.getTime() - offset * 60000);
  return {
    dateKey: shifted.getUTCFullYear() + '-' + pad(shifted.getUTCMonth() + 1) + '-' + pad(shifted.getUTCDate()),
    day: shifted.getUTCDay(),
  };
}

/**
 * Convert a user's local "YYYY-MM-DD" + "HH:MM" wall-clock time into the
 * absolute UTC instant it represents, given their timezone offset.
 */
function userLocalToAbsolute(dateStr, timeStr, tzOffsetMinutes) {
  const offset = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0;
  const parsedAsUTC = new Date(`${dateStr}T${timeStr}:00Z`);
  return new Date(parsedAsUTC.getTime() + offset * 60000);
}

const GRACE_MS = 15 * 60 * 1000; // catch-up window: fire anytime from the due time up to 15 min after

/**
 * Decide if `reminder` should fire at `now` (a Date, defaults to the real
 * current instant). A reminder fires at most once per calendar day
 * (in the USER's local calendar), tracked via reminder.lastFiredKey (a
 * "YYYY-MM-DD" string in the user's local dates).
 *
 * Instead of requiring an exact-minute match (which silently skips a
 * reminder forever if the server happened to be asleep at that exact
 * minute — Render's free tier spins down after 15 min idle), this checks
 * a grace window: the reminder fires on the first tick where "now" is at
 * or after its due time, as long as that's within GRACE_MS of the due
 * time.
 */
function shouldFireNow(reminder, now = new Date()) {
  if (!reminder.enabled || reminder.completed) return false;
  if (!reminder.time) return false;

  const tz = reminder.tzOffsetMinutes;
  const userNow = toUserLocal(now, tz);
  const todayKey = userNow.dateKey;

  if (reminder.lastFiredKey === todayKey) return false; // already fired today (user's calendar day)

  let refDateKey;
  switch (reminder.repeat) {
    case 'daily':
      refDateKey = todayKey;
      break;
    case 'weekly': {
      if (!reminder.date) return false;
      const start = new Date(reminder.date + 'T00:00:00Z'); // anchor date only used for its weekday
      if (start.getUTCDay() !== userNow.day) return false;
      refDateKey = todayKey;
      break;
    }
    case 'custom': {
      const days = Array.isArray(reminder.customDays) ? reminder.customDays : [];
      if (!days.includes(userNow.day)) return false;
      refDateKey = todayKey;
      break;
    }
    case 'none':
    default:
      if (reminder.date !== todayKey) return false;
      refDateKey = todayKey;
  }

  const target = userLocalToAbsolute(refDateKey, reminder.time, tz);
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
  const userNow = toUserLocal(now, reminder.tzOffsetMinutes);
  reminder.lastFiredKey = userNow.dateKey;
  if (reminder.repeat === 'none') {
    reminder.enabled = false;
  }
  return reminder;
}

/** Push a reminder's fire time forward by N minutes (used by snooze). */
function applySnooze(reminder, minutes, now = new Date()) {
  const snoozedAbsolute = new Date(now.getTime() + minutes * 60000);
  const userSnoozed = toUserLocal(snoozedAbsolute, reminder.tzOffsetMinutes);
  const shifted = new Date(snoozedAbsolute.getTime() - (reminder.tzOffsetMinutes || 0) * 60000);
  reminder.date = userSnoozed.dateKey;
  reminder.time = pad(shifted.getUTCHours()) + ':' + pad(shifted.getUTCMinutes());
  reminder.repeat = 'none';
  reminder.enabled = true;
  reminder.lastFiredKey = null; // allow it to fire again at the new time
  return reminder;
}

module.exports = { shouldFireNow, applyFired, applySnooze, dateKey, timeKey, toUserLocal, userLocalToAbsolute };
