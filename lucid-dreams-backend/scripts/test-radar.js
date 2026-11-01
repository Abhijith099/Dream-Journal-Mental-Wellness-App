const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Dream = require('../models/Dream');

async function testThemes() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');
  
  // Clean user's test dreams
  await Dream.deleteMany({ userId: user._id });

  // 1. Add 5 peaceful/calm dreams
  const calmDreams = [
    { userId: user._id, title: 'Gentle lake', description: 'Still calm quiet water, safe and warm.', tags: ['peaceful'] },
    { userId: user._id, title: 'Sunny meadow', description: 'Resting in gentle warm breeze, quiet and calm.', tags: ['peaceful'] },
    { userId: user._id, title: 'Quiet forest', description: 'Still trees, safe haven and serene paths.', tags: ['peaceful'] },
    { userId: user._id, title: 'Beach sunset', description: 'Relaxing ocean sound, soft warm sand.', tags: ['peaceful'] },
    { userId: user._id, title: 'Safe sanctuary', description: 'Calm breathing, resting with a friend.', tags: ['peaceful'] },
  ];
  await Dream.insertMany(calmDreams);

  const req1 = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/insights/themes',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  }, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const json1 = JSON.parse(data);
      console.log('Calm themes result:', json1.scores, 'Top Axis:', json1.topAxis);

      // Now add 5 anxious/nightmare dreams
      await Dream.deleteMany({ userId: user._id });
      const anxiousDreams = [
        { userId: user._id, title: 'Dark chase', description: 'Running away in panic, scared and trapped.', tags: ['nightmare'] },
        { userId: user._id, title: 'Falling off cliff', description: 'Alarm, fear and deadline failing.', tags: ['nightmare'] },
        { userId: user._id, title: 'Exam panic', description: 'Late for exam, running out of time, anxiety.', tags: ['nightmare'] },
        { userId: user._id, title: 'Monster chase', description: 'Chased through dark maze, fear and terror.', tags: ['nightmare'] },
        { userId: user._id, title: 'Danger in dark', description: 'Trapped in danger, fear and worry.', tags: ['nightmare'] },
      ];
      await Dream.insertMany(anxiousDreams);

      const req2 = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/insights/themes',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      }, res2 => {
        let data2 = '';
        res2.on('data', c => data2 += c);
        res2.on('end', async () => {
          const json2 = JSON.parse(data2);
          console.log('Anxious themes result:', json2.scores, 'Top Axis:', json2.topAxis);
          
          await Dream.deleteMany({ userId: user._id });
          await mongoose.disconnect();
        });
      });
      req2.end();
    });
  });
  req1.end();
}

testThemes().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
