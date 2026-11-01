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
  SafeAreaView,
  StatusBar,
  Linking,
  useWindowDimensions,
} from "react-native";
import {
  Send,
  ShieldAlert,
  MessageCircle,
  Waves,
  Moon,
  Compass,
  Activity,
  ChevronLeft
} from "lucide-react-native";
import { Colors, Fonts } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { authenticatedFetch, BACKEND_URL } from "../utils/api";

interface Message {
  _id?: string;
  sender: "user" | "bot";
  text: string;
  flaggedCrisis?: boolean;
  createdAt?: string;
}

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

  const style1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const style2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const style3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.typingDot, style1]} />
      <Animated.View style={[styles.typingDot, style2]} />
      <Animated.View style={[styles.typingDot, style3]} />
    </View>
  );
}

// Fade-in + translateY entry for new messages
function AnimatedMessage({ children }: { children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withTiming(0, { duration: 200 });
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[{ width: "100%" }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

export default function ChatbotScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName = user?.name || "Dreamer";
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Reanimated value for soft ambient glow pulse (60% to 90% opacity, ~3s loop)
  const glowOpacity = useSharedValue(0.6);

  useEffect(() => {
    initChat();
    glowOpacity.value = withRepeat(
      withTiming(0.9, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [glowOpacity]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const initChat = async () => {
    try {
      setLoading(true);

      // Fetch history using authenticatedFetch
      const histRes = await authenticatedFetch(`${BACKEND_URL}/chat/history`);
      const hist = await histRes.json();
      if (Array.isArray(hist)) {
        setMessages(hist);
      }
    } catch (err) {
      console.error("Error initializing chat:", err);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || sending) return;

    if (!customText) {
      setInputText("");
    }
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add user message locally
    const tempUserMsg: Message = { sender: "user", text: textToSend };
    setMessages((prev) => [...prev, tempUserMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/chat/message`, {
        method: "POST",
        body: JSON.stringify({ message: textToSend })
      });
      const data = await res.json();

      if (res.ok && data && data.reply) {
        // Replace temp local message with user message (flagged info) and append bot response
        setMessages((prev) => {
          const updated = [...prev];
          const lastUserIndex = updated.map(m => m.sender).lastIndexOf("user");
          if (lastUserIndex !== -1) {
            updated[lastUserIndex] = {
              sender: "user",
              text: textToSend,
              flaggedCrisis: data.riskFlagged
            };
          }
          return [...updated, { sender: "bot", text: data.reply, flaggedCrisis: data.riskFlagged }];
        });

        if (data.riskFlagged) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "I'm having trouble responding right now — try again in a moment." }
        ]);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "I'm having trouble responding right now — try again in a moment." }
      ]);
    } finally {
      setSending(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isWeb = Platform.OS === "web";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={isWeb ? styles.webHeaderWrapper : null}>
        <View style={[styles.header, isMobile && styles.headerMobile, isWeb && styles.webInnerContainer]}>
          <TouchableOpacity onPress={() => router.push('/')} style={[styles.backBtn, isMobile && { width: 36, height: 36, borderRadius: 18 }]} activeOpacity={0.8}>
            <ChevronLeft size={isMobile ? 18 : 22} strokeWidth={1.5} color="#2D2D2D" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerSub}>SUPPORT CHAT</Text>
            <Text style={[styles.headerTitle, isMobile && { fontSize: 18 }]}>Neural Companion</Text>
          </View>
          <View style={{ width: isMobile ? 36 : 40 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <View style={isWeb ? styles.webMainContainer : { flex: 1 }}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={Colors.light.text} />
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={[
                styles.scrollContent,
                messages.length === 0 && styles.emptyScrollContent,
                { paddingBottom: isMobile ? 80 : 30 }
              ]}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  {/* Pulsing circular avatar element */}
                  <View style={styles.avatarGlowContainer}>
                    <Animated.View style={[styles.avatarPulseGlow, glowAnimatedStyle]}>
                      <BlurView intensity={30} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                    <View style={styles.circularAvatar}>
                      <MessageCircle size={32} color="#2D2D2D" strokeWidth={1.5} />
                    </View>
                  </View>

                  <Text style={[styles.greetingText, isMobile && { fontSize: 22, marginBottom: 8 }]}>Hey, {displayName}!</Text>

                  <Text style={styles.framingLine}>
                    I'm here to listen and offer grounding support — not a replacement for professional care.
                  </Text>
                </View>
              ) : (
                messages.map((msg, i) => {
                  const isUser = msg.sender === "user";
                  return (
                    <AnimatedMessage key={msg._id || i}>
                      <View
                        style={[
                          styles.messageRow,
                          isUser ? styles.userRow : styles.botRow,
                        ]}
                      >
                        <View
                          style={[
                            styles.bubble,
                            isUser ? styles.userBubble : styles.botBubble,
                            msg.flaggedCrisis ? styles.crisisBubble : null
                          ]}
                        >
                          <Text
                            style={[
                              styles.messageText,
                              isUser ? styles.userText : styles.botText,
                            ]}
                          >
                            {msg.text}
                          </Text>
                        </View>
                      </View>

                      {/* Flagged crisis resources persistent UI card */}
                      {msg.flaggedCrisis && !isUser && (
                        <View style={styles.crisisCard}>
                          <View style={styles.crisisCardHeader}>
                            <ShieldAlert size={18} strokeWidth={1.5} color="#2D2D2D" style={{ marginRight: 8 }} />
                            <Text style={styles.crisisCardTitle}>System Safeguard Resources</Text>
                          </View>
                          <Text style={styles.crisisCardDesc}>
                            If you are in immediate danger or feeling overwhelmed, please connect with these free, 24/7 services:
                          </Text>

                          <View style={styles.crisisActions}>
                            <TouchableOpacity
                              style={styles.crisisActionBtn}
                              onPress={() => Linking.openURL('tel:988')}
                            >
                              <Text style={styles.crisisActionBtnText}>Call or Text 988 (Hotline)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.crisisActionBtn}
                              onPress={() => Linking.openURL('sms:741741?body=HOME')}
                            >
                              <Text style={styles.crisisActionBtnText}>Text HOME to 741741 (Crisis Line)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.crisisActionBtn, { backgroundColor: '#2D2D2D' }]}
                              onPress={() => router.push('/safety-plan')}
                            >
                              <Text style={[styles.crisisActionBtnText, { color: '#F9F9F7' }]}>Go to Safety Plan</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </AnimatedMessage>
                  );
                })
              )}

              {sending && (
                <AnimatedMessage>
                  <View style={[styles.messageRow, styles.botRow]}>
                    <View style={[styles.bubble, styles.botBubble, styles.typingBubbleContainer]}>
                      <TypingIndicator />
                    </View>
                  </View>
                </AnimatedMessage>
              )}
            </ScrollView>
          )}

          {/* Quick-reply chips directly above input bar */}
          <View style={styles.quickReplyContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickReplyScroll}
            >
              {[
                { text: "I'm feeling anxious", icon: <Activity size={13} color="#2D2D2D" strokeWidth={1.5} /> },
                { text: "Help me relax", icon: <Waves size={13} color="#2D2D2D" strokeWidth={1.5} /> },
                { text: "Talk about last night's dream", icon: <Moon size={13} color="#2D2D2D" strokeWidth={1.5} /> },
                { text: "I need a grounding exercise", icon: <Compass size={13} color="#2D2D2D" strokeWidth={1.5} /> }
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.text}
                  style={styles.quickReplyChip}
                  onPress={() => handleSend(chip.text)}
                  activeOpacity={0.8}
                >
                  {chip.icon}
                  <Text style={styles.quickReplyText}>{chip.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Write your thought..."
              placeholderTextColor="rgba(45, 45, 45, 0.4)"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              blurOnSubmit={true}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || sending}
              activeOpacity={0.8}
            >
              <Send size={16} strokeWidth={1.5} color={inputText.trim() ? "#F9F9F7" : "rgba(45, 45, 45, 0.3)"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F7",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.05)",
  },
  headerMobile: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(45, 45, 45, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSub: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: "#8A8A8A",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  avatarGlowContainer: {
    position: "relative",
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  avatarPulseGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#D2DFE6", // pastel slate blue
    overflow: "hidden",
  },
  circularAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 1,
  },
  greetingText: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
    textAlign: "center",
    marginBottom: 12,
  },
  framingLine: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: "#8A8A8A",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 30,
    marginBottom: 36,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
    width: "100%",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  botRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: "#D2DFE6", // soft slate blue accent
    borderTopRightRadius: 6,
  },
  botBubble: {
    backgroundColor: "#FFFFFF", // white card
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.05)",
  },
  crisisBubble: {
    borderColor: "rgba(45, 45, 45, 0.15)",
    backgroundColor: "#EBE5D9", // warm sand / warning highlight
  },
  typingBubbleContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  messageText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },
  userText: {
    color: "#2D2D2D",
  },
  botText: {
    color: "#2D2D2D",
  },

  // Crisis resources card inside chat
  crisisCard: {
    backgroundColor: "#EBE5D9",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.12)",
    alignSelf: "stretch",
  },
  crisisCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  crisisCardTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
  },
  crisisCardDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "#2D2D2D",
    lineHeight: 18,
    marginBottom: 16,
  },
  crisisActions: {
    gap: 8,
  },
  crisisActionBtn: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.05)",
  },
  crisisActionBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
  },

  // Quick reply chips row above input bar
  quickReplyContainer: {
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  quickReplyScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  quickReplyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.05)",
    gap: 8,
  },
  quickReplyText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: "#2D2D2D",
  },

  // Input Bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 24 : 20, // Reclaimed space (no tab bar)
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: "#2D2D2D",
    maxHeight: 100,
    paddingTop: Platform.OS === "ios" ? 8 : 4,
    paddingBottom: Platform.OS === "ios" ? 8 : 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2D2D2D",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: "rgba(45, 45, 45, 0.05)",
  },

  // Typing Dots Styling
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 12,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8A8A8A", // neutral gray
  },

  // Web Layout Handling
  webHeaderWrapper: {
    backgroundColor: "#F9F9F7",
    width: "100%",
  },
  webInnerContainer: {
    width: "100%",
    alignSelf: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.05)",
  },
  webMainContainer: {
    width: "100%",
    alignSelf: "center",
    flex: 1,
    backgroundColor: "#F9F9F7",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(45, 45, 45, 0.04)",
  },
});
