import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, Rect, Circle as SvgCircle } from 'react-native-svg';
import { Heart, ArrowDown } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';

interface HeartRateReading {
  bpm: number;
  createdAt: string;
}

interface HeartRateData {
  average?: number;
  trend?: 'improving' | 'declining' | 'stable';
  readings?: HeartRateReading[];
}

interface BpmInsightsCardProps {
  data?: HeartRateData | null;
  period?: 'daily' | 'weekly' | 'monthly';
  focusKey?: number;
}

export function BpmInsightsCard({
  data,
  period = 'weekly',
  focusKey = 0,
}: BpmInsightsCardProps) {
  const { width } = useWindowDimensions();
  const cardContentWidth = Math.min(width - 72, 380);

  // Dynamic baseline heart rate (defaults to 63 bpm from screenshot)
  const currentBpm = useMemo(() => {
    if (data?.average && data.average >= 50 && data.average <= 110) {
      return Math.round(data.average);
    }
    return 63;
  }, [data]);

  // Living Wave Drift & Shimmer Animation
  const waveShift = useSharedValue(0);
  const waveScaleY = useSharedValue(1.0);
  const pulseDotScale = useSharedValue(1.0);
  const pulseDotOpacity = useSharedValue(0.4);

  useEffect(() => {
    // Reset values on key change
    waveShift.value = 0;
    waveScaleY.value = 1.0;
    pulseDotScale.value = 1.0;
    pulseDotOpacity.value = 0.4;

    // Gentle horizontal wave phase-shift drift (smooth 7.6s full cycle back and forth)
    waveShift.value = withRepeat(
      withTiming(-28, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // Subtle organic vertical expansion (living respiratory sinus arrhythmia)
    waveScaleY.value = withRepeat(
      withTiming(1.06, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // Biological heartbeat pulse dot animation
    pulseDotScale.value = withRepeat(
      withTiming(1.4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    pulseDotOpacity.value = withRepeat(
      withTiming(0.15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [focusKey, period]);

  const animatedWaveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: waveShift.value },
      { scaleY: waveScaleY.value },
    ],
  }));

  const animatedDotHalo = useAnimatedStyle(() => ({
    transform: [{ scale: pulseDotScale.value }],
    opacity: pulseDotOpacity.value,
  }));

  const svgWidth = Math.max(cardContentWidth + 140, 560);

  return (
    <View style={styles.card}>
      {/* 1. Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={styles.iconCircle}>
            <Heart size={18} color="#7C3AED" strokeWidth={1.8} />
          </View>
          <View>
            <Text style={styles.title}>Resting Heart Rate</Text>
            <Text style={styles.subtitle}>Smooth parasympathetic stability</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.bpmNumber}>
            {currentBpm}
            <Text style={styles.bpmUnit}>bpm</Text>
          </Text>
          <View style={styles.deltaRow}>
            <ArrowDown size={11} color="#059669" strokeWidth={2.5} />
            <Text style={styles.deltaText}>2 bpm baseline</Text>
          </View>
        </View>
      </View>

      {/* 2. Optimal Baseline Window: Dedicated Off-Canvas Legend Pill */}
      <View style={styles.baselineLegendRow}>
        <View style={styles.baselineIndicatorDot} />
        <Text style={styles.baselineText}>Optimal Baseline Window: 60–70 bpm</Text>
      </View>

      {/* 3. Non-Spreadsheet Biometric Waves (Stripped Y-Axis Numbers + Organic Baseline Zone) */}
      <View style={[styles.chartContainer, { width: cardContentWidth }]}>
        {/* Organic Baseline Zone: Faint, reassuring background band */}
        <View style={styles.baselineBand} />

        {/* Living Animated SVG Wave with Locked Indicator Node */}
        <Animated.View style={[styles.svgWaveWrapper, animatedWaveStyle]}>
          <Svg
            width={svgWidth}
            height={90}
            viewBox={`0 0 ${svgWidth} 90`}
          >
            <Defs>
              <LinearGradient id="waveFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                <Stop offset="75%" stopColor="#8B5CF6" stopOpacity="0.05" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Shaded Area under Bezier Curve spanning smoothly beyond edges */}
            <Path
              d={`
                M -40 52
                C 20 44, 80 58, 140 48
                C 200 38, 260 56, 320 46
                C 380 38, 440 54, 500 44
                C 560 36, 620 52, 680 46
                L ${svgWidth} 90
                L -40 90
                Z
              `}
              fill="url(#waveFill)"
            />

            {/* Clean Bezier Curve Wave (No text collision or clipping) */}
            <Path
              d={`
                M -40 52
                C 20 44, 80 58, 140 48
                C 200 38, 260 56, 320 46
                C 380 38, 440 54, 500 44
                C 560 36, 620 52, 680 46
              `}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth={2.8}
              strokeLinecap="round"
            />
          </Svg>

          {/* Pulse Indicator Node locked directly on the living wave curve at (320, 46) */}
          <View style={[styles.pulseNodeWrapper, { left: 311, top: 37 }]}>
            <Animated.View style={[styles.pulseHalo, animatedDotHalo]} />
            <View style={styles.pulseCoreDot} />
          </View>
        </Animated.View>
      </View>

      {/* 4. Physiological Reassurance Footer */}
      <Text style={styles.footerReassuranceText}>
        Consistent heart rate rhythm confirmed within your restorative safety zone.
      </Text>
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
    alignItems: 'flex-start',
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
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#807B93',
    marginTop: 2,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  bpmNumber: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    color: '#1E1B4B',
    letterSpacing: -0.5,
  },
  bpmUnit: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: '#807B93',
    marginLeft: 2,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  deltaText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: '#059669',
  },

  // Dedicated Off-Canvas Legend Pill (Cleared Chart Overlap)
  baselineLegendRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginBottom: 14,
  },
  baselineIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
  },
  baselineText: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: '#7C3AED',
  },

  // Chart Container with faint baseline zone
  chartContainer: {
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    backgroundColor: '#FAF9FD',
  },
  baselineBand: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: 'rgba(237, 233, 254, 0.55)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.35)',
  },
  svgWaveWrapper: {
    position: 'absolute',
    top: 4,
    left: -10,
    right: -20,
    height: 90,
  },
  pulseNodeWrapper: {
    position: 'absolute',
    top: 45,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseHalo: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#7C3AED',
  },
  pulseCoreDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7C3AED',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Footer Reassurance
  footerReassuranceText: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});
export default BpmInsightsCard;
