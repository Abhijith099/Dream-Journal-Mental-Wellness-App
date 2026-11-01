import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {
  CircleDot,
  RotateCcw,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Fonts } from '@/constants/theme';
import { authenticatedFetch as fetch, BACKEND_URL } from '@/utils/api';

const PRACTICES = [
  'Take one slow, conscious exhalation to release vagal tension. Allow shoulders to drop naturally.',
  'Find a glass of cool water and take a slow, deliberate sip.',
  'Unclench your jaw and consciously drop your shoulders by one inch.',
  'Feel the physical weight of your feet pressing flat against the floor.',
  'Roll your shoulders backward three times with a deep, slow exhale.',
  'Look out the nearest window and find one natural green element.',
  'Place both hands flat over your chest and feel three calm heartbeats.',
];

interface SomaticNextStepCardProps {
  somaticScale?: number | null;
}

export default function SomaticNextStepCard({ somaticScale }: SomaticNextStepCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    setIsCompleted(false);
  }, [somaticScale]);

  const currentPractice = PRACTICES[currentIndex % PRACTICES.length];

  const handleNextPractice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    contentOpacity.value = withSequence(
      withTiming(0, { duration: 120, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 180, easing: Easing.in(Easing.ease) })
    );
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % PRACTICES.length);
      setIsCompleted(false);
    }, 120);
  };

  const handleToggleComplete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextState = !isCompleted;
    setIsCompleted(nextState);

    if (nextState) {
      try {
        await fetch(`${BACKEND_URL}/wellness/done-list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: currentPractice,
            category: 'Micro Practice',
          }),
        });
      } catch (e) {
        console.warn('Could not record done practice:', e);
      }
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <View style={styles.card}>
      {/* Header Row: Icon, Title, Subtitle, and MICRO PRACTICE badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <CircleDot size={18} color="#8B5CF6" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Somatic Next Step</Text>
            <Text style={styles.subtitle}>Gentle autonomic balance</Text>
          </View>
        </View>

        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>MICRO PRACTICE</Text>
        </View>
      </View>

      {/* Checkbox Row with Interactive Practice Text */}
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={handleToggleComplete}
          activeOpacity={0.8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isCompleted }}
        >
          <View style={[styles.checkboxSquare, isCompleted && styles.checkboxSquareActive]}>
            {isCompleted && <Check size={13} color="#FFFFFF" strokeWidth={2.6} />}
          </View>
          <Text style={[styles.practiceText, isCompleted && styles.practiceTextDone]}>
            {currentPractice}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Suggest Alternate Pace Button */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.alternateBtn}
          onPress={handleNextPractice}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Suggest alternate pace"
        >
          <RotateCcw size={12} color="#6B7280" strokeWidth={2} style={{ marginRight: 5 }} />
          <Text style={styles.alternateBtnText}>Suggest alternate pace</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0EDF6',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: Fonts.bold }),
    fontWeight: '700',
    fontSize: 14.5,
    color: '#1E1B4B',
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: '#9CA3AF',
    marginTop: 1,
  },
  badgePill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.bold }),
    fontWeight: '700',
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#8B5CF6',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAF9FD',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0EDF6',
    gap: 12,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSquareActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  practiceText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: '#374151',
    lineHeight: 18,
  },
  practiceTextDone: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    paddingRight: 2,
  },
  alternateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  alternateBtnText: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: Fonts.medium }),
    fontSize: 11.5,
    color: '#6B7280',
  },
});
