require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function run() {
    try {
        console.log("API Key loaded?", !!process.env.GEMINI_API_KEY);
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = "A soft, painterly, dreamlike interpretation of flying over a quiet ocean, calm aesthetic, not photorealistic";
        console.log("Calling Gemini API with prompt:", prompt);
        
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: "image/jpeg" }
        });
        
        console.log("Gemini API call successful.");
        if (response.generatedImages && response.generatedImages.length > 0) {
            console.log("Got image bytes of length:", response.generatedImages[0].image.imageBytes.length);
        }
    } catch (err) {
        console.error("Gemini call failed with error:");
        console.error(err);
    }
}

run();
