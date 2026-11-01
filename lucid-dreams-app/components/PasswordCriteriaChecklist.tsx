import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { CheckCircle, Circle } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';

export interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()\-_=+[\]{}|;':",.<>?/\\]/;

export function evaluatePassword(password: string): PasswordCriteria {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: SPECIAL_CHAR_REGEX.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const criteria = evaluatePassword(password);
  return (
    criteria.minLength &&
    criteria.hasUpper &&
    criteria.hasLower &&
    criteria.hasNumber &&
    criteria.hasSpecial
  );
}

interface CriteriaItemProps {
  label: string;
  met: boolean;
}

function CriteriaRow({ label, met }: CriteriaItemProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(met ? 1.15 : 0.9, { damping: 12, stiffness: 200 }, () => {
      scale.value = withSpring(1);
    });
  }, [met]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.criteriaRow}>
      <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
        {met ? (
          <CheckCircle size={16} strokeWidth={1.5} color="#10B981" />
        ) : (
          <Circle size={16} strokeWidth={1.5} color="#9CA3AF" />
        )}
      </Animated.View>
      <Text style={[styles.criteriaText, met && styles.criteriaTextMet]}>{label}</Text>
    </View>
  );
}

interface Props {
  password: string;
  style?: any;
}

export default function PasswordCriteriaChecklist({ password, style }: Props) {
  const criteria = evaluatePassword(password);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.checklistTitle}>Password must contain:</Text>
      <CriteriaRow label="At least 8 characters" met={criteria.minLength} />
      <CriteriaRow label="At least one uppercase letter (A-Z)" met={criteria.hasUpper} />
      <CriteriaRow label="At least one lowercase letter (a-z)" met={criteria.hasLower} />
      <CriteriaRow label="At least one number (0-9)" met={criteria.hasNumber} />
      <CriteriaRow label="At least one special character (!@#$%...)" met={criteria.hasSpecial} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  checklistTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#6B7280',
    marginBottom: 8,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconWrapper: {
    marginRight: 8,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  criteriaText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#6B7280',
  },
  criteriaTextMet: {
    color: '#059669',
    fontFamily: Fonts.bold,
  },
});
