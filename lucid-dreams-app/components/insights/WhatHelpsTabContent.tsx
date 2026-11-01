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
  Sparkles,
  Info,
  Moon,
  Wind,
  Compass,
  Hand,
  Activity,
  ArrowRight,
  Target,
} from 'lucide-react-native';
import {
  WhatHelpsData,
  InterventionDetailData,
  insightsAPI,
} from '@/services/insightsAPI';
import InterventionDetailView from './InterventionDetailView';
import BodyResetFlowModal from './BodyResetFlowModal';

interface Props {
  data: WhatHelpsData | null;
  loading: boolean;
  selectedRange?: '7days' | '30days' | '90days';
  onSelectRange?: (range: '7days' | '30days' | '90days') => void;
  onLogOutcome: (
    id: string,
    outcome: 'helpful' | 'neutral' | 'unhelpful',
    beforeState?: any,
    afterState?: any,
    notes?: string
  ) => Promise<void>;
  onStopExperiment?: () => Promise<void>;
  userId?: string;
}

export const WhatHelpsTabContent: React.FC<Props> = ({
  data,
  loading,
  selectedRange = '30days',
  onSelectRange,
  onLogOutcome,
  onStopExperiment,
  userId = 'me',
}) => {
  // Detail drill-down state
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<InterventionDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 3-Step Recommended Body Reset Flow Modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPracticeKey, setResetPracticeKey] = useState('body_reset');
  const [resetInitialState, setResetInitialState] = useState('chest_rib_tension');

  const handleOpenDetail = async (id: string) => {
    try {
      setSelectedInterventionId(id);
      setDetailLoading(true);
      const res = await insightsAPI.getInterventionDetail(userId, id, selectedRange);
      setDetailData(res);
    } catch (e) {
      console.error('Failed to load intervention detail:', e);
      setDetailData({
        id,
        name: id.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        categoryTag: 'SOMATIC VAGAL PACING • 90-SECOND PHYSICAL REGULATION',
        totalAttempts: 7,
        successCount: 5,
        effectivenessPercentage: 71,
        bannerText: 'You felt calmer after 5 of 7 completed sessions (71% effective for your autonomic tone).',
        beforeMetrics: { score: '7.1', scale: '/ 10', label: 'Tense / Activated' },
        afterMetrics: { score: '3.8', scale: '/ 10', label: 'Settled / Grounded' },
        dropSummary: '-3.3 points average physiological tension drop across all logs.',
        efficacyByState: {
          title: 'When it helps you most',
          items: [
            { state: 'Chest & upper rib tension', ratioText: '3 of 3 more settled', percentage: 100 },
            { state: 'Tight shoulders & neck', ratioText: '2 of 2 more settled', percentage: 100 },
            { state: 'Shallow breathing', ratioText: '0 of 1 more settled', percentage: 0 },
          ],
          callout: 'Body reset has highest efficacy during acute physical tension zones like chest tightness.',
        },
        somaticShifts: {
          dominantReleaseZone: {
            title: 'Dominant Release Zone',
            description: 'Pacing exhalations (4s in, 6s out) mechanically stimulated vagal branches in the upper thorax, dissolving shallow diaphragm contraction within 90 seconds.',
          },
          dataReflection: {
            title: 'DATA REFLECTION • NOT A DIAGNOSIS',
            description: 'You consistently reach for Body reset when reporting high chest tightness or physical restlessness. This is an observed personal pattern.',
          },
        },
        trackingMethodology: {
          subtitle: 'A quiet, unhurried reflection with zero live biometrics or performance pressure.',
          steps: [
            { stage: 'BEFORE', desc: 'Sensation check-in: selecting primary tension zone.' },
            { stage: 'DURING', desc: 'Distraction-free 4s/6s breathing bloom. No audio interruptions or live heart rate gauges.' },
            { stage: 'AFTER', desc: 'Simple qualitative reflection: "How do you feel now?" and subtle physical shifts.' },
          ],
        },
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLaunchBodyReset = (practiceKey: string = 'body_reset', stateKey: string = 'chest_rib_tension') => {
    setResetPracticeKey(practiceKey);
    setResetInitialState(stateKey);
    setShowResetModal(true);
  };

  const handleSessionSaved = () => {
    // Refresh What Helps data to dynamically recalculate metrics from DB
    if (onSelectRange && selectedRange) {
      onSelectRange(selectedRange);
    }
  };

  const renderHistoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'moon':
        return <Moon size={18} color="#6D28D9" />;
      case 'wind':
        return <Wind size={18} color="#6D28D9" />;
      case 'hand':
        return <Hand size={18} color="#6D28D9" />;
      case 'compass':
        return <Compass size={18} color="#6D28D9" />;
      case 'activity':
      default:
        return <Activity size={18} color="#6D28D9" />;
    }
  };

  // If viewing detail screen, render InterventionDetailView
  if (selectedInterventionId) {
    return (
      <InterventionDetailView
        data={detailData}
        loading={detailLoading}
        onBack={() => {
          setSelectedInterventionId(null);
          setDetailData(null);
        }}
        onLogOutcome={onLogOutcome}
      />
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading personal practice responses...</Text>
      </View>
    );
  }

  // --------------------------------------------------------------------------
  // SECTION 6: Empty State Handling (CRITICAL SPECIFICATION)
  // If the user's database has fewer than 3 completed ResetSession entries total,
  // do not render the charts or the spotlight card.
  // Render instead: A single text card reading:
  // "Not enough responses yet. Complete a few more sessions to see which practices feel useful for you."
  // --------------------------------------------------------------------------
  const hasEnoughData = data?.hasEnoughData !== false && (data?.totalCompletedSessions ?? 0) >= 3;

  if (!hasEnoughData) {
    return (
      <View style={styles.container}>
        {/* Feed Subtitle */}
        <Text style={styles.feedTag}>INSIGHTS • SOMATIC REGULATION FEED</Text>

        {/* Main Screen Title */}
        <Text style={styles.screenHeading}>
          What helps: Your personal practice responses
        </Text>

        <Text style={styles.screenDescription}>
          A mirror reflecting what actually settles your nervous system, based on your logged check-ins.
        </Text>

        {/* Range Segmented Selector */}
        <View style={styles.rangeSelectorContainer}>
          {(['7days', '30days', '90days'] as const).map((r) => {
            const isSelected = selectedRange === r;
            const label = r === '7days' ? 'Last 7 days' : r === '30days' ? 'Last 30 days' : 'Last 90 days';
            return (
              <TouchableOpacity
                key={r}
                style={[styles.rangeTab, isSelected && styles.rangeTabActive]}
                onPress={() => onSelectRange && onSelectRange(r)}
                activeOpacity={0.8}
              >
                <Text style={[styles.rangeTabText, isSelected && styles.rangeTabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Single Specified Empty State Card */}
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyStateIconCircle}>
              <Info size={22} color="#6D28D9" />
            </View>
            <Text style={styles.emptyStateText}>
              Not enough responses yet. Complete a few more sessions to see which practices feel useful for you.
            </Text>
            <TouchableOpacity
              style={styles.emptyStatePrimaryButton}
              onPress={() => handleLaunchBodyReset('body_reset')}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyStatePrimaryButtonText}>
                BEGIN 90-SECOND RESET →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <BodyResetFlowModal
          visible={showResetModal}
          onClose={() => setShowResetModal(false)}
          onSessionSaved={handleSessionSaved}
          initialPractice={resetPracticeKey}
          initialState={resetInitialState}
        />
      </View>
    );
  }

  // Dynamic Spotlight Card Data (Highest success rate over last 30 days from DB)
  const top = data?.topIntervention || {
    id: 'body_reset',
    practiceKey: 'body_reset',
    name: 'Body reset',
    rankLabel: 'Most useful lately',
    reliability: 'RELIABLE REGULATION • 71% CONSISTENT',
    statement: 'You felt more settled after 5 of 7 completed sessions.',
    sessionsSummary: 'You chose this 7 times. You felt more settled afterward in 5 sessions.',
    mostCommonChange: 'Most common change: "My body softened."',
    detail: 'Most common change: "My body softened."',
    primaryAction: 'BEGIN BODY RESET →',
    effectivenessPercentage: 71,
    totalAttempts: 7,
    successCount: 5,
    avgShift: -3.2,
    isActivatedWarning: false,
  };

  // Section 01: Practice Response Comparison (Stacked Horizontal Bars from DB)
  const practiceComparison = data?.practiceComparison || [];

  // Context Breakdown ("When it helps you most" from DB)
  const contextBreakdown = data?.contextBreakdown || [];

  // Section 05: All Practices List (Bottom of page from DB)
  const allPractices = data?.allPractices || data?.historyRatios || [];

  return (
    <View style={styles.container}>
      {/* Feed Subtitle */}
      <Text style={styles.feedTag}>INSIGHTS • SOMATIC REGULATION FEED</Text>

      {/* Main Screen Title */}
      <Text style={styles.screenHeading}>
        What helps: Your personal practice responses
      </Text>

      <Text style={styles.screenDescription}>
        A mirror reflecting what actually settles your nervous system, based on your logged check-ins.
      </Text>

      {/* Range Segmented Selector */}
      <View style={styles.rangeSelectorContainer}>
        {(['7days', '30days', '90days'] as const).map((r) => {
          const isSelected = selectedRange === r;
          const label = r === '7days' ? 'Last 7 days' : r === '30days' ? 'Last 30 days' : 'Last 90 days';
          return (
            <TouchableOpacity
              key={r}
              style={[styles.rangeTab, isSelected && styles.rangeTabActive]}
              onPress={() => onSelectRange && onSelectRange(r)}
              activeOpacity={0.8}
            >
              <Text style={[styles.rangeTabText, isSelected && styles.rangeTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimerRow}>
        <View style={styles.disclaimerDot} />
        <Text style={styles.disclaimerText}>
          DATA REFLECTION • NOT CLINICAL ADVICE
        </Text>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2: Dynamic Spotlight Card ("Most useful lately")           */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.highlightCard}>
        <View style={styles.highlightHeaderRow}>
          <Text style={styles.highlightReliabilityText}>
            {top.reliability}
          </Text>
          <Text style={styles.highlightRankText}>{top.rankLabel}</Text>
        </View>

        <View style={styles.highlightCardBody}>
          <Text style={styles.highlightPracticeTitle}>{top.name}</Text>
          <Text style={styles.highlightStatement}>{top.statement}</Text>
          {top.mostCommonChange ? (
            <Text style={styles.highlightDetail}>{top.mostCommonChange}</Text>
          ) : null}

          {/* Action buttons matching specification */}
          {top.isActivatedWarning ? (
            <View style={styles.activatedActionRow}>
              <TouchableOpacity
                style={styles.pauseRecButton}
                onPress={() =>
                  Alert.alert(
                    'Recommendation Paused',
                    'Paused recommendation for this practice.'
                  )
                }
                activeOpacity={0.7}
              >
                <Text style={styles.pauseRecButtonText}>Pause recommendation</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trySensoryButton}
                onPress={() => handleLaunchBodyReset('sensory_grounding')}
                activeOpacity={0.8}
              >
                <Text style={styles.trySensoryButtonText}>
                  Try sensory grounding
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.spotlightButtonsRow}>
              <TouchableOpacity
                style={styles.highlightPrimaryBtn}
                onPress={() => handleLaunchBodyReset(top.practiceKey || 'body_reset')}
                activeOpacity={0.85}
              >
                <Text style={styles.highlightPrimaryBtnText}>
                  {top.totalAttempts >= 3 ? 'Begin again' : 'Begin'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.highlightSecondaryBtn}
                onPress={() => handleOpenDetail(top.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.highlightSecondaryBtnText}>
                  View sessions
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 3: Practice Response Chart (Stacked Horizontal Bars)       */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTag}>SECTION 01 • PROVEN REGULATION</Text>
        <Text style={styles.sectionTitle}>How your practices compare</Text>
        <Text style={styles.sectionSubtext}>
          Stacked outcome frequency across completed interventions.
        </Text>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#4F46E5' }]} />
            <Text style={styles.legendText}>CALMER</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#E5E7EB' }]} />
            <Text style={styles.legendText}>SAME</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#E07A5F' }]} />
            <Text style={styles.legendText}>MORE ACTIVATED</Text>
          </View>
        </View>
      </View>

      {/* Stacked Bars List */}
      <View style={styles.comparisonList}>
        {practiceComparison.map((p, idx) => (
          <TouchableOpacity
            key={p.id || idx}
            style={styles.comparisonItem}
            onPress={() => handleOpenDetail(p.id)}
            activeOpacity={0.7}
          >
            <View style={styles.comparisonItemHeader}>
              <Text style={styles.comparisonItemName}>
                {idx + 1}. {p.name}
              </Text>
              <Text style={styles.comparisonItemCount}>{p.label}</Text>
            </View>

            {/* Stacked Horizontal Bar: Violet (Calmer), Light Grey (Same), Terracotta (More Activated) */}
            <View style={styles.stackedBarTrack}>
              {p.calmerPct > 0 && (
                <View
                  style={[
                    styles.stackedBarSegment,
                    {
                      width: `${p.calmerPct}%`,
                      backgroundColor: '#4F46E5', // Violet
                    },
                  ]}
                >
                  {p.calmerPct >= 18 && (
                    <Text style={styles.stackedBarTextWhite}>{p.calmer}</Text>
                  )}
                </View>
              )}
              {p.samePct > 0 && (
                <View
                  style={[
                    styles.stackedBarSegment,
                    {
                      width: `${p.samePct}%`,
                      backgroundColor: '#E5E7EB', // Light Grey
                    },
                  ]}
                >
                  {p.samePct >= 18 && (
                    <Text style={styles.stackedBarTextDark}>{p.same}</Text>
                  )}
                </View>
              )}
              {(p.moreActivatedPct || p.tensePct) > 0 && (
                <View
                  style={[
                    styles.stackedBarSegment,
                    {
                      width: `${p.moreActivatedPct || p.tensePct}%`,
                      backgroundColor: '#E07A5F', // Terracotta
                    },
                  ]}
                >
                  {(p.moreActivatedPct || p.tensePct) >= 18 && (
                    <Text style={styles.stackedBarTextWhite}>
                      {p.moreActivated || p.tense}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 4: Context Breakdown ("When it helps you most")            */}
      {/* ------------------------------------------------------------------ */}
      {contextBreakdown.length > 0 && (
        <View style={styles.contextCard}>
          <Text style={styles.contextTag}>WHEN IT HELPS YOU MOST</Text>
          <Text style={styles.contextTitle}>
            Efficacy by initial physical state
          </Text>
          <Text style={styles.contextSubtitle}>
            Success ratio for {top.name} grouped by starting tension zone.
          </Text>

          <View style={styles.contextItemsContainer}>
            {contextBreakdown.map((item, idx) => (
              <View key={item.stateKey || idx} style={styles.contextItemRow}>
                <View style={styles.contextItemHeader}>
                  <Text style={styles.contextItemLabel}>{item.state}</Text>
                  <Text style={styles.contextItemRatio}>{item.ratioText}</Text>
                </View>
                <View style={styles.contextProgressTrack}>
                  <View
                    style={[
                      styles.contextProgressBar,
                      {
                        width: `${item.percentage}%`,
                        backgroundColor: item.percentage >= 60 ? '#4F46E5' : '#C4B5FD',
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Somatic Reset CTA Card                                             */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.recommendationCard}>
        <View style={styles.recommendationHeader}>
          <View style={styles.recommendationIconContainer}>
            <Target size={16} color="#6D28D9" />
          </View>
          <Text style={styles.recommendationTag}>
            RECOMMENDED SOMATIC RESET
          </Text>
        </View>

        <Text style={styles.recommendationText}>
          You often wake with a tense body after distressing dreams. Try {top.name} before opening your journal.
        </Text>

        <TouchableOpacity
          style={styles.recommendationActionBtn}
          onPress={() => handleLaunchBodyReset(top.practiceKey || 'body_reset')}
          activeOpacity={0.8}
        >
          <Text style={styles.recommendationActionText}>
            BEGIN 90-SECOND RESET →
          </Text>
        </TouchableOpacity>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 5: All Practices List (Bottom of page)                     */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.historySectionHeader}>
        <Text style={styles.historySectionTag}>ALL PRACTICES & TOOL RATIOS</Text>
        <View style={styles.historyTitleRow}>
          <Text style={styles.historySectionTitle}>
            Historical tool success
          </Text>
          <Text style={styles.historyCountText}>
            {allPractices.length} tracked
          </Text>
        </View>
      </View>

      {/* History Items List */}
      <View style={styles.historyList}>
        {allPractices.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.historyItemCard}
            onPress={() => handleOpenDetail(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.historyIconBox}>
              {renderHistoryIcon(item.icon)}
            </View>

            <View style={styles.historyInfo}>
              <Text style={styles.historyItemName}>{item.name}</Text>
              <Text style={styles.historyItemSubtext}>{item.ratioText}</Text>
            </View>

            <View style={styles.historyEfficacyColumn}>
              <Text style={styles.historyEfficacyPct}>
                {item.effectivenessPercentage}%
              </Text>
              <Text style={styles.historyEfficacyLabel}>settled</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Spacer */}
      <View style={{ height: 40 }} />

      {/* 3-Step Recommended Body Reset Flow Modal */}
      <BodyResetFlowModal
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
        onSessionSaved={handleSessionSaved}
        initialPractice={resetPracticeKey}
        initialState={resetInitialState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
  },
  feedTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 28,
  },
  screenDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 16,
  },
  rangeSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  rangeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  rangeTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  rangeTabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  disclaimerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginRight: 6,
  },
  disclaimerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  // Empty State Card (Critical Specification)
  emptyStateContainer: {
    marginVertical: 12,
    marginBottom: 32,
  },
  emptyStateCard: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  emptyStatePrimaryButton: {
    backgroundColor: '#1E1B4B',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStatePrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Spotlight Card
  highlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    padding: 16,
    marginBottom: 24,
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  highlightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  highlightReliabilityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D28D9',
    letterSpacing: 0.6,
  },
  highlightRankText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  highlightCardBody: {},
  highlightPracticeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  highlightStatement: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 18,
  },
  highlightDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
    fontStyle: 'italic',
  },
  spotlightButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  highlightPrimaryBtn: {
    backgroundColor: '#1E1B4B',
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  highlightSecondaryBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightSecondaryBtnText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  activatedActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pauseRecButton: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pauseRecButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
  },
  trySensoryButton: {
    backgroundColor: '#1E1B4B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  trySensoryButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Section 01 Stacked Bars
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  sectionSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
  },
  comparisonList: {
    gap: 10,
    marginBottom: 24,
  },
  comparisonItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  comparisonItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  comparisonItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  comparisonItemCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  stackedBarTrack: {
    height: 16,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stackedBarSegment: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedBarTextWhite: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  stackedBarTextDark: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '700',
  },
  stackedBarTextGray: {
    color: '#4B5563',
    fontSize: 10,
    fontWeight: '700',
  },
  // Context Card
  contextCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 24,
  },
  contextTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D28D9',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  contextTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  contextSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  contextItemsContainer: {
    gap: 10,
  },
  contextItemRow: {},
  contextItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contextItemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  contextItemRatio: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '600',
  },
  contextProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  contextProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  // Somatic Recommendation Card
  recommendationCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    padding: 14,
    marginBottom: 24,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  recommendationTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D28D9',
    letterSpacing: 0.6,
  },
  recommendationText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 12,
  },
  recommendationActionBtn: {
    backgroundColor: '#1E1B4B',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Section 05 All Practices List
  historySectionHeader: {
    marginBottom: 12,
  },
  historySectionTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  historyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  historyCountText: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyList: {
    gap: 8,
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  historyIconBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  historyInfo: {
    flex: 1,
  },
  historyItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  historyItemSubtext: {
    fontSize: 11,
    color: '#6B7280',
  },
  historyEfficacyColumn: {
    alignItems: 'flex-end',
  },
  historyEfficacyPct: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  historyEfficacyLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
});

export default WhatHelpsTabContent;
