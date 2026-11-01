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
      headers: headers
    };
    if (dataString) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
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

async function testBreathingAndGrounding() {
  console.log("=== Testing Breathing & Grounding Endpoints ===");
  await mongoose.connect(process.env.MONGO_URI);
  let user = await User.findOne();
  if (!user) {
    user = new User({ email: 'test@example.com', name: 'Test User' });
    await user.save();
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');
  const userId = user._id.toString();
  const breathingSessionId = `breath_test_${Date.now()}`;
  const groundingSessionId = `ground_test_${Date.now()}`;

  // 1. Test POST /api/users/{userId}/breathingSessions/{sessionId}
  console.log(`\n1. Testing POST /api/users/${userId}/breathingSessions/${breathingSessionId}...`);
  const breathRes = await makeRequest(`/api/users/${userId}/breathingSessions/${breathingSessionId}`, 'POST', {
    completedAt: new Date().toISOString(),
    cycles: 4,
    followedByGrounding: true
  }, token);

  console.log("Status:", breathRes.status);
  console.log("Response:", breathRes.data);
  if (breathRes.status === 201 && breathRes.data.success) {
    console.log("✅ Breathing session successfully logged!");
  } else {
    console.error("❌ Breathing session failed:", breathRes.data);
  }

  // 2. Test POST /api/users/{userId}/groundingSessions/{sessionId}
  console.log(`\n2. Testing POST /api/users/${userId}/groundingSessions/${groundingSessionId}...`);
  const groundRes = await makeRequest(`/api/users/${userId}/groundingSessions/${groundingSessionId}`, 'POST', {
    completedAt: new Date().toISOString(),
    technique: "5-4-3-2-1"
  }, token);

  console.log("Status:", groundRes.status);
  console.log("Response:", groundRes.data);
  if (groundRes.status === 201 && groundRes.data.success) {
    console.log("✅ Grounding session successfully logged!");
  } else {
    console.error("❌ Grounding session failed:", groundRes.data);
  }

  await mongoose.disconnect();
}

testBreathingAndGrounding().catch(console.error);
