const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const MoodLog = require('../models/MoodLog');
const Dream = require('../models/Dream');

async function testMoodTrend() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');

  // Clear existing
  await MoodLog.deleteMany({ userId: user._id });
  await Dream.deleteMany({ userId: user._id });

  // Test with 0 data points
  const req0 = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/insights/mood-trend?period=weekly',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  }, res0 => {
    let d0 = '';
    res0.on('data', c => d0 += c);
    res0.on('end', async () => {
      console.log('0 entries response length:', JSON.parse(d0).length);

      // Add 4 entries across 4 days
      const d1 = new Date(); d1.setDate(d1.getDate() - 3);
      const d2 = new Date(); d2.setDate(d2.getDate() - 2);
      const d3 = new Date(); d3.setDate(d3.getDate() - 1);
      const d4 = new Date();

      await MoodLog.create([
        { userId: user._id, energyLevel: 2, emotionTag: 'low', createdAt: d1 },
        { userId: user._id, energyLevel: 3, emotionTag: 'calm', createdAt: d2 },
        { userId: user._id, energyLevel: 4, emotionTag: 'good', createdAt: d3 },
        { userId: user._id, energyLevel: 5, emotionTag: 'great', createdAt: d4 }
      ]);
      await Dream.create([
        { userId: user._id, title: 'Dream 1', description: 'Surreal wandering', tags: ['surreal'], createdAt: d1 },
        { userId: user._id, title: 'Dream 2', description: 'Peaceful garden', tags: ['peaceful'], sentimentLabel: 'Positive', createdAt: d4 }
      ]);

      const req1 = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/insights/mood-trend?period=weekly',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      }, res1 => {
        let d1 = '';
        res1.on('data', c => d1 += c);
        res1.on('end', async () => {
          const json1 = JSON.parse(d1);
          console.log('4 entries response:', json1);
          await MoodLog.deleteMany({ userId: user._id });
          await Dream.deleteMany({ userId: user._id });
          await mongoose.disconnect();
        });
      });
      req1.end();
    });
  });
  req0.end();
}

testMoodTrend().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
