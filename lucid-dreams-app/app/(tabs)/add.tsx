import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from "react-native-reanimated";
import * as SecureStore from "expo-secure-store";
import { Heart, X, Mic, Check, Volume2 } from "lucide-react-native";
import { authenticatedFetch, BACKEND_URL } from "../../utils/api";
import { useAuth } from "@/context/AuthContext";
import { useTypingDynamics } from "@/hooks/useTypingDynamics";
import VoiceRecorder from "@/components/VoiceRecorder";
import TypingConsentModal from "@/components/TypingConsentModal";

let sessionHeartRateBannerDismissed = false;

// ──────────────── Unified State Object ────────────────
export interface FormData {
  title: string;
  memoryText: string;
  lucidAwareness: string | null;
  lucidResponse: string | null;
  preSleepStressors: string[];
  dominantConcern: string | null;
  perceivedThreats: string[];
  wakingPhysicalState: string[];
  wakingEmotionalState: string[];
  dayImpact: string | null;
  behavioralImpact: string | null;
}

const INITIAL_FORM_DATA: FormData = {
  title: "",
  memoryText: "",
  lucidAwareness: null,
  lucidResponse: null,
  preSleepStressors: [],
  dominantConcern: null,
  perceivedThreats: [],
  wakingPhysicalState: [],
  wakingEmotionalState: [],
  dayImpact: null,
  behavioralImpact: null,
};

// ──────────────── Data Constants ────────────────
// Step 1: Lucid Awareness
const LUCID_AWARENESS_OPTIONS = [
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
  { value: "yes_briefly", label: "Yes, briefly" },
  { value: "yes_mostly", label: "Yes, for most of the dream" },
];

const LUCID_RESPONSE_OPTIONS = [
  { value: "observed", label: "I observed without changing anything" },
  { value: "tried_to_escape", label: "I tried to escape" },
  { value: "changed_setting", label: "I tried to change the setting" },
  { value: "changed_event", label: "I tried to change what was happening" },
  { value: "became_unstable", label: "The dream became unstable" },
  { value: "woke_up", label: "I woke up" },
];

// Step 2: The Context Options
const PRE_SLEEP_STRESSORS_OPTIONS = [
  "Work or study pressure",
  "Conflict or argument",
  "Financial stress",
  "Health or physical pain",
  "Unusual exercise",
  "Caffeine or substances",
  "Trauma reminder",
  "Grief or loss",
  "Social isolation",
  "Upsetting news",
  "Medication change",
  "Less sleep than usual",
  "More sleep than usual",
  "Nothing unusual",
  "Not sure",
];

const DOMINANT_CONCERN_OPTIONS = [
  "Something I need to solve",
  "A regret",
  "A fear",
  "A memory",
  "Lack of control",
  "A body sensation",
  "Nothing specific",
  "Not sure",
];

const PERCEIVED_THREATS_OPTIONS = [
  "Losing control",
  "Being rejected",
  "Being abandoned",
  "Being judged",
  "Being trapped",
  "Failing",
  "Being watched",
  "Not being heard",
  "Physical danger",
];

// Step 3: The Response Options
const WAKING_PHYSICAL_OPTIONS = [
  "Rested",
  "Heavy",
  "Tense",
  "Shaky",
  "Numb",
  "Energized",
  "Drained",
  "Headache or pain",
  "Not sure",
];

const WAKING_EMOTIONAL_OPTIONS = [
  "Calm",
  "Sad",
  "Anxious",
  "Irritable",
  "Numb",
  "Relieved",
  "Motivated",
  "Overwhelmed",
  "Neutral",
];

const DAY_IMPACT_OPTIONS = [
  "Not at all",
  "Slightly",
  "Moderately",
  "Significantly",
];

const BEHAVIORAL_IMPACT_OPTIONS = [
  "Avoid something",
  "Seek reassurance",
  "Think about it repeatedly",
  "Take a grounding action",
  "Feel more withdrawn",
  "Change my plans",
  "Nothing different",
  "Feel more motivated",
];

export default function RecordMemoryWizard() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Navigation and Single State Object
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [navDirection, setNavDirection] = useState<"next" | "back">("next");
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  const params = useLocalSearchParams<{ mode?: string }>();

  // Voice & typing dynamics state
  const [isVoiceMode, setIsVoiceMode] = useState(params.mode === "audio" || params.mode === "fragment");
  const [vocalCharacterization, setVocalCharacterization] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<"typed" | "voice">(params.mode === "audio" || params.mode === "fragment" ? "voice" : "typed");
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    if (params.mode === "audio" || params.mode === "fragment") {
      setIsVoiceMode(true);
      setInputMethod("voice");
    } else if (params.mode === "text") {
      setIsVoiceMode(false);
      setInputMethod("typed");
    }
  }, [params.mode]);

  // Saving & error handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Heart rate pre-journal check banner
  const sessionRef = useRef(sessionHeartRateBannerDismissed);
  const [showHeartRateBanner, setShowHeartRateBanner] = useState(!sessionRef.current);

  // Discard Confirmation Bottom Sheet
  const [showExitModal, setShowExitModal] = useState(false);

  const { onKeystroke, getSessionData, resetSession } = useTypingDynamics();

  useEffect(() => {
    async function checkConsentPrompt() {
      try {
        let prompted = false;
        if (Platform.OS === "web") {
          prompted = localStorage.getItem("typing_consent_prompted") === "true";
        } else {
          prompted = (await SecureStore.getItemAsync("typing_consent_prompted")) === "true";
        }

        if (!prompted && user && user.typingDynamicsEnabled === undefined) {
          setShowConsentModal(true);
          if (Platform.OS === "web") {
            localStorage.setItem("typing_consent_prompted", "true");
          } else {
            await SecureStore.setItemAsync("typing_consent_prompted", "true");
          }
        }
      } catch (err) {
        console.error("Error checking consent prompt:", err);
      }
    }
    checkConsentPrompt();
  }, [user]);

  const handleDismissHeartRateBanner = () => {
    sessionRef.current = true;
    sessionHeartRateBannerDismissed = true;
    setShowHeartRateBanner(false);
  };

  // State Management Helpers (all bound to formData)
  const toggleMultiSelect = (field: keyof FormData, value: string, maxLimit?: number) => {
    setFormData((prev) => {
      const current = (prev[field] as string[]) || [];
      if (current.includes(value)) {
        return {
          ...prev,
          [field]: current.filter((v) => v !== value),
        };
      }
      if (maxLimit && current.length >= maxLimit) {
        return prev;
      }
      return {
        ...prev,
        [field]: [...current, value],
      };
    });
  };

  const setSingleSelect = (field: keyof FormData, value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field] === value ? null : value,
    }));
  };

  const goNext = () => {
    setSaveError(null);
    setNavDirection("next");
    setCurrentStep((s) => (s < 3 ? s + 1 : s) as 1 | 2 | 3);
  };

  const goBack = () => {
    setSaveError(null);
    setNavDirection("back");
    setCurrentStep((s) => (s > 1 ? s - 1 : s) as 1 | 2 | 3);
  };

  // Exit checking
  const hasDraftContent = Boolean(
    formData.title.trim() ||
    formData.memoryText.trim() ||
    formData.lucidAwareness ||
    formData.preSleepStressors.length > 0 ||
    formData.dominantConcern ||
    formData.perceivedThreats.length > 0 ||
    formData.wakingPhysicalState.length > 0 ||
    formData.wakingEmotionalState.length > 0 ||
    formData.dayImpact ||
    formData.behavioralImpact
  );

  const handleClose = () => {
    if (!hasDraftContent) {
      router.back();
    } else {
      setShowExitModal(true);
    }
  };

  const handleConfirmDiscard = () => {
    setShowExitModal(false);
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    resetSession();
    router.back();
  };

  // Voice note handling
  const handleVoiceTranscriptionComplete = (transcription: string, characterization: string) => {
    const updated = formData.memoryText.trim()
      ? `${formData.memoryText.trim()} ${transcription.trim()}`
      : transcription.trim();

    setFormData((prev) => ({
      ...prev,
      memoryText: updated,
      title: !prev.title.trim()
        ? transcription.trim().split(/\s+/).slice(0, 4).join(" ") + "..."
        : prev.title,
    }));

    onKeystroke(updated);
    setVocalCharacterization(characterization || null);
    setInputMethod("voice");
    setIsVoiceMode(false);
  };

  // Step 1 validation
  const canProceedFromStep1 = Boolean(formData.title.trim() || formData.memoryText.trim());

  // Save clinical log API call
  const handleSaveDream = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSaveError(null);

    const sessionData = getSessionData();
    const typingDynamics =
      user?.typingDynamicsEnabled !== false && sessionData.averageWPM > 0
        ? sessionData
        : user?.typingDynamicsEnabled
        ? sessionData
        : undefined;

    const requestBody = {
      title: formData.title.trim() || "Untitled Memory",
      memoryText: formData.memoryText.trim(),
      description: formData.memoryText.trim() || formData.title.trim(),
      lucidAwareness: formData.lucidAwareness || "no",
      lucidResponse: formData.lucidResponse,
      preSleepStressors: formData.preSleepStressors,
      dominantConcern: formData.dominantConcern,
      concernIntensity: null,
      perceivedThreats: formData.perceivedThreats,
      dreamNeed: [],
      lifeConnection: null,
      lifeConnectionArea: [],
      wakingPhysicalState: formData.wakingPhysicalState,
      wakingEmotionalState: formData.wakingEmotionalState,
      behavioralImpact: formData.behavioralImpact,
      dayImpact: formData.dayImpact,
      inputMethod,
      vocalCharacterization,
      typingDynamics,
    };

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/dreams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error("Failed to save memory");
      }

      const savedDream = await res.json();

      // Log typing vitals if applicable
      if (sessionData && sessionData.averageWPM > 0) {
        authenticatedFetch(`${BACKEND_URL}/vitals/typing`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            averageWPM: sessionData.averageWPM,
            pauseCount: sessionData.pauseCount,
            backspaceRatio: sessionData.backspaceRatio,
            sessionDurationSeconds: sessionData.sessionDurationSeconds,
            dreamEntryId: savedDream?._id,
          }),
        }).catch((err) => console.error("Error logging typing vitals:", err));
      }

      // Reset state and return
      setFormData(INITIAL_FORM_DATA);
      setCurrentStep(1);
      resetSession();
      setIsSubmitting(false);

      router.push("/(tabs)/explore" as any);
    } catch (err: any) {
      console.error("Save error:", err);
      setIsSubmitting(false);
      setSaveError("Save failed — your draft is preserved. Please try again.");
    }
  };

  const getStepIndicator = () => {
    switch (currentStep) {
      case 1:
        return "STEP 1 OF 3 · THE EVENT";
      case 2:
        return "STEP 2 OF 3 · THE CONTEXT";
      case 3:
        return "STEP 3 OF 3 · THE RESPONSE";
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.mainWrapper}>
          {/* ──────────────── GLOBAL HEADER ──────────────── */}
          <View style={styles.fixedHeader}>
            {/* Top Progress Bar: 3 Horizontal line segments */}
            <View style={styles.topProgressBarRow}>
              <View
                style={[
                  styles.progressSegment,
                  { backgroundColor: currentStep >= 1 ? "#8B5CF6" : "#E5E7EB" },
                ]}
              />
              <View
                style={[
                  styles.progressSegment,
                  { backgroundColor: currentStep >= 2 ? "#8B5CF6" : "#E5E7EB" },
                ]}
              />
              <View
                style={[
                  styles.progressSegment,
                  { backgroundColor: currentStep >= 3 ? "#8B5CF6" : "#E5E7EB" },
                ]}
              />
            </View>

            {/* Header Top Row: STEP X OF 3 · THE [NAME] and Close Icon */}
            <View style={styles.headerTopRow}>
              <Text style={styles.stepIndicatorText}>{getStepIndicator()}</Text>

              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeButton}
                accessibilityLabel="Close wizard"
              >
                <X size={20} color="#9CA3AF" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ──────────────── SCROLLABLE PROGRESSIVE VIEW ──────────────── */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ────────── PAGE 1: THE EVENT ────────── */}
            {currentStep === 1 && (
              <Animated.View
                key="step1"
                entering={navDirection === "next" ? SlideInRight.duration(260) : SlideInLeft.duration(260)}
                exiting={navDirection === "next" ? SlideOutLeft.duration(220) : SlideOutRight.duration(220)}
                style={styles.stepContainer}
              >
                <Text style={styles.pageTitle}>Record a memory</Text>
                <Text style={styles.pageSubtitle}>
                  Give your subconscious an exact, unadorned voice.
                </Text>

                {/* Heart Rate Banner */}
                {showHeartRateBanner && (
                  <View style={styles.heartRateBanner}>
                    <View style={styles.heartRateBannerLeft}>
                      <Heart
                        size={14}
                        strokeWidth={1.5}
                        color="#8B5CF6"
                        fill="#8B5CF6"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.heartRateBannerText}>
                        Measure heart rate before logging?{" "}
                        <Text
                          style={styles.heartRateBannerLink}
                          onPress={() =>
                            router.push({
                              pathname: "/heart-rate",
                              params: { context: "pre-journal" },
                            } as any)
                          }
                        >
                          Quick check
                        </Text>
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleDismissHeartRateBanner}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel="Dismiss heart rate banner"
                    >
                      <X size={15} strokeWidth={1.5} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Title Input (Underline only) */}
                <TextInput
                  style={styles.inputTitleUnderline}
                  placeholder="Give this dream a title..."
                  placeholderTextColor="#9CA3AF"
                  value={formData.title}
                  onChangeText={(val) => setFormData((p) => ({ ...p, title: val }))}
                  autoCorrect={false}
                />

                {/* Description Area */}
                {isVoiceMode ? (
                  <VoiceRecorder
                    onTranscriptionComplete={handleVoiceTranscriptionComplete}
                    onCancel={() => setIsVoiceMode(false)}
                  />
                ) : (
                  <View style={styles.descriptionCard}>
                    <TextInput
                      style={styles.inputDescription}
                      placeholder="What happened? Describe the symbols, emotions, and landscapes from your memory..."
                      placeholderTextColor="#9CA3AF"
                      value={formData.memoryText}
                      onChangeText={(val) => {
                        setFormData((p) => ({ ...p, memoryText: val }));
                        onKeystroke(val);
                      }}
                      multiline={true}
                      scrollEnabled={false}
                    />

                    {/* Docked Voice note button */}
                    <TouchableOpacity
                      style={styles.voiceNoteBtn}
                      onPress={() => setIsVoiceMode(true)}
                      activeOpacity={0.8}
                    >
                      <Mic size={13} strokeWidth={2} color="#8B5CF6" style={{ marginRight: 5 }} />
                      <Text style={styles.voiceNoteText}>Voice note</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {vocalCharacterization && !isVoiceMode && (
                  <View style={styles.vocalNoteBadge}>
                    <Volume2 size={13} strokeWidth={1.5} color="#8B5CF6" style={{ marginRight: 6 }} />
                    <Text style={styles.vocalNoteText}>
                      <Text style={{ fontWeight: "600" }}>Voice delivery:</Text> {vocalCharacterization}
                    </Text>
                  </View>
                )}

                {/* Lucid Awareness (Single Select) */}
                <Text style={styles.sectionHeading}>Did you know you were dreaming?</Text>
                <Text style={styles.sectionSubheading}>
                  Select the level of conscious awareness during the experience.
                </Text>

                <View style={styles.verticalOptionStack}>
                  {LUCID_AWARENESS_OPTIONS.map((opt) => {
                    const isSelected = formData.lucidAwareness === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.lucidOptionButton,
                          isSelected && styles.lucidOptionButtonActive,
                        ]}
                        onPress={() => setFormData((p) => ({ ...p, lucidAwareness: opt.value }))}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.lucidOptionText,
                            isSelected && styles.lucidOptionTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <Check size={18} color="#8B5CF6" strokeWidth={2.5} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Conditional Lucid Follow-up */}
                {(formData.lucidAwareness === "yes_briefly" ||
                  formData.lucidAwareness === "yes_mostly") && (
                  <View style={styles.conditionalSection}>
                    <Text style={styles.sectionHeading}>What happened after you realized?</Text>
                    <View style={styles.verticalOptionStack}>
                      {LUCID_RESPONSE_OPTIONS.map((opt) => {
                        const isSelected = formData.lucidResponse === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[
                              styles.lucidOptionButton,
                              isSelected && styles.lucidOptionButtonActive,
                            ]}
                            onPress={() =>
                              setFormData((p) => ({
                                ...p,
                                lucidResponse: p.lucidResponse === opt.value ? null : opt.value,
                              }))
                            }
                            activeOpacity={0.85}
                          >
                            <Text
                              style={[
                                styles.lucidOptionText,
                                isSelected && styles.lucidOptionTextActive,
                              ]}
                            >
                              {opt.label}
                            </Text>
                            {isSelected && (
                              <Check size={18} color="#8B5CF6" strokeWidth={2.5} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </Animated.View>
            )}

            {/* ────────── PAGE 2: THE CONTEXT ────────── */}
            {currentStep === 2 && (
              <Animated.View
                key="step2"
                entering={navDirection === "next" ? SlideInRight.duration(260) : SlideInLeft.duration(260)}
                exiting={navDirection === "next" ? SlideOutLeft.duration(220) : SlideOutRight.duration(220)}
                style={styles.stepContainer}
              >
                <Text style={styles.pageTitle}>Pre-sleep context</Text>

                {/* Section A (Multi-Select) */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>
                    What was active in the 24 hours before sleep?
                  </Text>
                  <Text style={styles.sectionSubheading}>Select all that apply</Text>
                  <View style={styles.gridRowWrap}>
                    {PRE_SLEEP_STRESSORS_OPTIONS.map((option) => {
                      const isActive = formData.preSleepStressors.includes(option);
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.page2ChipButton,
                            isActive && styles.page2ChipButtonActive,
                          ]}
                          onPress={() => toggleMultiSelect("preSleepStressors", option)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.page2ChipText,
                              isActive && styles.page2ChipTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Section B (Single-Select) */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>
                    What was occupying your mind before sleep?
                  </Text>
                  <Text style={styles.sectionSubheading}>Select the strongest one</Text>
                  <View style={styles.gridRowWrap}>
                    {DOMINANT_CONCERN_OPTIONS.map((option) => {
                      const isActive = formData.dominantConcern === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.page2ChipButton,
                            isActive && styles.page2ChipButtonActive,
                          ]}
                          onPress={() => setSingleSelect("dominantConcern", option)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.page2ChipText,
                              isActive && styles.page2ChipTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Section C (Multi-Select up to 3) */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>
                    What felt most difficult in the dream?
                  </Text>
                  <Text style={styles.sectionSubheading}>Select up to three feelings</Text>
                  <View style={styles.gridRowWrap}>
                    {PERCEIVED_THREATS_OPTIONS.map((option) => {
                      const isActive = formData.perceivedThreats.includes(option);
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.page2ChipButton,
                            isActive && styles.page2ChipButtonActive,
                          ]}
                          onPress={() => toggleMultiSelect("perceivedThreats", option, 3)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.page2ChipText,
                              isActive && styles.page2ChipTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </Animated.View>
            )}

            {/* ────────── PAGE 3: THE RESPONSE ────────── */}
            {currentStep === 3 && (
              <Animated.View
                key="step3"
                entering={navDirection === "next" ? SlideInRight.duration(260) : SlideInLeft.duration(260)}
                exiting={navDirection === "next" ? SlideOutLeft.duration(220) : SlideOutRight.duration(220)}
                style={styles.stepContainer}
              >
                <Text style={styles.pageTitle}>Waking response</Text>

                {/* Section A (Multi-Select) */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>
                    How does your body feel right now?
                  </Text>
                  <View style={styles.gridRowWrap}>
                    {WAKING_PHYSICAL_OPTIONS.map((option) => {
                      const isActive = formData.wakingPhysicalState.includes(option);
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.page3ChipButton,
                            isActive && styles.page3ChipButtonActive,
                          ]}
                          onPress={() => toggleMultiSelect("wakingPhysicalState", option)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.page3ChipText,
                              isActive && styles.page3ChipTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Section B (Multi-Select) */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>
                    How do you feel emotionally?
                  </Text>
                  <View style={styles.gridRowWrap}>
                    {WAKING_EMOTIONAL_OPTIONS.map((option) => {
                      const isActive = formData.wakingEmotionalState.includes(option);
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.page3ChipButton,
                            isActive && styles.page3ChipButtonActive,
                          ]}
                          onPress={() => toggleMultiSelect("wakingEmotionalState", option)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.page3ChipText,
                              isActive && styles.page3ChipTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Section C (Single-Select) */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>
                    Did this dream affect your day?
                  </Text>
                  <View style={styles.dayImpactGrid}>
                    {DAY_IMPACT_OPTIONS.map((option) => {
                      const isActive = formData.dayImpact === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.dayImpactButton,
                            isActive && styles.page3ChipButtonActive,
                          ]}
                          onPress={() => setSingleSelect("dayImpact", option)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.page3ChipText,
                              isActive && styles.page3ChipTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Section D (Single-Select) */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>
                    What is your immediate response?
                  </Text>
                  <Text style={styles.sectionSubheading}>
                    What are you most likely to do in the next hour?
                  </Text>
                  <View style={styles.gridRowWrap}>
                    {BEHAVIORAL_IMPACT_OPTIONS.map((option) => {
                      const isActive = formData.behavioralImpact === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.page3ChipButton,
                            isActive && styles.page3ChipButtonActive,
                          ]}
                          onPress={() => setSingleSelect("behavioralImpact", option)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.page3ChipText,
                              isActive && styles.page3ChipTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </Animated.View>
            )}
          </ScrollView>

          {/* ──────────────── STICKY FOOTER ──────────────── */}
          <View
            style={[
              styles.stickyFooterContainer,
              { paddingBottom: Math.max(insets.bottom, 16) + 74 },
            ]}
          >
            {saveError && (
              <View style={styles.saveErrorBanner}>
                <Text style={styles.saveErrorText}>{saveError}</Text>
              </View>
            )}

            {/* Page 1 Footer: Single Full-Width Button */}
            {currentStep === 1 && (
              <TouchableOpacity
                style={[
                  styles.primaryFooterButton,
                  !canProceedFromStep1 && styles.primaryFooterButtonDisabled,
                ]}
                onPress={goNext}
                disabled={!canProceedFromStep1}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryFooterButtonText}>
                  Continue to Context →
                </Text>
              </TouchableOpacity>
            )}

            {/* Page 2 Footer: Back + Continue to Response */}
            {currentStep === 2 && (
              <View style={styles.dualFooterRow}>
                <TouchableOpacity
                  style={styles.ghostBackButton}
                  onPress={goBack}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ghostBackButtonText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryFooterButton, { flex: 1, marginLeft: 12 }]}
                  onPress={goNext}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryFooterButtonText}>
                    Continue to Response →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Page 3 Footer: Back + Save Memory */}
            {currentStep === 3 && (
              <View style={styles.dualFooterRow}>
                <TouchableOpacity
                  style={styles.ghostBackButton}
                  onPress={goBack}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ghostBackButtonText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryFooterButton,
                    styles.saveFooterButton,
                    isSubmitting && { opacity: 0.7 },
                  ]}
                  onPress={handleSaveDream}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryFooterButtonText}>Save Memory</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Typing Consent Dialog */}
        <TypingConsentModal
          visible={showConsentModal}
          onClose={() => setShowConsentModal(false)}
        />

        {/* Leave Without Saving Bottom Sheet Modal */}
        <Modal
          visible={showExitModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowExitModal(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowExitModal(false)}
          >
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Leave without saving?</Text>
              <Text style={styles.modalSubtext}>Your entries will not be saved.</Text>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalGhostButton}
                  onPress={() => setShowExitModal(false)}
                >
                  <Text style={styles.modalGhostButtonText}>Keep editing</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalDiscardButton}
                  onPress={handleConfirmDiscard}
                >
                  <Text style={styles.modalDiscardButtonText}>Discard</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardContainer: {
    flex: 1,
  },
  mainWrapper: {
    flex: 1,
    flexDirection: "column",
  },

  // ──────────────── Fixed Top Header ────────────────
  fixedHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 12 : 6,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    zIndex: 10,
  },
  topProgressBarRow: {
    flexDirection: "row",
    width: "100%",
    height: 2.5,
    gap: 6,
    marginBottom: 12,
  },
  progressSegment: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepIndicatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B5CF6",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },

  // ──────────────── Scrollable Area ────────────────
  scrollArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  stepContainer: {
    width: "100%",
  },

  // Typography
  pageTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1E1B4B",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E1B4B",
    marginTop: 22,
    marginBottom: 4,
  },
  sectionSubheading: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 10,
  },
  sectionBlock: {
    marginBottom: 8,
  },

  // ──────────────── Page 1 Components ────────────────
  heartRateBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F3FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
  },
  heartRateBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  heartRateBannerText: {
    fontSize: 12,
    color: "#4B5563",
    flexShrink: 1,
  },
  heartRateBannerLink: {
    color: "#8B5CF6",
    fontWeight: "700",
  },
  inputTitleUnderline: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1E1B4B",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 12,
    marginBottom: 16,
  },
  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 170,
    padding: 14,
    paddingBottom: 48,
    position: "relative",
  },
  inputDescription: {
    fontSize: 14,
    color: "#1E1B4B",
    lineHeight: 22,
    textAlignVertical: "top",
  },
  voiceNoteBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  voiceNoteText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  vocalNoteBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  vocalNoteText: {
    fontSize: 12,
    color: "#8B5CF6",
    flex: 1,
  },

  // Lucid Awareness (Single Select, Rounded Rectangles)
  verticalOptionStack: {
    width: "100%",
    marginTop: 4,
    gap: 8,
  },
  lucidOptionButton: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  lucidOptionButtonActive: {
    backgroundColor: "#F5F3FF",
    borderColor: "#8B5CF6",
    borderWidth: 1.5,
  },
  lucidOptionText: {
    fontSize: 14,
    color: "#1E1B4B",
    fontWeight: "400",
  },
  lucidOptionTextActive: {
    color: "#1E1B4B",
    fontWeight: "600",
  },
  conditionalSection: {
    marginTop: 6,
  },

  // ──────────────── Grid Wrap Layout ────────────────
  gridRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },

  // ──────────────── Page 2 Option Chips (Strictly Non-Pill Rounded Rectangles) ────────────────
  page2ChipButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  page2ChipButtonActive: {
    backgroundColor: "#1E1B4B",
    borderColor: "#1E1B4B",
  },
  page2ChipText: {
    fontSize: 13,
    color: "#1E1B4B",
    fontWeight: "400",
  },
  page2ChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "500",
  },

  // ──────────────── Page 3 Option Chips (Strictly Non-Pill Rounded Rectangles) ────────────────
  page3ChipButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  page3ChipButtonActive: {
    backgroundColor: "#F5F3FF",
    borderColor: "#8B5CF6",
    borderWidth: 1.5,
  },
  page3ChipText: {
    fontSize: 13,
    color: "#1E1B4B",
    fontWeight: "400",
  },
  page3ChipTextActive: {
    color: "#8B5CF6",
    fontWeight: "600",
  },

  // Day Impact 2x2 Grid Layout
  dayImpactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  dayImpactButton: {
    flexGrow: 1,
    flexBasis: "47%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // ──────────────── Sticky Footer ────────────────
  stickyFooterContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  saveErrorBanner: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#8B5CF6",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  saveErrorText: {
    fontSize: 12,
    color: "#1E1B4B",
    textAlign: "center",
  },
  primaryFooterButton: {
    backgroundColor: "#1E1B4B",
    height: 52,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  primaryFooterButtonDisabled: {
    opacity: 0.45,
  },
  primaryFooterButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  saveFooterButton: {
    backgroundColor: "#8B5CF6",
    flex: 1,
    marginLeft: 12,
  },
  dualFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  ghostBackButton: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  ghostBackButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E1B4B",
  },

  // ──────────────── Modal Sheet (Leave confirmation) ────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(30, 27, 75, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
    marginBottom: 6,
  },
  modalSubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
  },
  modalGhostButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalGhostButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  modalDiscardButton: {
    backgroundColor: "#1E1B4B",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalDiscardButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
