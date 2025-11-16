const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { matchBatch } = require('./matcher');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'matching-service' });
});

// Batch matching endpoint
app.post('/match-batch', (req, res) => {
  try {
    const { transactions, members } = req.body;

    if (!Array.isArray(transactions) || !Array.isArray(members)) {
      return res.status(400).json({
        error: 'transactions and members must be arrays'
      });
    }

    const results = matchBatch(transactions, members);

    res.json(results);
  } catch (error) {
    console.error('Error in match-batch:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Matching service running on port ${PORT}`);
});

