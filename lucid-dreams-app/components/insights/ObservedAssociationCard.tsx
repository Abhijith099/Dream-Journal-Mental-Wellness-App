import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { ObservationData } from '@/services/insightsAPI';

interface Props {
  data: ObservationData | null;
  onSeePattern: () => void;
}

export const ObservedAssociationCard: React.FC<Props> = ({ data, onSeePattern }) => {
  const isPending = !data || !data.confidence || data.observedCount === 0;
  const confidence = data?.confidence;
  const observedCount = data?.observedCount ?? 0;
  const totalRelevant = data?.totalRelevantEntries ?? 0;
  const correlationId = data?.correlationId;
  const title = data?.title ?? (isPending ? 'Building Your Pattern Profile' : 'A pattern worth noticing');
  const description =
    data?.description ??
    (isPending
      ? 'Start logging your dreams and daily check-ins to discover personalized patterns and insights.'
      : 'On nights when you reported high evening worry, you woke with lower physical energy more often.');

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.headerLabel}>OBSERVED ASSOCIATION</Text>
        <Text style={styles.confidenceText}>
          {confidence ? `Confidence · ${confidence}%` : 'Awaiting More Logs'}
        </Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={styles.insetBox}>
        <Text style={styles.insetText}>
          {isPending
            ? 'Insights activate automatically as you log dream reflections.'
            : `Observed in ${observedCount} of ${totalRelevant} relevant entries over the last month.`}
        </Text>
        <Text style={styles.disclaimerText}>
          {isPending ? 'Your private data remains isolated to your account.' : 'This is an association, not a confirmed cause.'}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onSeePattern}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>See the pattern</Text>
          <ArrowUpRight size={15} color="#4338CA" strokeWidth={2} style={styles.iconMargin} />
        </TouchableOpacity>

        {correlationId ? <Text style={styles.idText}>ID: {correlationId}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },
  insetBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  insetText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
    lineHeight: 18,
  },
  disclaimerText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#6B7280',
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
  },
  iconMargin: {
    marginLeft: 4,
  },
  idText: {
    fontSize: 11,
    color: '#9CA3AF',
    letterSpacing: 0.4,
  },
});

export default ObservedAssociationCard;
