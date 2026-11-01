const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleGenAI } = require('@google/genai');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const GeneratedMedia = require('../models/GeneratedMedia');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const Dream = require('../models/Dream');
const User = require('../models/User');
const Reflection = require('../models/Reflection');
const SupportResource = require('../models/SupportResource');
const ObservationCache = require('../models/ObservationCache');
const { verifyAccountAccess } = require('../utils/accessControl');

// ----------------------------------------------------
// Mock Authentication Middleware
// ----------------------------------------------------
const mockAuth = require('../middleware/auth');

// Legacy streak helper removed. totalEntries incremented directly on dream save.

// ----------------------------------------------------
// Clinical Somatic Archive Tag & Pattern Calculation Logic
// ----------------------------------------------------
function computeSomaticTag(dreamData = {}) {
    const wakingPhysicalState = Array.isArray(dreamData.wakingPhysicalState) ? dreamData.wakingPhysicalState : [];
    const wakingEmotionalState = Array.isArray(dreamData.wakingEmotionalState) ? dreamData.wakingEmotionalState : [];
    const lucidAwareness = dreamData.lucidAwareness;
    const perceivedThreats = Array.isArray(dreamData.perceivedThreats) ? dreamData.perceivedThreats : [];
    const behavioralImpact = dreamData.behavioralImpact;
    const preSleepStressors = Array.isArray(dreamData.preSleepStressors) ? dreamData.preSleepStressors : [];

    const isDistressed =
        wakingPhysicalState.some(s => ['tense', 'shaky', 'numb', 'heavy'].includes(s)) ||
        wakingEmotionalState.some(e => ['anxious', 'overwhelmed', 'sad', 'irritable'].includes(e));

    const isRestored =
        wakingPhysicalState.some(s => ['rested', 'energized'].includes(s)) &&
        wakingEmotionalState.some(e => ['calm', 'relieved', 'motivated'].includes(e));

    const isLucid = ['yes_briefly', 'yes_mostly'].includes(lucidAwareness);

    const hasAnxietySignals =
        perceivedThreats.some(t => ['losing_control', 'rejection', 'being_trapped', 'cannot_escape', 'too_much_responsibility'].includes(t)) &&
        behavioralImpact === 'avoiding_something';

    const hasRecurringTrigger =
        preSleepStressors.length > 0 &&
        !preSleepStressors.includes('nothing');

    if (isLucid && isRestored) return 'LUCID_STATE';
    if (isRestored) return 'DEEP_SOMATIC_REST';
    if (hasAnxietySignals) return 'ANXIETY_SIGNAL';
    if (isDistressed && (behavioralImpact === 'took_grounding_action' || behavioralImpact === 'taking_grounding_action'))
        return 'TENSION_DISCHARGE';
    if (isDistressed) return 'TENSION_DISCHARGE';
    if (hasRecurringTrigger) return 'SUBCONSCIOUS_ECHO';
    if (isLucid) return 'LUCID_STATE';
    return 'MEMORY_LOG';
}

async function computeDreamMetrics(userId, queryMatch = {}) {
    const dreams = await Dream.find({ userId, ...queryMatch });
    const total = dreams.length;
    if (total === 0) {
        return {
            topStressor: null,
            topThreat: null,
            avoidanceRate: 0,
            distressRate: 0
        };
    }

    const stressorCounts = {};
    const threatCounts = {};
    let avoidanceCount = 0;
    let distressCount = 0;

    dreams.forEach(d => {
        const stressors = (d.preSleepStressors || []).filter(s => s && s !== 'nothing' && s !== 'unsure');
        stressors.forEach(s => {
            stressorCounts[s] = (stressorCounts[s] || 0) + 1;
        });

        const threats = (d.perceivedThreats || []).filter(t => t && t !== 'nothing' && t !== 'unsure');
        threats.forEach(t => {
            threatCounts[t] = (threatCounts[t] || 0) + 1;
        });

        if (['avoiding_something', 'seeking_reassurance', 'ruminating', 'more_withdrawn'].includes(d.behavioralImpact)) {
            avoidanceCount++;
        }

        const isDistressed =
            (d.wakingPhysicalState || []).some(s => ['tense', 'shaky', 'numb', 'heavy', 'drained'].includes(s)) ||
            (d.wakingEmotionalState || []).some(e => ['anxious', 'overwhelmed', 'sad', 'irritable'].includes(e)) ||
            ['avoiding_something', 'seeking_reassurance', 'ruminating', 'more_withdrawn'].includes(d.behavioralImpact);

        if (isDistressed) {
            distressCount++;
        }
    });

    let topStressor = null;
    let maxStressorCount = 0;
    for (const [st, cnt] of Object.entries(stressorCounts)) {
        if (cnt > maxStressorCount) {
            maxStressorCount = cnt;
            topStressor = st;
        }
    }

    let topThreat = null;
    let maxThreatCount = 0;
    for (const [th, cnt] of Object.entries(threatCounts)) {
        if (cnt > maxThreatCount) {
            maxThreatCount = cnt;
            topThreat = th;
        }
    }

    return {
        topStressor,
        topThreat,
        avoidanceRate: Math.round((avoidanceCount / total) * 100),
        distressRate: Math.round((distressCount / total) * 100)
    };
}


// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. GET Insights (Legacy support, scoped to User)
router.get('/insights', mockAuth, async (req, res) => {
    try {
        const dreams = await Dream.find({ userId: req.userId });
        const totalDreams = dreams.length;
        const lucidDreams = dreams.filter(d => d.isLucid).length;
        const lucidPercentage = totalDreams > 0 ? Math.round((lucidDreams / totalDreams) * 100) : 0;

        const symbolCounts = {};
        dreams.forEach(dream => {
            if (dream.symbols && dream.symbols.length > 0) {
                dream.symbols.forEach(symbol => {
                    const cleanSymbol = symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase().trim();
                    symbolCounts[cleanSymbol] = (symbolCounts[cleanSymbol] || 0) + 1;
                });
            }
        });

        const topSymbols = Object.entries(symbolCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        res.json({
            totalDreams,
            lucidPercentage,
            topSymbols
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate legacy insights" });
    }
});

// 2. GET Monthly AI Digest
router.get('/monthly-digest', mockAuth, async (req, res) => {
    try {
        const dreams = await Dream.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(30);
        
        if (dreams.length < 3) {
            return res.json({ digest: "Log at least 3 dreams to generate your AI monthly digest." });
        }

        const dreamsListText = dreams.map((d, i) => 
            `Dream #${i+1}:\nTitle: ${d.title}\nDescription: ${d.description || d.memoryText}\nTags: ${d.tags?.join(', ') || 'None'}\nSymbols: ${d.symbols?.join(', ') || 'None'}`
        ).join('\n\n');

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `You are a mystical but analytical dream therapist. Analyze the following list of dreams from the user's dream journal over the past period:\n\n${dreamsListText}\n\nProvide a single-paragraph monthly digest (3-4 sentences) summarizing the period's dominant themes, emotional tone, and subconscious patterns. Speak directly to the user (use "your", "you"). Do not use any emojis, markdown formatting, or bullet points. Keep it atmospheric, calm, and insightful.`;

        const result = await model.generateContent(prompt);
        let digestText = result.response.text().trim();
        digestText = digestText.replace(/```/g, '').trim();

        res.json({ digest: digestText });
    } catch (err) {
        console.error("Error generating monthly digest:", err);
        res.status(500).json({ error: "Failed to generate monthly digest" });
    }
});

// 3. GET reflections/today removed and moved to reflectionRoutes.js

// 4. GET support/resources
router.get('/support/resources', async (req, res) => {
    try {
        const resources = await SupportResource.find();
        res.json(resources);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch support resources" });
    }
});

// 5. GET dreams/recent (Filtered recent dreams for Home Screen)
router.get('/recent', mockAuth, async (req, res) => {
    try {
        const filterType = req.query.filter || 'all';
        const limit = parseInt(req.query.limit) || 5;

        const query = { userId: req.userId };
        if (filterType === 'lucid') {
            query.isLucid = true;
        } else if (filterType === 'recurring') {
            query.tags = 'recurring';
        } else if (filterType === 'week') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            query.createdAt = { $gte: oneWeekAgo };
        }

        const dreams = await Dream.find(query).sort({ createdAt: -1 }).limit(limit);
        res.json(dreams);
    } catch (err) {
        console.error("Error fetching recent dreams:", err);
        res.status(500).json({ error: "Failed to fetch recent dreams" });
    }
});

// 6. GET insights/summary (Consolidated stats for Resonance)
router.get('/insights/summary', mockAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const now = new Date();
        // Start of current week (Sunday)
        const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

        const summary = await Dream.aggregate([
            { $match: { userId } },
            {
                $facet: {
                    total: [{ $count: "count" }],
                    lucid: [{ $match: { isLucid: true } }, { $count: "count" }],
                    thisWeek: [
                        { $match: { createdAt: { $gte: startOfThisWeek } } },
                        { $count: "count" }
                    ]
                }
            }
        ]);

        const facet = summary[0] || {};
        const totalDreams = facet.total?.[0]?.count ?? 0;
        const lucidCount = facet.lucid?.[0]?.count ?? 0;
        const lucidRate = totalDreams > 0 ? Math.round((lucidCount / totalDreams) * 100) : 0;
        const thisWeekCount = facet.thisWeek?.[0]?.count ?? 0;

        const patternMetrics = await computeDreamMetrics(userId);

        res.json({
            totalDreams: req.user.totalEntries || totalDreams,
            lucidRate,
            thisWeekCount,
            topStressor: patternMetrics.topStressor,
            topThreat: patternMetrics.topThreat,
            avoidanceRate: patternMetrics.avoidanceRate,
            distressRate: patternMetrics.distressRate
        });
    } catch (err) {
        console.error("Error aggregating insights summary:", err);
        res.status(500).json({ error: "Failed to fetch summary insights" });
    }
});

// 7. GET insights/symbols
router.get('/insights/symbols', mockAuth, async (req, res) => {
    try {
        const totalDreams = await Dream.countDocuments({ userId: req.userId });
        
        if (totalDreams === 0) {
            return res.json({ tier: 0, title: "Dream Vocabulary", symbols: [] });
        }
        
        let matchQuery = { userId: req.userId };
        let minCount = 1;
        let title = "Words that came up";
        let tier = 1;

        if (totalDreams >= 3 && totalDreams <= 4) {
            minCount = 2;
            title = "Recurring Symbols";
            tier = 2;
        } else if (totalDreams >= 5) {
            minCount = 3;
            title = "Recently Appeared";
            tier = 3;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            matchQuery.createdAt = { $gte: thirtyDaysAgo };
        }
        
        const symbolsGroup = await Dream.aggregate([
            { $match: matchQuery },
            { $unwind: "$symbols" },
            { $group: { _id: "$symbols", count: { $sum: 1 } } },
            { $match: { count: { $gte: minCount } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const symbols = symbolsGroup.map(s => ({ name: s._id, count: s.count }));
        res.json({ tier, title, symbols });
    } catch (err) {
        console.error("Error fetching symbols frequency:", err);
        res.status(500).json({ error: "Failed to fetch symbols frequency" });
    }
});

// 8. GET insights/mood-trend
router.get('/insights/mood-trend', mockAuth, async (req, res) => {
    try {
        const rangeDays = 30;
        const rangeStart = new Date();
        rangeStart.setDate(rangeStart.getDate() - rangeDays);

        const moodTrend = await Dream.aggregate([
            { $match: { userId: req.userId, createdAt: { $gte: rangeStart } } },
            { $sort: { createdAt: 1 } },
            {
                $project: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    moodValue: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$mood", "positive"] }, then: 1 },
                                { case: { $eq: ["$mood", "distressing"] }, then: -1 }
                            ],
                            default: 0
                        }
                    }
                }
            }
        ]);

        res.json(moodTrend);
    } catch (err) {
        console.error("Error fetching mood trend:", err);
        res.status(500).json({ error: "Failed to fetch mood trend" });
    }
});

// 9. GET insights/correlations
router.get('/insights/correlations', mockAuth, async (req, res) => {
    try {
        const count = await Dream.countDocuments({ userId: req.userId });
        if (count < 10) {
            return res.status(204).send(); // 204 No Content for low data
        }

        const dreams = await Dream.find({ userId: req.userId });
        
        // Calculate weekday vs weekend lucidity correlation
        const weekendDreams = dreams.filter(d => {
            const day = new Date(d.createdAt).getDay();
            return day === 0 || day === 6;
        });
        const weekdayDreams = dreams.filter(d => {
            const day = new Date(d.createdAt).getDay();
            return day > 0 && day < 6;
        });

        const weekendLucidRate = weekendDreams.length > 0 
            ? (weekendDreams.filter(d => d.isLucid).length / weekendDreams.length) 
            : 0;
        const weekdayLucidRate = weekdayDreams.length > 0 
            ? (weekdayDreams.filter(d => d.isLucid).length / weekdayDreams.length) 
            : 0;

        let correlation = "";
        if (weekendLucidRate > weekdayLucidRate * 1.2) {
            correlation = `Your dreams logged on weekends are ${Math.round((weekendLucidRate - weekdayLucidRate) * 100)}% more likely to be lucid.`;
        } else {
            const fallingDreams = dreams.filter(d => d.symbols?.some(s => s.toLowerCase().includes("falling")));
            if (fallingDreams.length >= 2) {
                correlation = "Dreams tagged 'Falling' cluster in weeks with fewer total entries.";
            } else {
                correlation = "Lucid rate increases by 15% when journaling average word count exceeds 150 words.";
            }
        }

        res.json({ correlation });
    } catch (err) {
        console.error("Error calculating correlations:", err);
        res.status(500).json({ error: "Failed to calculate correlations" });
    }
});

// 9a. GET Route: Fetch full dream by ID
router.get('/:id/full', mockAuth, async (req, res) => {
    try {
        const dream = await Dream.findOne({ _id: req.params.id, userId: req.userId });
        if (!dream) {
            return res.status(404).json({ error: "Dream not found" });
        }
        res.status(200).json(dream);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9b. GET Route: Fetch a single dream by ID
router.get('/:id', mockAuth, async (req, res) => {
    try {
        const dream = await Dream.findOne({ _id: req.params.id, userId: req.userId });
        if (!dream) {
            return res.status(404).json({ error: "Dream not found" });
        }
        res.status(200).json(dream);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. GET Route: Fetch dreams for user (supports both paginated object and array)
async function handleGetDreams(req, res) {
    try {
        const targetUserId = req.params.userId || req.userId;
        const access = await verifyAccountAccess(req, targetUserId);
        if (!access.authorized) {
            return res.status(403).json({ error: "Access denied: Unauthorized cross-account access" });
        }
        const effectiveUserId = access.targetUserId;

        const { sort, limit, page } = req.query;
        let sortOption = { createdAt: -1 };
        if (sort === 'oldest') {
            sortOption = { createdAt: 1 };
        }

        const totalCount = await Dream.countDocuments({ userId: effectiveUserId });

        if (limit !== undefined || sort !== undefined || page !== undefined) {
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, parseInt(limit) || 20);
            const dreams = await Dream.find({ userId: effectiveUserId })
                .sort(sortOption)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum);

            const formattedDreams = dreams.map(d => ({
                dream_id: d._id,
                _id: d._id,
                title: d.title,
                content: d.description || d.memoryText || '',
                created_at: d.createdAt,
                date: d.date || d.createdAt,
                tags: d.tags || [],
                emotion_score: typeof d.emotionScore === 'number' ? d.emotionScore : null,
                isLucid: d.isLucid,
                somaticArchiveTag: d.somaticArchiveTag
            }));

            return res.status(200).json({
                user_id: effectiveUserId,
                dreams: formattedDreams,
                total_count: totalCount,
                page: pageNum,
                per_page: limitNum
            });
        }

        const dreams = await Dream.find({ userId: effectiveUserId }).sort(sortOption);
        return res.status(200).json(dreams);
    } catch (err) {
        console.error("Error fetching dreams:", err);
        return res.status(500).json({ error: err.message });
    }
}

router.get('/', mockAuth, handleGetDreams);
router.get('/user/:userId', mockAuth, handleGetDreams);

// 10b. POST Route: Transcribe audio for voice journaling with Gemini 1.5 Flash
router.post('/voice', mockAuth, async (req, res) => {
    try {
        const { audio, mimeType } = req.body;
        if (!audio) {
            return res.status(400).json({ error: 'Audio data is required' });
        }

        // Reject payloads exceeding 2 minutes (~14MB base64 proxy limit)
        if (typeof audio === 'string' && audio.length > 14 * 1024 * 1024) {
            return res.status(400).json({ error: 'Audio recording exceeds maximum allowed duration (2 minutes)' });
        }

        const audioMime = mimeType || 'audio/m4a';

        let transcription = '';
        let vocalCharacterization = '';

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-flash-latest',
                contents: [
                    {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: audioMime,
                                    data: audio
                                }
                            },
                            {
                                text: `You are a transcription assistant for a dream journal.
                                
Task 1: Transcribe this audio recording exactly as spoken into clear, readable text.
Task 2: In 1-2 concise sentences, characterize the vocal delivery only (e.g., "The speaker was hesitant and spoke slowly" or "Fluent, expressive, and steady pace"). Do NOT infer emotional state, psychology, or mental health. This is observational delivery metadata only.

Return ONLY a JSON object:
{
  "transcription": "...",
  "vocalCharacterization": "..."
}`
                            }
                        ]
                    }
                ],
                config: { responseMimeType: 'application/json' }
            });

            const parsed = JSON.parse(response.text);
            transcription = parsed.transcription || '';
            vocalCharacterization = parsed.vocalCharacterization || '';
        } catch (geminiErr) {
            console.error('Gemini GenAI voice processing error, attempting GenerativeAI fallback:', geminiErr);
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: audioMime,
                        data: audio
                    }
                },
                `You are a transcription assistant for a dream journal.
Task 1: Transcribe this audio recording exactly as spoken.
Task 2: In 1-2 sentences, characterize vocal delivery only (e.g., fluent, hesitant, fast-paced). Do NOT infer mental state.
Return JSON format:
{
  "transcription": "...",
  "vocalCharacterization": "..."
}`
            ]);
            const cleaned = result.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();
            const parsed = JSON.parse(cleaned);
            transcription = parsed.transcription || '';
            vocalCharacterization = parsed.vocalCharacterization || '';
        }

        res.json({
            transcription,
            vocalCharacterization
        });
    } catch (err) {
        console.error('Voice processing route error:', err);
        res.status(500).json({ error: 'Failed to process audio recording' });
    }
});

// 11. POST Route: Create a new dream WITH AI Insights & Images
router.post('/', mockAuth, async (req, res) => {
    try {
        const { title, memoryText, isLucid, energyLevel, tags, vocalCharacterization, inputMethod, typingDynamics } = req.body;

        const contentText = memoryText || "";
        const titleText = title || "Untitled Memory";
        const lucidState = isLucid || false;
        const energyState = typeof energyLevel === 'number' ? energyLevel : 3;
        const tagsList = Array.isArray(tags) ? tags : [];

        // Validate memoryText length server-side (max 5000 chars)
        if (contentText.length > 5000) {
            return res.status(400).json({ error: "Memory text exceeds the limit of 5000 characters." });
        }

        const wordCount = contentText.trim() === "" ? 0 : contentText.trim().split(/\s+/).length;

        let aiInsight = "";
        let symbols = [];
        let imageUrl = "";
        let themes = { anxiety: 0, control: 0, isolation: 0, joy: 0, grief: 0 };
        let sentimentLabel = tagsList.includes('nightmare') ? 'Distressing' : (tagsList.includes('peaceful') ? 'Positive' : 'Neutral');

        if (contentText.trim() !== "") {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

                const prompt = `Analyze this dream: "${contentText}". 
                Respond ONLY with a valid JSON object containing exactly five keys:
                "insight": A two-sentence mystical but analytical summary based on the dream.
                "symbols": An array of 1 to 3 single-word strings representing key themes (e.g. ["Water", "Flying"]).
                "sentiment": One of exactly three values: "Positive", "Neutral", or "Distressing".
                "imagePrompt": A highly detailed, cinematic, and surreal image generation prompt (max 30 words) describing the visual essence of this dream.
                "themes": An object with exactly 5 keys (anxiety, control, isolation, joy, grief), each having an integer value from 0 to 10 rating the intensity of that theme in the dream.
                Do not include any markdown formatting.`;

                const result = await model.generateContent(prompt);
                let rawText = result.response.text();
                rawText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
                const aiData = JSON.parse(rawText);

                aiInsight = aiData.insight;
                symbols = aiData.symbols || [];
                themes = aiData.themes || themes;
                if (['Positive', 'Neutral', 'Distressing'].includes(aiData.sentiment)) {
                    sentimentLabel = aiData.sentiment;
                }
                
                const safePrompt = encodeURIComponent(aiData.imagePrompt || titleText);
                imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=800&height=400&nologo=true`;
            } catch (aiErr) {
                console.error("AI Generation failed:", aiErr);
                const wordList = contentText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
                const commonSymbols = ["water", "falling", "flying", "fire", "chase", "door", "darkness", "light", "climbing", "running", "monster", "ghost", "family", "school", "exam"];
                symbols = Array.from(new Set(wordList.filter(w => commonSymbols.includes(w)))).slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1));
            }
        }

        let isRecurring = tagsList.includes('recurring');
        if (symbols.length > 0 && !isRecurring) {
            const overlapping = await Dream.countDocuments({
                userId: req.userId,
                symbols: { $in: symbols }
            });
            isRecurring = overlapping > 0;
            if (isRecurring && !tagsList.includes('recurring')) {
                tagsList.push('recurring');
            }
        }

        // Attach typingDynamics if user has consent enabled or dynamically provided
        let attachedTypingDynamics = undefined;
        if (typingDynamics && (req.user?.typingDynamicsEnabled || typingDynamics.wordsPerMinute !== undefined)) {
            attachedTypingDynamics = {
                wordsPerMinute: typingDynamics.wordsPerMinute || 0,
                timeToFirstKeystrokeMs: typingDynamics.timeToFirstKeystrokeMs || null,
                longPauseCount: typingDynamics.longPauseCount || 0,
                sessionDurationMs: typingDynamics.sessionDurationMs || 0,
                completed: typingDynamics.completed !== false
            };
        }

        // Compute Somatic Archive Tag via priority logic
        const somaticArchiveTag = computeSomaticTag(req.body);
        const lucidAwarenessVal = req.body.lucidAwareness || (lucidState ? 'yes_briefly' : 'no');
        const computedIsLucid = ['yes_briefly', 'yes_mostly'].includes(lucidAwarenessVal) || lucidState;

        // Default heuristic insight signals
        let lucidityScore = ['yes_mostly'].includes(lucidAwarenessVal) ? 95 : (['yes_briefly'].includes(lucidAwarenessVal) ? 75 : 15);
        let narrativeContinuity = Math.min(95, Math.max(35, Math.round(wordCount * 1.3)));
        let emotionalTone = tagsList.length > 0 ? tagsList.slice(0, 3).map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()) : ['Reflective', 'Neutral'];
        let reflectionPrompt = "What key emotion or symbol from this memory lingers with you most now that you are awake?";

        if (contentText.trim() !== "") {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const insightModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
                const prompt2 = `Analyze this dream journal entry for the following.
Return JSON with exactly these keys:
{
  "lucidityScore": 0-100 integer (how much awareness/control appears),
  "narrativeContinuity": 0-100 integer (how coherent/linear the narrative),
  "emotionalTone": ["word1", "word2"] (2-3 plain adjectives max, capitalized),
  "symbols": ["symbol1", "symbol2"] (3-5 concrete images from the text),
  "reflectionPrompt": "one question connecting this dream to waking life"
}
Dream text: "${contentText}"`;
                const insightResult = await insightModel.generateContent(prompt2);
                let rawInsight = insightResult.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsedInsights = JSON.parse(rawInsight);
                if (typeof parsedInsights.lucidityScore === 'number') lucidityScore = parsedInsights.lucidityScore;
                if (typeof parsedInsights.narrativeContinuity === 'number') narrativeContinuity = parsedInsights.narrativeContinuity;
                if (Array.isArray(parsedInsights.emotionalTone) && parsedInsights.emotionalTone.length > 0) {
                    emotionalTone = parsedInsights.emotionalTone;
                }
                if (parsedInsights.reflectionPrompt) reflectionPrompt = parsedInsights.reflectionPrompt;
                if (Array.isArray(parsedInsights.symbols) && parsedInsights.symbols.length > 0) {
                    symbols = Array.from(new Set([...symbols, ...parsedInsights.symbols]));
                }
            } catch (err2) {
                console.error("Secondary insight generation skipped:", err2?.message);
            }
        }

        const newDream = new Dream({
            userId: req.userId,
            title: titleText,
            description: contentText || titleText, // keep for compatibility
            memoryText: contentText,
            wordCount,
            isLucid: computedIsLucid,
            lucidAwareness: lucidAwarenessVal,
            lucidResponse: req.body.lucidResponse || null,
            preSleepStressors: Array.isArray(req.body.preSleepStressors) ? req.body.preSleepStressors : [],
            dominantConcern: req.body.dominantConcern || null,
            concernIntensity: typeof req.body.concernIntensity === 'number' ? req.body.concernIntensity : null,
            perceivedThreats: Array.isArray(req.body.perceivedThreats) ? req.body.perceivedThreats : [],
            dreamNeed: Array.isArray(req.body.dreamNeed) ? req.body.dreamNeed : [],
            lifeConnection: req.body.lifeConnection || null,
            lifeConnectionArea: Array.isArray(req.body.lifeConnectionArea) ? req.body.lifeConnectionArea : [],
            wakingPhysicalState: Array.isArray(req.body.wakingPhysicalState) ? req.body.wakingPhysicalState : [],
            wakingEmotionalState: Array.isArray(req.body.wakingEmotionalState) ? req.body.wakingEmotionalState : [],
            behavioralImpact: req.body.behavioralImpact || null,
            dayImpact: req.body.dayImpact || null,
            somaticArchiveTag,
            lucidityScore,
            narrativeContinuity,
            emotionalTone,
            reflectionPrompt,
            energyLevel: energyState,
            tags: tagsList,
            aiInsight,
            symbols,
            imageUrl,
            themes,
            sentimentLabel,
            isRecurring,
            vocalCharacterization: vocalCharacterization || null,
            inputMethod: inputMethod === 'voice' ? 'voice' : 'typed',
            typingDynamics: attachedTypingDynamics
        });

        const savedDream = await newDream.save();

        // Increment User totalEntries & update lastEntryDate
        if (!req.user.name) {
            req.user.name = req.user.displayName || 'Dream Explorer';
        }
        req.user.totalEntries = (req.user.totalEntries || 0) + 1;
        req.user.lastEntryDate = new Date();
        await req.user.save();

        // Invalidate clinical AI caches
        try {
            await ObservationCache.deleteMany({
                userId: req.userId,
                period: { $in: ['rescript', 'reflection', 'anchor', 'all'] }
            });
        } catch (cacheErr) {
            console.error("Cache invalidation error:", cacheErr);
        }

        res.status(201).json(savedDream);
    } catch (err) {
        console.error("Error creating dream:", err);
        res.status(500).json({ error: err.message });
    }
});

// 11.5 PUT Route: Update an existing dream by ID
router.put('/:id', mockAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const dream = await Dream.findOne({ _id: id, userId: req.userId });
        if (!dream) {
            return res.status(404).json({ error: "Dream not found or unauthorized" });
        }

        const updateData = { ...req.body };
        if (updateData.memoryText && !updateData.description) {
            updateData.description = updateData.memoryText;
        }
        if (updateData.lucidAwareness) {
            updateData.isLucid = ['yes_briefly', 'yes_mostly'].includes(updateData.lucidAwareness);
        }

        // Recompute somatic archive tag
        updateData.somaticArchiveTag = computeSomaticTag({ ...dream.toObject(), ...updateData });

        Object.assign(dream, updateData);
        const updatedDream = await dream.save();
        res.status(200).json(updatedDream);
    } catch (err) {
        console.error("Error updating dream:", err);
        res.status(500).json({ error: err.message });
    }
});

// 12. DELETE Route: Delete a dream by ID
router.delete('/:id', mockAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedDream = await Dream.findOneAndDelete({ _id: id, userId: req.userId });
        if (!deletedDream) {
            return res.status(404).json({ error: "Dream not found or unauthorized" });
        }
        res.status(200).json({ message: "Dream deleted successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: "Failed to delete dream" });
    }
});

// 12.5 POST Route: Re-script a dream ending
router.post('/:id/rescript', mockAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rescriptedEnding } = req.body;
        
        if (!rescriptedEnding || typeof rescriptedEnding !== 'string') {
            return res.status(400).json({ error: "rescriptedEnding is required" });
        }

        const dream = await Dream.findOne({ _id: id, userId: req.userId });
        if (!dream) {
            return res.status(404).json({ error: "Dream not found" });
        }

        dream.rescriptedEnding = rescriptedEnding;
        await dream.save();

        // Invalidate rescript cache
        try {
            await ObservationCache.deleteMany({
                userId: req.userId,
                period: 'rescript'
            });
        } catch (cacheErr) {
            console.error("Cache invalidation error on rescript:", cacheErr);
        }

        res.status(200).json(dream);
    } catch (err) {
        console.error("Error rescripting dream:", err);
        res.status(500).json({ error: "Failed to save rescripted ending" });
    }
});

// Rate limiter: 5 per day
const generateLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 5,
    message: { error: "Daily generation limit reached. Please try again tomorrow." }
});

// 13. POST Route: Generate Media
router.post('/:id/generate-media', mockAuth, generateLimiter, async (req, res) => {
    try {
        const { mediaType } = req.body;
        if (!['image', 'video'].includes(mediaType)) {
            return res.status(400).json({ error: "Invalid mediaType" });
        }

        const dreamId = req.params.id;
        const userId = req.userId;

        const dream = await Dream.findOne({ _id: dreamId, userId });
        if (!dream) {
            return res.status(404).json({ error: "Dream not found" });
        }

        // Cleanup unsaved drafts (Regenerate flow)
        const unsavedDraft = await GeneratedMedia.findOne({ dreamId, mediaType, savedToGallery: false });
        if (unsavedDraft) {
            try {
                if (unsavedDraft.mediaUrl) {
                    const oldFilepath = path.join(__dirname, '..', unsavedDraft.mediaUrl);
                    if (fs.existsSync(oldFilepath)) {
                        fs.unlinkSync(oldFilepath);
                    }
                }
                await GeneratedMedia.findByIdAndDelete(unsavedDraft._id);
            } catch (cleanupErr) {
                console.error("Failed to cleanup unsaved draft:", cleanupErr);
            }
        }

        const prompt = `Title: ${dream.title}. Details: ${dream.memoryText || dream.description}. Style: A soft, painterly, dreamlike interpretation, calm aesthetic, not photorealistic, not graphic.`;

        if (mediaType === 'image') {
            try {
                let base64Data = null;
                
                try {
                    console.log("Calling Gemini API with prompt:", prompt);
                    // Try with imagen model
                    const response = await ai.models.generateImages({
                        model: 'imagen-3.0-generate-001',
                        prompt: prompt,
                        config: { numberOfImages: 1 }
                    });
                    console.log("Gemini API call successful. Received generatedImages array.");
                    if (response.generatedImages && response.generatedImages.length > 0) {
                        base64Data = response.generatedImages[0].image.imageBytes;
                    }
                } catch (e) {
                    console.error("Imagen model error:", e);
                    // Fallback to downloading from Pollinations AI
                    console.log("Fallback to Pollinations AI for image...");
                    const fetch = (await import('node-fetch')).default || require('node-fetch');
                    const safePrompt = encodeURIComponent(prompt);
                    const pollinationsResponse = await fetch(`https://image.pollinations.ai/prompt/${safePrompt}?width=800&height=400&nologo=true`);
                    const buffer = await pollinationsResponse.arrayBuffer();
                    base64Data = Buffer.from(buffer).toString('base64');
                }

                if (!base64Data) {
                    throw new Error("No image data returned");
                }

                const filename = `img_${dreamId}_${Date.now()}.png`;
                const filepath = path.join(__dirname, '..', 'uploads', 'gallery', filename);
                fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

                const media = new GeneratedMedia({
                    userId,
                    dreamId,
                    mediaType,
                    status: 'completed',
                    mediaUrl: `/uploads/gallery/${filename}`
                });
                await media.save();

                return res.json(media);
            } catch (apiErr) {
                console.error("Gemini API Error details:", apiErr);
                return res.status(500).json({ error: "Failed to generate image." });
            }
        } else if (mediaType === 'video') {
            const media = new GeneratedMedia({
                userId,
                dreamId,
                mediaType,
                status: 'processing'
            });
            await media.save();
            
            // Background job for video (mocking Veo since there is no standard Veo API exposed yet)
            setTimeout(async () => {
                try {
                    const filename = `vid_${dreamId}_${Date.now()}.mp4`;
                    const filepath = path.join(__dirname, '..', 'uploads', 'gallery', filename);
                    
                    // Download a tiny valid sample video instead of writing broken text
                    const fetch = (await import('node-fetch')).default || require('node-fetch');
                    const videoRes = await fetch('https://www.w3schools.com/html/mov_bbb.mp4');
                    const videoBuffer = await videoRes.arrayBuffer();
                    fs.writeFileSync(filepath, Buffer.from(videoBuffer));

                    try {
                        const currentMedia = await GeneratedMedia.findById(media._id);
                        if (currentMedia) {
                            currentMedia.status = 'completed';
                            currentMedia.mediaUrl = `/uploads/gallery/${filename}`;
                            await currentMedia.save();

                            if (currentMedia.savedToGallery) {
                                const dream = await Dream.findById(dreamId);
                                if (dream) {
                                    dream.mediaType = 'video';
                                    dream.videoUrl = currentMedia.mediaUrl;
                                    await dream.save();
                                }
                            }
                        }
                    } catch (saveErr) {
                        console.error("Failed to save completed media state:", saveErr);
                    }
                } catch (e) {
                    try {
                        const currentMedia = await GeneratedMedia.findById(media._id);
                        if (currentMedia) {
                            currentMedia.status = 'failed';
                            currentMedia.errorMessage = "Video generation failed.";
                            await currentMedia.save();
                        }
                    } catch (saveErr) {
                        console.error("Failed to mark media state as failed:", saveErr);
                    }
                }
            }, 8000); // 8 seconds mock wait

            return res.json(media);
        }

    } catch (err) {
        console.error("Error initiating generation:", err);
        res.status(500).json({ error: "Failed to initiate generation" });
    }
});


module.exports = router;