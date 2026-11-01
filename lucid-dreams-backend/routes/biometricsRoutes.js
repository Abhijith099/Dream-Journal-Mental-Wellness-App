const express = require('express');
const router = express.Router();
const HeartRateLog = require('../models/HeartRateLog');
const authMiddleware = require('../middleware/auth');

// POST /api/biometrics/heart-rate (auth required)
// Body: { bpm, quality, context }
router.post('/heart-rate', authMiddleware, async (req, res) => {
  try {
    const { bpm, quality, context } = req.body;

    // Validation: bpm must be a number >= 0
    if (typeof bpm !== 'number' || isNaN(bpm) || bpm < 0) {
      return res.status(400).json({ error: 'bpm must be a number >= 0' });
    }

    // Validation: quality must be 'valid' or 'invalid'
    if (!['valid', 'invalid'].includes(quality)) {
      return res.status(400).json({ error: "quality must be either 'valid' or 'invalid'" });
    }

    // Validation: context must be 'pre-journal', 'post-journal', or 'standalone'
    const allowedContexts = ['pre-journal', 'post-journal', 'standalone'];
    const resolvedContext = context || 'standalone';
    if (!allowedContexts.includes(resolvedContext)) {
      return res.status(400).json({
        error: "context must be one of: 'pre-journal', 'post-journal', 'standalone'",
      });
    }

    const log = new HeartRateLog({
      userId: req.userId,
      bpm,
      quality,
      context: resolvedContext,
    });

    await log.save();
    return res.status(201).json(log);
  } catch (err) {
    console.error('Error creating heart rate log:', err);
    return res.status(500).json({ error: 'Internal server error saving heart rate measurement' });
  }
});

module.exports = router;
