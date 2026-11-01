require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  console.log('Testing Gemini API with gemini-2.5-flash / gemini-3.5-flash / gemini-3.6-flash...');
  const prompt = `Analyze these dream journal entries:
Title: "The Empty Classroom"
Content: "I was running down hallways trying to find the lecture room. Everyone in the room knew the answer except me, and the door locked from the outside."

Task: Find ONE specific element, image, or recurring situation that seems emotionally significant.
Extract a short direct quote from the actual dream text (under 20 words).
Write one gentle reflective question the person could sit with about their waking life — not advice, just a question.

Return ONLY valid JSON:
{
  "quote": "short direct quote from dream under 20 words",
  "source": "Title of the dream it came from",
  "reflection": "one open, gentle question, no advice, no clinical labels"
}
Do not use clinical labels. Do not diagnose. Frame everything as curiosity, not assessment.`;

  for (const modelName of ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']) {
    try {
      console.log(`Trying ${modelName}...`);
      const result = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      console.log(`SUCCESS with ${modelName}! Result:`, result.text);
      break;
    } catch (e) {
      console.log(`Failed ${modelName}:`, e.message);
    }
  }
}

test().catch(console.error);
