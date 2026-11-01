const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const CopingCard = require('../models/CopingCard');
const AudioResource = require('../models/AudioResource');
const MoodLog = require('../models/MoodLog');
const PeerStory = require('../models/PeerStory');
const User = require('../models/User');
const WellnessContent = require('../models/WellnessContent');
const ThoughtRecord = require('../models/ThoughtRecord');
const BehavioralTask = require('../models/BehavioralTask');
const SafetyPlan = require('../models/SafetyPlan');
const MicroTask = require('../models/MicroTask');
const DoneItem = require('../models/DoneItem');
const WellnessLog = require('../models/WellnessLog');
const MoodCheckIn = require('../models/MoodCheckIn');
const DailyVitals = require('../models/DailyVitals');

// Seed default MicroTasks if none exist
const seedMicroTasks = async () => {
    try {
        const count = await MicroTask.countDocuments();
        if (count === 0) {
            const defaultTasks = [
                { taskText: "Clear one small surface near you.", category: "Order" },
                { taskText: "Drink one full glass of water.", category: "Health" },
                { taskText: "Step outside or look out a window for 2 minutes.", category: "Self-Care" },
                { taskText: "Stretch your arms above your head for 30 seconds.", category: "Health" },
                { taskText: "Unsubscribe from one unwanted email.", category: "Order" },
                { taskText: "Send a quick text to check in on a friend.", category: "Connection" },
                { taskText: "Wash one dish or put one item away.", category: "Order" },
                { taskText: "Take 5 deep, slow breaths.", category: "Health" },
                { taskText: "Write down one thing you are glad is over.", category: "Self-Care" },
                { taskText: "Change into a clean or comfortable shirt.", category: "Self-Care" }
            ];
            await MicroTask.insertMany(defaultTasks);
            console.log("Seeded default MicroTasks.");
        }
    } catch (err) {
        console.error("Error seeding MicroTasks:", err);
    }
};
seedMicroTasks();

// ----------------------------------------------------
// Mock Authentication Middleware (consistent with server)
// ----------------------------------------------------
const mockAuth = require('../middleware/auth');

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. GET /api/wellness/coping-cards -> Returns list of coping cards grouped by category
router.get('/wellness/coping-cards', async (req, res) => {
    try {
        const cards = await CopingCard.find().sort({ createdAt: -1 });
        // Group by category
        const grouped = cards.reduce((acc, card) => {
            if (!acc[card.category]) {
                acc[card.category] = [];
            }
            acc[card.category].push(card);
            return acc;
        }, {});
        res.json(grouped);
    } catch (err) {
        console.error("Error fetching coping cards:", err);
        res.status(500).json({ error: "Failed to fetch coping cards" });
    }
});

// 2. GET /api/wellness/audio?category=... -> Returns audio tracks matching requested category
router.get('/wellness/audio', async (req, res) => {
    try {
        const { category } = req.query;
        const filter = {};
        if (category) {
            filter.category = category;
        }
        const audioList = await AudioResource.find(filter).sort({ createdAt: -1 });
        res.json(audioList);
    } catch (err) {
        console.error("Error fetching audio resources:", err);
        res.status(500).json({ error: "Failed to fetch audio resources" });
    }
});

// 2b. GET /api/wellness/content -> Returns all wellness content library items
router.get('/wellness/content', async (req, res) => {
    try {
        const content = await WellnessContent.find().sort({ order: 1 });
        res.json(content);
    } catch (err) {
        console.error("Error fetching wellness content:", err);
        res.status(500).json({ error: "Failed to fetch wellness content" });
    }
});

// 3. POST /api/wellness/mood-log -> Saves somatic check-in (Auth required)
router.post('/wellness/mood-log', mockAuth, async (req, res) => {
    try {
        const { 
            somaticScale, 
            somaticLabel, 
            bodyRegions, 
            contextTag, 
            spotifyImpact,
            energyLevel, 
            emotionTag 
        } = req.body;

        const effectiveUserId = req.userId || req.user?._id || req.user?.id;
        if (!effectiveUserId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const logData = {
            userId: effectiveUserId
        };

        // If somaticScale is explicitly provided (or explicitly null for 'prefer not to answer')
        if (somaticScale !== undefined) {
            if (somaticScale !== null && (typeof somaticScale !== 'number' || somaticScale < 1 || somaticScale > 5)) {
                return res.status(400).json({ error: "somaticScale must be a number between 1 and 5, or null" });
            }
            logData.somaticScale = somaticScale;
            logData.somaticLabel = somaticLabel || (
                somaticScale === 1 ? 'very_unsettled' :
                somaticScale === 2 ? 'unsettled' :
                somaticScale === 3 ? 'neutral' :
                somaticScale === 4 ? 'settled' :
                somaticScale === 5 ? 'deeply_grounded' : 'unspecified'
            );
            const regionMap = {
                'chest & ribs': 'chest_tightness',
                'chest_tightness': 'chest_tightness',
                'jaw & temples': 'jaw_clenching',
                'jaw_clenching': 'jaw_clenching',
                'restless limbs': 'restless_energy',
                'restless_energy': 'restless_energy',
                'heavy torso': 'heaviness',
                'heaviness': 'heaviness',
                'open & receptive': 'even_open',
                'even_open': 'even_open',
            };
            const contextMap = {
                'just woke up': 'just_woke_up',
                'just_woke_up': 'just_woke_up',
                'before sleep': 'before_sleep',
                'before_sleep': 'before_sleep',
                'after a dream': 'after_dream',
                'after_dream': 'after_dream',
                'difficult interaction': 'difficult_interaction',
                'difficult_interaction': 'difficult_interaction',
                'caffeine intake': 'after_caffeine',
                'after_caffeine': 'after_caffeine',
                'movement & walk': 'after_movement',
                'after_movement': 'after_movement',
                'after music': 'after_music',
                'after_music': 'after_music',
                'no obvious trigger': 'no_trigger',
                'no_trigger': 'no_trigger',
            };

            const rawRegions = Array.isArray(bodyRegions) ? bodyRegions : [];
            logData.bodyRegions = rawRegions.map(r => regionMap[String(r).toLowerCase().trim()] || 'even_open');
            logData.contextTag = contextMap[String(contextTag).toLowerCase().trim()] || 'no_trigger';
            if (spotifyImpact) {
                logData.spotifyImpact = spotifyImpact;
            }
        } else {
            // Legacy payload fallback
            if (typeof energyLevel === 'number') {
                logData.energyLevel = energyLevel;
            }
            if (emotionTag) {
                logData.emotionTag = emotionTag;
            }
        }

        const moodLog = new MoodLog(logData);
        await moodLog.save();
        res.status(201).json(moodLog);
    } catch (err) {
        console.error("Error saving mood log:", err);
        res.status(500).json({ error: "Failed to save mood log", details: err.message });
    }
});

// 4. POST /api/mood-checkins -> Saves simple current state check-in (Clear/Foggy/Heavy) (Upsert per day)
router.post('/mood-checkins', mockAuth, async (req, res) => {
    try {
        const { mood } = req.body;
        
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        let checkIn = await MoodCheckIn.findOne({
            userId: req.user.id,
            createdAt: { $gte: startOfDay, $lt: endOfDay }
        });

        if (checkIn) {
            checkIn.mood = mood;
            checkIn.createdAt = now; // update to the latest time
            await checkIn.save();
        } else {
            checkIn = new MoodCheckIn({
                userId: req.user.id,
                mood
            });
            await checkIn.save();
        }

        res.status(201).json(checkIn);
    } catch (err) {
        console.error("Error saving mood check-in:", err);
        res.status(500).json({ error: "Failed to save mood check-in" });
    }
});

// 4b. GET /api/mood-checkins -> Gets recent current state check-ins
router.get('/mood-checkins', mockAuth, async (req, res) => {
    try {
        const checkins = await MoodCheckIn.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(7);
        res.json(checkins);
    } catch (err) {
        console.error("Error fetching mood check-ins:", err);
        res.status(500).json({ error: "Failed to fetch mood check-ins" });
    }
});

// 5. GET /api/wellness/mood-history -> Returns mood history for charting (energy and sleep)
router.get('/wellness/mood-history', mockAuth, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await MoodLog.find({
            userId: req.userId,
            createdAt: { $gte: thirtyDaysAgo }
        }).sort({ createdAt: 1 }); // Sort ascending by date for line chart plotting

        res.json(logs);
    } catch (err) {
        console.error("Error fetching mood history:", err);
        res.status(500).json({ error: "Failed to fetch mood history" });
    }
});

// GET /api/wellness/sleep-week
router.get('/wellness/sleep-week', mockAuth, async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateStr = sevenDaysAgo.toISOString().split('T')[0];

        const logs = await WellnessLog.find({
            userId: req.user.id || req.userId,
            date: { $gte: dateStr }
        }).sort({ date: 1 });

        const mapped = logs.map(l => ({
            date: l.date,
            sleepHours: (l.sleepMinutes || 0) / 60
        }));

        res.json(mapped);
    } catch (err) {
        console.error("Error fetching sleep week:", err);
        res.status(500).json({ error: "Failed to fetch sleep week" });
    }
});

// 5. GET /api/wellness/peer-stories -> Returns the 20 most recent approved peer stories
router.get('/wellness/peer-stories', async (req, res) => {
    try {
        const stories = await PeerStory.find({ approved: true })
            .sort({ createdAt: -1 })
            .limit(20);
        const result = stories.map(s => {
            const obj = s.toObject();
            obj.likeCount = s.likedBy ? s.likedBy.length : 0;
            return obj;
        });
        res.json(result);
    } catch (err) {
        console.error("Error fetching peer stories:", err);
        res.status(500).json({ error: "Failed to fetch peer stories" });
    }
});

// 5b. GET /api/peer-stories -> Returns all approved stories (list approved stories only)
router.get('/peer-stories', async (req, res) => {
    try {
        const stories = await PeerStory.find({ approved: true }).sort({ createdAt: -1 });
        const result = stories.map(s => {
            const obj = s.toObject();
            obj.likeCount = s.likedBy ? s.likedBy.length : 0;
            return obj;
        });
        res.json(result);
    } catch (err) {
        console.error("Error fetching peer stories:", err);
        res.status(500).json({ error: "Failed to fetch peer stories" });
    }
});

// 5c. GET /api/peer-stories/:id -> Returns full story detail (Auth required, only if approved)
router.get('/peer-stories/:id', mockAuth, async (req, res) => {
    try {
        const story = await PeerStory.findById(req.params.id);
        if (!story) {
            return res.status(404).json({ error: "Story not found" });
        }
        if (!story.approved) {
            return res.status(403).json({ error: "Access denied. Story is pending review." });
        }
        const obj = story.toObject();
        obj.likeCount = story.likedBy ? story.likedBy.length : 0;
        obj.hasLiked = story.likedBy ? story.likedBy.some(id => id.toString() === req.userId.toString()) : false;
        res.json(obj);
    } catch (err) {
        console.error("Error fetching peer story detail:", err);
        res.status(500).json({ error: "Failed to fetch peer story detail" });
    }
});

// 5d. POST /api/peer-stories/:id/like -> Toggle like on a story (Auth required)
router.post('/peer-stories/:id/like', mockAuth, async (req, res) => {
    try {
        const story = await PeerStory.findById(req.params.id);
        if (!story) {
            return res.status(404).json({ error: "Story not found" });
        }
        if (!story.approved) {
            return res.status(403).json({ error: "Cannot like an unapproved story" });
        }

        if (!story.likedBy) {
            story.likedBy = [];
        }

        const index = story.likedBy.findIndex(id => id.toString() === req.userId.toString());
        let hasLiked = false;
        if (index > -1) {
            // Unlike
            story.likedBy.splice(index, 1);
            hasLiked = false;
        } else {
            // Like
            story.likedBy.push(req.userId);
            hasLiked = true;
        }

        await story.save();
        res.json({
            likeCount: story.likedBy.length,
            hasLiked
        });
    } catch (err) {
        console.error("Error toggling like:", err);
        res.status(500).json({ error: "Failed to toggle like" });
    }
});

// 6. POST /api/wellness/peer-stories -> Saves content
router.post('/wellness/peer-stories', mockAuth, async (req, res) => {
    try {
        const { content, title, body, isAnonymous, authorName, consentGiven, overcame, overcomeDetail } = req.body;
        const storyBody = body || content;
        const storyTitle = title || "A Supportive Voice";

        if (!storyBody || typeof storyBody !== 'string') {
            return res.status(400).json({ error: "Story body/content is required" });
        }
        if (storyBody.length > 2000) {
            return res.status(400).json({ error: "Story must not exceed 2000 characters" });
        }
        if (!consentGiven) {
            return res.status(400).json({ error: "Consent is required to submit a story" });
        }

        // Sanitize - remove HTML tags, keep it text only
        const sanitizedBody = storyBody.replace(/<[^>]*>/g, '').trim();

        const peerStory = new PeerStory({
            title: storyTitle,
            body: sanitizedBody,
            isAnonymous: isAnonymous !== undefined ? isAnonymous : true,
            authorName: isAnonymous ? undefined : authorName,
            overcame: overcame,
            overcomeDetail: overcomeDetail,
            consentGiven: true,
            consentTimestamp: new Date(),
            // TEMPORARY — revert to 'pending' before allowing public/external users to submit stories. Auto-approving is only acceptable during development testing.
            approved: true,
            submittedBy: req.userId
        });

        await peerStory.save();
        res.status(201).json(peerStory);
    } catch (err) {
        console.error("Error saving peer story:", err);
        res.status(500).json({ error: "Failed to save peer story" });
    }
});

// ----------------------------------------------------
// NEW CBT & SAFETY PLAN ROUTES
// ----------------------------------------------------

// GET /api/wellness/thought-records
router.get('/wellness/thought-records', mockAuth, async (req, res) => {
    try {
        const records = await ThoughtRecord.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(records);
    } catch (err) {
        console.error("Error fetching thought records:", err);
        res.status(500).json({ error: "Failed to fetch thought records" });
    }
});

const { GoogleGenerativeAI } = require('@google/generative-ai');

// GET /api/wellness/cognitive-distortions-summary
router.get('/wellness/cognitive-distortions-summary', mockAuth, async (req, res) => {
    try {
        const records = await ThoughtRecord.find({ userId: req.userId }).sort({ createdAt: -1 });
        const count = records.length;

        if (count === 0) {
            return res.json({ tier: 0, counts: {} });
        }

        const counts = {};
        records.forEach(r => {
            const d = r.distortion || 'Unknown';
            counts[d] = (counts[d] || 0) + 1;
        });

        if (count >= 1 && count <= 4) {
            return res.json({ tier: 1, counts });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const recentRecordsText = records.slice(0, 10).map(r => `Distortion: ${r.distortion}\nThought: ${r.automaticThought}`).join('\n\n');
        
        const prompt = `Review the following recent cognitive distortions identified by the user. Write a single sentence observation about the pattern of their distortions without giving advice or being clinical.
        
        Records:
        ${recentRecordsText}`;

        const result = await model.generateContent(prompt);
        let summary = result.response.text().trim();

        return res.json({ tier: 2, counts, summary });
    } catch (err) {
        console.error("Error fetching cognitive distortions summary:", err);
        res.status(500).json({ error: "Failed to fetch cognitive distortions summary" });
    }
});

// POST /api/wellness/thought-records
router.post('/wellness/thought-records', mockAuth, async (req, res) => {
    try {
        const { situation, automaticThought, distortion, rationalResponse } = req.body;
        if (!situation || !automaticThought || !distortion || !rationalResponse) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const record = new ThoughtRecord({
            userId: req.userId,
            situation,
            automaticThought,
            distortion,
            rationalResponse
        });
        await record.save();
        res.status(201).json(record);
    } catch (err) {
        console.error("Error saving thought record:", err);
        res.status(500).json({ error: "Failed to save thought record" });
    }
});

// GET /api/wellness/behavioral-tasks
router.get('/wellness/behavioral-tasks', mockAuth, async (req, res) => {
    try {
        const tasks = await BehavioralTask.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        console.error("Error fetching tasks:", err);
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
});

// POST /api/wellness/behavioral-tasks
router.post('/wellness/behavioral-tasks', mockAuth, async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) return res.status(400).json({ error: "Title required" });
        const task = new BehavioralTask({ userId: req.userId, title });
        await task.save();
        res.status(201).json(task);
    } catch (err) {
        console.error("Error saving task:", err);
        res.status(500).json({ error: "Failed to save task" });
    }
});

// PUT /api/wellness/behavioral-tasks/:id
router.put('/wellness/behavioral-tasks/:id', mockAuth, async (req, res) => {
    try {
        const { completed } = req.body;
        const task = await BehavioralTask.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { completed },
            { returnDocument: 'after' }
        );
        if (!task) return res.status(404).json({ error: "Task not found" });
        res.json(task);
    } catch (err) {
        console.error("Error updating task:", err);
        res.status(500).json({ error: "Failed to update task" });
    }
});

// GET /api/wellness/safety-plan
router.get('/wellness/safety-plan', mockAuth, async (req, res) => {
    try {
        let plan = await SafetyPlan.findOne({ userId: req.userId });
        if (!plan) {
            plan = new SafetyPlan({
                userId: req.userId,
                professionalSupport: ["988 (Call or Text)", "Crisis Text Line (Text HOME to 741741)"]
            });
            await plan.save();
        }
        res.json(plan);
    } catch (err) {
        console.error("Error fetching safety plan:", err);
        res.status(500).json({ error: "Failed to fetch safety plan" });
    }
});

// PUT /api/wellness/safety-plan
router.put('/wellness/safety-plan', mockAuth, async (req, res) => {
    try {
        const { warningSigns, copingStrategies, distractions, professionalSupport } = req.body;
        const plan = await SafetyPlan.findOneAndUpdate(
            { userId: req.userId },
            { warningSigns, copingStrategies, distractions, professionalSupport },
            { returnDocument: 'after', upsert: true }
        );
        res.json(plan);
    } catch (err) {
        console.error("Error updating safety plan:", err);
        res.status(500).json({ error: "Failed to update safety plan" });
    }
});

// ----------------------------------------------------
// NEW MICRO-WIN GENERATOR & DONE LIST ROUTES
// ----------------------------------------------------

// GET /api/wellness/random-task
router.get('/wellness/random-task', async (req, res) => {
    try {
        const count = await MicroTask.countDocuments();
        if (count === 0) {
            return res.status(404).json({ error: "No tasks available" });
        }
        const random = Math.floor(Math.random() * count);
        const task = await MicroTask.findOne().skip(random);
        res.json(task);
    } catch (err) {
        console.error("Error fetching random task:", err);
        res.status(500).json({ error: "Failed to fetch random task" });
    }
});

// POST /api/wellness/wins
router.post('/wellness/wins', mockAuth, async (req, res) => {
    try {
        const { taskText, category, masteryScore, pleasureScore } = req.body;
        if (!taskText) {
            return res.status(400).json({ error: "Task text required" });
        }
        const doneItem = new DoneItem({
            userId: req.userId,
            taskText,
            category: category || 'General',
            masteryScore,
            pleasureScore
        });
        await doneItem.save();
        res.status(201).json(doneItem);
    } catch (err) {
        console.error("Error saving win:", err);
        res.status(500).json({ error: "Failed to save win" });
    }
});

// GET /api/wellness/done-list
router.get('/wellness/done-list', mockAuth, async (req, res) => {
    try {
        // Only return today's items
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const items = await DoneItem.find({
            userId: req.userId,
            createdAt: { $gte: today }
        }).sort({ createdAt: -1 });

        res.json(items);
    } catch (err) {
        console.error("Error fetching done list:", err);
        res.status(500).json({ error: "Failed to fetch done list" });
    }
});

// POST /api/wellness/done-list (Manual entry)
router.post('/wellness/done-list', mockAuth, async (req, res) => {
    try {
        const { taskText } = req.body;
        if (!taskText) {
            return res.status(400).json({ error: "Task text required" });
        }
        const doneItem = new DoneItem({
            userId: req.userId,
            taskText,
            category: 'General'
        });
        await doneItem.save();
        res.status(201).json(doneItem);
    } catch (err) {
        console.error("Error saving manual done item:", err);
        res.status(500).json({ error: "Failed to save manual done item" });
    }
});

// GET /api/wellness/done-history (Returns all user's done items for stats)
router.get('/wellness/done-history', mockAuth, async (req, res) => {
    try {
        const items = await DoneItem.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        console.error("Error fetching done history:", err);
        res.status(500).json({ error: "Failed to fetch done history" });
    }
});

// ----------------------------------------------------
// NEW WELLNESS LOG ROUTES
// ----------------------------------------------------

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

// GET /api/wellness/today
router.get('/wellness/today', mockAuth, async (req, res) => {
    try {
        const today = new Date();
        const todayStr = formatDate(today);
        
        // Fetch today's log
        let vitals = await WellnessLog.findOne({ userId: req.userId, date: todayStr });
        if (!vitals) {
            vitals = { sleepMinutes: 0, steps: 0, date: todayStr };
        } else {
            vitals = vitals.toObject();
        }

        // Calculate 7-day average of prior 7 days
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        const priorStr = formatDate(sevenDaysAgo);

        const logs = await WellnessLog.find({
            userId: req.userId,
            date: { $gte: priorStr, $lt: todayStr }
        });

        if (logs.length >= 3) {
            const totalSleep = logs.reduce((sum, log) => sum + log.sleepMinutes, 0);
            const totalSteps = logs.reduce((sum, log) => sum + log.steps, 0);
            vitals.sleepAverage = totalSleep / logs.length;
            vitals.stepsAverage = totalSteps / logs.length;
        } else {
            vitals.sleepAverage = null;
            vitals.stepsAverage = null;
        }
        
        res.json(vitals);
    } catch (err) {
        console.error("Error fetching today's wellness:", err);
        res.status(500).json({ error: "Failed to fetch today's wellness" });
    }
});

// PATCH /api/wellness/today
router.patch('/wellness/today', mockAuth, async (req, res) => {
    try {
        const { field, delta } = req.body;
        if (!field || typeof delta !== 'number') {
            return res.status(400).json({ error: "Field and numeric delta are required" });
        }
        if (field !== 'sleepMinutes' && field !== 'steps') {
            return res.status(400).json({ error: "Invalid field. Must be sleepMinutes or steps" });
        }

        const todayStr = formatDate(new Date());
        let updated = await WellnessLog.findOneAndUpdate(
            { userId: req.userId, date: todayStr },
            { $inc: { [field]: delta } },
            { upsert: true, returnDocument: 'after' }
        );

        if (updated[field] < 0) {
            updated[field] = 0;
            await updated.save();
        }
        res.json(updated);
    } catch (err) {
        console.error("Error patching today's wellness:", err);
        res.status(500).json({ error: "Failed to patch today's wellness" });
    }
});

// GET /api/wellness/summary?period=week
router.get(['/wellness/summary', '/summary'], mockAuth, async (req, res) => {
    try {
        const period = req.query.period || 'week';
        const now = new Date();
        const days = period === 'month' ? 30 : 7;

        const startDate = new Date();
        startDate.setDate(now.getDate() - days);
        const startDateStr = formatDate(startDate);
        const todayStr = formatDate(now);

        // Fetch logs for user in date range
        const logs = await WellnessLog.find({
            userId: req.userId,
            date: { $gte: startDateStr, $lte: todayStr }
        }).sort({ date: -1 });

        const vitals = await DailyVitals.find({
            userId: req.userId,
            date: { $gte: startDateStr, $lte: todayStr }
        }).sort({ date: -1 });

        const moods = await MoodCheckIn.find({
            userId: req.userId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: -1 });

        const moodLogs = await MoodLog.find({
            userId: req.userId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: -1 });

        // Map entries by date
        const dayMap = {};
        logs.forEach(l => {
            if (!dayMap[l.date]) dayMap[l.date] = {};
            if (typeof l.sleepMinutes === 'number' && l.sleepMinutes > 0) {
                dayMap[l.date].sleep = Number((l.sleepMinutes / 60).toFixed(1));
            }
            if (typeof l.steps === 'number' && l.steps > 0) {
                dayMap[l.date].exercise = Math.round(l.steps / 100);
            }
        });

        vitals.forEach(v => {
            if (!dayMap[v.date]) dayMap[v.date] = {};
            if (typeof v.sleepMinutes === 'number' && v.sleepMinutes > 0 && !dayMap[v.date].sleep) {
                dayMap[v.date].sleep = Number((v.sleepMinutes / 60).toFixed(1));
            }
            if (typeof v.steps === 'number' && v.steps > 0 && !dayMap[v.date].exercise) {
                dayMap[v.date].exercise = Math.round(v.steps / 100);
            }
        });

        moods.forEach(m => {
            const dStr = formatDate(m.createdAt);
            if (!dayMap[dStr]) dayMap[dStr] = {};
            if (typeof m.score === 'number') {
                dayMap[dStr].mood = m.score;
            }
        });

        moodLogs.forEach(ml => {
            const dStr = formatDate(ml.createdAt);
            if (!dayMap[dStr]) dayMap[dStr] = {};
            if (typeof ml.intensity === 'number' && !dayMap[dStr].mood) {
                dayMap[dStr].mood = ml.intensity;
            }
        });

        const dailyBreakdown = Object.entries(dayMap).map(([date, data]) => ({
            date,
            mood: data.mood !== undefined ? data.mood : null,
            sleep: data.sleep !== undefined ? data.sleep : null,
            exercise: data.exercise !== undefined ? data.exercise : null
        })).sort((a, b) => b.date.localeCompare(a.date));

        let moodSum = 0, moodCount = 0;
        let sleepSum = 0, sleepCount = 0;
        let exerciseSum = 0, exerciseCount = 0;

        dailyBreakdown.forEach(d => {
            if (typeof d.mood === 'number') { moodSum += d.mood; moodCount++; }
            if (typeof d.sleep === 'number') { sleepSum += d.sleep; sleepCount++; }
            if (typeof d.exercise === 'number') { exerciseSum += d.exercise; exerciseCount++; }
        });

        const entriesCount = dailyBreakdown.length;
        const avgMood = moodCount > 0 ? Number((moodSum / moodCount).toFixed(1)) : null;
        const avgSleep = sleepCount > 0 ? Number((sleepSum / sleepCount).toFixed(1)) : null;
        const avgExercise = exerciseCount > 0 ? Math.round(exerciseSum / exerciseCount) : null;

        // Calculate streak
        let streakDays = 0;
        const checkDate = new Date();
        for (let i = 0; i < 30; i++) {
            const str = formatDate(checkDate);
            if (dayMap[str]) {
                streakDays++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        return res.json({
            user_id: req.userId,
            period,
            summary: {
                avg_mood: avgMood,
                avg_sleep: avgSleep,
                avg_exercise: avgExercise,
                entries_count: entriesCount,
                streak_days: streakDays
            },
            daily_breakdown: dailyBreakdown
        });
    } catch (err) {
        console.error("Error fetching wellness summary:", err);
        return res.status(500).json({ error: "Failed to fetch wellness summary" });
    }
});

module.exports = router;
