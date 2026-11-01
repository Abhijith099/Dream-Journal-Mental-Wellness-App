const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const DailyVitals = require('../models/DailyVitals');
const User = require('../models/User');
const Dream = require('../models/Dream');

// ----------------------------------------------------
// Mock Authentication Middleware (shared structure)
// ----------------------------------------------------
const mockAuth = require('../middleware/auth');

// Date formatter helper: 'YYYY-MM-DD'
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// GET /api/vitals/today
router.get('/today', mockAuth, async (req, res) => {
    try {
        const todayStr = formatDate(new Date());
        let vitals = await DailyVitals.findOne({ userId: req.userId, date: todayStr });
        
        if (!vitals) {
            return res.json({ sleepMinutes: 0, steps: 0 });
        }
        
        res.json(vitals);
    } catch (err) {
        console.error("Error fetching today's vitals:", err);
        res.status(500).json({ error: "Failed to fetch today's vitals" });
    }
});

// PATCH /api/vitals/today
router.patch('/today', mockAuth, async (req, res) => {
    try {
        const { field, delta } = req.body;
        if (!field || typeof delta !== 'number') {
            return res.status(400).json({ error: "Field and numeric delta are required" });
        }

        if (field !== 'sleepMinutes' && field !== 'steps') {
            return res.status(400).json({ error: "Invalid field. Must be sleepMinutes or steps" });
        }

        const todayStr = formatDate(new Date());
        
        let updated = await DailyVitals.findOneAndUpdate(
            { userId: req.userId, date: todayStr },
            { $inc: { [field]: delta } },
            { upsert: true, returnDocument: 'after' }
        );

        // Clamp to 0 server-side
        if (updated[field] < 0) {
            updated[field] = 0;
            await updated.save();
        }

        res.json(updated);
    } catch (err) {
        console.error("Error updating today's vitals:", err);
        res.status(500).json({ error: "Failed to update today's vitals" });
    }
});

// PATCH /api/vitals/typing
router.patch('/typing', mockAuth, async (req, res) => {
    try {
        const { averageWPM, pauseCount, backspaceRatio, sessionDurationSeconds, dreamEntryId } = req.body;

        const typingData = {
            wordsPerMinute: typeof averageWPM === 'number' ? averageWPM : 0,
            averageWPM: typeof averageWPM === 'number' ? averageWPM : 0,
            pauseCount: typeof pauseCount === 'number' ? pauseCount : 0,
            longPauseCount: typeof pauseCount === 'number' ? pauseCount : 0,
            backspaceRatio: typeof backspaceRatio === 'number' ? backspaceRatio : 0,
            sessionDurationSeconds: typeof sessionDurationSeconds === 'number' ? sessionDurationSeconds : 0,
            sessionDurationMs: typeof sessionDurationSeconds === 'number' ? sessionDurationSeconds * 1000 : 0,
            completed: true
        };

        let targetDream = null;
        if (dreamEntryId) {
            targetDream = await Dream.findOne({ _id: dreamEntryId, userId: req.userId });
        }
        if (!targetDream) {
            // Find most recent dream for this user
            targetDream = await Dream.findOne({ userId: req.userId }).sort({ createdAt: -1 });
        }

        if (targetDream) {
            targetDream.typingDynamics = {
                ...targetDream.typingDynamics,
                ...typingData
            };
            await targetDream.save();
            return res.json({ success: true, dream: targetDream });
        }

        res.json({ success: true, message: "Typing metrics recorded" });
    } catch (err) {
        console.error("Error updating typing vitals:", err);
        res.status(500).json({ error: "Failed to update typing vitals" });
    }
});

// GET /api/vitals/week
router.get('/week', mockAuth, async (req, res) => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const startDateStr = formatDate(oneWeekAgo);

        const vitals = await DailyVitals.find({
            userId: req.userId,
            date: { $gte: startDateStr }
        }).sort({ date: 1 });

        res.json(vitals);
    } catch (err) {
        console.error("Error fetching weekly vitals:", err);
        res.status(500).json({ error: "Failed to fetch weekly vitals" });
    }
});

module.exports = router;

