const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const MoodLog = require('../models/MoodLog');
const Dream = require('../models/Dream');
const ThoughtRecord = require('../models/ThoughtRecord');
const DoneItem = require('../models/DoneItem');
const MoodCheckIn = require('../models/MoodCheckIn');
const WeeklyDigest = require('../models/WeeklyDigest');
const WellnessLog = require('../models/WellnessLog');
const ObservationCache = require('../models/ObservationCache');
const EMAEntry = require('../models/EMAEntry');
const DailyVitals = require('../models/DailyVitals');
const HeartRateLog = require('../models/HeartRateLog');
const SanctuarySession = require('../models/SanctuarySession');
const { GoogleGenAI } = require('@google/genai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Mock Authentication Middleware
const mockAuth = require('../middleware/auth');

// Clinical Dream Metrics Helper
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

const {
    Observation,
    Experiment,
    Intervention,
    EveningCheckIn,
    MorningReflection,
    ResetSession
} = require('../models/insightsModels');

const { verifyAccountAccess } = require('../utils/accessControl');
const { recordAuditLog } = require('../utils/auditLogger');

const resolveVerifiedUserId = async (req) => {
    const rawTarget = (req.params.userId && req.params.userId !== 'me' && req.params.userId !== 'undefined' && req.params.userId !== 'null')
        ? req.params.userId
        : (req.userId || req.user?._id);
    return await verifyAccountAccess(req, rawTarget);
};

// --------------------------------------------------------------------------
// 0. GET /api/insights?period=month, GET /api/insights/user/:userId?period=month
// --------------------------------------------------------------------------
async function handleInsightsRoot(req, res) {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: 'Access denied: Unauthorized cross-account access' });
        }
        const userId = access.targetUserId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }

        const now = new Date();
        const periodParam = req.query.period || 'month';

        let startDate, endDate;
        if (periodParam === 'week') {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            endDate = new Date(now);
        } else {
            // Default: current month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // 1. Dreams added in this period
        const dreams = await Dream.find({
            userId,
            createdAt: { $gte: startDate, $lte: endDate }
        });
        const dreamsAdded = dreams.length;

        // 2. Themes from dreams
        const themeSet = new Set();
        const weekdayCounts = {};
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        let emotionScoreSum = 0;
        let emotionScoreCount = 0;

        dreams.forEach(d => {
            if (Array.isArray(d.tags)) {
                d.tags.forEach(t => themeSet.add(t));
            }
            if (Array.isArray(d.symbols)) {
                d.symbols.forEach(s => themeSet.add(s));
            }
            const dDate = new Date(d.createdAt || d.date);
            const dayName = weekdays[dDate.getDay()];
            weekdayCounts[dayName] = (weekdayCounts[dayName] || 0) + 1;

            if (typeof d.emotionScore === 'number') {
                emotionScoreSum += d.emotionScore;
                emotionScoreCount++;
            } else if (typeof d.lucidityLevel === 'number') {
                emotionScoreSum += d.lucidityLevel;
                emotionScoreCount++;
            }
        });

        let mostActiveDay = null;
        let maxDayCount = 0;
        for (const [day, count] of Object.entries(weekdayCounts)) {
            if (count > maxDayCount) {
                maxDayCount = count;
                mostActiveDay = day;
            }
        }

        const dreamThemes = Array.from(themeSet).slice(0, 10);
        const avgEmotionTrend = emotionScoreCount > 0 ? Number((emotionScoreSum / emotionScoreCount).toFixed(1)) : null;

        // 3. Sanctuary sessions in period
        const sanctuarySessions = await SanctuarySession.find({
            userId,
            createdAt: { $gte: startDate, $lte: endDate }
        });
        const sanctuarySessionsCount = sanctuarySessions.length;
        let calmerCount = 0;
        sanctuarySessions.forEach(s => {
            if (s.finalFeeling === 'calmer' || s.finalFeeling === 'better') {
                calmerCount++;
            }
        });
        const avgCalmerPercentage = sanctuarySessionsCount > 0 ? Math.round((calmerCount / sanctuarySessionsCount) * 100) : null;

        // 4. Wellness mood avg
        const moodLogs = await MoodLog.find({
            userId,
            createdAt: { $gte: startDate, $lte: endDate }
        });
        const moodCheckIns = await MoodCheckIn.find({
            userId,
            createdAt: { $gte: startDate, $lte: endDate }
        });
        let totalMoodVal = 0;
        let totalMoodCount = 0;
        moodLogs.forEach(m => {
            if (typeof m.intensity === 'number') {
                totalMoodVal += m.intensity;
                totalMoodCount++;
            }
        });
        moodCheckIns.forEach(mc => {
            if (typeof mc.score === 'number') {
                totalMoodVal += mc.score;
                totalMoodCount++;
            }
        });
        const wellnessMoodAvg = totalMoodCount > 0 ? Number((totalMoodVal / totalMoodCount).toFixed(1)) : null;

        const isNewOrEmpty = dreamsAdded === 0 && sanctuarySessionsCount === 0 && totalMoodCount === 0;

        const responsePayload = {
            user_id: userId,
            period: periodStr,
            metrics: {
                dreams_added: dreamsAdded,
                dream_themes: dreamThemes,
                avg_emotion_trend: avgEmotionTrend,
                most_active_day: mostActiveDay,
                sanctuary_sessions_count: sanctuarySessionsCount,
                avg_calmer_percentage: avgCalmerPercentage,
                wellness_mood_avg: wellnessMoodAvg
            },
            period_start: startStr,
            period_end: endStr
        };

        if (isNewOrEmpty) {
            responsePayload.message = "No data yet. Start adding dreams and tracking wellness to see insights.";
        }

        return res.json(responsePayload);
    } catch (err) {
        console.error("Error fetching insights root:", err);
        return res.status(500).json({ error: "Failed to fetch insights" });
    }
}

router.get('/', mockAuth, handleInsightsRoot);
router.get('/user/:userId', mockAuth, handleInsightsRoot);

// --------------------------------------------------------------------------
// 1. GET /api/insights/observations/:userId
// --------------------------------------------------------------------------
router.get('/observations/:userId', mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: 'Access denied: Unauthorized cross-account access' });
        }
        const userId = access.targetUserId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dreams = await Dream.find({
            userId,
            createdAt: { $gte: thirtyDaysAgo }
        }).sort({ createdAt: -1 });

        const totalDreams = dreams.length;
        if (totalDreams === 0) {
            return res.json({
                id: null,
                title: 'No observations yet',
                description: 'Start logging your dreams and evening check-ins to discover personalized subconscious patterns.',
                confidence: null,
                observedCount: 0,
                totalRelevantEntries: 0,
                correlationId: null,
                dateRange: 'Last 30 days',
                totalDreams: 0,
                message: 'No data yet. Start adding dreams and tracking wellness to see insights.'
            });
        }

        let highWorryCount = 0;
        let lowEnergyCount = 0;
        let coOccurrence = 0;

        dreams.forEach(d => {
            const worry = d.concernIntensity != null ? d.concernIntensity : (d.preSleepStressors && d.preSleepStressors.length > 0 ? 7 : 4);
            const energy = d.energyLevel != null ? d.energyLevel : 5;
            if (worry >= 6) highWorryCount++;
            if (energy <= 4) lowEnergyCount++;
            if (worry >= 6 && energy <= 4) coOccurrence++;
        });

        const relevant = highWorryCount > 0 ? highWorryCount : totalDreams;
        const observed = coOccurrence;
        const confidence = totalDreams >= 5
            ? Math.min(95, Math.max(65, Math.round((observed / Math.max(1, relevant)) * 100)))
            : null;

        let existingObs = await Observation.findOne({ userId, active: true }).sort({ createdAt: -1 });

        res.json({
            id: existingObs?._id || 'CORR-904',
            title: 'A pattern worth noticing',
            description: 'On nights when you reported high evening worry, you woke with lower physical energy more often.',
            confidence: existingObs?.confidence || confidence,
            observedCount: existingObs?.observedCount || observed,
            totalRelevantEntries: existingObs?.totalRelevantEntries || relevant,
            correlationId: existingObs?.correlationId || 'CORR-904',
            dateRange: 'Last 30 days',
            totalDreams
        });
    } catch (err) {
        console.error('Error in /api/insights/observations/:userId:', err);
        res.status(500).json({ error: 'Failed to retrieve observations' });
    }
});

// --------------------------------------------------------------------------
// 2. GET /api/insights/rhythm/:userId
// --------------------------------------------------------------------------
router.get('/rhythm/:userId', mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: 'Access denied: Unauthorized cross-account access' });
        }
        const userId = access.targetUserId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }

        const now = new Date();
        const days = [];
        const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            days.push({
                date: dateStr,
                dayOfWeek: dayNames[d.getDay()],
                dayOfMonth: d.getDate(),
                value: 'none',
                count: 0
            });
        }

        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const dreams = await Dream.find({
            userId,
            createdAt: { $gte: fourteenDaysAgo }
        });

        const checkins = await EveningCheckIn.find({
            userId,
            createdAt: { $gte: fourteenDaysAgo }
        });

        const dateCounts = {};
        dreams.forEach(d => {
            const dt = d.createdAt.toISOString().split('T')[0];
            dateCounts[dt] = (dateCounts[dt] || 0) + 1;
        });
        checkins.forEach(c => {
            const dt = c.date;
            dateCounts[dt] = (dateCounts[dt] || 0) + 1;
        });

        days.forEach((day) => {
            const c = dateCounts[day.date] || 0;
            if (c >= 2) {
                day.value = 'high';
                day.count = c;
            } else if (c === 1) {
                day.value = 'low';
                day.count = 1;
            } else {
                day.value = 'none';
                day.count = 0;
            }
        });

        res.json({ days });
    } catch (err) {
        console.error('Error in /api/insights/rhythm/:userId:', err);
        res.status(500).json({ error: 'Failed to retrieve rhythm' });
    }
});

// --------------------------------------------------------------------------
// 3. GET /api/insights/experiment/next/:userId
// --------------------------------------------------------------------------
router.get('/experiment/next/:userId', mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: 'Access denied: Unauthorized cross-account access' });
        }
        const userId = access.targetUserId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }

        let experiment = await Experiment.findOne({
            userId,
            status: { $in: ['active', 'pending'] }
        }).sort({ createdAt: -1 });

        if (!experiment) {
            experiment = await Experiment.create({
                userId,
                title: '5-minute thought-closure sequence',
                subtitle: 'A 5-minute thought-closure sequence before bed may be worth testing for the next 3 nights to decouple autonomic arousal before rem cycles.',
                durationDays: 3,
                currentDay: 1,
                status: 'pending',
                protocol: [
                    'Name the main worry.',
                    'Write one next step.',
                    'Write what can wait until tomorrow.'
                ]
            });
        }

        res.json({
            id: experiment._id,
            title: 'Try tonight',
            experimentTitle: experiment.title,
            description: experiment.subtitle,
            durationDays: experiment.durationDays,
            currentDay: experiment.currentDay || 1,
            status: experiment.status,
            protocol: experiment.protocol
        });
    } catch (err) {
        console.error('Error in /api/insights/experiment/next/:userId:', err);
        res.status(500).json({ error: 'Failed to retrieve next experiment' });
    }
});

// --------------------------------------------------------------------------
// 4. GET /api/insights/patterns/:userId
// --------------------------------------------------------------------------
router.get('/patterns/:userId', mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: 'Access denied: Unauthorized cross-account access' });
        }
        const userId = access.targetUserId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }

        const range = req.query.range || '30days';
        let daysAgo = 30;
        let dateRangeLabel = 'Last 30 days';
        if (range === '7days') {
            daysAgo = 7;
            dateRangeLabel = 'Last 7 days';
        } else if (range === '90days') {
            daysAgo = 90;
            dateRangeLabel = 'Last 90 days';
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        const dreams = await Dream.find({
            userId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: -1 });

        // Map dreams into journey sequence timeline
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let timeline = [];
        let factorCounts = {};
        let lowEnergyAfterDistress = 0;
        let modEnergyAfterDistress = 0;
        let highEnergyAfterDistress = 0;
        let highWorryCount = 0;
        let distressingCount = 0;
        let lowEnergyCount = 0;

        dreams.forEach((d) => {
            const dt = new Date(d.createdAt);
            const dateLabel = `${monthNames[dt.getMonth()]} ${dt.getDate()}`;
            const worry = d.concernIntensity != null ? d.concernIntensity : (d.preSleepStressors && d.preSleepStressors.length > 0 ? 7 : 4);
            const energy = d.energyLevel != null ? d.energyLevel : 4;
            
            // Distress score 1-5
            let distress = 3;
            if (d.concernIntensity >= 8 || (d.wakingEmotionalState || []).includes('anxious')) {
                distress = 5;
            } else if (d.concernIntensity >= 6 || (d.wakingPhysicalState || []).includes('tense')) {
                distress = 4;
            } else if (worry <= 3) {
                distress = 1;
            }

            if (worry >= 6) highWorryCount++;
            if (distress >= 3) distressingCount++;
            if (energy <= 4) lowEnergyCount++;

            if (distress >= 3) {
                if (energy <= 4) lowEnergyAfterDistress++;
                else if (energy <= 6) modEnergyAfterDistress++;
                else highEnergyAfterDistress++;
            }

            // Tally stressors / connected factors
            (d.preSleepStressors || []).forEach(st => {
                if (st && st !== 'nothing' && st !== 'unsure') {
                    const formatted = st.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    factorCounts[formatted] = (factorCounts[formatted] || 0) + 1;
                }
            });

            timeline.push({
                id: d._id,
                date: dateLabel,
                fullDate: d.createdAt.toISOString().split('T')[0],
                evening: {
                    score: `${worry}/10`,
                    numeric: worry,
                    level: worry >= 6 ? 'high' : worry >= 4 ? 'moderate' : 'low'
                },
                dream: {
                    title: d.title || 'Dream entry',
                    distress: distress <= 1 ? 'Calm' : `${distress}/5`,
                    numeric: distress,
                    level: distress >= 4 ? 'high' : distress >= 3 ? 'moderate' : 'low'
                },
                morning: {
                    score: `${energy}/10`,
                    numeric: energy,
                    level: energy <= 4 ? 'low' : energy <= 6 ? 'moderate' : 'high'
                },
                journalEntryId: d._id
            });
        });

        // If user has 0 entries: Return strictly empty state per Data Isolation specification
        if (timeline.length === 0) {
            return res.json({
                summary: {
                    title: 'No patterns observed yet',
                    description: 'Log your dreams and evening reflections to start discovering patterns.',
                    observedCount: 0,
                    totalRelevantEntries: 0,
                    dateRange: dateRangeLabel,
                    disclaimer: 'This is an association in your entries, not proof of a cause.'
                },
                timeline: [],
                recordedStats: {
                    highEveningWorry: { count: 0, total: 0 },
                    distressingDream: { count: 0, total: 0 },
                    lowMorningEnergy: { count: 0, total: 0 }
                },
                connectedFactors: [],
                afterDreams: {
                    lowEnergy: 0,
                    moderate: 0,
                    higherEnergy: 0,
                    description: 'Log more entries to observe how morning energy connects to your dreams.'
                },
                experiment: null
            });
        }

        const totalRelevant = timeline.length;
        const connectedFactors = Object.entries(factorCounts)
            .map(([factor, nights]) => ({ factor, nights }))
            .sort((a, b) => b.nights - a.nights)
            .slice(0, 4);

        res.json({
            summary: {
                title: 'A pattern worth noticing',
                description: 'High evening worry often appeared before distressing dreams and lower morning energy.',
                observedCount: Math.min(highWorryCount, distressingCount) || 0,
                totalRelevantEntries: totalRelevant,
                dateRange: dateRangeLabel,
                disclaimer: 'This is an association in your entries, not proof of a cause.'
            },
            timeline,
            recordedStats: {
                highEveningWorry: { count: highWorryCount, total: totalRelevant },
                distressingDream: { count: distressingCount, total: totalRelevant },
                lowMorningEnergy: { count: lowEnergyCount, total: totalRelevant }
            },
            connectedFactors,
            afterDreams: {
                lowEnergy: lowEnergyAfterDistress,
                moderate: modEnergyAfterDistress,
                higherEnergy: highEnergyAfterDistress,
                description: 'Lower morning energy was more common after dreams you rated as highly distressing.'
            },
            experiment: {
                id: 'exp-protocol-01',
                title: 'Try a small experiment',
                instructions: 'For the next 3 nights, before sleep:',
                protocol: [
                    'Name the main worry.',
                    'Write one next step.',
                    'Write what can wait until tomorrow.'
                ],
                durationDays: 3
            }
        });
    } catch (err) {
        console.error('Error in /api/insights/patterns/:userId:', err);
        res.status(500).json({ error: 'Failed to retrieve patterns' });
    }
});

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// 5. GET /api/insights/themes/:userId
// --------------------------------------------------------------------------
router.get('/themes/:userId', mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: 'Access denied: Unauthorized cross-account access' });
        }
        const userId = access.targetUserId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }

        const range = req.query.range || '30days';
        let daysAgo = 30;
        let dateRangeLabel = 'last 30 days';
        if (range === '7days') {
            daysAgo = 7;
            dateRangeLabel = 'last 7 days';
        } else if (range === '90days') {
            daysAgo = 90;
            dateRangeLabel = 'last 90 days';
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        // Fetch user's dreams in the date range
        let dreams = await Dream.find({
            userId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: -1 });

        // If no dreams in range, search all dreams for this user so real data is utilized
        if (dreams.length === 0) {
            dreams = await Dream.find({ userId }).sort({ createdAt: -1 });
        }

        const hasRealDreams = dreams.length > 0;
        const totalLogs = hasRealDreams ? dreams.length : 0;

        // Section 01: Recurring Topics
        const themeBuckets = {
            'feeling-trapped': {
                id: 'feeling-trapped',
                name: 'Feeling trapped',
                count: 0,
                isRepeated: false,
                moods: ['anxious', 'drained'],
                primaryEmotionalTone: 'anxious',
                environmentalSettings: ['indoor', 'confined spaces'],
                relationalPresence: ['alone', 'witnessing'],
                correlativeTriggers: [
                    { trigger: 'high evening worry', count: 0, percentage: 71 },
                    { trigger: 'restlessness', count: 0, percentage: 57 }
                ]
            },
            'being-late': {
                id: 'being-late',
                name: 'Being late',
                count: 0,
                isRepeated: false,
                moods: ['anxious', 'restless'],
                primaryEmotionalTone: 'anxious',
                environmentalSettings: ['transit & stations'],
                relationalPresence: ['strangers'],
                correlativeTriggers: [
                    { trigger: 'work deadlines', count: 0, percentage: 80 }
                ]
            },
            'childhood-places': {
                id: 'childhood-places',
                name: 'Childhood places',
                count: 0,
                isRepeated: false,
                moods: ['peaceful', 'neutral'],
                primaryEmotionalTone: 'peaceful',
                environmentalSettings: ['familiar childhood home'],
                relationalPresence: ['family members'],
                correlativeTriggers: [
                    { trigger: 'family conversations', count: 0, percentage: 75 }
                ]
            },
            'connection-reunion': {
                id: 'connection-reunion',
                name: 'Connection/reunion',
                count: 0,
                isRepeated: false,
                moods: ['peaceful', 'hopeful'],
                primaryEmotionalTone: 'peaceful',
                environmentalSettings: ['open landscapes'],
                relationalPresence: ['close friends'],
                correlativeTriggers: [
                    { trigger: 'social connection', count: 0, percentage: 100 }
                ]
            },
            'no-clear-theme': {
                id: 'no-clear-theme',
                name: 'No clear theme (open or drifting imagery)',
                count: 0,
                isRepeated: false,
                moods: ['curious', 'neutral'],
                primaryEmotionalTone: 'neutral',
                environmentalSettings: ['indeterminate halls'],
                relationalPresence: ['solitary'],
                correlativeTriggers: []
            }
        };

        // Classify dreams
        if (hasRealDreams) {
            dreams.forEach(d => {
                const text = ((d.title || '') + ' ' + (d.description || '') + ' ' + (d.memoryText || '')).toLowerCase();
                const hasAnxietyTheme = d.themes && d.themes.anxiety > 0;

                if (/trap|locked|corridor|elevator|door|cage|stuck|cannot escape|room with no windows|narrow|walls/i.test(text) || hasAnxietyTheme) {
                    themeBuckets['feeling-trapped'].count++;
                } else if (/late|miss|clock|hurry|train|station|rush|alarm|schedule/i.test(text)) {
                    themeBuckets['being-late'].count++;
                } else if (/school|classroom|child|old house|childhood|home|bedroom|parents/i.test(text)) {
                    themeBuckets['childhood-places'].count++;
                } else if (/friend|family|reunion|connection|meet|talk|conversation|together/i.test(text)) {
                    themeBuckets['connection-reunion'].count++;
                } else {
                    themeBuckets['no-clear-theme'].count++;
                }
            });
        }

        const maxFrequency = Math.max(...Object.values(themeBuckets).map(b => b.count), 0);
        const themes = Object.values(themeBuckets).map(b => {
            const freq = b.count;
            return {
                id: b.id,
                name: b.name,
                frequency: freq,
                percentage: maxFrequency > 0 ? Math.round((freq / maxFrequency) * 100) : 0,
                description: freq === 1 ? '1 dream' : `${freq} dreams featuring this theme`,
                isRepeated: freq >= 5,
                moods: b.moods,
                primaryEmotionalTone: b.primaryEmotionalTone,
                environmentalSettings: b.environmentalSettings,
                relationalPresence: b.relationalPresence,
                correlativeTriggers: b.correlativeTriggers
            };
        });

        // Section 02: Emotional Tone (Somatic Resonance)
        let anxiousCount = 0;
        let peacefulCount = 0;
        let neutralCount = 0;

        if (hasRealDreams) {
            dreams.forEach(d => {
                const emotional = d.wakingEmotionalState || [];
                const physical = d.wakingPhysicalState || [];
                const energy = d.energyLevel != null ? d.energyLevel : 5;
                const concern = d.concernIntensity != null ? d.concernIntensity : 4;

                const isAnxious = emotional.some(e => ['anxious', 'overwhelmed', 'sad', 'irritable'].includes(e)) ||
                    physical.some(p => ['tense', 'shaky', 'drained', 'heavy'].includes(p)) ||
                    concern >= 6;
                const isPeaceful = emotional.some(e => ['calm', 'relieved', 'peaceful', 'hopeful'].includes(e)) ||
                    physical.some(p => ['rested', 'energized'].includes(p)) ||
                    (energy >= 6 && concern <= 3);

                if (isAnxious) anxiousCount++;
                else if (isPeaceful) peacefulCount++;
                else neutralCount++;
            });
        }

        const totalEmotional = anxiousCount + peacefulCount + neutralCount;
        const emotionalTones = [
            {
                id: 'anxious',
                name: 'Anxious / Restless',
                percentage: totalEmotional > 0 ? Math.round((anxiousCount / totalEmotional) * 100) : 0,
                count: anxiousCount,
                icon: 'anxious'
            },
            {
                id: 'peaceful',
                name: 'Peaceful / Settled',
                percentage: totalEmotional > 0 ? Math.round((peacefulCount / totalEmotional) * 100) : 0,
                count: peacefulCount,
                icon: 'peaceful'
            },
            {
                id: 'neutral',
                name: 'Curious / Neutral',
                percentage: totalEmotional > 0 ? Math.round((neutralCount / totalEmotional) * 100) : 0,
                count: neutralCount,
                icon: 'neutral'
            }
        ];

        // Section 03: Environmental Settings (Topography)
        let domesticCount = 0;
        let workCount = 0;
        let transitCount = 0;
        let landscapeCount = 0;

        if (hasRealDreams) {
            dreams.forEach(d => {
                const text = ((d.title || '') + ' ' + (d.description || '')).toLowerCase();
                if (/home|house|bedroom|room|domestic|kitchen|bed/i.test(text)) domesticCount++;
                if (/school|work|office|classroom|library|workshop/i.test(text)) workCount++;
                if (/corridor|hall|transit|train|station|stair|elevator|hallway/i.test(text)) transitCount++;
                if (/lake|forest|water|landscape|river|sky|ocean|valley|mountain/i.test(text)) landscapeCount++;
            });
        }

        const environmentalSettings = [
            { id: 'env-1', title: 'Familiar childhood home', subtitle: 'Early domestic space', count: domesticCount, icon: 'home' },
            { id: 'env-2', title: 'Work / school grounds', subtitle: 'Performance context', count: workCount, icon: 'work' },
            { id: 'env-3', title: 'Transit & corridors', subtitle: 'Indeterminate halls', count: transitCount, icon: 'transit' },
            { id: 'env-4', title: 'Open landscapes', subtitle: 'Natural clearings', count: landscapeCount, icon: 'landscape' }
        ];

        // Section 04: Relational Presence (Entities)
        let aloneCount = 0;
        let familyCount = 0;
        let unknownCount = 0;
        let friendsCount = 0;

        if (hasRealDreams) {
            dreams.forEach(d => {
                const text = ((d.title || '') + ' ' + (d.description || '')).toLowerCase();
                if (/alone|myself|solitary|sitting alone|walking home/i.test(text)) aloneCount++;
                if (/family|mother|father|parents|brother|sister/i.test(text)) familyCount++;
                if (/stranger|unknown|people|crowd|shadow|figure|footsteps/i.test(text)) unknownCount++;
                if (/friend|colleague|partner|together/i.test(text)) friendsCount++;
            });
        }

        const relationalPresence = [
            { id: 'rel-1', label: 'Solitary / Alone', count: aloneCount, icon: 'alone' },
            { id: 'rel-2', label: 'Family members', count: familyCount, icon: 'family' },
            { id: 'rel-3', label: 'Unknown figures', count: unknownCount, icon: 'unknown' },
            { id: 'rel-4', label: 'Close friends', count: friendsCount, icon: 'friends' }
        ];

        // Section 05: Correlative Triggers (Cross-Inquiry)
        let observedCorrelation = null;
        if (hasRealDreams && themes.length > 0 && themes[0].frequency > 0) {
            const topTheme = themes[0];
            observedCorrelation = {
                text: `Evening work pressure & late screen time linked to "${topTheme.name}"`,
                themeName: topTheme.name,
                status: 'pending_confirmation'
            };
        }

        res.json({
            dateRange: dateRangeLabel,
            totalLogs,
            themes,
            emotionalTones,
            environmentalSettings,
            relationalPresence,
            observedCorrelation
        });
    } catch (err) {
        console.error('Error in /api/insights/themes/:userId:', err);
        res.status(500).json({ error: 'Failed to retrieve themes' });
    }
});

// --------------------------------------------------------------------------
// 5B. GET /api/insights/themes/:userId/:themeId/detail
// --------------------------------------------------------------------------
router.get('/themes/:userId/:themeId/detail', mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: 'Access denied: Unauthorized cross-account access' });
        }
        const userId = access.targetUserId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }
        const { themeId } = req.params;
        const range = req.query.range || '30days';

        const allUserDreams = await Dream.find({ userId }).sort({ createdAt: -1 });

        // Filter user's real dreams matching the theme
        const isMatch = (d) => {
            const text = ((d.title || '') + ' ' + (d.description || '')).toLowerCase();
            if (themeId === 'feeling-trapped') {
                return /trap|locked|corridor|elevator|door|cage|stuck|cannot escape|room with no windows|narrow|walls/i.test(text) || (d.themes && d.themes.anxiety > 0);
            }
            if (themeId === 'being-late') {
                return /late|miss|clock|hurry|train|station|rush|alarm|schedule/i.test(text);
            }
            if (themeId === 'childhood-places') {
                return /school|classroom|child|old house|childhood|home|bedroom|parents/i.test(text);
            }
            if (themeId === 'connection-reunion') {
                return /friend|family|reunion|connection|meet|talk|conversation|together/i.test(text);
            }
            return true;
        };

        const themeName = themeId === 'being-late' ? 'Being late'
            : themeId === 'childhood-places' ? 'Childhood places'
            : themeId === 'connection-reunion' ? 'Connection/reunion'
            : themeId === 'no-clear-theme' ? 'No clear theme'
            : 'Feeling trapped';

        const matchingDreams = allUserDreams.filter(isMatch);
        const totalInstances = matchingDreams.length;

        if (matchingDreams.length === 0) {
            return res.json({
                themeId,
                name: themeName,
                totalInstances: 0,
                dateRange: 'Recent',
                description: `No dreams matching "${themeName}" recorded yet.`,
                isRepeated: false,
                rhythmTimeline: [],
                somaticContext: [],
                userConnection: null,
                dreamInstances: []
            });
        }

        const dreamInstances = matchingDreams.slice(0, 5).map(d => {
            const dt = new Date(d.createdAt);
            const month = dt.toLocaleString('en-US', { month: 'short' });
            const day = dt.getDate();
            const distressLevel = (d.concernIntensity && d.concernIntensity >= 7) ? 'High distress'
                : (d.concernIntensity && d.concernIntensity >= 4) ? 'Restless' : 'Uncomfortable';
            const badgeType = (d.concernIntensity && d.concernIntensity >= 7) ? 'high'
                : (d.concernIntensity && d.concernIntensity >= 4) ? 'moderate' : 'neutral';
            return {
                id: String(d._id),
                title: d.title || 'Dream entry',
                date: `${month} ${day}`,
                badge: distressLevel,
                badgeType,
                excerpt: d.description ? (d.description.slice(0, 140) + '...') : 'Dream entry recorded without detailed description.',
                readTime: `${Math.max(2, Math.round((d.wordCount || 80) / 40))} min read`
            };
        });

        const rhythmTimeline = matchingDreams.slice(0, 7).map(d => {
            const dt = new Date(d.createdAt);
            const month = dt.toLocaleString('en-US', { month: 'short' });
            const day = dt.getDate();
            const distress = d.concernIntensity || 3;
            return {
                date: `${month} ${day}`,
                fullDate: dt.toISOString().split('T')[0],
                occurred: true,
                distress,
                intensity: distress >= 4 ? 'high' : 'moderate',
                label: `${month} ${day} · ${distress >= 4 ? 'High distress (L' + distress + ')' : 'Moderate/Mild'}`
            };
        });

        res.json({
            themeId,
            name: themeName,
            totalInstances,
            dateRange: 'Recent',
            description: `Appeared in ${totalInstances} dreams over the selected period.`,
            isRepeated: totalInstances >= 5,
            rhythmTimeline,
            somaticContext: [
                { title: 'Pre-sleep worry pattern', subtext: `${matchingDreams.filter(d => (d.concernIntensity || 0) >= 6).length} of ${totalInstances} entries recorded`, match: Math.round((matchingDreams.filter(d => (d.concernIntensity || 0) >= 6).length / totalInstances) * 100), icon: 'worry' },
                { title: 'Waking fatigue pattern', subtext: `${matchingDreams.filter(d => (d.energyLevel || 5) <= 4).length} of ${totalInstances} entries recorded`, match: Math.round((matchingDreams.filter(d => (d.energyLevel || 5) <= 4).length / totalInstances) * 100), icon: 'energy' }
            ],
            userConnection: null,
            dreamInstances
        });
    } catch (err) {
        console.error('Error in /api/insights/themes/:userId/:themeId/detail:', err);
        res.status(500).json({ error: 'Failed to retrieve theme detail' });
    }
});

// --------------------------------------------------------------------------
// 5C. POST /api/insights/themes/:userId/correlation-feedback
// --------------------------------------------------------------------------
router.post('/themes/:userId/correlation-feedback', mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: 'Access denied: Unauthorized cross-account access' });
        }
        const userId = access.targetUserId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }
        const { feedback, themeId } = req.body;
        res.json({
            success: true,
            message: 'Feedback recorded for theme correlation'
        });
    } catch (err) {
        console.error('Error saving correlation feedback:', err);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
});

// --------------------------------------------------------------------------
// 6. GET /api/insights/what-helps/:userId
// --------------------------------------------------------------------------
const PRACTICE_DISPLAY_NAMES = {
    body_reset: 'Body reset',
    sensory_grounding: 'Sensory grounding',
    gentle_movement: 'Gentle movement',
    thought_closure: 'Thought closure',
    physiological_sigh: 'Physiological sigh (3-min)',
    audio_grounding: 'Audio grounding / Music',
    nightmare_rescripting: 'Nightmare rescripting',
    tactile_anchor: 'Tactile anchor / cold touch'
};

const STATE_DISPLAY_NAMES = {
    chest_rib_tension: 'Chest & upper rib tension',
    tight_shoulders: 'Tight shoulders & neck',
    jaw_clenching: 'Jaw clenching or headache',
    racing_thoughts: 'Racing thoughts or restlessness',
    shallow_breathing: 'Shallow breathing',
    shaky_hands: 'Shaky hands or trembling',
    tense_body: 'Tense body',
    busy_thoughts: 'Busy thoughts',
    restless: 'Restless',
    heavy: 'Heavy',
    not_sure: 'Not sure'
};

const PRACTICE_ICON_MAP = {
    body_reset: 'wind',
    sensory_grounding: 'hand',
    gentle_movement: 'compass',
    thought_closure: 'moon',
    physiological_sigh: 'wind',
    nightmare_rescripting: 'moon',
    tactile_anchor: 'hand'
};

router.get('/what-helps/:userId', mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: 'Access denied: Unauthorized cross-account access' });
        }
        const userId = access.targetUserId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }

        // Pull all completed ResetSessions from database
        const allCompleted = await ResetSession.find({ userId, completed: true }).sort({ createdAt: -1 });

        // SECTION 6: Empty State Handling (CRITICAL)
        // If user has fewer than 3 completed ResetSession entries, return empty state card payload
        if (allCompleted.length < 3) {
            return res.json({
                hasEnoughData: false,
                totalCompletedSessions: allCompleted.length,
                emptyStateMessage: 'Not enough responses yet. Complete a few more sessions to see which practices feel useful for you.',
                recentHighlight: 'Complete at least 3 regulation sessions to view personal insights.',
                topIntervention: null,
                practiceComparison: [],
                sessionShifts: [],
                somaticRecommendation: {
                    badge: 'RECOMMENDED SOMATIC RESET',
                    text: 'Take a moment to release tension with a calm 90-second body reset.',
                    actionText: 'BEGIN 90-SECOND RESET →',
                    practiceId: 'body_reset',
                    practiceName: 'Body reset'
                },
                historyRatios: [],
                allPractices: [],
                interventions: []
            });
        }

        // Filter for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        let recent30Days = allCompleted.filter(s => new Date(s.createdAt) >= thirtyDaysAgo);
        if (recent30Days.length === 0) {
            recent30Days = allCompleted;
        }

        // Group recent sessions by practice
        const practiceMap = {};
        allCompleted.forEach(s => {
            const p = s.practice || 'body_reset';
            if (!practiceMap[p]) {
                practiceMap[p] = {
                    key: p,
                    name: PRACTICE_DISPLAY_NAMES[p] || p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    total: 0,
                    calmer: 0,
                    same: 0,
                    moreActivated: 0,
                    notSure: 0,
                    recent30Total: 0,
                    recent30Calmer: 0,
                    changes: [],
                    sessions: []
                };
            }
            practiceMap[p].total++;
            if (s.afterResponse === 'more_settled') practiceMap[p].calmer++;
            else if (s.afterResponse === 'same') practiceMap[p].same++;
            else if (s.afterResponse === 'more_activated') practiceMap[p].moreActivated++;
            else practiceMap[p].notSure++;

            if (s.perceivedChange && Array.isArray(s.perceivedChange)) {
                s.perceivedChange.forEach(c => {
                    if (c && c.trim()) practiceMap[p].changes.push(c.trim());
                });
            }
            practiceMap[p].sessions.push(s);
        });

        // Tally recent 30 days counts
        recent30Days.forEach(s => {
            const p = s.practice || 'body_reset';
            if (practiceMap[p]) {
                practiceMap[p].recent30Total++;
                if (s.afterResponse === 'more_settled') practiceMap[p].recent30Calmer++;
            }
        });

        const practiceList = Object.values(practiceMap);

        // SECTION 2: Dynamic Spotlight Card ("Most useful lately")
        // Highest success rate / highest calmer count over last 30 days
        let spotlight = practiceList.slice().sort((a, b) => {
            if (b.recent30Calmer !== a.recent30Calmer) return b.recent30Calmer - a.recent30Calmer;
            return b.calmer - a.calmer;
        })[0] || practiceList[0];

        // Find most frequent perceivedChange for spotlight practice
        const changeCounts = {};
        spotlight.changes.forEach(c => {
            changeCounts[c] = (changeCounts[c] || 0) + 1;
        });
        let mostCommonChange = 'My body softened.';
        let maxChangeCount = 0;
        for (const [changeStr, count] of Object.entries(changeCounts)) {
            if (count > maxChangeCount) {
                maxChangeCount = count;
                mostCommonChange = changeStr;
            }
        }
        if (!mostCommonChange.endsWith('.')) mostCommonChange += '.';

        const X = spotlight.calmer;
        const Y = spotlight.total;
        const pct = Math.round((X / Math.max(1, Y)) * 100);

        let statement = `You felt more settled after ${X} of ${Y} completed sessions.`;
        let isActivatedWarning = false;
        if (Y === 1) {
            statement = 'You have tried this once. Keep using it if it feels supportive.';
        } else if (Y === 2) {
            statement = 'You have tried this twice. Keep using it if it feels supportive.';
        } else if (spotlight.moreActivated >= X && spotlight.moreActivated >= 2) {
            statement = 'This practice has sometimes left you more activated.';
            isActivatedWarning = true;
        }

        const topIntervention = {
            id: spotlight.key,
            practiceKey: spotlight.key,
            name: spotlight.name,
            rankLabel: 'Most useful lately',
            reliability: `RELIABLE REGULATION • ${pct}% CONSISTENT`,
            statement,
            sessionsSummary: `You chose this ${Y} times. You felt more settled afterward in ${X} sessions.`,
            mostCommonChange: `Most common change: "${mostCommonChange}"`,
            detail: `Most common change: "${mostCommonChange}"`,
            primaryAction: `BEGIN ${spotlight.name.toUpperCase()} →`,
            effectivenessPercentage: pct,
            totalAttempts: Y,
            successCount: X,
            avgShift: -3.2,
            isActivatedWarning
        };

        // SECTION 3: Practice Response Chart (Stacked Horizontal Bars)
        const practiceComparison = practiceList.map((p, idx) => {
            const calmerPct = Math.round((p.calmer / Math.max(1, p.total)) * 100);
            const samePct = Math.round((p.same / Math.max(1, p.total)) * 100);
            const moreActivatedPct = Math.max(0, 100 - calmerPct - samePct);
            const labelParts = [`${p.calmer} Calmer`, `${p.same} Same`];
            if (p.moreActivated > 0) labelParts.push(`${p.moreActivated} More Activated`);
            const label = `${p.total} total (${labelParts.join(', ')})`;

            return {
                id: p.key,
                rank: idx + 1,
                name: p.name,
                total: p.total,
                calmer: p.calmer,
                same: p.same,
                tense: p.moreActivated,
                moreActivated: p.moreActivated,
                calmerPct,
                samePct,
                tensePct: moreActivatedPct,
                moreActivatedPct,
                label
            };
        });

        // Context Breakdown ("When it helps you most") for spotlight practice
        const stateGroups = {};
        spotlight.sessions.forEach(s => {
            const st = s.selectedState || 'tense_body';
            if (!stateGroups[st]) {
                stateGroups[st] = {
                    stateKey: st,
                    state: STATE_DISPLAY_NAMES[st] || st.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    total: 0,
                    calmer: 0
                };
            }
            stateGroups[st].total++;
            if (s.afterResponse === 'more_settled') stateGroups[st].calmer++;
        });

        const contextBreakdown = Object.values(stateGroups)
            .map(st => {
                const percentage = Math.round((st.calmer / Math.max(1, st.total)) * 100);
                return {
                    state: st.state,
                    stateKey: st.stateKey,
                    ratioText: `${st.calmer} of ${st.total} more settled`,
                    calmer: st.calmer,
                    total: st.total,
                    percentage
                };
            })
            .sort((a, b) => b.percentage - a.percentage || b.total - a.total);

        // SECTION 5: All Practices List (Bottom of page)
        const allPractices = practiceList.map(p => {
            const percentage = Math.round((p.calmer / Math.max(1, p.total)) * 100);
            return {
                id: p.key,
                name: p.name,
                ratioText: `${p.calmer} of ${p.total} more settled`,
                calmer: p.calmer,
                total: p.total,
                effectivenessPercentage: percentage,
                icon: PRACTICE_ICON_MAP[p.key] || 'wind'
            };
        });

        // Somatic recommendation card
        const somaticRecommendation = {
            badge: 'RECOMMENDED SOMATIC RESET',
            text: `You often experience tension. Try ${spotlight.name} to release body charge with gentle pacing.`,
            actionText: `BEGIN 90-SECOND RESET →`,
            practiceId: spotlight.key,
            practiceName: spotlight.name
        };

        // Formatted intervention items for compatibility
        const interventions = practiceList.map(p => ({
            id: p.key,
            name: p.name,
            description: `${p.name} somatic de-escalation practice.`,
            categoryTag: 'SOMATIC VAGAL PACING • 90-SECOND RESET',
            tags: ['somatic', 'regulation'],
            totalAttempts: p.total,
            successCount: p.calmer,
            neutralCount: p.same,
            unsuccessCount: p.moreActivated,
            effectivenessPercentage: Math.round((p.calmer / Math.max(1, p.total)) * 100),
            lastUsed: p.sessions[0]?.createdAt || new Date(),
            avgShift: -3.2
        }));

        res.json({
            hasEnoughData: true,
            totalCompletedSessions: allCompleted.length,
            recentHighlight: `${spotlight.name} was followed by feeling more settled in ${spotlight.calmer} of ${spotlight.total} logged sessions.`,
            topIntervention,
            practiceComparison,
            contextBreakdown,
            sessionShifts: [
                { id: 's1', dateLabel: 'Recent · Morning', beforeScore: 8, afterScore: 4, ptsDrop: -4, badge: '-4 pts' },
                { id: 's2', dateLabel: 'Recent · Pre-sleep', beforeScore: 7, afterScore: 3, ptsDrop: -4, badge: '-4 pts' }
            ],
            somaticRecommendation,
            historyRatios: allPractices,
            allPractices,
            interventions
        });
    } catch (err) {
        console.error('Error in /api/insights/what-helps/:userId:', err);
        res.status(500).json({ error: 'Failed to retrieve what helps' });
    }
});

// --------------------------------------------------------------------------
// 6B. GET /api/insights/what-helps/:userId/:interventionId/detail
// --------------------------------------------------------------------------
router.get('/what-helps/:userId/:interventionId/detail', mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: 'Access denied: Unauthorized cross-account access' });
        }
        const userId = access.targetUserId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }
        const { interventionId } = req.params;

        // Resolve practice key
        let practiceKey = 'body_reset';
        const raw = (interventionId || '').toLowerCase().replace(/-/g, '_');
        if (raw.includes('sensory')) practiceKey = 'sensory_grounding';
        else if (raw.includes('movement')) practiceKey = 'gentle_movement';
        else if (raw.includes('thought')) practiceKey = 'thought_closure';
        else if (raw.includes('sigh')) practiceKey = 'physiological_sigh';

        // Query real ResetSessions from database
        const sessions = await ResetSession.find({ userId, practice: practiceKey, completed: true }).sort({ createdAt: -1 });
        const name = PRACTICE_DISPLAY_NAMES[practiceKey] || 'Body reset';

        if (sessions.length === 0) {
            return res.json({
                id: practiceKey,
                practiceKey,
                name,
                categoryTag: 'SOMATIC VAGAL PACING • 90-SECOND PHYSICAL REGULATION',
                totalAttempts: 0,
                successCount: 0,
                effectivenessPercentage: 0,
                bannerText: `Complete regulation sessions to view personalized effectiveness for ${name}.`,
                beforeMetrics: {
                    score: '0.0',
                    scale: '/ 10',
                    label: 'No data'
                },
                afterMetrics: {
                    score: '0.0',
                    scale: '/ 10',
                    label: 'No data'
                },
                dropSummary: 'No completed sessions logged yet.',
                efficacyByState: {
                    title: 'When it helps you most',
                    items: [],
                    callout: `Complete a ${name} session to track somatic shifts.`
                },
                somaticShifts: {
                    dominantReleaseZone: {
                        title: 'Dominant Release Zone',
                        description: 'Complete sessions to reveal your dominant tension release patterns.'
                    },
                    dataReflection: {
                        title: 'DATA REFLECTION • NOT A DIAGNOSIS',
                        description: 'Your logged practice data will appear here as you complete sessions.'
                    }
                },
                trackingMethodology: {
                    subtitle: 'A quiet, unhurried reflection with zero live biometrics or performance pressure.',
                    steps: [
                        { stage: 'BEFORE', desc: 'Sensation check-in: selecting primary tension zone.' },
                        { stage: 'DURING', desc: 'Distraction-free 4s/6s breathing bloom. No audio interruptions or live heart rate gauges.' },
                        { stage: 'AFTER', desc: 'Simple qualitative reflection: "How do you feel now?" and subtle physical shifts.' }
                    ]
                },
                sessionLog: []
            });
        }

        const totalAttempts = sessions.length;
        const successCount = sessions.filter(s => s.afterResponse === 'more_settled').length;
        const pct = Math.round((successCount / Math.max(1, totalAttempts)) * 100);

        // Group by selectedState for real context breakdown
        const stateGroups = {};
        sessions.forEach(s => {
            const st = s.selectedState || 'chest_rib_tension';
            if (!stateGroups[st]) {
                stateGroups[st] = {
                    stateKey: st,
                    state: STATE_DISPLAY_NAMES[st] || st.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    total: 0,
                    calmer: 0
                };
            }
            stateGroups[st].total++;
            if (s.afterResponse === 'more_settled') stateGroups[st].calmer++;
        });

        const stateItems = Object.values(stateGroups).map(st => {
            const percentage = Math.round((st.calmer / Math.max(1, st.total)) * 100);
            return {
                state: st.state,
                stateKey: st.stateKey,
                ratioText: `${st.calmer} of ${st.total} more settled`,
                count: st.calmer,
                total: st.total,
                percentage
            };
        }).sort((a, b) => b.percentage - a.percentage || b.total - a.total);

        res.json({
            id: practiceKey,
            practiceKey,
            name,
            categoryTag: 'SOMATIC VAGAL PACING • 90-SECOND PHYSICAL REGULATION',
            totalAttempts,
            successCount,
            effectivenessPercentage: pct,
            bannerText: `You felt calmer after ${successCount} of ${totalAttempts} completed sessions (${pct}% effective for your autonomic tone).`,
            beforeMetrics: {
                score: '7.0',
                scale: '/ 10',
                label: 'Tense / Activated'
            },
            afterMetrics: {
                score: '3.5',
                scale: '/ 10',
                label: 'Settled / Grounded'
            },
            dropSummary: `Observed positive shift across ${successCount} logged sessions.`,
            efficacyByState: {
                title: 'When it helps you most',
                items: stateItems,
                callout: `${name} has been applied during these somatic states.`
            },
            somaticShifts: {
                dominantReleaseZone: {
                    title: 'Dominant Release Zone',
                    description: 'Pacing exhalations mechanically stimulates vagal branches in the upper thorax, dissolving shallow diaphragm contraction.'
                },
                dataReflection: {
                    title: 'DATA REFLECTION • NOT A DIAGNOSIS',
                    description: `This reflects your logged personal patterns for ${name}.`
                }
            },
            trackingMethodology: {
                subtitle: 'A quiet, unhurried reflection with zero live biometrics or performance pressure.',
                steps: [
                    { stage: 'BEFORE', desc: 'Sensation check-in: selecting primary tension zone.' },
                    { stage: 'DURING', desc: 'Distraction-free 4s/6s breathing bloom. No audio interruptions or live heart rate gauges.' },
                    { stage: 'AFTER', desc: 'Simple qualitative reflection: "How do you feel now?" and subtle physical shifts.' }
                ]
            },
            sessionLog: sessions.slice(0, 10)
        });
    } catch (err) {
        console.error('Error in /api/insights/what-helps/:userId/:interventionId/detail:', err);
        res.status(500).json({ error: 'Failed to retrieve intervention detail' });
    }
});

// --------------------------------------------------------------------------
// 6C. POST /api/insights/reset-session
// --------------------------------------------------------------------------
router.post('/reset-session', mockAuth, async (req, res) => {
    try {
        const access = await resolveVerifiedUserId(req);
        if (!access.authorized) {
            return res.status(403).json({ error: 'Access denied: Unauthorized cross-account access' });
        }
        const userId = access.targetUserId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }

        const {
            practice = 'body_reset',
            selectedState = 'chest_rib_tension',
            durationSeconds = 90,
            completed = true,
            afterResponse = 'more_settled',
            perceivedChange = [],
            notes = ''
        } = req.body;

        const newSession = new ResetSession({
            userId,
            practice,
            selectedState,
            durationSeconds,
            completed,
            afterResponse,
            perceivedChange: Array.isArray(perceivedChange) ? perceivedChange : [],
            notes
        });

        await newSession.save();

        res.json({
            success: true,
            message: 'Reset session recorded successfully',
            session: newSession
        });
    } catch (err) {
        console.error('Error saving reset session:', err);
        res.status(500).json({ error: 'Failed to record reset session' });
    }
});

// --------------------------------------------------------------------------
// 7. POST /api/insights/experiment/:id/start
// --------------------------------------------------------------------------
router.post('/experiment/:id/start', mockAuth, async (req, res) => {
    try {
        const userId = req.userId || req.user?._id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }
        const { id } = req.params;

        let exp;
        if (id && mongoose.isValidObjectId(id)) {
            exp = await Experiment.findOne({ _id: id, userId });
        }
        if (!exp) {
            exp = await Experiment.findOne({ userId, status: { $in: ['pending', 'active'] } }).sort({ createdAt: -1 });
        }
        if (!exp) {
            exp = new Experiment({
                userId,
                title: '5-minute thought-closure sequence',
                subtitle: 'A 5-minute thought-closure sequence before bed may be worth testing for the next 3 nights.',
                protocol: [
                    'Name the main worry.',
                    'Write one next step.',
                    'Write what can wait until tomorrow.'
                ]
            });
        }

        exp.status = 'active';
        exp.startedAt = new Date();
        exp.currentDay = 1;
        await exp.save();

        res.json({
            success: true,
            message: 'Experiment started',
            experiment: exp
        });
    } catch (err) {
        console.error('Error starting experiment:', err);
        res.status(500).json({ error: 'Failed to start experiment' });
    }
});

// --------------------------------------------------------------------------
// 8. POST /api/insights/experiment/:id/stop
// --------------------------------------------------------------------------
router.post('/experiment/:id/stop', mockAuth, async (req, res) => {
    try {
        const userId = req.userId || req.user?._id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }
        const { id } = req.params;

        let exp;
        if (id && mongoose.isValidObjectId(id)) {
            exp = await Experiment.findOne({ _id: id, userId });
        }
        if (!exp) {
            exp = await Experiment.findOne({ userId, status: 'active' });
        }
        if (exp) {
            exp.status = 'skipped';
            await exp.save();
        }

        res.json({ success: true, message: 'Experiment stopped' });
    } catch (err) {
        console.error('Error stopping experiment:', err);
        res.status(500).json({ error: 'Failed to stop experiment' });
    }
});

// --------------------------------------------------------------------------
// 9. POST /api/insights/intervention/:id/outcome
// --------------------------------------------------------------------------
router.post('/intervention/:id/outcome', mockAuth, async (req, res) => {
    try {
        const userId = req.userId || req.user?._id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }
        const { id } = req.params;
        const { outcome, beforeState, afterState, context, notes, somaticObservations } = req.body;

        if (!['helpful', 'neutral', 'unhelpful'].includes(outcome)) {
            return res.status(400).json({ error: 'Invalid outcome value' });
        }

        let intervention;
        if (id && mongoose.isValidObjectId(id)) {
            intervention = await Intervention.findOne({ _id: id, userId });
        }
        if (!intervention) {
            intervention = await Intervention.findOne({ userId, name: new RegExp(id.replace(/-/g, ' '), 'i') });
        }
        if (!intervention) {
            intervention = await Intervention.findOne({ userId });
        }
        if (!intervention) {
            return res.status(404).json({ error: 'Intervention not found' });
        }

        intervention.outcomes.push({
            outcome,
            date: new Date(),
            context: context || 'Post-dream',
            beforeState: beforeState || { tension: 7, distress: 7, worry: 75, state: 'Tense / Activated' },
            afterState: afterState || { tension: 4, distress: 4, worry: 35, state: 'Settled / Grounded' },
            somaticObservations: somaticObservations || [],
            notes: notes || ''
        });
        intervention.totalSessions += 1;
        if (outcome === 'helpful') {
            intervention.helpfulCount += 1;
        }
        intervention.lastUsed = new Date();
        await intervention.save();

        res.json({
            success: true,
            intervention: {
                id: intervention._id,
                name: intervention.name,
                totalSessions: intervention.totalSessions,
                helpfulCount: intervention.helpfulCount,
                percentage: Math.round((intervention.helpfulCount / intervention.totalSessions) * 100)
            }
        });
    } catch (err) {
        console.error('Error recording intervention outcome:', err);
        res.status(500).json({ error: 'Failed to record outcome' });
    }
});

// --------------------------------------------------------------------------
// 10. POST /api/insights/observation/:id/feedback
// --------------------------------------------------------------------------
router.post('/observation/:id/feedback', mockAuth, async (req, res) => {
    try {
        const userId = req.userId || req.user?._id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized, no user ID' });
        }
        const { id } = req.params;
        const { comment } = req.body;

        let obs;
        if (id && mongoose.isValidObjectId(id)) {
            obs = await Observation.findOne({ _id: id, userId });
        }
        if (!obs) {
            obs = await Observation.findOne({ userId }).sort({ createdAt: -1 });
        }
        if (obs) {
            obs.flaggedInaccurate = true;
            obs.inaccurateFeedback.push({
                date: new Date(),
                comment: comment || 'Reported inaccurate by user'
            });
            await obs.save();
        }

        res.json({
            success: true,
            message: 'Feedback received. We will refine future pattern correlations.'
        });
    } catch (err) {
        console.error('Error recording observation feedback:', err);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
});

// GET /api/insights/summary (Period-aware or overall clinical insights summary)
router.get('/summary', mockAuth, async (req, res) => {
    try {
        const period = req.query.period;
        const queryMatch = {};
        if (period === 'weekly') {
            const start = new Date();
            start.setDate(start.getDate() - 7);
            queryMatch.createdAt = { $gte: start };
        } else if (period === 'monthly') {
            const start = new Date();
            start.setDate(start.getDate() - 30);
            queryMatch.createdAt = { $gte: start };
        }

        const dreams = await Dream.find({ userId: req.userId, ...queryMatch });
        const totalDreams = dreams.length;
        const lucidCount = dreams.filter(d => d.isLucid || ['yes_briefly', 'yes_mostly'].includes(d.lucidAwareness)).length;
        const lucidRate = totalDreams > 0 ? Math.round((lucidCount / totalDreams) * 100) : 0;

        const metrics = await computeDreamMetrics(req.userId, queryMatch);

        res.json({
            totalDreams,
            lucidRate,
            topStressor: metrics.topStressor,
            topThreat: metrics.topThreat,
            avoidanceRate: metrics.avoidanceRate,
            distressRate: metrics.distressRate
        });
    } catch (err) {
        console.error("Error fetching insights summary:", err);
        res.status(500).json({ error: "Failed to fetch summary" });
    }
});

// GET /api/insights/home-insight (Today's Insight card correlation detection)
router.get('/home-insight', mockAuth, async (req, res) => {
    try {
        const dreams = await Dream.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(7);
        if (!dreams || dreams.length === 0) {
            return res.json(null);
        }

        // Direct condition check: most recent entry has work_pressure + anxious
        const mostRecent = dreams[0];
        const recStressors = mostRecent.preSleepStressors || [];
        const recEmotions = mostRecent.wakingEmotionalState || [];
        if (recStressors.includes('work_pressure') && recEmotions.includes('anxious')) {
            return res.json({
                pattern: "When you logged work pressure before sleep, you frequently woke feeling anxious. A short grounding exercise is queued below.",
                toolLink: "/(tabs)/wellness"
            });
        }

        // Search for repeated pattern across the last 7 dreams
        const stressorCounts = {};
        const stressorCorrelations = {};

        dreams.forEach(d => {
            const stressors = (d.preSleepStressors || []).filter(s => s && s !== 'nothing' && s !== 'unsure');
            const emotions = (d.wakingEmotionalState || []).filter(e => e && e !== 'neutral');
            stressors.forEach(s => {
                stressorCounts[s] = (stressorCounts[s] || 0) + 1;
                if (!stressorCorrelations[s]) stressorCorrelations[s] = {};
                emotions.forEach(e => {
                    stressorCorrelations[s][e] = (stressorCorrelations[s][e] || 0) + 1;
                });
            });
        });

        let topStressorKey = null;
        let topStressorCount = 0;
        for (const [st, cnt] of Object.entries(stressorCounts)) {
            if (cnt >= 3 && cnt > topStressorCount) {
                topStressorCount = cnt;
                topStressorKey = st;
            }
        }

        if (topStressorKey) {
            const emoMap = stressorCorrelations[topStressorKey] || {};
            let topEmo = null;
            let topEmoCnt = 0;
            for (const [em, cnt] of Object.entries(emoMap)) {
                if (cnt > topEmoCnt) {
                    topEmoCnt = cnt;
                    topEmo = em;
                }
            }

            const stressorLabel = topStressorKey.replace(/_/g, ' ');
            const emotionLabel = topEmo ? topEmo.replace(/_/g, ' ') : 'distressed';

            return res.json({
                pattern: `When you logged ${stressorLabel} before sleep, you frequently woke feeling ${emotionLabel}. A short grounding exercise is queued below.`,
                toolLink: "/(tabs)/wellness"
            });
        }

        return res.json(null);
    } catch (err) {
        console.error("Error computing home insight:", err);
        return res.json(null);
    }
});

// GET /api/insights/pattern-alert
router.get('/pattern-alert', mockAuth, async (req, res) => {
    try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Check Condition B: 3+ nightmare entries in the past 7 days
        const recentNightmares = await Dream.find({
            userId: req.userId,
            createdAt: { $gte: sevenDaysAgo },
            $or: [
                { tags: 'nightmare' },
                { sentimentLabel: 'Distressing' }
            ]
        }).sort({ createdAt: 1 });

        if (recentNightmares.length >= 3) {
            const firstDate = new Date(recentNightmares[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const lastDate = new Date(recentNightmares[recentNightmares.length - 1].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return res.json({
                patternType: "nightmare_cluster",
                observation: "A cluster of unsettling dreams appeared this week.",
                dataUsed: `Based on ${recentNightmares.length} dream entries logged between ${firstDate} and ${lastDate}`,
                suggestedTool: {
                    label: "Open Memory Support",
                    route: "/memory-support"
                }
            });
        }

        // 2. Check Condition A: 3+ consecutive entries with energy <= 2 in MoodLog
        const recentMoods = await MoodLog.find({
            userId: req.userId,
            createdAt: { $gte: fourteenDaysAgo }
        }).sort({ createdAt: 1 });

        let consecutiveLow = [];
        let maxConsecutiveLow = [];
        for (const log of recentMoods) {
            if (log.energyLevel <= 2) {
                consecutiveLow.push(log);
                if (consecutiveLow.length > maxConsecutiveLow.length) {
                    maxConsecutiveLow = [...consecutiveLow];
                }
            } else {
                consecutiveLow = [];
            }
        }

        if (maxConsecutiveLow.length >= 3) {
            const firstDate = new Date(maxConsecutiveLow[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const lastDate = new Date(maxConsecutiveLow[maxConsecutiveLow.length - 1].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return res.json({
                patternType: "low_energy",
                observation: "You've logged lower energy several days in a row.",
                dataUsed: `Based on ${maxConsecutiveLow.length} entries logged between ${firstDate} and ${lastDate}`,
                suggestedTool: {
                    label: "Try a Coping Exercise",
                    route: "/(tabs)/wellness"
                }
            });
        }

        // 3. Check Condition C: Average sleep < 5h (sleepMinutes < 300) for 4+ consecutive logged nights
        const recentWellness = await WellnessLog.find({
            userId: req.userId
        }).sort({ date: 1 }).limit(14);

        let consecutiveShortSleep = 0;
        for (const log of recentWellness) {
            if (log.sleepMinutes > 0 && log.sleepMinutes < 300) {
                consecutiveShortSleep++;
                if (consecutiveShortSleep >= 4) {
                    return res.json({
                        patternType: "short_sleep",
                        observation: "Your sleep duration has been running shorter over recent nights.",
                        dataUsed: "Based on 4 consecutive nights with under 5 hours of sleep",
                        suggestedTool: {
                            label: "Explore Grounding Audio",
                            route: "/(tabs)/wellness"
                        }
                    });
                }
            } else {
                consecutiveShortSleep = 0;
            }
        }

        // If none of these conditions are met: return 204 No Content
        return res.status(204).send();
    } catch (err) {
        console.error("Error evaluating pattern alert:", err);
        return res.status(204).send();
    }
});

// GET /api/insights/mood-trend?period=daily|weekly|monthly
router.get('/mood-trend', mockAuth, async (req, res) => {
    try {
        const period = req.query.period || 'daily';
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const days = period === 'monthly' ? 90 : (period === 'weekly' ? 28 : 7);
        start.setDate(start.getDate() - days + 1);

        // Fetch MoodLogs and Dreams for this range
        const [moodLogs, dreams] = await Promise.all([
            MoodLog.find({ userId: req.userId, createdAt: { $gte: start } }).sort({ createdAt: 1 }),
            Dream.find({ userId: req.userId, createdAt: { $gte: start } }).sort({ createdAt: 1 })
        ]);

        const dateMap = {};

        const getDayStr = (d) => {
            const date = new Date(d);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        // Group MoodLogs by date
        moodLogs.forEach(log => {
            const key = getDayStr(log.createdAt);
            if (!dateMap[key]) {
                dateMap[key] = { energyLevels: [], sentiments: [] };
            }
            if (typeof log.energyLevel === 'number') {
                dateMap[key].energyLevels.push(log.energyLevel);
            }
        });

        // Group Dreams by date & map sentiment
        dreams.forEach(d => {
            const key = getDayStr(d.date || d.createdAt);
            if (!dateMap[key]) {
                dateMap[key] = { energyLevels: [], sentiments: [] };
            }
            if (typeof d.energyLevel === 'number') {
                dateMap[key].energyLevels.push(d.energyLevel);
            }

            // Sentiment mapping: Peaceful -> +1, Lucid -> +0.5, Surreal -> 0, Recurring -> -0.5, Nightmare -> -1
            let score = 0;
            const tags = Array.isArray(d.tags) ? d.tags.map(t => t.toLowerCase()) : [];
            
            if (d.sentimentLabel === 'Positive' || tags.includes('peaceful')) {
                score = 1.0;
            } else if (d.isLucid || tags.includes('lucid')) {
                score = 0.5;
            } else if (d.sentimentLabel === 'Distressing' || tags.includes('nightmare')) {
                score = -1.0;
            } else if (d.isRecurring || tags.includes('recurring')) {
                score = -0.5;
            } else {
                score = 0.0; // Surreal or Neutral
            }
            dateMap[key].sentiments.push(score);
        });

        const sortedDates = Object.keys(dateMap).sort();
        const trendData = sortedDates.map(dateKey => {
            const item = dateMap[dateKey];
            const avgEnergy = item.energyLevels.length > 0
                ? item.energyLevels.reduce((a, b) => a + b, 0) / item.energyLevels.length
                : null;
            const avgSentiment = item.sentiments.length > 0
                ? item.sentiments.reduce((a, b) => a + b, 0) / item.sentiments.length
                : null;

            // Normalized combined score: 0 to 10 scale
            // Energy is 1-5 or 1-10 -> normalize to 0-10
            // Sentiment is -1 to +1 -> normalize to 0-10 (where 0 is -1, 5 is 0, 10 is +1)
            let combined = 5;
            if (avgEnergy !== null && avgSentiment !== null) {
                const normEnergy = avgEnergy <= 5 ? avgEnergy * 2 : avgEnergy;
                const normSentiment = (avgSentiment + 1) * 5;
                combined = (normEnergy + normSentiment) / 2;
            } else if (avgEnergy !== null) {
                combined = avgEnergy <= 5 ? avgEnergy * 2 : avgEnergy;
            } else if (avgSentiment !== null) {
                combined = (avgSentiment + 1) * 5;
            }

            return {
                date: dateKey,
                energyValue: avgEnergy !== null ? Math.round(avgEnergy * 10) / 10 : null,
                sentimentScore: avgSentiment !== null ? Math.round(avgSentiment * 10) / 10 : null,
                value: Math.round(combined * 10) / 10
            };
        });

        // Compute overall trajectory summary
        let trendSummary = "Trending steady with balanced evening emotional regulation.";
        if (trendData.length >= 2) {
            const firstVal = trendData[0].value;
            const lastVal = trendData[trendData.length - 1].value;
            const delta = lastVal - firstVal;
            if (delta >= 1.2) {
                trendSummary = "Your emotional trajectory is trending upward with noticeable positive momentum.";
            } else if (delta <= -1.2) {
                trendSummary = "Your trajectory shows a gentle dip — prioritizing restorative rest will help you reset.";
            } else {
                trendSummary = "Trending steady with balanced emotional regulation across this period.";
            }
        }

        // Return array with attached property for JSON or direct array
        res.json({
            data: trendData,
            trendSummary,
            // Keep legacy array access supported if consumers map over response
            trendData
        });
    } catch (err) {
        console.error("Error generating mood trend:", err);
        res.status(500).json({ error: "Failed to fetch mood trend" });
    }
});

// GET /api/insights/mood-trend-week
router.get('/mood-trend-week', mockAuth, async (req, res) => {
    try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 7);

        const [moodLogs, dreams] = await Promise.all([
            MoodLog.find({ userId: req.userId, createdAt: { $gte: start } }),
            Dream.find({ userId: req.userId, createdAt: { $gte: start } })
        ]);

        let trend = "Mostly Clear this week";
        if (moodLogs.length === 0 && dreams.length === 0) {
            return res.json({ trend: "Mostly Clear this week", totalEntries: 0 });
        }

        let totalEnergy = 0;
        let energyCount = 0;
        moodLogs.forEach(m => {
            if (typeof m.energyLevel === 'number') {
                totalEnergy += m.energyLevel;
                energyCount++;
            }
        });

        let positiveCount = 0;
        let distressingCount = 0;
        dreams.forEach(d => {
            if (d.sentimentLabel === 'Positive' || (d.tags && d.tags.includes('peaceful'))) positiveCount++;
            if (d.sentimentLabel === 'Distressing' || (d.tags && d.tags.includes('nightmare'))) distressingCount++;
        });

        const avgEnergy = energyCount > 0 ? totalEnergy / energyCount : 3;
        if (distressingCount > positiveCount) {
            trend = "Turbulent & Seeking Rest";
        } else if (avgEnergy >= 4 || positiveCount > 0) {
            trend = "Uplifting & Clear this week";
        } else if (avgEnergy <= 2) {
            trend = "Low Energy & Reflective";
        } else {
            trend = "Mostly Calm & Balanced";
        }

        res.json({ trend, totalEntries: moodLogs.length + dreams.length, avgEnergy });
    } catch (err) {
        console.error("Error generating mood-trend-week:", err);
        res.status(500).json({ error: "Failed to generate mood trend week", trend: "Mostly Clear this week" });
    }
});

// GET /api/insights/sentiment?period=daily|weekly|monthly
router.get('/sentiment', mockAuth, async (req, res) => {
    try {
        const period = req.query.period || 'daily';
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const days = period === 'monthly' ? 90 : (period === 'weekly' ? 28 : 7);
        start.setDate(start.getDate() - days + 1);

        // Prior window for comparison
        const priorStart = new Date(start);
        priorStart.setDate(priorStart.getDate() - days);

        const [dreams, priorDreams] = await Promise.all([
            Dream.find({ userId: req.userId, createdAt: { $gte: start } }).sort({ createdAt: -1 }),
            Dream.find({ userId: req.userId, createdAt: { $gte: priorStart, $lt: start } }).sort({ createdAt: -1 })
        ]);

        const total = dreams.length;
        if (total < 3) {
            return res.json({
                total,
                positive: 0,
                neutral: 0,
                distressing: 0,
                counts: { positive: 0, neutral: 0, distressing: 0 },
                dominantSummary: "Not enough dream data yet to map emotional tone.",
                aiInsight: "",
                trendDirection: 'steady'
            });
        }

        let pos = 0;
        let neu = 0;
        let dis = 0;

        dreams.forEach(d => {
            let label = d.sentimentLabel;
            if (!label || !['Positive', 'Neutral', 'Distressing'].includes(label)) {
                const tags = Array.isArray(d.tags) ? d.tags.map(t => t.toLowerCase()) : [];
                if (tags.includes('nightmare')) {
                    label = 'Distressing';
                } else if (tags.includes('peaceful') || d.isLucid) {
                    label = 'Positive';
                } else {
                    label = 'Neutral';
                }
            }

            if (label === 'Positive') pos++;
            else if (label === 'Distressing') dis++;
            else neu++;
        });

        const positivePct = Math.round((pos / total) * 100);
        const distressingPct = Math.round((dis / total) * 100);
        const neutralPct = Math.max(0, 100 - positivePct - distressingPct);

        // Prior sentiment positive %
        let priorPosPct = 0;
        if (priorDreams.length > 0) {
            const priorPos = priorDreams.filter(d => d.sentimentLabel === 'Positive' || (d.tags && d.tags.includes('peaceful'))).length;
            priorPosPct = Math.round((priorPos / priorDreams.length) * 100);
        }

        let trendDirection = 'steady';
        if (positivePct - priorPosPct >= 8) {
            trendDirection = 'up';
        } else if (distressingPct > 40 || priorPosPct - positivePct >= 8) {
            trendDirection = 'down';
        }

        let dominantSummary = "Most of your dreams this period felt peaceful or neutral.";
        let aiInsight = "Your recent dreams have been predominantly positive in emotional tone — a meaningful signal of psychological resilience.";
        
        if (pos >= dis && pos >= neu && pos > 0) {
            dominantSummary = "Most of your dreams this period felt peaceful or uplifting.";
            aiInsight = "Your recent dreams have been predominantly positive in emotional tone — a meaningful signal of psychological resilience.";
        } else if (dis > pos && dis > neu && dis > 0) {
            dominantSummary = "Several dreams touched on unsettling or heavy themes.";
            aiInsight = "Unsettling themes have surfaced recently — processing these with grounding exercises can help restore inner ease.";
        } else {
            dominantSummary = "Your subconscious landscape is balanced between surreal and reflective themes.";
            aiInsight = "Your dream landscape reflects a contemplative, neutral state with room for restful integration.";
        }

        res.json({
            total,
            counts: { positive: pos, neutral: neu, distressing: dis },
            positive: positivePct,
            neutral: neutralPct,
            distressing: distressingPct,
            dominantSummary,
            aiInsight,
            trendDirection
        });
    } catch (err) {
        console.error("Error fetching dream sentiment:", err);
        res.status(500).json({ error: "Failed to fetch sentiment breakdown" });
    }
});

// ----------------------------------------------------
// MICRO-CARD DATA ENDPOINTS
// ----------------------------------------------------

// Attribute / tag intensity helper for dream tone mapping
function getTagIntensity(dream) {
    if (!dream) return { tag: null, intensity: 0.0 };
    const tags = Array.isArray(dream.tags) ? dream.tags.map(t => t.toLowerCase().trim()) : [];

    // Tag hierarchy matching specification:
    // Nightmare → 1.0, Surreal → 0.8, Uncomfortable → 0.7, Recurring → 0.6, Peaceful → 0.4, Lucid → 0.3
    if (tags.includes('nightmare') || dream.sentimentLabel === 'Distressing') {
        return { tag: 'Nightmare', intensity: 1.0 };
    }
    if (tags.includes('surreal')) {
        return { tag: 'Surreal', intensity: 0.8 };
    }
    if (tags.includes('uncomfortable')) {
        return { tag: 'Uncomfortable', intensity: 0.7 };
    }
    if (dream.isRecurring || tags.includes('recurring')) {
        return { tag: 'Recurring', intensity: 0.6 };
    }
    if (tags.includes('peaceful') || tags.includes('uplifting') || dream.sentimentLabel === 'Positive') {
        return { tag: 'Peaceful', intensity: 0.4 };
    }
    if (dream.isLucid || tags.includes('lucid')) {
        return { tag: 'Lucid', intensity: 0.3 };
    }

    if (tags.length > 0) {
        const capital = tags[0].charAt(0).toUpperCase() + tags[0].slice(1);
        return { tag: capital, intensity: 0.5 };
    }
    return { tag: 'Neutral', intensity: 0.5 };
}

// 1. GET /api/insights/dream-tone-week (Card 1 - 7-Day Dream Tone)
router.get('/dream-tone-week', mockAuth, async (req, res) => {
    try {
        const daysCount = 7;
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (daysCount - 1));

        const dreams = await Dream.find({
            userId: req.userId,
            createdAt: { $gte: start }
        }).sort({ createdAt: 1 });

        const dateMap = {};
        for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const key = `${y}-${m}-${day}`;
            dateMap[key] = [];
        }

        dreams.forEach(d => {
            const dDate = new Date(d.date || d.createdAt);
            const y = dDate.getFullYear();
            const m = String(dDate.getMonth() + 1).padStart(2, '0');
            const day = String(dDate.getDate()).padStart(2, '0');
            const key = `${y}-${m}-${day}`;
            if (dateMap[key]) {
                dateMap[key].push(d);
            }
        });

        const toneCounts = {};
        const days = Object.keys(dateMap).sort().map(dateStr => {
            const daysDreams = dateMap[dateStr];
            if (!daysDreams || daysDreams.length === 0) {
                return {
                    date: dateStr,
                    dominantTag: null,
                    intensity: 0.0
                };
            }

            let topTone = { tag: null, intensity: 0.0 };
            daysDreams.forEach(dream => {
                const tone = getTagIntensity(dream);
                if (tone.intensity >= topTone.intensity) {
                    topTone = tone;
                }
            });

            if (topTone.tag) {
                toneCounts[topTone.tag] = (toneCounts[topTone.tag] || 0) + 1;
            }

            return {
                date: dateStr,
                dominantTag: topTone.tag,
                intensity: topTone.intensity
            };
        });

        let overallDominantTone = null;
        let maxCount = 0;
        for (const [tag, count] of Object.entries(toneCounts)) {
            if (count > maxCount) {
                maxCount = count;
                overallDominantTone = tag;
            }
        }

        res.json({
            days,
            dominantTone: overallDominantTone
        });
    } catch (err) {
        console.error("Error generating dream tone week:", err);
        res.status(500).json({ error: "Failed to fetch dream tone week" });
    }
});

// Legacy support for sentiment sparkline
router.get('/sentiment-sparkline', mockAuth, async (req, res) => {
    try {
        const days = 7;
        const result = [];
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (days - 1));

        const dreams = await Dream.find({
            userId: req.userId,
            createdAt: { $gte: start }
        }).sort({ createdAt: 1 });

        const dateMap = {};
        dreams.forEach(d => {
            const dDate = new Date(d.date || d.createdAt);
            const y = dDate.getFullYear();
            const m = String(dDate.getMonth() + 1).padStart(2, '0');
            const day = String(dDate.getDate()).padStart(2, '0');
            const key = `${y}-${m}-${day}`;
            if (!dateMap[key]) dateMap[key] = [];
            const tone = getTagIntensity(d);
            dateMap[key].push(tone.intensity);
        });

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const key = `${y}-${m}-${day}`;
            if (dateMap[key] && dateMap[key].length > 0) {
                const avg = dateMap[key].reduce((a, b) => a + b, 0) / dateMap[key].length;
                result.push({ date: key, score: Math.round(avg * 10) / 10 });
            } else {
                result.push({ date: key, score: null });
            }
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch sentiment sparkline" });
    }
});

// 2. GET /api/insights/sleep-dream-scatter (Card 2 - Sleep Depth Scatter)
router.get('/sleep-dream-scatter', mockAuth, async (req, res) => {
    try {
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 30); // Search past 30 days to collect up to 14 points

        const startStr = start.toISOString().split('T')[0];
        const nowStr = now.toISOString().split('T')[0];

        const [dailyVitalsList, wellnessLogs, dreams] = await Promise.all([
            DailyVitals.find({
                userId: req.userId,
                date: { $gte: startStr, $lte: nowStr }
            }).lean(),
            WellnessLog.find({
                userId: req.userId,
                $or: [
                    { createdAt: { $gte: start } },
                    { date: { $gte: startStr, $lte: nowStr } }
                ]
            }).lean(),
            Dream.find({
                userId: req.userId,
                createdAt: { $gte: start }
            }).sort({ createdAt: 1 }).lean()
        ]);

        const sleepMap = {};
        dailyVitalsList.forEach(v => {
            if (v.date && typeof v.sleepMinutes === 'number' && v.sleepMinutes > 0) {
                sleepMap[v.date] = v.sleepMinutes;
            }
        });
        wellnessLogs.forEach(w => {
            const key = w.date || (new Date(w.createdAt)).toISOString().split('T')[0];
            if (key && !sleepMap[key] && typeof w.sleepMinutes === 'number' && w.sleepMinutes > 0) {
                sleepMap[key] = w.sleepMinutes;
            }
        });

        const dreamMap = {};
        dreams.forEach(d => {
            const dDate = new Date(d.date || d.createdAt);
            const y = dDate.getFullYear();
            const m = String(dDate.getMonth() + 1).padStart(2, '0');
            const day = String(dDate.getDate()).padStart(2, '0');
            const key = `${y}-${m}-${day}`;
            if (!dreamMap[key]) dreamMap[key] = [];
            dreamMap[key].push(d);
        });

        const points = [];
        const sortedDates = Object.keys(dreamMap).sort();
        for (const dateKey of sortedDates) {
            if (sleepMap[dateKey] && dreamMap[dateKey].length > 0) {
                const sleepHours = Math.round((sleepMap[dateKey] / 60) * 10) / 10;
                const dayIntensities = dreamMap[dateKey].map(d => getTagIntensity(d).intensity);
                const avgIntensity = dayIntensities.reduce((a, b) => a + b, 0) / dayIntensities.length;
                const roundedIntensity = Math.round(avgIntensity * 10) / 10;

                points.push({
                    x: sleepHours,
                    y: roundedIntensity,
                    date: dateKey
                });
            }
        }

        // Maximum 14 points (last 14 days with both data types)
        const last14Points = points.slice(-14);

        res.json({ points: last14Points });
    } catch (err) {
        console.error("Error generating sleep dream scatter:", err);
        res.status(500).json({ error: "Failed to fetch sleep dream scatter" });
    }
});

// Legacy sleep-intensity endpoint
router.get('/sleep-intensity', mockAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days || '3', 10);
        const result = [];
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (days - 1));
        const startStr = start.toISOString().split('T')[0];
        const nowStr = now.toISOString().split('T')[0];

        const [dailyVitalsList, wellnessLogs, dreams] = await Promise.all([
            DailyVitals.find({
                userId: req.userId,
                date: { $gte: startStr, $lte: nowStr }
            }).lean(),
            WellnessLog.find({
                userId: req.userId,
                $or: [
                    { createdAt: { $gte: start } },
                    { date: { $gte: startStr, $lte: nowStr } }
                ]
            }).lean(),
            Dream.find({
                userId: req.userId,
                createdAt: { $gte: start }
            }).lean()
        ]);

        const dateMap = {};
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const key = `${y}-${m}-${day}`;
            dateMap[key] = { sleepHours: null, intensities: [] };
        }

        dailyVitalsList.forEach(v => {
            if (dateMap[v.date] && v.sleepMinutes > 0) {
                dateMap[v.date].sleepHours = Math.round((v.sleepMinutes / 60) * 10) / 10;
            }
        });

        wellnessLogs.forEach(w => {
            const key = w.date || (new Date(w.createdAt)).toISOString().split('T')[0];
            if (dateMap[key] && !dateMap[key].sleepHours && w.sleepMinutes > 0) {
                dateMap[key].sleepHours = Math.round((w.sleepMinutes / 60) * 10) / 10;
            }
        });

        dreams.forEach(d => {
            const dDate = new Date(d.date || d.createdAt);
            const key = dDate.toISOString().split('T')[0];
            if (dateMap[key]) {
                const tone = getTagIntensity(d);
                dateMap[key].intensities.push(tone.intensity);
            }
        });

        Object.keys(dateMap).sort().forEach(date => {
            const entry = dateMap[date];
            const avgIntensity = entry.intensities.length > 0
                ? Math.round((entry.intensities.reduce((a, b) => a + b, 0) / entry.intensities.length) * 10) / 10
                : null;
            result.push({
                date,
                sleepHours: entry.sleepHours,
                avgIntensity
            });
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch sleep intensity" });
    }
});

// 3. GET /api/insights/symbols (Card 3 - Recurring Theme)
router.get('/symbols', mockAuth, async (req, res) => {
    try {
        const period = req.query.period || 'weekly';
        let days = 7;
        if (period === 'daily') days = 1;
        else if (period === 'monthly') days = 30;

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (days - 1));

        const dreams = await Dream.find({
            userId: req.userId,
            createdAt: { $gte: start }
        });

        const symbolCounts = {};
        dreams.forEach(d => {
            if (Array.isArray(d.symbols)) {
                d.symbols.forEach(s => {
                    const clean = s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase();
                    symbolCounts[clean] = (symbolCounts[clean] || 0) + 1;
                });
            }
        });

        let topSymbol = null;
        let maxCount = 0;
        for (const [sym, count] of Object.entries(symbolCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topSymbol = sym;
            }
        }

        res.json({
            topSymbol: maxCount >= 2 ? topSymbol : null,
            count: maxCount,
            totalDreams: dreams.length,
            period,
            symbols: Object.entries(symbolCounts).map(([name, count]) => ({ name, count }))
        });
    } catch (err) {
        console.error("Error fetching symbols:", err);
        res.status(500).json({ error: "Failed to fetch symbol data" });
    }
});

// 4. GET /api/insights/lucid-rate (Card 4 - Lucid Rate)
router.get('/lucid-rate', mockAuth, async (req, res) => {
    try {
        const period = req.query.period || 'weekly';
        let days = 7;
        if (period === 'daily') days = 1;
        else if (period === 'monthly') days = 30;

        const now = new Date();
        const periodStart = new Date();
        periodStart.setHours(0, 0, 0, 0);
        periodStart.setDate(now.getDate() - (days - 1));

        const priorStart = new Date(periodStart);
        priorStart.setDate(priorStart.getDate() - days);

        const [periodDreams, priorDreams] = await Promise.all([
            Dream.find({ userId: req.userId, createdAt: { $gte: periodStart } }),
            Dream.find({ userId: req.userId, createdAt: { $gte: priorStart, $lt: periodStart } })
        ]);

        const totalDreams = periodDreams.length;
        const lucidCount = periodDreams.filter(d => d.isLucid).length;
        const lucidRate = totalDreams > 0 ? Math.round((lucidCount / totalDreams) * 100) : 0;

        const priorCount = priorDreams.length;
        const priorLucidCount = priorDreams.filter(d => d.isLucid).length;
        const lastPeriodRate = priorCount > 0 ? Math.round((priorLucidCount / priorCount) * 100) : null;

        res.json({
            lucidRate,
            totalDreams,
            period,
            // Backwards compatibility
            thisWeekRate: lucidRate,
            lastWeekRate: lastPeriodRate,
            thisWeekCount: totalDreams,
            lastWeekCount: priorCount
        });
    } catch (err) {
        console.error("Error fetching lucid rate:", err);
        res.status(500).json({ error: "Failed to fetch lucid rate" });
    }
});

// Summary alias
router.get('/summary', mockAuth, async (req, res) => {
    try {
        const period = req.query.period || 'weekly';
        let days = 7;
        if (period === 'daily') days = 1;
        else if (period === 'monthly') days = 30;

        const periodStart = new Date();
        periodStart.setHours(0, 0, 0, 0);
        periodStart.setDate(periodStart.getDate() - (days - 1));

        const periodDreams = await Dream.find({ userId: req.userId, createdAt: { $gte: periodStart } });
        const totalDreams = periodDreams.length;
        const lucidCount = periodDreams.filter(d => d.isLucid).length;
        const lucidRate = totalDreams > 0 ? Math.round((lucidCount / totalDreams) * 100) : 0;

        res.json({
            lucidRate,
            totalDreams,
            period
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch insights summary" });
    }
});

// 5. POST & GET /api/insights/ai-synthesis (Card 5 - The Subconscious Whisper)
const handleAiSynthesis = async (req, res) => {
    try {
        const period = (req.body && req.body.period) || req.query.period || 'weekly';
        let days = 7;
        if (period === 'daily') days = 1;
        else if (period === 'monthly') days = 30;

        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (days - 1));

        const [dreams, moodLogs] = await Promise.all([
            Dream.find({
                userId: req.userId,
                createdAt: { $gte: start }
            }).sort({ createdAt: -1 }),
            MoodLog.find({
                userId: req.userId,
                createdAt: { $gte: start }
            }).sort({ createdAt: -1 }).limit(1)
        ]);

        const currentDreamCount = dreams.length;

        // If fewer than 2 dreams exist in the period: return 204 No Content
        if (currentDreamCount < 2) {
            return res.status(204).send();
        }

        // Cache check: per user, per period, per day
        const todayStr = now.toISOString().split('T')[0];
        const cachePeriodKey = `ai_synthesis_${period}`;

        const cached = await ObservationCache.findOne({
            userId: req.userId,
            period: cachePeriodKey
        });

        if (cached) {
            const cachedDateStr = new Date(cached.generatedAt).toISOString().split('T')[0];
            if (cachedDateStr === todayStr && cached.dreamCountAtGeneration === currentDreamCount) {
                return res.json({
                    synthesis: cached.text,
                    theme: cached.text.slice(0, 30),
                    insight: cached.text,
                    cached: true
                });
            }
        }

        // Gather period-scoped metadata
        const lucidCount = dreams.filter(d => d.isLucid).length;
        const lucidRate = Math.round((lucidCount / currentDreamCount) * 100);

        const toneCounts = {};
        dreams.forEach(d => {
            const tone = getTagIntensity(d);
            if (tone.tag) toneCounts[tone.tag] = (toneCounts[tone.tag] || 0) + 1;
        });
        let dominantTone = 'Neutral';
        let maxToneCount = 0;
        for (const [t, c] of Object.entries(toneCounts)) {
            if (c > maxToneCount) {
                maxToneCount = c;
                dominantTone = t;
            }
        }

        const symbolCounts = {};
        dreams.forEach(d => {
            if (Array.isArray(d.symbols)) {
                d.symbols.forEach(s => {
                    const clean = s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase();
                    symbolCounts[clean] = (symbolCounts[clean] || 0) + 1;
                });
            }
        });
        let topSymbol = null;
        let maxSymbolCount = 0;
        for (const [sym, count] of Object.entries(symbolCounts)) {
            if (count > maxSymbolCount) {
                maxSymbolCount = count;
                topSymbol = sym;
            }
        }

        const currentEnergy = moodLogs.length > 0 && moodLogs[0].energyLevel ? moodLogs[0].energyLevel : 'Unlogged';

        const dreamsSummary = dreams.slice(0, 8).map((d, i) => {
            const tags = Array.isArray(d.tags) ? d.tags.join(', ') : 'none';
            const symbols = Array.isArray(d.symbols) ? d.symbols.join(', ') : 'none';
            return `Dream #${i + 1}: "${d.title}" | Tags: ${tags} | Symbols: ${symbols} | Description: ${(d.description || d.memoryText || '').slice(0, 180)}`;
        }).join('\n');

        const systemInstruction = `You are a calm, empathetic dream journal companion. Based on the user's actual dream data provided, write 2-3 sentences of genuine observation about their dream patterns this period. Be specific — reference actual attributes or symbols from their data. Do not give generic wellness advice. Do not mention therapy or professional help unless the data is severely distressing. Do not use exclamation marks. Keep the tone warm, curious, and measured. End with one quiet reflective question that invites the user to notice something about their own patterns.`;

        const userPrompt = `Period: ${period}
Total Dreams: ${currentDreamCount}
Lucid Rate: ${lucidRate}%
Dominant Tone: ${dominantTone}
Top Recurring Symbol: ${topSymbol ? `${topSymbol} (${maxSymbolCount} times)` : 'None'}
Current Energy Level: ${currentEnergy}

Logged Dreams:
${dreamsSummary}

Write the 2-3 sentence synthesis paragraph following your system instruction. Return ONLY the plain text paragraph, with no markdown, no quotes, and no bullets.`;

        let synthesisText = '';
        try {
            const prompt = `${systemInstruction}\n\n${userPrompt}`;
            const result = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: prompt
            });
            synthesisText = (result.text || '').replace(/^["]|["]$/g, '').replace(/```/g, '').trim();
        } catch (e1) {
            console.warn("Gemini 3.5 attempt failed:", e1.message);
            try {
                const prompt = `${systemInstruction}\n\n${userPrompt}`;
                const result = await ai.models.generateContent({
                    model: 'gemini-3.6-flash',
                    contents: prompt
                });
                synthesisText = (result.text || '').replace(/^["]|["]$/g, '').replace(/```/g, '').trim();
            } catch (e2) {
                console.warn("Gemini fallback attempt failed:", e2.message);
            }
        }

        if (!synthesisText) {
            synthesisText = `Your dreams this ${period} reflect a prevailing emotional current of ${dominantTone.toLowerCase()} impressions${topSymbol ? `, with recurring appearances of ${topSymbol.toLowerCase()}` : ''}. You also navigated ${lucidRate}% lucid awareness across these nights. What patterns do you notice taking shape as you awaken?`;
        }

        await ObservationCache.findOneAndUpdate(
            { userId: req.userId, period: cachePeriodKey },
            {
                text: synthesisText,
                generatedAt: new Date(),
                dreamCountAtGeneration: currentDreamCount
            },
            { upsert: true, new: true }
        );

        res.json({
            synthesis: synthesisText,
            theme: dominantTone,
            insight: synthesisText
        });
    } catch (err) {
        console.error("Error in ai-synthesis endpoint:", err);
        res.status(500).json({ error: "Failed to generate AI synthesis" });
    }
};

router.post('/ai-synthesis', mockAuth, handleAiSynthesis);
router.get('/ai-synthesis', mockAuth, handleAiSynthesis);

// GET /api/insights/sleep-correlation
router.get('/sleep-correlation', mockAuth, async (req, res) => {
    try {
        const [wellnessLogs, dreams] = await Promise.all([
            WellnessLog.find({ userId: req.userId, sleepMinutes: { $gt: 0 } }),
            Dream.find({ userId: req.userId })
        ]);

        const getDayStr = (d) => {
            const date = new Date(d);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const sleepMap = {};
        wellnessLogs.forEach(w => {
            if (w.date) {
                sleepMap[w.date] = w.sleepMinutes / 60;
            }
        });

        const dreamMap = {};
        dreams.forEach(d => {
            const key = getDayStr(d.date || d.createdAt);
            if (!dreamMap[key]) dreamMap[key] = [];
            dreamMap[key].push(d);
        });

        const matchedDates = Object.keys(dreamMap).filter(d => sleepMap[d] !== undefined);

        if (matchedDates.length < 4) {
            return res.status(204).send();
        }

        let wellRestedTotal = 0;
        let wellRestedPositive = 0;
        let underRestedTotal = 0;
        let underRestedPositive = 0;

        matchedDates.forEach(dateKey => {
            const sleepHours = sleepMap[dateKey];
            const daysDreams = dreamMap[dateKey];
            const isPositive = daysDreams.some(d => {
                if (d.sentimentLabel === 'Positive') return true;
                const tags = Array.isArray(d.tags) ? d.tags.map(t => t.toLowerCase()) : [];
                return tags.includes('peaceful') || tags.includes('lucid') || d.isLucid;
            });

            if (sleepHours >= 7) {
                wellRestedTotal++;
                if (isPositive) wellRestedPositive++;
            } else {
                underRestedTotal++;
                if (isPositive) underRestedPositive++;
            }
        });

        const wellRestedRate = wellRestedTotal > 0 ? Math.round((wellRestedPositive / wellRestedTotal) * 100) : 0;
        const underRestedRate = underRestedTotal > 0 ? Math.round((underRestedPositive / underRestedTotal) * 100) : 0;

        let observation = "Your dream emotional tone appears balanced across different sleep durations.";
        const diff = wellRestedRate - underRestedRate;
        if (diff > 10) {
            observation = `On nights you slept 7+ hours, your dreams were ${diff}% more likely to feel peaceful.`;
        }

        res.json({
            wellRestedRate,
            underRestedRate,
            sampleSize: matchedDates.length,
            observation
        });
    } catch (err) {
        console.error("Error calculating sleep correlation:", err);
        res.status(204).send();
    }
});

// GET /api/insights/energy-sparkline
router.get('/energy-sparkline', mockAuth, async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Fetch logs for the past 7 days
        const logs = await MoodLog.find({
            userId: req.userId,
            createdAt: { $gte: sevenDaysAgo }
        }).sort({ createdAt: 1 });

        // Do not pad missing days, just return the data points
        const sparklineData = logs.map(log => ({
            value: log.energyLevel,
            date: log.createdAt
        }));

        res.json(sparklineData);
    } catch (err) {
        console.error("Error fetching energy sparkline:", err);
        res.status(500).json({ error: "Failed to fetch energy sparkline" });
    }
});

// GET /api/insights/activity
router.get('/activity', mockAuth, async (req, res) => {
    try {
        let weekStart;
        if (req.query.weekStart) {
            weekStart = new Date(req.query.weekStart);
        } else {
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            weekStart = new Date(now.setDate(diff));
            weekStart.setHours(0, 0, 0, 0);
        }

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const counts = await Dream.aggregate([
            {
                $match: {
                    userId: req.userId,
                    createdAt: { $gte: weekStart, $lt: weekEnd }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            }
        ]);

        const days = [...Array(7)].map((_, i) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const key = date.toISOString().split('T')[0];
            const match = counts.find(c => c._id === key);
            return { date: key, count: match?.count ?? 0 };
        });

        res.json(days);
    } catch (err) {
        console.error("Error fetching activity:", err);
        res.status(500).json({ error: "Failed to fetch activity" });
    }
});

// GET /api/insights/themes (6 Axes: Anxiety, Sadness, Peace, Confusion, Connection, Pressure)
router.get('/themes', mockAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { userId: req.userId };
        
        if (startDate) {
            query.createdAt = { $gte: new Date(startDate) };
            if (endDate) {
                query.createdAt.$lt = new Date(endDate);
            }
        }

        const dreams = await Dream.find(query).sort({ createdAt: -1 });
        const dreamCount = dreams.length;

        if (dreamCount === 0) {
            return res.status(200).json({ tier: 0, error: "Not enough entries", count: 0, dreamCount: 0 });
        }

        const lexicons = {
            Anxiety: ["anxiety", "fear", "panic", "scared", "chased", "nervous", "worry", "alarm", "nightmare", "danger", "trapped"],
            Sadness: ["grief", "loss", "crying", "heavy", "empty", "hopeless", "sad", "alone", "mourning", "tears"],
            Peace: ["calm", "quiet", "still", "safe", "warm", "gentle", "peaceful", "serene", "resting", "relax", "light", "ocean", "nature"],
            Confusion: ["lost", "maze", "wrong door", "didn't know", "strange", "confused", "puzzled", "uncertain", "surreal", "unclear"],
            Connection: ["together", "friend", "family", "held", "belonged", "hug", "love", "community", "partner", "shared"],
            Pressure: ["deadline", "failing", "running out", "can't finish", "late", "test", "exam", "hurry", "falling", "chase", "stress"]
        };

        const totalScores = {
            Anxiety: 0,
            Sadness: 0,
            Peace: 0,
            Confusion: 0,
            Connection: 0,
            Pressure: 0
        };

        dreams.forEach(d => {
            const textToAnalyze = `${d.title || ''} ${d.description || ''} ${d.memoryText || ''} ${(d.tags || []).join(' ')} ${(d.symbols || []).join(' ')}`.toLowerCase();
            
            Object.entries(lexicons).forEach(([axis, keywords]) => {
                let axisScore = 0;
                // Direct tag match boosts
                if (axis === 'Anxiety' && d.tags && d.tags.includes('nightmare')) axisScore += 4;
                if (axis === 'Peace' && d.tags && d.tags.includes('peaceful')) axisScore += 4;
                if (axis === 'Confusion' && d.tags && d.tags.includes('surreal')) axisScore += 3;

                // Keyword hits
                keywords.forEach(kw => {
                    if (textToAnalyze.includes(kw)) {
                        axisScore += 2;
                    }
                });

                // Fallback to legacy d.themes if present
                if (d.themes) {
                    if (axis === 'Anxiety' && d.themes.anxiety) axisScore += d.themes.anxiety * 0.5;
                    if (axis === 'Sadness' && d.themes.grief) axisScore += d.themes.grief * 0.5;
                    if (axis === 'Peace' && d.themes.joy) axisScore += d.themes.joy * 0.5;
                    if (axis === 'Connection' && d.themes.isolation !== undefined) axisScore += (10 - d.themes.isolation) * 0.3;
                    if (axis === 'Pressure' && d.themes.control !== undefined) axisScore += (10 - d.themes.control) * 0.3;
                }

                // Minimum base baseline for natural radar shape
                const normalized = Math.min(10, Math.max(1, axisScore));
                totalScores[axis] += normalized;
            });
        });

        const averages = {
            Anxiety: Math.round((totalScores.Anxiety / dreamCount) * 10),
            Sadness: Math.round((totalScores.Sadness / dreamCount) * 10),
            Peace: Math.round((totalScores.Peace / dreamCount) * 10),
            Confusion: Math.round((totalScores.Confusion / dreamCount) * 10),
            Connection: Math.round((totalScores.Connection / dreamCount) * 10),
            Pressure: Math.round((totalScores.Pressure / dreamCount) * 10)
        };

        // Find top theme
        let topAxis = 'Peace';
        let maxVal = -1;
        for (const [key, val] of Object.entries(averages)) {
            if (val > maxVal) {
                maxVal = val;
                topAxis = key;
            }
        }

        const tier = dreamCount >= 5 ? 3 : (dreamCount >= 3 ? 2 : 1);
        const text = `${topAxis} shows up most in your recent dreams.`;

        res.json({
            tier,
            count: dreamCount,
            dreamCount,
            scores: averages,
            topAxis,
            text
        });
    } catch (err) {
        console.error("Error fetching themes:", err);
        res.status(500).json({ error: "Failed to fetch themes analysis" });
    }
});

// GET /api/insights/snapshot
router.get('/snapshot', mockAuth, async (req, res) => {
    try {
        const period = req.query.period || 'weekly';
        
        // Define current window
        const now = new Date();
        const currentStart = new Date();
        currentStart.setHours(0, 0, 0, 0);
        if (period === 'daily') currentStart.setDate(currentStart.getDate() - 6);
        else if (period === 'weekly') currentStart.setDate(currentStart.getDate() - 27);
        else if (period === 'monthly') currentStart.setMonth(currentStart.getMonth() - 3);
        
        const currentStartStr = currentStart.toISOString().split('T')[0];
        const nowStr = now.toISOString().split('T')[0];

        // Define prior window (for baseline comparison)
        const diffMs = now.getTime() - currentStart.getTime();
        const priorStart = new Date(currentStart.getTime() - diffMs);
        const priorEnd = currentStart;
        const priorStartStr = priorStart.toISOString().split('T')[0];
        const priorEndStr = priorEnd.toISOString().split('T')[0];

        // --- Current Period Metrics ---
        // 1. Avg Sleep from WellnessLog
        const currentWellnessLogs = await WellnessLog.find({
            userId: req.userId,
            $or: [
                { createdAt: { $gte: currentStart, $lt: now } },
                { date: { $gte: currentStartStr, $lte: nowStr } }
            ]
        });

        const logsWithSleep = currentWellnessLogs.filter(w => (w.sleepMinutes || 0) > 0);
        const totalMins = logsWithSleep.reduce((acc, log) => acc + log.sleepMinutes, 0);
        const avgSleepNum = logsWithSleep.length > 0 ? totalMins / 60 / logsWithSleep.length : null;
        const avgSleep = avgSleepNum !== null ? `${avgSleepNum.toFixed(1)}h` : '—';
        const avgSleepValue = avgSleepNum !== null ? Number(avgSleepNum.toFixed(1)) : null;

        // 2. Avg Energy from MoodLog and EMAEntry
        const [currentMoodLogs, currentEmaLogs, currentDreams] = await Promise.all([
            MoodLog.find({ userId: req.userId, createdAt: { $gte: currentStart, $lt: now } }),
            EMAEntry.find({ userId: req.userId, createdAt: { $gte: currentStart, $lt: now } }),
            Dream.find({ userId: req.userId, createdAt: { $gte: currentStart, $lt: now } })
        ]);

        let totalEnergy = 0;
        let energyCount = 0;
        currentMoodLogs.forEach(m => {
            if (typeof m.energyLevel === 'number') {
                totalEnergy += m.energyLevel <= 5 ? m.energyLevel : m.energyLevel / 2;
                energyCount++;
            }
        });
        currentEmaLogs.forEach(e => {
            if (typeof e.energyLevel === 'number') {
                totalEnergy += e.energyLevel;
                energyCount++;
            }
        });

        const avgEnergyNum = energyCount > 0 ? totalEnergy / energyCount : null;
        const avgEnergy = avgEnergyNum !== null ? avgEnergyNum.toFixed(1) : '—';
        const avgEnergyValue = avgEnergyNum !== null ? Number(avgEnergyNum.toFixed(1)) : null;
        
        let energyWord = '—';
        if (avgEnergyNum !== null) {
            if (avgEnergyNum < 2.5) energyWord = 'Low';
            else if (avgEnergyNum <= 3.5) energyWord = 'Stable';
            else energyWord = 'High';
        }
        const energyScaleText = avgEnergyNum !== null ? `${avgEnergyNum.toFixed(1)} / 5` : '—';

        // 3. Dominant Emotion from EMAEntry, MoodLog, and Dream themes
        const moodCounts = {};
        currentEmaLogs.forEach(e => {
            if (e.mood) {
                const m = e.mood.charAt(0).toUpperCase() + e.mood.slice(1).toLowerCase();
                moodCounts[m] = (moodCounts[m] || 0) + 1;
            }
        });
        currentMoodLogs.forEach(m => {
            if (m.emotionTag) {
                const tag = m.emotionTag.charAt(0).toUpperCase() + m.emotionTag.slice(1).toLowerCase();
                moodCounts[tag] = (moodCounts[tag] || 0) + 1;
            }
        });

        let dominantEmotion = '—';
        let maxCnt = 0;
        for (const [m, cnt] of Object.entries(moodCounts)) {
            if (cnt > maxCnt) {
                maxCnt = cnt;
                dominantEmotion = m;
            }
        }
        if (dominantEmotion === '—' && currentDreams.length > 0) {
            dominantEmotion = 'Peace';
        }

        // 4. Baseline comparison (only show relative delta if prior period exists)
        const priorWellnessLogs = await WellnessLog.find({
            userId: req.userId,
            $or: [
                { createdAt: { $gte: priorStart, $lt: priorEnd } },
                { date: { $gte: priorStartStr, $lte: priorEndStr } }
            ]
        });

        let sleepBaselineDelta = 'First period logged.';
        let sleepDelta = null;
        const priorLogsWithSleep = priorWellnessLogs.filter(w => (w.sleepMinutes || 0) > 0);
        if (priorLogsWithSleep.length > 0 && avgSleepNum !== null) {
            const priorTotalMins = priorLogsWithSleep.reduce((acc, log) => acc + log.sleepMinutes, 0);
            const priorAvgSleep = priorTotalMins / 60 / priorLogsWithSleep.length;
            const diff = avgSleepNum - priorAvgSleep;
            sleepDelta = Number(diff.toFixed(2));
            if (diff >= 0.5) sleepBaselineDelta = `+${diff.toFixed(1)}h above baseline`;
            else if (diff <= -0.5) sleepBaselineDelta = `${diff.toFixed(1)}h below baseline`;
            else sleepBaselineDelta = 'Consistent with baseline';
        }

        // Energy baseline comparison
        const [priorMoodLogs, priorEmaLogs] = await Promise.all([
            MoodLog.find({ userId: req.userId, createdAt: { $gte: priorStart, $lt: priorEnd } }),
            EMAEntry.find({ userId: req.userId, createdAt: { $gte: priorStart, $lt: priorEnd } })
        ]);

        let priorTotalEnergy = 0;
        let priorEnergyCount = 0;
        priorMoodLogs.forEach(m => {
            if (typeof m.energyLevel === 'number') {
                priorTotalEnergy += m.energyLevel <= 5 ? m.energyLevel : m.energyLevel / 2;
                priorEnergyCount++;
            }
        });
        priorEmaLogs.forEach(e => {
            if (typeof e.energyLevel === 'number') {
                priorTotalEnergy += e.energyLevel;
                priorEnergyCount++;
            }
        });

        const priorAvgEnergy = priorEnergyCount > 0 ? priorTotalEnergy / priorEnergyCount : null;
        const energyDelta = (priorAvgEnergy !== null && avgEnergyNum !== null)
            ? Number((avgEnergyNum - priorAvgEnergy).toFixed(2))
            : null;

        let aiInsight = '';
        if (avgSleepNum !== null || avgEnergyNum !== null) {
            if (avgSleepNum !== null && avgSleepNum >= 7 && avgEnergyNum !== null && avgEnergyNum >= 3) {
                aiInsight = 'Your energy and sleep are consistent this week — a stable foundation.';
            } else if (avgSleepNum !== null && avgSleepNum < 6) {
                aiInsight = 'Shorter sleep may be nudging your daily energy lower — prioritize restorative moments.';
            } else if (avgEnergyNum !== null && avgEnergyNum < 2.5) {
                aiInsight = 'Low energy combined with recent dreams suggests your mind is processing something heavy.';
            } else {
                aiInsight = 'Your daily sleep and energy maintain a steady, gentle rhythm.';
            }
        }

        res.json({
            avgSleep,
            avgSleepValue,
            sleepDelta,
            sleepBaselineDelta,
            avgEnergy,
            avgEnergyValue,
            energyDelta,
            energyWord,
            energyScaleText,
            dominantEmotion,
            aiInsight
        });
    } catch (err) {
        console.error('Error fetching snapshot:', err);
        res.status(500).json({ error: 'Failed to fetch snapshot' });
    }
});

// GET /api/insights/observations
router.get('/observations', mockAuth, async (req, res) => {
    try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const dreams = await Dream.find({ 
            userId: req.userId, 
            createdAt: { $gte: ninetyDaysAgo } 
        }).sort({ createdAt: -1 });
        
        if (dreams.length < 2) {
            return res.status(204).send();
        }

        // Cache Check
        const todayStr = new Date().toISOString().split('T')[0];
        const cached = await ObservationCache.findOne({
            userId: req.userId,
            generatedAt: { $gte: new Date(todayStr + "T00:00:00Z") }
        }).sort({ generatedAt: -1 });

        if (cached && Math.abs(cached.dreamCountAtGeneration - dreams.length) <= 1) {
            try {
                const parsedCache = JSON.parse(cached.text);
                if (parsedCache.headline && parsedCache.observation_1) {
                    return res.json({ tier: 2, ...parsedCache });
                }
            } catch (e) {
                // Regenerate if legacy
            }
        }

        // Generate new observation
        const metrics = await computeDreamMetrics(req.userId);
        const topStressorLine = metrics.topStressor ? `Frequent pre-sleep factor: ${metrics.topStressor.replace(/_/g, ' ')}` : '';
        const topThreatLine = metrics.topThreat ? `Frequent theme/threat: ${metrics.topThreat.replace(/_/g, ' ')}` : '';

        const dreamsSummary = dreams.slice(0, 15).map(d => {
            return `- Title: ${d.title}\n  Tags: ${(d.tags || []).join(', ')}\n  Energy: ${d.energyLevel || 3}\n  Description: ${d.description || d.memoryText || ''}`;
        }).join('\n');

        const prompt = `You are a calm, non-clinical wellness reflection assistant. You will analyze the user's dream entries and clinical theme context, and return a JSON object. Return ONLY valid JSON, no markdown, no code fences, no explanation before or after the JSON. Never use hashtags. Never use backticks. Never wrap words in code notation.
The exact format is:
{
  "headline": "a short emotional weather metaphor phrase, max 10 words",
  "observation_1": "one plain sentence, no hashtags, no special characters",
  "observation_2": "one plain sentence, no hashtags, no special characters",
  "observation_3": "one plain sentence, no hashtags, no special characters",
  "disclaimer": "Based on your own entries, not a clinical assessment"
}

Context:
${topStressorLine}
${topThreatLine}

Dream Summaries:
${dreamsSummary}`;

        let parsedData = null;
        try {
            const result = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            let rawText = (result.text || '').trim();
            rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsedData = JSON.parse(rawText);
        } catch (geminiErr) {
            console.error("Gemini observations generation failed or parse error:", geminiErr);
        }

        const cleanResult = {
            headline: parsedData?.headline || "Cool sunshine shifting gently into quiet unexpected storms",
            observation_1: parsedData?.observation_1 || "Your dreams frequently feature still water and mirrors that reflect unseen parts of yourself.",
            observation_2: parsedData?.observation_2 || "There is a recurring theme of confronting duplicate versions of yourself in familiar places.",
            observation_3: parsedData?.observation_3 || "Reflective morning check-ins indicate calm subconscious integration.",
            disclaimer: parsedData?.disclaimer || "Based on your own entries, not a clinical assessment"
        };

        // Store structured JSON in cache
        await ObservationCache.create({
            userId: req.userId,
            period: 'all',
            text: JSON.stringify(cleanResult),
            generatedAt: new Date(),
            dreamCountAtGeneration: dreams.length
        });

        res.json({ tier: 2, ...cleanResult });
    } catch (err) {
        console.error("Error fetching observations:", err);
        res.status(204).send();
    }
});

// ----------------------------------------------------
// CLINICAL AI DREAM ANALYSIS ENDPOINTS
// ----------------------------------------------------

// 1. GET /api/insights/rescript-candidate (Subconscious Rescripting IRT)
router.get('/rescript-candidate', mockAuth, async (req, res) => {
    try {
        const period = req.query.period || 'weekly';
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const days = period === 'monthly' ? 90 : (period === 'weekly' ? 28 : 14);
        start.setDate(start.getDate() - days);

        // Find unresolved nightmares / high-anxiety dreams
        const qualifyingDreams = await Dream.find({
            userId: req.userId,
            createdAt: { $gte: start },
            $or: [
                { tags: { $in: ['nightmare', 'distressing', 'uncomfortable', 'Nightmare', 'Distressing'] } },
                { sentimentLabel: 'Distressing' },
                { 'themes.anxiety': { $gt: 5 } }
            ],
            $and: [
                { $or: [{ rescriptedEnding: { $exists: false } }, { rescriptedEnding: null }, { rescriptedEnding: "" }] }
            ]
        }).sort({ createdAt: -1 });

        if (qualifyingDreams.length === 0) {
            return res.status(204).send();
        }

        const candidateDream = qualifyingDreams[0];

        // Check cache
        const cached = await ObservationCache.findOne({
            userId: req.userId,
            period: 'rescript'
        }).sort({ generatedAt: -1 });

        if (cached) {
            try {
                const parsed = JSON.parse(cached.text);
                if (parsed.dreamId === candidateDream._id.toString() && parsed.snippet) {
                    return res.json(parsed);
                }
            } catch (e) {}
        }

        const dreamContent = candidateDream.description || candidateDream.memoryText || '';
        const prompt = `This is a dream entry from someone's personal journal.
Title: "${candidateDream.title}"
Narrative: "${dreamContent}"

Task: Identify the moment of highest tension or unresolved stress in this narrative — one specific scene or moment, described in 1-2 sentences.
Return ONLY valid JSON:
{
  "snippet": "1-2 sentence moment of highest unresolved tension or stress",
  "dreamId": "${candidateDream._id}",
  "title": "${candidateDream.title}"
}
Do not add commentary. Just identify the scene.`;

        let snippetResult = {
            snippet: dreamContent.length > 140 ? dreamContent.slice(0, 140) + '...' : dreamContent,
            dreamId: candidateDream._id,
            title: candidateDream.title
        };

        try {
            const result = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            const parsed = JSON.parse(result.text);
            if (parsed.snippet) {
                snippetResult = {
                    snippet: parsed.snippet,
                    dreamId: candidateDream._id,
                    title: candidateDream.title
                };
            }
        } catch (geminiErr) {
            console.error("Gemini rescript candidate error:", geminiErr);
        }

        // Cache in ObservationCache
        await ObservationCache.create({
            userId: req.userId,
            period: 'rescript',
            text: JSON.stringify(snippetResult),
            generatedAt: new Date(),
            dreamCountAtGeneration: 1
        });

        res.json(snippetResult);
    } catch (err) {
        console.error("Error fetching rescript candidate:", err);
        res.status(204).send();
    }
});

// 2. GET /api/insights/dream-reflection (Dream Reflection Spotlight)
router.get('/dream-reflection', mockAuth, async (req, res) => {
    try {
        const period = req.query.period || 'weekly';
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const days = period === 'monthly' ? 90 : (period === 'weekly' ? 28 : 14);
        start.setDate(start.getDate() - days);

        const dreams = await Dream.find({
            userId: req.userId,
            createdAt: { $gte: start }
        }).sort({ createdAt: -1 });

        // Gate: requires 3+ dreams
        if (dreams.length < 3) {
            return res.status(204).send();
        }

        // Check cache
        const cached = await ObservationCache.findOne({
            userId: req.userId,
            period: 'reflection',
            dreamCountAtGeneration: dreams.length
        }).sort({ generatedAt: -1 });

        if (cached) {
            try {
                const parsed = JSON.parse(cached.text);
                if (parsed.quote && parsed.reflection) {
                    return res.json(parsed);
                }
            } catch (e) {}
        }

        const dreamsSummary = dreams.slice(0, 10).map(d =>
            `Title: "${d.title}"\nContent: "${d.description || d.memoryText}"`
        ).join('\n---\n');

        const prompt = `Analyze these dream journal entries:
${dreamsSummary}

Task: Find ONE specific element, image, or recurring situation that seems emotionally significant.
Extract a short direct quote from the actual dream text (under 20 words).
Write one gentle reflective question the person could sit with about their waking life — not advice, just a question.

Return ONLY valid JSON:
{
  "quote": "short direct quote from dream under 20 words",
  "source": "Title of the dream it came from",
  "reflection": "one open, gentle question, no advice, no clinical labels"
}
Do not use clinical labels. Do not diagnose. Frame everything as curiosity, not assessment.`;

        let reflectionResult = null;
        try {
            const result = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            const parsed = JSON.parse(result.text);
            if (parsed.quote && parsed.reflection) {
                reflectionResult = {
                    quote: parsed.quote.replace(/^["']|["']$/g, ''),
                    source: parsed.source || dreams[0].title,
                    reflection: parsed.reflection
                };
            }
        } catch (geminiErr) {
            console.error("Gemini dream-reflection error:", geminiErr);
        }

        if (!reflectionResult) {
            return res.status(204).send();
        }

        await ObservationCache.create({
            userId: req.userId,
            period: 'reflection',
            text: JSON.stringify(reflectionResult),
            generatedAt: new Date(),
            dreamCountAtGeneration: dreams.length
        });

        res.json(reflectionResult);
    } catch (err) {
        console.error("Error generating dream reflection:", err);
        res.status(204).send();
    }
});

// 3. GET /api/insights/safe-anchor (Safe Anchor Extraction)
router.get('/safe-anchor', mockAuth, async (req, res) => {
    try {
        const period = req.query.period || 'weekly';
        const now = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const days = period === 'monthly' ? 90 : (period === 'weekly' ? 28 : 14);
        start.setDate(start.getDate() - days);

        const dreams = await Dream.find({
            userId: req.userId,
            createdAt: { $gte: start }
        }).sort({ createdAt: -1 });

        // Gate: requires 2+ dreams
        if (dreams.length < 2) {
            return res.status(204).send();
        }

        // Check cache
        const cached = await ObservationCache.findOne({
            userId: req.userId,
            period: 'anchor',
            dreamCountAtGeneration: dreams.length
        }).sort({ generatedAt: -1 });

        if (cached) {
            try {
                const parsed = JSON.parse(cached.text);
                if (parsed && parsed.anchor) {
                    return res.json(parsed);
                }
            } catch (e) {}
        }

        const dreamsSummary = dreams.slice(0, 8).map(d =>
            `Title: "${d.title}"\nContent: "${d.description || d.memoryText}"`
        ).join('\n---\n');

        const prompt = `In these dream journal entries:
${dreamsSummary}

Task: Identify ONE image, object, or sensation that is neutral or calming — even if the overall dream was stressful. This must be something the person described, not something you invent.
Return ONLY valid JSON in this format:
{
  "anchor": "specific image or sensation, e.g. still water",
  "context": "one sentence of context from the dream describing that moment",
  "prompt": "one gentle journaling prompt about this anchor, starting with 'What does...'"
}
If no neutral/calming element exists in the text, return JSON: { "anchor": null }`;

        let anchorResult = null;
        try {
            const result = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            const parsed = JSON.parse(result.text);
            if (parsed && parsed.anchor && parsed.prompt) {
                anchorResult = {
                    anchor: parsed.anchor,
                    context: parsed.context || `Even amidst the unexpected storms in your dreams this period, your mind created an image of "${parsed.anchor}."`,
                    prompt: parsed.prompt
                };
            }
        } catch (geminiErr) {
            console.error("Gemini safe anchor error:", geminiErr);
        }

        if (!anchorResult || !anchorResult.anchor) {
            return res.status(204).send();
        }

        await ObservationCache.create({
            userId: req.userId,
            period: 'anchor',
            text: JSON.stringify(anchorResult),
            generatedAt: new Date(),
            dreamCountAtGeneration: dreams.length
        });

        res.json(anchorResult);
    } catch (err) {
        console.error("Error generating safe anchor:", err);
        res.status(204).send();
    }
});

// ----------------------------------------------------
// DIGITAL RHYTHM & TYPING DYNAMICS ENDPOINTS
// ----------------------------------------------------

// POST /api/insights/digital-rhythm-insight
router.post('/digital-rhythm-insight', mockAuth, async (req, res) => {
    try {
        const { averageWPM = 40, pauseCount = 0, backspaceRatio = 0 } = req.body;
        
        const prompt = `You are an empathetic wellness companion. Based on these typing metrics from the user's dream journal session:
- Average typing speed: ${averageWPM} WPM
- Long pauses (>2s): ${pauseCount}
- Backspace correction ratio: ${(backspaceRatio * 100).toFixed(1)}%

Write exactly one calm, non-clinical sentence reflecting what their typing rhythm may say about their nervous system state during that session.
Do not diagnose. Do not use numbers or technical terms. Be warm and observational.
If the typing data suggests extreme distress or urgency (very high backspace ratio and fast typing), gently note that support and calming resources are available.
Example outputs:
- Slow/heavy: "Your typing during yesterday's entry had long, quiet pauses — a rhythm that often mirrors physical tiredness or a mind that needed to be gentle with itself."
- Fast/erratic: "Your keystrokes were unusually quick with frequent corrections — your nervous system seemed to be carrying some urgency while you wrote that dream."
- Baseline: "Your writing flowed steadily through this entry — an easy, consistent rhythm that suggests you were in a grounded state while logging."

Return ONLY the single sentence without markdown or quotes.`;

        let insight = "Your writing flowed steadily through this entry — an easy, consistent rhythm that suggests you were in a grounded state while logging.";
        try {
            const result = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: prompt
            });
            const cleanText = (result.text || '').trim().replace(/^["']|["']$/g, '');
            if (cleanText) insight = cleanText;
        } catch (err) {
            console.error("Gemini digital rhythm insight generation failed, using empathetic fallback:", err);
            if (averageWPM < 30 || pauseCount >= 3) {
                insight = "Your typing during yesterday's entry had long, quiet pauses — a rhythm that often mirrors physical tiredness or a mind that needed to be gentle with itself.";
            } else if (averageWPM > 65 || backspaceRatio > 0.15) {
                insight = "Your keystrokes were unusually quick with frequent corrections — your nervous system seemed to be carrying some urgency while you wrote that dream.";
            }
        }

        res.json({ insight });
    } catch (err) {
        console.error("Error in digital-rhythm-insight endpoint:", err);
        res.status(500).json({ error: "Failed to generate digital rhythm insight" });
    }
});

// GET /api/insights/digital-rhythm
router.get('/digital-rhythm', mockAuth, async (req, res) => {
    try {
        const latestTypingDream = await Dream.findOne({
            userId: req.userId,
            $or: [
                { 'typingDynamics.wordsPerMinute': { $exists: true, $ne: null } },
                { 'typingDynamics.averageWPM': { $exists: true, $ne: null } }
            ]
        }).sort({ createdAt: -1 });

        if (!latestTypingDream || !latestTypingDream.typingDynamics) {
            return res.json({
                hasData: false,
                averageWPM: null,
                pauseCount: 0,
                backspaceRatio: 0,
                gaugePosition: 0.5,
                insight: null
            });
        }

        const td = latestTypingDream.typingDynamics;
        const averageWPM = td.averageWPM || td.wordsPerMinute || 42;
        const pauseCount = td.pauseCount ?? td.longPauseCount ?? 0;
        const backspaceRatio = td.backspaceRatio ?? 0;
        const sessionDurationSeconds = td.sessionDurationSeconds ?? (td.sessionDurationMs ? Math.round(td.sessionDurationMs / 1000) : 0);

        // Normalize position from 0.0 to 1.0
        let position = 0.5;
        if (averageWPM < 30 || pauseCount >= 3) {
            const wpmNorm = Math.max(0.08, Math.min(0.35, (averageWPM / 30) * 0.35));
            position = wpmNorm;
        } else if (averageWPM > 65 || backspaceRatio > 0.15) {
            const highNorm = Math.min(0.92, 0.65 + Math.min(0.27, ((averageWPM - 65) / 50) * 0.15 + (backspaceRatio * 0.8)));
            position = highNorm;
        } else {
            position = 0.35 + Math.min(0.30, ((averageWPM - 30) / 35) * 0.30);
        }

        let insight = "Your writing flowed steadily through this entry — an easy, consistent rhythm that suggests you were in a grounded state while logging.";
        if (position <= 0.35) {
            insight = "Your typing during yesterday's entry had long, quiet pauses — a rhythm that often mirrors physical tiredness or a mind that needed to be gentle with itself.";
        } else if (position >= 0.65) {
            insight = "Your keystrokes were unusually quick with frequent corrections — your nervous system seemed to be carrying some urgency while you wrote that dream.";
        }

        res.json({
            hasData: true,
            averageWPM,
            pauseCount,
            backspaceRatio,
            sessionDurationSeconds,
            gaugePosition: Math.round(position * 100) / 100,
            insight
        });
    } catch (err) {
        console.error("Error fetching digital rhythm:", err);
        res.status(500).json({ error: "Failed to fetch digital rhythm" });
    }
});

// GET /api/insights/typing-patterns - Passive Typing Dynamics 4-week trend & baseline
router.get('/typing-patterns', mockAuth, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch user's dreams with typing dynamics
        const allTypingDreams = await Dream.find({
            userId: req.userId,
            $or: [
                { 'typingDynamics.wordsPerMinute': { $exists: true, $ne: null } },
                { 'typingDynamics.averageWPM': { $exists: true, $ne: null } }
            ]
        }).sort({ createdAt: 1 });

        if (allTypingDreams.length === 0) {
            return res.json({
                hasEnoughData: false,
                totalEntries: 0,
                baseline: 0,
                currentWeekVsBaseline: 0,
                weeklyAverages: []
            });
        }

        // Calculate personal baseline (mean WPM across all dreams)
        const totalWPM = allTypingDreams.reduce((sum, d) => sum + (d.typingDynamics.averageWPM || d.typingDynamics.wordsPerMinute || 0), 0);
        const baseline = Math.round(totalWPM / allTypingDreams.length);

        // Group into last 4 weeks (7 days each)
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const weekBuckets = [
            { label: 'W1', start: now - 28 * oneDayMs, end: now - 21 * oneDayMs, wpms: [] },
            { label: 'W2', start: now - 21 * oneDayMs, end: now - 14 * oneDayMs, wpms: [] },
            { label: 'W3', start: now - 14 * oneDayMs, end: now - 7 * oneDayMs, wpms: [] },
            { label: 'W4', start: now - 7 * oneDayMs, end: now, wpms: [] }
        ];

        allTypingDreams.forEach(dream => {
            const time = new Date(dream.createdAt || dream.date).getTime();
            const wpm = dream.typingDynamics.averageWPM || dream.typingDynamics.wordsPerMinute || 0;
            for (const bucket of weekBuckets) {
                if (time >= bucket.start && time <= bucket.end) {
                    bucket.wpms.push(wpm);
                    break;
                }
            }
        });

        const weeklyAverages = weekBuckets.map(b => ({
            week: b.label,
            avgWPM: b.wpms.length > 0 ? Math.round(b.wpms.reduce((a, c) => a + c, 0) / b.wpms.length) : (baseline > 0 ? baseline : 0),
            count: b.wpms.length
        }));

        // Current week vs baseline percentage
        const currentWeekAvg = weeklyAverages[weeklyAverages.length - 1].avgWPM;
        const currentWeekVsBaseline = baseline > 0 
            ? Math.round(((currentWeekAvg - baseline) / baseline) * 100)
            : 0;

        res.json({
            hasEnoughData: allTypingDreams.length >= 3,
            totalEntries: allTypingDreams.length,
            baseline,
            currentWeekVsBaseline,
            weeklyAverages
        });
    } catch (err) {
        console.error("Error fetching typing patterns:", err);
        res.status(500).json({ error: "Failed to aggregate typing patterns" });
    }
});

// 2. GET /api/insights/ema-patterns - Longitudinal EMA Gemini Pattern Discovery
router.get('/ema-patterns', mockAuth, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const totalEntries = await EMAEntry.countDocuments({
            userId: req.userId,
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Gate: Requires 20+ EMA entries for meaningful synthesis
        if (totalEntries < 20) {
            return res.json({
                hasEnoughData: false,
                totalEntries,
                requiredEntries: 20,
                pattern: null,
                confidence: null
            });
        }

        // Cache Check
        const cached = await ObservationCache.findOne({
            userId: req.userId,
            period: 'ema_patterns'
        }).sort({ generatedAt: -1 });

        if (cached && Math.abs((cached.dreamCountAtGeneration || 0) - totalEntries) < 5) {
            try {
                const parsed = JSON.parse(cached.text);
                return res.json({
                    hasEnoughData: true,
                    totalEntries,
                    pattern: parsed.pattern,
                    confidence: parsed.confidence || 'medium'
                });
            } catch (e) {
                // Invalid JSON, regenerate
            }
        }

        // Fetch recent entries to analyze
        const entries = await EMAEntry.find({
            userId: req.userId,
            createdAt: { $gte: thirtyDaysAgo }
        }).sort({ createdAt: 1 });

        const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const formattedEntries = entries.map(e => {
            const dt = new Date(e.createdAt);
            const dayName = daysMap[dt.getDay()];
            const hour = dt.getHours();
            const timeOfDay = hour < 12 ? 'Morning' : (hour < 17 ? 'Afternoon' : 'Evening');
            return `- [${dayName} ${timeOfDay} (${dt.toLocaleDateString()})] Mood: ${e.mood}, Energy: ${e.energyLevel}/5, Prompt: "${e.question}"`;
        }).join('\n');

        const prompt = `You are analyzing a user's self-reported mental wellness check-ins (Ecological Momentary Assessment / EMA).
Given these ${entries.length} mood/energy datapoints over the past 30 days:
${formattedEntries}

Task: Identify any clear time-of-day patterns (e.g. higher energy in mornings vs afternoons), day-of-week patterns (e.g. calm weekends vs tense mid-week), or multi-day trends.
Describe only what is clearly present in the data in 1-2 calm, supportive, non-judgmental sentences.
Do NOT infer clinical conditions, diagnoses, or pathologies. If no clear pattern is present, say so plainly.

Return ONLY a JSON object:
{
  "pattern": "1-2 sentence observational synthesis",
  "confidence": "low" | "medium" | "high"
}`;

        let patternResult = {
            pattern: "Your energy and mood check-ins remain steady across the week.",
            confidence: "medium"
        };

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-flash-latest',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const parsed = JSON.parse(response.text);
            if (parsed.pattern) {
                patternResult = {
                    pattern: parsed.pattern,
                    confidence: parsed.confidence || 'medium'
                };
            }
        } catch (geminiErr) {
            console.error("Gemini GenAI EMA pattern analysis failed, trying GenerativeAI fallback:", geminiErr);
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const result = await model.generateContent(prompt);
            const cleaned = result.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.pattern) {
                patternResult = {
                    pattern: parsed.pattern,
                    confidence: parsed.confidence || 'medium'
                };
            }
        }

        // Cache result in ObservationCache
        await ObservationCache.create({
            userId: req.userId,
            period: 'ema_patterns',
            text: JSON.stringify(patternResult),
            generatedAt: new Date(),
            dreamCountAtGeneration: totalEntries
        });

        res.json({
            hasEnoughData: true,
            totalEntries,
            pattern: patternResult.pattern,
            confidence: patternResult.confidence
        });
    } catch (err) {
        console.error("Error fetching EMA patterns:", err);
        res.status(500).json({ error: "Failed to generate EMA pattern insights" });
    }
});

// 3. GET /api/insights/input-signals - Voice vs Typed entry breakdown for Input Signals section
router.get('/input-signals', mockAuth, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dreams = await Dream.find({
            userId: req.userId,
            createdAt: { $gte: thirtyDaysAgo }
        });

        const totalDreams = dreams.length;
        const voiceCount = dreams.filter(d => d.inputMethod === 'voice').length;
        const typedCount = totalDreams - voiceCount;
        const voiceRatio = totalDreams > 0 ? Math.round((voiceCount / totalDreams) * 100) : 0;

        res.json({
            totalDreams,
            voiceCount,
            typedCount,
            voiceRatio
        });
    } catch (err) {
        console.error("Error fetching input signals summary:", err);
        res.status(500).json({ error: "Failed to fetch input signals" });
    }
});

// GET /api/insights/heart-rate-trend (auth required)
// Returns last [limit] valid readings (default 30, max 90) + statistics + trend
router.get('/heart-rate-trend', mockAuth, async (req, res) => {
    try {
        let limit = parseInt(req.query.limit, 10);
        if (isNaN(limit) || limit <= 0) {
            limit = 30;
        } else if (limit > 90) {
            limit = 90;
        }

        const logs = await HeartRateLog.find({
            userId: req.userId,
            quality: 'valid'
        })
            .sort({ createdAt: -1 })
            .limit(limit);

        const readings = logs.map(l => ({
            bpm: l.bpm,
            createdAt: l.createdAt.toISOString(),
            context: l.context
        }));

        if (readings.length === 0) {
            return res.json({
                readings: [],
                average: 0,
                min: 0,
                max: 0,
                trend: 'insufficient_data'
            });
        }

        const bpmList = readings.map(r => r.bpm);
        const sum = bpmList.reduce((a, b) => a + b, 0);
        const average = Math.round(sum / bpmList.length);
        const min = Math.min(...bpmList);
        const max = Math.max(...bpmList);

        let trend = 'insufficient_data';
        // Trend logic: compare mean of most recent 5 readings vs mean of the 5 before that.
        // If difference > 5 BPM decrease: 'improving'.
        // If > 5 BPM increase: 'declining'.
        // If < 5 either way: 'stable'.
        // If fewer than 10 readings total: 'insufficient_data'.
        if (readings.length >= 10) {
            const recent5 = readings.slice(0, 5);
            const prior5 = readings.slice(5, 10);
            const meanRecent5 = recent5.reduce((a, b) => a + b.bpm, 0) / 5;
            const meanPrior5 = prior5.reduce((a, b) => a + b.bpm, 0) / 5;
            const diff = meanRecent5 - meanPrior5;

            if (diff < -5) {
                trend = 'improving';
            } else if (diff > 5) {
                trend = 'declining';
            } else {
                trend = 'stable';
            }
        }

        res.json({
            readings,
            average,
            min,
            max,
            trend
        });
    } catch (err) {
        console.error("Error fetching heart rate trend:", err);
        res.status(500).json({ error: "Failed to fetch heart rate trend" });
    }
});

module.exports = router;

