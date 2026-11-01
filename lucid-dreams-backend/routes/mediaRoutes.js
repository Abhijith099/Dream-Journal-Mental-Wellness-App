const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const Dream = require('../models/Dream');
const GeneratedMedia = require('../models/GeneratedMedia');
const mockAuth = require('../middleware/auth');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });



router.get('/:id', mockAuth, async (req, res) => {
    try {
        const media = await GeneratedMedia.findOne({ _id: req.params.id, userId: req.userId });
        if (!media) {
            return res.status(404).json({ error: "Media not found" });
        }
        res.json(media);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch media status" });
    }
});

router.post('/:id/save', mockAuth, async (req, res) => {
    try {
        const media = await GeneratedMedia.findOne({ _id: req.params.id, userId: req.userId });
        if (!media) {
            return res.status(404).json({ error: "Media not found" });
        }
        
        media.savedToGallery = true;
        await media.save();
        
        // Update corresponding Dream model
        const dream = await Dream.findOne({ _id: media.dreamId, userId: req.userId });
        if (dream) {
            dream.mediaType = media.mediaType;
            if (media.mediaType === 'image') {
                dream.image = media.mediaUrl;
                dream.imageUrl = media.mediaUrl;
            } else if (media.mediaType === 'video') {
                dream.videoUrl = media.mediaUrl;
                // Attempt to link back to a saved image preview if exists
                const imgMedia = await GeneratedMedia.findOne({ dreamId: dream._id, mediaType: 'image', status: 'completed', savedToGallery: true });
                if (imgMedia) {
                    dream.image = imgMedia.mediaUrl;
                    dream.imageUrl = imgMedia.mediaUrl;
                }
            }
            await dream.save();
        }
        
        res.json(media);
    } catch (err) {
        console.error("Error saving media to gallery:", err);
        res.status(500).json({ error: "Failed to save media to gallery" });
    }
});

module.exports = router;
