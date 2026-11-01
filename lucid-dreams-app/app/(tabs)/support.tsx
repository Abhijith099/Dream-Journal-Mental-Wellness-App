import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { authenticatedFetch as fetch, BACKEND_URL } from "../../utils/api";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Anchor, ShieldAlert, PhoneCall, AlertCircle, RotateCcw, ChevronRight, Key } from "lucide-react-native";
import { Colors, Fonts } from "@/constants/theme";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const SHOW_SAFE_SPACE = false;

interface SupportResource {
  _id: string;
  title: string;
  description: string;
  contactMethod: string;
  region?: string;
}

const FALLBACK_RESOURCES: SupportResource[] = [
  {
    _id: "1",
    title: "Crisis Text Line",
    description: "Free, 24/7 crisis support via text message.",
    contactMethod: "Text HOME to 741741",
    region: "Global",
  },
  {
    _id: "2",
    title: "iCall",
    description: "Free, confidential counselling by trained mental health professionals.",
    contactMethod: "Call 9152987821",
    region: "India",
  },
  {
    _id: "3",
    title: "Kiran Mental Health Helpline",
    description: "Government helpline for free mental health rehabilitation.",
    contactMethod: "Call 1800-599-0019",
    region: "India · 24/7",
  },
  {
    _id: "4",
    title: "Night-to-Day Transition",
    description: "Use the 5-4-3-2-1 sensory method to anchor yourself back to physical reality when dream imagery feels too heavy.",
    contactMethod: "Self-Guided",
    region: "Global",
  },
  {
    _id: "5",
    title: "Post-Nightmare Reset",
    description: "A physiological rhythm regulator to lower your heart rate after waking from a distressing dream.",
    contactMethod: "Self-Guided",
    region: "Global",
  },
];

function AnimatedSection({
  index,
  focusKey,
  children,
  style,
}: {
  index: number;
  focusKey: number;
  children: React.ReactNode;
  style?: any;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 12;
    const delay = index * 80;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, [focusKey, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

function StaggeredCard({
  children,
  onPress,
  style,
  isGlass = true,
  index,
  focusKey,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  isGlass?: boolean;
  index?: number;
  focusKey?: number;
}) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const CardContainer = isGlass ? AnimatedBlurView : Animated.View;
  const containerProps = isGlass ? { intensity: 60, tint: "light" as any } : {};

  return (
    <CardContainer {...containerProps} style={[isGlass ? styles.glassCardWrapper : styles.cardWrapper, style, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={{ flex: 1 }}
      >
        <View style={styles.cardInner}>
          {children}
        </View>
      </TouchableOpacity>
    </CardContainer>
  );
}

export default function SupportScreen() {
  const router = useRouter();
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusKey((prev) => prev + 1);
    }, [])
  );

  const fetchResources = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/dreams/support/resources`);
      if (!res.ok) {
        setResources(FALLBACK_RESOURCES);
        return;
      }
      const data = await res.json();
      if (data && data.length > 0) {
        setResources(data);
      } else {
        setResources(FALLBACK_RESOURCES);
      }
    } catch (err) {
      console.error("Error fetching support resources:", err);
      setResources(FALLBACK_RESOURCES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [focusKey]);

  const handleAction = (resource: SupportResource) => {
    const method = resource.contactMethod;
    if (method.startsWith("Text ")) {
      const msg = method.replace("Text ", "");
      const [body, number] = msg.split(" to ");
      Linking.openURL(`sms:${number}?body=${encodeURIComponent(body)}`);
    } else if (method.startsWith("Call ")) {
      const num = method.replace("Call or text ", "").replace("Call ", "");
      Linking.openURL(`tel:${num}`);
    } else if (method === "988") {
      Linking.openURL("tel:988");
    }
  };

  const isWeb = Platform.OS === "web";
  
  const crisisResources = resources.filter(r => r.contactMethod !== "Self-Guided");
  const selfGuided = resources.filter(r => r.contactMethod === "Self-Guided");

  // Order exercises: Post-Nightmare Reset first (element 4 / index 3), Night-to-Day Transition second (element 5 / index 4)
  const orderedSelfGuided = [...selfGuided].sort((a, b) => {
    const aIsReset = a.title.includes("Reset") || a.title.includes("Breathing");
    const bIsReset = b.title.includes("Reset") || b.title.includes("Breathing");
    if (aIsReset && !bIsReset) return -1;
    if (!aIsReset && bIsReset) return 1;
    return 0;
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 0: Page Title */}
        <AnimatedSection index={0} focusKey={focusKey} style={styles.headerContainer}>
          <Text style={styles.statusLabel}>SYSTEM SAFEGUARD</Text>
          <View style={styles.titleRow}>
            <Text style={[styles.header, { color: "#3A2E5B" }]}>Support & </Text>
            <Text style={[styles.header, { color: "#8069BF" }]}>Grounding</Text>
          </View>
          <Text style={styles.subtitle}>
            Quiet exercises and connections when waking life feels heavy or disorienting.
          </Text>
        </AnimatedSection>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color="#8069BF" />
          </View>
        ) : (
          <View style={styles.contentBody}>
            
            {/* Section 1: Crisis Resources Row */}
            <AnimatedSection index={1} focusKey={focusKey} style={styles.gridContainer}>
              {crisisResources.map((item, index) => {
                const isTextLine = item.title.includes("Text Line");
                const borderStyle = isTextLine ? styles.borderAmber : styles.borderPurple;
                return (
                  <StaggeredCard
                    key={item._id || index}
                    style={[styles.gridCard, borderStyle]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        {isTextLine ? (
                          <AlertCircle size={16} color="#2D2D2D" strokeWidth={1.5} style={styles.icon} />
                        ) : (
                          <PhoneCall size={16} color="#2D2D2D" strokeWidth={1.5} style={styles.icon} />
                        )}
                        <Text style={styles.crisisTitle} numberOfLines={2}>{item.title}</Text>
                      </View>
                      {item.region && (
                        <View style={styles.regionBadge}>
                          <Text style={styles.regionLabel}>{item.region}</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.resourceDesc}>{item.description}</Text>
                    
                    <TouchableOpacity 
                      style={styles.actionFooter} 
                      onPress={() => handleAction(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionText}>{item.contactMethod}</Text>
                      {isTextLine ? (
                        <ChevronRight size={14} color="#2D2D2D" strokeWidth={1.5} />
                      ) : (
                        <PhoneCall size={16} color="#2D2D2D" strokeWidth={1.5} />
                      )}
                    </TouchableOpacity>
                  </StaggeredCard>
                );
              })}
            </AnimatedSection>

            {/* Section 2: Self-Guided Practice Label */}
            <AnimatedSection index={2} focusKey={focusKey} style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionHeaderTitle}>Self-Guided Practice</Text>
            </AnimatedSection>
            
            {/* Section 3 & 4: Exercise Cards */}
            <View style={styles.listContainer}>
              {orderedSelfGuided.map((item, index) => {
                const isGrounding = item.title.includes("Grounding") || item.title.includes("Transition");
                return (
                  <AnimatedSection
                    key={item._id || index}
                    index={index + 3}
                    focusKey={focusKey}
                    style={styles.listCard}
                  >
                    <StaggeredCard
                      onPress={() => {
                        if (isGrounding) {
                          router.push('/wellness/grounding');
                        } else {
                          router.push('/wellness/breathing');
                        }
                      }}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                          {isGrounding ? (
                            <Anchor size={16} color="#8069BF" strokeWidth={1.5} style={styles.icon} />
                          ) : (
                            <RotateCcw size={16} color="#8069BF" strokeWidth={1.5} style={styles.icon} />
                          )}
                          <Text style={styles.resourceTitle} numberOfLines={1}>{item.title}</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.resourceDesc}>{item.description}</Text>
                      
                      <View style={[styles.actionFooter, { backgroundColor: 'transparent', paddingHorizontal: 0, paddingBottom: 0 }]}>
                        <Text style={styles.footerLabel}>
                          {isGrounding ? "Reality anchor" : "Physiological reset"}
                        </Text>
                        <ChevronRight size={14} color="#8A8A8A" strokeWidth={1.5} />
                      </View>
                    </StaggeredCard>
                  </AnimatedSection>
                );
              })}
            </View>

            {/* Enter Safe Space */}
            {SHOW_SAFE_SPACE && (
              <View style={{ marginTop: 20 }}>
                <StaggeredCard
                  index={5}
                  focusKey={focusKey}
                  style={styles.safeSpaceCard}
                  isGlass={false}
                  onPress={() => router.push('/SafeSpace')}
                >
                  <View style={styles.safeSpaceContent}>
                    <View style={styles.keyIconContainer}>
                      <Key size={24} color="#8069BF" strokeWidth={1.5} />
                    </View>
                    <Text style={styles.safeSpaceTitle}>Enter Safe Space</Text>
                    <Text style={styles.safeSpaceDesc}>
                      A secure, distraction-free environment to process thoughts when you need absolute quiet.
                    </Text>
                  </View>
                </StaggeredCard>
              </View>
            )}

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassCardWrapper: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  listContainer: {
    flexDirection: "column",
    marginBottom: 24,
    gap: 12,
  },
  listCard: {
    width: "100%",
  },
  crisisTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "#D32F2F", // Strong contrast for crisis
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#FAF9FC",
  },
  scrollContent: {
    paddingBottom: 130,
  },
  headerContainer: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: "#8A8A8A",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  header: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: "#8A8A8A",
    lineHeight: 20,
    marginTop: 8,
  },
  centerContainer: {
    paddingVertical: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  contentBody: {
    paddingHorizontal: 20,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  cardWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  gridCard: {
    width: "48%",
    flexGrow: 1,
  },
  borderAmber: {
    borderLeftWidth: 3,
    borderLeftColor: "#C9A74D",
  },
  borderPurple: {
    borderLeftWidth: 3,
    borderLeftColor: "#8069BF",
  },
  cardInner: {
    padding: 16,
    flex: 1,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
  resourceTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
    flexShrink: 1,
  },
  regionBadge: {
    backgroundColor: "rgba(45, 45, 45, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  regionLabel: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
  },
  resourceDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "#8A8A8A",
    lineHeight: 18,
    marginBottom: 16,
  },
  actionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(45, 45, 45, 0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: "auto",
  },
  actionText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: "#2D2D2D",
  },
  sectionHeaderContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#3A2E5B",
    letterSpacing: 1.5,
  },
  footerLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: "#8A8A8A",
  },
  safeSpaceCard: {
    width: "100%",
    padding: 8,
  },
  safeSpaceContent: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  keyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0EEF8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  safeSpaceTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#2D2D2D",
    marginBottom: 8,
  },
  safeSpaceDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "#8A8A8A",
    textAlign: "center",
    lineHeight: 20,
  },
});
