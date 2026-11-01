import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Activity } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';

interface DigitalRhythmData {
  hasData?: boolean;
  averageWPM?: number | null;
  gaugePosition?: number; // 0.0 to 1.0
  insight?: string | null;
}

interface DigitalRhythmCardProps {
  data?: DigitalRhythmData | null;
  focusKey?: number;
}

export default function DigitalRhythmCard({
  data,
  focusKey = 0,
}: DigitalRhythmCardProps) {
  // Determine cadence stop: 0 = Deliberate & Measured, 1 = Fluid, 2 = Urgent
  const position = data?.gaugePosition ?? 0.15; // default to deliberate & measured
  const defaultIndex = position <= 0.35 ? 0 : position <= 0.68 ? 1 : 2;
  const [selectedCadence, setSelectedCadence] = useState<number>(defaultIndex);
  const [trackWidth, setTrackWidth] = useState<number>(0);

  useEffect(() => {
    setSelectedCadence(defaultIndex);
  }, [defaultIndex, focusKey]);

  // Discrete indicator spring position
  const activeXProgress = useSharedValue(defaultIndex);
  const breathingHaloScale = useSharedValue(1.0);
  const breathingHaloOpacity = useSharedValue(0.4);
  const iconPulse = useSharedValue(1.0);

  useEffect(() => {
    activeXProgress.value = withSpring(selectedCadence, {
      damping: 18,
      stiffness: 120,
    });

    // Breathing glow animation around active cadence node (smooth continuous cycle)
    breathingHaloScale.value = 1.0;
    breathingHaloScale.value = withRepeat(
      withTiming(1.45, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    breathingHaloOpacity.value = 0.45;
    breathingHaloOpacity.value = withRepeat(
      withTiming(0.12, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // Subtle cadence pulse for Feather Activity icon
    iconPulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 240, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 240, easing: Easing.in(Easing.ease) }),
        withDelay(2200, withTiming(1.0, { duration: 50 }))
      ),
      -1,
      false
    );
  }, [selectedCadence, focusKey]);

  const animatedHaloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingHaloScale.value }],
    opacity: breathingHaloOpacity.value,
  }));

  const animatedThumbStyle = useAnimatedStyle(() => {
    const maxX = Math.max(0, trackWidth - 24);
    const x = interpolate(
      activeXProgress.value,
      [0, 1, 2],
      [0, maxX / 2, maxX]
    );
    return {
      transform: [{ translateX: x }],
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconPulse.value }],
  }));

  const cadenceText =
    data?.insight ||
    'Your typing cadence yesterday reflected quiet, deliberate pacing — a natural rhythm mirroring restorative cognitive pacing.';

  return (
    <View style={styles.card}>
      {/* 1. Header Row (Feather Activity Polyline with Cadence Micro-Pulse) */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Animated.View style={[styles.iconCircle, animatedIconStyle]}>
            <Activity size={18} color="#7C3AED" strokeWidth={1.8} />
          </Animated.View>
          <Text style={styles.title}>Digital Rhythm</Text>
        </View>

        <View style={styles.cadenceBadge}>
          <Text style={styles.cadenceBadgeText}>Measured Cadence</Text>
        </View>
      </View>

      {/* 2. Discrete Cadence Indicator (Smooth Spring Physics Track) */}
      <View style={styles.meterContainer}>
        {/* Track Line connecting the 3 discrete nodes */}
        <View style={styles.trackLine} />

        {/* Nodes Track Row with Floating Spring Thumb */}
        <View
          style={styles.nodesRow}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) setTrackWidth(w);
          }}
        >
          {/* Subtle Fixed Stops */}
          <TouchableOpacity
            style={styles.nodeStopWrapper}
            onPress={() => setSelectedCadence(0)}
            activeOpacity={0.7}
          >
            <View style={styles.inactiveDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nodeStopWrapper}
            onPress={() => setSelectedCadence(1)}
            activeOpacity={0.7}
          >
            <View style={styles.inactiveDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nodeStopWrapper}
            onPress={() => setSelectedCadence(2)}
            activeOpacity={0.7}
          >
            <View style={styles.inactiveDot} />
          </TouchableOpacity>

          {/* Active Spring Indicator Thumb that glides over stops */}
          {trackWidth > 0 && (
            <Animated.View
              style={[styles.floatingActiveThumb, animatedThumbStyle]}
              pointerEvents="none"
            >
              <Animated.View style={[styles.activeHalo, animatedHaloStyle]} />
              <View style={styles.activeCoreDot} />
            </Animated.View>
          )}
        </View>

        {/* Discrete Node Labels */}
        <View style={styles.labelsRow}>
          <TouchableOpacity onPress={() => setSelectedCadence(0)} activeOpacity={0.7}>
            <Text
              style={[
                styles.labelText,
                styles.labelLeft,
                selectedCadence === 0 && styles.labelActive,
              ]}
            >
              Deliberate & Measured
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setSelectedCadence(1)} activeOpacity={0.7}>
            <Text
              style={[
                styles.labelText,
                styles.labelCenter,
                selectedCadence === 1 && styles.labelActive,
              ]}
            >
              Fluid
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setSelectedCadence(2)} activeOpacity={0.7}>
            <Text
              style={[
                styles.labelText,
                styles.labelRight,
                selectedCadence === 2 && styles.labelActive,
              ]}
            >
              Urgent
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Reassuring Cadence Synthesis */}
      <Text style={styles.cadenceSynthesisText}>{cadenceText}</Text>
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
    marginBottom: 20,
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
  cadenceBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  cadenceBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#7C3AED',
  },

  // Discrete Cadence Indicator
  meterContainer: {
    marginVertical: 10,
    paddingHorizontal: 14,
  },
  trackLine: {
    position: 'absolute',
    top: 10,
    left: 24,
    right: 24,
    height: 4,
    backgroundColor: '#EBE6F3',
    borderRadius: 2,
  },
  nodesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 24,
  },
  nodeStopWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingActiveThumb: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  activeNodeContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeHalo: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
  },
  activeCoreDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#7C3AED',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DDD6FE',
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  labelText: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: '#9CA3AF',
  },
  labelLeft: {
    textAlign: 'left',
  },
  labelCenter: {
    textAlign: 'center',
  },
  labelRight: {
    textAlign: 'right',
  },
  labelActive: {
    fontFamily: Fonts.bold,
    color: '#1E1B4B',
  },

  // Synthesis Text
  cadenceSynthesisText: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: '#6B7280',
    lineHeight: 19,
    marginTop: 16,
    paddingHorizontal: 4,
  },
});
