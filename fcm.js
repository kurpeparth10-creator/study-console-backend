# Port the Express server listens on
PORT=4000

# ---- Firebase Admin credentials (pick ONE of the two options below) ----

# Option A — paste the entire service-account JSON as a single-line string
# (this is what you'll do on Render/Railway/most hosts, as an env var in
# their dashboard). Easiest way to get a single line: open the downloaded
# JSON file and remove the line breaks, or use `jq -c . serviceAccount.json`.
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...", ...}

# Option B — point at a local JSON file instead (handy for local dev only,
# never commit this file to git).
# FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
