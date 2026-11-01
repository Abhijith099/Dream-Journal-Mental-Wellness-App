const fs = require('fs');
const path = require('path');

const tsxContent = `import { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  useWindowDimensions,
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
import { Plus, Minus, Sparkles, ShieldAlert, Wind, Brain, HelpCircle, CircleDashed, Activity, Settings, Footprints, Moon } from "lucide-react-native";
import { Svg, Circle as SvgCircle, Defs, RadialGradient, Stop } from "react-native-svg";
import { Colors, Fonts } from "@/constants/theme";
import { useAuth } from "../../context/AuthContext";
import { authenticatedFetch, BACKEND_URL } from "../../utils/api";

const { width: screenWidth } = Dimensions.get('window');

const Theme = {
  accentBlue: '#4A7FFF',
  accentCoral: '#FF7A59',
  textPrimary: '#1A1D29',
  textSecondary: '#6B7280',
  cardBg: '#FFFFFF',
};

const LOCAL_REFLECTIONS = [
  "You don't have to solve everything today. Focus on what needs you right now.",
  "Take it one step at a time. A slow step is still a step forward.",
  "You are allowed to pause. Resting doesn't mean you're giving up.",
  "You don't need to have everything figured out right now.",
  "Some days are about moving forward. Some days are simply about getting through.",
  "One bad day, one mistake, or one failure doesn't define who you are.",
  "You are more than your grades, achievements, or mistakes.",
  "Not being where you want to be yet doesn't mean you won't get there.",
  "You can be disappointed in yourself without being cruel to yourself.",
  "You don't have to pretend you're okay. Give yourself permission to feel what you feel.",
  "This moment is difficult, but you don't have to figure out your whole life tonight.",
  "Be patient with yourself. You're doing the best you can with what you have today.",
  "You deserve the same kindness from yourself that you would give to someone you care about.",
  "Pressure makes everything feel urgent. Take a breath and deal with one thing at a time.",
  "You don't have to meet every expectation placed on you.",
  "Your worth isn't measured by how much you accomplish in a day.",
  "It's okay to ask for help when things feel too heavy to carry alone.",
  "Just get through today. Tomorrow can wait.",
  "You are allowed to take things slowly.",
  "One step. One breath. One moment at a time.",
  "You haven't failed. You're still figuring things out.",
  "It's okay to rest. You don't have to earn it."
];

const pluralizeSymbol = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.endsWith('s')) return name;
  if (lower === 'water' || lower === 'rain' || lower === 'fire' || lower === 'darkness' || lower === 'light') {
    return \`\${name} has\`;
  }
  return \`\${name}s have\`;
};

// --- Cloud Background Layer ---
function Cloud({ width, height, top, startOffset, speedMs }: any) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: speedMs, easing: Easing.linear }),
      -1,
      false
    );
  }, [speedMs]);
  
  const animatedStyle = useAnimatedStyle(() => {
    const totalDist = screenWidth + width + 100;
    const current = (progress.value * totalDist + startOffset) % totalDist;
    return {
      transform: [{ translateX: current - width - 50 }]
    };
  });

  return (
    <Animated.View style={[{
      position: 'absolute',
      top,
      width,
      height,
      backgroundColor: 'rgba(255,255,255,0.25)', 
      borderRadius: 100,
    }, animatedStyle]}>
      <View style={{ width: width * 0.5, height: width * 0.5, borderRadius: width * 0.25, backgroundColor: 'rgba(255,255,255,0.25)', position: 'absolute', top: -height * 0.3, left: width * 0.1 }} />
      <View style={{ width: width * 0.4, height: width * 0.4, borderRadius: width * 0.2, backgroundColor: 'rgba(255,255,255,0.25)', position: 'absolute', top: -height * 0.1, right: width * 0.1 }} />
    </Animated.View>
  );
}

function CloudLayer() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Cloud width={260} height={70} top={80} startOffset={300} speedMs={90000} />
      <Cloud width={210} height={60} top={190} startOffset={800} speedMs={110000} />
      <Cloud width={160} height={50} top={350} startOffset={100} speedMs={75000} />
      <Cloud width={130} height={40} top={500} startOffset={500} speedMs={85000} />
      <Cloud width={110} height={36} top={280} startOffset={0} speedMs={65000} />
    </View>
  );
}

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

export default function TodayScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [reflection, setReflection] = useState(LOCAL_REFLECTIONS[0]);
  const [loadingReflection, setLoadingReflection] = useState(true);
  const [teaserSymbol, setTeaserSymbol] = useState<{ symbol: string; count: number } | null>(null);
  const [recentDreamDate, setRecentDreamDate] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);

  const { user } = useAuth();
  const displayName = user?.name || "Dreamer";
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [steps, setSteps] = useState(0);

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
      const res = await authenticatedFetch(\`\${BACKEND_URL}/vitals/today\`);
      const data = await res.json();
      setSleepMinutes(data.sleepMinutes || 0);
      setSteps(data.steps || 0);
    } catch (err) {
      console.error("Error fetching today's vitals:", err);
    }
  }, []);

  const handleUpdateVitals = async (field: 'sleepMinutes' | 'steps', delta: number) => {
    try {
      const res = await authenticatedFetch(\`\${BACKEND_URL}/vitals/today\`, {
        method: "PATCH",
        body: JSON.stringify({ field, delta })
      });
      const data = await res.json();
      if (field === 'sleepMinutes') {
        setSleepMinutes(data.sleepMinutes ?? 0);
      } else {
        setSteps(data.steps ?? 0);
      }
    } catch (err) {
      console.error("Error patching vitals:", err);
    }
  };

  const handlePressIn = (field: 'sleepMinutes' | 'steps', delta: number) => {
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

  const fetchPatternTeaser = useCallback(async () => {
    try {
      const res = await authenticatedFetch(\`\${BACKEND_URL}/dreams/recent?filter=all&limit=5\`);
      const data = await res.json();
      if (Array.isArray(data) && data.length >= 3) {
        const symbolCounts: { [key: string]: number } = {};
        data.forEach((dream) => {
          if (dream.symbols && Array.isArray(dream.symbols)) {
            dream.symbols.forEach((sym: string) => {
              const clean = sym.charAt(0).toUpperCase() + sym.slice(1).toLowerCase().trim();
              symbolCounts[clean] = (symbolCounts[clean] || 0) + 1;
            });
          }
        });
        let maxSymbol = "";
        let maxCount = 0;
        for (const [sym, count] of Object.entries(symbolCounts)) {
          if (count > maxCount) {
            maxSymbol = sym;
            maxCount = count;
          }
        }
        if (maxCount >= 3) {
          setTeaserSymbol({ symbol: maxSymbol, count: maxCount });
        } else {
          setTeaserSymbol(null);
        }
      } else {
        setTeaserSymbol(null);
      }
    } catch (err) {
      console.error("Error fetching pattern teaser:", err);
      setTeaserSymbol(null);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    await Promise.all([
      fetchReflection(),
      fetchPatternTeaser(),
      fetchTodayVitals(),
      fetchRecentDream(),
    ]);
  }, [fetchReflection, fetchPatternTeaser, fetchTodayVitals, fetchRecentDream]);

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
        colors={['#EAF3FB', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />
      <CloudLayer />
      
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ width: '100%', paddingHorizontal: 20, paddingBottom: 140 }} 
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
            {/* Header decoration */}
            <Svg height="150" width="150" style={styles.headerGlow} pointerEvents="none">
              <Defs>
                <RadialGradient id="grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <Stop offset="0%" stopColor={Theme.accentBlue} stopOpacity="0.15" />
                  <Stop offset="100%" stopColor={Theme.accentBlue} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <SvgCircle cx="75" cy="75" r="75" fill="url(#grad)" />
            </Svg>
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
          <View style={[styles.premiumCard, styles.groundingCard]}>
            <View style={styles.groundingHeader}>
              <Sparkles size={14} color={Theme.textPrimary} />
              <Text style={styles.groundingLabel}>Daily Grounding</Text>
            </View>
            <View style={{ minHeight: 30, justifyContent: 'center' }}>
              {loadingReflection ? (
                <ActivityIndicator size="small" color={Theme.textPrimary} style={{ alignSelf: 'flex-start' }} />
              ) : (
                <Text style={styles.groundingText}>
                  {reflection}
                </Text>
              )}
            </View>
          </View>
        </StaggeredSection>

        {/* Primary CTA (Record a Dream) */}
        <StaggeredSection index={2} focusKey={focusKey}>
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

        {/* Vitality Bento Grid */}
        <StaggeredSection index={3} focusKey={focusKey}>
          <View style={styles.bentoRow}>
            {/* Left Card: Sleep */}
            <View style={styles.premiumCardHalf}>
              <View style={styles.vitalsBadgeRow}>
                <View style={[styles.iconBadge, { backgroundColor: Theme.accentBlue }]}>
                  <Moon size={20} color="#FFFFFF" strokeWidth={2} />
                </View>
                <View style={styles.progressRingWrapper}>
                  <Svg width={40} height={40} viewBox="0 0 40 40">
                    <SvgCircle cx={20} cy={20} r={18} stroke="#F0F4F8" strokeWidth={4} fill="none" />
                    <SvgCircle
                      cx={20} cy={20} r={18}
                      stroke={Theme.accentBlue} strokeWidth={4} fill="none"
                      strokeDasharray={113}
                      strokeDashoffset={Math.max(0, 113 - (Math.min(sleepMinutes, 480) / 480) * 113)}
                      strokeLinecap="round" transform="rotate(-90 20 20)"
                    />
                  </Svg>
                </View>
              </View>
              <Text style={styles.bentoLabel}>Rest & Recovery</Text>
              <View style={styles.vitalsControls}>
                <TouchableOpacity activeOpacity={0.7} onPressIn={() => handlePressIn('sleepMinutes', -15)} onPressOut={handlePressOut} style={styles.vitalsCircleBtn}>
                  <Minus size={14} color={Theme.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.vitalsValueText}>{formatSleep(sleepMinutes)}</Text>
                <TouchableOpacity activeOpacity={0.7} onPressIn={() => handlePressIn('sleepMinutes', 15)} onPressOut={handlePressOut} style={styles.vitalsCircleBtn}>
                  <Plus size={14} color={Theme.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Right Card: Steps */}
            <View style={styles.premiumCardHalf}>
              <View style={styles.vitalsBadgeRow}>
                <View style={[styles.iconBadge, { backgroundColor: Theme.accentCoral }]}>
                  <Footprints size={20} color="#FFFFFF" strokeWidth={2} />
                </View>
                <View style={styles.progressRingWrapper}>
                  <Svg width={40} height={40} viewBox="0 0 40 40">
                    <SvgCircle cx={20} cy={20} r={18} stroke="#F8F0EF" strokeWidth={4} fill="none" />
                    <SvgCircle
                      cx={20} cy={20} r={18}
                      stroke={Theme.accentCoral} strokeWidth={4} fill="none"
                      strokeDasharray={113}
                      strokeDashoffset={Math.max(0, 113 - (Math.min(steps, 10000) / 10000) * 113)}
                      strokeLinecap="round" transform="rotate(-90 20 20)"
                    />
                  </Svg>
                </View>
              </View>
              <Text style={styles.bentoLabel}>Gentle Movement</Text>
              <View style={styles.vitalsControls}>
                <TouchableOpacity activeOpacity={0.7} onPressIn={() => handlePressIn('steps', -500)} onPressOut={handlePressOut} style={styles.vitalsCircleBtn}>
                  <Minus size={14} color={Theme.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.vitalsValueText}>{steps}</Text>
                <TouchableOpacity activeOpacity={0.7} onPressIn={() => handlePressIn('steps', 500)} onPressOut={handlePressOut} style={styles.vitalsCircleBtn}>
                  <Plus size={14} color={Theme.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </StaggeredSection>

        {/* Continuity Indicator */}
        <StaggeredSection index={4} focusKey={focusKey} style={styles.continuityContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: "/explore", params: { tab: "memories" } } as any)}
          >
            <Text style={styles.continuityText}>{getContinuityText()}</Text>
          </TouchableOpacity>
        </StaggeredSection>

        {/* Actionable Tools */}
        <StaggeredSection index={5} focusKey={focusKey}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalToolsGrid}>
            {TOOLS.map((tool, idx) => {
              const Icon = tool.icon;
              const badgeColor = idx % 2 === 0 ? Theme.accentBlue : Theme.accentCoral;
              return (
                <TouchableOpacity
                  key={tool.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(tool.route as any)}
                  style={styles.premiumToolCard}
                >
                  <View style={[styles.toolIconBadge, { backgroundColor: badgeColor }]}>
                    <Icon size={22} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <View style={styles.toolTextContainer}>
                    <Text style={styles.toolTitle} numberOfLines={1}>{tool.title}</Text>
                    <Text style={styles.toolSubtitle} numberOfLines={1}>{tool.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </StaggeredSection>

        {/* Pattern Teaser Card (Conditional) */}
        {teaserSymbol && (
          <StaggeredSection index={6} focusKey={focusKey}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/insights")}
              style={[styles.premiumCard, { marginBottom: 20 }]}
            >
              <View style={styles.groundingHeader}>
                <Sparkles size={14} color={Theme.textPrimary} />
                <Text style={styles.groundingLabel}>NOTICED THIS WEEK</Text>
              </View>
              <View style={{ minHeight: 40, justifyContent: 'center' }}>
                <Text style={styles.groundingText}>
                  {pluralizeSymbol(teaserSymbol.symbol)} appeared in {teaserSymbol.count} of your last 5 dreams.
                </Text>
              </View>
            </TouchableOpacity>
          </StaggeredSection>
        )}

        {/* Quiet Support Link */}
        <StaggeredSection index={7} focusKey={focusKey} style={styles.supportLinkContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/support")}
          >
            <Text style={styles.supportLinkText}>Need to talk to someone?</Text>
          </TouchableOpacity>
        </StaggeredSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.cardBg, // fallback
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
    position: 'relative',
    justifyContent: 'center',
  },
  headerGlow: {
    position: 'absolute',
    top: -45,
    left: -40,
  },
  headerSafetyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: Theme.accentBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  greetingMain: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Theme.textPrimary,
    letterSpacing: -0.5,
  },
  premiumCard: {
    backgroundColor: Theme.cardBg,
    borderRadius: 26,
    padding: 20,
    marginBottom: 20,
    shadowColor: Theme.accentBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    width: '100%',
  },
  groundingCard: {
    backgroundColor: Colors.light.cardSand,
  },
  groundingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  groundingLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Theme.textPrimary,
    letterSpacing: 0.5,
  },
  groundingText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Theme.textPrimary,
    lineHeight: 22,
    opacity: 0.85,
  },
  primaryCTA: {
    backgroundColor: Theme.accentBlue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    paddingVertical: 18,
    marginBottom: 20,
    gap: 8,
    shadowColor: Theme.accentBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
    width: '100%',
  },
  primaryCTAText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  bentoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
    width: '100%',
  },
  premiumCardHalf: {
    flex: 1,
    backgroundColor: Theme.cardBg,
    borderRadius: 26,
    padding: 18,
    justifyContent: 'space-between',
    shadowColor: Theme.accentBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    minHeight: 150,
  },
  vitalsBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingWrapper: {
    opacity: 0.8,
  },
  bentoLabel: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Theme.textSecondary,
    marginBottom: 6,
  },
  vitalsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vitalsCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalsValueText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Theme.textPrimary,
  },
  continuityContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  continuityText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Theme.textSecondary,
    textDecorationLine: 'underline',
  },
  horizontalToolsGrid: {
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  premiumToolCard: {
    width: 140,
    height: 150,
    borderRadius: 24,
    backgroundColor: Theme.cardBg,
    shadowColor: Theme.accentBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
    padding: 16,
    justifyContent: 'space-between',
  },
  toolIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
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
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Theme.textSecondary,
  },
  supportLinkContainer: {
    alignItems: "center",
    marginTop: 24,
    paddingVertical: 10,
    width: '100%',
  },
  supportLinkText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Theme.textSecondary,
    textDecorationLine: "underline",
  },
});
`;

fs.writeFileSync(path.join(__dirname, 'update_index.js'), tsxContent);
