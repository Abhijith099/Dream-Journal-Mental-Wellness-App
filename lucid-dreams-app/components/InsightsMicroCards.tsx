import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { GitMerge } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';
import { authenticatedFetch, BACKEND_URL } from '../utils/api';

// ----------------------------------------------------
// Type Definitions
// ----------------------------------------------------
export interface DreamToneDay {
  date: string;
  dominantTag: string | null;
  intensity: number;
}

export interface DreamToneResponse {
  days: DreamToneDay[];
  dominantTone: string | null;
}

export interface ScatterPoint {
  x: number;
  y: number;
  date: string;
}

export interface SleepScatterResponse {
  points: ScatterPoint[];
}

export interface SymbolResponse {
  topSymbol: string | null;
  count: number;
  totalDreams: number;
  symbols?: { name: string; count: number }[];
}

export interface LucidRateResponse {
  lucidRate: number;
  totalDreams: number;
  period: string;
}

export interface AiSynthesisResponse {
  synthesis: string | null;
  theme?: string;
  insight?: string;
  totalDreams?: number;
}

// ----------------------------------------------------
// Curated Dream Symbol Meanings
// ----------------------------------------------------
const SYMBOL_MEANINGS: Record<string, string> = {
  water: 'often tied to emotional depth or transition',
  ocean: 'often tied to vast emotional depth or the unconscious',
  flying: 'often linked with liberation, perspective, or desire for control',
  falling: 'often reflects feeling ungrounded or letting go',
  door: 'often signifies new opportunities, choices, or transitions',
  mirror: 'often reflects self-perception, introspection, or hidden truths',
  teeth: 'often connected with communication, vulnerability, or change',
  house: 'often represents the self, psyche, or facets of identity',
  forest: 'often symbolizes exploration, mystery, or the unknown',
  fire: 'often associated with transformation, passion, or intense energy',
  snake: 'often connected to renewal, healing, or instinctual wisdom',
  clock: 'often relates to time awareness, urgency, or life phases',
  shadow: 'often represents the unconscious or unintegrated parts of self',
  bridge: 'often represents life transitions or connecting disparate thoughts',
  mountain: 'often symbolizes overcoming obstacles or inner aspiration',
  bird: 'often tied to freedom, aspiration, or mental clarity',
  sun: 'often connected with vitality, consciousness, and warmth',
  moon: 'often tied to intuition, cyclical rhythms, and the subconscious',
  car: 'often reflects personal agency and life direction',
  path: 'often symbolizes direction, choices, and personal journeys',
};

// ----------------------------------------------------
// Shared Shimmer Loading Component (1.2s subtle loop)
// ----------------------------------------------------
function ShimmerPlaceholder({ height = 60 }: { height?: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.35, 0.85]),
  }));

  return (
    <View style={[styles.shimmerContainer, { height }]}>
      <Animated.View style={[styles.shimmerBox, animStyle]} />
    </View>
  );
}

// ----------------------------------------------------
// Card 1 Animated Bar Component
// ----------------------------------------------------
function AnimatedToneBar({
  targetHeight,
  isStub,
  dayLetter,
  delay,
}: {
  targetHeight: number;
  isStub: boolean;
  dayLetter: string;
  delay: number;
}) {
  const heightVal = useSharedValue(0);

  useEffect(() => {
    heightVal.value = 0;
    heightVal.value = withDelay(
      delay,
      withTiming(targetHeight, { duration: 600, easing: Easing.out(Easing.ease) })
    );
  }, [targetHeight, delay]);

  const animStyle = useAnimatedStyle(() => ({
    height: heightVal.value,
  }));

  return (
    <View style={styles.toneBarCol}>
      <View style={styles.toneBarTrack}>
        <Animated.View
          style={[
            styles.toneBarFill,
            isStub ? styles.toneBarStub : styles.toneBarActive,
            animStyle,
          ]}
        />
      </View>
      <Text style={styles.toneDayLetter}>{dayLetter}</Text>
    </View>
  );
}

// ----------------------------------------------------
// Card 2 Animated Scatter Dot Component
// ----------------------------------------------------
function AnimatedScatterDot({ cx, cy, delay }: { cx: number; cy: number; delay: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
    );
  }, [delay]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.scatterDot,
        {
          left: cx - 4,
          top: cy - 4,
        },
        animStyle,
      ]}
    />
  );
}

// ----------------------------------------------------
// Card 3 Animated Symbol Word Component
// ----------------------------------------------------
function AnimatedSymbolWord({ word }: { word: string }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 6;
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
  }, [word]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.motifWord, animStyle]} numberOfLines={1}>
      {word}
    </Animated.Text>
  );
}

// ----------------------------------------------------
// Card 4 Animated Percentage Count-Up Component
// ----------------------------------------------------
function AnimatedCountUp({ targetValue, duration = 800 }: { targetValue: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(1, elapsed / duration);
      // easeOutQuad curve
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(Math.round(eased * targetValue));

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      }
    };

    animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [targetValue, duration]);

  return <Text style={styles.lucidRateNumber}>{displayValue}%</Text>;
}

// ----------------------------------------------------
// Card 4 Fading Label Component
// ----------------------------------------------------
function FadeInLabel({ delay = 800, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
    );
  }, [delay]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

// ----------------------------------------------------
// Card 5 Subtle 3-Dot Loading Indicator
// ----------------------------------------------------
function ThreeDotLoader() {
  return (
    <View style={styles.threeDotRow}>
      <View style={styles.threeDot} />
      <View style={styles.threeDot} />
      <View style={styles.threeDot} />
    </View>
  );
}

// ----------------------------------------------------
// Main InsightsMicroCards Component
// ----------------------------------------------------
export default function InsightsMicroCards({
  period = 'weekly',
  focusKey = 0,
  paddingHorizontal = 16,
}: {
  period?: 'daily' | 'weekly' | 'monthly';
  focusKey?: number;
  paddingHorizontal?: number;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // State Management for all 5 Cards
  const [toneData, setToneData] = useState<DreamToneResponse | null>(null);
  const [sleepScatter, setSleepScatter] = useState<SleepScatterResponse | null>(null);
  const [symbolData, setSymbolData] = useState<SymbolResponse | null>(null);
  const [lucidData, setLucidData] = useState<LucidRateResponse | null>(null);
  const [aiSynthesis, setAiSynthesis] = useState<AiSynthesisResponse | null>(null);

  // Per-card Loading and Error states
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({
    card1: false,
    card2: false,
    card3: false,
    card4: false,
    card5: false,
  });

  const [cardWidth, setCardWidth] = useState<number>(130);

  // Sparkle icon single gentle rotation (0 -> 360 deg) played once on synthesis load
  const sparkleRot = useSharedValue(0);
  const hasAnimatedSparkle = useRef(false);

  // Safe URL helper avoiding duplicate /api
  const resolveEndpoint = (endpoint: string): string => {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (BACKEND_URL.endsWith('/api') && path.startsWith('/api/')) {
      return `${BACKEND_URL}${path.replace(/^\/api/, '')}`;
    }
    return `${BACKEND_URL}${path}`;
  };

  // Safe HTTP Fetcher
  const safeFetchJson = async <T,>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; status: number; error?: boolean }> => {
    try {
      const url = resolveEndpoint(endpoint);
      const res = await authenticatedFetch(url, options);

      if (res.status === 204) {
        return { data: null, status: 204 };
      }

      if (!res.ok) {
        console.warn(`[InsightsMicroCards] HTTP ${res.status} on ${endpoint}`);
        return { data: null, status: res.status, error: true };
      }

      const text = await res.text();
      if (!text || !text.trim()) {
        return { data: null, status: res.status };
      }

      const parsed = JSON.parse(text) as T;
      return { data: parsed, status: res.status };
    } catch (err) {
      console.error(`[InsightsMicroCards] Fetch error on ${endpoint}:`, err);
      return { data: null, status: 0, error: true };
    }
  };

  // 1. Fetch data for all 5 cards concurrently when period or focusKey changes
  const fetchAllMicroCards = async () => {
    setLoading(true);
    setErrorMap({ card1: false, card2: false, card3: false, card4: false, card5: false });

    try {
      const [toneRes, scatterRes, symbolsRes, lucidRes, aiRes] = await Promise.all([
        // Card 1: 7-Day Dream Tone
        safeFetchJson<DreamToneResponse>('/api/insights/dream-tone-week'),
        // Card 2: Sleep Dream Scatter
        safeFetchJson<SleepScatterResponse>('/api/insights/sleep-dream-scatter'),
        // Card 3: Recurring Theme / Symbols (respects period)
        safeFetchJson<SymbolResponse>(`/api/insights/symbols?period=${period}`),
        // Card 4: Lucid Rate (respects period)
        safeFetchJson<LucidRateResponse>(`/api/insights/lucid-rate?period=${period}`),
        // Card 5: AI Synthesis (POST with period body, respects period)
        safeFetchJson<AiSynthesisResponse>('/api/insights/ai-synthesis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period }),
        }),
      ]);

      // Set State
      setToneData(toneRes.data);
      setSleepScatter(scatterRes.data);
      setSymbolData(symbolsRes.data);
      setLucidData(lucidRes.data);
      setAiSynthesis(aiRes.data);

      setErrorMap({
        card1: Boolean(toneRes.error),
        card2: Boolean(scatterRes.error),
        card3: Boolean(symbolsRes.error),
        card4: Boolean(lucidRes.error),
        card5: Boolean(aiRes.error),
      });

      // Debugging logs for Metro terminal
      console.log('══════════════ [Five Insight Cards Metro Debug] ══════════════');
      console.log(`[Period: ${period}]`);
      console.log('1. Dream Tone Week:', toneRes.data);
      console.log('2. Sleep Scatter Points:', scatterRes.data?.points?.length ?? 0);
      console.log('3. Recurring Theme:', symbolData || symbolsRes.data);
      console.log('4. Lucid Rate:', lucidRes.data);
      console.log('5. AI Synthesis:', aiRes.data?.synthesis ? 'Generated' : 'None');
      console.log('═════════════════════════════════════════════════════════════');
    } catch (e) {
      console.error('[InsightsMicroCards] Error during fetchAllMicroCards:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMicroCards();
  }, [period, focusKey]);

  // Handle Sparkle rotation once when synthesis loads
  useEffect(() => {
    if (aiSynthesis?.synthesis && !hasAnimatedSparkle.current) {
      hasAnimatedSparkle.current = true;
      sparkleRot.value = 0;
      sparkleRot.value = withTiming(360, { duration: 600, easing: Easing.out(Easing.ease) });
    }
  }, [aiSynthesis]);

  const animatedSparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRot.value}deg` }],
  }));

  // Card layout measurement for accurate scatter width
  const handleCardLayout = (e: LayoutChangeEvent) => {
    const layoutW = e.nativeEvent.layout.width;
    if (layoutW > 30) {
      setCardWidth(Math.max(120, layoutW - 28));
    }
  };

  // Date day letter helper
  const getDayLetter = (dateStr: string) => {
    if (!dateStr) return 'M';
    const d = new Date(dateStr + 'T00:00:00');
    const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return letters[d.getDay()] || 'M';
  };

  const cardStyle = [
    styles.microCard,
    isDesktop ? styles.desktopCard : styles.mobileCard,
  ];

  const cardsContent = (
    <>
      {/* ==================================================== */}
      {/* CARD 1: 7-DAY DREAM TONE                            */}
      {/* ==================================================== */}
      <View style={cardStyle}>
        <Text style={styles.microCardTitle}>7-Day Dream Tone</Text>

        {loading ? (
          <ShimmerPlaceholder height={65} />
        ) : errorMap.card1 ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>Unable to load</Text>
          </View>
        ) : (
          (() => {
            const days = toneData?.days || [];
            const hasAnyTone = days.some((d) => d.intensity > 0);
            const dominantLabel = toneData?.dominantTone
              ? `${toneData.dominantTone} was most common this week`
              : 'Building your tone map';

            return (
              <>
                <View style={styles.toneBarRow}>
                  {days.map((day, idx) => {
                    const isStub = !day.dominantTag || day.intensity <= 0;
                    const targetH = isStub ? 4 : Math.min(48, Math.max(10, Math.round(day.intensity * 48)));
                    const letter = getDayLetter(day.date);

                    return (
                      <AnimatedToneBar
                        key={day.date || idx}
                        targetHeight={targetH}
                        isStub={isStub}
                        dayLetter={letter}
                        delay={idx * 50}
                      />
                    );
                  })}
                </View>

                <Text style={styles.bottomCaptionText} numberOfLines={1}>
                  {hasAnyTone ? dominantLabel : 'Building your tone map'}
                </Text>
              </>
            );
          })()
        )}
      </View>

      {/* ==================================================== */}
      {/* CARD 2: SLEEP DEPTH (Scatter Plot)                  */}
      {/* ==================================================== */}
      <View style={cardStyle} onLayout={handleCardLayout}>
        <Text style={styles.microCardTitle}>Sleep Depth</Text>

        {loading ? (
          <ShimmerPlaceholder height={65} />
        ) : errorMap.card2 ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>Unable to load</Text>
          </View>
        ) : (
          (() => {
            const points = sleepScatter?.points || [];
            const hasEnoughScatter = points.length >= 3;

            if (!hasEnoughScatter) {
              return (
                <View style={styles.scatterFallbackContainer}>
                  {/* Visual placeholder: single purple bar visual as requested */}
                  <View style={styles.singleBarPlaceholder}>
                    <View style={styles.singleBarStubLeft} />
                    <View style={styles.singleBarFillCenter} />
                    <View style={styles.singleBarStubRight} />
                  </View>
                  <Text style={styles.scatterFallbackText}>
                    Log sleep and dreams on the same days to see your pattern.
                  </Text>
                </View>
              );
            }

            // Render Scatter Plot
            const chartW = cardWidth;
            const chartH = 48;

            return (
              <>
                <View style={[styles.scatterChartArea, { width: chartW, height: chartH }]}>
                  {points.map((pt, idx) => {
                    // X axis: 3h to 11h
                    const normX = Math.max(
                      6,
                      Math.min(chartW - 6, ((pt.x - 3) / 8) * (chartW - 16) + 8)
                    );
                    // Y axis: 0.0 to 1.0 (inverted for screen coords)
                    const normY = Math.max(
                      6,
                      Math.min(chartH - 6, chartH - 6 - pt.y * (chartH - 12))
                    );

                    return (
                      <AnimatedScatterDot
                        key={pt.date || idx}
                        cx={normX}
                        cy={normY}
                        delay={idx * 60}
                      />
                    );
                  })}
                </View>

                {/* Soft labels below the chart */}
                <View style={styles.scatterLegendRow}>
                  <View style={styles.scatterLegendItem}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#807B93' }} />
                    <Text style={styles.scatterLegendText}>Sleep</Text>
                  </View>
                  <View style={styles.scatterLegendItem}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#807B93' }} />
                    <Text style={styles.scatterLegendText}>Intensity</Text>
                  </View>
                </View>
              </>
            );
          })()
        )}
      </View>

      {/* ==================================================== */}
      {/* CARD 3: RECURRING THEME                             */}
      {/* ==================================================== */}
      <View style={cardStyle}>
        <Text style={styles.microCardUpperLabel}>RECURRING THEME</Text>

        {loading ? (
          <ShimmerPlaceholder height={65} />
        ) : errorMap.card3 ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>Unable to load</Text>
          </View>
        ) : symbolData && symbolData.topSymbol && symbolData.count >= 2 ? (
          (() => {
            const cleanWord = symbolData.topSymbol;
            const lower = cleanWord.toLowerCase();
            const meaning = SYMBOL_MEANINGS[lower];

            return (
              <View style={styles.motifContentCenter}>
                <AnimatedSymbolWord word={cleanWord} />
                <Text style={styles.motifCountText}>
                  Appeared in {symbolData.count} dreams
                </Text>
                {Boolean(meaning) && (
                  <Text style={styles.motifMeaningText} numberOfLines={2}>
                    {cleanWord} — {meaning}
                  </Text>
                )}
              </View>
            );
          })()
        ) : (
          <View style={styles.motifContentCenter}>
            <Text style={styles.motifEmptyDash}>—</Text>
            <Text style={styles.motifEmptyText}>
              No repeating symbols yet this week.
            </Text>
          </View>
        )}
      </View>

      {/* ==================================================== */}
      {/* CARD 4: LUCID RATE                                 */}
      {/* ==================================================== */}
      <View style={cardStyle}>
        <Text style={styles.microCardTitle}>Lucid Rate</Text>

        {loading ? (
          <ShimmerPlaceholder height={65} />
        ) : errorMap.card4 ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>Unable to load</Text>
          </View>
        ) : (
          (() => {
            const rate = lucidData ? lucidData.lucidRate : 0;
            const total = lucidData ? lucidData.totalDreams : 0;

            let contextualLabel = 'No lucid dreams this period';
            if (rate > 0 && rate < 30) contextualLabel = 'Below average lucidity';
            else if (rate >= 30 && rate < 70) contextualLabel = 'Moderate lucid awareness';
            else if (rate >= 70) contextualLabel = 'High lucid awareness';

            return (
              <View style={styles.lucidCenter}>
                <AnimatedCountUp targetValue={rate} duration={800} />

                <FadeInLabel delay={800}>
                  <Text style={styles.lucidContextualLabel}>{contextualLabel}</Text>
                  {total === 1 && (
                    <Text style={styles.lucidSingleNote}>
                      (Based on 1 dream — log more for accuracy)
                    </Text>
                  )}
                </FadeInLabel>
              </View>
            );
          })()
        )}
      </View>

      {/* ==================================================== */}
      {/* CARD 5: AI SYNTHESIS                                */}
      {/* ==================================================== */}
      <View style={cardStyle}>
        <View style={styles.aiTitleRow}>
          <Text style={styles.microCardTitle}>AI Synthesis</Text>
          <Animated.View style={animatedSparkleStyle}>
            <GitMerge size={13} color="#8069BF" strokeWidth={1.5} />
          </Animated.View>
        </View>

        {loading ? (
          <ThreeDotLoader />
        ) : errorMap.card5 ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>Unable to load</Text>
          </View>
        ) : aiSynthesis && aiSynthesis.synthesis ? (
          <View style={styles.aiTextContainer}>
            <Text style={styles.aiParagraphText} numberOfLines={5}>
              {aiSynthesis.synthesis}
            </Text>
          </View>
        ) : (
          <View style={styles.aiAwaitingContainer}>
            <Text style={styles.aiAwaitingText}>
              Awaiting more dreams to generate AI insights.
            </Text>
          </View>
        )}
      </View>
    </>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        {cardsContent}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.mobileScrollContainer, { paddingHorizontal }]}
    >
      {cardsContent}
    </ScrollView>
  );
}

// ----------------------------------------------------
// Design System Styles (Zero new colors)
// ----------------------------------------------------
const styles = StyleSheet.create({
  desktopContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
    alignItems: 'stretch',
  },
  mobileScrollContainer: {
    gap: 16,
    paddingVertical: 4,
  },
  microCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EBE6F3',
    shadowColor: '#3A2E5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  desktopCard: {
    flex: 1,
    minHeight: 160,
  },
  mobileCard: {
    width: 160,
    height: 160,
  },
  microCardTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: '#807B93',
  },
  microCardUpperLabel: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: '#807B93',
  },

  // Shimmer
  shimmerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmerBox: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#ECECEC',
  },

  // Error
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#807B93',
    textAlign: 'center',
  },

  // Card 1 (7-Day Dream Tone)
  toneBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 2,
  },
  toneBarCol: {
    alignItems: 'center',
    gap: 4,
  },
  toneBarTrack: {
    height: 48,
    width: 14,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  toneBarFill: {
    width: 14,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  toneBarActive: {
    backgroundColor: '#8069BF',
  },
  toneBarStub: {
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  toneDayLetter: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: '#807B93',
  },
  bottomCaptionText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#807B93',
    marginTop: 4,
  },

  // Card 2 (Sleep Depth Scatter)
  scatterFallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  singleBarPlaceholder: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 36,
  },
  singleBarStubLeft: {
    width: 8,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  singleBarFillCenter: {
    width: 10,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#8069BF',
  },
  singleBarStubRight: {
    width: 8,
    height: 8,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  scatterFallbackText: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: '#807B93',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 4,
  },
  scatterChartArea: {
    position: 'relative',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  scatterDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8069BF',
  },
  scatterLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  scatterLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scatterLegendText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: '#807B93',
  },

  // Card 3 (Recurring Theme)
  motifContentCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  motifWord: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    color: '#1A1D29',
    textAlign: 'center',
    marginBottom: 2,
  },
  motifCountText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#807B93',
    textAlign: 'center',
    marginBottom: 4,
  },
  motifMeaningText: {
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    fontSize: 12,
    color: '#807B93',
    textAlign: 'center',
    lineHeight: 16,
  },
  motifEmptyDash: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: '#CBD5E0',
    marginBottom: 2,
  },
  motifEmptyText: {
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    fontSize: 10,
    color: '#807B93',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Card 4 (Lucid Rate)
  lucidCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lucidRateNumber: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    color: '#8069BF',
    marginBottom: 2,
  },
  lucidContextualLabel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#807B93',
    textAlign: 'center',
  },
  lucidSingleNote: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#807B93',
    textAlign: 'center',
    marginTop: 2,
  },

  // Card 5 (AI Synthesis)
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTextContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  aiParagraphText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: '#1A1D29',
    lineHeight: 21,
  },
  aiAwaitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAwaitingText: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: '#807B93',
    textAlign: 'center',
    lineHeight: 14,
  },
  threeDotRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  threeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#807B93',
  },
});
