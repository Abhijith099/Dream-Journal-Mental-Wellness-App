import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Clock,
  Zap,
  AlignLeft,
  Moon,
  Globe,
  Mic,
  ShieldAlert,
  Phone,
  MessageSquare,
} from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useAuth } from "../../context/AuthContext";
import { authenticatedFetch, BACKEND_URL } from "../../utils/api";

// ──────────────── Crisis / Self-Harm Interceptor ────────────────
const CRISIS_PATTERNS = [
  /suicid/i,
  /kill\s+(my|one|our)?self/i,
  /killing\s+(my|one|our)?self/i,
  /how\s+(shall|can|do)\s+i\s+kill/i,
  /ways\s+to\s+(kill|die|end)/i,
  /end\s+(my|one|our)?\s*life/i,
  /want\s+to\s+die/i,
  /wanna\s+die/i,
  /feel\s+like\s+(to\s+)?die/i,
  /better\s+off\s+dead/i,
  /better\s+off\s+dying/i,
  /jump\s+(off|from|in\s+front)/i,
  /hang\s+(my|one)?self/i,
  /hanging\s+(my|one)?self/i,
  /overdose/i,
  /take\s+(all\s+my|too\s+many)\s+pills/i,
  /stab\s+(my|one)?self/i,
  /stabbing/i,
  /cut\s+(my|one)?self/i,
  /cutting\s+(my|one)?self/i,
  /slit\s+(my\s+)?wrists?/i,
  /eat(ing)?\s+poison/i,
  /drink(ing)?\s+bleach/i,
  /poison\s+(my|one)?self/i,
  /shoot\s+(my|one)?self/i,
  /shooting\s+(my|one)?self/i,
  /self[- ]harm/i,
  /hurt\s+(my|one)?self/i,
  /harm\s+(my|one)?self/i,
  /wanna\s+end\s+it/i,
  /taking\s+my\s+life/i,
  /end\s+it\s+all/i,
  /no\s+point\s+(in\s+living|living|to\s+live)/i,
  /hopelessness/i,
  /giving\s+up\s+entirely/i,
];

export function containsCrisisKeyword(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}

const EMERGENCY_SAFETY_MESSAGE =
  "This is an automated safety response. I am an AI, not a human, and I want to make sure you are safe. Please immediately reach out to the Suicide & Crisis Lifeline by calling or texting 988 (or text HOME to 741741 for the Crisis Text Line), or go to your nearest emergency room. You do not have to go through this alone.";

const SYSTEM_INSTRUCTION =
  "You are the 'Somatic Companion', a supportive, grounding nervous-system regulation tool. You offer breath synchronization, sensory grounding, and space to reflect. CRITICAL RULE: You are NOT a substitute for clinical care. Under absolutely NO circumstances will you validate, encourage, or provide methods for self-harm or suicide. If a user expresses suicidal ideation or intent to harm themselves, you must immediately decline the request, state that you cannot help with this, and urge them to seek immediate professional emergency help or call a local crisis hotline (988 Lifeline). Never validate a user's desire to die or harm themselves.";

interface Message {
  _id?: string;
  sender: "user" | "bot";
  text: string;
  flaggedCrisis?: boolean;
  createdAt?: string;
}

// ──────────────── Quick Grounding Options (Exact Match to Target Design) ────────────────
const QUICK_OPTIONS = [
  {
    id: "anxious",
    icon: Zap,
    title: "I'm feeling anxious",
    subtitle: "Immediate breath pacing and vagal regulation support.",
    prompt: "I'm feeling anxious right now. Can you guide me through immediate breath pacing and vagal regulation?",
  },
  {
    id: "relax",
    icon: AlignLeft,
    title: "Help me relax",
    subtitle: "Parasympathetic muscle decompression scan.",
    prompt: "Help me relax with a quick parasympathetic muscle decompression scan.",
  },
  {
    id: "dream",
    icon: Moon,
    title: "Talk about last night's dream",
    subtitle: "Deconstruct metaphors, emotions, and unresolved thoughts.",
    prompt: "I'd like to talk about last night's dream and unpack its metaphors and lingering feelings.",
  },
  {
    id: "grounding",
    icon: Globe,
    title: "Grounding exercise",
    subtitle: "5-4-3-2-1 tactile orientation for cognitive dissociation.",
    prompt: "Can we do a 5-4-3-2-1 grounding exercise to orient my senses?",
  },
];

// Staggered typing dots animation
function TypingIndicator() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    dot1.value = withRepeat(withTiming(1, { duration: 600 }), -1, true);
    dot2.value = withDelay(200, withRepeat(withTiming(1, { duration: 600 }), -1, true));
    dot3.value = withDelay(400, withRepeat(withTiming(1, { duration: 600 }), -1, true));
  }, [dot1, dot2, dot3]);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.typingDot, s1]} />
      <Animated.View style={[styles.typingDot, s2]} />
      <Animated.View style={[styles.typingDot, s3]} />
    </View>
  );
}

export default function SomaticCompanionScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ sessionId?: string; initialMessage?: string; message?: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const initialHandledRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(params.sessionId || null);

  // Gemini SDK client instance & chatSession ref
  const geminiChatRef = useRef<any>(null);

  // Initialize Gemini Chat Session
  useEffect(() => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-flash-latest",
          systemInstruction: SYSTEM_INSTRUCTION,
        });
        geminiChatRef.current = model.startChat({
          history: [],
        });
      }
    } catch (err) {
      console.warn("Direct Gemini client initialization skipped:", err);
    }
  }, []);

  // Handle passed initialMessage from Home companion card & track session initiation
  useEffect(() => {
    const rawMessage = params.initialMessage || params.message;
    if (rawMessage && !initialHandledRef.current) {
      initialHandledRef.current = true;
      const text = rawMessage.trim();
      const sId = params.sessionId || `session_${Date.now()}`;
      setCurrentSessionId(sId);

      // Track session initiation on backend: users/{userId}/companionSessions/{sessionId}/startedAt
      authenticatedFetch(`${BACKEND_URL}/home/companion-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sId, startedAt: new Date().toISOString() }),
      }).catch((e) => console.log("Companion session initiation error:", e));

      // Auto-send or pre-fill first message
      setTimeout(() => {
        handleSendMessage(text);
      }, 500);
    }
  }, [params.initialMessage, params.message]);

  // Load past session history if sessionId passed via params (and not ephemeral client string)
  useEffect(() => {
    if (params.sessionId && !params.sessionId.startsWith('session_')) {
      fetchSessionHistory(params.sessionId);
    }
  }, [params.sessionId]);

  const fetchSessionHistory = async (sId: string) => {
    try {
      setIsLoading(true);
      const res = await authenticatedFetch(`${BACKEND_URL}/chat/sessions/${sId}/messages`);
      if (res.ok) {
        const historyData = await res.json();
        if (Array.isArray(historyData) && historyData.length > 0) {
          setMessages(historyData);
          setCurrentSessionId(sId);
        }
      }
    } catch (err) {
      console.error("Error fetching session history:", err);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  // Keyboard listeners: Auto-scroll when keyboard opens
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
    });
    return () => sub.remove();
  }, []);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.displayName || user?.name?.split(" ")[0] || "there";
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  };

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText("");

    const userMessage: Message = {
      sender: "user",
      text,
      createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    // ──────────────── PRIORITY 1: CRITICAL CLIENT-SIDE CRISIS INTERCEPTOR ────────────────
    if (containsCrisisKeyword(text)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const crisisResponse: Message = {
        sender: "bot",
        text: EMERGENCY_SAFETY_MESSAGE,
        flaggedCrisis: true,
        createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      };

      // Immediately append emergency response to UI
      setMessages((prev) => [...prev, crisisResponse]);

      // Silently record to backend for clinical audit trail without invoking LLM
      authenticatedFetch(`${BACKEND_URL}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: currentSessionId }),
      }).catch((err) => console.log("Crisis audit sync logged:", err));

      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      return; // STOP EXECUTION IMMEDIATELY. NEVER CALL LLM.
    }

    setIsLoading(true);

    try {
      let botReply = "";
      let flaggedCrisis = false;

      // Method A: Direct Gemini Chat with History (if configured)
      if (geminiChatRef.current) {
        try {
          const result = await geminiChatRef.current.sendMessage(text);
          const responseText = result.response.text();
          if (responseText && responseText.trim()) {
            botReply = responseText.trim();
          }
        } catch (sdkErr: any) {
          console.warn("Direct Gemini flash-latest failed, trying gemini-3.5-flash-lite:", sdkErr?.message);
          try {
            const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
            if (apiKey) {
              const genAI = new GoogleGenerativeAI(apiKey);
              const fallbackModel = genAI.getGenerativeModel({
                model: "gemini-3.5-flash-lite",
                systemInstruction: SYSTEM_INSTRUCTION,
              });
              const fallbackResult = await fallbackModel.generateContent(text);
              const fallbackText = fallbackResult.response.text();
              if (fallbackText && fallbackText.trim()) {
                botReply = fallbackText.trim();
              }
            }
          } catch (fallbackErr: any) {
            console.warn("Direct Gemini fallback failed, falling back to backend endpoint:", fallbackErr?.message);
          }
        }
      }

      // Method B: Backend Endpoint fallback with dreams and clinical context
      if (!botReply) {
        const res = await authenticatedFetch(`${BACKEND_URL}/chat/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId: currentSessionId }),
        });

        if (!res.ok) throw new Error("Failed to receive response from companion server");
        const data = await res.json();
        botReply = data.reply || "I am holding space for you. Take a slow, gentle breath.";
        flaggedCrisis = Boolean(data.riskFlagged);
        if (data.sessionId) {
          setCurrentSessionId(data.sessionId);
        }
      }

      const botMessage: Message = {
        sender: "bot",
        text: botReply,
        flaggedCrisis,
        createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Chat communication error:", e);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "I'm having trouble connecting to my network right now. Remember to take a slow, gentle exhale. Please try again in a moment.",
          createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 10}
      >
        {/* ──────────────── TOP HEADER ──────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ChevronLeft size={22} color="#1E1B4B" strokeWidth={1.8} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.titleRow}>
              <View style={styles.activeDot} />
              <Text style={styles.headerTitleText}>SOMATIC COMPANION</Text>
            </View>
            <Text style={styles.sessionStatusText}>Active session</Text>
          </View>

          {/* Priority 4: Fully Working, Touch-Targeted History Button */}
          <TouchableOpacity
            style={styles.clockButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/chat-history" as any);
            }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
            accessibilityLabel="Open Chat History"
            accessibilityRole="button"
          >
            <Clock size={19} color="#4B5563" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* ──────────────── SCROLLABLE CONVERSATION AREA ──────────────── */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Check-In Header Card (Always visible at top) */}
          <View style={styles.checkInCard}>
            <Text style={styles.checkInEyebrow}>CHECK-IN</Text>
            <Text style={styles.checkInGreeting}>{getGreeting()}</Text>
            <View style={styles.checkInBodyWrapper}>
              <View style={styles.purpleVerticalAccent} />
              <Text style={styles.checkInSubtext}>
                I'm here to listen, offer breath synchronization, and ground your nervous system.
                This is a supportive space, not a substitute for clinical psychological care.
              </Text>
            </View>
          </View>

          {/* Quick Grounding Options (Image 1 Redesign) */}
          {messages.length === 0 && (
            <View style={styles.quickOptionsSection}>
              <View style={styles.quickOptionsHeader}>
                <Text style={styles.quickOptionsLabel}>QUICK GROUNDING OPTIONS</Text>
                <Text style={styles.quickOptionsSub}>Select to begin</Text>
              </View>

              {QUICK_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={styles.quickOptionCard}
                    onPress={() => handleSendMessage(opt.prompt)}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={opt.title}
                  >
                    {/* Uniform Faint Grey/Lavender Icon Box */}
                    <View style={styles.quickOptionIconBox}>
                      <IconComponent size={18} color="#4B5563" strokeWidth={1.8} />
                    </View>

                    <View style={styles.quickOptionTextColumn}>
                      <Text style={styles.quickOptionTitle}>{opt.title}</Text>
                      <Text style={styles.quickOptionSubtitle}>{opt.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Message Bubbles */}
          {messages.map((msg, index) => {
            const isUser = msg.sender === "user";
            return (
              <View
                key={msg._id || index}
                style={[
                  styles.messageRow,
                  isUser ? styles.userMessageRow : styles.botMessageRow,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.botBubble,
                    msg.flaggedCrisis && styles.crisisBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.userText : styles.botText,
                      msg.flaggedCrisis && styles.crisisText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>

                {/* Emergency Resources Action Banner */}
                {msg.flaggedCrisis && (
                  <View style={styles.crisisActionBanner}>
                    <View style={styles.crisisActionHeader}>
                      <ShieldAlert size={16} color="#DC2626" strokeWidth={2} style={{ marginRight: 6 }} />
                      <Text style={styles.crisisActionTitle}>Immediate Emergency Support</Text>
                    </View>

                    <View style={styles.crisisActionButtonsRow}>
                      <TouchableOpacity
                        style={styles.emergencyBtn}
                        onPress={() => Linking.openURL("tel:988")}
                        activeOpacity={0.8}
                      >
                        <Phone size={13} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 5 }} />
                        <Text style={styles.emergencyBtnText}>Call 988</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.emergencyBtn, styles.emergencyTextBtn]}
                        onPress={() => Linking.openURL("sms:741741?body=HOME")}
                        activeOpacity={0.8}
                      >
                        <MessageSquare size={13} color="#1E1B4B" strokeWidth={2} style={{ marginRight: 5 }} />
                        <Text style={styles.emergencyTextBtnLabel}>Text 741741</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.emergencyBtn, styles.emergencyPlanBtn]}
                        onPress={() => router.push("/safety-plan" as any)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.emergencyPlanBtnLabel}>Safety Plan →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {msg.createdAt && (
                  <Text style={[styles.timestampText, isUser && { textAlign: "right" }]}>
                    {msg.createdAt}
                  </Text>
                )}
              </View>
            );
          })}

          {isLoading && (
            <View style={styles.botTypingRow}>
              <View style={styles.botBubble}>
                <TypingIndicator />
              </View>
            </View>
          )}
        </ScrollView>

        {/* ──────────────── BOTTOM INPUT BAR ──────────────── */}
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View style={styles.inputInnerWrapper}>
            <TouchableOpacity
              style={styles.micButton}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              activeOpacity={0.7}
              accessibilityLabel="Voice dictation"
            >
              <Mic size={18} color="#9CA3AF" strokeWidth={1.8} />
            </TouchableOpacity>

            <TextInput
              style={styles.textInputField}
              placeholder="Write your thought or somatic sensation..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendMessage()}
              returnKeyType="send"
              multiline={false}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.85}
              accessibilityLabel="Send message"
            >
              <Text style={styles.sendButtonText}>Send →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAF9FC",
  },
  keyboardContainer: {
    flex: 1,
  },

  // ──────────────── Header ────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 12 : 8,
    paddingBottom: 12,
    backgroundColor: "#FAF9FC",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    zIndex: 10,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerCenter: {
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  headerTitleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    letterSpacing: 1.2,
  },
  sessionStatusText: {
    fontSize: 11,
    color: "#10B981",
    marginTop: 2,
    fontWeight: "500",
  },
  clockButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "transparent",
    zIndex: 10,
    elevation: 10,
  },

  // ──────────────── Scroll Content ────────────────
  scrollArea: {
    flex: 1,
    backgroundColor: "#FAF9FC",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // ──────────────── Check-In Header Card ────────────────
  checkInCard: {
    marginBottom: 20,
  },
  checkInEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B5CF6",
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  checkInGreeting: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1E1B4B",
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  checkInBodyWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  purpleVerticalAccent: {
    width: 2.5,
    backgroundColor: "#8B5CF6",
    borderRadius: 2,
    alignSelf: "stretch",
    marginRight: 10,
    opacity: 0.6,
  },
  checkInSubtext: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },

  // ──────────────── Quick Options Section ────────────────
  quickOptionsSection: {
    marginBottom: 24,
  },
  quickOptionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  quickOptionsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  quickOptionsSub: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  quickOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
  },
  quickOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quickOptionTextColumn: {
    flex: 1,
  },
  quickOptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E1B4B",
    marginBottom: 2,
  },
  quickOptionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },

  // ──────────────── Message Bubbles ────────────────
  messageRow: {
    marginBottom: 16,
    width: "100%",
  },
  userMessageRow: {
    alignItems: "flex-end",
  },
  botMessageRow: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderLeftWidth: 3,
    borderLeftColor: "#8B5CF6",
  },
  botBubble: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  crisisBubble: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  userText: {
    color: "#1E1B4B",
    fontWeight: "500",
  },
  botText: {
    color: "#1E1B4B",
    fontWeight: "400",
  },
  crisisText: {
    color: "#991B1B",
    fontWeight: "500",
  },
  timestampText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
    marginHorizontal: 4,
  },

  // ──────────────── Crisis Action Banner ────────────────
  crisisActionBanner: {
    width: "100%",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 12,
    marginTop: 8,
  },
  crisisActionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  crisisActionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
  },
  crisisActionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  emergencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  emergencyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emergencyTextBtn: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#F87171",
  },
  emergencyTextBtnLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E1B4B",
  },
  emergencyPlanBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emergencyPlanBtnLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E1B4B",
  },

  // Typing row
  botTypingRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    gap: 4,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8B5CF6",
  },

  // ──────────────── Pinned Bottom Input Bar ────────────────
  inputContainer: {
    backgroundColor: "#FAF9FC",
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  inputInnerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  micButton: {
    padding: 6,
    marginRight: 4,
  },
  textInputField: {
    flex: 1,
    fontSize: 14,
    color: "#1E1B4B",
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
  },
  sendButton: {
    backgroundColor: "#1E1B4B",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
