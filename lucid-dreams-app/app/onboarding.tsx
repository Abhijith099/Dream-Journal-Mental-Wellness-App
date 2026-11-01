import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Moon,
  Activity,
  Sun,
  Layers,
  Users,
  Cloud,
  CloudRain,
  Fingerprint,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { authenticatedFetch, BACKEND_URL } from '../utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 6 dots for progress indicator (Slides 1 to 6, index 0 to 5)
function ProgressDot({
  index,
  activeSlide,
}: {
  index: number;
  activeSlide: number;
}) {
  const isActive = index === activeSlide;
  const dotSize = useSharedValue(isActive ? 8 : 6);

  useEffect(() => {
    dotSize.value = withSpring(isActive ? 8 : 6, {
      damping: 18,
      stiffness: 120,
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: dotSize.value,
    height: dotSize.value,
    borderRadius: dotSize.value / 2,
    backgroundColor: isActive ? '#6B4FBB' : '#D4CFEA',
  }));

  return <Animated.View style={[styles.dotBase, animatedStyle]} />;
}

// Reusable spring selection card wrapper for Slide 3
function SelectableCard({
  selected,
  onPress,
  children,
  height = 64,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
  height?: number;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = 0.97;
    scale.value = withSpring(1.0, { damping: 18 });
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width: '100%' }, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[
          styles.selectionCard,
          { height },
          selected && styles.selectionCardActive,
        ]}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  // Slide state (0 to 5 for slides 1 to 6)
  const [currentSlide, setCurrentSlide] = useState(0);

  // Collected fields
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [primaryIntent, setPrimaryIntent] = useState<
    'dreams' | 'anxiety' | 'mood' | 'wellness' | 'caregiver' | null
  >(null);
  const [typicalWakeTime, setTypicalWakeTime] = useState<
    'early' | 'morning' | 'late' | null
  >(null);
  const [recentSleepQuality, setRecentSleepQuality] = useState<number | null>(
    null
  );
  const [onboardingMoodWord, setOnboardingMoodWord] = useState('');
  const [currentStateTag, setCurrentStateTag] = useState<
    'clear' | 'foggy' | 'heavy' | null
  >(null);
  const [wantsMemorySupport, setWantsMemorySupport] = useState<boolean | null>(
    null
  );

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isMoodFocused, setIsMoodFocused] = useState(false);

  // Animation values for horizontal slide transitions
  const trackTranslateX = useSharedValue(0);

  // Slide 1 Welcome animations
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(12);
  const subtitleOpacity = useSharedValue(0);

  // Slide 1 mount animation & auto-advance timer
  const autoAdvanceRef = useRef<any>(null);

  useEffect(() => {
    // Mount animations for Slide 1
    logoOpacity.value = withTiming(1, { duration: 600 });
    titleOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) })
    );
    titleTranslateY.value = withDelay(
      300,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) })
    );
    subtitleOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) })
    );

    autoAdvanceRef.current = setTimeout(() => {
      goToSlide(1);
    }, 2500);

    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  const goToSlide = (slideIndex: number) => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setErrorMessage(null);
    setCurrentSlide(slideIndex);
    trackTranslateX.value = withTiming(-slideIndex * SCREEN_WIDTH, {
      duration: 380,
      easing: Easing.inOut(Easing.ease),
    });
  };

  const handleNext = () => {
    if (currentSlide < 5) {
      goToSlide(currentSlide + 1);
    } else {
      handleComplete(false);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1);
    }
  };

  // Submit collected data
  const handleComplete = async (isSkip: boolean) => {
    setSaving(true);
    setErrorMessage(null);

    const payload: Record<string, any> = {
      hasCompletedOnboarding: true,
    };

    if (displayName.trim()) payload.displayName = displayName.trim();
    if (primaryIntent) payload.primaryIntent = primaryIntent;
    if (typicalWakeTime) payload.typicalWakeTime = typicalWakeTime;
    if (recentSleepQuality !== null)
      payload.recentSleepQuality = recentSleepQuality;
    if (onboardingMoodWord.trim())
      payload.onboardingMoodWord = onboardingMoodWord.trim();
    if (currentStateTag) payload.currentStateTag = currentStateTag;
    if (wantsMemorySupport !== null)
      payload.wantsMemorySupport = wantsMemorySupport;

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/user/profile`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to save your profile.');
      }

      if (data.user) {
        updateUser(data.user);
      } else if (user) {
        updateUser({
          ...user,
          ...payload,
          hasCompletedOnboarding: true,
        });
      }

      // Transition to Home (which triggers Re-Entry Splash)
      router.replace('/');
    } catch (err: any) {
      console.error('Onboarding save error:', err);
      setErrorMessage(
        err.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Validation logic per slide for CTA enable
  const isCtaEnabled = () => {
    switch (currentSlide) {
      case 1:
        return displayName.trim().length >= 2;
      case 2:
        return primaryIntent !== null;
      case 3:
        return typicalWakeTime !== null && recentSleepQuality !== null;
      case 4:
        return (
          onboardingMoodWord.trim().length > 0 || currentStateTag !== null
        );
      case 5:
        return wantsMemorySupport !== null;
      default:
        return true;
    }
  };

  const getCtaLabel = () => {
    switch (currentSlide) {
      case 1:
        return 'Continue →';
      case 2:
        return "This is why I'm here →";
      case 3:
        return 'Continue →';
      case 4:
        return 'Almost there →';
      case 5:
        return 'Enter Lucid Dreams →';
      default:
        return 'Continue →';
    }
  };

  // Animated styles
  const animatedTrackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: trackTranslateX.value }],
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const animatedSubtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EDE8F7', '#FAF8F5']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* TOP BAR: Back, Progress Dots (Slide 2-6), Skip Setup (Slide 2-5) */}
        <View style={styles.topBar}>
          {currentSlide > 0 ? (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.backButton}
              accessibilityLabel="Go back"
            >
              <ChevronLeft size={20} color="#7B7490" strokeWidth={1.5} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}

          {/* Progress dots: visible on slides 2 to 6 (index 1 to 5) */}
          {currentSlide > 0 ? (
            <View style={styles.dotsRow}>
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <ProgressDot
                  key={idx}
                  index={idx}
                  activeSlide={currentSlide}
                />
              ))}
            </View>
          ) : (
            <View style={styles.dotsRowPlaceholder} />
          )}

          {/* Skip setup: visible on slides 2 to 5 (index 1 to 4) */}
          {currentSlide >= 1 && currentSlide <= 4 ? (
            <TouchableOpacity
              onPress={() => handleComplete(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.skipButton}
              accessibilityLabel="Skip setup"
            >
              <Text style={styles.skipText}>Skip setup</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipButtonPlaceholder} />
          )}
        </View>

        {/* HORIZONTAL SLIDES TRACK */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <Animated.View style={[styles.slidesTrack, animatedTrackStyle]}>
            {/* SLIDE 1 — WELCOME */}
            <TouchableWithoutFeedback
              onPress={() => {
                if (currentSlide === 0) goToSlide(1);
              }}
            >
              <View style={[styles.slide, styles.slide1Container]}>
                <View style={styles.slide1Center}>
                  <Animated.View
                    style={[styles.logoContainer, animatedLogoStyle]}
                  >
                    <Moon
                      size={52}
                      color="#6B4FBB"
                      fill="#6B4FBB"
                      strokeWidth={1.5}
                    />
                  </Animated.View>

                  <Animated.Text
                    style={[styles.slide1Title, animatedTitleStyle]}
                  >
                    Welcome to Lucid Dreams
                  </Animated.Text>

                  <Animated.Text
                    style={[styles.slide1Subtitle, animatedSubtitleStyle]}
                  >
                    A quiet space to understand yourself.
                  </Animated.Text>
                </View>
              </View>
            </TouchableWithoutFeedback>

            {/* SLIDE 2 — NAME */}
            <View style={styles.slide}>
              <ScrollView
                contentContainerStyle={styles.slideScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.label}>WHAT SHOULD WE CALL YOU?</Text>
                <Text style={styles.heading}>Your name here is private.</Text>
                <Text style={styles.subtext}>
                  It will appear in your daily grounding and your personal
                  anchor.
                </Text>

                <TextInput
                  style={[
                    styles.nameInput,
                    isNameFocused && styles.nameInputFocused,
                  ]}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your first name"
                  placeholderTextColor="#ADA8C0"
                  autoFocus={currentSlide === 1}
                  maxLength={30}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    if (displayName.trim().length >= 2) goToSlide(2);
                  }}
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={() => setIsNameFocused(false)}
                />
              </ScrollView>
            </View>

            {/* SLIDE 3 — INTENTION */}
            <View style={styles.slide}>
              <ScrollView
                contentContainerStyle={styles.slideScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.label}>WHAT BRINGS YOU HERE?</Text>
                <Text style={styles.heading}>There's no wrong answer.</Text>
                <Text style={styles.subtext}>
                  This shapes what your insights focus on.
                </Text>

                <View style={styles.cardList}>
                  <SelectableCard
                    selected={primaryIntent === 'dreams'}
                    onPress={() => setPrimaryIntent('dreams')}
                  >
                    <Moon size={20} color="#6B4FBB" strokeWidth={1.5} />
                    <Text style={styles.cardText}>
                      Understanding my dreams
                    </Text>
                  </SelectableCard>

                  <SelectableCard
                    selected={primaryIntent === 'anxiety'}
                    onPress={() => setPrimaryIntent('anxiety')}
                  >
                    <Activity size={20} color="#6B4FBB" strokeWidth={1.5} />
                    <Text style={styles.cardText}>
                      Managing anxiety or stress
                    </Text>
                  </SelectableCard>

                  <SelectableCard
                    selected={primaryIntent === 'mood'}
                    onPress={() => setPrimaryIntent('mood')}
                  >
                    <Sun size={20} color="#6B4FBB" strokeWidth={1.5} />
                    <Text style={styles.cardText}>
                      Improving my mood and energy
                    </Text>
                  </SelectableCard>

                  <SelectableCard
                    selected={primaryIntent === 'wellness'}
                    onPress={() => setPrimaryIntent('wellness')}
                  >
                    <Layers size={20} color="#6B4FBB" strokeWidth={1.5} />
                    <Text style={styles.cardText}>General mental wellness</Text>
                  </SelectableCard>

                  <SelectableCard
                    selected={primaryIntent === 'caregiver'}
                    onPress={() => setPrimaryIntent('caregiver')}
                  >
                    <Users size={20} color="#6B4FBB" strokeWidth={1.5} />
                    <Text style={styles.cardText}>
                      Supporting someone I care for
                    </Text>
                  </SelectableCard>
                </View>
              </ScrollView>
            </View>

            {/* SLIDE 4 — SLEEP */}
            <View style={styles.slide}>
              <ScrollView
                contentContainerStyle={styles.slideScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.label}>ABOUT YOUR SLEEP</Text>
                <Text style={styles.heading}>When do you usually wake up?</Text>

                {/* Wake time chips */}
                <View style={styles.wakeChipsRow}>
                  {[
                    { label: 'Before 7am', value: 'early' as const },
                    { label: '7am – 9am', value: 'morning' as const },
                    { label: 'After 9am', value: 'late' as const },
                  ].map((chip) => {
                    const isSelected = typicalWakeTime === chip.value;
                    return (
                      <TouchableOpacity
                        key={chip.value}
                        style={[
                          styles.wakeChip,
                          isSelected && styles.wakeChipSelected,
                        ]}
                        onPress={() => setTypicalWakeTime(chip.value)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.wakeChipText,
                            isSelected && styles.wakeChipTextSelected,
                          ]}
                        >
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Sleep Quality */}
                <Text
                  style={[
                    styles.label,
                    { marginTop: 36, marginBottom: 12 },
                  ]}
                >
                  HOW HAVE YOU BEEN SLEEPING LATELY?
                </Text>

                <View style={styles.sleepScaleRow}>
                  {[
                    { value: 1, label: 'Poor' },
                    { value: 2, label: 'Restless' },
                    { value: 3, label: 'Okay' },
                    { value: 4, label: 'Good' },
                    { value: 5, label: 'Restful' },
                  ].map((item) => {
                    const isSelected = recentSleepQuality === item.value;
                    return (
                      <TouchableOpacity
                        key={item.value}
                        style={styles.sleepScaleItem}
                        onPress={() => setRecentSleepQuality(item.value)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.sleepCircle,
                            isSelected && styles.sleepCircleSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sleepCircleText,
                              isSelected && styles.sleepCircleTextSelected,
                            ]}
                          >
                            {item.value}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.sleepScaleLabel,
                            isSelected && styles.sleepScaleLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* SLIDE 5 — CURRENT STATE */}
            <View style={styles.slide}>
              <ScrollView
                contentContainerStyle={styles.slideScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.label}>RIGHT NOW</Text>
                <Text style={[styles.heading, { fontSize: 22, lineHeight: 28 }]}>
                  {'In one word — how have\nyou felt this week?'}
                </Text>

                <TextInput
                  style={[
                    styles.moodInput,
                    isMoodFocused && styles.nameInputFocused,
                  ]}
                  value={onboardingMoodWord}
                  onChangeText={setOnboardingMoodWord}
                  placeholder="one word..."
                  placeholderTextColor="#ADA8C0"
                  maxLength={20}
                  onFocus={() => setIsMoodFocused(true)}
                  onBlur={() => setIsMoodFocused(false)}
                />

                <Text style={[styles.label, { marginTop: 24 }]}>
                  AND YOUR CURRENT STATE TODAY?
                </Text>

                {/* 3 State Orbs from Home */}
                <View style={styles.stateChipsRow}>
                  {[
                    { label: 'Clear', icon: Sun, value: 'clear' as const },
                    { label: 'Foggy', icon: Cloud, value: 'foggy' as const },
                    {
                      label: 'Heavy',
                      icon: CloudRain,
                      value: 'heavy' as const,
                    },
                  ].map((item) => {
                    const isActive = currentStateTag === item.value;
                    const IconComponent = item.icon;

                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[
                          styles.stateChip,
                          isActive && styles.stateChipActive,
                        ]}
                        onPress={() =>
                          setCurrentStateTag(
                            isActive ? null : item.value
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <IconComponent
                          size={20}
                          color={isActive ? '#FFFFFF' : '#777788'}
                          style={{ marginBottom: 6 }}
                          strokeWidth={1.5}
                        />
                        <Text
                          style={[
                            styles.stateChipText,
                            isActive && styles.stateChipTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.slide5Hint}>
                  This gives your first insight a real starting point.
                </Text>
              </ScrollView>
            </View>

            {/* SLIDE 6 — ACCESSIBILITY PREFERENCE (Memory Support gate) */}
            <View style={styles.slide}>
              <ScrollView
                contentContainerStyle={styles.slideScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.label}>ONE MORE THING</Text>
                <Text style={[styles.heading, { fontSize: 20, lineHeight: 26 }]}>
                  {'Is this app for you, or\nare you supporting someone?'}
                </Text>

                <View style={[styles.cardList, { marginTop: 24 }]}>
                  <SelectableCard
                    selected={wantsMemorySupport === false}
                    onPress={() => setWantsMemorySupport(false)}
                    height={100}
                  >
                    <Fingerprint
                      size={28}
                      color="#6B4FBB"
                      strokeWidth={1.5}
                    />
                    <View style={styles.accessibilityTextWrap}>
                      <Text style={styles.accessibilityTitle}>For me</Text>
                      <Text style={styles.accessibilitySubtitle}>
                        Tracking my own dreams and wellbeing
                      </Text>
                    </View>
                  </SelectableCard>

                  <SelectableCard
                    selected={wantsMemorySupport === true}
                    onPress={() => setWantsMemorySupport(true)}
                    height={100}
                  >
                    <Users size={28} color="#6B4FBB" strokeWidth={1.5} />
                    <View style={styles.accessibilityTextWrap}>
                      <Text style={styles.accessibilityTitle}>
                        Supporting someone
                      </Text>
                      <Text style={styles.accessibilitySubtitle}>
                        A loved one with memory or cognitive challenges
                      </Text>
                    </View>
                  </SelectableCard>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>

        {/* BOTTOM CTA BUTTON (Slides 2 to 6) */}
        {currentSlide > 0 && (
          <View style={styles.bottomCtaContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!isCtaEnabled() || saving}
              onPress={handleNext}
              style={[
                styles.ctaButton,
                (!isCtaEnabled() || saving) && styles.ctaButtonDisabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.ctaButtonText}>{getCtaLabel()}</Text>
              )}
            </TouchableOpacity>

            {errorMessage && (
              <Text style={styles.errorInlineText}>{errorMessage}</Text>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 36,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dotsRowPlaceholder: {
    width: 60,
  },
  dotBase: {
    // animated sizes handled via Reanimated
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 12,
    color: '#ADA8C0',
    fontWeight: '500',
  },
  skipButtonPlaceholder: {
    width: 64,
  },
  slidesTrack: {
    flex: 1,
    flexDirection: 'row',
    width: SCREEN_WIDTH * 6,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 24,
  },
  slideScrollContent: {
    paddingTop: 28,
    paddingBottom: 24,
  },
  // Slide 1 Welcome
  slide1Container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide1Center: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 320,
    paddingHorizontal: 16,
  },
  logoContainer: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide1Title: {
    marginTop: 32,
    fontSize: 28,
    fontWeight: '700',
    color: '#1E1B2E',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  slide1Subtitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '400',
    color: '#7B7490',
    textAlign: 'center',
  },
  // Typography
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ADA8C0',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1B2E',
    marginTop: 8,
  },
  subtext: {
    fontSize: 13,
    color: '#7B7490',
    marginTop: 6,
    marginBottom: 32,
    lineHeight: 18,
  },
  // Slide 2 Input
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(107,79,187,0.15)',
    padding: 18,
    fontSize: 22,
    fontWeight: '500',
    color: '#1E1B2E',
  },
  nameInputFocused: {
    borderColor: '#6B4FBB',
  },
  // Slide 3 Selection Cards
  cardList: {
    gap: 12,
    marginTop: 8,
  },
  selectionCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(107,79,187,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  selectionCardActive: {
    borderWidth: 1.5,
    borderColor: '#6B4FBB',
    backgroundColor: 'rgba(107,79,187,0.08)',
  },
  cardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1B2E',
    flex: 1,
  },
  // Slide 4 Sleep
  wakeChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  wakeChip: {
    height: 56,
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(107,79,187,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wakeChipSelected: {
    backgroundColor: '#6B4FBB',
    borderColor: '#6B4FBB',
  },
  wakeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7B7490',
  },
  wakeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sleepScaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  sleepScaleItem: {
    alignItems: 'center',
  },
  sleepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4CFEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepCircleSelected: {
    backgroundColor: '#6B4FBB',
    borderColor: '#6B4FBB',
  },
  sleepCircleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7B7490',
  },
  sleepCircleTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sleepScaleLabel: {
    marginTop: 8,
    fontSize: 10,
    color: '#ADA8C0',
    fontWeight: '500',
  },
  sleepScaleLabelSelected: {
    color: '#6B4FBB',
    fontWeight: '700',
  },
  // Slide 5 Mood
  moodInput: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(107,79,187,0.15)',
    padding: 16,
    fontSize: 18,
    fontWeight: '500',
    color: '#1E1B2E',
    marginTop: 18,
  },
  stateChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  stateChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(107,79,187,0.12)',
  },
  stateChipActive: {
    backgroundColor: '#6B4FBB',
    borderColor: '#6B4FBB',
    shadowColor: '#6B4FBB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  stateChipText: {
    fontSize: 12,
    color: '#777788',
    fontWeight: '600',
  },
  stateChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  slide5Hint: {
    marginTop: 20,
    fontSize: 11,
    fontStyle: 'italic',
    color: '#ADA8C0',
    textAlign: 'center',
  },
  // Slide 6 Accessibility
  accessibilityTextWrap: {
    flex: 1,
  },
  accessibilityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B2E',
  },
  accessibilitySubtitle: {
    fontSize: 13,
    color: '#7B7490',
    marginTop: 4,
    lineHeight: 18,
  },
  // Bottom CTA
  bottomCtaContainer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 12 : 20,
    paddingTop: 8,
  },
  ctaButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6B4FBB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6B4FBB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonDisabled: {
    opacity: 0.45,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorInlineText: {
    marginTop: 8,
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '500',
  },
});
