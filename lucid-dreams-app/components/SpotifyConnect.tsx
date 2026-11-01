import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getSecureItem } from '../utils/secureStore';
import { BACKEND_URL } from '../utils/api';

WebBrowser.maybeCompleteAuthSession();

const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '3cf653d64bd6469988274c328d606b4b';
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'luciddreamsapp',
  path: 'insights',
});
const SCOPES = [
  'user-read-recently-played',
  'user-top-read',
  'playlist-read-private',
  'user-read-email',
  'user-read-private',
].join(' ');

export function SpotifyConnectButton({
  onConnected,
}: {
  onConnected: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    setLoading(true);
    try {
      // RFC 7636 compliant PKCE challenge (64 characters)
      const verifier = (Crypto.randomUUID() + Crypto.randomUUID()).replace(/-/g, '');
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        verifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      const challenge = digest
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const authUrl =
        `https://accounts.spotify.com/authorize` +
        `?client_id=${SPOTIFY_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=${encodeURIComponent(SCOPES)}` +
        `&code_challenge_method=S256` +
        `&code_challenge=${challenge}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

      // Handle user cancellation or closing the modal gracefully without a RedBox error
      if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('[SpotifyConnect] Auth modal dismissed by user');
        return;
      }

      if (result.type !== 'success' || !result.url) {
        console.warn('[SpotifyConnect] Auth did not succeed:', result);
        Alert.alert('Spotify', 'Authorization could not be completed.');
        return;
      }

      // Check if Spotify returned an error in the callback URL (e.g. access_denied)
      if (result.url.includes('error=')) {
        const errMatch = result.url.match(/[?&]error=([^&#]+)/);
        const errDesc = result.url.match(/[?&]error_description=([^&#]+)/);
        const errMsg = errDesc ? decodeURIComponent(errDesc[1]) : (errMatch ? decodeURIComponent(errMatch[1]) : 'Access denied');
        console.warn('[SpotifyConnect] Spotify returned authorization error:', errMsg);
        Alert.alert('Spotify Authorization', errMsg === 'access_denied' ? 'Spotify access was denied.' : errMsg);
        return;
      }

      // Extract authorization code from callback url
      const codeMatch = result.url.match(/[?&]code=([^&#]+)/);
      const code = codeMatch ? decodeURIComponent(codeMatch[1]) : null;

      if (!code) {
        throw new Error('No authorization code found in redirect URL');
      }

      // Send code + verifier to backend
      const appToken = await getSecureItem('authToken');
      const response = await fetch(
        `${BACKEND_URL}/spotify/connect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(appToken ? { Authorization: `Bearer ${appToken}` } : {}),
          },
          body: JSON.stringify({
            code,
            codeVerifier: verifier,
            redirectUri: REDIRECT_URI,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('[SpotifyConnect] Backend connect failed:', response.status, errorData);
        const errorMsg = errorData?.details?.error_description || errorData?.details || errorData?.error || 'Failed to exchange credentials with backend';
        Alert.alert('Spotify Connection Error', String(errorMsg));
        return;
      }

      Alert.alert('Connected', 'Spotify account connected successfully!');
      onConnected();
    } catch (err: any) {
      console.error('Spotify connect error:', err?.message || err);
      Alert.alert('Spotify Error', err?.message || 'An error occurred while connecting Spotify.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={connect} disabled={loading}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>Connect Spotify</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1DB954', // Spotify green
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
