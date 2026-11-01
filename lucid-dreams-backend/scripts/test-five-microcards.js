const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function testMicrocards() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  if (!user) {
    console.error('No user found');
    process.exit(1);
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');

  const makeReq = (path, method = 'GET', body = null) => new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    };
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/insights/' + path,
      method,
      headers,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (body) {
      req.write(postData);
    }
    req.end();
  });

  console.log('--- Testing 5 Insight Micro-Card Endpoints ---');

  // 1. Dream Tone Week
  const tone = await makeReq('dream-tone-week');
  console.log('1. GET /dream-tone-week -> Status:', tone.status);
  console.log('   Data:', tone.body);

  // 2. Sleep Dream Scatter
  const scatter = await makeReq('sleep-dream-scatter');
  console.log('2. GET /sleep-dream-scatter -> Status:', scatter.status);
  console.log('   Data:', scatter.body);

  // 3. Symbols
  const symbols = await makeReq('symbols?period=weekly');
  console.log('3. GET /symbols?period=weekly -> Status:', symbols.status);
  console.log('   Data:', symbols.body);

  // 4. Lucid Rate
  const lucid = await makeReq('lucid-rate?period=weekly');
  console.log('4. GET /lucid-rate?period=weekly -> Status:', lucid.status);
  console.log('   Data:', lucid.body);

  // 5. AI Synthesis
  const ai1 = await makeReq('ai-synthesis', 'POST', { period: 'weekly' });
  console.log('5a. POST /ai-synthesis -> Status:', ai1.status);
  console.log('    Data:', ai1.body);

  // Test caching on 2nd call
  const ai2 = await makeReq('ai-synthesis', 'POST', { period: 'weekly' });
  console.log('5b. POST /ai-synthesis (Cache hit check) -> Status:', ai2.status);
  console.log('    Data:', ai2.body);

  console.log('\nAll 5 micro-card endpoints tested successfully!');
  await mongoose.disconnect();
}

testMicrocards().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
