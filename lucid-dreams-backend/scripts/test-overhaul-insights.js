require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');

async function runTests() {
  const dbURI = process.env.MONGO_URI;
  if (dbURI) {
    await mongoose.connect(dbURI);
    console.log('MongoDB connected for testing.');
  }

  const Dream = require('../models/Dream');
  const User = require('../models/User');

  // Find or create test user
  let user = await User.findOne();
  if (!user) {
    user = await User.create({ name: 'Test User', email: 'test@example.com' });
  }

  console.log('Testing with User:', user._id);

  // Check if a dream with typing dynamics exists
  let dream = await Dream.findOne({ userId: user._id });
  if (!dream) {
    dream = await Dream.create({
      userId: user._id,
      title: 'Floating over crystal lakes',
      description: 'I was gliding smoothly through iridescent fog above shimmering waters.',
      memoryText: 'I was gliding smoothly through iridescent fog above shimmering waters.',
      energyLevel: 4,
      tags: ['peaceful', 'lucid'],
      isLucid: true,
      sentimentLabel: 'Positive',
      typingDynamics: {
        wordsPerMinute: 45,
        averageWPM: 45,
        pauseCount: 1,
        backspaceRatio: 0.05,
        sessionDurationSeconds: 65,
        completed: true
      }
    });
    console.log('Created test dream with typing dynamics.');
  } else if (!dream.typingDynamics?.averageWPM) {
    dream.typingDynamics = {
      wordsPerMinute: 48,
      averageWPM: 48,
      pauseCount: 1,
      backspaceRatio: 0.04,
      sessionDurationSeconds: 70,
      completed: true
    };
    await dream.save();
    console.log('Updated existing dream with typing dynamics.');
  }

  console.log('Database verification complete.');
  await mongoose.disconnect();
  console.log('Test script finished successfully.');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
