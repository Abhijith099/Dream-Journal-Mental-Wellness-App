const express = require('express');
const router = express.Router();
const EMAEntry = require('../models/EMAEntry');
const mockAuth = require('../middleware/auth');

// 1. POST /api/ema/checkin - Record an EMA micro check-in
router.post('/checkin', mockAuth, async (req, res) => {
    try {
        const { mood, energyLevel, question, triggeredBy } = req.body;

        const validMoods = ['calm', 'okay', 'tense', 'low', 'heavy'];
        if (!mood || !validMoods.includes(mood.toLowerCase())) {
            return res.status(400).json({ error: `Invalid mood. Allowed: ${validMoods.join(', ')}` });
        }

        const energy = Number(energyLevel);
        if (isNaN(energy) || energy < 1 || energy > 5) {
            return res.status(400).json({ error: 'energyLevel must be an integer between 1 and 5' });
        }

        const newEntry = new EMAEntry({
            userId: req.userId,
            mood: mood.toLowerCase(),
            energyLevel: energy,
            question: question || 'How are you right now?',
            triggeredBy: triggeredBy || 'app_open',
            createdAt: new Date()
        });

        const savedEntry = await newEntry.save();
        res.status(201).json(savedEntry);
    } catch (err) {
        console.error('EMA checkin error:', err);
        res.status(500).json({ error: 'Failed to record check-in' });
    }
});

// 2. GET /api/ema/recent - Get recent check-ins for the authenticated user
router.get('/recent', mockAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        const entries = await EMAEntry.find({
            userId: req.userId,
            createdAt: { $gte: sinceDate }
        }).sort({ createdAt: -1 });

        res.json(entries);
    } catch (err) {
        console.error('Error fetching recent EMA entries:', err);
        res.status(500).json({ error: 'Failed to fetch check-ins' });
    }
});

// 3. GET /api/ema/latest - Get the most recent single EMA check-in
router.get('/latest', mockAuth, async (req, res) => {
    try {
        const latest = await EMAEntry.findOne({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(latest || null);
    } catch (err) {
        console.error('Error fetching latest EMA entry:', err);
        res.status(500).json({ error: 'Failed to fetch latest check-in' });
    }
});

module.exports = router;
