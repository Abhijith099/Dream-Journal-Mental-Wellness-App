require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function run() {
    try {
        console.log("API Key loaded?", !!process.env.GEMINI_API_KEY);
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: 'Hello',
        });
        
        console.log("Success:", response.text);
    } catch (err) {
        console.error("Gemini call failed:", err);
    }
}

run();
