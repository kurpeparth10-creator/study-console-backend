// fcm.js
// Initializes Firebase Admin so the server can send push notifications
// through Firebase Cloud Messaging.
//
// SETUP (you must do this once):
// 1. Go to console.firebase.google.com → create a project (free tier is fine).
// 2. Project settings → Service accounts → "Generate new private key".
//    This downloads a JSON file — DO NOT commit it to git.
// 3. Put that file's contents into an environment variable called
//    FIREBASE_SERVICE_ACCOUNT (as a single-line JSON string), or save the
//    file locally and point FIREBASE_SERVICE_ACCOUNT_PATH at it.
//    See .env.example for both options.

const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
  if (initialized) return admin;

  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Whole service-account JSON pasted into an env var (recommended for
    // hosts like Render/Railway where you set env vars in a dashboard).
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(serviceAccount);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Path to a local JSON key file (handy for local dev).
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    credential = admin.credential.cert(serviceAccount);
  } else {
    console.warn(
      '[fcm] No FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH set. ' +
      'Push notifications will be skipped until you configure Firebase credentials. ' +
      'See .env.example.'
    );
    return null;
  }

  admin.initializeApp({ credential });
  initialized = true;
  return admin;
}

/**
 * Send a push notification to a single FCM registration token.
 * Returns true on success, false on failure (never throws — a bad/expired
 * token shouldn't crash the scheduler).
 */
async function sendPush(token, { title, body, data = {} }) {
  const app = initFirebase();
  if (!app) return false;

  try {
    await app.messaging().send({
      token,
      notification: { title, body },
      data,
      webpush: {
        fcmOptions: { link: data.url || '/' },
        notification: {
          icon: 'https://em-content.zobj.net/source/apple/391/bell_1f514.png',
        },
      },
    });
    return true;
  } catch (err) {
    console.error('[fcm] send failed:', err.message);
    return false;
  }
}

module.exports = { initFirebase, sendPush };
