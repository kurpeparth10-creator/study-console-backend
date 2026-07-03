// routes/tokens.js
const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /api/tokens  { deviceId, token }
// Called by the frontend right after it obtains an FCM registration token.
router.post('/', (req, res) => {
  const { deviceId, token } = req.body;
  if (!deviceId || !token) {
    return res.status(400).json({ error: 'deviceId and token are both required' });
  }
  const entry = db.upsertToken(deviceId, token);
  res.status(201).json(entry);
});

module.exports = router;
