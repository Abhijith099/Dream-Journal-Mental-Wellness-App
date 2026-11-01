const mongoose = require('mongoose');
const PeerStory = require('../models/PeerStory');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await PeerStory.updateMany(
    { submittedBy: { $exists: true, $ne: null }, approved: false },
    { approved: true }
  );
  console.log('Approved', result.modifiedCount, 'pending stories.');
  const all = await PeerStory.find({ approved: true }).select('title approved').sort({ createdAt: -1 });
  console.log('All approved stories now:');
  all.forEach(s => console.log(' -', s.title));
  mongoose.disconnect();
}).catch(e => { console.error(e.message); mongoose.disconnect(); });
