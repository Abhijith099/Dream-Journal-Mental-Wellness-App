const express = require('express');
const router = express.Router();
const GeneratedMedia = require('../models/GeneratedMedia');
const mockAuth = require('../middleware/auth');

// GET /api/gallery
router.get('/', mockAuth, async (req, res) => {
    try {
        const gallery = await GeneratedMedia.find({
            userId: req.userId,
            status: 'completed',
            savedToGallery: true
        })
        .sort({ createdAt: -1 })
        .populate('dreamId', 'title createdAt tags');

        res.json(gallery);
    } catch (err) {
        console.error("Error fetching gallery:", err);
        res.status(500).json({ error: "Failed to fetch gallery" });
    }
});

module.exports = router;