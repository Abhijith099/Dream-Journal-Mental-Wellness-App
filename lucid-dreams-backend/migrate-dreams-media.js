require('dotenv').config();
const mongoose = require('mongoose');
const Dream = require('./models/Dream');
const GeneratedMedia = require('./models/GeneratedMedia');

async function migrate() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected. Migrating Dream media states...");

        // Fetch all dreams
        const dreams = await Dream.find({});
        console.log(`Found ${dreams.length} dreams. Syncing media...`);

        let updatedCount = 0;
        for (const dream of dreams) {
            // Find completed and saved media for this dream
            const mediaList = await GeneratedMedia.find({
                dreamId: dream._id,
                status: 'completed',
                savedToGallery: true
            }).sort({ createdAt: -1 });

            if (mediaList.length > 0) {
                // If there's a video, let's prioritize it, otherwise image
                const videoMedia = mediaList.find(m => m.mediaType === 'video');
                const imgMedia = mediaList.find(m => m.mediaType === 'image');

                let changed = false;
                if (videoMedia) {
                    dream.mediaType = 'video';
                    dream.videoUrl = videoMedia.mediaUrl;
                    if (imgMedia) {
                        dream.image = imgMedia.mediaUrl;
                        dream.imageUrl = imgMedia.mediaUrl;
                    }
                    changed = true;
                } else if (imgMedia) {
                    dream.mediaType = 'image';
                    dream.image = imgMedia.mediaUrl;
                    dream.imageUrl = imgMedia.mediaUrl;
                    changed = true;
                }

                if (changed) {
                    await dream.save();
                    updatedCount++;
                }
            } else {
                // If no media is found, default to pending if it's not set
                if (!dream.mediaType) {
                    dream.mediaType = 'pending';
                    await dream.save();
                    updatedCount++;
                }
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} dreams.`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}
migrate();
