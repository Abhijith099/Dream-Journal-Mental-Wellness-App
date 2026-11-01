require('dotenv').config();
const mongoose = require('mongoose');
const GeneratedMedia = require('./models/GeneratedMedia');

async function migrate() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected. Migrating GeneratedMedia...");
        
        const result = await GeneratedMedia.updateMany(
            { savedToGallery: { $exists: false } },
            { $set: { savedToGallery: true } }
        );
        
        console.log(`Migration complete. Modified ${result.modifiedCount} documents.`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}
migrate();
