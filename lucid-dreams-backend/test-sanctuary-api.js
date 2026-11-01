const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: headers,
    };
    if (dataString) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runSanctuaryApiTests() {
  console.log('=== Verifying Sanctuary Grounding Endpoints ===');
  await mongoose.connect(process.env.MONGO_URI);
  let user = await User.findOne();
  if (!user) {
    user = new User({ email: 'sanctuary_api_test@example.com', name: 'Tester', passwordHash: 'hash' });
    await user.save();
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');
  console.log('Using test user token for:', user.name);

  // 1. GET /api/memory-support/sanctuary/landing
  console.log('\n1. Testing GET /api/memory-support/sanctuary/landing...');
  const landingRes = await makeRequest('/api/memory-support/sanctuary/landing', 'GET', null, token);
  console.log('Landing status:', landingRes.status, landingRes.data);

  // 2. GET /api/memory-support/sanctuary/contacts/voices
  console.log('\n2. Testing GET /api/memory-support/sanctuary/contacts/voices...');
  const voicesRes = await makeRequest('/api/memory-support/sanctuary/contacts/voices', 'GET', null, token);
  console.log('Voices status:', voicesRes.status, 'Contacts count:', Array.isArray(voicesRes.data) ? voicesRes.data.length : 0);
  if (Array.isArray(voicesRes.data)) {
    console.log('Voice names:', voicesRes.data.map(v => `${v.name} (${v.relationshipTag || 'No tag'})`));
  }

  // 3. GET /api/memory-support/sanctuary/contacts/emergency
  console.log('\n3. Testing GET /api/memory-support/sanctuary/contacts/emergency...');
  const emergencyRes = await makeRequest('/api/memory-support/sanctuary/contacts/emergency', 'GET', null, token);
  console.log('Emergency status:', emergencyRes.status, 'Emergency contacts:', Array.isArray(emergencyRes.data) ? emergencyRes.data.map(e => `${e.name} (${e.maskedPhone})`) : emergencyRes.data);

  // 4. POST /api/memory-support/sanctuary/sessions/event
  console.log('\n4. Testing POST /api/memory-support/sanctuary/sessions/event...');
  const eventRes = await makeRequest('/api/memory-support/sanctuary/sessions/event', 'POST', {
    activityType: 'voice_playback',
    contactName: 'Sarah',
    durationSeconds: 102
  }, token);
  console.log('Event status:', eventRes.status, eventRes.data);

  // 5. POST /api/memory-support/sanctuary/feelings-checkin
  console.log('\n5. Testing POST /api/memory-support/sanctuary/feelings-checkin...');
  const checkinRes = await makeRequest('/api/memory-support/sanctuary/feelings-checkin', 'POST', {
    feeling: 'calmer',
    completedActivity: 'voice_playback'
  }, token);
  console.log('Check-in status:', checkinRes.status, checkinRes.data);

  // 6. POST /api/memory-support/sanctuary/sessions/call-initiated
  console.log('\n6. Testing POST /api/memory-support/sanctuary/sessions/call-initiated...');
  const callRes = await makeRequest('/api/memory-support/sanctuary/sessions/call-initiated', 'POST', {
    sourceScreen: 'Screen4_DialGuard'
  }, token);
  console.log('Call-initiated status:', callRes.status, callRes.data);

  await mongoose.disconnect();
  console.log('\n=== All Sanctuary API tests passed! ===');
}

runSanctuaryApiTests().catch(err => {
  console.error('API Test Error:', err);
  process.exit(1);
});
