const { auth } = require('express-oauth2-jwt-bearer');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Auth0 JWT Verifier instance
const checkAuth0Jwt = auth({
    audience: process.env.AUTH0_AUDIENCE || 'https://dev-pimkwze13bc72sdk.eu.auth0.com/api/v2/',
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN || 'dev-pimkwze13bc72sdk.eu.auth0.com'}/`,
    tokenSigningAlg: 'RS256'
});

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token is empty, authorization denied' });
    }

    // 1. Try verifying with Auth0 RS256 verifier first
    checkAuth0Jwt(req, res, async (auth0Err) => {
        if (!auth0Err && req.auth && req.auth.payload) {
            try {
                const payload = req.auth.payload;
                const auth0Sub = payload.sub;
                const email = payload.email || payload['https://luciddreams.app/email'];
                const name = payload.name || payload.nickname || payload['https://luciddreams.app/name'] || 'Dream Explorer';

                // Look up user by auth0Id, or link to existing user by email, or create new user
                let user = null;
                if (auth0Sub) {
                    user = await User.findOne({ auth0Id: auth0Sub });
                }
                if (!user && email) {
                    user = await User.findOne({ email });
                    if (user && auth0Sub) {
                        user.auth0Id = auth0Sub;
                        await user.save();
                    }
                }
                if (!user) {
                    user = await User.create({
                        auth0Id: auth0Sub,
                        email: email || `${auth0Sub.replace(/[^a-zA-Z0-9]/g, '_')}@auth0.user`,
                        name: name,
                        designation: 'NEURAL SUBJECT 01'
                    });
                }

                // Attach to request so dreamRoutes and insightsRoutes work seamlessly!
                req.userId = user._id;
                req.user = user;
                return next();
            } catch (userErr) {
                console.error('Error resolving user from Auth0 payload:', userErr);
                return res.status(500).json({ error: 'Database error resolving authenticated user' });
            }
        }

        // 2. Fallback: Check legacy custom JWT (allows seamless migration while switching)
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            const targetId = decoded?.userId || decoded?.user_id || decoded?.sub;
            if (targetId) {
                const user = await User.findById(targetId);
                if (user) {
                    req.userId = user._id;
                    req.user = user;
                    return next();
                }
            }
        } catch (legacyErr) {
            // Both Auth0 and legacy check failed
        }

        console.error('Auth verification failed:', auth0Err?.message || 'Invalid token');
        return res.status(401).json({ error: 'Token is invalid or expired', details: auth0Err?.message });
    });
};

module.exports = authMiddleware;
