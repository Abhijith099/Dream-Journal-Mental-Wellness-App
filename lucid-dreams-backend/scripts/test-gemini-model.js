require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testGemini() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `You are a calm, non-clinical wellness reflection assistant. You will analyze the user's dream entries and return a JSON object. Return ONLY valid JSON, no markdown, no code fences, no explanation before or after the JSON. Never use hashtags. Never use backticks. Never wrap words in code notation. The exact format is:
{
  "headline": "a short emotional weather metaphor phrase, max 10 words",
  "observation_1": "one plain sentence, no hashtags, no special characters",
  "observation_2": "one plain sentence, no hashtags, no special characters",
  "observation_3": "one plain sentence, no hashtags, no special characters",
  "disclaimer": "Based on your own entries, not a clinical assessment"
}

Dream Summaries:
- Title: Walking in a peaceful garden
  Tags: peaceful, surreal
  Energy: 4`;

  const models = ['gemini-3.6-flash', 'gemini-3.1-pro-preview', 'gemini-3.5-flash'];
  for (const m of models) {
    try {
      console.log(`Testing model: ${m}...`);
      const result = await ai.models.generateContent({
        model: m,
        contents: prompt
      });
      console.log(`SUCCESS with ${m}:`, result.text);
      return m;
    } catch (e) {
      console.log(`Failed ${m}:`, e.message);
    }
  }
}

testGemini();
