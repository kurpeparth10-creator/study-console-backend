# Study Console — Reminder Backend

Node.js/Express backend that stores reminders, registers each browser's push
token, and checks every minute for due reminders — sending a push
notification through Firebase Cloud Messaging even if the user's tab (or
whole browser) is closed.

## What this does vs. what the frontend does

| | Tab open | Tab / browser closed |
|---|---|---|
| Alarm sound | ✅ frontend (Web Audio) | ❌ not possible on the web |
| Full-screen modal | ✅ frontend | ❌ not possible |
| Browser notification | ✅ frontend (`Notification` API) | ✅ **this backend** (FCM push) |

The frontend's 30-second in-tab checker and this backend's 1-minute
server-side checker are independent — the frontend is instant and rich
(sound + modal), the backend is the fallback that still reaches the user
when the tab isn't open.

## 1. Install

```bash
cd study-console-backend
npm install
```

## 2. Set up Firebase (one-time, ~5 minutes)

1. Go to https://console.firebase.google.com → **Add project** (free tier
   is enough).
2. In your new project: **Project settings (gear icon) → Service accounts
   → Generate new private key**. This downloads a JSON file — keep it
   private, never commit it to git.
3. Still in Project settings: **Cloud Messaging** tab → under "Web
   configuration", generate a **Web Push certificate (VAPID key pair)**.
   Copy the key — you'll paste it into the frontend config.
4. Also grab your **Firebase web app config** (Project settings → General →
   "Your apps" → add a Web app if you haven't) — you'll need this object
   in the frontend too.

## 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and either:
- paste your service-account JSON (as one line) into `FIREBASE_SERVICE_ACCOUNT`, or
- save the downloaded key file locally and set `FIREBASE_SERVICE_ACCOUNT_PATH`

## 4. Run locally

```bash
npm start
```

Visit `http://localhost:4000/health` — you should see `{"ok":true,...}`.

## 5. Deploy somewhere that keeps a Node process running

GitHub Pages **cannot** run this — it only serves static files. Pick one:

- **Render** (render.com) — free tier, connects directly to a GitHub repo,
  auto-deploys on push. Set the env vars from `.env` in their dashboard.
- **Railway** (railway.app) — similar, generous free tier.
- **Fly.io** — good if you want more control.
- Any VPS (DigitalOcean, etc.) running `pm2 start server.js`.

Whichever you pick, set `FIREBASE_SERVICE_ACCOUNT` as an environment
variable in that platform's dashboard — don't upload the JSON key file
itself to a public repo.

## 6. Point the frontend at your deployed backend

In `index.html`, find:

```js
const BACKEND_URL = ''; // e.g. 'https://study-console-api.onrender.com'
```

Set it to your deployed backend's URL. Until this is set, the site still
works fully for in-tab reminders — it just won't sync reminders to the
server or receive push notifications when closed.

## API reference

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/reminders` | Create a reminder |
| GET | `/api/reminders?deviceId=` | List all reminders for a device |
| GET | `/api/reminders/upcoming?deviceId=&withinMinutes=` | Reminders due soon |
| PUT | `/api/reminders/:id` | Update a reminder |
| DELETE | `/api/reminders/:id` | Delete a reminder |
| POST | `/api/reminders/:id/complete` | Mark as completed |
| POST | `/api/reminders/:id/snooze` | Body: `{ "minutes": 5\|10\|15 }` |
| POST | `/api/tokens` | Body: `{ deviceId, token }` — register a device's FCM token |

## Storage

Reminders and tokens are stored in flat JSON files under `data/` for
simplicity — no database server to set up. This is fine for a personal
project or small number of users. If you outgrow it, everything routes
through `db.js`, so swapping in Postgres/MongoDB only means rewriting that
one file.
