const express = require('express');
const cors = require('cors');
const { matchBatch } = require('./matcher');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/match-batch', async (req, res) => {
  try {
    const { transactions, members } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'transactions array is required' });
    }

    if (!members || !Array.isArray(members)) {
      return res.status(400).json({ error: 'members array is required' });
    }

    const matches = await matchBatch(transactions, members);

    res.json(matches);
  } catch (error) {
    console.error('Matching error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'matching-service' });
});

app.listen(PORT, () => {
  console.log(`Matching service running on port ${PORT}`);
});

