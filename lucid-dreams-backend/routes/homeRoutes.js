const express = require('express');
const router = express.Router();
const mockAuth = require('../middleware/auth');
const User = require('../models/User');
const DailyCheckIn = require('../models/DailyCheckIn');
const CompanionSession = require('../models/CompanionSession');
const BreathingSession = require('../models/BreathingSession');
const GroundingSession = require('../models/GroundingSession');
const LatestInsight = require('../models/LatestInsight');
const HeartRateLog = require('../models/HeartRateLog');
const Dream = require('../models/Dream');
const MoodCheckIn = require('../models/MoodCheckIn');
const MicroTask = require('../models/MicroTask');
const SanctuarySession = require('../models/SanctuarySession');
const WellnessLog = require('../models/WellnessLog');
const BehavioralTask = require('../models/BehavioralTask');
const chatRoutes = require('./chatRoutes');
const { generateReframe } = require('./cbtRoutes');

let ai = null;
if (process.env.GEMINI_API_KEY) {
    try {
        const { GoogleGenAI } = require('@google/genai');
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
        console.warn("HomeRoutes: Could not initialize GoogleGenAI:", err.message);
    }
}

const containsCrisisLanguage = chatRoutes.containsCrisisLanguage;

const { verifyAccountAccess } = require('../utils/accessControl');
const { recordAuditLog } = require('../utils/auditLogger');

// Helper: resolve and verify target user ID
async function resolveVerifiedUserId(req) {
    const rawTarget = (req.params.userId && req.params.userId !== 'undefined' && req.params.userId !== 'null')
        ? req.params.userId
        : req.userId;
    return await verifyAccountAccess(req, rawTarget);
}

// ----------------------------------------------------
// 0. Home Screen Dashboard Data
// GET /api/home/dashboard, GET /api/users/:userId/dashboard, GET /api/home/:userId/dashboard
// ----------------------------------------------------
router.get(['/dashboard', '/:userId/dashboard'], mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: "Access denied: Unauthorized cross-account access" });
        }
        const targetUserId = access.targetUserId;
        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const accountName = user.displayName || user.name || (user.firstName ? user.firstName : 'User');

        const totalDreamsCount = await Dream.countDocuments({ userId: targetUserId });

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        const totalDreamsThisWeek = await Dream.countDocuments({
            userId: targetUserId,
            createdAt: { $gte: startOfWeek }
        });

        const recentDreamsDocs = await Dream.find({ userId: targetUserId })
            .sort({ createdAt: -1 })
            .limit(5);

        const recentDreams = recentDreamsDocs.map(d => ({
            dream_id: d._id,
            id: d._id,
            title: d.title,
            content: d.description || d.memoryText || '',
            created_at: d.createdAt,
            date: d.date || d.createdAt,
            tags: d.tags || []
        }));

        const lastSession = await SanctuarySession.findOne({ userId: targetUserId })
            .sort({ initiatedAt: -1, createdAt: -1 });

        let lastSanctuarySession = null;
        if (lastSession) {
            lastSanctuarySession = {
                session_id: lastSession.sessionId || lastSession._id,
                initiated_at: lastSession.initiatedAt || lastSession.createdAt,
                ended_at: lastSession.endedAt,
                final_feeling: lastSession.finalFeeling || null
            };
        }

        // Today's wellness mood / score
        const todayStr = new Date().toISOString().split('T')[0];
        const todayCheckIn = await DailyCheckIn.findOne({ userId: targetUserId, date: todayStr });
        const todayMood = await MoodCheckIn.findOne({ userId: targetUserId }).sort({ createdAt: -1 });
        let wellnessScoreToday = null;
        if (todayCheckIn && todayCheckIn.mentalState) {
            const stateScores = { 'Clear': 9, 'Settled': 8, 'Foggy': 5, 'Overloaded': 3, 'Numb': 2 };
            wellnessScoreToday = stateScores[todayCheckIn.mentalState] || 7;
        } else if (todayMood && todayMood.mood) {
            wellnessScoreToday = 7;
        }

        const upcomingTasks = await BehavioralTask.find({ userId: targetUserId, completed: false })
            .sort({ createdAt: -1 })
            .limit(3);

        const upcomingWellnessGoals = upcomingTasks.map(t => ({
            goal_id: t._id,
            title: t.title,
            completed: t.completed
        }));

        return res.json({
            user_id: targetUserId,
            account_name: accountName,
            total_dreams_count: totalDreamsCount,
            total_dreams_this_week: totalDreamsThisWeek,
            recent_dreams: recentDreams,
            last_sanctuary_session: lastSanctuarySession,
            wellness_score_today: wellnessScoreToday,
            upcoming_wellness_goals: upcomingWellnessGoals
        });
    } catch (err) {
        console.error("Error fetching dashboard data:", err);
        return res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
});

// GET /api/users/:userId/dreams (Pattern 2)
router.get('/:userId/dreams', mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: "Forbidden: Cross-user boundary access denied" });
        }
        const dreams = await Dream.find({ userId: access.targetUserId }).sort({ createdAt: -1 });
        return res.json({ dreams });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /api/users/initialize
router.post('/initialize', mockAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const { preferred_timezone, notification_settings } = req.body || {};
        if (preferred_timezone) {
            user.timezone = preferred_timezone;
        }
        if (notification_settings) {
            user.notificationSettings = notification_settings;
        }
        await user.save();

        const dreamsCount = await Dream.countDocuments({ userId });
        const wellnessCount = await WellnessLog.countDocuments({ userId });
        const sanctuaryCount = await SanctuarySession.countDocuments({ userId });

        return res.status(200).json({
            success: true,
            message: "User workspace initialized cleanly",
            user_id: userId,
            preferences: {
                preferred_timezone: user.timezone || 'UTC',
                notification_settings: user.notificationSettings || {}
            },
            collections: {
                dreams: dreamsCount,
                wellness_entries: wellnessCount,
                sanctuary_sessions: sanctuaryCount
            }
        });
    } catch (err) {
        console.error("Error initializing user:", err);
        return res.status(500).json({ error: "Failed to initialize workspace" });
    }
});

// ----------------------------------------------------
// 1. User Profile / Personalized Greeting
// GET /api/home/profile, GET /api/users/:userId/profile
// ----------------------------------------------------
router.get(['/profile', '/:userId/profile'], mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: "Access denied: Unauthorized cross-account access" });
        }
        const targetUserId = access.targetUserId;
        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const firstName = user.firstName || (user.displayName ? user.displayName.split(' ')[0] : (user.name ? user.name.split(' ')[0] : 'Dreamer'));
        return res.json({
            profile: {
                firstName,
                displayName: user.displayName || user.name || firstName,
                name: user.name
            },
            firstName,
            displayName: user.displayName || user.name || firstName
        });
    } catch (err) {
        console.error("Error fetching home profile:", err);
        return res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// ----------------------------------------------------
// 2. Check-Ins ("How Are You Feeling Right Now?")
// POST /api/home/check-in, POST /api/home/checkIns/:date, POST /api/users/:userId/checkIns/:date
// ----------------------------------------------------
router.post(['/check-in', '/checkIns/:date', '/:userId/checkIns/:date'], mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: "Access denied: Unauthorized cross-account access" });
        }
        const targetUserId = access.targetUserId;
        const dateStr = req.params.date || req.body.date || new Date().toISOString().split('T')[0];
        const { mentalState, bodyState, timestamp } = req.body;

        const validMental = ['Clear', 'Foggy', 'Overloaded', 'Numb'];
        const validBody = ['Settled', 'Tense', 'Restless', 'Heavy'];

        const updateData = {
            timestamp: timestamp ? new Date(timestamp) : new Date()
        };

        if (mentalState !== undefined) {
            updateData.mentalState = validMental.includes(mentalState) ? mentalState : null;
        }
        if (bodyState !== undefined) {
            updateData.bodyState = validBody.includes(bodyState) ? bodyState : null;
        }

        // Upsert daily check-in document
        const checkIn = await DailyCheckIn.findOneAndUpdate(
            { userId: targetUserId, date: dateStr },
            { $set: updateData },
            { returnDocument: 'after', upsert: true }
        );

        // Also record a mood entry for downstream clinical metrics
        if (mentalState) {
            try {
                await MoodCheckIn.create({
                    userId: targetUserId,
                    mood: mentalState
                });
            } catch (mErr) {
                console.warn("Could not sync MoodCheckIn:", mErr.message);
            }
        }

        await recordAuditLog(req, {
            targetUserId,
            action: 'CHECK_IN',
            resourceType: 'daily_check_in',
            resourceId: checkIn._id,
            details: { mentalState, bodyState, date: dateStr }
        });

        return res.status(200).json({
            success: true,
            checkIn: {
                date: checkIn.date,
                mentalState: checkIn.mentalState,
                bodyState: checkIn.bodyState,
                timestamp: checkIn.timestamp
            }
        });
    } catch (err) {
        console.error("Error saving daily check-in:", err);
        return res.status(500).json({ error: "Failed to record check-in" });
    }
});

// GET /api/home/check-in/latest, GET /api/users/:userId/checkIns/latest, GET /api/users/:userId/checkIns/:date
router.get(['/check-in/latest', '/checkIns/latest', '/:userId/checkIns/latest', '/checkIns/:date', '/:userId/checkIns/:date'], mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: "Access denied: Unauthorized cross-account access" });
        }
        const targetUserId = access.targetUserId;
        const dateStr = req.params.date;

        let checkIn = null;
        if (dateStr && dateStr !== 'latest') {
            checkIn = await DailyCheckIn.findOne({ userId: targetUserId, date: dateStr });
        } else {
            // Find most recent check-in
            checkIn = await DailyCheckIn.findOne({ userId: targetUserId }).sort({ timestamp: -1 });
        }

        // Count check-ins in the last 7 days for "You have checked in X times this week"
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weeklyCount = await DailyCheckIn.countDocuments({
            userId: targetUserId,
            timestamp: { $gte: sevenDaysAgo }
        });

        // Get most recent dream log time for the Dream Capture card
        const latestDream = await Dream.findOne({ userId: targetUserId }).sort({ createdAt: -1 });

        return res.json({
            checkIn: checkIn ? {
                date: checkIn.date,
                mentalState: checkIn.mentalState,
                bodyState: checkIn.bodyState,
                timestamp: checkIn.timestamp
            } : null,
            weeklyCount: weeklyCount, // 0 for brand new users, strictly account-specific
            lastRecordedDream: latestDream ? latestDream.createdAt : null
        });
    } catch (err) {
        console.error("Error fetching check-in status:", err);
        return res.status(500).json({ error: "Failed to fetch check-in" });
    }
});

// ----------------------------------------------------
// 3. Somatic Companion / Chat Buddy Session Initiation
// POST /api/home/companion-sessions, POST /api/users/:userId/companionSessions/:sessionId/startedAt
// ----------------------------------------------------
router.post(['/companion-sessions', '/:userId/companionSessions/:sessionId/startedAt', '/companionSessions/:sessionId/startedAt'], mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: "Access denied: Unauthorized cross-account access" });
        }
        const targetUserId = access.targetUserId;
        const sessionId = req.params.sessionId || req.body.sessionId || `session_${Date.now()}`;
        const startedAt = req.body.startedAt ? new Date(req.body.startedAt) : new Date();

        const session = await CompanionSession.create({
            userId: targetUserId,
            sessionId,
            startedAt
        });

        return res.status(201).json({
            success: true,
            sessionId: session.sessionId,
            startedAt: session.startedAt
        });
    } catch (err) {
        console.error("Error creating companion session initiation:", err);
        return res.status(500).json({ error: "Failed to record session initiation" });
    }
});

// ----------------------------------------------------
// 3.5 Breathing & Grounding Session Completion Logging
// POST /api/home/breathing-sessions, POST /api/users/:userId/breathingSessions/:sessionId
// POST /api/home/grounding-sessions, POST /api/users/:userId/groundingSessions/:sessionId
// ----------------------------------------------------
router.post(['/breathing-sessions', '/:userId/breathingSessions/:sessionId', '/breathingSessions/:sessionId'], mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: "Access denied: Unauthorized cross-account access" });
        }
        const targetUserId = access.targetUserId;
        const sessionId = req.params.sessionId || req.body.sessionId || `breath_${Date.now()}`;
        const completedAt = req.body.completedAt ? new Date(req.body.completedAt) : new Date();
        const cycles = req.body.cycles || 4;
        const followedByGrounding = req.body.followedByGrounding !== undefined ? req.body.followedByGrounding : true;

        const session = await BreathingSession.create({
            userId: targetUserId,
            sessionId,
            completedAt,
            cycles,
            followedByGrounding
        });

        return res.status(201).json({
            success: true,
            sessionId: session.sessionId,
            completedAt: session.completedAt,
            cycles: session.cycles
        });
    } catch (err) {
        console.error("Error logging breathing session:", err);
        return res.status(500).json({ error: "Failed to log breathing session" });
    }
});

router.post(['/grounding-sessions', '/:userId/groundingSessions/:sessionId', '/groundingSessions/:sessionId'], mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: "Access denied: Unauthorized cross-account access" });
        }
        const targetUserId = access.targetUserId;
        const sessionId = req.params.sessionId || req.body.sessionId || `ground_${Date.now()}`;
        const completedAt = req.body.completedAt ? new Date(req.body.completedAt) : new Date();
        const technique = req.body.technique || "5-4-3-2-1";

        const session = await GroundingSession.create({
            userId: targetUserId,
            sessionId,
            completedAt,
            technique
        });

        return res.status(201).json({
            success: true,
            sessionId: session.sessionId,
            completedAt: session.completedAt,
            technique: session.technique
        });
    } catch (err) {
        console.error("Error logging grounding session:", err);
        return res.status(500).json({ error: "Failed to log grounding session" });
    }
});

// ----------------------------------------------------
// 4. AI-Generated Pattern Insight Line
// GET /api/home/insights/latest, GET /api/users/:userId/insights/latest
// ----------------------------------------------------
router.get(['/insights/latest', '/:userId/insights/latest'], mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: "Access denied: Unauthorized cross-account access" });
        }
        const targetUserId = access.targetUserId;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch last 30 days of dream logs
        const recentDreams = await Dream.find({
            userId: targetUserId,
            createdAt: { $gte: thirtyDaysAgo }
        }).sort({ createdAt: -1 });

        // Fetch last 30 days of check-ins
        const recentCheckIns = await DailyCheckIn.find({
            userId: targetUserId,
            timestamp: { $gte: thirtyDaysAgo }
        }).sort({ timestamp: -1 });

        // Check if we already have a freshly cached insight (< 24h old and same dream count)
        const cachedInsight = await LatestInsight.findOne({ userId: targetUserId });
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        if (cachedInsight && cachedInsight.generatedAt > oneDayAgo && cachedInsight.dreamCountAtGeneration === recentDreams.length) {
            return res.json({
                text: cachedInsight.text,
                generatedAt: cachedInsight.generatedAt
            });
        }

        // Build data summary for AI pattern analysis
        let generatedText = "";

        if (recentDreams.length === 0 && recentCheckIns.length === 0) {
            generatedText = "Welcome to your sanctuary. Log your dreams and complete evening check-ins to build personalized patterns over time.";
        } else if (recentDreams.length === 0 && recentCheckIns.length > 0) {
            const tenseCount = recentCheckIns.filter(c => c.bodyState === 'Tense' || c.mentalState === 'Overloaded').length;
            if (tenseCount > 0) {
                generatedText = `Body tension peaked across ${tenseCount} of recent check-ins before bedtime.`;
            } else {
                generatedText = "Regular somatic check-ins are sustaining calm nervous system rhythms.";
            }
        } else {
            // We have real dream logs! Let's analyze stressors, threats, and emotions
            const totalDreams = recentDreams.length;
            const distressDreams = recentDreams.filter(d =>
                (d.wakingPhysicalState || []).some(s => ['Tense', 'Shaky', 'Numb', 'Heavy', 'Drained'].includes(s)) ||
                (d.wakingEmotionalState || []).some(e => ['Anxious', 'Overwhelmed', 'Sad', 'Irritable'].includes(e))
            ).length;

            const stressorCounts = {};
            recentDreams.forEach(d => {
                (d.preSleepStressors || []).forEach(s => {
                    if (s && s !== 'Nothing unusual' && s !== 'Not sure') {
                        stressorCounts[s] = (stressorCounts[s] || 0) + 1;
                    }
                });
            });

            const topStressor = Object.keys(stressorCounts).sort((a, b) => stressorCounts[b] - stressorCounts[a])[0];
            const topStressorCount = topStressor ? stressorCounts[topStressor] : 0;

            const structuredSummary = `User has logged ${totalDreams} dreams in the past 30 days. Distressing dreams: ${distressDreams}. Top pre-sleep stressor: ${topStressor || 'None'} (appeared ${topStressorCount} times). Recent body states: ${recentCheckIns.map(c => c.bodyState).filter(Boolean).slice(0, 5).join(', ') || 'None'}.`;

            if (ai) {
                try {
                    const prompt = `Analyze this user's dream log data and identify one recurring behavioral or temporal pattern in under 15 words.\nData: ${structuredSummary}\nOutput ONLY the single pattern sentence, max 15 words, no quotes:`;
                    const result = await ai.models.generateContent({
                        model: 'gemini-flash-latest',
                        contents: prompt
                    });
                    if (result && result.text) {
                        generatedText = result.text.trim().replace(/^["']|["']$/g, '');
                    }
                } catch (aiErr) {
                    console.warn("HomeRoutes: Gemini call failed for pattern insight, using deterministic fallback:", aiErr.message);
                }
            }

            // Fallback if AI was unavailable or empty
            if (!generatedText) {
                if (topStressor && distressDreams > 0) {
                    generatedText = `${topStressor} appeared before ${topStressorCount} of ${distressDreams} distressing dreams.`;
                } else if (distressDreams > 0) {
                    generatedText = `Waking tension appeared in ${distressDreams} of ${totalDreams} recent dream entries.`;
                } else {
                    generatedText = `Lucid awareness increased steadily across ${totalDreams} recorded dream logs.`;
                }
            }
        }

        // Cache latest insight in DB
        const savedInsight = await LatestInsight.findOneAndUpdate(
            { userId: targetUserId },
            {
                $set: {
                    text: generatedText,
                    generatedAt: new Date(),
                    dreamCountAtGeneration: recentDreams.length
                }
            },
            { returnDocument: 'after', upsert: true }
        );

        return res.json({
            text: savedInsight.text,
            generatedAt: savedInsight.generatedAt
        });
    } catch (err) {
        console.error("Error generating pattern insight:", err);
        return res.status(500).json({ error: "Failed to generate insight" });
    }
});

// ----------------------------------------------------
// 5. Optional Body Check / Biometrics Last BPM
// GET /api/home/biometrics/lastBPM, GET /api/users/:userId/biometrics/lastBPM
// ----------------------------------------------------
router.get(['/biometrics/lastBPM', '/:userId/biometrics/lastBPM'], mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: "Access denied: Unauthorized cross-account access" });
        }
        const targetUserId = access.targetUserId;
        const lastLog = await HeartRateLog.findOne({
            userId: targetUserId,
            quality: 'valid'
        }).sort({ createdAt: -1 });

        if (!lastLog) {
            return res.json({
                value: null,
                measuredAt: null
            });
        }

        return res.json({
            value: lastLog.bpm,
            measuredAt: lastLog.createdAt
        });
    } catch (err) {
        console.error("Error fetching last BPM:", err);
        return res.status(500).json({ error: "Failed to fetch last BPM" });
    }
});

// ----------------------------------------------------
// 6. Inline Thought Reframing (Preserved existing feature)
// POST /api/home/quick-thought
// ----------------------------------------------------
router.post('/quick-thought', mockAuth, async (req, res) => {
    try {
        const { thought } = req.body;

        if (!thought || typeof thought !== 'string' || !thought.trim()) {
            return res.status(400).json({ error: "Thought text is required" });
        }

        const cleanThought = thought.trim();
        const isCrisis = containsCrisisLanguage ? containsCrisisLanguage(cleanThought) : false;

        if (isCrisis) {
            return res.json({
                flagged: true,
                crisisResources: {
                    text: "Text HOME to 741741",
                    call: "988",
                    safetyPlanRoute: "/safety-plan"
                }
            });
        }

        const reframeData = await generateReframe(cleanThought);
        const primaryDistortion = (reframeData.distortions && reframeData.distortions.length > 0)
            ? reframeData.distortions[0]
            : "Cognitive Distortion";

        return res.json({
            flagged: false,
            distortion: primaryDistortion,
            distortions: reframeData.distortions || [],
            reframe: reframeData.reframe || ""
        });
    } catch (err) {
        console.error("Error in /api/home/quick-thought:", err);
        return res.status(500).json({ error: "Failed to process thought reframe" });
    }
});

// ----------------------------------------------------
// 7. Micro-tasks (Preserved existing feature)
// GET /api/home/micro-tasks
// ----------------------------------------------------
router.get('/micro-tasks', async (req, res) => {
    try {
        const tasks = await MicroTask.find().sort({ createdAt: -1 }).limit(10);
        res.json(tasks);
    } catch (err) {
        console.error("Error fetching micro-tasks for home:", err);
        res.status(500).json({ error: "Failed to fetch micro-tasks" });
    }
});

module.exports = router;
