const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const WellnessLog = require('../models/WellnessLog');
const Dream = require('../models/Dream');

async function testSleepCorrelation() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');

  await WellnessLog.deleteMany({ userId: user._id });
  await Dream.deleteMany({ userId: user._id });

  // 1. Initial empty -> expect 204
  const req0 = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/insights/sleep-correlation',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  }, res0 => {
    console.log('Empty state response code:', res0.statusCode);

    // 2. Create 4 nights
    const dates = ['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23'];
    
    Promise.all([
      WellnessLog.create([
        { userId: user._id, date: dates[0], sleepMinutes: 480 }, // 8h
        { userId: user._id, date: dates[1], sleepMinutes: 480 }, // 8h
        { userId: user._id, date: dates[2], sleepMinutes: 300 }, // 5h
        { userId: user._id, date: dates[3], sleepMinutes: 300 }  // 5h
      ]),
      Dream.create([
        { userId: user._id, title: 'Peaceful 1', description: 'Peaceful garden', sentimentLabel: 'Positive', tags: ['peaceful'], date: new Date(dates[0]) },
        { userId: user._id, title: 'Peaceful 2', description: 'Peaceful lake', sentimentLabel: 'Positive', tags: ['peaceful'], date: new Date(dates[1]) },
        { userId: user._id, title: 'Nightmare 1', description: 'Dark chase', sentimentLabel: 'Distressing', tags: ['nightmare'], date: new Date(dates[2]) },
        { userId: user._id, title: 'Nightmare 2', description: 'Falling off cliff', sentimentLabel: 'Distressing', tags: ['nightmare'], date: new Date(dates[3]) }
      ])
    ]).then(() => {
      const req1 = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/insights/sleep-correlation',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      }, res1 => {
        let d = '';
        res1.on('data', c => d += c);
        res1.on('end', async () => {
          console.log('4 matched nights response code:', res1.statusCode);
          console.log('Response body:', JSON.parse(d));

          await WellnessLog.deleteMany({ userId: user._id });
          await Dream.deleteMany({ userId: user._id });
          await mongoose.disconnect();
        });
      });
      req1.end();
    });
  });
  req0.end();
}

testSleepCorrelation().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
