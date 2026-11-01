import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  DimensionValue,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Compass, X, Sun, Moon, Waves, Heart, Zap } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';
import { SE } from '@/constants/sereneEquilibrium';
import { authenticatedFetch, BACKEND_URL } from '@/utils/api';

interface EMAModalProps {
  visible: boolean;
  onClose: () => void;
  triggeredBy?: 'notification' | 'app_open' | 'manual';
  onSubmitted?: () => void;
}

const QUESTION_POOL = [
  'How are you right now?',
  'What is your energy like right now?',
  'How does your body feel right now?',
  'How present do you feel right now?',
];

const MOOD_OPTIONS_ROW_1 = [
  {
    mood: 'calm',
    label: 'Calm',
    energyLevel: 4,
    color: '#38B2AC',
    bgColor: '#E6FFFA',
    icon: Waves,
  },
  {
    mood: 'okay',
    label: 'Okay',
    energyLevel: 3,
    color: '#4A6B82',
    bgColor: '#EBF8FF',
    icon: Sun,
  },
  {
    mood: 'tense',
    label: 'Tense',
    energyLevel: 3,
    color: '#ED8936',
    bgColor: '#FEEBC8',
    icon: Zap,
  },
];

const MOOD_OPTIONS_ROW_2 = [
  {
    mood: 'low',
    label: 'Low',
    energyLevel: 2,
    color: '#8069BF',
    bgColor: '#F3EFF8',
    icon: Moon,
  },
  {
    mood: 'heavy',
    label: 'Heavy',
    energyLevel: 1,
    color: '#E53E3E',
    bgColor: '#FFF5F5',
    icon: Heart,
  },
];

let lastQuestionIndex = -1;

export default function EMAModal({
  visible,
  onClose,
  triggeredBy = 'app_open',
  onSubmitted,
}: EMAModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(QUESTION_POOL[3]);
  const [submittingMood, setSubmittingMood] = useState<string | null>(null);

  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      let nextIndex = Math.floor(Math.random() * QUESTION_POOL.length);
      if (nextIndex === lastQuestionIndex) {
        nextIndex = (nextIndex + 1) % QUESTION_POOL.length;
      }
      lastQuestionIndex = nextIndex;
      setCurrentQuestion(QUESTION_POOL[nextIndex]);
      setSubmittingMood(null);

      translateY.value = withSpring(0, { damping: 16, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = 60;
      opacity.value = 0;
    }
  }, [visible]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleSelectMood = async (option: typeof MOOD_OPTIONS_ROW_1[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSubmittingMood(option.mood);

    try {
      await authenticatedFetch(`${BACKEND_URL}/ema/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: option.mood,
          energyLevel: option.energyLevel,
          question: currentQuestion,
          triggeredBy,
        }),
      });

      onSubmitted?.();
    } catch (err) {
      console.error('Failed to submit EMA checkin:', err);
    } finally {
      setSubmittingMood(null);
      onClose();
    }
  };

  const renderOption = (opt: typeof MOOD_OPTIONS_ROW_1[0], flexWidth: DimensionValue = '30%') => {
    const isSelected = submittingMood === opt.mood;
    const IconComponent = opt.icon;

    return (
      <TouchableOpacity
        key={opt.mood}
        style={[
          styles.optionBox,
          { width: flexWidth },
          isSelected && styles.optionBoxActive,
        ]}
        onPress={() => handleSelectMood(opt)}
        activeOpacity={0.7}
        disabled={submittingMood !== null}
      >
        {isSelected ? (
          <ActivityIndicator size="small" color={opt.color} />
        ) : (
          <>
            <View style={[styles.iconCircle, { backgroundColor: opt.bgColor }]}>
              <IconComponent size={20} color={opt.color} strokeWidth={1.5} />
            </View>
            <Text style={styles.optionLabel}>{opt.label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.cardContainer, modalAnimatedStyle]}>
          <View style={styles.card}>
            {/* Header / Close */}
            <View style={styles.headerRow}>
              <View style={styles.badge}>
                <Compass size={13} color={SE.accentPurple} strokeWidth={1.5} />
                <Text style={styles.badgeText}>3-Second Check-in</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <X size={18} color={SE.textSecondary} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* Question */}
            <Text style={styles.questionText}>{currentQuestion}</Text>
            <Text style={styles.subtext}>Tap your inner weather right now</Text>

            {/* 3-2 Grid Options */}
            <View style={styles.gridWrapper}>
              {/* Row 1: Calm, Okay, Tense */}
              <View style={styles.optionsRow}>
                {MOOD_OPTIONS_ROW_1.map((opt) => renderOption(opt, '31%'))}
              </View>

              {/* Row 2: Low, Heavy */}
              <View style={[styles.optionsRow, { justifyContent: 'center', gap: 14 }]}>
                {MOOD_OPTIONS_ROW_2.map((opt) => renderOption(opt, '38%'))}
              </View>
            </View>

            {/* Skip Action */}
            <TouchableOpacity style={styles.skipBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(58, 46, 91, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: SE.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  card: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: SE.borderCard,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EFF8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 8,
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: SE.accentPurple,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#F7F5FA',
  },
  questionText: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: SE.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 6,
  },
  subtext: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: SE.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  gridWrapper: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  optionBox: {
    height: 86,
    borderRadius: 20,
    backgroundColor: '#FAF8FD',
    borderWidth: 1,
    borderColor: '#EFEBF6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  optionBoxActive: {
    backgroundColor: '#F3EFF8',
    borderColor: SE.accentPurple,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: SE.textPrimary,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: SE.textSecondary,
  },
});
