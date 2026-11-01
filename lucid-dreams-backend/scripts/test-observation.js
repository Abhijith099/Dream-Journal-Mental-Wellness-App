const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Dream = require('../models/Dream');
const ObservationCache = require('../models/ObservationCache');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');
  
  // Clear any existing cache to force AI generation
  await ObservationCache.deleteMany({ userId: user._id });

  // Add 2 dreams
  const d1 = await Dream.create({
    userId: user._id,
    title: 'Walking in a peaceful garden',
    description: 'The morning sun was gentle and flowers were blooming everywhere.',
    memoryText: 'The morning sun was gentle and flowers were blooming everywhere.',
    energyLevel: 4,
    tags: ['peaceful', 'surreal']
  });
  const d2 = await Dream.create({
    userId: user._id,
    title: 'Flying over calm blue ocean',
    description: 'Gliding smoothly above the calm waves feeling free and relaxed.',
    memoryText: 'Gliding smoothly above the calm waves feeling free and relaxed.',
    energyLevel: 5,
    tags: ['lucid', 'peaceful']
  });

  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/insights/observations',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  }, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      console.log('Observation status:', res.statusCode);
      try {
        const json = JSON.parse(data);
        console.log('Observation payload:', json);
      } catch(e) {
        console.log('Raw data:', data);
      }
      
      await Dream.deleteMany({ _id: { $in: [d1._id, d2._id] } });
      await ObservationCache.deleteMany({ userId: user._id });
      await mongoose.disconnect();
    });
  });
  req.end();
}

test().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
