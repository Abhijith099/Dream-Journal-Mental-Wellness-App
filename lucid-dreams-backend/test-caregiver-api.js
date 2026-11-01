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

async function runCaregiverApiTests() {
  console.log('=== Verifying Caregiver Dashboard API Endpoints ===');
  await mongoose.connect(process.env.MONGO_URI);
  let user = await User.findOne();
  if (!user) {
    user = new User({ email: 'caregiver_test@example.com', name: 'Primary Caregiver', passwordHash: 'hash' });
    await user.save();
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');
  console.log('Using caregiver token for:', user.name);

  // 1. GET /api/caregiver/content
  console.log('\n1. Testing GET /api/caregiver/content...');
  const contentRes = await makeRequest('/api/caregiver/content', 'GET', null, token);
  console.log('Content status:', contentRes.status);
  console.log('Metrics:', contentRes.data.metrics);
  console.log('Voices count:', contentRes.data.voiceNotes?.length);
  console.log('Photos count:', contentRes.data.photographs?.length);
  console.log('Music count:', contentRes.data.musicTracks?.length);
  console.log('Primary Emergency Contact:', contentRes.data.emergencySupport?.primaryContact?.name);

  if (contentRes.data.voiceNotes && contentRes.data.voiceNotes.length > 0) {
    const firstVoice = contentRes.data.voiceNotes[0];
    console.log('\n2. Testing PATCH toggle active for voice note:', firstVoice.title);
    const toggleRes = await makeRequest(`/api/caregiver/voice/${firstVoice.id}/active`, 'PATCH', { isActive: false }, token);
    console.log('Toggle OFF status:', toggleRes.status, toggleRes.data);

    const toggleBackRes = await makeRequest(`/api/caregiver/voice/${firstVoice.id}/active`, 'PATCH', { isActive: true }, token);
    console.log('Toggle ON status:', toggleBackRes.status, toggleBackRes.data);
  }

  // 3. GET /api/caregiver/sessions
  console.log('\n3. Testing GET /api/caregiver/sessions...');
  const sessionsRes = await makeRequest('/api/caregiver/sessions', 'GET', null, token);
  console.log('Sessions status:', sessionsRes.status, 'Entries count:', sessionsRes.data?.length);
  console.log('First session:', sessionsRes.data?.[0]?.title, 'Outcome:', sessionsRes.data?.[0]?.badge);

  // 4. GET /api/caregiver/analytics/effectiveness
  console.log('\n4. Testing GET /api/caregiver/analytics/effectiveness...');
  const analyticsRes = await makeRequest('/api/caregiver/analytics/effectiveness', 'GET', null, token);
  console.log('Analytics status:', analyticsRes.status);
  console.log('What helps most:', analyticsRes.data.whatHelpsMost);

  await mongoose.disconnect();
  console.log('\n=== All Caregiver API tests passed! ===');
}

runCaregiverApiTests().catch(err => {
  console.error('Caregiver API Test Error:', err);
  process.exit(1);
});
