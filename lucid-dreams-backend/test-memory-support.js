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

async function runTests() {
  console.log("=== Testing /api/memory-support Endpoints ===");
  await mongoose.connect(process.env.MONGO_URI);
  let user = await User.findOne();
  if (!user) {
    user = new User({ email: 'memory_test@example.com', name: 'Memory Test User', passwordHash: 'hash' });
    await user.save();
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');

  // 1. Test GET & PATCH /anchor-settings
  console.log("\n1. Testing GET /api/memory-support/anchor-settings...");
  const getSettingsRes = await makeRequest('/api/memory-support/anchor-settings', 'GET', null, token);
  console.log("Status:", getSettingsRes.status, "Data:", getSettingsRes.data);

  console.log("\n2. Testing PATCH /api/memory-support/anchor-settings...");
  const patchSettingsRes = await makeRequest('/api/memory-support/anchor-settings', 'PATCH', {
    locationPhrase: 'at home in Bengaluru',
    reassuranceNote: 'Everything is peaceful, safe, and taken care of.'
  }, token);
  console.log("Status:", patchSettingsRes.status, "Data:", patchSettingsRes.data);

  // 3. Test GET & POST /familiar-faces
  console.log("\n3. Testing GET /api/memory-support/familiar-faces...");
  const getFacesRes = await makeRequest('/api/memory-support/familiar-faces', 'GET', null, token);
  console.log("Status:", getFacesRes.status, "Count:", Array.isArray(getFacesRes.data) ? getFacesRes.data.length : getFacesRes.data);

  console.log("\n4. Testing POST /api/memory-support/familiar-faces...");
  const postFaceRes = await makeRequest('/api/memory-support/familiar-faces', 'POST', {
    name: 'Rahul',
    relationship: 'son',
    description: 'A cherished memory of your son, captured in a moment of peace.',
    pronoun: 'He',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
  }, token);
  console.log("Status:", postFaceRes.status, "Created:", postFaceRes.data);

  // 5. Test GET & POST /vault
  console.log("\n5. Testing GET /api/memory-support/vault...");
  const getVaultRes = await makeRequest('/api/memory-support/vault', 'GET', null, token);
  console.log("Status:", getVaultRes.status, "Count:", Array.isArray(getVaultRes.data) ? getVaultRes.data.length : getVaultRes.data);

  console.log("\n6. Testing POST /api/memory-support/vault...");
  const postVaultRes = await makeRequest('/api/memory-support/vault', 'POST', {
    title: 'Trip to Ooty hills',
    description: 'Fresh crisp mountain air with family',
    photoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  }, token);
  console.log("Status:", postVaultRes.status, "Created:", postVaultRes.data);

  // 7. Cleanup created test entries
  if (postFaceRes.data?._id) {
    await makeRequest(`/api/memory-support/familiar-faces/${postFaceRes.data._id}`, 'DELETE', null, token);
  }
  if (postVaultRes.data?._id) {
    await makeRequest(`/api/memory-support/vault/${postVaultRes.data._id}`, 'DELETE', null, token);
  }

  console.log("\n=== All Memory Support API tests completed successfully! ===");
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
