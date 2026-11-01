import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  ChevronLeft,
  TrendingDown,
  Info,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  X,
} from 'lucide-react-native';
import { InterventionDetailData } from '@/services/insightsAPI';
import BodyResetFlowModal from './BodyResetFlowModal';

interface Props {
  data: InterventionDetailData | null;
  loading: boolean;
  onBack: () => void;
  onLogOutcome: (
    id: string,
    outcome: 'helpful' | 'neutral' | 'unhelpful',
    beforeState?: any,
    afterState?: any,
    notes?: string
  ) => Promise<void>;
}

export const InterventionDetailView: React.FC<Props> = ({
  data,
  loading,
  onBack,
  onLogOutcome,
}) => {
  const [showResetModal, setShowResetModal] = useState(false);

  if (loading || !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading practice analysis...</Text>
      </View>
    );
  }

  const handleStartSession = () => {
    setShowResetModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButtonRow}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color="#4B5563" />
          <Text style={styles.headerTitle}>Somatic Check In</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Breadcrumb */}
        <TouchableOpacity
          style={styles.breadcrumbRow}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={14} color="#6B7280" />
          <Text style={styles.breadcrumbText}>Back to What helps</Text>
        </TouchableOpacity>

        {/* Practice Category & Name */}
        <Text style={styles.categoryLabel}>{data.categoryTag}</Text>
        <Text style={styles.practiceTitle}>{data.name}</Text>

        {/* Highlight Banner */}
        <View style={styles.highlightBanner}>
          <Text style={styles.highlightBannerText}>
            You felt calmer after{' '}
            <Text style={styles.boldPurple}>
              {data.successCount} of {data.totalAttempts}
            </Text>{' '}
            completed sessions (
            <Text style={styles.boldPurple}>
              {data.effectivenessPercentage}% effective
            </Text>{' '}
            for your autonomic tone).
          </Text>
        </View>

        {/* Before and After Comparison Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricCardLabel}>AVERAGE BEFORE</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValue}>{data.beforeMetrics.score}</Text>
              <Text style={styles.metricScale}>{data.beforeMetrics.scale}</Text>
            </View>
            <Text style={styles.metricStateTense}>
              {data.beforeMetrics.label}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricCardLabel}>AVERAGE AFTER</Text>
            <View style={styles.metricValueRow}>
              <Text style={[styles.metricValue, { color: '#4F46E5' }]}>
                {data.afterMetrics.score}
              </Text>
              <Text style={styles.metricScale}>{data.afterMetrics.scale}</Text>
            </View>
            <Text style={styles.metricStateCalm}>
              {data.afterMetrics.label}
            </Text>
          </View>
        </View>

        {/* Tension Drop Banner */}
        <View style={styles.dropBanner}>
          <TrendingDown size={14} color="#6D28D9" style={{ marginRight: 6 }} />
          <Text style={styles.dropBannerText}>{data.dropSummary}</Text>
        </View>

        {/* Section: Correlative Efficacy */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTag}>
            CORRELATIVE EFFICACY • BY LOGGED STATE
          </Text>
          <Text style={styles.sectionHeading}>{data.efficacyByState.title}</Text>
        </View>

        <View style={styles.stateCardContainer}>
          {data.efficacyByState.items.map((item, idx) => (
            <View key={idx} style={styles.stateBarItem}>
              <View style={styles.stateBarHeader}>
                <Text style={styles.stateNameText}>{item.state}</Text>
                <Text style={styles.stateRatioText}>{item.ratioText}</Text>
              </View>
              <View style={styles.stateProgressTrack}>
                <View
                  style={[
                    styles.stateProgressBar,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor: item.percentage >= 70 ? '#4F46E5' : '#C4B5FD',
                    },
                  ]}
                />
              </View>
            </View>
          ))}

          {/* Efficacy Callout */}
          <View style={styles.calloutBox}>
            <Text style={styles.calloutText}>
              {data.efficacyByState.callout}
            </Text>
          </View>
        </View>

        {/* Section: Observed Somatosensory Shifts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTag}>OBSERVED SOMATOSENSORY SHIFTS</Text>
        </View>

        {/* Dominant Release Zone Card */}
        <View style={styles.zoneCard}>
          <View style={styles.zoneGraphic}>
            <View style={styles.zoneGraphicInner} />
          </View>
          <View style={styles.zoneInfo}>
            <Text style={styles.zoneTitle}>
              {data.somaticShifts.dominantReleaseZone.title}
            </Text>
            <Text style={styles.zoneDesc}>
              {data.somaticShifts.dominantReleaseZone.description}
            </Text>
          </View>
        </View>

        {/* Data Reflection Card */}
        <View style={styles.dataReflectionCard}>
          <Text style={styles.dataReflectionTag}>
            {data.somaticShifts.dataReflection.title}
          </Text>
          <Text style={styles.dataReflectionText}>
            {data.somaticShifts.dataReflection.description}
          </Text>
        </View>

        {/* Section: How your response is tracked */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>
            How your response is tracked
          </Text>
          <Text style={styles.sectionSubheading}>
            {data.trackingMethodology.subtitle}
          </Text>
        </View>

        {/* Methodology Steps */}
        {data.trackingMethodology.steps.map((step, idx) => (
          <View key={idx} style={styles.methodologyCard}>
            <Text style={styles.methodologyStage}>{step.stage}</Text>
            <Text style={styles.methodologyDesc}>{step.desc}</Text>
          </View>
        ))}

        {/* Spacer for sticky footer */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={styles.primaryActionBtn}
          onPress={handleStartSession}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryActionText}>
            BEGIN {data.name.toUpperCase()} SESSION (3 MIN) →
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3-Step Recommended Body Reset Flow Modal */}
      <BodyResetFlowModal
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
        initialPractice={data.id || 'body_reset'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
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
  header: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  breadcrumbText: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 6,
    fontWeight: '500',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  practiceTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'serif',
    marginBottom: 16,
  },
  highlightBanner: {
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  highlightBannerText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },
  boldPurple: {
    fontWeight: '700',
    color: '#6D28D9',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
  },
  metricCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  metricScale: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  metricStateTense: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  metricStateCalm: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  dropBanner: {
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dropBannerText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'serif',
  },
  sectionSubheading: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 4,
  },
  stateCardContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  stateBarItem: {
    marginBottom: 14,
  },
  stateBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stateNameText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  stateRatioText: {
    fontSize: 12,
    color: '#6B7280',
  },
  stateProgressTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  stateProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  calloutBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  calloutText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  zoneCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  zoneGraphic: {
    width: 64,
    height: 64,
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneGraphicInner: {
    width: 28,
    height: 28,
    backgroundColor: '#9333EA',
    borderRadius: 6,
    opacity: 0.6,
  },
  zoneInfo: {
    flex: 1,
    paddingLeft: 14,
  },
  zoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  zoneDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  dataReflectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  dataReflectionTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  dataReflectionText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  methodologyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  methodologyStage: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  methodologyDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryActionBtn: {
    backgroundColor: '#111827',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  stepContainer: {
    paddingVertical: 8,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  ratingPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  ratingPillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  ratingPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  ratingPillTextActive: {
    color: '#FFFFFF',
  },
  stepSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tagPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  tagPillActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  tagPillText: {
    fontSize: 12,
    color: '#4B5563',
  },
  tagPillTextActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  stepContinueBtn: {
    backgroundColor: '#111827',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  stepContinueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginVertical: 16,
    fontVariant: ['tabular-nums'],
  },
  timerInstruction: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  timerControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#111827',
  },
  timerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  outcomePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  outcomePillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  outcomePillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  outcomePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default InterventionDetailView;
