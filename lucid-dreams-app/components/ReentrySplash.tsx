import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from '../context/AuthContext';

interface ReentrySplashProps {
  user: User | null;
  splashOpacity: SharedValue<number>;
  homeTranslateY: SharedValue<number>;
  onComplete: () => void;
}

export default function ReentrySplash({
  user,
  splashOpacity,
  homeTranslateY,
  onComplete,
}: ReentrySplashProps) {
  // Phase 1: Greeting & Secondary Line animations
  const greetingOpacity = useSharedValue(0);
  const greetingTranslateY = useSharedValue(8);
  const secondaryOpacity = useSharedValue(0);

  // Compute salutation & name
  const firstName =
    user?.displayName?.trim()?.split(/\s+/)[0] ||
    user?.name?.trim()?.split(/\s+/)[0] ||
    'there';

  const hour = new Date().getHours();
  let salutation = 'Welcome back';
  if (hour >= 5 && hour < 11) {
    salutation = 'Good morning';
  } else if (hour >= 11 && hour < 17) {
    salutation = 'Good afternoon';
  } else if (hour >= 17 && hour < 21) {
    salutation = 'Good evening';
  } else {
    salutation = 'Welcome back';
  }
  const greetingText = `${salutation}, ${firstName}.`;

  // Compute secondary line based on primaryIntent
  let secondaryLine = 'A quiet moment to begin.';
  switch (user?.primaryIntent) {
    case 'dreams':
      secondaryLine = 'Your subconscious has been at work.';
      break;
    case 'anxiety':
      secondaryLine = 'You showed up. That matters.';
      break;
    case 'mood':
      secondaryLine = "Let's see where you are today.";
      break;
    case 'wellness':
      secondaryLine = 'A moment for yourself.';
      break;
    case 'caregiver':
      secondaryLine = "You're doing something meaningful.";
      break;
    default:
      secondaryLine = 'A quiet moment to begin.';
      break;
  }

  useEffect(() => {
    // Reset initial values
    splashOpacity.value = 1;
    homeTranslateY.value = 24;
    greetingOpacity.value = 0;
    greetingTranslateY.value = 8;
    secondaryOpacity.value = 0;

    // Phase 1 (0ms - 800ms): Greeting fades in with translateY 8 -> 0
    greetingOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.ease),
    });
    greetingTranslateY.value = withTiming(0, {
      duration: 500,
      easing: Easing.out(Easing.ease),
    });

    // Secondary line fades in at 200ms delay with duration 400ms
    secondaryOpacity.value = withDelay(
      200,
      withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      })
    );

    // Phase 2 (800ms - 1600ms): Hold still ("breath")

    // Phase 3 (1600ms - 2200ms): Home reveals, Splash dissolves
    const timerPhase3 = setTimeout(() => {
      splashOpacity.value = withTiming(0, {
        duration: 600,
        easing: Easing.in(Easing.ease),
      });
      homeTranslateY.value = withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.ease),
      });
    }, 1600);

    // After 2200ms: Unmount
    const timerComplete = setTimeout(() => {
      onComplete();
    }, 2200);

    return () => {
      clearTimeout(timerPhase3);
      clearTimeout(timerComplete);
    };
  }, []);

  const animatedGreetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingTranslateY.value }],
  }));

  const animatedSecondaryStyle = useAnimatedStyle(() => ({
    opacity: secondaryOpacity.value,
  }));

  const animatedSplashContainerStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.splashContainer,
        animatedSplashContainerStyle,
      ]}
    >
      <LinearGradient
        colors={['#EDE8F7', '#F5F2FA', '#FAF8F5']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.contentWrap}>
        <Animated.Text style={[styles.greetingText, animatedGreetingStyle]}>
          {greetingText}
        </Animated.Text>
        <Animated.Text style={[styles.secondaryText, animatedSecondaryStyle]}>
          {secondaryLine}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  greetingText: {
    fontSize: 30,
    fontWeight: '300',
    color: '#1E1B2E',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  secondaryText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '400',
    color: '#7B7490',
    textAlign: 'center',
  },
});
