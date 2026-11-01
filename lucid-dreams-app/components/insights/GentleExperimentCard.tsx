import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FlaskConical, CheckCircle2 } from 'lucide-react-native';
import { ExperimentData } from '@/services/insightsAPI';

interface Props {
  data: ExperimentData | null;
  onStart: (id: string) => Promise<void>;
  onDismiss?: () => void;
}

export const GentleExperimentCard: React.FC<Props> = ({ data, onStart, onDismiss }) => {
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(data?.status === 'active');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const id = data?.id ?? 'exp-default';
  const title = data?.title ?? 'Try tonight';
  const description =
    data?.description ??
    'A 5-minute thought-closure sequence before bed may be worth testing for the next 3 nights to decouple autonomic arousal before rem cycles.';
  const currentDay = data?.currentDay ?? 1;
  const duration = data?.durationDays ?? 3;

  const handleStart = async () => {
    try {
      setLoading(true);
      await onStart(id);
      setStarted(true);
    } catch (e) {
      console.error('Failed to start experiment:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <FlaskConical size={16} color="#4F46E5" strokeWidth={2} />
        <Text style={styles.headerLabel}>GENTLE EXPERIMENT</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={styles.buttonsRow}>
        {started ? (
          <View style={styles.activeBadge}>
            <CheckCircle2 size={16} color="#059669" strokeWidth={2} />
            <Text style={styles.activeBadgeText}>
              In Progress · Night {currentDay} of {duration}
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStart}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Try tonight</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Not now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    marginLeft: 6,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#18181B',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    marginLeft: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  activeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
});

export default GentleExperimentCard;
