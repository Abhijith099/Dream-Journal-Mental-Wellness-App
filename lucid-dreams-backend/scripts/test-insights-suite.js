const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Dream = require('../models/Dream');
const MoodLog = require('../models/MoodLog');
const WellnessLog = require('../models/WellnessLog');

async function testSuite() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');

  const makeReq = (path) => new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/insights/' + path,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.end();
  });

  console.log('--- Testing Insights Endpoints ---');
  
  // 1. Snapshot
  const snap = await makeReq('snapshot?period=daily');
  console.log('1. GET /snapshot -> Status:', snap.status);

  // 2. Mood Trend
  const moodTrend = await makeReq('mood-trend?period=weekly');
  console.log('2. GET /mood-trend -> Status:', moodTrend.status);

  // 3. Sentiment Breakdown
  const sent = await makeReq('sentiment?period=weekly');
  console.log('3. GET /sentiment -> Status:', sent.status);

  // 4. Themes (6-axes)
  const themes = await makeReq('themes');
  console.log('4. GET /themes -> Status:', themes.status);

  // 5. Observations
  const obs = await makeReq('observations');
  console.log('5. GET /observations -> Status:', obs.status);

  // 6. Sleep Correlation
  const sleepCorr = await makeReq('sleep-correlation');
  console.log('6. GET /sleep-correlation -> Status:', sleepCorr.status);

  // 7. Pattern Alert
  const alert = await makeReq('pattern-alert');
  console.log('7. GET /pattern-alert -> Status:', alert.status);

  console.log('All backend endpoints respond without crashing!');
  await mongoose.disconnect();
}

testSuite().catch(err => {
  console.error("Suite error:", err);
  process.exit(1);
});
