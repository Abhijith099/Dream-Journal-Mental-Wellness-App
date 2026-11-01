import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Compass } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';

interface AutonomicToneHeroCardProps {
  bpm?: number;
  sleepHours?: number;
  sleepDelta?: string;
  energyStatus?: string;
  focusKey?: number;
}

export default function AutonomicToneHeroCard({
  bpm = 63,
  sleepHours = 7.0,
  sleepDelta = '+1.0h',
  energyStatus = 'Steady & Grounded',
  focusKey = 0,
}: AutonomicToneHeroCardProps) {
  // Parasympathetic 4-7-8 Breathing Pulse Animation (8-second continuous cycle)
  const breathingScale = useSharedValue(1.0);
  const breathingOpacity = useSharedValue(0.45);
  const innerRingScale = useSharedValue(1.0);
  const compassRotate = useSharedValue(0);

  useEffect(() => {
    // Reset to base
    breathingScale.value = 1.0;
    breathingOpacity.value = 0.45;
    innerRingScale.value = 1.0;
    compassRotate.value = 0;

    // 4000ms expansion (inhale to 1.08), 4000ms contraction (exhale to 1.0) = 8s smooth cycle
    breathingScale.value = withRepeat(
      withTiming(1.08, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    breathingOpacity.value = withRepeat(
      withTiming(0.85, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    innerRingScale.value = withRepeat(
      withTiming(1.04, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // Subtle, calming compass equilibrium drift (+/- 6 degrees)
    compassRotate.value = withRepeat(
      withTiming(6, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [focusKey]);

  const animatedBreathingRing = useAnimatedStyle(() => ({
    transform: [{ scale: breathingScale.value }],
    opacity: breathingOpacity.value,
  }));

  const animatedInnerRing = useAnimatedStyle(() => ({
    transform: [{ scale: innerRingScale.value }],
  }));

  const animatedCompass = useAnimatedStyle(() => ({
    transform: [{ rotate: `${compassRotate.value}deg` }],
  }));

  return (
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.toneDot} />
          <Text style={styles.title}>AUTONOMIC TONE</Text>
        </View>
        <View style={styles.stateBadge}>
          <Text style={styles.stateBadgeText}>Rest & Digest</Text>
        </View>
      </View>

      {/* Hero Equilibrium Breathing Circle */}
      <View style={styles.heroCircleWrapper}>
        {/* Outer ambient breathing ring (4-7-8 pace co-regulation) */}
        <Animated.View style={[styles.outerBreathingRing, animatedBreathingRing]} />

        {/* Mid subtle glowing halo */}
        <Animated.View style={[styles.midBreathingRing, animatedInnerRing]} />

        {/* Center Sanctuary Circle */}
        <View style={styles.centerCircle}>
          {/* Compass Icon (Stabilizing Somatic Symbol, Replaced Clock) */}
          <Animated.View style={[styles.compassCircle, animatedCompass]}>
            <Compass size={18} color="#7C3AED" strokeWidth={2.0} />
          </Animated.View>

          {/* Centered Equilibrium Heading */}
          <Text style={styles.equilibriumTitle}>Equilibrium</Text>
          <Text style={styles.vagalSubtext}>Vagal Balance • Optimal</Text>
        </View>
      </View>

      {/* Reassuring Physiological Synthesis */}
      <Text style={styles.synthesisText}>
        Your lower resting heart rate (<Text style={styles.synthesisBpm}>{bpm} bpm</Text>) and steady
        sleep indicate your parasympathetic nervous system is actively buffering daytime stress.
      </Text>

      {/* Somatic Indicators Row */}
      <View style={styles.somaticIndicatorsRow}>
        <View style={styles.indicatorItem}>
          <View style={styles.indicatorDot} />
          <Text style={styles.indicatorText}>
            Sleep: <Text style={styles.indicatorBold}>{sleepHours.toFixed(1)}h</Text> ({sleepDelta})
          </Text>
        </View>

        <View style={styles.indicatorItem}>
          <View style={styles.indicatorDot} />
          <Text style={styles.indicatorText}>
            Energy: <Text style={styles.indicatorBold}>{energyStatus}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EBE6F3',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: '#3A2E5B',
    letterSpacing: 0.8,
  },
  stateBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  stateBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#7C3AED',
    letterSpacing: 0.2,
  },

  // Breathing Circle Container
  heroCircleWrapper: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    position: 'relative',
  },
  outerBreathingRing: {
    position: 'absolute',
    width: 166,
    height: 166,
    borderRadius: 83,
    borderWidth: 2,
    borderColor: '#DDD6FE',
    backgroundColor: 'rgba(237, 233, 254, 0.45)',
  },
  midBreathingRing: {
    position: 'absolute',
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    backgroundColor: 'rgba(245, 243, 255, 0.6)',
  },
  centerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  compassCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  equilibriumTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: '#1E1B4B',
    letterSpacing: -0.2,
  },
  vagalSubtext: {
    fontFamily: Fonts.medium,
    fontSize: 9.5,
    color: '#7C3AED',
    marginTop: 2,
  },

  // Synthesis Text
  synthesisText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  synthesisBpm: {
    fontFamily: Fonts.bold,
    color: '#7C3AED',
  },

  // Somatic Indicators Row
  somaticIndicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F3FF',
    width: '100%',
  },
  indicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
  },
  indicatorText: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: '#6B7280',
  },
  indicatorBold: {
    fontFamily: Fonts.semiBold,
    color: '#1E1B4B',
  },
});
