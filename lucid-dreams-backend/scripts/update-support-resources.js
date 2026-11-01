require('dotenv').config();
const mongoose = require('mongoose');
const SupportResource = require('../models/SupportResource');

async function updateResources() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Replace old crisis resources with new Indian crisis resources
  await SupportResource.deleteMany({});

  const resources = [
    {
      title: "Crisis Text Line",
      description: "Free, 24/7 crisis support via text message.",
      contactMethod: "Text HOME to 741741",
      region: "Global",
    },
    {
      title: "iCall",
      description: "Free, confidential counselling by trained mental health professionals.",
      contactMethod: "Call 9152987821",
      region: "India",
    },
    {
      title: "Kiran Mental Health Helpline",
      description: "Government helpline for free mental health rehabilitation.",
      contactMethod: "Call 1800-599-0019",
      region: "India · 24/7",
    },
    {
      title: "Night-to-Day Transition",
      description: "Use the 5-4-3-2-1 sensory method to anchor yourself back to physical reality when dream imagery feels too heavy.",
      contactMethod: "Self-Guided",
      region: "Global",
    },
    {
      title: "Post-Nightmare Reset",
      description: "A physiological rhythm regulator to lower your heart rate after waking from a distressing dream.",
      contactMethod: "Self-Guided",
      region: "Global",
    },
  ];

  await SupportResource.insertMany(resources);
  console.log('Successfully updated SupportResource collection with Indian crisis lines!');
  await mongoose.disconnect();
}

updateResources().catch(err => {
  console.error('Error updating resources:', err);
  process.exit(1);
});
