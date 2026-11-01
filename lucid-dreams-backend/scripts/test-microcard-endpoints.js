require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('../models/User');
  let user = await User.findOne();
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

  console.log('1. Sentiment Sparkline:');
  const res1 = await testGet('/api/insights/sentiment-sparkline');
  console.log('Status:', res1.status, res1.body);

  console.log('\n2. Sleep Intensity:');
  const res2 = await testGet('/api/insights/sleep-intensity');
  console.log('Status:', res2.status, res2.body);

  console.log('\n3. Symbols:');
  const res3 = await testGet('/api/insights/symbols');
  console.log('Status:', res3.status, res3.body);

  console.log('\n4. Lucid Rate:');
  const res4 = await testGet('/api/insights/lucid-rate');
  console.log('Status:', res4.status, res4.body);

  console.log('\n5. AI Synthesis:');
  const res5 = await testGet('/api/insights/ai-synthesis');
  console.log('Status:', res5.status, res5.body);
}

run().catch(console.error);
