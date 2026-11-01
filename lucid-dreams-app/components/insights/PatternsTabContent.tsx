import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PatternsData } from '@/services/insightsAPI';

interface Props {
  data: PatternsData | null;
  loading: boolean;
  selectedRange: '7days' | '30days' | '90days';
  onSelectRange: (range: '7days' | '30days' | '90days') => void;
  onStartExperiment: () => Promise<void>;
  onReportInaccurate: () => Promise<void>;
}

export const PatternsTabContent: React.FC<Props> = ({
  data,
  loading,
  selectedRange,
  onSelectRange,
  onStartExperiment,
  onReportInaccurate,
}) => {
  const router = useRouter();
  const [expandedRow, setExpandedRow] = useState<string | null>('Oct 1');
  const [startingExp, setStartingExp] = useState(false);
  const [expStarted, setExpStarted] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const toggleRow = (date: string) => {
    setExpandedRow(expandedRow === date ? null : date);
  };

  const handleStartExperiment = async () => {
    try {
      setStartingExp(true);
      await onStartExperiment();
      setExpStarted(true);
      Alert.alert('Experiment Started', 'Your 3-night experiment is now active.');
    } catch (e) {
      Alert.alert('Error', 'Could not start experiment. Please try again.');
    } finally {
      setStartingExp(false);
    }
  };

  const handleFeedback = async () => {
    try {
      await onReportInaccurate();
      setFeedbackSent(true);
      Alert.alert('Feedback Noted', 'Thank you. We will refine future correlations based on your entries.');
    } catch (e) {
      Alert.alert('Error', 'Could not submit feedback.');
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Analyzing patterns...</Text>
      </View>
    );
  }

  const summary = data?.summary ?? {
    title: 'A pattern worth noticing',
    description: 'High evening worry often appeared before distressing dreams and lower morning energy.',
    observedCount: 5,
    totalRelevantEntries: 8,
    dateRange: 'Last 30 days',
    disclaimer: 'This is an association in your entries, not proof of a cause.',
  };

  const timeline = data?.timeline ?? [];
  const stats = data?.recordedStats ?? {
    highEveningWorry: { count: 6, total: 8 },
    distressingDream: { count: 5, total: 8 },
    lowMorningEnergy: { count: 4, total: 8 },
  };

  const connectedFactors = data?.connectedFactors ?? [
    { factor: 'Work pressure', nights: 3 },
    { factor: 'Relationship worry', nights: 2 },
    { factor: 'Waking during night', nights: 2 },
    { factor: 'No clear context', nights: 1 },
  ];

  const afterDreams = data?.afterDreams ?? {
    lowEnergy: 4,
    moderate: 3,
    higherEnergy: 1,
    description: 'Lower morning energy was more common after dreams you rated as highly distressing.',
  };

  const experiment = data?.experiment ?? {
    title: 'Try a small experiment',
    instructions: 'For the next 3 nights, before sleep:',
    protocol: [
      'Name the main worry.',
      'Write one next step.',
      'Write what can wait until tomorrow.',
    ],
  };

  const renderColorSquare = (level: string) => {
    let bg = '#4F46E5';
    if (level === 'moderate') bg = '#818CF8';
    else if (level === 'low' || level === 'calm') bg = '#C7D2FE';
    return <View style={[styles.colorSquare, { backgroundColor: bg }]} />;
  };

  return (
    <View style={styles.container}>
      {/* Label and Screen Title */}
      <Text style={styles.screenLabel}>PATTERNS</Text>
      <Text style={styles.screenTitle}>Your recent dream-and-morning patterns</Text>

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

      {/* Card 1: Pattern summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{summary.title}</Text>
        <Text style={styles.cardDescription}>{summary.description}</Text>

        <View style={styles.summaryFooterRow}>
          <View style={styles.summaryBulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.summaryEntriesText}>
              {summary.observedCount} of {summary.totalRelevantEntries} relevant entries
            </Text>
          </View>
          <Text style={styles.summaryRangeText}>{summary.dateRange}</Text>
        </View>
      </View>
      <Text style={styles.disclaimerTextBelow}>{summary.disclaimer}</Text>

      {/* Card 2: Before sleep -> Dream -> Morning Table */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Before sleep → Dream → Morning</Text>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#4F46E5' }]} />
            <Text style={styles.legendText}>High</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#818CF8' }]} />
            <Text style={styles.legendText}>Moderate</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#C7D2FE' }]} />
            <Text style={styles.legendText}>Low / calm</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.dashLegend}>—</Text>
            <Text style={styles.legendText}>No entry</Text>
          </View>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>DATE</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>EVENING</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>DREAM</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>MORNING</Text>
        </View>

        {/* Table Rows */}
        {timeline.map((row) => {
          const isExpanded = expandedRow === row.date;
          return (
            <View key={row.id || row.date} style={styles.rowWrapper}>
              <TouchableOpacity
                style={styles.tableRow}
                onPress={() => toggleRow(row.date)}
                activeOpacity={0.7}
              >
                {/* Date with chevron */}
                <View style={[styles.tableCellDate, { flex: 1.3 }]}>
                  <Text style={styles.tableCellDateText}>{row.date}</Text>
                  {isExpanded ? (
                    <ChevronUp size={14} color="#6B7280" />
                  ) : (
                    <ChevronDown size={14} color="#9CA3AF" />
                  )}
                </View>

                {/* Evening */}
                <View style={[styles.tableCellData, { flex: 1.1 }]}>
                  {renderColorSquare(row.evening.level)}
                  <Text style={styles.tableCellText}>{row.evening.score}</Text>
                </View>

                {/* Dream */}
                <View style={[styles.tableCellData, { flex: 1.1 }]}>
                  {row.dream.distress === 'Calm' ? (
                    <Text style={styles.tableCellTextCalm}>Calm</Text>
                  ) : (
                    <>
                      {renderColorSquare(row.dream.level)}
                      <Text style={styles.tableCellText}>{row.dream.distress}</Text>
                    </>
                  )}
                </View>

                {/* Morning */}
                <View style={[styles.tableCellData, { flex: 1.1 }]}>
                  {renderColorSquare(row.morning.level)}
                  <Text style={styles.tableCellText}>{row.morning.score}</Text>
                </View>
              </TouchableOpacity>

              {/* Expanded Drawer */}
              {isExpanded && (
                <View style={styles.expandedDrawer}>
                  <Text style={styles.expandedText}>
                    {row.date} · Evening worry: {row.evening.score} · Dream: "{row.dream.title}" (Distress:{' '}
                    {row.dream.distress}) · Morning energy: {row.morning.score}
                  </Text>
                  <TouchableOpacity
                    style={styles.viewEntryLink}
                    onPress={() => {
                      if (row.journalEntryId && row.journalEntryId !== 'sample-1') {
                        router.push(`/dream/${row.journalEntryId}` as any);
                      } else {
                        router.push('/(tabs)/explore' as any);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewEntryLinkText}>View journal entry</Text>
                    <ArrowRight size={13} color="#4F46E5" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Card 3: What was recorded */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What was recorded</Text>

        {/* High evening worry bar */}
        <View style={styles.statRow}>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>High evening worry</Text>
            <Text style={styles.statValue}>
              {stats.highEveningWorry.count} of {stats.highEveningWorry.total}
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.round(
                    (stats.highEveningWorry.count / Math.max(1, stats.highEveningWorry.total)) * 100
                  )}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Distressing dream bar */}
        <View style={styles.statRow}>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Distressing dream</Text>
            <Text style={styles.statValue}>
              {stats.distressingDream.count} of {stats.distressingDream.total}
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.round(
                    (stats.distressingDream.count / Math.max(1, stats.distressingDream.total)) * 100
                  )}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Low morning energy bar */}
        <View style={styles.statRow}>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Low morning energy</Text>
            <Text style={styles.statValue}>
              {stats.lowMorningEnergy.count} of {stats.lowMorningEnergy.total}
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.round(
                    (stats.lowMorningEnergy.count / Math.max(1, stats.lowMorningEnergy.total)) * 100
                  )}%`,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Card 4: What may be connected */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What may be connected</Text>

        <View style={styles.factorsList}>
          {connectedFactors.map((item, idx) => (
            <View key={idx} style={styles.factorBox}>
              <Text style={styles.factorName}>{item.factor}</Text>
              <Text style={styles.factorNights}>
                {item.nights} {item.nights === 1 ? 'night' : 'nights'}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.footnoteText}>Observed factors logged in pre-sleep check-ins.</Text>
      </View>

      {/* Card 5: After these dreams */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>After these dreams</Text>

        <View style={styles.metricBoxesRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>{afterDreams.lowEnergy}</Text>
            <Text style={styles.metricLabel}>Low energy</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>{afterDreams.moderate}</Text>
            <Text style={styles.metricLabel}>Moderate</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>{afterDreams.higherEnergy}</Text>
            <Text style={styles.metricLabel}>Higher energy</Text>
          </View>
        </View>

        <Text style={styles.afterDreamsDesc}>{afterDreams.description}</Text>
      </View>

      {/* Card 6: Try a small experiment */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{experiment.title}</Text>
        <Text style={styles.experimentInstructions}>{experiment.instructions}</Text>

        <View style={styles.protocolList}>
          {experiment.protocol.map((step, idx) => (
            <View key={idx} style={styles.protocolStepBox}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {expStarted ? (
          <View style={styles.startedBanner}>
            <Text style={styles.startedBannerText}>✓ 3-night experiment in progress</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.startExperimentBtn}
            onPress={handleStartExperiment}
            disabled={startingExp}
            activeOpacity={0.85}
          >
            {startingExp ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.startExperimentBtnText}>Start 3-night experiment</Text>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.canStopText}>You can stop at any time.</Text>

        <View style={styles.divider} />

        <TouchableOpacity
          onPress={handleFeedback}
          disabled={feedbackSent}
          activeOpacity={0.7}
          style={styles.feedbackBtn}
        >
          <Text style={[styles.feedbackBtnText, feedbackSent && { color: '#059669' }]}>
            {feedbackSent ? 'Feedback recorded' : 'This pattern does not feel accurate'}
          </Text>
        </TouchableOpacity>
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
  screenLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  rangeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rangeButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  rangeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  rangeButtonTextActive: {
    color: '#4338CA',
    fontWeight: '600',
  },
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
    marginBottom: 14,
  },
  summaryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: '#4F46E5',
  },
  summaryEntriesText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  summaryRangeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  disclaimerTextBelow: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#9CA3AF',
    marginBottom: 14,
    marginTop: -4,
    paddingHorizontal: 4,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendBox: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  dashLegend: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Table
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  rowWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  tableCellDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tableCellDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  tableCellData: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tableCellText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  tableCellTextCalm: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  colorSquare: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  expandedDrawer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  expandedText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 8,
  },
  viewEntryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  viewEntryLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },

  // What was recorded stats
  statRow: {
    marginTop: 12,
  },
  statLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },

  // Factors List
  factorsList: {
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  factorBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  factorName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  factorNights: {
    fontSize: 13,
    color: '#6B7280',
  },
  footnoteText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },

  // Metric boxes
  metricBoxesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  afterDreamsDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },

  // Experiment Card
  experimentInstructions: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  protocolList: {
    gap: 8,
    marginBottom: 14,
  },
  protocolStepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  stepText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  startExperimentBtn: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  startExperimentBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  startedBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  startedBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  canStopText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  feedbackBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  feedbackBtnText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default PatternsTabContent;
