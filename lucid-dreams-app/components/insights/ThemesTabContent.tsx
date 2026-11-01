import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Home,
  Briefcase,
  GitBranch,
  Mountain,
  User,
  Users,
  HelpCircle,
  Link,
  Activity,
  Feather,
  Compass,
  ArrowRight,
} from 'lucide-react-native';
import {
  ThemesData,
  ThemeDetailData,
  insightsAPI,
} from '@/services/insightsAPI';
import ThemeDetailView from './ThemeDetailView';

interface Props {
  data: ThemesData | null;
  loading: boolean;
  selectedRange: '7days' | '30days' | '90days';
  onSelectRange: (range: '7days' | '30days' | '90days') => void;
  userId?: string;
}

export const ThemesTabContent: React.FC<Props> = ({
  data,
  loading,
  selectedRange,
  onSelectRange,
  userId = 'me',
}) => {
  // Detail drill-down state
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ThemeDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Correlation feedback state
  const [feedbackAnswer, setFeedbackAnswer] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleOpenThemeDetail = async (themeId: string) => {
    try {
      setSelectedThemeId(themeId);
      setDetailLoading(true);
      const res = await insightsAPI.getThemeDetail(userId, themeId, selectedRange);
      setDetailData(res);
    } catch (e) {
      console.error('Failed to load theme detail:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBackToThemes = () => {
    setSelectedThemeId(null);
    setDetailData(null);
  };

  const handleCorrelationFeedback = async (
    choice: 'accurate' | 'adjust' | 'unsure'
  ) => {
    try {
      setSubmittingFeedback(true);
      setFeedbackAnswer(choice);
      await insightsAPI.sendThemeCorrelationFeedback(
        userId,
        data?.observedCorrelation?.themeName || 'feeling-trapped',
        choice
      );
      Alert.alert(
        'Feedback Noted',
        choice === 'accurate'
          ? 'Correlation confirmed for your somatic profile.'
          : choice === 'adjust'
          ? 'We will adjust trigger weighting in future entries.'
          : 'Recorded. We will gather more check-in data.'
      );
    } catch (e) {
      Alert.alert('Error', 'Could not record feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // If in Theme Detail Drill-down view, render ThemeDetailView
  if (selectedThemeId) {
    return (
      <ThemeDetailView
        data={detailData}
        loading={detailLoading}
        onBack={handleBackToThemes}
      />
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading theme patterns...</Text>
      </View>
    );
  }

  const totalLogs = data?.totalLogs ?? 19;

  const themes = data?.themes ?? [
    {
      id: 'feeling-trapped',
      name: 'Feeling trapped',
      frequency: 7,
      percentage: 65,
      description: '7 dreams featuring this theme',
      isRepeated: true,
    },
    {
      id: 'being-late',
      name: 'Being late',
      frequency: 5,
      percentage: 45,
      description: '5 dreams featuring this theme',
      isRepeated: false,
    },
    {
      id: 'childhood-places',
      name: 'Childhood places',
      frequency: 4,
      percentage: 35,
      description: '4 dreams featuring this theme',
      isRepeated: false,
    },
    {
      id: 'connection-reunion',
      name: 'Connection/reunion',
      frequency: 2,
      percentage: 20,
      description: '2 dreams featuring this theme',
      isRepeated: false,
    },
    {
      id: 'no-clear-theme',
      name: 'No clear theme (open or drifting imagery)',
      frequency: 1,
      percentage: 10,
      description: '1 dream',
      isRepeated: false,
    },
  ];

  const emotionalTones = data?.emotionalTones ?? [
    { id: 'anxious', name: 'Anxious / Restless', percentage: 42, count: 6, icon: 'anxious' },
    { id: 'peaceful', name: 'Peaceful / Settled', percentage: 35, count: 5, icon: 'peaceful' },
    { id: 'neutral', name: 'Curious / Neutral', percentage: 23, count: 3, icon: 'neutral' },
  ];

  const environmentalSettings = data?.environmentalSettings ?? [
    { id: 'env-1', title: 'Familiar childhood home', subtitle: 'Early domestic space', count: 5, icon: 'home' },
    { id: 'env-2', title: 'Work / school grounds', subtitle: 'Performance context', count: 4, icon: 'work' },
    { id: 'env-3', title: 'Transit & corridors', subtitle: 'Indeterminate halls', count: 3, icon: 'transit' },
    { id: 'env-4', title: 'Open landscapes', subtitle: 'Natural clearings', count: 2, icon: 'landscape' },
  ];

  const relationalPresence = data?.relationalPresence ?? [
    { id: 'rel-1', label: 'Solitary / Alone', count: 5, icon: 'alone' },
    { id: 'rel-2', label: 'Family members', count: 4, icon: 'family' },
    { id: 'rel-3', label: 'Unknown figures', count: 3, icon: 'unknown' },
    { id: 'rel-4', label: 'Close friends', count: 2, icon: 'friends' },
  ];

  const observedCorrelation = data?.observedCorrelation ?? {
    text: 'Evening work pressure & late screen time linked to "Feeling trapped"',
    themeName: 'Feeling trapped',
  };

  return (
    <View style={styles.container}>
      {/* Top Header Label */}
      <View style={styles.topTagRow}>
        <View style={styles.topDot} />
        <Text style={styles.topTagText}>SOMATIC ARCHIVE • SUBCONSCIOUS THEMES</Text>
      </View>

      {/* Main Title & Subtitle */}
      <Text style={styles.mainTitle}>Themes: What has appeared in your dreams?</Text>
      <Text style={styles.mainSubtitle}>
        A continuous inquiry into what repeats across your sleep, honoring subconscious imagery without diagnostic reduction.
      </Text>

      {/* Range filter buttons: 7 days, 30 days, 90 days */}
      <View style={styles.rangeRow}>
        {(['7days', '30days', '90days'] as const).map((range) => {
          const isActive = selectedRange === range;
          const label = range === '7days' ? '7 days' : range === '30days' ? '30 days' : '90 days';
          return (
            <TouchableOpacity
              key={range}
              style={[styles.rangeButton, isActive && styles.rangeButtonActive]}
              onPress={() => onSelectRange(range)}
              activeOpacity={0.8}
            >
              <Text style={[styles.rangeButtonText, isActive && styles.rangeButtonTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SECTION 01 • RECURRING TOPICS */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionSmallCaps}>SECTION 01 • RECURRING TOPICS</Text>
        <Text style={styles.sectionRightTag}>{totalLogs} logs recorded</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Top recurring topics without diagnostic framing or clinical labels.
      </Text>

      <View style={styles.card}>
        {themes.map((theme, idx) => {
          return (
            <TouchableOpacity
              key={theme.id || idx}
              style={[styles.themeRow, idx !== themes.length - 1 && styles.themeRowBorder]}
              onPress={() => handleOpenThemeDetail(theme.id)}
              activeOpacity={0.7}
            >
              <View style={styles.themeTitleRow}>
                <View style={styles.themeNameWrapper}>
                  <Text style={styles.themeNameText}>{theme.name}</Text>
                  {theme.isRepeated && (
                    <View style={styles.repeatedBadge}>
                      <Text style={styles.repeatedBadgeText}>REPEATED THEME</Text>
                    </View>
                  )}
                </View>
                <View style={styles.themeCountWrapper}>
                  <Text style={styles.themeCountText}>
                    {theme.frequency} {theme.frequency === 1 ? 'dream' : 'dreams'}
                  </Text>
                  {theme.isRepeated && <ArrowRight size={14} color="#6B7280" />}
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.themeProgressTrack}>
                <View
                  style={[
                    styles.themeProgressFill,
                    { width: `${Math.max(10, Math.min(100, theme.percentage))}%` },
                  ]}
                />
              </View>

              {theme.isRepeated && (
                <Text style={styles.inspectLink}>Tap to inspect linked somatic notes →</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SECTION 02 • EMOTIONAL TONE */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionSmallCaps}>SECTION 02 • EMOTIONAL TONE</Text>
        <Text style={styles.sectionRightTag}>Somatic Resonance</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Tracking how dreams felt upon awakening, rather than cataloging content alone.
      </Text>

      {emotionalTones.map((tone) => {
        return (
          <View key={tone.id} style={styles.card}>
            <View style={styles.toneHeaderRow}>
              <View style={styles.toneLeft}>
                {tone.icon === 'anxious' && <Activity size={16} color="#4F46E5" strokeWidth={1.8} />}
                {tone.icon === 'peaceful' && <Feather size={16} color="#4F46E5" strokeWidth={1.8} />}
                {tone.icon === 'neutral' && <Compass size={16} color="#4F46E5" strokeWidth={1.8} />}
                <Text style={styles.toneNameText}>{tone.name}</Text>
              </View>
              <Text style={styles.tonePctText}>
                {tone.percentage}% ({tone.count} {tone.count === 1 ? 'dream' : 'dreams'})
              </Text>
            </View>
            <View style={styles.toneProgressTrack}>
              <View style={[styles.toneProgressFill, { width: `${tone.percentage}%` }]} />
            </View>
          </View>
        );
      })}

      {/* SECTION 03 • ENVIRONMENTAL SETTINGS */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionSmallCaps}>SECTION 03 • ENVIRONMENTAL SETTINGS</Text>
        <Text style={styles.sectionRightTag}>Topography</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Repetition in dream geography and familiar physical spaces.
      </Text>

      {/* 2x2 Grid */}
      <View style={styles.gridContainer}>
        {environmentalSettings.map((env) => {
          return (
            <View key={env.id} style={styles.gridCard}>
              <View style={styles.gridCardTop}>
                {env.icon === 'home' && <Home size={17} color="#4F46E5" strokeWidth={1.8} />}
                {env.icon === 'work' && <Briefcase size={17} color="#4F46E5" strokeWidth={1.8} />}
                {env.icon === 'transit' && <GitBranch size={17} color="#4F46E5" strokeWidth={1.8} />}
                {env.icon === 'landscape' && <Mountain size={17} color="#4F46E5" strokeWidth={1.8} />}
                <Text style={styles.gridNumber}>{env.count}</Text>
              </View>
              <Text style={styles.gridTitle}>{env.title}</Text>
              <Text style={styles.gridSubtitle}>{env.subtitle}</Text>
            </View>
          );
        })}
      </View>

      {/* SECTION 04 • RELATIONAL PRESENCE */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionSmallCaps}>SECTION 04 • RELATIONAL PRESENCE</Text>
        <Text style={styles.sectionRightTag}>Entities</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Presence identified across recorded dream narratives.
      </Text>

      <View style={styles.card}>
        {relationalPresence.map((rel, idx) => {
          return (
            <View
              key={rel.id || idx}
              style={[
                styles.relationalRow,
                idx !== relationalPresence.length - 1 && styles.themeRowBorder,
              ]}
            >
              <View style={styles.relationalLeft}>
                {rel.icon === 'alone' && <User size={16} color="#6B7280" strokeWidth={1.8} />}
                {rel.icon === 'family' && <Users size={16} color="#6B7280" strokeWidth={1.8} />}
                {rel.icon === 'unknown' && <HelpCircle size={16} color="#6B7280" strokeWidth={1.8} />}
                {rel.icon === 'friends' && <Users size={16} color="#6B7280" strokeWidth={1.8} />}
                <Text style={styles.relationalLabel}>{rel.label}</Text>
              </View>
              <View style={styles.relationalBadge}>
                <Text style={styles.relationalBadgeText}>
                  {rel.count} {rel.count === 1 ? 'dream' : 'dreams'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* SECTION 05 • CORRELATIVE TRIGGERS */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionSmallCaps}>SECTION 05 • CORRELATIVE TRIGGERS</Text>
        <Text style={styles.sectionRightTag}>Cross-Inquiry</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Real-life check-in triggers you explicitly linked to these night themes.
      </Text>

      <View style={styles.card}>
        <View style={styles.triggerCardTop}>
          <View style={styles.linkIconBox}>
            <Link size={14} color="#4F46E5" strokeWidth={2} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.observedTag}>OBSERVED CORRELATION</Text>
            <Text style={styles.observedCorrelationText}>{observedCorrelation.text}</Text>
          </View>
        </View>

        <Text style={styles.questionText}>Does this connection feel accurate to your waking day?</Text>

        <View style={styles.feedbackButtonsRow}>
          <TouchableOpacity
            style={[
              styles.feedbackOptionBtn,
              feedbackAnswer === 'accurate' && styles.feedbackOptionBtnSelected,
            ]}
            onPress={() => handleCorrelationFeedback('accurate')}
            disabled={submittingFeedback}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.feedbackOptionText,
                feedbackAnswer === 'accurate' && styles.feedbackOptionTextSelected,
              ]}
            >
              Yes, accurate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.feedbackOptionBtn,
              feedbackAnswer === 'adjust' && styles.feedbackOptionBtnSelected,
            ]}
            onPress={() => handleCorrelationFeedback('adjust')}
            disabled={submittingFeedback}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.feedbackOptionText,
                feedbackAnswer === 'adjust' && styles.feedbackOptionTextSelected,
              ]}
            >
              No, adjust
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.feedbackOptionBtn,
              feedbackAnswer === 'unsure' && styles.feedbackOptionBtnSelected,
            ]}
            onPress={() => handleCorrelationFeedback('unsure')}
            disabled={submittingFeedback}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.feedbackOptionText,
                feedbackAnswer === 'unsure' && styles.feedbackOptionTextSelected,
              ]}
            >
              Not sure
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  topTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  topDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4F46E5',
    marginRight: 6,
  },
  topTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
    lineHeight: 29,
    marginBottom: 8,
  },
  mainSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4B5563',
    marginBottom: 16,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  rangeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  rangeButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  rangeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  rangeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 6,
    marginBottom: 2,
  },
  sectionSmallCaps: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.7,
  },
  sectionRightTag: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 10,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },

  // Section 01: Recurring topics rows
  themeRow: {
    paddingVertical: 12,
  },
  themeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  themeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  themeNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  repeatedBadge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  repeatedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.4,
  },
  themeCountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  themeCountText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  themeProgressTrack: {
    height: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  themeProgressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  inspectLink: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
    marginTop: 6,
  },

  // Section 02: Emotional tone
  toneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  toneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toneNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  tonePctText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  toneProgressTrack: {
    height: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  toneProgressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },

  // Section 03: 2x2 Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  gridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  gridCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
    lineHeight: 17,
  },
  gridSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Section 04: Relational presence
  relationalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  relationalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  relationalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  relationalBadge: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  relationalBadgeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },

  // Section 05: Correlative triggers
  triggerCardTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  linkIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  observedTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  observedCorrelationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 19,
  },
  questionText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 12,
  },
  feedbackButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackOptionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  feedbackOptionBtnSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  feedbackOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  feedbackOptionTextSelected: {
    color: '#4338CA',
    fontWeight: '600',
  },
});

export default ThemesTabContent;
