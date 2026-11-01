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
  console.log("=== Testing /api/home endpoints ===");
  await mongoose.connect(process.env.MONGO_URI);
  let user = await User.findOne();
  if (!user) {
    user = new User({ email: 'test@example.com', name: 'Test User' });
    await user.save();
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');
  
  // 1. Test Crisis Flagging
  console.log("\n1. Testing quick-thought with crisis language: 'I feel like giving up entirely'...");
  const crisisRes = await makeRequest('/api/home/quick-thought', 'POST', {
    thought: "I feel like giving up entirely"
  }, token);
  console.log("Status:", crisisRes.status);
  console.log("Response:", crisisRes.data);
  if (crisisRes.data.flagged === true && crisisRes.data.crisisResources) {
    console.log("✅ Crisis check passed! Flagged correctly without LLM call.");
  } else {
    console.error("❌ Crisis check failed:", crisisRes.data);
  }

  // 2. Test Benign Thought Reframe
  console.log("\n2. Testing quick-thought with benign thought: 'I have too much work and I will fail everything'...");
  const benignRes = await makeRequest('/api/home/quick-thought', 'POST', {
    thought: "I have too much work and I will fail everything"
  }, token);
  console.log("Status:", benignRes.status);
  console.log("Response:", benignRes.data);
  if (benignRes.data.flagged === false && benignRes.data.reframe) {
    console.log("✅ Reframe check passed! Received distortion & reframe.");
  } else {
    console.error("❌ Reframe check failed:", benignRes.data);
  }

  // 3. Test Micro-Tasks list
  console.log("\n3. Testing GET /api/home/micro-tasks...");
  const tasksRes = await makeRequest('/api/home/micro-tasks', 'GET');
  console.log("Status:", tasksRes.status);
  console.log("Tasks count:", Array.isArray(tasksRes.data) ? tasksRes.data.length : 'not array');
  if (Array.isArray(tasksRes.data) && tasksRes.data.length > 0) {
    console.log("✅ Micro tasks returned successfully! First task:", tasksRes.data[0].taskText);
  } else {
    console.log("⚠️ Micro tasks empty or error:", tasksRes.data);
  }

  await mongoose.disconnect();
}

runTests().catch(console.error);
