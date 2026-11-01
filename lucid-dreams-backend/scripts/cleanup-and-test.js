const mongoose = require('mongoose');
const PeerStory = require('../models/PeerStory');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const titlesToDelete = [
    "Learning to Ask for Help",
    "My Journey",
    "One Breath",
    "Small Steps",
    "Being Gentle"
  ];

  const result = await PeerStory.deleteMany({ title: { $in: titlesToDelete } });
  console.log('Deleted', result.deletedCount, 'test stories.');
  
  const remaining = await PeerStory.find({ approved: true }).select('title approved').sort({ createdAt: -1 });
  console.log('Remaining approved stories:');
  if (remaining.length === 0) {
    console.log(' - No curated stories found. (Empty state confirmed)');
  } else {
    remaining.forEach(s => console.log(' -', s.title));
  }
  
  // Now submit a long test story
  const longText = `This is a very long story to test if truncation is happening anywhere. ` + 
    `It needs to be longer than 280 characters to properly test this. `.repeat(6);
  
  const newStory = new PeerStory({
    title: 'Truncation Test Story',
    body: longText,
    approved: true,
    tags: ['test'],
    submittedBy: new mongoose.Types.ObjectId() // fake id for testing
  });
  
  await newStory.save();
  console.log('\nSaved long test story:', newStory._id);
  console.log('Length:', newStory.body.length);
  
  // Verify it from DB
  const fetchedStory = await PeerStory.findById(newStory._id);
  console.log('Fetched length:', fetchedStory.body.length);
  if (fetchedStory.body.length === longText.length) {
     console.log('No DB truncation!');
  } else {
     console.log('Truncated in DB!');
  }

  mongoose.disconnect();
}).catch(e => { console.error(e.message); mongoose.disconnect(); });
