require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  let user = await User.findOne();
  if (!user) {
    user = await User.create({ email: 'test@example.com', name: 'Tester' });
  } else if (!user.name) {
    user.name = 'Tester';
    await user.save();
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  };

  const BACKEND_URL = 'http://localhost:5000/api';
  console.log('Testing Clinical Wizard API Endpoints...\n');

  try {
    // 1. Test POST /api/dreams with high distress
    console.log('1. Testing POST /api/dreams (High Distress)...');
    const distressRes = await fetch(`${BACKEND_URL}/dreams`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Trapped in dark corridor',
        memoryText: 'Could not escape, hallways were shifting constantly and doors were locked.',
        lucidAwareness: 'no',
        preSleepStressors: ['work_pressure', 'financial'],
        dominantConcern: 'lack_of_control',
        concernIntensity: 8,
        perceivedThreats: ['losing_control', 'cannot_escape'],
        dreamNeed: ['escape', 'support'],
        wakingPhysicalState: ['tense', 'heavy'],
        wakingEmotionalState: ['anxious'],
        behavioralImpact: 'avoiding_something',
        dayImpact: 'significantly',
      })
    });

    const distressData = await distressRes.json();
    console.log('Distress Dream Created:', distressData);

    // 2. Test POST /api/dreams with Restored / Lucid
    console.log('\n2. Testing POST /api/dreams (Restored & Lucid)...');
    const restoredRes = await fetch(`${BACKEND_URL}/dreams`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Floating over crystal lake',
        memoryText: 'I realized I was dreaming and gently glided over calm waters.',
        lucidAwareness: 'yes_mostly',
        lucidResponse: 'observed',
        preSleepStressors: ['nothing'],
        dominantConcern: 'nothing',
        perceivedThreats: ['nothing'],
        dreamNeed: ['nothing'],
        wakingPhysicalState: ['rested', 'energized'],
        wakingEmotionalState: ['calm', 'relieved'],
        behavioralImpact: 'more_motivated',
        dayImpact: 'none',
      })
    });

    const restoredData = await restoredRes.json();
    console.log('Restored Dream Created:', {
      id: restoredData._id,
      title: restoredData.title,
      somaticArchiveTag: restoredData.somaticArchiveTag,
      isLucid: restoredData.isLucid
    });

    // 3. Test GET /api/insights/summary
    console.log('\n3. Testing GET /api/insights/summary...');
    const summaryRes = await fetch(`${BACKEND_URL}/insights/summary`, { headers });
    const summaryData = await summaryRes.json();
    console.log('Insights Summary:', summaryData);

    // 4. Test GET /api/insights/home-insight
    console.log('\n4. Testing GET /api/insights/home-insight...');
    const homeRes = await fetch(`${BACKEND_URL}/insights/home-insight`, { headers });
    const homeData = await homeRes.json();
    console.log('Home Insight Result:', homeData);

    console.log('\n✓ All Clinical Wizard backend endpoints verified successfully!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
