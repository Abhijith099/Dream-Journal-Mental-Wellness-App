import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Easing,
  Alert,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import {
  ChevronLeft,
  X,
  User as UserIcon,
  Heart,
  Move,
  Meh,
  Zap,
  Wind,
  Smartphone,
  Sparkles,
  Play,
  Pause,
  Square,
  Check,
  CheckCircle2,
  Lock,
  Compass,
  AlertCircle,
  PhoneCall,
} from 'lucide-react-native';
import { insightsAPI, ResetSessionInput } from '@/services/insightsAPI';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSessionSaved?: (savedSession: any) => void;
  initialPractice?: string;
  initialState?: string;
}

type SensationKey =
  | 'chest_rib_tension'
  | 'tight_shoulders'
  | 'jaw_clenching'
  | 'racing_thoughts'
  | 'shallow_breathing'
  | 'shaky_hands';

interface SensationOption {
  key: SensationKey;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

const SENSATION_OPTIONS: SensationOption[] = [
  {
    key: 'chest_rib_tension',
    title: 'Chest & upper rib tension',
    subtitle: 'Constriction, tight chest band',
    icon: Heart,
  },
  {
    key: 'tight_shoulders',
    title: 'Tight shoulders & neck',
    subtitle: 'Knots, elevated trap muscles',
    icon: Move,
  },
  {
    key: 'jaw_clenching',
    title: 'Jaw clenching or headache',
    subtitle: 'Temple pressure, teeth grinding',
    icon: Meh,
  },
  {
    key: 'racing_thoughts',
    title: 'Racing thoughts or restlessness',
    subtitle: 'High internal rev, fidgeting',
    icon: Zap,
  },
  {
    key: 'shallow_breathing',
    title: 'Shallow breathing',
    subtitle: 'Collarbone breath, feeling air-starved',
    icon: Wind,
  },
  {
    key: 'shaky_hands',
    title: 'Shaky hands or trembling',
    subtitle: 'Nervous tremor, micro-shivers',
    icon: Smartphone,
  },
];

type AfterFeelKey = 'more_settled' | 'same' | 'more_activated' | 'not_sure';

interface AfterFeelOption {
  key: AfterFeelKey;
  title: string;
  subtitle: string;
}

const AFTER_FEEL_OPTIONS: AfterFeelOption[] = [
  {
    key: 'more_settled',
    title: 'Calmer',
    subtitle: 'Slight downward shift in tension',
  },
  {
    key: 'same',
    title: 'Same',
    subtitle: 'No perceptible shift yet',
  },
  {
    key: 'more_activated',
    title: 'More unsettled',
    subtitle: 'Heightened awareness or charge',
  },
  {
    key: 'not_sure',
    title: 'Not sure',
    subtitle: 'Need another moment to sense',
  },
];

const CHANGE_TAGS = [
  'Breathing slowed',
  'Jaw unclenched',
  'Heart rate steady',
  'Shoulders lowered',
  'My body softened',
  'My thoughts slowed',
  'I feel safer',
  'I feel more present',
  'Nothing noticeable',
  'Still racing',
];

export const BodyResetFlowModal: React.FC<Props> = ({
  visible,
  onClose,
  onSessionSaved,
  initialPractice = 'body_reset',
  initialState = 'chest_rib_tension',
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedState, setSelectedState] = useState<string>(initialState);
  const [activePractice, setActivePractice] = useState<string>(initialPractice);

  // Timer states (90-second duration)
  const TOTAL_DURATION = 90;
  const [remainingSeconds, setRemainingSeconds] = useState<number>(TOTAL_DURATION);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [showSafetyModal, setShowSafetyModal] = useState<boolean>(false);

  // Reflection states
  const [selectedFeel, setSelectedFeel] = useState<AfterFeelKey>('more_settled');
  const [selectedChanges, setSelectedChanges] = useState<string[]>([
    'Breathing slowed',
    'Jaw unclenched',
  ]);
  const [saving, setSaving] = useState<boolean>(false);

  // Breathing animation (4s inhale / 6s exhale)
  const breathAnim = useRef(new Animated.Value(0)).current; // 0: contracted, 1: expanded
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale'>('inhale');

  // Reset modal state on open
  useEffect(() => {
    if (visible) {
      setCurrentStep(1);
      setSelectedState(initialState);
      setActivePractice(initialPractice);
      setRemainingSeconds(TOTAL_DURATION);
      setIsRunning(false);
      setSelectedFeel('more_settled');
      setSelectedChanges(['Breathing slowed', 'Jaw unclenched']);
      setShowSafetyModal(false);
      setSaving(false);
    }
  }, [visible, initialPractice, initialState]);

  // Breathing animation loop
  useEffect(() => {
    let isCancelled = false;

    const startBreathingCycle = () => {
      if (isCancelled || !isRunning) return;

      // Inhale: 4 seconds
      setBreathPhase('inhale');
      Animated.timing(breathAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || isCancelled || !isRunning) return;

        // Exhale: 6 seconds
        setBreathPhase('exhale');
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }).start(({ finished: exFinished }) => {
          if (exFinished && !isCancelled && isRunning) {
            startBreathingCycle();
          }
        });
      });
    };

    if (isRunning && currentStep === 2) {
      startBreathingCycle();
    } else {
      breathAnim.stopAnimation();
    }

    return () => {
      isCancelled = true;
      breathAnim.stopAnimation();
    };
  }, [isRunning, currentStep]);

  // Countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (isRunning && remainingSeconds > 0 && currentStep === 2) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            setCurrentStep(3);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, remainingSeconds, currentStep]);

  const formatTimerDigits = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const handleStartReset = () => {
    setCurrentStep(2);
    setRemainingSeconds(TOTAL_DURATION);
    setIsRunning(true);
  };

  const handleTogglePlayPause = () => {
    setIsRunning((prev) => !prev);
  };

  const handleStopSafetyTapped = () => {
    setIsRunning(false);
    setShowSafetyModal(true);
  };

  const handleToggleChangeTag = (tag: string) => {
    setSelectedChanges((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveAndFinish = async () => {
    try {
      setSaving(true);
      const sessionPayload: ResetSessionInput = {
        practice: activePractice,
        selectedState: selectedState || 'chest_rib_tension',
        durationSeconds: TOTAL_DURATION - remainingSeconds || TOTAL_DURATION,
        completed: true,
        afterResponse: selectedFeel,
        perceivedChange: selectedChanges,
        notes: `Body reset logged via 3-step check-in flow.`,
      };

      const result = await insightsAPI.saveResetSession(sessionPayload);
      if (onSessionSaved) {
        onSessionSaved(result.session);
      }
      onClose();
    } catch (e) {
      console.error('Failed to save reset session:', e);
      Alert.alert('Save Note', 'Could not save to remote database. Local state retained.');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Concentric circle animation scale interpolations
  const outerCircleScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });

  const middleCircleScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const innerBloomOpacity = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF7F5" />

        {/* Global Modal Top Navigation Bar */}
        <View style={styles.topNavBar}>
          <TouchableOpacity
            style={styles.navBackTouch}
            onPress={() => {
              if (currentStep > 1) {
                setCurrentStep((prev) => (prev - 1) as any);
              } else {
                onClose();
              }
            }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color="#6D28D9" />
            <Text style={styles.navBackText}>What Helps</Text>
          </TouchableOpacity>

          <Text style={styles.navCenterTitle}>
            {currentStep === 1
              ? 'Step 1 Check-in'
              : currentStep === 2
              ? 'Step 2 Active reset'
              : 'Step 3 Reflection'}
          </Text>

          <View style={styles.navRightRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelTouch}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.avatarCircle}>
              <UserIcon size={14} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Step Progress Bar Track */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressStepLabel}>
              {currentStep === 1
                ? 'STEP 1 OF 3 · CHECK-IN'
                : currentStep === 2
                ? 'Step 2 of 3 · Active reset'
                : 'STEP 3 OF 3 · REFLECTION'}
            </Text>
            <Text style={styles.progressPercentLabel}>
              {currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%'}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    currentStep === 1
                      ? '33%'
                      : currentStep === 2
                      ? '66%'
                      : '100%',
                },
              ]}
            />
          </View>
        </View>

        {/* STEP 1: CHECK-IN */}
        {currentStep === 1 && (
          <ScrollView
            style={styles.stepScroll}
            contentContainerStyle={styles.stepScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Tagline */}
            <View style={styles.subCategoryBadge}>
              <View style={styles.purpleSquareDot} />
              <Text style={styles.subCategoryBadgeText}>
                WHAT HELPS · BODY RESET
              </Text>
            </View>

            {/* Title & Prompt */}
            <Text style={styles.stepTitle}>What feels strongest right now?</Text>
            <Text style={styles.stepSubtitle}>
              Choose the physical sensation that has the most tension or charge, or
              skip to begin.
            </Text>

            {/* Sensation Cards */}
            <View style={styles.cardsList}>
              {SENSATION_OPTIONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = selectedState === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.sensationCard,
                      isSelected && styles.sensationCardSelected,
                    ]}
                    onPress={() => setSelectedState(item.key)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.sensationIconBox,
                        isSelected && styles.sensationIconBoxSelected,
                      ]}
                    >
                      <IconComponent
                        size={20}
                        color={isSelected ? '#FFFFFF' : '#4B5563'}
                      />
                    </View>

                    <View style={styles.sensationInfo}>
                      <Text style={styles.sensationTitle}>{item.title}</Text>
                      <Text style={styles.sensationSubtitle}>{item.subtitle}</Text>
                    </View>

                    <View
                      style={[
                        styles.sensationCheckCircle,
                        isSelected && styles.sensationCheckCircleSelected,
                      ]}
                    >
                      {isSelected && <Check size={14} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notice Callout Box */}
            <View style={styles.noticeCallout}>
              <View style={styles.noticeIconWrap}>
                <Sparkles size={16} color="#6D28D9" />
              </View>
              <Text style={styles.noticeCalloutText}>
                Selecting your primary charge directs your upcoming pacing rhythm and
                bilateral cues.
              </Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.primarySolidButton}
              onPress={handleStartReset}
              activeOpacity={0.85}
            >
              <Text style={styles.primarySolidButtonText}>
                BEGIN 90-SECOND RESET →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryOutlineButton}
              onPress={handleStartReset}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryOutlineButtonText}>
                Skip to practice
              </Text>
            </TouchableOpacity>

            <Text style={styles.bottomFootnote}>
              Take your time. Breath pace automatically aligns to 4s in, 6s out.
            </Text>
          </ScrollView>
        )}

        {/* STEP 2: ACTIVE RESET */}
        {currentStep === 2 && (
          <View style={styles.activeResetContainer}>
            <ScrollView
              contentContainerStyle={styles.activeResetScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.activeResetTitle}>Release body tension</Text>
              <Text style={styles.activeResetSubtitle}>
                Let your shoulders soften and breathe naturally.
              </Text>

              {/* Calm Central Visual (Concentric Soft Lavender Circles) */}
              <View style={styles.visualCard}>
                <Animated.View
                  style={[
                    styles.breathOuterCircle,
                    { transform: [{ scale: outerCircleScale }] },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.breathMiddleCircle,
                      { transform: [{ scale: middleCircleScale }] },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.breathCoreBloom,
                        { opacity: innerBloomOpacity },
                      ]}
                    >
                      {/* Calm Lotus / Petal Center */}
                      <View style={styles.lotusRing}>
                        <View style={[styles.petal, styles.petal0]} />
                        <View style={[styles.petal, styles.petal45]} />
                        <View style={[styles.petal, styles.petal90]} />
                        <View style={[styles.petal, styles.petal135]} />
                        <View style={styles.centerChamber} />
                      </View>
                    </Animated.View>
                  </Animated.View>
                </Animated.View>

                {/* Subtitle Cue under visual */}
                <Text style={styles.breathCueText}>
                  {breathPhase === 'inhale'
                    ? 'Inhale gently (4s)...'
                    : 'Exhale slowly (6s)...'}
                </Text>
                <Text style={styles.naturalPaceNote}>
                  If breathing feels uncomfortable, let your breathing return to its
                  natural pace.
                </Text>
              </View>

              {/* Timer Digits */}
              <Text style={styles.timerDigits}>
                {formatTimerDigits(remainingSeconds)}
              </Text>
              <Text style={styles.timerSubtitle}>Remaining in reset</Text>

              {/* Control Buttons */}
              <TouchableOpacity
                style={styles.resumePauseButton}
                onPress={handleTogglePlayPause}
                activeOpacity={0.8}
              >
                {isRunning ? (
                  <>
                    <Pause size={16} color="#6D28D9" style={{ marginRight: 8 }} />
                    <Text style={styles.resumePauseText}>Pause reset</Text>
                  </>
                ) : (
                  <>
                    <Play size={16} color="#6D28D9" style={{ marginRight: 8 }} />
                    <Text style={styles.resumePauseText}>Resume reset</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Safety Control Button (Always visible) */}
              <TouchableOpacity
                style={styles.safetyStopButton}
                onPress={handleStopSafetyTapped}
                activeOpacity={0.8}
              >
                <Square size={13} color="#B91C1C" style={{ marginRight: 8 }} />
                <Text style={styles.safetyStopText}>
                  Stop and return to normal breathing
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* STEP 3: REFLECTION */}
        {currentStep === 3 && (
          <ScrollView
            style={styles.stepScroll}
            contentContainerStyle={styles.stepScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Completion Badge */}
            <View style={styles.completedBadgeRow}>
              <CheckCircle2 size={16} color="#6D28D9" style={{ marginRight: 6 }} />
              <Text style={styles.completedBadgeText}>
                RESET COMPLETE · 90 SECONDS
              </Text>
            </View>

            {/* Question 1 */}
            <Text style={styles.reflectionHeading}>How do you feel now?</Text>

            {/* 2x2 Feel Cards Grid */}
            <View style={styles.feelGrid}>
              {AFTER_FEEL_OPTIONS.map((opt) => {
                const isSelected = selectedFeel === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.feelGridCard,
                      isSelected && styles.feelGridCardSelected,
                    ]}
                    onPress={() => setSelectedFeel(opt.key)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.feelCardTopRow}>
                      <Text
                        style={[
                          styles.feelCardTitle,
                          isSelected && styles.feelCardTitleSelected,
                        ]}
                      >
                        {opt.title}
                      </Text>
                      {isSelected && (
                        <View style={styles.feelCheckedBadge}>
                          <Check size={11} color="#6D28D9" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.feelCardSubtitle}>{opt.subtitle}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Contextual Supportive Message based on chosen response */}
            {selectedFeel === 'more_settled' && (
              <View style={styles.supportiveMessageCard}>
                <Text style={styles.supportiveMessageTitle}>
                  You seem a little more settled.
                </Text>
                <Text style={styles.supportiveMessageDesc}>
                  You can continue your day or save this response to help you learn
                  what supports you.
                </Text>
              </View>
            )}

            {selectedFeel === 'same' && (
              <View style={styles.supportiveMessageCard}>
                <Text style={styles.supportiveMessageTitle}>
                  No noticeable change is okay.
                </Text>
                <Text style={styles.supportiveMessageDesc}>
                  Would you like to try a different kind of reset? Sensory grounding
                  or gentle movement may engage your nervous system differently.
                </Text>
                <View style={styles.supportiveButtonsRow}>
                  <TouchableOpacity
                    style={styles.miniAltButton}
                    onPress={() => {
                      setActivePractice('sensory_grounding');
                      setCurrentStep(2);
                      setRemainingSeconds(90);
                      setIsRunning(true);
                    }}
                  >
                    <Text style={styles.miniAltButtonText}>Sensory grounding</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.miniAltButton}
                    onPress={() => {
                      setActivePractice('gentle_movement');
                      setCurrentStep(2);
                      setRemainingSeconds(90);
                      setIsRunning(true);
                    }}
                  >
                    <Text style={styles.miniAltButtonText}>Gentle movement</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {selectedFeel === 'more_activated' && (
              <View style={[styles.supportiveMessageCard, styles.activatedAlertCard]}>
                <Text
                  style={[
                    styles.supportiveMessageTitle,
                    { color: '#991B1B' },
                  ]}
                >
                  Let’s stop the exercise.
                </Text>
                <Text style={styles.supportiveMessageDesc}>
                  Return to your normal breathing and look around the room. If you
                  have concerning physical symptoms or feel unsafe, contact
                  appropriate support.
                </Text>
                <View style={styles.supportiveButtonsRow}>
                  <TouchableOpacity
                    style={styles.miniAltButton}
                    onPress={() => {
                      setActivePractice('sensory_grounding');
                      setCurrentStep(2);
                      setRemainingSeconds(90);
                      setIsRunning(true);
                    }}
                  >
                    <Text style={styles.miniAltButtonText}>Sensory grounding</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.miniAltButton,
                      { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
                    ]}
                    onPress={() => {
                      Alert.alert(
                        'Support Resources',
                        'If you are experiencing severe distress or breathlessness, please rest comfortably and reach out to local healthcare support or a trusted contact.'
                      );
                    }}
                  >
                    <Text style={[styles.miniAltButtonText, { color: '#B91C1C' }]}>
                      Contact support
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Question 2: What changed? */}
            <View style={styles.whatChangedSection}>
              <Text style={styles.whatChangedTag}>WHAT CHANGED? (OPTIONAL)</Text>
              <Text style={styles.whatChangedSubtitle}>
                Select any subtle physical shifts you observe:
              </Text>

              <View style={styles.chipsContainer}>
                {CHANGE_TAGS.map((tag) => {
                  const isChecked = selectedChanges.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.chipBadge,
                        isChecked && styles.chipBadgeSelected,
                      ]}
                      onPress={() => handleToggleChangeTag(tag)}
                      activeOpacity={0.7}
                    >
                      {isChecked && (
                        <Check
                          size={12}
                          color="#FFFFFF"
                          style={{ marginRight: 4 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.chipBadgeText,
                          isChecked && styles.chipBadgeTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Response Saved Confirmation Card */}
            <View style={styles.savedBannerCard}>
              <View style={styles.savedCheckWrap}>
                <Check size={14} color="#6D28D9" />
              </View>
              <View style={styles.savedBannerTextWrap}>
                <Text style={styles.savedBannerTitle}>
                  Response saved for personal insights
                </Text>
                <Text style={styles.savedBannerDesc}>
                  Informs future regulation practices and somatic baselines.
                </Text>
              </View>
            </View>

            {/* Done Button */}
            <TouchableOpacity
              style={styles.doneSolidButton}
              onPress={handleSaveAndFinish}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.doneSolidButtonText}>
                {saving ? 'SAVING...' : 'DONE · RETURN TO WHAT HELPS →'}
              </Text>
            </TouchableOpacity>

            {/* Security Footnote */}
            <View style={styles.privacyRow}>
              <Lock size={12} color="#9CA3AF" style={{ marginRight: 6 }} />
              <Text style={styles.privacyText}>
                Encrypted & stored strictly on-device for somatic privacy
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Safety Interruption Modal Sheet */}
        {showSafetyModal && (
          <View style={styles.safetyOverlay}>
            <View style={styles.safetySheet}>
              <View style={styles.safetyHeaderRow}>
                <AlertCircle size={22} color="#B91C1C" />
                <Text style={styles.safetyTitle}>That’s okay. You can stop here.</Text>
              </View>

              <Text style={styles.safetyDescription}>
                If you feel dizziness, chest discomfort, severe breathlessness,
                tingling, or worsening distress, return to your natural breathing and
                rest. Those symptoms should not simply be attributed to anxiety.
              </Text>

              <View style={styles.safetyButtonsCol}>
                <TouchableOpacity
                  style={styles.safetyActionItem}
                  onPress={() => {
                    setShowSafetyModal(false);
                    // Sit quietly: stays on step 2 with timer paused
                  }}
                >
                  <Text style={styles.safetyActionItemText}>Sit quietly</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.safetyActionItem}
                  onPress={() => {
                    setShowSafetyModal(false);
                    setActivePractice('sensory_grounding');
                    setRemainingSeconds(90);
                    setIsRunning(true);
                  }}
                >
                  <Text style={styles.safetyActionItemText}>
                    Try a sensory reset
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.safetyActionItem}
                  onPress={() => {
                    Alert.alert(
                      'Emergency & Support Information',
                      'If you are having severe symptoms, chest pain, or feeling unsafe, please call your local healthcare service or emergency contact immediately.'
                    );
                  }}
                >
                  <Text style={[styles.safetyActionItemText, { color: '#B91C1C' }]}>
                    Contact support
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.safetyActionItem,
                    { backgroundColor: '#1E1B4B', borderColor: '#1E1B4B' },
                  ]}
                  onPress={() => {
                    setShowSafetyModal(false);
                    setCurrentStep(3); // proceed to reflection
                  }}
                >
                  <Text style={[styles.safetyActionItemText, { color: '#FFFFFF' }]}>
                    Proceed to reflection
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAF7F5',
  },
  navBackTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D28D9',
    marginLeft: 2,
  },
  navCenterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  navRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelTouch: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
    letterSpacing: 0.8,
  },
  progressPercentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EDE9FE',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6D28D9',
    borderRadius: 2,
  },
  stepScroll: {
    flex: 1,
  },
  stepScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  subCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  purpleSquareDot: {
    width: 6,
    height: 6,
    backgroundColor: '#6D28D9',
    marginRight: 6,
    borderRadius: 1,
  },
  subCategoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
    letterSpacing: 0.6,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 30,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    marginBottom: 16,
  },
  cardsList: {
    gap: 10,
    marginBottom: 16,
  },
  sensationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  sensationCardSelected: {
    borderColor: '#6D28D9',
    backgroundColor: '#FAF5FF',
  },
  sensationIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sensationIconBoxSelected: {
    backgroundColor: '#6D28D9',
  },
  sensationInfo: {
    flex: 1,
  },
  sensationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  sensationSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  sensationCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sensationCheckCircleSelected: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  noticeCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    padding: 12,
    marginBottom: 18,
  },
  noticeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  noticeCalloutText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
  },
  primarySolidButton: {
    backgroundColor: '#1E1B4B',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primarySolidButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryOutlineButton: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  secondaryOutlineButtonText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomFootnote: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Step 2 Styles
  activeResetContainer: {
    flex: 1,
  },
  activeResetScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  activeResetTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  activeResetSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  visualCard: {
    width: '100%',
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  breathOuterCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathMiddleCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  breathCoreBloom: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotusRing: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  petal: {
    position: 'absolute',
    width: 14,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#C4B5FD',
  },
  petal0: { transform: [{ rotate: '0deg' }] },
  petal45: { transform: [{ rotate: '45deg' }] },
  petal90: { transform: [{ rotate: '90deg' }] },
  petal135: { transform: [{ rotate: '135deg' }] },
  centerChamber: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6D28D9',
    zIndex: 10,
  },
  breathCueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D28D9',
    marginTop: 20,
    marginBottom: 4,
  },
  naturalPaceNote: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  timerDigits: {
    fontSize: 40,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  timerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 24,
  },
  resumePauseButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resumePauseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D28D9',
  },
  safetyStopButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    paddingVertical: 13,
  },
  safetyStopText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },
  // Step 3 Styles
  completedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
    letterSpacing: 0.8,
  },
  reflectionHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  feelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  feelGridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 12,
    minHeight: 80,
  },
  feelGridCardSelected: {
    borderColor: '#6D28D9',
    backgroundColor: '#FAF5FF',
  },
  feelCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  feelCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  feelCardTitleSelected: {
    color: '#6D28D9',
  },
  feelCheckedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feelCardSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  supportiveMessageCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    padding: 14,
    marginBottom: 16,
  },
  activatedAlertCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  supportiveMessageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 4,
  },
  supportiveMessageDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
  },
  supportiveButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  miniAltButton: {
    borderWidth: 1,
    borderColor: '#DDD6FE',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  miniAltButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D28D9',
  },
  whatChangedSection: {
    marginBottom: 16,
  },
  whatChangedTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  whatChangedSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipBadgeSelected: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  chipBadgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  chipBadgeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  savedBannerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  savedCheckWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  savedBannerTextWrap: {
    flex: 1,
  },
  savedBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  savedBannerDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  doneSolidButton: {
    backgroundColor: '#1E1B4B',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  doneSolidButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  // Safety Interruption Sheet
  safetyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  safetySheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
  },
  safetyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  safetyDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    marginBottom: 20,
  },
  safetyButtonsCol: {
    gap: 10,
  },
  safetyActionItem: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyActionItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
});

export default BodyResetFlowModal;
