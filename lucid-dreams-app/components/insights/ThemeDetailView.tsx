import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  SlidersHorizontal,
  MoreVertical,
  Lightbulb,
  BatteryCharging,
  Activity,
  Edit3,
  ArrowRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ThemeDetailData, TimelineDot } from '@/services/insightsAPI';

interface Props {
  data: ThemeDetailData | null;
  loading: boolean;
  onBack: () => void;
}

export const ThemeDetailView: React.FC<Props> = ({ data, loading, onBack }) => {
  const router = useRouter();
  const [selectedDotIndex, setSelectedDotIndex] = useState<number>(5); // Sep 2 is index 5 in screenshot

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading theme recurrence...</Text>
      </View>
    );
  }

  const themeName = data?.name ?? 'Feeling trapped';
  const totalInstances = data?.totalInstances ?? 7;
  const description =
    data?.description ??
    'Appeared in 7 dreams over the last 30 days. Characterized by confined spaces, inability to run, or locked doors.';
  const dateRange = data?.dateRange ?? 'Aug 9 – Sep 8';

  const timeline: TimelineDot[] = data?.rhythmTimeline ?? [
    { date: 'Aug 10', fullDate: '2026-08-10', occurred: true, distress: 2, intensity: 'moderate', label: 'Aug 10 · Mild intensity' },
    { date: 'Aug 14', fullDate: '2026-08-14', occurred: true, distress: 4, intensity: 'high', label: 'Aug 14 · High distress' },
    { date: 'Aug 20', fullDate: '2026-08-20', occurred: true, distress: 3, intensity: 'high', label: 'Aug 20 · Moderate distress' },
    { date: 'Aug 24', fullDate: '2026-08-24', occurred: true, distress: 4, intensity: 'high', label: 'Aug 24 · High distress' },
    { date: 'Aug 30', fullDate: '2026-08-30', occurred: true, distress: 2, intensity: 'moderate', label: 'Aug 30 · Mild intensity' },
    { date: 'Sep 2', fullDate: '2026-09-02', occurred: true, distress: 4, intensity: 'high', label: '• Sep 2 · High distress (L4)' },
    { date: 'Sep 8', fullDate: '2026-09-08', occurred: true, distress: 3, intensity: 'high', label: 'Sep 8 · Moderate distress' },
  ];

  const somaticContext = data?.somaticContext ?? [
    { title: 'High pre-sleep worry', subtext: '5 of 7 entries recorded', match: 71, icon: 'worry' },
    { title: 'Low waking energy', subtext: '4 of 7 entries recorded', match: 57, icon: 'energy' },
    { title: 'Restless limbs / tension', subtext: '4 of 7 entries recorded', match: 57, icon: 'body' },
  ];

  const userConnection = data?.userConnection ?? {
    title: 'Work pressure & pending deadlines',
    subtitle: 'Logged during evening check-in on Sep 2',
  };

  const dreamInstances = data?.dreamInstances ?? [
    {
      id: 'dream-1',
      title: 'The Empty Classroom',
      date: 'Aug 9',
      badge: 'Uncomfortable',
      badgeType: 'neutral',
      excerpt:
        'I keep having the same dream about being back in my old classroom, door locked from the outside. The clock on the wall was spinning backward and everyone was quiet...',
      readTime: '3 min read',
    },
    {
      id: 'dream-2',
      title: 'Elevator in the Dark',
      date: 'Aug 18',
      badge: 'Restless',
      badgeType: 'moderate',
      excerpt:
        "The elevator stopped between floors 4 and 5. The buttons wouldn't respond. I tried prying the sliding doors open but there was just concrete behind it...",
      readTime: '2 min read',
    },
    {
      id: 'dream-3',
      title: 'Narrow Stairwell',
      date: 'Sep 2',
      badge: 'High distress',
      badgeType: 'high',
      excerpt:
        'Stairs winding continuously upward with ceilings getting lower. I had to crawl on hands and knees until my shoulders were caught against the banister...',
      readTime: '4 min read',
    },
  ];

  const selectedDot = timeline[selectedDotIndex] || timeline[timeline.length - 1];

  return (
    <View style={styles.container}>
      {/* Sub Navigation Bar */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={16} color="#4F46E5" />
          <Text style={styles.backBtnText}>Back to Themes</Text>
        </TouchableOpacity>

        <View style={styles.navActions}>
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
            <SlidersHorizontal size={13} color="#4B5563" />
            <Text style={styles.filterBtnText}>Filter logs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
            <MoreVertical size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Header Info */}
      <View style={styles.headerInfo}>
        <Text style={styles.drillDownTag}>THEME DRILL-DOWN • RECURRENCE</Text>
        <View style={styles.repeatedBadge}>
          <Text style={styles.repeatedBadgeText}>
            REPEATED THEME • {totalInstances} INSTANCES
          </Text>
        </View>
        <Text style={styles.themeTitle}>{themeName}</Text>
        <Text style={styles.themeDescription}>{description}</Text>
      </View>

      {/* Card 1: Rhythm of Recurrence */}
      <View style={styles.card}>
        <View style={styles.cardHeaderBetween}>
          <Text style={styles.cardTitle}>Rhythm of Recurrence (Past 30 Days)</Text>
          <Text style={styles.dateRangeText}>{dateRange}</Text>
        </View>
        <Text style={styles.cardSubtitle}>
          Individual dream events plotted chronologically. Darker fill indicates higher recorded distress level.
        </Text>

        {/* Timeline Visualization */}
        <View style={styles.timelineArea}>
          {/* Active Tooltip Bubble */}
          <View
            style={[
              styles.tooltipBubble,
              {
                left: `${Math.max(10, Math.min(80, (selectedDotIndex / Math.max(1, timeline.length - 1)) * 90))}%`,
              },
            ]}
          >
            <Text style={styles.tooltipText}>{selectedDot.label}</Text>
            <View style={styles.tooltipArrow} />
          </View>

          {/* Timeline track line */}
          <View style={styles.trackLine} />

          {/* Timeline dots */}
          <View style={styles.dotsRow}>
            {timeline.map((dot, idx) => {
              const isSelected = selectedDotIndex === idx;
              const isHigh = dot.intensity === 'high';
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.dotTouchTarget}
                  onPress={() => setSelectedDotIndex(idx)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.timelineDot,
                      isHigh ? styles.dotHighDistress : styles.dotModerateDistress,
                      isSelected && styles.dotSelected,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date Axis Labels */}
          <View style={styles.axisLabelsRow}>
            <Text style={styles.axisLabel}>Aug 10</Text>
            <Text style={styles.axisLabel}>Aug 20</Text>
            <Text style={styles.axisLabel}>Aug 30</Text>
            <Text style={styles.axisLabel}>Sep 8</Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.timelineLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4F46E5' }]} />
            <Text style={styles.legendText}>High intensity (3)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#C7D2FE' }]} />
            <Text style={styles.legendText}>Moderate / Mild (4)</Text>
          </View>
        </View>
        <Text style={styles.inspectHint}>Tap any dot to inspect that night's check-in.</Text>
      </View>

      {/* Section 2: SOMATIC CONTEXT • WAKING CORRELATIONS */}
      <View style={styles.sectionHeaderSpacing}>
        <Text style={styles.sectionSmallCaps}>SOMATIC CONTEXT • WAKING CORRELATIONS</Text>
        <Text style={styles.sectionMainHeader}>Often recorded alongside</Text>
        <Text style={styles.sectionSubtitle}>
          What was active in your physiology on days this theme surfaced:
        </Text>
      </View>

      {somaticContext.map((item, idx) => {
        return (
          <View key={idx} style={styles.card}>
            <View style={styles.somaticHeaderRow}>
              <View style={styles.somaticLeft}>
                {item.icon === 'worry' && <Lightbulb size={17} color="#4F46E5" strokeWidth={1.8} />}
                {item.icon === 'energy' && <BatteryCharging size={17} color="#4F46E5" strokeWidth={1.8} />}
                {item.icon === 'body' && <Activity size={17} color="#4F46E5" strokeWidth={1.8} />}
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.somaticTitle}>{item.title}</Text>
                  <Text style={styles.somaticSubtext}>{item.subtext}</Text>
                </View>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>{item.match}% match</Text>
              </View>
            </View>

            {/* Progress track */}
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${item.match}%` }]} />
            </View>
          </View>
        );
      })}

      {/* Section 3: USER CONNECTION */}
      <View style={styles.sectionHeaderSpacing}>
        <View style={styles.sectionRowBetween}>
          <Text style={styles.sectionSmallCaps}>USER CONNECTION</Text>
          <Text style={styles.selfAttribText}>Self-attribution</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.connectionPrompt}>You connected this theme to:</Text>
        <Text style={styles.connectionTitle}>{userConnection.title}</Text>
        <Text style={styles.connectionSubtitle}>{userConnection.subtitle}</Text>

        <TouchableOpacity style={styles.editConnectionBtn} activeOpacity={0.8}>
          <Edit3 size={13} color="#4B5563" />
          <Text style={styles.editConnectionBtnText}>Edit connection</Text>
        </TouchableOpacity>
      </View>

      {/* Section 4: LOGGED DREAMS */}
      <View style={styles.sectionHeaderSpacing}>
        <View style={styles.sectionRowBetween}>
          <Text style={styles.sectionSmallCaps}>LOGGED DREAMS • {totalInstances} ENTRIES</Text>
          <Text style={styles.selfAttribText}>Sorted by date</Text>
        </View>
      </View>

      {dreamInstances.map((dream) => {
        let badgeBg = '#F3F4F6';
        let badgeColor = '#4B5563';
        if (dream.badgeType === 'high') {
          badgeBg = '#EDE9FE';
          badgeColor = '#4F46E5';
        } else if (dream.badgeType === 'moderate') {
          badgeBg = '#EEF2FF';
          badgeColor = '#4338CA';
        }

        return (
          <View key={dream.id} style={styles.card}>
            <View style={styles.dreamHeaderRow}>
              <View style={styles.dreamTitleBlock}>
                <Text style={styles.dreamTitle}>{dream.title}</Text>
                <Text style={styles.dreamDateDot}>• {dream.date}</Text>
              </View>
              <View style={[styles.dreamBadge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.dreamBadgeText, { color: badgeColor }]}>{dream.badge}</Text>
              </View>
            </View>

            <Text style={styles.dreamExcerpt}>"{dream.excerpt}"</Text>

            <View style={styles.dreamFooterRow}>
              <TouchableOpacity
                style={styles.readFullLink}
                onPress={() => {
                  if (dream.id && !dream.id.startsWith('dream-')) {
                    router.push(`/dream/${dream.id}` as any);
                  } else {
                    router.push('/(tabs)/explore' as any);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.readFullLinkText}>Read full entry</Text>
                <ArrowRight size={13} color="#4F46E5" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
              <Text style={styles.readTimeText}>{dream.readTime}</Text>
            </View>
          </View>
        );
      })}

      {/* Bottom Button: View All In Journal */}
      <TouchableOpacity
        style={styles.viewAllJournalBtn}
        onPress={() => router.push('/(tabs)/explore' as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.viewAllJournalBtnText}>
          VIEW ALL {totalInstances} ENTRIES IN JOURNAL
        </Text>
        <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 30,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  filterBtnText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  moreBtn: {
    padding: 4,
  },
  headerInfo: {
    marginBottom: 18,
  },
  drillDownTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  repeatedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  repeatedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  themeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  themeDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },

  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  dateRangeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 20,
  },

  // Timeline
  timelineArea: {
    paddingVertical: 14,
    marginBottom: 10,
  },
  tooltipBubble: {
    position: 'absolute',
    top: -24,
    backgroundColor: '#111827',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    transform: [{ translateX: -60 }],
    zIndex: 10,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#111827',
    marginTop: 1,
  },
  trackLine: {
    height: 2,
    backgroundColor: '#E5E7EB',
    width: '100%',
    position: 'absolute',
    top: 25,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dotTouchTarget: {
    padding: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotHighDistress: {
    backgroundColor: '#4F46E5',
  },
  dotModerateDistress: {
    backgroundColor: '#C7D2FE',
  },
  dotSelected: {
    borderWidth: 2,
    borderColor: '#111827',
    transform: [{ scale: 1.3 }],
  },
  axisLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  axisLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  timelineLegendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#4B5563',
  },
  inspectHint: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#9CA3AF',
    marginTop: 6,
  },

  // Sections
  sectionHeaderSpacing: {
    marginTop: 8,
    marginBottom: 10,
  },
  sectionSmallCaps: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  sectionMainHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  sectionRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selfAttribText: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Somatic context
  somaticHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  somaticLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  somaticTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  somaticSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  matchBadge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },

  // User connection
  connectionPrompt: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  connectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
  },
  editConnectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
  },
  editConnectionBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },

  // Dreams list
  dreamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dreamTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  dreamTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  dreamDateDot: {
    fontSize: 12,
    color: '#6B7280',
  },
  dreamBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dreamBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dreamExcerpt: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4B5563',
    marginBottom: 12,
  },
  dreamFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readFullLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readFullLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  readTimeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Bottom Button
  viewAllJournalBtn: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  viewAllJournalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ThemeDetailView;
