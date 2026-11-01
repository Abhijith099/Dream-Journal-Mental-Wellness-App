import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Music, CheckCircle, AlertCircle } from 'lucide-react-native';
import { BACKEND_URL } from '../utils/api';
import { getSecureItem } from '../utils/secureStore';
import { Fonts } from '../constants/theme';

// Complete auth session if openAuthSessionAsync is waiting in SpotifyConnect
WebBrowser.maybeCompleteAuthSession();

export default function SpotifyCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Synchronizing Spotify with Lucid Dreams...');
  const handledRef = useRef(false);

  useEffect(() => {
    // 1. Immediately complete active in-app browser auth session if open
    WebBrowser.maybeCompleteAuthSession();

    if (handledRef.current) return;

    // 2. Handle Spotify authorization denial or error
    if (params.error) {
      handledRef.current = true;
      setStatus('error');
      setMessage(params.error_description || 'Spotify access was not granted.');
      setTimeout(() => {
        router.replace('/(tabs)/insights');
      }, 2000);
      return;
    }

    // 3. Fallback direct exchange if SpotifyConnect was unmounted by navigation
    if (params.code) {
      handledRef.current = true;
      exchangeCode(params.code);
    } else {
      // Returned with no code, redirect smoothly to insights
      const timer = setTimeout(() => {
        router.replace('/(tabs)/insights');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [params.code, params.error]);

  const exchangeCode = async (code: string) => {
    try {
      setStatus('processing');
      setMessage('Linking your musical insights...');

      const appToken = await getSecureItem('authToken');
      const response = await fetch(`${BACKEND_URL}/spotify/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(appToken ? { Authorization: `Bearer ${appToken}` } : {}),
        },
        body: JSON.stringify({
          code,
          redirectUri: 'luciddreamsapp://callback',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.warn('[Spotify Callback] Exchange warning:', response.status, errorData);
      }

      setStatus('success');
      setMessage('Connected! Returning to Insights...');
      setTimeout(() => {
        router.replace('/(tabs)/insights');
      }, 1200);
    } catch (err: any) {
      console.warn('[Spotify Callback] Fallback exchange error:', err?.message || err);
      router.replace('/(tabs)/insights');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          {status === 'processing' && (
            <View style={styles.iconCircle}>
              <Music size={32} strokeWidth={1.5} color="#1DB954" />
            </View>
          )}
          {status === 'success' && (
            <View style={[styles.iconCircle, styles.successCircle]}>
              <CheckCircle size={32} strokeWidth={1.5} color="#10B981" />
            </View>
          )}
          {status === 'error' && (
            <View style={[styles.iconCircle, styles.errorCircle]}>
              <AlertCircle size={32} strokeWidth={1.5} color="#EF4444" />
            </View>
          )}
        </View>

        <Text style={styles.title}>Spotify Integration</Text>
        <Text style={styles.subtitle}>{message}</Text>

        {status === 'processing' && (
          <ActivityIndicator size="small" color="#1DB954" style={styles.loader} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0EBF7',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircle: {
    backgroundColor: '#ECFDF5',
  },
  errorCircle: {
    backgroundColor: '#FEF2F2',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: '#1E1B4B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loader: {
    marginTop: 20,
  },
});
