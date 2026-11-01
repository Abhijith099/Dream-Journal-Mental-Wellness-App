require('dotenv').config();
const mongoose = require('mongoose');

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);

  const User = require('../models/User');
  const Dream = require('../models/Dream');
  const WellnessLog = require('../models/WellnessLog');
  const MoodLog = require('../models/MoodLog');
  const ObservationCache = require('../models/ObservationCache');

  // Find user
  let user = await User.findOne();
  if (!user) {
    user = await User.create({ name: 'Explorer', email: 'user@example.com' });
  }
  console.log('Seeding data for user:', user._id);

  // Clear previous test caches
  await ObservationCache.deleteMany({ userId: user._id });

  // Dates for 7 days
  const now = new Date();
  const getDayDate = (offsetDays) => {
    const d = new Date();
    d.setDate(now.getDate() - offsetDays);
    return d;
  };
  const getDayStr = (d) => d.toISOString().split('T')[0];

  // 1. Seed Wellness Logs (sleep minutes) for past 7 days
  console.log('Seeding Wellness Logs...');
  const sleepPlan = [
    { offset: 0, mins: 450, steps: 8400 }, // Today: 7.5h
    { offset: 1, mins: 480, steps: 7200 }, // Yesterday: 8.0h
    { offset: 2, mins: 360, steps: 9100 }, // 2 days ago: 6.0h
    { offset: 3, mins: 420, steps: 6500 }, // 3 days ago: 7.0h
    { offset: 4, mins: 510, steps: 8900 }, // 4 days ago: 8.5h
    { offset: 5, mins: 390, steps: 5400 }, // 5 days ago: 6.5h
    { offset: 6, mins: 460, steps: 7800 }, // 6 days ago: 7.6h
  ];

  for (const item of sleepPlan) {
    const dateObj = getDayDate(item.offset);
    const dateStr = getDayStr(dateObj);
    await WellnessLog.findOneAndUpdate(
      { userId: user._id, date: dateStr },
      { sleepMinutes: item.mins, steps: item.steps, createdAt: dateObj, updatedAt: dateObj },
      { upsert: true }
    );
  }

  // 2. Seed Dreams across past 7 days with realistic diverse attributes
  console.log('Seeding multi-day Dreams...');
  // Delete old dreams for clean testing
  await Dream.deleteMany({ userId: user._id });

  const dreamEntries = [
    // Today
    {
      offset: 0,
      title: "Gliding Over Still Waters",
      description: "I found myself floating gently over a silent, crystal-clear lake surrounded by purple mountains. The water was like a polished mirror reflecting the stars.",
      memoryText: "I found myself floating gently over a silent, crystal-clear lake surrounded by purple mountains. The water was like a polished mirror reflecting the stars.",
      sentimentLabel: "Positive",
      isLucid: true,
      energyLevel: 4,
      tags: ["peaceful", "water", "lucid", "flying"],
      symbols: ["Water", "Mirror", "Mountains"],
      themes: { peace: 9, joy: 7, anxiety: 1 }
    },
    // Yesterday
    {
      offset: 1,
      title: "The Unlocked Library Chamber",
      description: "Walking quietly through endless oak bookshelves. I noticed a secret glowing doorway behind ancient leather volumes and stepped into pure golden light.",
      memoryText: "Walking quietly through endless oak bookshelves. I noticed a secret glowing doorway behind ancient leather volumes and stepped into pure golden light.",
      sentimentLabel: "Positive",
      isLucid: false,
      energyLevel: 4,
      tags: ["peaceful", "books", "light"],
      symbols: ["Library", "Door", "Light"],
      themes: { peace: 8, connection: 6, anxiety: 1 }
    },
    // 2 days ago (Distressing / Lower sleep)
    {
      offset: 2,
      title: "Running Through Narrow Corridors",
      description: "I was running down dim concrete hallways trying to reach the exit before the clock struck twelve. The heavy iron door was jammed shut and wouldn't unlock.",
      memoryText: "I was running down dim concrete hallways trying to reach the exit before the clock struck twelve. The heavy iron door was jammed shut and wouldn't unlock.",
      sentimentLabel: "Distressing",
      isLucid: false,
      energyLevel: 2,
      tags: ["nightmare", "anxiety", "running"],
      symbols: ["Door", "Corridor", "Clock"],
      themes: { anxiety: 8, confusion: 7, pressure: 6 }
    },
    // 3 days ago (Lucid / Water motif)
    {
      offset: 3,
      title: "Breathing Underwater in the Coral Reef",
      description: "I realized I could breathe comfortably underwater. Schools of iridescent fish swirled around ancient coral structures as sunlight filtered through turquoise waves.",
      memoryText: "I realized I could breathe comfortably underwater. Schools of iridescent fish swirled around ancient coral structures as sunlight filtered through turquoise waves.",
      sentimentLabel: "Positive",
      isLucid: true,
      energyLevel: 5,
      tags: ["lucid", "water", "ocean", "calm"],
      symbols: ["Water", "Ocean", "Sunlight"],
      themes: { peace: 9, joy: 8, control: 7 }
    },
    // 4 days ago (Neutral / Surreal)
    {
      offset: 4,
      title: "The Clockmaker's Workshop",
      description: "An intricate workshop with floating gears and pendulum clocks ticking in rhythmic unison. Time seemed to slow down and stretch endlessly.",
      memoryText: "An intricate workshop with floating gears and pendulum clocks ticking in rhythmic unison. Time seemed to slow down and stretch endlessly.",
      sentimentLabel: "Neutral",
      isLucid: false,
      energyLevel: 3,
      tags: ["surreal", "time", "clock"],
      symbols: ["Clock", "Workshop"],
      themes: { confusion: 4, peace: 5 }
    },
    // 5 days ago (Positive / Water motif)
    {
      offset: 5,
      title: "River of Whispering Trees",
      description: "Drifting downstream in a wooden canoe along a gentle river. Willow trees leaned over the water, softly whispering words of comfort.",
      memoryText: "Drifting downstream in a wooden canoe along a gentle river. Willow trees leaned over the water, softly whispering words of comfort.",
      sentimentLabel: "Positive",
      isLucid: false,
      energyLevel: 4,
      tags: ["peaceful", "water", "river", "nature"],
      symbols: ["Water", "River", "Trees"],
      themes: { peace: 9, connection: 7 }
    }
  ];

  for (const entry of dreamEntries) {
    const dateObj = getDayDate(entry.offset);
    await Dream.create({
      userId: user._id,
      title: entry.title,
      description: entry.description,
      memoryText: entry.memoryText,
      sentimentLabel: entry.sentimentLabel,
      isLucid: entry.isLucid,
      energyLevel: entry.energyLevel,
      tags: entry.tags,
      symbols: entry.symbols,
      themes: entry.themes,
      typingDynamics: {
        wordsPerMinute: 48,
        averageWPM: 48,
        pauseCount: 1,
        backspaceRatio: 0.04,
        sessionDurationSeconds: 65,
        completed: true
      },
      createdAt: dateObj,
      updatedAt: dateObj,
      date: dateObj
    });
  }

  // 3. Seed MoodLogs
  console.log('Seeding Mood Logs...');
  await MoodLog.deleteMany({ userId: user._id });
  for (let offset = 0; offset < 7; offset++) {
    const dateObj = getDayDate(offset);
    await MoodLog.create({
      userId: user._id,
      energyLevel: offset === 2 ? 2 : 4,
      emotionTag: offset === 2 ? "Tense" : "Peaceful",
      createdAt: dateObj,
      updatedAt: dateObj
    });
  }

  console.log('Database successfully seeded with 7 days of rich, multi-day data!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
