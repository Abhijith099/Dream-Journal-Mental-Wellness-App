const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Dream = require('../models/Dream');

async function testSentiment() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');

  await Dream.deleteMany({ userId: user._id });

  // Create 2 positive, 1 neutral, 1 distressing
  await Dream.create([
    { userId: user._id, title: 'Peaceful garden', sentimentLabel: 'Positive', tags: ['peaceful'], description: 'Sunny' },
    { userId: user._id, title: 'Flying high', sentimentLabel: 'Positive', isLucid: true, description: 'Clear skies' },
    { userId: user._id, title: 'Strange library', sentimentLabel: 'Neutral', tags: ['surreal'], description: 'Infinite books' },
    { userId: user._id, title: 'Trapped in dark', sentimentLabel: 'Distressing', tags: ['nightmare'], description: 'Shadows closing in' }
  ]);

  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/insights/sentiment?period=monthly',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', async () => {
      const json = JSON.parse(d);
      console.log('Sentiment result:', json);
      await Dream.deleteMany({ userId: user._id });
      await mongoose.disconnect();
    });
  });
  req.end();
}

testSentiment().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
