// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const remindersRouter = require('./routes/reminders');
const tokensRouter = require('./routes/tokens');
const { startScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 4000;

// Restrict this to your actual frontend origin in production, e.g.
// cors({ origin: 'https://kurpeparth10-creator.github.io' })
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/reminders', remindersRouter);
app.use('/api/tokens', tokensRouter);

app.listen(PORT, () => {
  console.log(`[server] Study Console backend listening on port ${PORT}`);
  startScheduler();
});
