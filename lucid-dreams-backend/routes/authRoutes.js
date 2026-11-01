const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { sendOtpEmail } = require('../utils/emailService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

// Other models for export and cascade delete
const Dream = require('../models/Dream');
const SafetyPlan = require('../models/SafetyPlan');
const ThoughtRecord = require('../models/ThoughtRecord');
const BehavioralTask = require('../models/BehavioralTask');
const MoodLog = require('../models/MoodLog');
const MoodCheckIn = require('../models/MoodCheckIn');
const DailyVitals = require('../models/DailyVitals');
const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const DoneItem = require('../models/DoneItem');
const PeerStory = require('../models/PeerStory');
const SanctuaryContact = require('../models/SanctuaryContact');
const SanctuaryRecording = require('../models/SanctuaryRecording');
const SanctuaryPhotograph = require('../models/SanctuaryPhotograph');
const SanctuaryMusic = require('../models/SanctuaryMusic');
const SanctuarySession = require('../models/SanctuarySession');
const CaregiverAssignment = require('../models/CaregiverAssignment');
const AuditLog = require('../models/AuditLog');
const DailyCheckIn = require('../models/DailyCheckIn');
const CompanionSession = require('../models/CompanionSession');
const BreathingSession = require('../models/BreathingSession');
const GroundingSession = require('../models/GroundingSession');
const LatestInsight = require('../models/LatestInsight');
const HeartRateLog = require('../models/HeartRateLog');
const EMAEntry = require('../models/EMAEntry');
const WellnessLog = require('../models/WellnessLog');
const WeeklyDigest = require('../models/WeeklyDigest');
const ObservationCache = require('../models/ObservationCache');
const {
    Observation,
    Experiment,
    Intervention,
    EveningCheckIn,
    MorningReflection,
    ResetSession
} = require('../models/insightsModels');

// Password Strength Validator (5 criteria)
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()\-_=+[\]{}|;':",.<>?/\\]/;

function validatePasswordStrength(password) {
    const errors = [];
    if (!password || password.length < 8) errors.push('at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('at least one number');
    if (!SPECIAL_CHAR_REGEX.test(password)) errors.push('at least one special character');
    return errors;
}

function formatUserResponse(user) {
    const firstName = user.firstName || (user.displayName ? user.displayName.split(' ')[0] : (user.name ? user.name.split(' ')[0] : 'Dreamer'));
    return {
        id: user._id,
        name: user.name,
        displayName: user.displayName || user.name,
        firstName: firstName,
        profile: {
            firstName: firstName,
            displayName: user.displayName || user.name
        },
        email: user.email,
        hasCompletedOnboarding: user.hasCompletedOnboarding || false,
        primaryIntent: user.primaryIntent || null,
        typicalWakeTime: user.typicalWakeTime || null,
        recentSleepQuality: user.recentSleepQuality || null,
        onboardingMoodWord: user.onboardingMoodWord || null,
        currentStateTag: user.currentStateTag || null,
        wantsMemorySupport: user.wantsMemorySupport || false,
        typingDynamicsEnabled: user.typingDynamicsEnabled || false
    };
}

// Handler for user registration / signup
const handleRegister = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const passwordErrors = validatePasswordStrength(password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({
                error: `Password does not meet strength requirements: ${passwordErrors.join(', ')}`
            });
        }

        const lowercaseEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: lowercaseEmail });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            displayName: name,
            email: lowercaseEmail,
            passwordHash,
            designation: name.toUpperCase(),
            hasCompletedOnboarding: false
        });

        await newUser.save();

        const token = jwt.sign(
            {
                userId: newUser._id,
                user_id: newUser._id,
                sub: newUser._id.toString(),
                email: newUser.email,
                iss: 'mental-health-app',
                aud: ['api', 'web']
            },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '30d' }
        );

        res.status(201).json({
            token,
            user: formatUserResponse(newUser)
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

// POST /api/auth/register and alias /api/auth/signup
router.post('/register', handleRegister);
router.post('/signup', handleRegister);

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const lowercaseEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: lowercaseEmail });
        if (!user || !user.passwordHash) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                user_id: user._id,
                sub: user._id.toString(),
                email: user.email,
                iss: 'mental-health-app',
                aud: ['api', 'web']
            },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: formatUserResponse(user)
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// POST /api/auth/initialize or /api/user/initialize
router.post('/initialize', auth, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const { preferred_timezone, notification_settings } = req.body || {};
        if (preferred_timezone) {
            user.timezone = preferred_timezone;
        }
        if (notification_settings) {
            user.notificationSettings = notification_settings;
        }
        await user.save();

        const dreamsCount = await Dream.countDocuments({ userId });
        const wellnessCount = await WellnessLog.countDocuments({ userId });
        const chatsCount = await ChatSession.countDocuments({ userId });
        const sanctuaryCount = await SanctuarySession.countDocuments({ userId });

        return res.status(200).json({
            success: true,
            message: "User workspace initialized cleanly with isolated collections",
            user_id: userId,
            preferences: {
                preferred_timezone: user.timezone || 'UTC',
                notification_settings: user.notificationSettings || {}
            },
            collections: {
                dreams: dreamsCount,
                wellness_entries: wellnessCount,
                chatbot_conversations: chatsCount,
                sanctuary_sessions: sanctuaryCount
            }
        });
    } catch (err) {
        console.error("Error initializing user workspace:", err);
        return res.status(500).json({ error: "Failed to initialize workspace" });
    }
});

// POST /api/auth/forgot-password -> Initiate password reset flow with 4-digit OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const lowercaseEmail = email.toLowerCase().trim();

        // Rate limiting: max 3 requests per email per 15 minutes
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentTokensCount = await PasswordResetToken.countDocuments({
            email: lowercaseEmail,
            createdAt: { $gte: fifteenMinutesAgo }
        });

        if (recentTokensCount >= 3) {
            return res.status(429).json({
                error: 'Too many reset requests for this email. Please try again after 15 minutes.'
            });
        }

        const user = await User.findOne({ email: lowercaseEmail });
        // Generic 200 response even if user doesn't exist (security best practice)
        if (!user) {
            return res.json({ message: 'If that email is registered, a code has been sent.' });
        }

        // Clean up any existing tokens for this email
        await PasswordResetToken.deleteMany({ email: lowercaseEmail });

        // Generate 4-digit OTP
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Save token (will expire in 10 minutes via TTL index)
        await PasswordResetToken.create({
            email: lowercaseEmail,
            otpHash,
            resetToken,
            attempts: 0,
            used: false
        });

        // Send OTP email (never return OTP in response)
        await sendOtpEmail(lowercaseEmail, otpCode);

        res.json({ message: 'If that email is registered, a code has been sent.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Server error requesting password reset' });
    }
});

// POST /api/auth/verify-otp -> Verify 4-digit OTP and return resetToken
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and verification code are required' });
        }

        const lowercaseEmail = email.toLowerCase().trim();
        const tokenDoc = await PasswordResetToken.findOne({ email: lowercaseEmail, used: false });

        if (!tokenDoc) {
            return res.status(400).json({
                error: 'Verification code has expired or is invalid. Please request a new code.'
            });
        }

        if (tokenDoc.attempts >= 3) {
            await PasswordResetToken.deleteOne({ _id: tokenDoc._id });
            return res.status(400).json({
                error: 'Too many failed attempts. Please request a new code.',
                maxAttemptsExceeded: true
            });
        }

        const inputHash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
        if (inputHash !== tokenDoc.otpHash) {
            tokenDoc.attempts += 1;
            await tokenDoc.save();
            const remaining = 3 - tokenDoc.attempts;

            if (remaining <= 0) {
                await PasswordResetToken.deleteOne({ _id: tokenDoc._id });
                return res.status(400).json({
                    error: 'Too many failed attempts. Please request a new code.',
                    maxAttemptsExceeded: true
                });
            }

            return res.status(400).json({
                error: `Incorrect code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
                remainingAttempts: remaining
            });
        }

        // Successful verification
        res.json({
            message: 'Code verified successfully',
            resetToken: tokenDoc.resetToken
        });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ error: 'Server error verifying code' });
    }
});

// POST /api/auth/reset-password -> Set new password using resetToken
router.post('/reset-password', async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;
        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({ error: 'Email, reset token, and new password are required' });
        }

        const lowercaseEmail = email.toLowerCase().trim();

        // Validate password strength (5 criteria)
        const passwordErrors = validatePasswordStrength(newPassword);
        if (passwordErrors.length > 0) {
            return res.status(400).json({
                error: `Password does not meet strength requirements: ${passwordErrors.join(', ')}`
            });
        }

        const tokenDoc = await PasswordResetToken.findOne({
            email: lowercaseEmail,
            resetToken,
            used: false
        });

        if (!tokenDoc) {
            return res.status(400).json({
                error: 'Reset session has expired or is invalid. Please request a new code.'
            });
        }

        const user = await User.findOne({ email: lowercaseEmail });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        // Invalidate token (single-use)
        await PasswordResetToken.deleteOne({ _id: tokenDoc._id });

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Server error resetting password' });
    }
});

// GET /api/auth/me and GET /api/user/profile -> Get current authenticated user profile
const handleGetProfile = async (req, res) => {
    try {
        res.json({
            user: formatUserResponse(req.user)
        });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Server error fetching profile' });
    }
};

router.get('/me', auth, handleGetProfile);
router.get('/profile', auth, handleGetProfile);

// PUT /api/auth/typing-dynamics-consent -> Update user typing dynamics consent
router.put('/typing-dynamics-consent', auth, async (req, res) => {
    try {
        const { enabled } = req.body;
        req.user.typingDynamicsEnabled = Boolean(enabled);
        await req.user.save();

        res.json({
            message: 'Typing dynamics preference updated',
            typingDynamicsEnabled: req.user.typingDynamicsEnabled,
            user: formatUserResponse(req.user)
        });
    } catch (err) {
        console.error('Update typing dynamics consent error:', err);
        res.status(500).json({ error: 'Server error updating typing dynamics consent' });
    }
});

// PATCH /api/user/profile or /api/auth/profile -> Atomic onboarding & profile update
const handleUpdateProfile = async (req, res) => {
    try {
        const {
            displayName,
            name,
            primaryIntent,
            typicalWakeTime,
            recentSleepQuality,
            onboardingMoodWord,
            currentStateTag,
            wantsMemorySupport,
            hasCompletedOnboarding
        } = req.body;

        if (displayName !== undefined && displayName !== null) {
            req.user.displayName = String(displayName).trim();
            if (!req.user.name) req.user.name = String(displayName).trim();
        }
        if (name !== undefined && name !== null) {
            req.user.name = String(name).trim();
            req.user.designation = String(name).trim().toUpperCase();
            if (!req.user.displayName) req.user.displayName = String(name).trim();
        }
        if (primaryIntent !== undefined) req.user.primaryIntent = primaryIntent;
        if (typicalWakeTime !== undefined) req.user.typicalWakeTime = typicalWakeTime;
        if (recentSleepQuality !== undefined && recentSleepQuality !== null) {
            req.user.recentSleepQuality = Number(recentSleepQuality);
        }
        if (onboardingMoodWord !== undefined && onboardingMoodWord !== null) {
            req.user.onboardingMoodWord = String(onboardingMoodWord).trim();
        }
        if (currentStateTag !== undefined) req.user.currentStateTag = currentStateTag;
        if (wantsMemorySupport !== undefined) req.user.wantsMemorySupport = Boolean(wantsMemorySupport);
        if (hasCompletedOnboarding !== undefined) req.user.hasCompletedOnboarding = Boolean(hasCompletedOnboarding);

        await req.user.save();

        res.json({
            message: 'Profile updated successfully',
            user: formatUserResponse(req.user)
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Server error updating profile' });
    }
};

router.patch('/profile', auth, handleUpdateProfile);
router.put('/profile', auth, handleUpdateProfile);

// PUT /api/auth/password -> Change password
router.put('/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        const isMatch = await bcrypt.compare(currentPassword, req.user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        req.user.passwordHash = await bcrypt.hash(newPassword, salt);
        await req.user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Update password error:', err);
        res.status(500).json({ error: 'Server error updating password' });
    }
});

// GET /api/auth/export -> Export user data
router.get('/export', auth, async (req, res) => {
    try {
        const userId = req.userId;
        const [
            dreams,
            safetyPlan,
            thoughtRecords,
            behavioralTasks,
            moodLogs,
            moodCheckIns,
            dailyVitals,
            chatMessages,
            chatSessions,
            doneItems
        ] = await Promise.all([
            Dream.find({ userId }),
            SafetyPlan.findOne({ userId }),
            ThoughtRecord.find({ userId }),
            BehavioralTask.find({ userId }),
            MoodLog.find({ userId }),
            MoodCheckIn.find({ userId }),
            DailyVitals.find({ userId }),
            ChatMessage.find({ userId }),
            ChatSession.find({ userId }),
            DoneItem.find({ userId })
        ]);

        res.json({
            account: {
                name: req.user.name,
                email: req.user.email,
                createdAt: req.user.createdAt
            },
            dreams,
            safetyPlan,
            thoughtRecords,
            behavioralTasks,
            moodLogs,
            moodCheckIns,
            dailyVitals,
            chatMessages,
            chatSessions,
            doneItems
        });
    } catch (err) {
        console.error('Export data error:', err);
        res.status(500).json({ error: 'Server error exporting data' });
    }
});

// DELETE /api/auth/account -> Permanently delete user account
router.delete('/account', auth, async (req, res) => {
    try {
        const confirmation = req.body?.confirmation || req.query?.confirmation;
        if (confirmation && confirmation !== 'DELETE') {
            return res.status(400).json({ error: 'Invalid confirmation text. Must be DELETE' });
        }

        const userId = req.userId;

        // Cascade delete across all collections
        await Promise.allSettled([
            User.findByIdAndDelete(userId),
            PasswordResetToken.deleteMany({ email: req.user?.email }),
            Dream.deleteMany({ userId }),
            SafetyPlan.deleteMany({ userId }),
            ThoughtRecord.deleteMany({ userId }),
            BehavioralTask.deleteMany({ userId }),
            MoodLog.deleteMany({ userId }),
            MoodCheckIn.deleteMany({ userId }),
            DailyVitals.deleteMany({ userId }),
            ChatMessage.deleteMany({ userId }),
            ChatSession.deleteMany({ userId }),
            DoneItem.deleteMany({ userId }),
            PeerStory.deleteMany({ submittedBy: userId }),
            SanctuaryContact.deleteMany({ userId }),
            SanctuaryRecording.deleteMany({ userId }),
            SanctuaryPhotograph.deleteMany({ userId }),
            SanctuaryMusic.deleteMany({ userId }),
            SanctuarySession.deleteMany({ userId }),
            CaregiverAssignment.deleteMany({ $or: [{ caregiverId: userId }, { patientId: userId }] }),
            AuditLog.deleteMany({ $or: [{ userId }, { actorId: userId }] }),
            DailyCheckIn.deleteMany({ userId }),
            CompanionSession.deleteMany({ userId }),
            BreathingSession.deleteMany({ userId }),
            GroundingSession.deleteMany({ userId }),
            LatestInsight.deleteMany({ userId }),
            HeartRateLog.deleteMany({ userId }),
            EMAEntry.deleteMany({ userId }),
            WellnessLog.deleteMany({ userId }),
            WeeklyDigest.deleteMany({ userId }),
            ObservationCache.deleteMany({ userId }),
            Observation.deleteMany({ userId }),
            Experiment.deleteMany({ userId }),
            Intervention.deleteMany({ userId }),
            EveningCheckIn.deleteMany({ userId }),
            MorningReflection.deleteMany({ userId }),
            ResetSession.deleteMany({ userId })
        ]);

        res.json({ message: 'Account and all associated data permanently deleted' });
    } catch (err) {
        console.error('Delete account error:', err);
        res.status(500).json({ error: 'Server error deleting account' });
    }
});

module.exports = router;
