const express = require('express');
const router = express.Router();
const axios = require('axios');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const ensureSpotifyToken = require('../middleware/spotifyAuth');

// Optional auth helper: if client sends Bearer token, attempt to attach req.user / req.userId without blocking unauthenticated requests
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    try {
        // 1. Try legacy custom JWT first
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            if (decoded && decoded.userId) {
                const user = await User.findById(decoded.userId);
                if (user) {
                    req.userId = user._id;
                    req.user = user;
                    return next();
                }
            }
        } catch (_) {}

        // 2. Try decoding JWT payload to find Auth0 user by sub or email
        const decoded = jwt.decode(token);
        if (decoded && (decoded.sub || decoded.email)) {
            let user = null;
            if (decoded.sub) {
                user = await User.findOne({ auth0Id: decoded.sub });
            }
            if (!user && (decoded.email || decoded['https://luciddreams.app/email'])) {
                const email = decoded.email || decoded['https://luciddreams.app/email'];
                user = await User.findOne({ email });
            }
            if (user) {
                req.userId = user._id;
                req.user = user;
                return next();
            }
        }
    } catch (err) {
        console.warn('[Spotify optionalAuth] Error resolving user:', err.message);
    }

    console.log('[Spotify optionalAuth] Bearer token not valid or expired; proceeding without linked user');
    next();
};

// ==========================================
// ROUTE 1: SPOTIFY CONNECT / CALLBACK
// ==========================================
const handleConnect = async (req, res) => {
    const { code, codeVerifier, redirectUri } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    try {
        const targetRedirectUri = redirectUri || process.env.SPOTIFY_REDIRECT_URI || 'luciddreamsapp://insights';
        console.log(`[Spotify Connect] Exchanging code with redirect_uri: "${targetRedirectUri}" (PKCE: ${!!codeVerifier})`);

        const tokenParams = {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: targetRedirectUri,
            client_id: process.env.SPOTIFY_CLIENT_ID,
        };

        // Support PKCE if codeVerifier was provided
        if (codeVerifier) {
            tokenParams.code_verifier = codeVerifier;
        }

        const tokenResponse = await axios.post(
            'https://accounts.spotify.com/api/token',
            querystring.stringify(tokenParams),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization:
                        'Basic ' +
                        Buffer.from(
                            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
                        ).toString('base64'),
                },
            }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // 1. Get the user's profile info from Spotify
        let spotifyProfile = { id: 'unknown_spotify_user' };
        try {
            const profileResponse = await axios.get('https://api.spotify.com/v1/me', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            spotifyProfile = profileResponse.data;
        } catch (profErr) {
            console.warn('[Spotify Connect] Could not fetch /v1/me:', profErr.message);
        }

        // 2. Calculate exactly when the token expires
        const expireDate = new Date(Date.now() + (expires_in || 3600) * 1000);

        // 3. Save the tokens to MongoDB (link to authenticated user if available, otherwise by spotifyId)
        let user = null;
        if (req.userId || req.user?._id) {
            user = await User.findByIdAndUpdate(
                req.userId || req.user._id,
                {
                    spotifyId: spotifyProfile.id,
                    spotifyAccessToken: access_token,
                    spotifyRefreshToken: refresh_token,
                    spotifyTokenExpiry: expireDate,
                },
                { returnDocument: 'after' }
            );
        }

        if (!user) {
            const safeEmail = spotifyProfile.email || `${spotifyProfile.id}@spotify.luciddreams.app`;
            const safeName = spotifyProfile.display_name || spotifyProfile.id || 'Spotify Explorer';
            user = await User.findOneAndUpdate(
                { spotifyId: spotifyProfile.id },
                {
                    $set: {
                        name: safeName,
                        email: safeEmail,
                        spotifyId: spotifyProfile.id,
                        spotifyAccessToken: access_token,
                        spotifyRefreshToken: refresh_token,
                        spotifyTokenExpiry: expireDate,
                    }
                },
                { returnDocument: 'after', upsert: true }
            );
        }

        console.log("Successfully saved Spotify user to MongoDB:", user?._id);

        return res.json({
            success: true,
            accessToken: access_token,
            expiresIn: expires_in,
        });
    } catch (error) {
        console.error('Spotify token exchange failed:', error.response?.data || error.message);
        return res.status(500).json({
            error: 'Token exchange failed',
            details: error.response?.data || error.message
        });
    }
};

// Handles both /connect and /callback
router.post('/connect', optionalAuth, handleConnect);
router.post('/callback', optionalAuth, handleConnect);


// ==========================================
// ROUTE 2: FETCH PLAYLISTS
// ==========================================
router.get('/playlists', requireAuth, ensureSpotifyToken, async (req, res) => {
    try {
        const playlistsResponse = await axios.get('https://api.spotify.com/v1/me/playlists', {
            headers: { Authorization: `Bearer ${req.spotifyToken}` }
        });

        // Save playlists to MongoDB cache
        await User.findByIdAndUpdate(req.userId, {
            spotifyPlaylists: playlistsResponse.data.items || []
        });

        return res.json({
            success: true,
            playlists: playlistsResponse.data.items || []
        });
    } catch (error) {
        console.error('Error fetching playlists:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});


// ==========================================
// ROUTE 3: MOOD TREND (Insights)
// ==========================================
// ==========================================
// ROUTE 3: MOOD TREND (Insights)
// ==========================================
router.get('/mood-trend', requireAuth, ensureSpotifyToken, async (req, res) => {
    try {
        let items = [];

        // 1. Attempt to fetch recently played tracks
        try {
            const recentResponse = await axios.get(
                'https://api.spotify.com/v1/me/player/recently-played?limit=50',
                { headers: { Authorization: `Bearer ${req.spotifyToken}` } }
            );
            if (recentResponse && recentResponse.data && Array.isArray(recentResponse.data.items)) {
                items = recentResponse.data.items.filter(item => item && item.track);
            }
        } catch (recentErr) {
            console.warn('[Spotify mood-trend] Recently played fetch warning:', recentErr.response?.data?.error?.message || recentErr.message);
        }

        // 2. If recently-played is empty or restricted, fallback to user top tracks
        if (items.length === 0) {
            try {
                const topResponse = await axios.get(
                    'https://api.spotify.com/v1/me/top/tracks?limit=20',
                    { headers: { Authorization: `Bearer ${req.spotifyToken}` } }
                );
                if (topResponse && topResponse.data && Array.isArray(topResponse.data.items)) {
                    items = topResponse.data.items
                        .filter(Boolean)
                        .map(track => ({ track, played_at: new Date().toISOString() }));
                }
            } catch (topErr) {
                console.warn('[Spotify mood-trend] Top tracks fallback warning:', topErr.response?.data?.error?.message || topErr.message);
            }
        }

        // 3. If still empty (new account, no listening history), return friendly 200 default
        if (items.length === 0) {
            return res.json({
                thisWeek: { valence: 0.65, energy: 0.60 },
                lastWeek: { valence: 0.62 },
                trend: 'stable',
                connected: true,
                message: 'No recent listening data found yet. Play some tracks on Spotify to personalize your mood trend!'
            });
        }

        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

        const thisWeekTracks = [];
        const lastWeekTracks = [];

        items.forEach((item) => {
            if (!item || !item.track) return;
            const playedAt = item.played_at ? new Date(item.played_at).getTime() : Date.now();
            if (playedAt >= oneWeekAgo) {
                thisWeekTracks.push(item.track);
            } else if (playedAt >= twoWeeksAgo) {
                lastWeekTracks.push(item.track);
            } else {
                lastWeekTracks.push(item.track);
            }
        });

        // If all tracks are from this week, split the list to compare earlier vs later
        const effectiveThisWeek = thisWeekTracks.length > 0
            ? thisWeekTracks
            : items.slice(0, Math.ceil(items.length / 2)).map(i => i.track).filter(Boolean);
        const effectiveLastWeek = lastWeekTracks.length > 0
            ? lastWeekTracks
            : items.slice(Math.ceil(items.length / 2)).map(i => i.track).filter(Boolean);

        // 4. Try fetching audio features for tracks
        let hasAudioFeatures = false;
        let thisWeekValence = 0.65;
        let thisWeekEnergy = 0.60;
        let lastWeekValence = 0.60;

        const uniqueTrackIds = [...new Set(items.map(i => i.track?.id).filter(Boolean))].slice(0, 50);

        try {
            if (uniqueTrackIds.length > 0) {
                const featuresRes = await axios.get(
                    `https://api.spotify.com/v1/audio-features?ids=${uniqueTrackIds.join(',')}`,
                    { headers: { Authorization: `Bearer ${req.spotifyToken}` } }
                );

                const featuresMap = new Map();
                (featuresRes.data?.audio_features || []).forEach(f => {
                    if (f && f.id) featuresMap.set(f.id, f);
                });

                if (featuresMap.size > 0) {
                    hasAudioFeatures = true;

                    // Calculate this week averages
                    const thisWeekVals = effectiveThisWeek.map(t => featuresMap.get(t?.id)).filter(Boolean);
                    if (thisWeekVals.length > 0) {
                        thisWeekValence = thisWeekVals.reduce((acc, f) => acc + (f.valence ?? 0.5), 0) / thisWeekVals.length;
                        thisWeekEnergy = thisWeekVals.reduce((acc, f) => acc + (f.energy ?? 0.5), 0) / thisWeekVals.length;
                    }

                    // Calculate last week averages
                    const lastWeekVals = effectiveLastWeek.map(t => featuresMap.get(t?.id)).filter(Boolean);
                    if (lastWeekVals.length > 0) {
                        lastWeekValence = lastWeekVals.reduce((acc, f) => acc + (f.valence ?? 0.5), 0) / lastWeekVals.length;
                    } else {
                        lastWeekValence = thisWeekValence;
                    }
                }
            }
        } catch (featuresErr) {
            console.warn('Spotify /audio-features endpoint restricted or failed, falling back to track popularity:', featuresErr.message);
        }

        // 5. Fallback if /audio-features was restricted (403 as of Spotify API changes)
        if (!hasAudioFeatures) {
            const getAvgPopularity = (tracks) => {
                if (!tracks || !tracks.length) return 50;
                return tracks.reduce((sum, t) => sum + (t?.popularity ?? 50), 0) / tracks.length;
            };

            const thisWeekPop = getAvgPopularity(effectiveThisWeek);
            const lastWeekPop = getAvgPopularity(effectiveLastWeek);

            thisWeekEnergy = Math.min(1, Math.max(0.1, thisWeekPop / 100));
            thisWeekValence = Math.min(1, Math.max(0.1, 0.5 + (thisWeekPop - 50) / 200));
            lastWeekValence = Math.min(1, Math.max(0.1, 0.5 + (lastWeekPop - 50) / 200));
        }

        // Determine trend: 'rising' | 'falling' | 'stable'
        const diff = thisWeekValence - lastWeekValence;
        let trend = 'stable';
        if (diff >= 0.04) {
            trend = 'rising';
        } else if (diff <= -0.04) {
            trend = 'falling';
        }

        return res.json({
            thisWeek: {
                valence: Math.round(thisWeekValence * 100) / 100,
                energy: Math.round(thisWeekEnergy * 100) / 100,
            },
            lastWeek: {
                valence: Math.round(lastWeekValence * 100) / 100,
            },
            trend,
            connected: true,
        });

    } catch (error) {
        console.error('Error calculating Spotify mood trend:', error.response?.data || error.message);
        // Fail gracefully with healthy baseline instead of crashing the UI
        return res.json({
            thisWeek: { valence: 0.65, energy: 0.60 },
            lastWeek: { valence: 0.60 },
            trend: 'stable',
            connected: true,
            message: 'Spotify connected. Gathering listening trends...'
        });
    }
});

// ==========================================
// ROUTE 4: DISCONNECT SPOTIFY
// ==========================================
router.post('/disconnect', requireAuth, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.userId, {
            $unset: {
                spotifyId: 1,
                spotifyAccessToken: 1,
                spotifyRefreshToken: 1,
                spotifyTokenExpiry: 1,
                spotifyPlaylists: 1,
            }
        });
        return res.json({ success: true, message: 'Spotify disconnected successfully' });
    } catch (err) {
        console.error('Spotify disconnect error:', err);
        return res.status(500).json({ error: 'Failed to disconnect Spotify' });
    }
});

module.exports = router;