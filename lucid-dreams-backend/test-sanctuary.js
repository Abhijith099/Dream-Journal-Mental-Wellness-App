const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const SanctuaryContact = require('./models/SanctuaryContact');
const SanctuaryRecording = require('./models/SanctuaryRecording');
const SanctuarySession = require('./models/SanctuarySession');

async function testSanctuaryData() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected.');

  let user = await User.findOne();
  if (!user) {
    user = new User({ email: 'sanctuary_test@example.com', name: 'Clinical Sanctuary User', passwordHash: 'hash123' });
    await user.save();
  }
  console.log('Using User:', user._id.toString(), user.name);

  // Check contacts
  let contacts = await SanctuaryContact.find({ userId: user._id });
  console.log('Current Sanctuary contacts count:', contacts.length);

  if (contacts.length === 0) {
    console.log('Seeding initial contacts...');
    const sarah = await SanctuaryContact.create({
      userId: user._id,
      name: 'Sarah',
      relationship: 'Your daughter',
      relationshipTag: 'Recent',
      roleLabel: 'Family Emergency Contact',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
      phoneNumber: '+15552345678',
      maskedPhone: '+1 555-234-5678',
      isEmergencyContact: true,
      isPrimary: true,
      isSample: false,
      sortOrder: 1,
      reassuranceNote: 'You are safe, right where you are. Place one hand on your chest and listen as long as you need.'
    });

    await SanctuaryRecording.create({
      contactId: sarah._id,
      userId: user._id,
      title: "Sarah's grounding note",
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      durationSeconds: 102,
      recordingLabel: '1m 45s soothing message',
      recordedAt: new Date(Date.now() - 24 * 3600 * 1000 + 15 * 60 * 1000),
      isSample: false
    });

    const michael = await SanctuaryContact.create({
      userId: user._id,
      name: 'Michael',
      relationship: 'Your son',
      relationshipTag: null,
      roleLabel: 'Family Contact',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      phoneNumber: '+15554328765',
      maskedPhone: '+1 555-432-8765',
      isEmergencyContact: false,
      isPrimary: false,
      isSample: false,
      sortOrder: 2,
      reassuranceNote: 'Take a soft breath. You have overcome this before and we love you.'
    });

    await SanctuaryRecording.create({
      contactId: michael._id,
      userId: user._id,
      title: "Michael's calm reassurance",
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      durationSeconds: 130,
      recordingLabel: '2m 10s calm reassurance',
      recordedAt: new Date(Date.now() - 48 * 3600 * 1000),
      isSample: false
    });

    await SanctuaryContact.create({
      userId: user._id,
      name: 'Caregiver Support',
      relationship: 'Care Companion',
      relationshipTag: '24/7',
      roleLabel: 'Available 24/7 Response Team',
      photoUrl: '',
      phoneNumber: '+18005550199',
      maskedPhone: '+1 800-555-0199',
      isEmergencyContact: true,
      isPrimary: false,
      isSample: false,
      sortOrder: 3,
      reassuranceNote: 'Our clinical care team is standing by 24 hours a day to support you.'
    });

    const sample = await SanctuaryContact.create({
      userId: user._id,
      name: 'Sample Message',
      relationship: 'Sanctuary Voice Guide',
      relationshipTag: 'Sample',
      roleLabel: 'System Reassurance Guide',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      phoneNumber: '+18005550100',
      maskedPhone: '+1 800-555-0100',
      isEmergencyContact: false,
      isPrimary: false,
      isSample: true,
      sortOrder: 4,
      reassuranceNote: 'You are safe right now. Take a moment. Breathe slowly. You have done this before and you can do it again.'
    });

    await SanctuaryRecording.create({
      contactId: sample._id,
      userId: user._id,
      title: 'Sanctuary Voice Guide message',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      durationSeconds: 75,
      recordingLabel: '1m 15s calm reassurance',
      recordedAt: new Date(),
      isSample: true
    });

    contacts = await SanctuaryContact.find({ userId: user._id });
  }

  console.log('Verified Sanctuary contacts:', contacts.map(c => ({ name: c.name, rel: c.relationship, tag: c.relationshipTag, isEm: c.isEmergencyContact })));

  const recordings = await SanctuaryRecording.find({ userId: user._id });
  console.log('Verified Sanctuary recordings:', recordings.map(r => ({ title: r.title, duration: r.durationSeconds })));

  await mongoose.disconnect();
  console.log('Test completed successfully.');
}

testSanctuaryData().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
