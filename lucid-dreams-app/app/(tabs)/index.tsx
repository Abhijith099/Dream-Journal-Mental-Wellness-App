import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  Bell,
  User as UserIcon,
  Send,
  Plus,
  Mic,
  MessageSquare,
  Clock,
  Play,
  Pause,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Fonts } from "@/constants/theme";
import { useAuth } from "../../context/AuthContext";
import { authenticatedFetch, BACKEND_URL } from "../../utils/api";
import BreathingExercise from "../../components/BreathingExercise";

const MENTAL_STATES = ["Clear", "Foggy", "Overloaded", "Numb"] as const;
const BODY_STATES = ["Settled", "Tense", "Restless", "Heavy"] as const;

type MentalState = (typeof MENTAL_STATES)[number];
type BodyState = (typeof BODY_STATES)[number];

export default function HomeScreen() {
  const { user } = useAuth();

  // Dynamic user name
  const firstName =
    user?.firstName ||
    (user?.displayName ? user.displayName.split(" ")[0] : null) ||
    (user?.name ? user.name.split(" ")[0] : null) ||
    "Sarah";

  // Check-In state (radio selection per row)
  const [mentalState, setMentalState] = useState<MentalState | null>("Clear");
  const [bodyState, setBodyState] = useState<BodyState | null>("Tense");
  const [weeklyCheckInCount, setWeeklyCheckInCount] = useState<number>(2);
  const [lastRecordedDream, setLastRecordedDream] = useState<string | null>(null);

  // Companion Chat state
  const [companionInput, setCompanionInput] = useState("");

  // Insight line state
  const [latestInsight, setLatestInsight] = useState<string>(
    "Evening worry appeared before 5 of 8 distressing dreams."
  );

  // Biometrics Last BPM state
  const [lastBPM, setLastBPM] = useState<{ value: number | null; measuredAt: string | null }>({
    value: 68,
    measuredAt: new Date(Date.now() - 3600000).toISOString(),
  });

  const [refreshing, setRefreshing] = useState(false);

  // Greeting based on time of day
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${firstName}.`;
    if (hour < 17) return `Good afternoon, ${firstName}.`;
    return `Good evening, ${firstName}.`;
  }, [firstName]);

  // Format last recorded dream text
  const formatDreamTime = (dateString: string | null) => {
    if (!dateString) return "Last recorded yesterday, 7:40 AM";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      if (isToday) return `Last recorded today, ${timeStr}`;
      if (isYesterday) return `Last recorded yesterday, ${timeStr}`;
      return `Last recorded ${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
    } catch {
      return "Last recorded recently";
    }
  };

  // Format last BPM time display
  const getBpmDisplayText = () => {
    if (!lastBPM.value || !lastBPM.measuredAt) {
      return "Resting pulse estimate: Measure when ready.";
    }

    try {
      const measuredTime = new Date(lastBPM.measuredAt).getTime();
      const diffHours = (Date.now() - measuredTime) / (1000 * 60 * 60);

      if (diffHours < 2) {
        if (diffHours < 1) {
          const diffMinutes = Math.max(1, Math.round((Date.now() - measuredTime) / (1000 * 60)));
          return `Resting pulse estimate: ${lastBPM.value} bpm (measured ${diffMinutes}m ago)`;
        }
        return `Resting pulse estimate: ${lastBPM.value} bpm (measured 1h ago)`;
      }

      return "Resting pulse estimate: Measure when ready.";
    } catch {
      return "Resting pulse estimate: Measure when ready.";
    }
  };

  // Fetch all Home screen data from backend
  const loadHomeData = useCallback(async () => {
    try {
      const checkInPromise = authenticatedFetch(`${BACKEND_URL}/home/check-in/latest`).catch(() => null);
      const insightPromise = authenticatedFetch(`${BACKEND_URL}/home/insights/latest`).catch(() => null);
      const bpmPromise = authenticatedFetch(`${BACKEND_URL}/home/biometrics/lastBPM`).catch(() => null);

      const [checkRes, insRes, bpmRes] = await Promise.all([
        checkInPromise,
        insightPromise,
        bpmPromise,
      ]);

      if (checkRes && checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.checkIn) {
          if (checkData.checkIn.mentalState) setMentalState(checkData.checkIn.mentalState);
          if (checkData.checkIn.bodyState) setBodyState(checkData.checkIn.bodyState);
        }
        if (checkData.weeklyCount !== undefined) {
          setWeeklyCheckInCount(checkData.weeklyCount);
        }
        if (checkData.lastRecordedDream) {
          setLastRecordedDream(checkData.lastRecordedDream);
        }
      }

      if (insRes && insRes.ok) {
        const insData = await insRes.json();
        if (insData.text) {
          setLatestInsight(insData.text);
        }
      }

      if (bpmRes && bpmRes.ok) {
        const bpmData = await bpmRes.json();
        if (bpmData.value !== undefined) {
          setLastBPM(bpmData);
        }
      }
    } catch (err) {
      console.warn("Home screen background sync:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  // Handle Mental State selection
  const handleSelectMentalState = async (state: MentalState) => {
    try {
      Haptics.selectionAsync();
    } catch {}

    const newMentalState = state;
    setMentalState(newMentalState);

    const today = new Date().toISOString().split("T")[0];
    authenticatedFetch(`${BACKEND_URL}/home/checkIns/${today}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mentalState: newMentalState,
        bodyState: bodyState || "Tense",
        timestamp: new Date().toISOString(),
      }),
    }).catch((err) => console.log("Check-in sync error:", err));
  };

  // Handle Body State selection
  const handleSelectBodyState = async (state: BodyState) => {
    try {
      Haptics.selectionAsync();
    } catch {}

    const newBodyState = state;
    setBodyState(newBodyState);

    const today = new Date().toISOString().split("T")[0];
    authenticatedFetch(`${BACKEND_URL}/home/checkIns/${today}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mentalState: mentalState || "Clear",
        bodyState: newBodyState,
        timestamp: new Date().toISOString(),
      }),
    }).catch((err) => console.log("Check-in sync error:", err));
  };

  // Handle Dream Log navigation
  const handleNavigateToRecordDream = () => {
    router.push({
      pathname: "/(tabs)/add",
      params: { mode: "text" },
    });
  };

  const handleNavigateToCaptureFragment = () => {
    router.push({
      pathname: "/(tabs)/add",
      params: { mode: "audio" },
    });
  };

  // Handle Companion Session navigation
  const handleNavigateToCompanion = (overrideMessage?: string) => {
    const messageToSend = overrideMessage !== undefined ? overrideMessage : companionInput;
    const sessionId = `session_${Date.now()}`;

    authenticatedFetch(`${BACKEND_URL}/home/companion-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        startedAt: new Date().toISOString(),
      }),
    }).catch((e) => console.log("Companion session initiate sync error:", e));

    setCompanionInput("");

    router.push({
      pathname: "/(tabs)/chatbot",
      params: {
        sessionId,
        initialMessage: messageToSend.trim(),
      },
    });
  };

  const handleNavigateToPractice = () => {
    router.push("/wellness/breathing");
  };

  const handleNavigateToInsights = () => {
    router.push("/(tabs)/insights");
  };

  const handleNavigateToBpm = () => {
    router.push("/heart-rate");
  };

  const currentBodyStateLabel = bodyState ? bodyState.toLowerCase() : "tense";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16162a"
            colors={["#16162a"]}
          />
        }
      >
        {/* ──────────────── TOP APP BAR ──────────────── */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Home</Text>
          <View style={styles.topBarActions}>
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              accessibilityLabel="Notifications"
            >
              <Bell size={20} color="#16162a" strokeWidth={1.8} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => router.push("/profile")}
              activeOpacity={0.8}
              accessibilityLabel="User Profile"
            >
              <UserIcon size={16} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ──────────────── PERSONALIZED GREETING ──────────────── */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>{getGreeting()}</Text>
          <Text style={styles.greetingSubtitle}>
            You have checked in {weeklyCheckInCount} times this week.
          </Text>
        </View>

        {/* ──────────────── CARD 1: HOW ARE YOU FEELING RIGHT NOW? ──────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How are you feeling right now?</Text>
          <Text style={styles.cardSubtitle}>Tap to calibrate today's support</Text>

          {/* Mental State Row */}
          <Text style={styles.fieldLabel}>MENTAL STATE</Text>
          <View style={styles.stateButtonRow}>
            {MENTAL_STATES.map((state) => {
              const isSelected = mentalState === state;
              return (
                <TouchableOpacity
                  key={state}
                  style={[
                    styles.stateButton,
                    isSelected ? styles.stateButtonSelected : styles.stateButtonUnselected,
                  ]}
                  onPress={() => handleSelectMentalState(state)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.stateButtonText,
                      isSelected ? styles.stateButtonTextSelected : styles.stateButtonTextUnselected,
                    ]}
                  >
                    {state}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Body State Row */}
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>BODY STATE</Text>
          <View style={styles.stateButtonRow}>
            {BODY_STATES.map((state) => {
              const isSelected = bodyState === state;
              return (
                <TouchableOpacity
                  key={state}
                  style={[
                    styles.stateButton,
                    isSelected ? styles.stateButtonSelected : styles.stateButtonUnselected,
                  ]}
                  onPress={() => handleSelectBodyState(state)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.stateButtonText,
                      isSelected ? styles.stateButtonTextSelected : styles.stateButtonTextUnselected,
                    ]}
                  >
                    {state}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ──────────────── CARD 2: DREAM CAPTURE ──────────────── */}
        <View style={styles.card}>
          <View style={styles.dreamCaptureHeader}>
            <Text style={styles.cardTitle}>Dream{"\n"}capture</Text>
            <Text style={styles.dreamLastRecordedText}>
              {formatDreamTime(lastRecordedDream)}
            </Text>
          </View>

          {/* Button 1: + Record a dream */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleNavigateToRecordDream}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionButtonText}>Record a dream</Text>
          </TouchableOpacity>

          {/* Button 2: 🎙 Capture a fragment */}
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={handleNavigateToCaptureFragment}
            activeOpacity={0.85}
          >
            <Mic size={16} color="#16162a" strokeWidth={1.8} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryActionButtonText}>Capture a fragment</Text>
          </TouchableOpacity>

          <Text style={styles.dreamCaptureFooterNote}>
            Audio snippet · Single phrase · Emotion tag
          </Text>
        </View>

        {/* ──────────────── CARD 3: CHAT BUDDY ──────────────── */}
        <View style={styles.companionCard}>
          <View style={styles.companionHeaderRow}>
            <MessageSquare size={15} color="#8B5CF6" strokeWidth={2.2} style={{ marginRight: 8 }} />
            <Text style={styles.companionBadgeText}>CHAT BUDDY</Text>
          </View>

          <Text style={styles.companionHeading}>
            I'm here to listen. What's on your mind today?
          </Text>

          <View style={styles.companionInputContainer}>
            <TextInput
              style={styles.companionInput}
              placeholder="Message your companion..."
              placeholderTextColor="#8E8CA8"
              value={companionInput}
              onChangeText={setCompanionInput}
              onSubmitEditing={() => handleNavigateToCompanion()}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={styles.companionSendButton}
              onPress={() => handleNavigateToCompanion()}
              activeOpacity={0.8}
            >
              <Send size={16} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ──────────────── CARD 4: SUGGESTED PRACTICE (BOX BREATHING WAVE CARD) ──────────────── */}
        <BreathingExercise
          compact={true}
          bodyState={currentBodyStateLabel}
          onNavigateToFullSession={handleNavigateToPractice}
        />

        {/* ──────────────── CARD 5: INSIGHT LINE ──────────────── */}
        <TouchableOpacity
          style={styles.insightCard}
          onPress={handleNavigateToInsights}
          activeOpacity={0.85}
        >
          <View style={styles.insightAccentBar} />
          <View style={styles.insightContentRow}>
            <Text style={styles.insightText} numberOfLines={2}>
              {latestInsight}
            </Text>
            <Text style={styles.insightLinkText}>View pattern &gt;</Text>
          </View>
        </TouchableOpacity>

        {/* ──────────────── CARD 6: OPTIONAL BODY CHECK ──────────────── */}
        <View style={styles.bodyCheckRow}>
          <View style={styles.bodyCheckLeft}>
            <Text style={styles.bodyCheckTitle}>Optional body check</Text>
            <Text style={styles.bodyCheckDescription}>
              {getBpmDisplayText()}
            </Text>
            <Text style={styles.bodyCheckDisclaimer}>Not a medical measurement.</Text>
          </View>

          <TouchableOpacity
            style={styles.bodyCheckButton}
            onPress={handleNavigateToBpm}
            activeOpacity={0.85}
          >
            <Text style={styles.bodyCheckButtonText}>Measure when ready</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAF9FC",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
    gap: 16,
  },

  // Top Bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  topBarTitle: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: "#16162a",
    letterSpacing: -0.3,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },

  // Greeting
  greetingSection: {
    marginTop: 4,
    marginBottom: 6,
  },
  greetingTitle: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    color: "#16162a",
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: "#6B7280",
    marginTop: 6,
  },

  // Base Card Styles
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: "#16162a",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 16,
  },

  // Field Labels
  fieldLabel: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: "#6B7280",
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },

  // State Selection Row (Radio behavior, 4px max border-radius)
  stateButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  stateButton: {
    flex: 1,
    height: 42,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  stateButtonSelected: {
    backgroundColor: "#16162a",
    borderWidth: 1,
    borderColor: "#16162a",
  },
  stateButtonUnselected: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  stateButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  stateButtonTextSelected: {
    color: "#FFFFFF",
  },
  stateButtonTextUnselected: {
    color: "#16162a",
  },

  // Dream Capture Header & Buttons
  dreamCaptureHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dreamLastRecordedText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: "#6B7280",
    textAlign: "right",
    maxWidth: 160,
  },
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16162a",
    height: 46,
    borderRadius: 6,
    marginBottom: 10,
  },
  primaryActionButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  secondaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F0FA",
    height: 46,
    borderRadius: 6,
    marginBottom: 12,
  },
  secondaryActionButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: "#16162a",
  },
  dreamCaptureFooterNote: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // Chat Buddy Card (Card 3)
  companionCard: {
    backgroundColor: "#131226",
    borderRadius: 14,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  companionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  companionBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: "#8B5CF6",
    letterSpacing: 1.0,
  },
  companionHeading: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 18,
  },
  companionInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F1D38",
    borderRadius: 6,
    paddingHorizontal: 14,
    height: 44,
  },
  companionInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "#FFFFFF",
    paddingVertical: 0,
  },
  companionSendButton: {
    padding: 6,
  },

  // Suggested Practice (Card 4)
  practiceSectionBadge: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: "#7C3AED",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  boxBreathingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  boxBreathingIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  boxBreathingTitle: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: "#7C3AED",
    letterSpacing: 0.8,
  },
  boxBreathingFullSession: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: "#6B7280",
  },
  waveVisualContainer: {
    height: 96,
    backgroundColor: "#F9FAFB",
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    marginBottom: 16,
  },
  waveCenterBadge: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#16162a",
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
  boxBreathingFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  boxBreathingStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  boxBreathingStatusText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: "#16162a",
  },
  boxBreathingStartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16162a",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  boxBreathingStartButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#FFFFFF",
  },

  // Insight Line Card
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    paddingRight: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  insightAccentBar: {
    width: 4,
    height: "100%",
    backgroundColor: "#7C3AED",
    marginRight: 12,
  },
  insightContentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  insightText: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: "#16162a",
    lineHeight: 18,
  },
  insightLinkText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: "#7C3AED",
  },

  // Optional Body Check
  bodyCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    gap: 12,
  },
  bodyCheckLeft: {
    flex: 1,
  },
  bodyCheckTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#16162a",
  },
  bodyCheckDescription: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  bodyCheckDisclaimer: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  bodyCheckButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyCheckButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: "#16162a",
  },
});
