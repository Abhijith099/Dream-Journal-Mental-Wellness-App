require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function run() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const models = await ai.models.list();
        let i = 0;
        for await (const model of models) {
            if (model.name.includes("image") || model.name.includes("video") || model.name.includes("gen")) {
                console.log(model.name, model.supportedGenerationMethods);
            }
            i++;
            if (i > 100) break;
        }
    } catch (err) {
        console.error(err);
    }
}
run();
