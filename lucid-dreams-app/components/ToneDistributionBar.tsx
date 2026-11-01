import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Layers, Music2 } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';

export interface ToneDistributionData {
  peace: number;
  anxiety: number;
  surreal: number;
}

interface ToneDistributionBarProps {
  data?: ToneDistributionData;
  summaryText?: string;
  spotifyMoodText?: string;
  spotifyTranquilPct?: number;
  focusKey?: number;
}

export default function ToneDistributionBar({
  data = { peace: 48, anxiety: 35, surreal: 17 },
  summaryText,
  spotifyMoodText = 'Holding steady across playlists',
  spotifyTranquilPct = 65,
  focusKey = 0,
}: ToneDistributionBarProps) {
  const { peace, anxiety, surreal } = data;
  const total = peace + anxiety + surreal;

  // Normalize to 100%
  const peacePct = total > 0 ? Math.round((peace / total) * 100) : 48;
  const processingPct = total > 0 ? Math.round((anxiety / total) * 100) : 35;
  const surrealPct = total > 0 ? Math.max(0, 100 - peacePct - processingPct) : 17;

  // Reanimated progress (0% -> 100%) on mount/focus
  const animProgress = useSharedValue(0);
  const legendOpacity = useSharedValue(0);
  const musicPulse = useSharedValue(1.0);

  useEffect(() => {
    animProgress.value = 0;
    legendOpacity.value = 0;

    animProgress.value = withTiming(1, {
      duration: 850,
      easing: Easing.out(Easing.cubic),
    });

    legendOpacity.value = withDelay(
      350,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) })
    );

    musicPulse.value = withRepeat(
      withSequence(
        withTiming(1.14, { duration: 250, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 250, easing: Easing.in(Easing.ease) }),
        withDelay(2400, withTiming(1.0, { duration: 50 }))
      ),
      -1,
      false
    );
  }, [focusKey, peacePct, processingPct, surrealPct]);

  const barAnimStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, animProgress.value * 100))}%`,
  }));

  const legendAnimStyle = useAnimatedStyle(() => ({
    opacity: legendOpacity.value,
  }));

  const musicAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: musicPulse.value }],
  }));

  return (
    <View style={styles.card}>
      {/* 1. Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={styles.iconCircle}>
            <Layers size={18} color="#7C3AED" strokeWidth={1.8} />
          </View>
          <Text style={styles.title}>Subconscious Tone</Text>
        </View>

        <View style={styles.analysisBadge}>
          <Text style={styles.analysisBadgeText}>Dream analysis</Text>
        </View>
      </View>

      {/* 2. Monochromatic Violet Stacked Bar (Smooth Left-to-Right Reveal) */}
      <View style={styles.stackedBarTrack}>
        <Animated.View style={[styles.stackedBarFill, barAnimStyle]}>
          {peacePct > 0 && (
            <View
              style={[
                styles.barSegment,
                styles.peaceSegment,
                { flex: peacePct },
              ]}
            />
          )}

          {processingPct > 0 && (
            <View
              style={[
                styles.barSegment,
                styles.processingSegment,
                { flex: processingPct },
              ]}
            />
          )}

          {surrealPct > 0 && (
            <View
              style={[
                styles.barSegment,
                styles.surrealSegment,
                { flex: surrealPct },
              ]}
            />
          )}
        </Animated.View>
      </View>

      {/* 3. Monochromatic Violet Legend Row (Soft Fade Reveal) */}
      <Animated.View style={[styles.legendRow, legendAnimStyle]}>
        {/* Deep Royal Violet: Peace */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#7C3AED' }]} />
          <Text style={styles.legendText}>
            <Text style={styles.legendBold}>{peacePct}%</Text> Peace
          </Text>
        </View>

        {/* Soft Lavender: Processing */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#A78BFA' }]} />
          <Text style={styles.legendText}>
            <Text style={styles.legendBold}>{processingPct}%</Text> Processing
          </Text>
        </View>

        {/* Whispering Lilac: Surreal */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#DDD6FE' }]} />
          <Text style={styles.legendText}>
            <Text style={styles.legendBold}>{surrealPct}%</Text> Surreal
          </Text>
        </View>
      </Animated.View>

      {/* 4. Crisp 1px Boundary & Inset Secondary Card for Spotify Integration */}
      <View style={styles.spotifyPartition}>
        <View style={styles.spotifyInsetCard}>
          <View style={styles.spotifyLeftRow}>
            <Animated.View style={[styles.spotifyIconCircle, musicAnimStyle]}>
              <Music2 size={16} color="#7C3AED" strokeWidth={2.0} />
            </Animated.View>
            <View>
              <Text style={styles.spotifyTitle}>Spotify Listening Mood</Text>
              <Text style={styles.spotifySubtitle}>{spotifyMoodText}</Text>
            </View>
          </View>

          <View style={styles.tranquilBadge}>
            <Text style={styles.tranquilBadgeText}>{spotifyTranquilPct}% tranquil</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#EBE6F3',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#1E1B4B',
  },
  analysisBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  analysisBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#7C3AED',
  },

  // Monochromatic Violet Stacked Bar
  stackedBarTrack: {
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
    overflow: 'hidden',
    width: '100%',
  },
  stackedBarFill: {
    height: '100%',
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  peaceSegment: {
    backgroundColor: '#7C3AED', // Deep Royal Violet
  },
  processingSegment: {
    backgroundColor: '#A78BFA', // Soft Lavender
  },
  surrealSegment: {
    backgroundColor: '#DDD6FE', // Whispering Lilac
  },

  // Legend Row
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#6B7280',
  },
  legendBold: {
    fontFamily: Fonts.bold,
    color: '#1E1B4B',
  },

  // Spotify Crisp 1px Boundary & Inset Card
  spotifyPartition: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F0F8',
  },
  spotifyInsetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8FD',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F0EBFA',
  },
  spotifyLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  spotifyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotifyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: '#1E1B4B',
  },
  spotifySubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 10.5,
    color: '#807B93',
    marginTop: 1,
  },
  tranquilBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  tranquilBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#7C3AED',
  },
});
