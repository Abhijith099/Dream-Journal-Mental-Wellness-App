require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Dream = require('./models/Dream');
const EMAEntry = require('./models/EMAEntry');
const jwt = require('jsonwebtoken');

async function testGoldenTrio() {
    console.log('--- Starting Golden Trio Backend Verification ---');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');

        // 1. Create or find test user
        const testEmail = 'golden_trio_test@luciddreams.app';
        let user = await User.findOne({ email: testEmail });
        if (!user) {
            user = new User({
                name: 'Golden Trio Tester',
                email: testEmail,
                passwordHash: 'dummy_hash',
                designation: 'NEURAL RESEARCHER',
                typingDynamicsEnabled: true
            });
            await user.save();
        } else {
            user.typingDynamicsEnabled = true;
            await user.save();
        }

        console.log(`Test user initialized: ${user.name} (${user._id}), typingDynamicsEnabled: ${user.typingDynamicsEnabled}`);

        // 2. Test Dream Creation with Golden Trio Fields
        const testDream = new Dream({
            userId: user._id,
            title: 'Multimodal Flight over Foggy Valleys',
            description: 'I was floating weightlessly over rolling amber hills. The wind felt warm and steady.',
            memoryText: 'I was floating weightlessly over rolling amber hills. The wind felt warm and steady.',
            wordCount: 16,
            isLucid: true,
            energyLevel: 8,
            tags: ['surreal', 'peaceful'],
            inputMethod: 'voice',
            vocalCharacterization: 'Fluent, calm, and measured cadence with steady pacing.',
            typingDynamics: {
                wordsPerMinute: 42,
                timeToFirstKeystrokeMs: 1450,
                longPauseCount: 2,
                sessionDurationMs: 45000,
                completed: true
            }
        });

        const savedDream = await testDream.save();
        console.log(`Dream persisted with inputMethod="${savedDream.inputMethod}", vocalCharacterization="${savedDream.vocalCharacterization?.slice(0, 30)}...", WPM=${savedDream.typingDynamics?.wordsPerMinute}`);

        // 3. Test EMA Check-in Persistence
        const testEMA = new EMAEntry({
            userId: user._id,
            mood: 'calm',
            energyLevel: 4,
            question: 'How are you right now?',
            triggeredBy: 'app_open'
        });

        const savedEMA = await testEMA.save();
        console.log(`EMAEntry created: mood="${savedEMA.mood}", energy=${savedEMA.energyLevel}, question="${savedEMA.question}"`);

        // 4. Test Typing Dynamics Aggregation logic
        const dreamsWithTyping = await Dream.find({
            userId: user._id,
            'typingDynamics.wordsPerMinute': { $exists: true }
        });
        const totalWPM = dreamsWithTyping.reduce((sum, d) => sum + d.typingDynamics.wordsPerMinute, 0);
        const baseline = Math.round(totalWPM / dreamsWithTyping.length);
        console.log(`Typing dynamics aggregation: ${dreamsWithTyping.length} dream(s) found, baseline=${baseline} WPM`);

        // 5. Test Input Signals Ratio logic
        const totalDreams = await Dream.countDocuments({ userId: user._id });
        const voiceDreams = await Dream.countDocuments({ userId: user._id, inputMethod: 'voice' });
        console.log(`Input signals breakdown: total=${totalDreams}, voice=${voiceDreams}, ratio=${Math.round((voiceDreams/totalDreams)*100)}%`);

        // 6. Test EMA Recent query
        const recentEMAs = await EMAEntry.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5);
        console.log(`Recent EMA entries query returned ${recentEMAs.length} records`);

        console.log('--- Golden Trio Backend Verification Completed Successfully! ---');
    } catch (err) {
        console.error('Golden Trio Verification Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testGoldenTrio();
