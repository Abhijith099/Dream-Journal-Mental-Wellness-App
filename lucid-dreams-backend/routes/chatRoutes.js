const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI } = require('@google/genai');

const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const Dream = require('../models/Dream');
const ThoughtRecord = require('../models/ThoughtRecord');
const DoneItem = require('../models/DoneItem');
const MoodCheckIn = require('../models/MoodCheckIn');

// ----------------------------------------------------
// Mock Authentication Middleware
// ----------------------------------------------------
const mockAuth = require('../middleware/auth');

// Initialize Gemini
let ai = null;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Rate Limiter: maximum 15 messages per minute per user, keyed by req.userId
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 15,
    keyGenerator: (req) => req.userId.toString(),
    message: { error: "Too many messages. Please take a breath and try again in a moment." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
});

// Crisis / Safety checking keywords & patterns
const crisisPatterns = [
    /suicid/i,
    /kill\s+(my|one|our)?self/i,
    /killing\s+(my|one|our)?self/i,
    /how\s+(shall|can|do)\s+i\s+kill/i,
    /ways\s+to\s+(kill|die|end)/i,
    /end\s+(my|one|our)?\s*life/i,
    /want\s+to\s+die/i,
    /wanna\s+die/i,
    /feel\s+like\s+(to\s+)?die/i,
    /better\s+off\s+dead/i,
    /better\s+off\s+dying/i,
    /jump\s+(off|from|in\s+front)/i,
    /hang\s+(my|one)?self/i,
    /hanging\s+(my|one)?self/i,
    /overdose/i,
    /stab\s+(my|one)?self/i,
    /stabbing/i,
    /cut\s+(my|one)?self/i,
    /cutting\s+(my|one)?self/i,
    /slit\s+(my\s+)?wrists?/i,
    /eat(ing)?\s+poison/i,
    /drink(ing)?\s+bleach/i,
    /poison\s+(my|one)?self/i,
    /shoot\s+(my|one)?self/i,
    /shooting\s+(my|one)?self/i,
    /self[- ]harm/i,
    /hurt\s+(my|one)?self/i,
    /harm\s+(my|one)?self/i,
    /wanna\s+end\s+it/i,
    /taking\s+my\s+life/i,
    /end\s+it\s+all/i,
    /no\s+point\s+(in\s+living|living|to\s+live)/i,
    /hopelessness/i,
    /giving\s+up\s+entirely/i,
];

function containsCrisisLanguage(text) {
    if (!text || typeof text !== 'string') return false;
    return crisisPatterns.some(pattern => pattern.test(text));
}

function getFallbackResponse(text) {
    const lower = text.toLowerCase();
    if (containsCrisisLanguage(text)) {
        return "This is an automated safety response. I am an AI, not a human, and I want to make sure you are safe. Please immediately reach out to the Suicide & Crisis Lifeline by calling or texting 988 (or text HOME to 741741 for the Crisis Text Line), or go to your nearest emergency room. You do not have to go through this alone.";
    }
    if (lower.includes('hello') || lower.includes('hi ') || lower.includes('hey')) {
        return "Hello. I'm here to listen and offer grounding support. How are you feeling right now?";
    }
    if (lower.includes('dream') || lower.includes('nightmare')) {
        return "Dreams can feel so real and intense. Writing them down helps us process them. Would you like to focus on the emotions or the symbols in that dream?";
    }
    if (lower.includes('anxious') || lower.includes('anxiety') || lower.includes('scared') || lower.includes('fear') || lower.includes('panic')) {
        return "It sounds like you're experiencing a wave of anxiety. Let's take a slow breath together. Inhale for 4 seconds, hold, and release. I'm right here with you.";
    }
    if (lower.includes('sad') || lower.includes('depressed') || lower.includes('cry') || lower.includes('down')) {
        return "I hear you, and it's okay to sit with sadness. You don't have to push through it alone. Would you like to take a quiet grounding moment or share more about what is weighing on you?";
    }
    if (lower.includes('thank') || lower.includes('thanks')) {
        return "You're welcome. Remember to be gentle with yourself today.";
    }
    return "I am holding space for you. Take a slow, gentle breath. What is one small, kind thing you can do for your nervous system right now?";
}

// 0. GET /chat/profile -> Fetch user profile details
router.get('/profile', mockAuth, async (req, res) => {
    try {
        res.json({
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            designation: req.user.name ? req.user.name.toUpperCase() : 'NEURAL SUBJECT 01'
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
});

// 1. GET /chat/sessions or /chat/conversations
router.get(['/sessions', '/conversations'], mockAuth, async (req, res) => {
    try {
        const sessions = await ChatSession.find({ userId: req.userId }).sort({ updatedAt: -1 });
        const total = sessions.length;

        // If client requests /conversations, return format matching spec
        if (req.path.includes('/conversations')) {
            const mappedConversations = await Promise.all(sessions.map(async s => {
                const lastMsg = await ChatMessage.findOne({ userId: req.userId, sessionId: s._id }).sort({ createdAt: -1 });
                return {
                    conversation_id: s._id,
                    created_at: s.createdAt,
                    last_message_at: lastMsg ? lastMsg.createdAt : s.updatedAt,
                    message_preview: lastMsg ? (lastMsg.content.length > 60 ? lastMsg.content.substring(0, 60) + '...' : lastMsg.content) : s.title
                };
            }));

            return res.json({
                user_id: req.userId,
                conversations: mappedConversations,
                total_conversations: total
            });
        }

        const mapped = sessions.map(s => ({
            _id: s._id,
            title: s.title,
            updatedAt: s.updatedAt
        }));
        res.json(mapped);
    } catch (err) {
        console.error("Error fetching chat sessions:", err);
        res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
});

// 1.5 GET /chat/sessions/:id/messages or /chat/conversations/:id/messages
router.get(['/sessions/:id/messages', '/conversations/:id/messages'], mockAuth, async (req, res) => {
    try {
        if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
            // New client-generated session strings (e.g. session_1791172585854) have no persisted messages yet
            return res.json([]);
        }

        // Validate session belongs to user
        const session = await ChatSession.findOne({ _id: req.params.id, userId: req.userId });
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }
        
        const history = await ChatMessage.find({ userId: req.userId, sessionId: req.params.id }).sort({ createdAt: 1 });
        const mapped = history.map(msg => ({
            message_id: msg._id,
            _id: msg._id,
            role: msg.role === 'user' ? 'user' : 'assistant',
            sender: msg.role === 'user' ? 'user' : 'bot',
            content: msg.content,
            text: msg.content,
            flaggedCrisis: msg.flaggedRisk,
            created_at: msg.createdAt,
            createdAt: msg.createdAt
        }));
        res.json(mapped);
    } catch (err) {
        console.error("Error fetching session messages:", err);
        res.status(500).json({ error: "Failed to fetch session messages" });
    }
});

// 2. POST /chat or /chat/message -> Send message, evaluate safety checks, retrieve dreams context, and prompt LLM
router.post(['/', '/message'], mockAuth, chatLimiter, async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: "Message text is required" });
        }

        // Layer 1 - Deterministic safety check: IMMEDIATE CUTOFF
        const isCrisis = containsCrisisLanguage(message);
        if (isCrisis) {
            const emergencyReply = "This is an automated safety response. I am an AI, not a human, and I want to make sure you are safe. Please immediately reach out to the Suicide & Crisis Lifeline by calling or texting 988 (or text HOME to 741741 for the Crisis Text Line), or go to your nearest emergency room. You do not have to go through this alone.";
            
            let currentSessionId = sessionId;
            try {
                if (!currentSessionId || !mongoose.Types.ObjectId.isValid(currentSessionId)) {
                    const newSession = new ChatSession({ userId: req.userId, title: "Crisis Safety Intercept" });
                    await newSession.save();
                    currentSessionId = newSession._id;
                }
                await new ChatMessage({ userId: req.userId, sessionId: currentSessionId, role: 'user', content: message, flaggedRisk: true }).save();
                await new ChatMessage({ userId: req.userId, sessionId: currentSessionId, role: 'assistant', content: emergencyReply, flaggedRisk: true }).save();
            } catch (auditErr) {
                console.error("Error saving crisis audit log:", auditErr);
            }

            console.log(`[CRITICAL SAFETY ALERT] Immediate crisis intervention sent for User ${req.userId}`);

            return res.status(200).json({
                reply: emergencyReply,
                riskFlagged: true,
                sessionId: currentSessionId,
                crisisResources: {
                    text: "Text HOME to 741741",
                    call: "988",
                    safetyPlanRoute: "/safety-plan"
                }
            });
        }

        // Fetch user's 3-5 most recent dreams
        const recentDreams = await Dream.find({ userId: req.userId })
            .sort({ date: -1 })
            .limit(5);

        const dreamsContext = recentDreams.map((d, index) => {
            const text = d.memoryText || d.description || "";
            const truncatedText = text.length > 200 ? text.substring(0, 200) + "..." : text;
            return `Dream #${index + 1}: Title: "${d.title}". Description: "${truncatedText}"`;
        }).join('\n');

        let isPatternQuestion = /my pattern|my history|when am i|when do i|why do i|why am i|how often|recently|what usually|what are my/i.test(message);
        let extraContext = "";

        if (isPatternQuestion) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const query = { userId: req.userId, createdAt: { $gte: thirtyDaysAgo } };
            
            const recentThoughts = await ThoughtRecord.find(query).lean();
            const recentDoneItems = await DoneItem.find(query).lean();
            const recentMoods = await MoodCheckIn.find(query).lean();

            extraContext = `\n[USER PATTERN QUESTION DETECTED - 30 DAY HISTORY CONTEXT]:
Thought Records (Distortions): ${recentThoughts.map(t => t.distortion).join(", ") || 'None'}
Micro-Wins Categories: ${recentDoneItems.map(d => d.category).join(", ") || 'None'}
Moods: ${recentMoods.map(m => m.mood).join(", ") || 'None'}

CRITICAL INSTRUCTION FOR PATTERN QUESTIONS:
The user is asking a question about their patterns or history. You MUST ONLY answer using the real data provided in this context (Dreams, Thought Records, Micro-Wins, Moods). Do NOT invent, infer, or guess trends outside of this data. If there is not enough data to answer confidently, explicitly state that you don't have enough information to answer that yet, rather than generating a plausible but unsupported answer.`;
        }

        // Handle Session
        let currentSessionId = sessionId;
        if (!currentSessionId || !mongoose.Types.ObjectId.isValid(currentSessionId)) {
            const title = message.length > 50 ? message.substring(0, 50) + "..." : message;
            const newSession = new ChatSession({
                userId: req.userId,
                title: title
            });
            await newSession.save();
            currentSessionId = newSession._id;
        } else {
            await ChatSession.findByIdAndUpdate(currentSessionId, { updatedAt: new Date() });
        }

        // Fetch last 10 messages for conversation history in THIS session
        const priorMessages = await ChatMessage.find({ userId: req.userId, sessionId: currentSessionId })
            .sort({ createdAt: -1 })
            .limit(10);
        priorMessages.reverse();

        // Save User Message
        const userMsg = new ChatMessage({
            userId: req.userId,
            sessionId: currentSessionId,
            role: 'user',
            content: message,
            flaggedRisk: isCrisis
        });
        await userMsg.save();

        let botReplyText = "";
        let riskFlagged = isCrisis;

        if (ai) {
            try {
                const conversationHistory = priorMessages.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }));

                const systemInstruction = `You are a calm, supportive neural companion inside a dream journal and wellness app.
You are not a therapist, counselor, or medical professional. Never attempt to diagnose, use clinical/diagnostic language, or claim to be a therapist.

TONE & PERSONALITY:
- Respond like an attentive, calm person. Vary sentence structure and length.
- Reflect back something specific from what the user actually said.
- Ask a genuine follow-up tied to their message rather than a generic templated question. The same follow-up question must not repeat verbatim across different user messages in one conversation.
- Acknowledge feelings directly, do not promise they will go away, and avoid toxic positivity.

CRITICAL SAFETY INSTRUCTIONS:
- You must NEVER provide information on methods or means related to self-harm or suicide under any framing (including hypothetical, fictional, or roleplay).
- If the user's message expresses hopelessness, suicidal ideation, self-harm, or similar distress: respond with direct, warm acknowledgment (not a deflection, not the same generic template used for everyday stress) and state that you're sharing some support resources. Begin your response with the token [CRISIS_FLAG].

Here is the context of the user's 3-5 most recent dreams to help you respond to prompts like "talk about last night's dream":
${dreamsContext}
${extraContext}
`;

                let prompt = message;
                if (isCrisis) {
                    prompt = `[CRITICAL SAFETY NOTICE: Please acknowledge the user's feelings directly and warmly, prioritize connecting them to support resources, and you MUST begin your response with [CRISIS_FLAG]]\n${message}`;
                }

                // Append the current message to contents
                conversationHistory.push({
                    role: 'user',
                    parts: [{ text: prompt }]
                });

                let response = null;
                try {
                    response = await ai.models.generateContent({
                        model: 'gemini-flash-latest',
                        contents: conversationHistory,
                        config: {
                            systemInstruction: systemInstruction,
                        }
                    });
                } catch (primaryErr) {
                    console.warn("Primary gemini-flash-latest unavailable, falling back to gemini-3.5-flash-lite:", primaryErr?.message || primaryErr);
                    response = await ai.models.generateContent({
                        model: 'gemini-3.5-flash-lite',
                        contents: conversationHistory,
                        config: {
                            systemInstruction: systemInstruction,
                        }
                    });
                }
                
                botReplyText = response && response.text ? response.text.trim() : getFallbackResponse(message);

                if (botReplyText.includes('[CRISIS_FLAG]')) {
                    riskFlagged = true;
                    botReplyText = botReplyText.replace('[CRISIS_FLAG]', '').trim();
                }
            } catch (geminiErr) {
                console.error("Gemini call failed, using graceful fallback:", geminiErr?.message || geminiErr);
                botReplyText = getFallbackResponse(message);
            }
        } else {
            console.warn("Gemini is not initialized (GEMINI_API_KEY missing). Using fallback.");
            botReplyText = getFallbackResponse(message);
        }

        if (riskFlagged) {
            if (!botReplyText || botReplyText.includes("trouble responding")) {
                botReplyText = "I hear how much pain you're in, and I want to support you, but I'm an AI companion and cannot provide crisis care. Please reach out to someone who can help. You can text HOME to 741741 (Crisis Text Line) or call/text 988 (National Suicide Prevention Lifeline) to speak with someone who cares, free of charge.";
            }
        }

        // Save Bot Message
        const botMsg = new ChatMessage({
            userId: req.userId,
            sessionId: currentSessionId,
            role: 'assistant',
            content: botReplyText,
            flaggedRisk: riskFlagged
        });
        await botMsg.save();

        if (riskFlagged) {
            userMsg.flaggedRisk = true;
            await userMsg.save();

            // Log flagged event server-side for developer review
            console.log(`[SAFETY ALERT] Crisis risk flagged for User ${req.userId} at ${new Date().toISOString()}. Message: "${message}"`);
        }
        
        const apiResponse = {
            reply: botMsg.content,
            riskFlagged: riskFlagged,
            sessionId: currentSessionId
        };
        
        if (riskFlagged) {
            apiResponse.crisisResources = {
                text: "Text HOME to 741741",
                call: "988",
                safetyPlanRoute: "/safety-plan"
            };
        }

        res.status(201).json(apiResponse);
    } catch (err) {
        console.error("Error in post chat message:", err);
        res.status(500).json({ error: "Failed to process message" });
    }
});

module.exports = router;
module.exports.containsCrisisLanguage = containsCrisisLanguage;
