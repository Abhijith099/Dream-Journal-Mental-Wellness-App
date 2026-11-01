require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Reflection = require('./models/Reflection');
const SupportResource = require('./models/SupportResource');
const WellnessContent = require('./models/WellnessContent');
const CopingCard = require('./models/CopingCard');
const AudioResource = require('./models/AudioResource');
const PeerStory = require('./models/PeerStory');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
const dreamRoutes = require('./routes/dreamRoutes');
const reflectionRoutes = require('./routes/reflectionRoutes');
const wellnessRoutes = require('./routes/wellnessRoutes');
const chatRoutes = require('./routes/chatRoutes');
const vitalsRoutes = require('./routes/vitalsRoutes');
const authRoutes = require('./routes/authRoutes');
const insightsRoutes = require('./routes/insightsRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const cbtRoutes = require('./routes/cbtRoutes');
const homeRoutes = require('./routes/homeRoutes');
const memorySupportRoutes = require('./routes/memorySupportRoutes');
const caregiverRoutes = require('./routes/caregiverRoutes');
const emaRoutes = require('./routes/emaRoutes');
const biometricsRoutes = require('./routes/biometricsRoutes');
const spotifyRoutes = require('./routes/spotify');
const path = require('path');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/dreams', dreamRoutes);
app.use('/api/reflections', reflectionRoutes);
app.use('/api', wellnessRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chatbot', chatRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/biometrics', biometricsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', authRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/cbt', cbtRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/users', homeRoutes);
app.use('/api/memory-support', memorySupportRoutes);
app.use('/api/sanctuary', memorySupportRoutes);
app.use('/api/user/sanctuary', memorySupportRoutes);
app.use('/user/sanctuary', memorySupportRoutes);
app.use('/api/user/emergency-contacts', memorySupportRoutes);
app.use('/user/emergency-contacts', memorySupportRoutes);
app.use('/api/user/sessions', memorySupportRoutes);
app.use('/user/sessions', memorySupportRoutes);
app.use('/api/user/navigation', memorySupportRoutes);
app.use('/user/navigation', memorySupportRoutes);
app.use('/api/caregiver', caregiverRoutes);
app.use('/caregiver', caregiverRoutes);
app.use('/api/ema', emaRoutes);
app.use('/api/spotify', spotifyRoutes);

// 1. Check if the MONGO_URI exists in the .env file
const dbURI = process.env.MONGO_URI;
if (!dbURI) {
  console.error("Missing MONGO_URI in .env file");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: Missing JWT_SECRET in .env file. Falling back to default secret.");
}

// 2. Connect to MongoDB using Mongoose
mongoose.connect(dbURI)
  .then(() => {
    console.log('MongoDB is successfully connected! 🍃');
    seedData();
  })
  .catch((err) => console.log('Database connection error: ', err));

// A simple test route
app.get('/api/status', (req, res) => {
  res.json({ message: "Lucid Dreams API is running!" });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is blasting off on port ${PORT} (0.0.0.0) 🚀`);
});

// Note: Delete route has been migrated to routes/dreamRoutes.js for cleaner structure and to prevent model reference errors.

// Database seeding helper
const seedData = async () => {
  try {
    const list = [
      "Dreams process what waking hours don't have room for.",
      "Recording without judgment is the whole practice.",
      "Some nights won't have a dream to log. That's fine too.",
      "The subconscious speaks in symbols, not straight lines.",
      "Your mind wanders when the body rests; let it guide you.",
      "Every logged memory is an anchor in the waking world.",
      "Lucidity starts with notice. Look for the anomalies.",
      "A quiet mind remembers more than a busy one.",
      "Symbols repeat when they are left unexamined.",
      "The border between memory and imagination is thin.",
      "Observe the shadows without naming them.",
      "Rest is not a reward; it is the foundation.",
      "Your dreams are uniquely yours—no translation is final.",
      "The link between conscious and subconscious is built daily.",
      "You don't have to feel ready to begin.",
      "Not every night needs meaning. Some just need rest.",
      "Noticing a pattern is enough for today."
    ];
    let seededNew = false;
    for (let i = 0; i < list.length; i++) {
      const text = list[i];
      const exists = await Reflection.findOne({ text });
      if (!exists) {
        await new Reflection({ text, order: i }).save();
        seededNew = true;
      }
    }
    if (seededNew) {
      console.log("Seeded/updated reflections pool.");
    }

    const supportCount = await SupportResource.countDocuments();
    if (supportCount === 0) {
      const resources = [
        {
          title: "Crisis Text Line",
          description: "Free, 24/7 crisis support via text message.",
          contactMethod: "Text HOME to 741741",
          region: "Global"
        },
        {
          title: "iCall",
          description: "Free, confidential counselling by trained mental health professionals.",
          contactMethod: "Call 9152987821",
          region: "India"
        },
        {
          title: "Kiran Mental Health Helpline",
          description: "Government helpline for free mental health rehabilitation.",
          contactMethod: "Call 1800-599-0019",
          region: "India · 24/7"
        },
        {
          title: "Night-to-Day Transition",
          description: "Use the 5-4-3-2-1 sensory method to anchor yourself back to physical reality when dream imagery feels too heavy.",
          contactMethod: "Self-Guided",
          region: "Global"
        },
        {
          title: "Post-Nightmare Reset",
          description: "A physiological rhythm regulator to lower your heart rate after waking from a distressing dream.",
          contactMethod: "Self-Guided",
          region: "Global"
        }
      ];
      await SupportResource.insertMany(resources);
      console.log("Seeded support resources.");
    }

    const wellnessCount = await WellnessContent.countDocuments();
    if (wellnessCount === 0) {
      const wellnessList = [
        {
          type: "meditation",
          title: "Mindful Body Scan",
          description: "A slow, grounding scan to release physical tension.",
          durationSeconds: 300,
          mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          category: "somatic-breathe",
          order: 0
        },
        {
          type: "meditation",
          title: "Deep Sleep Wind Down",
          description: "Unwind your nervous system and prepare your mind for restful sleep.",
          durationSeconds: 600,
          mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
          category: "somatic-breathe",
          order: 1
        },
        {
          type: "sound",
          title: "Rainfall & Soft Thunder",
          description: "A soothing nature soundscape to block out external distraction.",
          durationSeconds: 900,
          mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
          category: "soundscape",
          order: 2
        },
        {
          type: "sound",
          title: "Deep Ocean Resonances",
          description: "Rhythmic oceanic waves mimicking calm, steady breathing.",
          durationSeconds: 900,
          mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
          category: "soundscape",
          order: 3
        },
        {
          type: "sound",
          title: "Warm Brown Noise",
          description: "A deep, consistent frequency to soothe overstimulated minds.",
          durationSeconds: 600,
          mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
          category: "soundscape",
          order: 4
        },
        {
          type: "talk",
          title: "Steady Through a Hard Day",
          description: "A quiet reminder that your capacity is larger than this moment.",
          durationSeconds: 180,
          mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
          category: "cbt-journal",
          order: 5
        },
        {
          type: "talk",
          title: "When Anxiety Speaks",
          description: "A gentle conversation on sitting with overwhelm without letting it steer.",
          durationSeconds: 240,
          mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
          category: "cbt-journal",
          order: 6
        }
      ];
      await WellnessContent.insertMany(wellnessList);
      console.log("Seeded wellness content library.");
    }

    const copingCardCount = await CopingCard.countDocuments();
    if (copingCardCount === 0) {
      const copingCards = [
        {
          category: "work_pressure",
          negativePattern: "I have too much to do, I will fail at everything.",
          gentleReframing: "I can focus on one small task at a time and do my best.",
          actionStep: "Write down the single most important task for today."
        },
        {
          category: "anxiety",
          negativePattern: "Everyone is looking at me and judging me.",
          gentleReframing: "People are mostly focused on their own lives. I am safe.",
          actionStep: "Take three deep breaths and look around the room."
        },
        {
          category: "overwhelm",
          negativePattern: "I cannot handle this feeling, it is too much.",
          gentleReframing: "This feeling is temporary. I have got through this before.",
          actionStep: "Sit down comfortably and rest for five minutes."
        }
      ];
      await CopingCard.insertMany(copingCards);
      console.log("Seeded coping cards.");
    }

    const audioResourceCount = await AudioResource.countDocuments();
    if (audioResourceCount === 0) {
      const audioResources = [
        {
          title: "Rain on Window",
          category: "soundscape",
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          durationSeconds: 600,
          voiceType: "female_soothing"
        },
        {
          title: "Campfire Crackle",
          category: "soundscape",
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
          durationSeconds: 600,
          voiceType: "female_soothing"
        },
        {
          title: "Brown Noise Generator",
          category: "soundscape",
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
          durationSeconds: 600,
          voiceType: "female_soothing"
        },
        {
          title: "Soft Ambient Chords",
          category: "soundscape",
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
          durationSeconds: 600,
          voiceType: "female_soothing"
        },
        {
          title: "Find a Glass of Water",
          category: "micro_step",
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
          durationSeconds: 60,
          voiceType: "female_soothing"
        },
        {
          title: "15 min Sleepcast",
          category: "talk",
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
          durationSeconds: 900,
          voiceType: "female_soothing"
        }
      ];
      await AudioResource.insertMany(audioResources);
      console.log("Seeded audio resources.");
    }

    const peerStoryCount = await PeerStory.countDocuments();
    if (peerStoryCount === 0) {
      const peerStories = [
        {
          title: "Being Gentle",
          body: "Remember to be gentle with yourself today. You are doing the best you can.",
          category: "somatic-breathe",
          approved: true
        },
        {
          title: "One Breath",
          body: "You do not have to figure it all out right now. Just breathe.",
          category: "somatic-breathe",
          approved: true
        },
        {
          title: "Small Steps",
          body: "Even a small step is progress. Keep going.",
          category: "cbt-journal",
          approved: true
        }
      ];
      await PeerStory.insertMany(peerStories);
      console.log("Seeded peer stories.");
    }
  } catch (err) {
    console.error("Error seeding database:", err);
  }
};

