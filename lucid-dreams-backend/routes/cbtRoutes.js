const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');

const mockAuth = require('../middleware/auth');

// Initialize Gemini
let ai = null;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function generateReframe(thought) {
    if (!thought || typeof thought !== 'string') {
        throw new Error("Thought text is required");
    }

    if (!ai) {
        return {
            distortions: ["Catastrophizing"],
            reframe: "This feels heavy right now, but taking it one step at a time will help you through."
        };
    }

    try {
        const prompt = `Analyze the following negative thought from a cognitive behavioral therapy perspective.
Identify any cognitive distortions present, and provide a rational, balanced reframe of the thought.

Format your response as a JSON object with two fields:
- "distortions": An array of strings representing the identified cognitive distortions (e.g., ["All-or-Nothing Thinking", "Catastrophizing"]). Keep them standard CBT distortions.
- "reframe": A single string offering a gentle, balanced, and rational alternative thought. Do not include introductory phrases, just the reframe itself.

Thought: "${thought}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                systemInstruction: "You are a helpful and compassionate CBT assistant. You provide structured JSON output."
            }
        });

        let text = response.text || "";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(text);
        return {
            distortions: Array.isArray(result.distortions) ? result.distortions : [],
            reframe: result.reframe || "Take a slow breath. This moment is manageable one step at a time."
        };
    } catch (err) {
        console.error("Gemini reframe call error:", err);
        return {
            distortions: ["Emotional Reasoning"],
            reframe: "This feels intense right now, but acknowledging your feelings and taking one small step forward will help you navigate this."
        };
    }
}

router.post('/reframe', mockAuth, async (req, res) => {
    try {
        const { thought } = req.body;
        if (!thought || typeof thought !== 'string') {
            return res.status(400).json({ error: "Thought text is required" });
        }

        const result = await generateReframe(thought);
        res.json(result);
    } catch (err) {
        console.error("Error generating reframe:", err);
        res.status(500).json({ error: "Failed to generate reframe" });
    }
});

module.exports = router;
module.exports.generateReframe = generateReframe;
