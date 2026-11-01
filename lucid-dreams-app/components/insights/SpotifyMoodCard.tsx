import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Music } from 'lucide-react-native';
import { getSecureItem } from '../../utils/secureStore';
import { BACKEND_URL } from '../../utils/api';
import { SpotifyConnectButton } from '../SpotifyConnect';

interface SpotifyMoodData {
  thisWeek: { valence: number; energy: number };
  lastWeek: { valence: number };
  trend: 'rising' | 'falling' | 'stable';
  connected: boolean;
}

export function SpotifyMoodCard() {
  const [data, setData] = useState<SpotifyMoodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);

  const fetchMoodTrend = async () => {
    setLoading(true);
    try {
      const token = await getSecureItem('authToken');
      const res = await fetch(
        `${BACKEND_URL}/spotify/mood-trend`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (res.status === 403 || res.status === 401) {
        setNotConnected(true);
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setNotConnected(false);
    } catch (err) {
      console.error('Spotify mood trend error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoodTrend();
  }, []);

  const disconnectSpotify = async () => {
    try {
      setLoading(true);
      const token = await getSecureItem('authToken');
      await fetch(`${BACKEND_URL}/spotify/disconnect`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      setData(null);
      setNotConnected(true);
    } catch (e) {
      console.error('Error disconnecting Spotify:', e);
      setData(null);
      setNotConnected(true);
    } finally {
      setLoading(false);
    }
  };

  const TrendIcon = data?.trend === 'rising'
    ? TrendingUp
    : data?.trend === 'falling'
    ? TrendingDown
    : Minus;

  const trendColor = data?.trend === 'rising'
    ? '#06B6D4'
    : data?.trend === 'falling'
    ? '#A598C7'
    : '#8B5CF6';

  const trendLabel = data?.trend === 'rising'
    ? 'Musical positivity trending up this week'
    : data?.trend === 'falling'
    ? 'Listening leaning heavier this week'
    : 'Listening mood holding steady';

  const valencePct = data
    ? Math.round(data.thisWeek.valence * 100)
    : null;

  if (notConnected || (!data && !loading)) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Music size={18} strokeWidth={1.5} color="#8B5CF6" />
          <Text style={styles.title}>Music & Mood</Text>
        </View>
        <Text style={styles.body}>
          Connect Spotify to see how your listening patterns relate
          to your dream themes.
        </Text>
        <SpotifyConnectButton onConnected={fetchMoodTrend} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.card, styles.centered]}>
        <ActivityIndicator color="#8B5CF6" />
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Music size={18} strokeWidth={1.5} color="#8B5CF6" />
        <Text style={styles.title}>Music & Mood</Text>
        <TouchableOpacity onPress={disconnectSpotify} style={styles.disconnectBtn}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
        <View style={[styles.trendPill, { backgroundColor: `${trendColor}22` }]}>
          <TrendIcon size={13} strokeWidth={1.5} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>
            {data.trend}
          </Text>
        </View>
      </View>

      {/* Valence bar */}
      <Text style={styles.label}>Musical positivity this week</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${valencePct ?? 0}%` as `${number}%` }]} />
      </View>
      <Text style={styles.barLabel}>{valencePct}% positive tone</Text>

      <Text style={styles.observation}>{trendLabel}</Text>
      <Text style={styles.disclaimer}>
        Based on your Spotify listening. Not a clinical measure.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(238, 242, 255, 0.8)',
  },
  centered: { alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    color: '#1E1B4B',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  disconnectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  disconnectText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trendText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  label: { color: '#6B7280', fontSize: 12, fontWeight: '500', marginBottom: 8 },
  barTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#1DB954',
    borderRadius: 4,
  },
  barLabel: { color: '#8B5CF6', fontSize: 11, fontWeight: '600', marginBottom: 12 },
  observation: { color: '#1E1B4B', fontSize: 14, lineHeight: 20, fontWeight: '600', marginBottom: 8 },
  body: { color: '#4B5563', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  disclaimer: { color: '#9CA3AF', fontSize: 11, fontStyle: 'italic' },
});
