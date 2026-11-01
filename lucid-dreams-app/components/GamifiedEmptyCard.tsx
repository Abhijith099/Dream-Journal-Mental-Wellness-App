import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock, LucideIcon } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';
import { SE } from '@/constants/sereneEquilibrium';
import { useRouter } from 'expo-router';

interface GamifiedEmptyCardProps {
  title: string;
  message: string;
  icon?: LucideIcon;
  buttonText?: string;
  onPress?: () => void;
}

export default function GamifiedEmptyCard({
  title,
  message,
  icon: IconComponent = Lock,
  buttonText = 'Log a Dream',
  onPress,
}: GamifiedEmptyCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/(tabs)/add' as any);
    }
  };

  return (
    <View style={styles.card}>
      {/* Icon Circle */}
      <View style={styles.iconContainer}>
        <IconComponent size={26} color={SE.accentPurple} />
      </View>

      {/* Typography */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {/* Action Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3EFF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: SE.textPrimary,
    marginTop: 14,
    textAlign: 'center',
  },
  message: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: SE.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  button: {
    marginTop: 18,
    backgroundColor: SE.accentIndigo,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SE.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
});
