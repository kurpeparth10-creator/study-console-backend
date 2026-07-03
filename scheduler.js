// scheduler.js
// Runs once a minute (server-side, so it works even if every user's tab is
// closed). For every enabled reminder that's due right now, it sends a push
// notification through Firebase Cloud Messaging to that device's registered
// token, then updates the reminder's fired/next-occurrence state.

const cron = require('node-cron');
const db = require('./db');
const { sendPush } = require('./fcm');
const { shouldFireNow, applyFired } = require('./reminderLogic');

async function tick() {
  const now = new Date();
  const all = db.getAllReminders();
  const due = all.filter(r => shouldFireNow(r, now));

  if (due.length === 0) return;

  console.log(`[scheduler] ${due.length} reminder(s) due at ${now.toISOString()}`);

  for (const reminder of due) {
    const tokenEntry = db.getTokenForDevice(reminder.deviceId);

    if (tokenEntry) {
      const ok = await sendPush(tokenEntry.token, {
        title: reminder.label || 'Study Console reminder',
        body: 'Tap to open your task.',
        data: { reminderId: reminder.id, url: '/' },
      });
      if (!ok) {
        console.warn(`[scheduler] push failed for device ${reminder.deviceId} (reminder ${reminder.id})`);
      }
    } else {
      console.warn(`[scheduler] no push token registered for device ${reminder.deviceId}; skipping push (in-tab alarm will still fire if the tab is open)`);
    }

    applyFired(reminder, now);
    db.saveReminder(reminder);
  }
}

function startScheduler() {
  // Runs at the top of every minute.
  cron.schedule('* * * * *', () => {
    tick().catch(err => console.error('[scheduler] tick error:', err));
  });
  console.log('[scheduler] started — checking reminders every minute');
}

module.exports = { startScheduler, tick };
