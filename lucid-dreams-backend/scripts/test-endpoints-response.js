require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('../models/User');
  const Dream = require('../models/Dream');
  const MoodLog = require('../models/MoodLog');
  const WellnessLog = require('../models/WellnessLog');
  const EMAEntry = require('../models/EMAEntry');

  let user = await User.findOne();
  if (!user) {
    user = await User.create({ name: 'Test User', email: 'test@example.com' });
  }

  // Ensure test data for dreams
  const dreamCount = await Dream.countDocuments({ userId: user._id });
  if (dreamCount < 3) {
    await Dream.create([
      {
        userId: user._id,
        title: "The Empty Classroom",
        description: "I was running down hallways trying to find the lecture room. Everyone in the room knew the answer except me, and the door locked from the outside.",
        memoryText: "I was running down hallways trying to find the lecture room. Everyone in the room knew the answer except me, and the door locked from the outside.",
        tags: ["nightmare", "anxiety", "school"],
        sentimentLabel: "Distressing",
        themes: { anxiety: 8, confusion: 7 }
      },
      {
        userId: user._id,
        title: "The Shimmering Lake",
        description: "After a stormy flight through dark clouds, I touched down near quiet still water reflecting moonlight like a silver mirror.",
        memoryText: "After a stormy flight through dark clouds, I touched down near quiet still water reflecting moonlight like a silver mirror.",
        tags: ["lucid", "peaceful"],
        sentimentLabel: "Positive",
        themes: { peace: 9, joy: 6 }
      },
      {
        userId: user._id,
        title: "Walking Through Fog",
        description: "I was walking through dense fog in an old library, seeing duplicate versions of myself reading old leather books.",
        memoryText: "I was walking through dense fog in an old library, seeing duplicate versions of myself reading old leather books.",
        tags: ["surreal", "duplicate"],
        sentimentLabel: "Neutral",
        themes: { confusion: 6, peace: 4 }
      }
    ]);
    console.log('Created rich test dream set.');
  }

  // Ensure wellness and mood logs
  const todayStr = new Date().toISOString().split('T')[0];
  await WellnessLog.findOneAndUpdate(
    { userId: user._id, date: todayStr },
    { sleepMinutes: 440, steps: 8200 },
    { upsert: true }
  );

  await MoodLog.create({
    userId: user._id,
    energyLevel: 4,
    emotionTag: "Peaceful"
  });

  await EMAEntry.create({
    userId: user._id,
    mood: "calm",
    energyLevel: 4,
    question: "How do you feel right now?",
    triggeredBy: "manual"
  });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');
  await mongoose.disconnect();

  function testGet(path) {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:5000${path}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data });
        });
      });
      req.on('error', reject);
    });
  }

  console.log('\n--- 1. Testing GET /api/insights/snapshot ---');
  const snap = await testGet('/api/insights/snapshot');
  console.log('Status:', snap.status);
  console.log('Response:', snap.body);

  console.log('\n--- 2. Testing GET /api/insights/rescript-candidate ---');
  const rescript = await testGet('/api/insights/rescript-candidate');
  console.log('Status:', rescript.status);
  console.log('Response:', rescript.body);

  console.log('\n--- 3. Testing GET /api/insights/dream-reflection ---');
  const reflection = await testGet('/api/insights/dream-reflection');
  console.log('Status:', reflection.status);
  console.log('Response:', reflection.body);

  console.log('\n--- 4. Testing GET /api/insights/safe-anchor ---');
  const anchor = await testGet('/api/insights/safe-anchor');
  console.log('Status:', anchor.status);
  console.log('Response:', anchor.body);

  console.log('\n--- 5. Testing GET /api/insights/observations ---');
  const obs = await testGet('/api/insights/observations');
  console.log('Status:', obs.status);
  console.log('Response:', obs.body);

  console.log('\n--- 6. Testing GET /api/insights/digital-rhythm ---');
  const rhythm = await testGet('/api/insights/digital-rhythm');
  console.log('Status:', rhythm.status);
  console.log('Response:', rhythm.body);
}

run().catch(console.error);
