const fs = require('fs');

const fileContent = `import { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Plus, Minus, Sparkles, ShieldAlert, Wind, Brain, HelpCircle, CircleDashed, Activity, Settings, Footprints, Moon, Cloud, Sun, CloudRain } from "lucide-react-native";
import { Svg, Circle as SvgCircle, Defs, RadialGradient, Stop, Path } from "react-native-svg";
import { Colors, Fonts } from "@/constants/theme";
import { useAuth } from "../../context/AuthContext";
import { authenticatedFetch, BACKEND_URL } from "../../utils/api";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Theme = {
  accentBlue: Colors.light.cardSky,
  accentCoral: Colors.light.cardMint,
  textPrimary: '#2D2D2D',
  textSecondary: '#8A9A9D',
};

const CardTints = {
  grounding: '#EBE5D9',
  recovery: '#D2DFE6',
  weather: '#D4E0D0',
  tools: ['#EBE5D9', '#D2DFE6', '#D4E0D0']
};

const LOCAL_REFLECTIONS = [
  "You don't have to solve everything today. Focus on what needs you right now.",
  "Take it one step at a time. A slow step is still a step forward.",
  "You are allowed to pause. Resting doesn't mean you're giving up.",
  "You don't need to have everything figured out right now.",
  "Some days are about moving forward. Some days are simply about getting through.",
];

function StaggeredSection({ index, focusKey, children, style }: { index: number; focusKey: number; children: React.ReactNode; style?: any }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 12;
    const delay = index * 100;
    opacity.value = withDelay(delay, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }));
  }, [focusKey, index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

function CloudCluster({ fill = "#FFFFFF" }) {
  return (
    <Svg width="250" height="150" viewBox="0 0 250 150">
      <Path d="M40 80 A30 30 0 0 1 90 50 A40 40 0 0 1 160 50 A30 30 0 0 1 200 80 Z" fill={fill} opacity={0.85} />
      <Path d="M20 100 A25 25 0 0 1 60 70 A35 35 0 0 1 120 70 A25 25 0 0 1 160 100 Z" fill={fill} opacity={0.95} />
      <Path d="M80 110 A35 35 0 0 1 140 80 A45 45 0 0 1 210 80 A35 35 0 0 1 240 110 Z" fill={fill} opacity={0.75} />
      <Path d="M10 110 A20 20 0 0 1 40 90 A25 25 0 0 1 90 90 A20 20 0 0 1 110 110 Z" fill={fill} opacity={0.9} />
    </Svg>
  );
}

function AnimatedClouds() {
  const cloud1X = useSharedValue(-300);
  const cloud2X = useSharedValue(screenWidth);
  const cloud3X = useSharedValue(-250);

  useEffect(() => {
    cloud1X.value = withRepeat(withTiming(screenWidth + 300, { duration: 30000, easing: Easing.linear }), -1, false);
    cloud2X.value = withRepeat(withTiming(-350, { duration: 45000, easing: Easing.linear }), -1, false);
    cloud3X.value = withRepeat(withTiming(screenWidth + 300, { duration: 60000, easing: Easing.linear }), -1, false);
  }, [cloud1X, cloud2X, cloud3X]);

  const style1 = useAnimatedStyle(() => ({ transform: [{ translateX: cloud1X.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ translateX: cloud2X.value }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ translateX: cloud3X.value }] }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', top: screenHeight * 0.05 }, style1]}>
        <CloudCluster />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: screenHeight * 0.25 }, style2]}>
        <CloudCluster />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: screenHeight * 0.45 }, style3]}>
        <CloudCluster />
      </Animated.View>
    </View>
  );
}

export default function TodayScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [reflection, setReflection] = useState(LOCAL_REFLECTIONS[0]);
  const [loadingReflection, setLoadingReflection] = useState(true);
  const [recentDreamDate, setRecentDreamDate] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);

  const { user } = useAuth();
  const displayName = user?.name || "Dreamer";
  const [sleepMinutes, setSleepMinutes] = useState(0);

  const ctaScale = useSharedValue(1);

  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  useFocusEffect(
    useCallback(() => {
      setFocusKey((prev) => prev + 1);
    }, [])
  );

  useEffect(() => {
    ctaScale.value = withRepeat(
      withTiming(1.02, { duration: 1500 }),
      -1,
      true
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const fetchTodayVitals = useCallback(async () => {
    try {
      const res = await authenticatedFetch(\`\${BACKEND_URL}/wellness/today\`);
      const data = await res.json();
      setSleepMinutes(data.sleepMinutes || 0);
    } catch (err) {
      console.error("Error fetching today's vitals:", err);
    }
  }, []);

  const handleUpdateVitals = async (field: 'sleepMinutes', delta: number) => {
    try {
      const res = await authenticatedFetch(\`\${BACKEND_URL}/wellness/today\`, {
        method: "PATCH",
        body: JSON.stringify({ field, delta })
      });
      const data = await res.json();
      if (field === 'sleepMinutes') {
        setSleepMinutes(data.sleepMinutes ?? 0);
      }
    } catch (err) {
      console.error("Error patching vitals:", err);
    }
  };

  const handlePressIn = (field: 'sleepMinutes', delta: number) => {
    handleUpdateVitals(field, delta);
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        handleUpdateVitals(field, delta);
      }, 150);
    }, 500);
  };

  const handlePressOut = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleMoodSubmit = async (mood: string) => {
    try {
      await authenticatedFetch(\`\${BACKEND_URL}/mood-checkins\`, {
        method: "POST",
        body: JSON.stringify({ mood })
      });
    } catch (err) {
      console.error("Error logging mood:", err);
    }
  };

  const fetchReflection = useCallback(async () => {
    try {
      setLoadingReflection(true);
      const res = await authenticatedFetch(\`\${BACKEND_URL}/reflections/today\`);
      const data = await res.json();
      if (data && data.text) {
        setReflection(data.text);
      }
    } catch (err) {
      console.error("Error fetching today's reflection:", err);
      const day = new Date().getDate();
      setReflection(LOCAL_REFLECTIONS[day % LOCAL_REFLECTIONS.length]);
    } finally {
      setLoadingReflection(false);
    }
  }, []);

  const fetchRecentDream = useCallback(async () => {
    try {
      const res = await authenticatedFetch(\`\${BACKEND_URL}/dreams/recent?filter=all&limit=1\`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].createdAt) {
        setRecentDreamDate(data[0].createdAt);
      } else {
        setRecentDreamDate(null);
      }
    } catch (err) {
      console.error("Error fetching recent dream:", err);
      setRecentDreamDate(null);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    await Promise.all([
      fetchReflection(),
      fetchTodayVitals(),
      fetchRecentDream(),
    ]);
  }, [fetchReflection, fetchTodayVitals, fetchRecentDream]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData, focusKey]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData().finally(() => setRefreshing(false));
  }, [loadAllData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return \`Good morning, \${displayName}\`;
    if (hour < 17) return \`Good afternoon, \${displayName}\`;
    return \`Good evening, \${displayName}\`;
  };

  const formatSleep = (totalMinutes: number) => {
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return \`\${hrs}h \${mins}m\`;
  };

  const getContinuityText = () => {
    if (!recentDreamDate) return "No dreams logged yet";
    const diffMs = new Date().getTime() - new Date(recentDreamDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Last logged today";
    if (diffDays === 1) return "Last logged 1 day ago";
    return \`Last logged \${diffDays} days ago\`;
  };

  const TOOLS = [
    { id: 'breathing', title: 'Release Tension', subtitle: 'Guided breathing', icon: Wind, route: '/wellness/breathing' },
    { id: 'smallWins', title: 'Log a Micro-Win', subtitle: 'One small action', icon: Sparkles, route: { pathname: "/explore", params: { tab: "wellness", subTab: "smallWins" } } },
    { id: 'shredder', title: 'Thought Shredder', subtitle: 'Write it out, let it go', icon: Brain, route: '/wellness/shredder' },
    { id: 'quiz', title: 'Quiz', subtitle: 'A quick distraction', icon: HelpCircle, route: '/games/quiz' },
    { id: 'find-the-ball', title: 'Find the Ball', subtitle: 'Quick concentration game', icon: CircleDashed, route: '/games/find-the-ball' },
    { id: 'exercises', title: 'Exercises', subtitle: 'Gentle movement', icon: Activity, route: '/exercises' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#B8D4EA', '#DCE9F2', '#F6F0EA']}
        style={StyleSheet.absoluteFill}
      />
      <AnimatedClouds />
      
      <ScrollView
        style={{ flex: 1, width: '100%', zIndex: 1 }}
        contentContainerStyle={{ width: '100%', paddingHorizontal: 20, paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Theme.textPrimary}
          />
        }
      >
        {/* Header Greeting */}
        <StaggeredSection index={0} focusKey={focusKey} style={styles.headerContainer}>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.greetingMain}>{getGreeting()}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/safety-plan")} style={styles.headerSafetyBtn}>
              <ShieldAlert size={20} color={Theme.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/profile")} style={styles.headerSafetyBtn}>
              <Settings size={20} color={Theme.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </StaggeredSection>

        {/* Daily Grounding Widget */}
        <StaggeredSection index={1} focusKey={focusKey}>
          <View style={[styles.coloredCardWrapper, { backgroundColor: CardTints.grounding }]}>
            <BlurView tint="light" intensity={25} style={styles.glassCard}>
              <View style={styles.groundingHeader}>
                <Sparkles size={14} color={Theme.textPrimary} />
                <Text style={styles.sectionLabel}>Daily Grounding</Text>
              </View>
              <View style={{ minHeight: 30, justifyContent: 'center' }}>
                {loadingReflection ? (
                  <ActivityIndicator size="small" color={Theme.textPrimary} style={{ alignSelf: 'flex-start' }} />
                ) : (
                  <Text style={styles.bodyText}>
                    {reflection}
                  </Text>
                )}
              </View>
            </BlurView>
          </View>
        </StaggeredSection>

        {/* Rest & Recovery */}
        <StaggeredSection index={2} focusKey={focusKey}>
          <View style={[styles.coloredCardWrapper, { backgroundColor: CardTints.recovery }]}>
            <BlurView tint="light" intensity={25} style={styles.glassCard}>
               <View style={styles.groundingHeader}>
                <Moon size={14} color={Theme.textPrimary} />
                <Text style={styles.sectionLabel}>Rest & Recovery</Text>
              </View>
              <View style={styles.vitalsControls}>
                <TouchableOpacity activeOpacity={0.7} onPressIn={() => handlePressIn('sleepMinutes', -15)} onPressOut={handlePressOut} style={styles.vitalsCircleBtn}>
                  <Minus size={14} color={Theme.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.vitalsValueText}>{formatSleep(sleepMinutes)}</Text>
                  <Text style={styles.vitalsSubText}>sleep logged</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7} onPressIn={() => handlePressIn('sleepMinutes', 15)} onPressOut={handlePressOut} style={styles.vitalsCircleBtn}>
                  <Plus size={14} color={Theme.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </StaggeredSection>

        {/* Internal Weather */}
        <StaggeredSection index={3} focusKey={focusKey}>
          <View style={[styles.coloredCardWrapper, { backgroundColor: CardTints.weather }]}>
            <BlurView tint="light" intensity={25} style={styles.glassCard}>
               <View style={styles.groundingHeader}>
                <Sun size={14} color={Theme.textPrimary} />
                <Text style={styles.sectionLabel}>Current State</Text>
              </View>
              <View style={styles.weatherPillsRow}>
                {['Clear', 'Foggy', 'Heavy'].map((state) => (
                  <TouchableOpacity 
                    key={state} 
                    style={styles.weatherPill}
                    onPress={() => handleMoodSubmit(state)}
                  >
                    <Text style={styles.weatherPillText}>{state}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </BlurView>
          </View>
        </StaggeredSection>

        {/* Primary CTA (Record a Dream) */}
        <StaggeredSection index={4} focusKey={focusKey}>
          <Animated.View style={ctaAnimatedStyle}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/add")}
              style={styles.primaryCTA}
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.primaryCTAText}>Record a Dream</Text>
            </TouchableOpacity>
          </Animated.View>
        </StaggeredSection>

        {/* Actionable Tools Carousel */}
        <StaggeredSection index={5} focusKey={focusKey}>
           <ScrollView 
             horizontal 
             showsHorizontalScrollIndicator={false}
             contentContainerStyle={{ gap: 12, paddingVertical: 10, paddingHorizontal: 4 }}
             style={{ marginHorizontal: -4 }}
           >
            {TOOLS.map((tool, idx) => {
              const Icon = tool.icon;
              const tintColor = CardTints.tools[idx % CardTints.tools.length];
              return (
                <TouchableOpacity
                  key={tool.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(tool.route as any)}
                >
                  <View style={[styles.coloredToolWrapper, { backgroundColor: tintColor }]}>
                    <BlurView tint="light" intensity={25} style={styles.glassToolCard}>
                      <View style={styles.toolIconWrapper}>
                        <Icon size={24} color={Theme.textPrimary} strokeWidth={2} />
                      </View>
                      <View style={styles.toolTextContainer}>
                        <Text style={styles.toolTitle} numberOfLines={1}>{tool.title}</Text>
                        <Text style={styles.toolSubtitle} numberOfLines={2}>{tool.subtitle}</Text>
                      </View>
                    </BlurView>
                  </View>
                </TouchableOpacity>
              );
            })}
           </ScrollView>
        </StaggeredSection>

        {/* Continuity Indicator */}
        <StaggeredSection index={6} focusKey={focusKey} style={styles.continuityContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: "/explore", params: { tab: "memories" } } as any)}
          >
            <Text style={styles.continuityText}>{getContinuityText()}</Text>
          </TouchableOpacity>
        </StaggeredSection>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Fallback
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
    width: '100%',
    zIndex: 10,
  },
  headerTextWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  headerSafetyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  greetingMain: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Theme.textPrimary,
    letterSpacing: -0.5,
  },
  coloredCardWrapper: {
    borderRadius: 28,
    marginBottom: 20,
    width: '100%',
    overflow: 'hidden',
  },
  glassCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 28, // Needed for inner BlurView rounding
  },
  groundingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Theme.textPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bodyText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Theme.textPrimary,
    lineHeight: 22,
    opacity: 0.9,
  },
  vitalsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  vitalsCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalsValueText: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Theme.textPrimary,
  },
  vitalsSubText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Theme.textSecondary,
    marginTop: 2,
  },
  weatherPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  weatherPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  weatherPillText: {
    fontFamily: Fonts.semiBold,
    color: Theme.textPrimary,
    fontSize: 14,
  },
  primaryCTA: {
    backgroundColor: '#2D2D2D',
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 18,
    marginBottom: 24,
    marginTop: 4,
    gap: 8,
    shadowColor: '#2D2D2D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    width: '100%',
  },
  primaryCTAText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  coloredToolWrapper: {
    borderRadius: 24,
    width: 140,
    height: 140,
    overflow: 'hidden',
  },
  glassToolCard: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 24, // Inner rounding
  },
  toolIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTextContainer: {
    gap: 4,
  },
  toolTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Theme.textPrimary,
  },
  toolSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Theme.textSecondary,
  },
  continuityContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  continuityText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Theme.textSecondary,
    textDecorationLine: 'underline',
  },
});
`

fs.writeFileSync('C:/Projects/Google_SandBox/Lucid_Dreams_Website/lucid-dreams-app/app/(tabs)/index.tsx', fileContent);
