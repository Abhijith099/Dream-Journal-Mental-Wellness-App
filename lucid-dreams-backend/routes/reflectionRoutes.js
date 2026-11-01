const express = require('express');
const router = express.Router();
const Reflection = require('../models/Reflection');

// GET /api/reflections/today
router.get('/today', async (req, res) => {
    try {
        const reflections = await Reflection.find().sort({ order: 1 });
        if (reflections.length === 0) {
            return res.json({ text: "Dreams process what waking hours don't have room for." });
        }
        // Deterministic rotation based on day of year
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        
        const reflection = reflections[dayOfYear % reflections.length];
        res.json({ text: reflection.text });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch daily reflection" });
    }
});

module.exports = router;
