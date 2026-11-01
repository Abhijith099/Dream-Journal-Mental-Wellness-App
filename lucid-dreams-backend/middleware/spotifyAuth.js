const User = require('../models/User');
const axios = require('axios');

const ensureSpotifyToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .select('spotifyAccessToken spotifyRefreshToken spotifyTokenExpiry');

    if (!user?.spotifyRefreshToken) {
      return res.status(403).json({ error: 'spotify_not_connected' });
    }

    const tokenExpiryTime = user.spotifyTokenExpiry ? new Date(user.spotifyTokenExpiry).getTime() : 0;
    const needsRefresh = !tokenExpiryTime || (Date.now() + 300000 > tokenExpiryTime);

    if (needsRefresh) {
      const credentials = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64');

      const { data } = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: user.spotifyRefreshToken,
        }),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);
      await User.findByIdAndUpdate(req.userId, {
        spotifyAccessToken: data.access_token,
        spotifyTokenExpiry: newExpiry,
        ...(data.refresh_token && {
          spotifyRefreshToken: data.refresh_token,
        }),
      });

      req.spotifyToken = data.access_token;
    } else {
      req.spotifyToken = user.spotifyAccessToken;
    }

    next();
  } catch (err) {
    console.error('Spotify token refresh failed:', err.response?.data || err.message);
    return res.status(401).json({ error: 'spotify_token_refresh_failed' });
  }
};

module.exports = ensureSpotifyToken;
