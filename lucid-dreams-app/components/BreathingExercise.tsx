import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ScrollView,
} from "react-native";
import {
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  Check,
  Clock,
  Sparkles,
  Eye,
  Hand,
  Volume2,
  Smile,
  Compass,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { SvgXml } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useAuth } from "../context/AuthContext";
import { authenticatedFetch, BACKEND_URL } from "../utils/api";
import { Fonts } from "@/constants/theme";

export type BreathingPhase = "Inhale" | "Hold" | "Exhale";

interface BreathingExerciseProps {
  compact?: boolean;
  autoStart?: boolean;
  onNavigateToFullSession?: () => void;
  bodyState?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Text-to-Speech Engine (Web Speech API + native fallback)
// ─────────────────────────────────────────────────────────────────────────────
class WebSpeechEngine {
  private softVoice: any = null;

  constructor() {
    this.initVoice();
  }

  private initVoice() {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return;

        // Prefer en-GB soft/female voice
        const preferred = voices.find(
          (v) =>
            (v.lang.startsWith("en-GB") || v.lang === "en_GB") &&
            (v.name.toLowerCase().includes("female") ||
              v.name.toLowerCase().includes("natural") ||
              v.name.toLowerCase().includes("serena") ||
              v.name.toLowerCase().includes("martha") ||
              v.name.toLowerCase().includes("victoria") ||
              !v.name.toLowerCase().includes("george"))
        );

        this.softVoice =
          preferred ||
          voices.find((v) => v.lang.startsWith("en-GB") || v.lang === "en_GB") ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0] ||
          null;
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  speak(text: string) {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.85;
        utterance.pitch = 0.95;
        utterance.volume = 1.0;
        if (this.softVoice) {
          utterance.voice = this.softVoice;
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Web SpeechSynthesis error:", err);
      }
    } else {
      try {
        Speech.stop();
        Speech.speak(text, {
          language: "en-GB",
          rate: 0.85,
          pitch: 0.95,
          volume: 1.0,
        });
      } catch (err) {
        console.warn("Native Speech error:", err);
      }
    }
  }

  pause() {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.pause();
      } catch {}
    } else {
      try {
        Speech.pause();
      } catch {
        try {
          Speech.stop();
        } catch {}
      }
    }
  }

  resume() {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.resume();
      } catch {}
    } else {
      try {
        Speech.resume();
      } catch {}
    }
  }

  cancel() {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    } else {
      try {
        Speech.stop();
      } catch {}
    }
  }
}

const speechEngine = new WebSpeechEngine();

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pure SVG + CSS @keyframes Wave
// ─────────────────────────────────────────────────────────────────────────────
// Symmetrical sine wave spanning width 500, height 120, center line y = 60.
// Inhale: amplitude increases smoothly (scaleY: 0.12 -> 1.0)
// Hold: holds at peak, slightly pulsing (scaleY: 1.0 -> 1.06 -> 1.0)
// Exhale: amplitude decreases smoothly (scaleY: 1.0 -> 0.12)
// Hold: stays flat/near-flat (scaleY: 0.10 - 0.12), repeats smoothly.
// stroke-dashoffset + amplitude transform animated continuously over 16s cycle.
const SINE_PATH_D =
  "M 0 60 C 40 20, 85 20, 125 60 C 165 100, 210 100, 250 60 C 290 20, 335 20, 375 60 C 415 100, 460 100, 500 60";

const generateWaveSvg = (isAnimating: boolean, isPaused: boolean, compact: boolean) => `
<svg viewBox="0 0 500 120" width="100%" height="${compact ? 80 : 160}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @keyframes continuousWaveBreathing {
        0% {
          transform: scaleY(0.12);
          stroke-dashoffset: 0;
        }
        25% {
          transform: scaleY(1.0);
          stroke-dashoffset: -125;
        }
        37.5% {
          transform: scaleY(1.06);
          stroke-dashoffset: -187;
        }
        50% {
          transform: scaleY(1.0);
          stroke-dashoffset: -250;
        }
        75% {
          transform: scaleY(0.12);
          stroke-dashoffset: -375;
        }
        87.5% {
          transform: scaleY(0.10);
          stroke-dashoffset: -437;
        }
        100% {
          transform: scaleY(0.12);
          stroke-dashoffset: -500;
        }
      }
      .box-breathing-wave-path {
        transform-origin: 250px 60px;
        animation: continuousWaveBreathing 16s cubic-bezier(0.42, 0, 0.58, 1) infinite;
        stroke: #a89fc2;
        stroke-width: ${compact ? "3.2" : "3.8"};
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
        stroke-dasharray: 480 30;
      }
      .wave-paused {
        animation-play-state: paused !important;
      }
      .wave-idle {
        transform-origin: 250px 60px;
        transform: scaleY(0.25);
        stroke: #a89fc2;
        stroke-width: ${compact ? "3.2" : "3.8"};
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
      }
    </style>
  </defs>
  <path
    class="${isAnimating ? "box-breathing-wave-path" : "wave-idle"} ${
  isPaused ? "wave-paused" : ""
}"
    d="${SINE_PATH_D}"
  />
</svg>
`;

// Clean SVG for native fallback with reanimated transform
const STATIC_WAVE_SVG = (compact: boolean) => `
<svg viewBox="0 0 500 120" width="100%" height="${compact ? 80 : 160}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="${SINE_PATH_D}"
    stroke="#a89fc2"
    stroke-width="${compact ? "3.2" : "3.8"}"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />
</svg>
`;

export function WavyBreathingVisual({
  compact = false,
  isAnimating = false,
  isPaused = false,
}: {
  compact?: boolean;
  isAnimating?: boolean;
  isPaused?: boolean;
}) {
  const nativeScaleY = useSharedValue(0.25);

  useEffect(() => {
    if (Platform.OS === "web") return;

    if (isAnimating && !isPaused) {
      nativeScaleY.value = withRepeat(
        withSequence(
          withTiming(1.0, { duration: 4000, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
          withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.12, { duration: 4000, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
          withTiming(0.10, { duration: 2000, easing: Easing.linear }),
          withTiming(0.12, { duration: 2000, easing: Easing.linear })
        ),
        -1,
        false
      );
    } else if (isPaused) {
      cancelAnimation(nativeScaleY);
    } else {
      cancelAnimation(nativeScaleY);
      nativeScaleY.value = withTiming(0.25, { duration: 300 });
    }

    return () => {
      cancelAnimation(nativeScaleY);
    };
  }, [isAnimating, isPaused]);

  const animatedNativeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: nativeScaleY.value }],
  }));

  if (Platform.OS === "web") {
    const html = generateWaveSvg(isAnimating, isPaused, compact);
    return (
      <div
        style={{
          width: "100%",
          height: compact ? 80 : 160,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <Animated.View
      style={[
        {
          width: "100%",
          height: compact ? 80 : 160,
          alignItems: "center",
          justifyContent: "center",
        },
        animatedNativeStyle,
      ]}
    >
      <SvgXml xml={STATIC_WAVE_SVG(compact)} width="100%" height={compact ? 80 : 160} />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Grounding Steps Specification (5-4-3-2-1 technique)
// ─────────────────────────────────────────────────────────────────────────────
const GROUNDING_STEPS = [
  {
    step: 5,
    prompt: "Name 5 things you can see right now.",
    sense: "Sight",
    description: "Look around your space and note 5 distinct details.",
  },
  {
    step: 4,
    prompt: "Notice 4 things you can physically feel.",
    sense: "Touch",
    description: "Feel the texture of your clothes, the surface under your feet.",
  },
  {
    step: 3,
    prompt: "Listen for 3 sounds around you.",
    sense: "Sound",
    description: "Faraway hums, wind, or the quiet tone of the room.",
  },
  {
    step: 2,
    prompt: "Find 2 things you can smell or taste.",
    sense: "Scent & Taste",
    description: "A lingering scent in the air, a cool sip of water.",
  },
  {
    step: 1,
    prompt: "Acknowledge 1 thing you are grateful for.",
    sense: "Gratitude",
    description: "A kind moment, safe shelter, or your own breath.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. Main Component: BreathingExercise & Full Guided Flow
// ─────────────────────────────────────────────────────────────────────────────
export default function BreathingExercise({
  compact = false,
  autoStart = false,
  onNavigateToFullSession,
  bodyState,
}: BreathingExerciseProps) {
  const { user } = useAuth();

  // Mode: "breathing" or "grounding"
  const [viewMode, setViewMode] = useState<"breathing" | "grounding">("breathing");

  // Breathing State
  const [isBreathingRunning, setIsBreathingRunning] = useState(autoStart && !compact);
  const [isBreathingPaused, setIsBreathingPaused] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase>("Inhale");
  const [remainingSec, setRemainingSec] = useState(4);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [hasStartedIntro, setHasStartedIntro] = useState(false);

  // Phase tracker: 0 = Inhale, 1 = Hold (after inhale), 2 = Exhale, 3 = Hold (after exhale)
  const phaseStepRef = useRef(0);
  const remainingSecRef = useRef(4);
  const cycleRef = useRef(1);
  const timerRef = useRef<any>(null);

  // Grounding State
  const [groundingStepIndex, setGroundingStepIndex] = useState(0);
  const [groundingTimeLeft, setGroundingTimeLeft] = useState(6);
  const [isGroundingComplete, setIsGroundingComplete] = useState(false);
  const groundingTimerRef = useRef<any>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Backend Logging
  // ───────────────────────────────────────────────────────────────────────────
  const logBreathingSessionComplete = useCallback(async () => {
    try {
      const userId = user?.id || "anonymous";
      const sessionId = `breath_${Date.now()}`;
      await authenticatedFetch(`${BACKEND_URL}/users/${userId}/breathingSessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedAt: new Date().toISOString(),
          cycles: 4,
          followedByGrounding: true,
        }),
      });
    } catch (err) {
      console.warn("Breathing session log error:", err);
    }
  }, [user]);

  const logGroundingSessionComplete = useCallback(async () => {
    try {
      const userId = user?.id || "anonymous";
      const sessionId = `ground_${Date.now()}`;
      await authenticatedFetch(`${BACKEND_URL}/users/${userId}/groundingSessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedAt: new Date().toISOString(),
          technique: "5-4-3-2-1",
        }),
      });
    } catch (err) {
      console.warn("Grounding session log error:", err);
    }
  }, [user]);

  // ───────────────────────────────────────────────────────────────────────────
  // Speech Announcements
  // ───────────────────────────────────────────────────────────────────────────
  const speakPhaseAndCount = (step: number, count: number) => {
    if (compact) return;

    // At count 4 (start of phase), announce phase name + first count
    if (count === 4) {
      if (step === 0) {
        speechEngine.speak("Inhale. 4");
      } else if (step === 1) {
        speechEngine.speak("Hold. 4");
      } else if (step === 2) {
        speechEngine.speak("Exhale slowly. 4");
      } else if (step === 3) {
        speechEngine.speak("Hold. 4");
      }
    } else {
      // Countdown numbers: 3, 2, 1
      speechEngine.speak(String(count));
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Automatic Flow to Grounding
  // ───────────────────────────────────────────────────────────────────────────
  const startGroundingFlow = useCallback(() => {
    setViewMode("grounding");
    setGroundingStepIndex(0);
    setGroundingTimeLeft(6);
    setIsGroundingComplete(false);

    // Speak initial prompt for Step 5
    const firstPrompt = GROUNDING_STEPS[0].prompt;
    speechEngine.speak(firstPrompt);

    if (groundingTimerRef.current) clearInterval(groundingTimerRef.current);

    let currentIdx = 0;
    let secLeft = 6;

    groundingTimerRef.current = setInterval(() => {
      secLeft -= 1;
      setGroundingTimeLeft(secLeft);

      if (secLeft <= 0) {
        currentIdx += 1;
        if (currentIdx < GROUNDING_STEPS.length) {
          setGroundingStepIndex(currentIdx);
          secLeft = 6;
          setGroundingTimeLeft(6);
          const nextPrompt = GROUNDING_STEPS[currentIdx].prompt;
          speechEngine.speak(nextPrompt);
          try {
            Haptics.selectionAsync();
          } catch {}
        } else {
          // Completed all 5 steps!
          clearInterval(groundingTimerRef.current);
          setIsGroundingComplete(true);
          speechEngine.speak("You're done. Breathe naturally and carry this calm with you.");
          logGroundingSessionComplete();
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
      }
    }, 1000);
  }, [logGroundingSessionComplete]);

  // ───────────────────────────────────────────────────────────────────────────
  // Box Breathing Tick Controller
  // ───────────────────────────────────────────────────────────────────────────
  const handlePhaseTick = useCallback(() => {
    remainingSecRef.current -= 1;

    if (remainingSecRef.current > 0) {
      setRemainingSec(remainingSecRef.current);
      speakPhaseAndCount(phaseStepRef.current, remainingSecRef.current);
    } else {
      // Step to next phase
      phaseStepRef.current = (phaseStepRef.current + 1) % 4;
      remainingSecRef.current = 4;
      setRemainingSec(4);

      let nextPhase: BreathingPhase = "Inhale";
      if (phaseStepRef.current === 0) nextPhase = "Inhale";
      else if (phaseStepRef.current === 1) nextPhase = "Hold";
      else if (phaseStepRef.current === 2) nextPhase = "Exhale";
      else if (phaseStepRef.current === 3) nextPhase = "Hold";

      setCurrentPhase(nextPhase);

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      // If completing step 3, full 4-4-4-4 cycle completed
      if (phaseStepRef.current === 0) {
        cycleRef.current += 1;
        if (cycleRef.current > 4) {
          // 4 cycles done!
          if (timerRef.current) clearInterval(timerRef.current);
          setIsBreathingRunning(false);
          speechEngine.speak("Well done. Take a moment to notice how you feel.");
          logBreathingSessionComplete();

          // Flow directly into Grounding without asking
          setTimeout(() => {
            startGroundingFlow();
          }, 2400);
          return;
        } else {
          setCurrentCycle(cycleRef.current);
          // Silent cycle repeat - announce inhale countdown
          speakPhaseAndCount(0, 4);
        }
      } else {
        speakPhaseAndCount(phaseStepRef.current, 4);
      }
    }
  }, [logBreathingSessionComplete, startGroundingFlow]);

  // Session start logic
  const startBreathingSession = useCallback(() => {
    setIsBreathingRunning(true);
    setIsBreathingPaused(false);
    phaseStepRef.current = 0;
    remainingSecRef.current = 4;
    cycleRef.current = 1;
    setCurrentPhase("Inhale");
    setRemainingSec(4);
    setCurrentCycle(1);

    if (compact) {
      // Simple timer in compact mode
      timerRef.current = setInterval(handlePhaseTick, 1000);
      return;
    }

    // Voice announcement for session start
    speechEngine.speak("Let's begin. Breathe in slowly.");

    // After 2.4s intro, begin first Inhale countdown
    setTimeout(() => {
      speakPhaseAndCount(0, 4);
      timerRef.current = setInterval(handlePhaseTick, 1000);
    }, 2400);
  }, [compact, handlePhaseTick]);

  // Toggle Pause / Resume
  const handleTogglePause = () => {
    try {
      Haptics.selectionAsync();
    } catch {}

    if (isBreathingPaused) {
      // Resume
      setIsBreathingPaused(false);
      speechEngine.resume();
      timerRef.current = setInterval(handlePhaseTick, 1000);
    } else {
      // Pause
      setIsBreathingPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      speechEngine.pause();
    }
  };

  // Reset
  const handleReset = () => {
    try {
      Haptics.selectionAsync();
    } catch {}

    if (timerRef.current) clearInterval(timerRef.current);
    if (groundingTimerRef.current) clearInterval(groundingTimerRef.current);

    speechEngine.cancel();

    setIsBreathingRunning(false);
    setIsBreathingPaused(false);
    setViewMode("breathing");
    phaseStepRef.current = 0;
    remainingSecRef.current = 4;
    cycleRef.current = 1;
    setCurrentPhase("Inhale");
    setRemainingSec(4);
    setCurrentCycle(1);
    setGroundingStepIndex(0);
    setIsGroundingComplete(false);
  };

  // Exit
  const handleExit = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    handleReset();
    router.back();
  };

  // Auto-start on mount if full session
  useEffect(() => {
    if (autoStart && !compact && !hasStartedIntro) {
      setHasStartedIntro(true);
      startBreathingSession();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (groundingTimerRef.current) clearInterval(groundingTimerRef.current);
      speechEngine.cancel();
    };
  }, [autoStart, compact]);

  // ───────────────────────────────────────────────────────────────────────────
  // COMPACT BASE COMPONENT (Home Screen Reference Card)
  // ───────────────────────────────────────────────────────────────────────────
  if (compact) {
    const handleCardOrStartTap = () => {
      try {
        Haptics.selectionAsync();
      } catch {}
      if (onNavigateToFullSession) {
        onNavigateToFullSession();
      } else {
        router.push("/wellness/breathing");
      }
    };

    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={handleCardOrStartTap}
        activeOpacity={0.92}
      >
        {bodyState ? (
          <Text style={styles.practiceSectionBadge}>
            SUGGESTED PRACTICE · BASED ON {bodyState.toUpperCase()} BODY
          </Text>
        ) : null}

        {/* Top Header: Clock icon badge + "BOX BREATHING · Full session" */}
        <View style={styles.compactHeaderRow}>
          <View style={styles.compactIconBadge}>
            <Clock size={14} color="#7C3AED" strokeWidth={2} />
          </View>
          <Text style={styles.compactTitle}>BOX BREATHING</Text>
          <Text style={styles.compactFullSession}>· Full session</Text>
        </View>

        {/* Center: Rounded background container with sine wave and centered 4s badge */}
        <View style={styles.compactWaveContainer}>
          <WavyBreathingVisual compact={true} isAnimating={isBreathingRunning} isPaused={false} />
          <View style={styles.waveCenterBadge}>
            <Text style={styles.waveCenterBadgeText}>
              {isBreathingRunning ? `${remainingSec}s` : "4s"}
            </Text>
          </View>
        </View>

        {/* Bottom Row: Left green dot + "Ready" (or phase); Right dark ▶ Start button */}
        <View style={styles.compactFooterRow}>
          <View style={styles.compactStatusRow}>
            <View
              style={[
                styles.statusIndicatorDot,
                { backgroundColor: isBreathingRunning ? "#3B82F6" : "#10B981" },
              ]}
            />
            <Text style={styles.compactStatusText}>
              {isBreathingRunning ? currentPhase : "Ready"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.compactStartButton}
            onPress={handleCardOrStartTap}
            activeOpacity={0.85}
          >
            <Play size={13} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.compactStartButtonText}>Start</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GROUNDING SCREEN (5-4-3-2-1 Technique)
  // ───────────────────────────────────────────────────────────────────────────
  if (viewMode === "grounding") {
    const currentGrounding = GROUNDING_STEPS[groundingStepIndex];

    return (
      <SafeAreaView style={styles.fullScreenContainer}>
        <View style={styles.fullHeader}>
          <TouchableOpacity onPress={handleExit} style={styles.backButton} activeOpacity={0.8}>
            <ChevronLeft size={22} color="#1a1a2e" strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.headerTitleLabel}>GROUNDING</Text>
            <Text style={styles.headerSubtitleText}>5-4-3-2-1 technique</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.groundingScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Dots: [ 5 · 4 · 3 · 2 · 1 ] */}
          <View style={styles.groundingProgressRow}>
            {GROUNDING_STEPS.map((stepItem, idx) => {
              const isPast = idx < groundingStepIndex;
              const isCurrent = idx === groundingStepIndex && !isGroundingComplete;
              return (
                <View
                  key={stepItem.step}
                  style={[
                    styles.groundingStepPill,
                    isCurrent && styles.groundingStepPillActive,
                    isPast && styles.groundingStepPillPast,
                  ]}
                >
                  <Text
                    style={[
                      styles.groundingStepPillText,
                      isCurrent && styles.groundingStepPillTextActive,
                      isPast && styles.groundingStepPillTextPast,
                    ]}
                  >
                    {stepItem.step}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Main Card with Prompt */}
          <View style={styles.groundingCard}>
            {!isGroundingComplete ? (
              <>
                <View style={styles.groundingNumberCircle}>
                  <Text style={styles.groundingBigNumber}>{currentGrounding.step}</Text>
                </View>

                <Text style={styles.groundingSenseLabel}>{currentGrounding.sense}</Text>

                <Text style={styles.groundingPromptText}>{currentGrounding.prompt}</Text>

                <Text style={styles.groundingDescriptionText}>
                  {currentGrounding.description}
                </Text>

                {/* 6s Countdown Progress Bar */}
                <View style={styles.pacingContainer}>
                  <View style={styles.pacingTrack}>
                    <View
                      style={[
                        styles.pacingFill,
                        { width: `${((6 - groundingTimeLeft) / 6) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.pacingSecText}>{groundingTimeLeft}s</Text>
                </View>
              </>
            ) : (
              <View style={styles.groundingCompleteWrapper}>
                <View style={styles.completeIconBadge}>
                  <Check size={28} color="#10B981" strokeWidth={2.4} />
                </View>
                <Text style={styles.completeTitle}>You're done</Text>
                <Text style={styles.completeDescription}>
                  Breathe naturally and carry this calm with you.
                </Text>
              </View>
            )}
          </View>

          {/* Bottom Action Controls: Repeat Breathing & Done */}
          <View style={styles.groundingFooterControls}>
            <TouchableOpacity
              style={styles.repeatButton}
              onPress={() => {
                speechEngine.cancel();
                setViewMode("breathing");
                startBreathingSession();
              }}
              activeOpacity={0.85}
            >
              <RotateCcw size={15} color="#1a1a2e" strokeWidth={2} style={{ marginRight: 8 }} />
              <Text style={styles.repeatButtonText}>Repeat breathing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                speechEngine.cancel();
                router.replace("/(tabs)");
              }}
              activeOpacity={0.85}
            >
              <Check size={16} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 6 }} />
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FULL SESSION SCREEN (Box Breathing Guided Session)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.fullScreenContainer}>
      {/* Top Header */}
      <View style={styles.fullHeader}>
        <TouchableOpacity onPress={handleExit} style={styles.backButton} activeOpacity={0.8}>
          <ChevronLeft size={22} color="#1a1a2e" strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitleLabel}>BOX BREATHING · Full session</Text>
          <Text style={styles.headerSubtitleText}>Cycle {currentCycle} of 4</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.fullContent}>
        {/* Phase Indicator Text: Large, Centered, Sentence Case */}
        <View style={styles.phaseIndicatorWrapper}>
          <Text style={styles.fullPhaseText}>
            {isBreathingRunning ? currentPhase : "Ready"}
          </Text>
          <Text style={styles.fullCycleSub}>
            {isBreathingRunning ? `Cycle ${currentCycle} of 4` : "4-4-4-4 Box technique"}
          </Text>
        </View>

        {/* Center: Full-width animated wave card with countdown circle in center */}
        <View style={styles.fullWaveCard}>
          <WavyBreathingVisual
            compact={false}
            isAnimating={isBreathingRunning}
            isPaused={isBreathingPaused}
          />
          <View style={styles.fullWaveCenterBadge}>
            <Text style={styles.fullWaveCenterBadgeText}>
              {isBreathingRunning ? `${remainingSec}s` : "4s"}
            </Text>
          </View>
        </View>

        {/* Bottom Controls: Rectangular buttons, border-radius: 6px max, no pill shape */}
        <View style={styles.fullControlsRow}>
          {isBreathingRunning ? (
            <TouchableOpacity
              style={styles.primaryControlButton}
              onPress={handleTogglePause}
              activeOpacity={0.85}
            >
              {isBreathingPaused ? (
                <>
                  <Play size={16} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryControlButtonText}>Resume</Text>
                </>
              ) : (
                <>
                  <Pause size={16} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryControlButtonText}>Pause</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryControlButton}
              onPress={startBreathingSession}
              activeOpacity={0.85}
            >
              <Play size={16} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryControlButtonText}>Start</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryControlButton}
            onPress={handleReset}
            activeOpacity={0.85}
          >
            <RotateCcw size={15} color="#1a1a2e" strokeWidth={2} style={{ marginRight: 8 }} />
            <Text style={styles.secondaryControlButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles: Calm, minimal, human-made, generous whitespace, borderRadius: 6 max
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Compact Base Mode
  compactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
  },
  practiceSectionBadge: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: "#6B7280",
    marginBottom: 12,
  },
  compactHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  compactIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  compactTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#1a1a2e",
    letterSpacing: 0.4,
  },
  compactFullSession: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 4,
  },
  compactWaveContainer: {
    width: "100%",
    height: 80,
    backgroundColor: "#F7F6FB",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    marginVertical: 12,
  },
  waveCenterBadge: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  waveCenterBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  compactFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  compactStatusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 8,
  },
  compactStatusText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: "#1a1a2e",
  },
  compactStartButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  compactStartButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: "#FFFFFF",
  },

  // Full Screen Guided Mode
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#FAF9FC",
  },
  fullHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: "#1a1a2e",
    textTransform: "uppercase",
  },
  headerSubtitleText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#71717A",
    marginTop: 2,
  },
  fullContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "space-between",
  },
  phaseIndicatorWrapper: {
    alignItems: "center",
    marginVertical: 10,
  },
  fullPhaseText: {
    fontFamily: Fonts.bold,
    fontSize: 34,
    color: "#1a1a2e",
    letterSpacing: 0.5,
  },
  fullCycleSub: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: "#71717A",
    marginTop: 6,
  },
  fullWaveCard: {
    width: "100%",
    maxWidth: 500,
    height: 180,
    backgroundColor: "#F7F6FB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBE9F2",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  fullWaveCenterBadge: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fullWaveCenterBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: "#FFFFFF",
  },
  fullControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    maxWidth: 400,
    justifyContent: "center",
    marginTop: 20,
  },
  primaryControlButton: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a2e",
    height: 48,
    borderRadius: 6,
  },
  primaryControlButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  secondaryControlButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1a1a2e",
  },
  secondaryControlButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#1a1a2e",
  },

  // Grounding Screen Styles
  groundingScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  groundingProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  groundingStepPill: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  groundingStepPillActive: {
    backgroundColor: "#1a1a2e",
    borderColor: "#1a1a2e",
  },
  groundingStepPillPast: {
    backgroundColor: "#EDE9FE",
    borderColor: "#DDD6FE",
  },
  groundingStepPillText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#71717A",
  },
  groundingStepPillTextActive: {
    color: "#FFFFFF",
  },
  groundingStepPillTextPast: {
    color: "#6D28D9",
  },
  groundingCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 28,
  },
  groundingNumberCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F7F6FB",
    borderWidth: 1,
    borderColor: "#EBE9F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  groundingBigNumber: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    color: "#1a1a2e",
  },
  groundingSenseLabel: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: "#7C3AED",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  groundingPromptText: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: "#1a1a2e",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 12,
  },
  groundingDescriptionText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: "#71717A",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  pacingContainer: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  pacingTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  pacingFill: {
    height: "100%",
    backgroundColor: "#1a1a2e",
    borderRadius: 2,
  },
  pacingSecText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#71717A",
  },
  groundingCompleteWrapper: {
    alignItems: "center",
    paddingVertical: 16,
  },
  completeIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  completeTitle: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: "#1a1a2e",
    marginBottom: 8,
  },
  completeDescription: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: "#71717A",
    textAlign: "center",
    lineHeight: 22,
  },
  groundingFooterControls: {
    width: "100%",
    maxWidth: 480,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  repeatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1a1a2e",
  },
  repeatButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#1a1a2e",
  },
  doneButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a2e",
    height: 48,
    borderRadius: 6,
  },
  doneButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
