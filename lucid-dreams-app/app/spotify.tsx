import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import { BACKEND_URL, authenticatedFetch } from '../utils/api';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '3cf653d64bd6469988274c328d606b4b';
const REDIRECT_URI = makeRedirectUri({
    scheme: 'luciddreamsapp',
    path: 'insights',
});

export default function SpotifyConnectScreen() {
    const [request, response, promptAsync] = useAuthRequest(
        {
            clientId: SPOTIFY_CLIENT_ID,
            scopes: ['user-read-recently-played', 'user-top-read', 'playlist-read-private'],
            usePKCE: false,
            redirectUri: REDIRECT_URI,
        },
        discovery
    );

    // Add `: string` to fix the implicit 'any' error
    const sendCodeToBackend = async (authCode: string) => {
        try {
            const res = await authenticatedFetch(`${BACKEND_URL}/spotify/callback`, {
                method: 'POST',
                body: JSON.stringify({
                    code: authCode,
                    redirectUri: REDIRECT_URI,
                }),
            });

            if (!res.ok) {
                throw new Error('Failed to exchange Spotify code');
            }

            Alert.alert('Success', 'Spotify connected successfully!');
        } catch (error) {
            console.error('Error exchanging Spotify code:', error);
            Alert.alert('Error', 'Failed to connect Spotify.');
        }
    };

    useEffect(() => {
        if (response?.type === 'success') {
            const { code } = response.params;
            console.log("SUCCESS! Authorization Code:", code);

            if (code) {
                sendCodeToBackend(code);
            }
        }
    }, [response]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Algorithmic Music Therapy</Text>
            <Text style={styles.subtitle}>
                Connect your Spotify account to map your listening habits against your anxiety baseline.
            </Text>

            <TouchableOpacity
                style={styles.spotifyButton}
                disabled={!request}
                onPress={() => promptAsync()}
            >
                <Text style={styles.buttonText}>Connect Spotify</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F8F9FA' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#333' },
    subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#666' },
    spotifyButton: { backgroundColor: '#1DB954', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
