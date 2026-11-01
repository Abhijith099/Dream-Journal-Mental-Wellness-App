const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const MoodLog = require('../models/MoodLog');
const Dream = require('../models/Dream');

async function testPatternAlert() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');

  // Clean
  await MoodLog.deleteMany({ userId: user._id });
  await Dream.deleteMany({ userId: user._id });

  // 1. Check clean state -> expect 204
  const reqClean = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/insights/pattern-alert',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  }, resClean => {
    console.log('Clean state response code:', resClean.statusCode);

    // 2. Insert 3 consecutive low energy entries
    const d1 = new Date(); d1.setDate(d1.getDate() - 3);
    const d2 = new Date(); d2.setDate(d2.getDate() - 2);
    const d3 = new Date(); d3.setDate(d3.getDate() - 1);

    MoodLog.insertMany([
      { userId: user._id, energyLevel: 1, emotionTag: 'low', createdAt: d1 },
      { userId: user._id, energyLevel: 2, emotionTag: 'low', createdAt: d2 },
      { userId: user._id, energyLevel: 2, emotionTag: 'foggy', createdAt: d3 }
    ]).then(() => {
      const reqTrigger = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/insights/pattern-alert',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      }, resTrigger => {
        let data = '';
        resTrigger.on('data', c => data += c);
        resTrigger.on('end', async () => {
          console.log('Triggered alert response code:', resTrigger.statusCode);
          const json = JSON.parse(data);
          console.log('Triggered alert body:', json);

          // 3. Clean up and verify 204 again
          await MoodLog.deleteMany({ userId: user._id });

          const reqClean2 = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/insights/pattern-alert',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
          }, resClean2 => {
            console.log('Post-cleanup response code:', resClean2.statusCode);
            mongoose.disconnect();
          });
          reqClean2.end();
        });
      });
      reqTrigger.end();
    });
  });
  reqClean.end();
}

testPatternAlert().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
